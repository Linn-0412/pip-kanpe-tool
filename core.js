export const PIP_CONTROL_SIZE_CLASSES = ["small", "medium", "large"];
export const PIP_CONTROL_POSITION_CLASSES = ["top", "bottom"];
export const PIP_CONTROL_BACKGROUND_CLASSES = ["background-solid", "background-translucent", "background-clear"];
export const DEFAULT_PIP_CONTROL_SIZE = "medium";
export const DEFAULT_PIP_CONTROL_POSITION = "bottom";
export const DEFAULT_PIP_CONTROL_BACKGROUND = "solid";
export const ALL_GROUP_ID = "all";

const fileNameCollator = new Intl.Collator("ja", {
  numeric: true,
  sensitivity: "base",
});

export function normalizeCardGroupIds(groupIds) {
  if (Array.isArray(groupIds)) {
    return [...new Set(groupIds.filter((groupId) => typeof groupId === "string" && groupId.length > 0))];
  }

  if (typeof groupIds === "string" && groupIds.length > 0) {
    return [groupIds];
  }

  return [];
}

export function isAllGroup(groupId) {
  return !groupId || groupId === ALL_GROUP_ID;
}

export function isCardInGroup(card, groupId = ALL_GROUP_ID) {
  return Boolean(card) && (isAllGroup(groupId) || normalizeCardGroupIds(card.groupIds).includes(groupId));
}

export function getGroupIndices(cards, groupId = ALL_GROUP_ID) {
  const indices = [];
  cards.forEach((card, index) => {
    if (isCardInGroup(card, groupId)) {
      indices.push(index);
    }
  });
  return indices;
}

export function getVisibleIndices(cards, groupId = ALL_GROUP_ID) {
  const indices = [];
  cards.forEach((card, index) => {
    if (!card.hidden && isCardInGroup(card, groupId)) {
      indices.push(index);
    }
  });
  return indices;
}

export function getCurrentCard(cards, index, groupId = ALL_GROUP_ID) {
  const normalized = normalizeIndex(cards, index, groupId);
  const card = cards[normalized];
  return card && !card.hidden && isCardInGroup(card, groupId) ? card : null;
}

export function normalizeIndex(cards, index, groupId = ALL_GROUP_ID) {
  if (cards.length === 0) {
    return 0;
  }

  const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  const boundedIndex = Math.min(Math.max(safeIndex, 0), cards.length - 1);
  if (!cards[boundedIndex].hidden && isCardInGroup(cards[boundedIndex], groupId)) {
    return boundedIndex;
  }

  const visible = getVisibleIndices(cards, groupId);
  if (visible.length === 0) {
    const groupIndices = getGroupIndices(cards, groupId);
    if (groupIndices.length === 0) {
      return 0;
    }

    if (isCardInGroup(cards[boundedIndex], groupId)) {
      return boundedIndex;
    }

    const forwardGroupIndex = groupIndices.find((groupIndex) => groupIndex >= boundedIndex);
    return forwardGroupIndex ?? groupIndices[groupIndices.length - 1];
  }

  const forward = visible.find((visibleIndex) => visibleIndex >= boundedIndex);
  return forward ?? visible[visible.length - 1];
}

export function step(cards, index, direction, groupId = ALL_GROUP_ID) {
  const visible = getVisibleIndices(cards, groupId);
  if (visible.length === 0) {
    return normalizeIndex(cards, index, groupId);
  }

  const normalized = normalizeIndex(cards, index, groupId);
  const position = visible.indexOf(normalized);
  if (position === -1 || visible.length === 1 || direction === 0) {
    return position === -1 ? visible[0] : normalized;
  }

  const delta = direction < 0 ? -1 : 1;
  const nextPosition = (position + delta + visible.length) % visible.length;
  return visible[nextPosition];
}

export function reorder(cards, index, direction, currentIndex = index) {
  const nextCards = [...cards];
  const targetIndex = index + direction;
  if (index < 0 || index >= cards.length || targetIndex < 0 || targetIndex >= cards.length || direction === 0) {
    return { cards: nextCards, currentIndex };
  }

  const [card] = nextCards.splice(index, 1);
  nextCards.splice(targetIndex, 0, card);

  let nextCurrentIndex = currentIndex;
  if (currentIndex === index) {
    nextCurrentIndex = targetIndex;
  } else if (currentIndex === targetIndex) {
    nextCurrentIndex = index;
  }

  return { cards: nextCards, currentIndex: nextCurrentIndex };
}

export function toggleHidden(cards, index) {
  return cards.map((card, cardIndex) => (cardIndex === index ? { ...card, hidden: !card.hidden } : card));
}

export function toggleCardGroup(cards, index, groupId) {
  if (isAllGroup(groupId)) {
    return cards;
  }

  return cards.map((card, cardIndex) => {
    if (cardIndex !== index) {
      return card;
    }

    const groupIds = normalizeCardGroupIds(card.groupIds);
    const nextGroupIds = groupIds.includes(groupId)
      ? groupIds.filter((currentGroupId) => currentGroupId !== groupId)
      : [...groupIds, groupId];

    return { ...card, groupIds: nextGroupIds };
  });
}

export function removeGroupFromCards(cards, groupId) {
  if (isAllGroup(groupId)) {
    return cards;
  }

  return cards.map((card) => ({
    ...card,
    groupIds: normalizeCardGroupIds(card.groupIds).filter((currentGroupId) => currentGroupId !== groupId),
  }));
}

export function formatPipLabel(cards, index, settings = {}, groupId = ALL_GROUP_ID) {
  const normalized = normalizeIndex(cards, index, groupId);
  const card = getCurrentCard(cards, normalized, groupId);
  if (!card) {
    return "";
  }

  const visible = getVisibleIndices(cards, groupId);
  const position = visible.indexOf(normalized);
  return `${position === -1 ? 1 : position + 1} / ${visible.length}　${formatPipName(card, settings)}`;
}

export function formatPipName(card, settings = {}) {
  const name = card?.name ?? "";
  return settings.showFileExtension ? name : stripFileExtension(name);
}

export function stripFileExtension(name) {
  return `${name ?? ""}`.replace(/\.[^.]+$/, "");
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function compareFilesByName(a, b) {
  const byName = fileNameCollator.compare(a.name, b.name);
  if (byName !== 0) {
    return byName;
  }
  return (a.lastModified ?? 0) - (b.lastModified ?? 0);
}

export function resolvePipControlsSize(settings = {}) {
  return PIP_CONTROL_SIZE_CLASSES.includes(settings.pipControlsSize)
    ? settings.pipControlsSize
    : DEFAULT_PIP_CONTROL_SIZE;
}

export function resolvePipControlsPosition(settings = {}) {
  return PIP_CONTROL_POSITION_CLASSES.includes(settings.pipControlsPosition)
    ? settings.pipControlsPosition
    : DEFAULT_PIP_CONTROL_POSITION;
}

export function resolvePipControlsBackground(settings = {}) {
  const value = settings.pipControlsBackground ?? DEFAULT_PIP_CONTROL_BACKGROUND;
  const className = value.startsWith("background-") ? value : `background-${value}`;
  return PIP_CONTROL_BACKGROUND_CLASSES.includes(className) ? className : `background-${DEFAULT_PIP_CONTROL_BACKGROUND}`;
}
