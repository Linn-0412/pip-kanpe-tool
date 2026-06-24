export const PIP_CONTROL_SIZE_CLASSES = ["small", "medium", "large"];
export const PIP_CONTROL_POSITION_CLASSES = ["top", "bottom"];
export const PIP_CONTROL_BACKGROUND_CLASSES = ["background-solid", "background-translucent", "background-clear"];
export const DEFAULT_PIP_CONTROL_SIZE = "medium";
export const DEFAULT_PIP_CONTROL_POSITION = "bottom";
export const DEFAULT_PIP_CONTROL_BACKGROUND = "solid";

const fileNameCollator = new Intl.Collator("ja", {
  numeric: true,
  sensitivity: "base",
});

export function getVisibleIndices(cards) {
  const indices = [];
  cards.forEach((card, index) => {
    if (!card.hidden) {
      indices.push(index);
    }
  });
  return indices;
}

export function getCurrentCard(cards, index) {
  const normalized = normalizeIndex(cards, index);
  const card = cards[normalized];
  return card && !card.hidden ? card : null;
}

export function normalizeIndex(cards, index) {
  if (cards.length === 0) {
    return 0;
  }

  const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  const boundedIndex = Math.min(Math.max(safeIndex, 0), cards.length - 1);
  if (!cards[boundedIndex].hidden) {
    return boundedIndex;
  }

  const visible = getVisibleIndices(cards);
  if (visible.length === 0) {
    return boundedIndex;
  }

  const forward = visible.find((visibleIndex) => visibleIndex >= boundedIndex);
  return forward ?? visible[visible.length - 1];
}

export function step(cards, index, direction) {
  const visible = getVisibleIndices(cards);
  if (visible.length === 0) {
    return normalizeIndex(cards, index);
  }

  const normalized = normalizeIndex(cards, index);
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

export function formatPipLabel(cards, index, settings = {}) {
  const normalized = normalizeIndex(cards, index);
  const card = getCurrentCard(cards, normalized);
  if (!card) {
    return "";
  }

  const visible = getVisibleIndices(cards);
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
