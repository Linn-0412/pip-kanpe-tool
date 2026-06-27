import {
  ALL_GROUP_ID,
  DEFAULT_PIP_CONTROL_BACKGROUND,
  DEFAULT_PIP_CONTROL_POSITION,
  DEFAULT_PIP_CONTROL_SIZE,
  PIP_CONTROL_BACKGROUND_CLASSES,
  PIP_CONTROL_POSITION_CLASSES,
  PIP_CONTROL_SIZE_CLASSES,
  compareFilesByName,
  formatBytes,
  formatPipLabel as formatCorePipLabel,
  formatPipName as formatCorePipName,
  getCurrentCard as getCurrentVisibleCard,
  getGroupIndices as getCardGroupIndices,
  getVisibleIndices as getVisibleCardIndices,
  isAllGroup,
  isCardInGroup,
  normalizeCardGroupIds,
  normalizeIndex,
  removeGroupFromCards,
  reorder as reorderCards,
  resolvePipControlsBackground,
  resolvePipControlsPosition,
  resolvePipControlsSize,
  step as stepVisibleCard,
  toggleCardGroup,
  toggleHidden as toggleHiddenCards,
} from "./core.js";

// 主要な制限値と保存先。枚数上限やDB名を変えるforkはまずここを見る。
const MAX_CARDS = 80;
const DB_NAME = "pip-kanpe-tool";
const DB_VERSION = 1;
const IMAGE_STORE = "images";
const SETTINGS_KEY = "pip-kanpe-settings";
const PIP_CONTROL_PLACEMENTS = ["horizontal", "vertical-left", "vertical-right"];
const DEFAULT_PIP_CONTROL_PLACEMENT = "horizontal";
const PIP_CONTROL_PLACEMENT_CLASSES = ["horizontal", "vertical", "vertical-left", "vertical-right"];
const PIP_CONTROL_BEHAVIOR_CLASSES = ["full-height-buttons"];
const EXTENSION_GUIDES = {
  chrome: {
    browserName: "Chrome",
    extensionsUrl: "chrome://extensions/",
    shortcutsUrl: "chrome://extensions/shortcuts",
    developerModeLabel: "デベロッパーモード",
    loadUnpackedInstruction: "「パッケージ化されていない拡張機能を読み込む」から、解凍したフォルダを選びます。",
  },
  edge: {
    browserName: "Edge",
    extensionsUrl: "edge://extensions/",
    shortcutsUrl: "edge://extensions/shortcuts",
    developerModeLabel: "開発者モード",
    loadUnpackedInstruction:
      "「展開して読み込み」または「パッケージ化されていない拡張機能を読み込む」から、解凍したフォルダを選びます。",
  },
};

const EYE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.5 10.5 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.5 9.5 0 0 1 12 4c6.5 0 10 7 10 7a18.6 18.6 0 0 1-2.16 3.19M1 1l22 22"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>`;

// メモリ上の唯一の状態。IndexedDBの画像本体、localStorageの設定、PiP小窓をここで束ねる。
const state = {
  db: null,
  cards: [],
  currentIndex: 0,
  objectUrls: new Map(),
  pipWindow: null,
  settings: {
    fitMode: "contain",
    pipSize: "640x360",
    pipControlsSize: DEFAULT_PIP_CONTROL_SIZE,
    pipControlsPlacement: DEFAULT_PIP_CONTROL_PLACEMENT,
    pipControlsFullHeightButtons: false,
    pipControlsPosition: DEFAULT_PIP_CONTROL_POSITION,
    pipControlsBackground: DEFAULT_PIP_CONTROL_BACKGROUND,
    pipControlsSeparateFromImage: true,
    pipControlsAutoHide: true,
    showPipLabel: true,
    showFileExtension: false,
    optimizeImages: true,
    hideGuideOnLaunch: false,
    activeGroupId: ALL_GROUP_ID,
    groups: [],
  },
};

const els = {};

window.addEventListener("DOMContentLoaded", init);

// 起動時にDOM、設定、IndexedDBを準備して初回描画する。
async function init() {
  bindElements();
  bindEvents();
  applyBrowserGuide();
  loadSettings();
  applySettingsToControls();
  updateSupportBadge();

  try {
    state.db = await openDatabase();
    state.cards = await loadCards();
    normalizeCurrentIndex();
    render();
    setStatus("準備完了。画像はこのブラウザ内だけに保存されます。");
  } catch (error) {
    console.error(error);
    setStatus("IndexedDBを開けませんでした。ブラウザ設定を確認してください。", true);
  }
}

// HTMLのidをcamelCase化してelsへ集約する。イベント側でquerySelectorを散らさないための入口。
function bindElements() {
  const ids = [
    "support-badge",
    "open-guide",
    "open-pip",
    "drop-zone",
    "file-input",
    "pick-files",
    "optimize-images",
    "group-filter",
    "group-name",
    "add-group",
    "rename-group",
    "delete-group",
    "deck-meta",
    "clear-all",
    "thumb-list",
    "empty-state",
    "preview-stage",
    "preview-image",
    "preview-pip-controls",
    "preview-pip-prev",
    "preview-pip-label",
    "preview-pip-next",
    "fit-mode",
    "pip-size",
    "pip-controls-size-small",
    "pip-controls-size-medium",
    "pip-controls-size-large",
    "pip-controls-placement-horizontal",
    "pip-controls-placement-vertical-left",
    "pip-controls-placement-vertical-right",
    "pip-controls-full-height-buttons",
    "pip-controls-position-top",
    "pip-controls-position-middle",
    "pip-controls-position-bottom",
    "pip-controls-background-solid",
    "pip-controls-background-translucent",
    "pip-controls-background-clear",
    "pip-controls-separate",
    "pip-controls-auto-hide",
    "show-pip-label",
    "show-file-extension",
    "status-line",
    "guide-modal",
    "close-guide",
    "close-guide-icon",
    "hide-guide-next-time",
    "guide-browser-name",
    "guide-extensions-url",
    "guide-extensions-copy",
    "guide-developer-mode-label",
    "guide-load-unpacked-instruction",
    "guide-shortcuts-url",
    "guide-shortcuts-copy",
  ];

  ids.forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });
}

// 画面操作をすべてここで結線する。設定変更は保存、プレビュー、PiP更新を同時に走らせる。
function bindEvents() {
  els.pickFiles.addEventListener("click", (event) => {
    event.stopPropagation();
    els.fileInput.click();
  });
  els.fileInput.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  els.dropZone.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("button, input")) {
      return;
    }
    els.fileInput.click();
  });
  els.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      els.fileInput.click();
    }
  });

  els.fileInput.addEventListener("change", async () => {
    await addFiles(els.fileInput.files);
    els.fileInput.value = "";
  });

  document.addEventListener("paste", handlePaste);
  window.addEventListener("message", handleExtensionMessage);

  ["dragenter", "dragover"].forEach((name) => {
    els.dropZone.addEventListener(name, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((name) => {
    els.dropZone.addEventListener(name, () => {
      els.dropZone.classList.remove("dragging");
    });
  });

  els.dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    await addFiles(event.dataTransfer.files);
  });

  els.previewPipPrev.addEventListener("click", previousCard);
  els.previewPipNext.addEventListener("click", nextCard);
  els.previewStage.addEventListener("click", handlePipControlsHitAreaClick);
  els.openPip.addEventListener("click", openPip);
  els.openGuide.addEventListener("click", showGuideModal);
  els.clearAll.addEventListener("click", clearAllCards);
  els.closeGuide.addEventListener("click", closeGuideModal);
  els.closeGuideIcon.addEventListener("click", closeGuideModal);
  els.guideModal.addEventListener("click", (event) => {
    const copyButton = event.target instanceof Element ? event.target.closest("[data-copy-url]") : null;
    if (copyButton instanceof HTMLButtonElement) {
      copyGuideUrl(copyButton);
      return;
    }

    if (event.target === els.guideModal) {
      closeGuideModal();
    }
  });

  els.fitMode.addEventListener("change", () => {
    state.settings.fitMode = els.fitMode.value;
    saveSettings();
    updatePreview();
    updatePip();
  });

  els.pipSize.addEventListener("change", () => {
    state.settings.pipSize = els.pipSize.value;
    saveSettings();
  });

  [els.pipControlsSizeSmall, els.pipControlsSizeMedium, els.pipControlsSizeLarge].forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) {
        return;
      }

      state.settings.pipControlsSize = radio.value;
      saveSettings();
      updatePreview();
      updatePip();
    });
  });

  [els.pipControlsPositionTop, els.pipControlsPositionMiddle, els.pipControlsPositionBottom].forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) {
        return;
      }

      state.settings.pipControlsPosition = radio.value;
      saveSettings();
      updatePreview();
      updatePip();
    });
  });

  [
    els.pipControlsPlacementHorizontal,
    els.pipControlsPlacementVerticalLeft,
    els.pipControlsPlacementVerticalRight,
  ].forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) {
        return;
      }

      state.settings.pipControlsPlacement = radio.value;
      saveSettings();
      updatePreview();
      updatePip();
    });
  });

  els.pipControlsFullHeightButtons.addEventListener("change", () => {
    state.settings.pipControlsFullHeightButtons = els.pipControlsFullHeightButtons.checked;
    saveSettings();
    updatePreview();
    updatePip();
  });

  [els.pipControlsBackgroundSolid, els.pipControlsBackgroundTranslucent, els.pipControlsBackgroundClear].forEach(
    (radio) => {
      radio.addEventListener("change", () => {
        if (!radio.checked) {
          return;
        }

        state.settings.pipControlsBackground = radio.value;
        saveSettings();
        updatePreview();
        updatePip();
      });
    },
  );

  els.pipControlsSeparate.addEventListener("change", () => {
    state.settings.pipControlsSeparateFromImage = els.pipControlsSeparate.checked;
    saveSettings();
    updatePreview();
    updatePip();
  });

  els.pipControlsAutoHide.addEventListener("change", () => {
    state.settings.pipControlsAutoHide = els.pipControlsAutoHide.checked;
    saveSettings();
    updatePreview();
    updatePip();
  });

  els.showPipLabel.addEventListener("change", () => {
    state.settings.showPipLabel = els.showPipLabel.checked;
    syncPipLabelOptions();
    saveSettings();
    updatePreview();
    updatePip();
  });

  els.showFileExtension.addEventListener("change", () => {
    state.settings.showFileExtension = els.showFileExtension.checked;
    saveSettings();
    updatePreview();
    updatePip();
  });

  els.optimizeImages.addEventListener("change", () => {
    state.settings.optimizeImages = els.optimizeImages.checked;
    saveSettings();
  });

  els.groupFilter.addEventListener("change", () => {
    state.settings.activeGroupId = els.groupFilter.value;
    syncGroupNameInput();
    saveSettings();
    normalizeCurrentIndex();
    render();
  });

  els.groupName.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    if (isAllGroup(state.settings.activeGroupId)) {
      addGroup();
    } else {
      renameGroup();
    }
  });

  els.addGroup.addEventListener("click", addGroup);
  els.renameGroup.addEventListener("click", renameGroup);
  els.deleteGroup.addEventListener("click", deleteGroup);

  window.addEventListener("keydown", (event) => {
    if (!els.guideModal.hidden && event.key === "Escape") {
      closeGuideModal();
      return;
    }

    if (!els.guideModal.hidden) {
      return;
    }

    if (event.target instanceof Element && event.target.matches("input, select, button, textarea")) {
      return;
    }

    if (event.key === "ArrowLeft") {
      previousCard();
    }
    if (event.key === "ArrowRight") {
      nextCard();
    }
  });

  window.addEventListener("beforeunload", revokeAllObjectUrls);
}

// Ctrl+Vで受け取った画像をFileとして扱い、通常のファイル追加処理へ流す。
async function handlePaste(event) {
  if (!els.guideModal.hidden) {
    return;
  }

  const clipboardData = event.clipboardData;
  if (!clipboardData) {
    setStatus("クリップボードを読み取れませんでした。画像をコピーしてからもう一度試してください。", true);
    return;
  }

  const imageFiles = getClipboardImageFiles(clipboardData);
  if (imageFiles.length === 0) {
    if (isEditablePasteTarget(event.target)) {
      return;
    }

    setStatus("クリップボードに画像が見つかりません。画像をコピーしてからCtrl+Vで貼り付けてください。", true);
    return;
  }

  event.preventDefault();
  await addFiles(imageFiles, {
    sortFiles: false,
    emptyMessage: "クリップボードに画像が見つかりません。画像をコピーしてからもう一度貼り付けてください。",
    progressMessage: (count) => `${count}枚をクリップボードから追加中...`,
    completeMessage: (count) => `${count}枚をクリップボードから追加しました。`,
  });
}

function applyBrowserGuide() {
  const guide = getCurrentBrowserGuide();

  if (els.guideBrowserName) {
    els.guideBrowserName.textContent = guide.browserName;
  }
  if (els.guideExtensionsUrl) {
    els.guideExtensionsUrl.textContent = guide.extensionsUrl;
  }
  if (els.guideExtensionsCopy instanceof HTMLButtonElement) {
    els.guideExtensionsCopy.dataset.copyUrl = guide.extensionsUrl;
  }
  if (els.guideDeveloperModeLabel) {
    els.guideDeveloperModeLabel.textContent = guide.developerModeLabel;
  }
  if (els.guideLoadUnpackedInstruction) {
    els.guideLoadUnpackedInstruction.textContent = guide.loadUnpackedInstruction;
  }
  if (els.guideShortcutsUrl) {
    els.guideShortcutsUrl.textContent = guide.shortcutsUrl;
  }
  if (els.guideShortcutsCopy instanceof HTMLButtonElement) {
    els.guideShortcutsCopy.dataset.copyUrl = guide.shortcutsUrl;
  }
}

function getCurrentBrowserGuide() {
  return isEdgeBrowser() ? EXTENSION_GUIDES.edge : EXTENSION_GUIDES.chrome;
}

function isEdgeBrowser() {
  return /\bEdg\//.test(navigator.userAgent);
}

function getBrowserNameForUrl(url) {
  if (url.startsWith("edge://")) {
    return EXTENSION_GUIDES.edge.browserName;
  }
  if (url.startsWith("chrome://")) {
    return EXTENSION_GUIDES.chrome.browserName;
  }
  return "ブラウザ";
}

function showGuideModal() {
  els.hideGuideNextTime.checked = state.settings.hideGuideOnLaunch;
  els.guideModal.hidden = false;
  document.body.classList.add("modal-open");
  els.closeGuide.focus();
}

function closeGuideModal() {
  state.settings.hideGuideOnLaunch = els.hideGuideNextTime.checked;
  saveSettings();
  els.guideModal.hidden = true;
  document.body.classList.remove("modal-open");
  els.openGuide.focus();
}

async function copyGuideUrl(button) {
  const url = button.dataset.copyUrl;
  if (!url) {
    return;
  }

  const originalText = button.textContent;
  const browserName = getBrowserNameForUrl(url);
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = "コピー済み";
    setStatus(`${url} をコピーしました。${browserName}のアドレスバーに貼り付けて開いてください。`);
  } catch (error) {
    console.error(error);
    button.textContent = "コピー失敗";
    setStatus(`コピーできませんでした。表示されているURLを${browserName}のアドレスバーに入力してください。`, true);
  }

  window.setTimeout(() => {
    button.textContent = originalText;
  }, 1600);
}

// Chrome / Edge拡張機能のグローバルショートカットから届くコマンドをアプリ操作へ変換する。
function handleExtensionMessage(event) {
  if (event.source !== window || event.origin !== window.location.origin) {
    return;
  }

  const data = event.data;
  if (!data || data.source !== "pip-kanpe-hotkeys" || data.type !== "command") {
    return;
  }

  if (data.command === "next") {
    nextCard();
    setStatus("拡張機能ショートカット: 次のカンペへ");
  }

  if (data.command === "previous") {
    previousCard();
    setStatus("拡張機能ショートカット: 前のカンペへ");
  }
}

function updateSupportBadge() {
  const supported = "documentPictureInPicture" in window;
  els.supportBadge.textContent = supported ? "PiP対応" : "PiP非対応";
  els.supportBadge.classList.toggle("ok", supported);
  els.supportBadge.classList.toggle("warn", !supported);
  els.openPip.disabled = !supported;
}

// 画像本体はIndexedDBに保存する。サーバーへアップロードしないための中核。
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function loadCards() {
  return new Promise((resolve, reject) => {
    const store = getImageStore("readonly");
    const request = store.getAll();

    request.onsuccess = () => {
      const cards = request.result
        .map((card, index) => ({
          ...card,
          order: card.order ?? index,
          hidden: Boolean(card.hidden),
          groupIds: normalizeCardGroupIds(card.groupIds),
        }))
        .sort((a, b) => a.order - b.order);
      resolve(cards);
    };
    request.onerror = () => reject(request.error);
  });
}

function putCard(card) {
  return new Promise((resolve, reject) => {
    const store = getImageStore("readwrite");
    const request = store.put(card);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function deleteCardFromDb(id) {
  return new Promise((resolve, reject) => {
    const store = getImageStore("readwrite");
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearImageStore() {
  return new Promise((resolve, reject) => {
    const store = getImageStore("readwrite");
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getImageStore(mode) {
  return state.db.transaction(IMAGE_STORE, mode).objectStore(IMAGE_STORE);
}

// クリップボード画像は名前が汎用的になりがちなので、後から見分けやすい連番名を補う。
function getClipboardImageFiles(clipboardData) {
  const itemFiles = Array.from(clipboardData.items ?? [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(isImageFile);

  const files = itemFiles.length > 0 ? itemFiles : Array.from(clipboardData.files ?? []).filter(isImageFile);
  return files.map((file, index) => toClipboardFile(file, index));
}

function toClipboardFile(file, index) {
  const type = file.type || "image/png";
  const name = getClipboardFileName(file, index);

  return new File([file], name, {
    type,
    lastModified: Date.now() + index,
  });
}

function getClipboardFileName(file, index) {
  const name = typeof file.name === "string" ? file.name.trim() : "";
  if (name && !isGenericClipboardFileName(name)) {
    return name;
  }

  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const sequence = String(index + 1).padStart(2, "0");
  return `clipboard-${timestamp}-${sequence}.${getImageExtension(file.type)}`;
}

function isGenericClipboardFileName(name) {
  return /^(?:image|blob)(?:\.(?:png|jpe?g|gif|webp|bmp))?$/i.test(name);
}

function getImageExtension(type = "") {
  const normalized = type.toLowerCase();
  if (normalized === "image/jpeg") {
    return "jpg";
  }
  if (normalized === "image/svg+xml") {
    return "svg";
  }

  const match = normalized.match(/^image\/([a-z0-9.+-]+)$/);
  return match ? match[1].replace("+xml", "") : "png";
}

function isImageFile(file) {
  return Boolean(file) && typeof file.type === "string" && file.type.startsWith("image/");
}

function isEditablePasteTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  const editable = target.closest("[contenteditable]");
  return target.matches("input, textarea") || Boolean(editable && editable.getAttribute("contenteditable") !== "false");
}

// ファイル選択、ドラッグ&ドロップ、クリップボード貼り付けを共通の登録処理にまとめる。
async function addFiles(fileList, options = {}) {
  const {
    sortFiles = true,
    emptyMessage = "画像ファイルを選択してください。",
    progressMessage = (count) => `${count}枚をファイル名順で追加中...`,
    completeMessage = (count) => `${count}枚追加しました。`,
  } = options;

  if (!state.db) {
    setStatus("保存領域の準備がまだ終わっていません。", true);
    return;
  }

  const imageFiles = Array.from(fileList).filter(isImageFile);
  if (sortFiles) {
    imageFiles.sort(compareFilesByName);
  }

  if (imageFiles.length === 0) {
    setStatus(emptyMessage, true);
    return;
  }

  const remaining = MAX_CARDS - state.cards.length;
  if (remaining <= 0) {
    setStatus(`登録できる画像は最大${MAX_CARDS}枚です。`, true);
    return;
  }

  const accepted = imageFiles.slice(0, remaining);
  if (accepted.length < imageFiles.length) {
    setStatus(`上限のため${accepted.length}枚だけ追加します。`, true);
  } else {
    setStatus(progressMessage(accepted.length));
  }

  const baseOrder = state.cards.length > 0 ? Math.max(...state.cards.map((card) => card.order)) + 1 : 0;
  let addedCount = 0;

  for (const [index, file] of accepted.entries()) {
    try {
      const storedBlob = state.settings.optimizeImages ? await optimizeImage(file) : file;
      const card = {
        id: crypto.randomUUID(),
        name: file.name,
        type: storedBlob.type || file.type,
        size: storedBlob.size,
        originalSize: file.size,
        order: baseOrder + index,
        hidden: false,
        groupIds: getInitialCardGroupIds(),
        createdAt: Date.now(),
        blob: storedBlob,
      };

      await putCard(card);
      state.cards.push(card);
      addedCount += 1;
    } catch (error) {
      console.error(error);
      setStatus(`${file.name} の追加に失敗しました。`, true);
    }
  }

  state.currentIndex = Math.max(0, state.cards.length - addedCount);
  render();
  if (addedCount > 0) {
    setStatus(completeMessage(addedCount));
  } else {
    setStatus("画像を追加できませんでした。", true);
  }
}

// 大量登録時の保存容量とサムネイル負荷を抑える。元より重くなる場合は元ファイルを残す。
function optimizeImage(file) {
  return new Promise((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);

      const maxEdge = 2048;
      const sourceWidth = image.naturalWidth;
      const sourceHeight = image.naturalHeight;
      const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));

      if (scale === 1 && file.size < 1_200_000) {
        resolve(file);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));

      const context = canvas.getContext("2d", { alpha: true });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size > file.size) {
            resolve(file);
            return;
          }
          resolve(blob);
        },
        "image/webp",
        0.92,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    image.src = url;
  });
}

// 状態変更後の再描画入口。カード一覧、プレビュー、PiPを同じ状態から同期する。
function render() {
  normalizeCurrentIndex();
  renderGroupControls();
  renderDeckMeta();
  renderThumbList();
  updatePreview();
  updateControls();
  updatePip();
}

// グループは画像本体ではなく設定とcard.groupIdsで管理する。画像削除とは独立している。
function renderGroupControls() {
  normalizeSettingsGroups();

  const currentInputFocused = document.activeElement === els.groupName;
  els.groupFilter.textContent = "";

  const allOption = document.createElement("option");
  allOption.value = ALL_GROUP_ID;
  allOption.textContent = "すべて";
  els.groupFilter.append(allOption);

  state.settings.groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    els.groupFilter.append(option);
  });

  els.groupFilter.value = state.settings.activeGroupId;
  if (!currentInputFocused) {
    syncGroupNameInput();
  }

  const groupSelected = Boolean(getActiveGroup());
  els.renameGroup.disabled = !groupSelected;
  els.deleteGroup.disabled = !groupSelected;
}

// 過去バージョンや手編集されたlocalStorageでも壊れないようにグループ設定を正規化する。
function normalizeSettingsGroups() {
  const groups = Array.isArray(state.settings.groups) ? state.settings.groups : [];
  const seen = new Set();
  state.settings.groups = groups
    .map((group, index) => {
      const id = typeof group.id === "string" && group.id.length > 0 ? group.id : `group-${index + 1}`;
      const name = typeof group.name === "string" ? group.name.trim() : "";
      return { id, name: name || `グループ ${index + 1}` };
    })
    .filter((group) => {
      if (group.id === ALL_GROUP_ID || seen.has(group.id)) {
        return false;
      }

      seen.add(group.id);
      return true;
    });

  if (!getGroupById(state.settings.activeGroupId)) {
    state.settings.activeGroupId = ALL_GROUP_ID;
  }
}

function syncGroupNameInput() {
  const group = getActiveGroup();
  els.groupName.value = group ? group.name : "";
}

function getGroupById(groupId) {
  if (isAllGroup(groupId)) {
    return null;
  }

  return state.settings.groups.find((group) => group.id === groupId) ?? null;
}

function getActiveGroup() {
  return getGroupById(state.settings.activeGroupId);
}

function getGroupNameInputValue() {
  return els.groupName.value.trim().replace(/\s+/g, " ");
}

function createGroupId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getInitialCardGroupIds() {
  return isAllGroup(state.settings.activeGroupId) ? [] : [state.settings.activeGroupId];
}

function addGroup() {
  const name = getGroupNameInputValue();
  if (!name) {
    setStatus("グループ名を入力してください。", true);
    els.groupName.focus();
    return;
  }

  const group = { id: createGroupId(), name };
  state.settings.groups = [...state.settings.groups, group];
  state.settings.activeGroupId = group.id;
  saveSettings();
  render();
  setStatus(`グループ「${group.name}」を追加しました。`);
}

function renameGroup() {
  const group = getActiveGroup();
  if (!group) {
    setStatus("名前を変更するグループを選択してください。", true);
    return;
  }

  const name = getGroupNameInputValue();
  if (!name) {
    setStatus("グループ名を入力してください。", true);
    els.groupName.focus();
    return;
  }

  state.settings.groups = state.settings.groups.map((currentGroup) =>
    currentGroup.id === group.id ? { ...currentGroup, name } : currentGroup,
  );
  saveSettings();
  render();
  setStatus(`グループ名を「${name}」に変更しました。`);
}

async function deleteGroup() {
  const group = getActiveGroup();
  if (!group) {
    return;
  }

  const assignedCount = state.cards.filter((card) => normalizeCardGroupIds(card.groupIds).includes(group.id)).length;
  const ok = confirm(
    `グループ「${group.name}」を削除します。画像は削除されず、このグループ所属だけ外れます。よろしいですか？（所属 ${assignedCount}枚）`,
  );
  if (!ok) {
    return;
  }

  state.cards = removeGroupFromCards(state.cards, group.id);
  await Promise.all(state.cards.map((card) => putCard(card)));
  state.settings.groups = state.settings.groups.filter((currentGroup) => currentGroup.id !== group.id);
  state.settings.activeGroupId = ALL_GROUP_ID;
  saveSettings();
  normalizeCurrentIndex();
  render();
  setStatus(`グループ「${group.name}」を削除しました。画像は残っています。`);
}

function renderDeckMeta() {
  const groupIndices = getGroupIndices();
  const groupCards = groupIndices.map((index) => state.cards[index]);
  const targetCards = isAllGroup(state.settings.activeGroupId) ? state.cards : groupCards;
  const totalSize = targetCards.reduce((sum, card) => sum + (card.size || 0), 0);
  const hiddenCount = targetCards.filter((card) => card.hidden).length;
  const hiddenLabel = hiddenCount > 0 ? ` · 非表示 ${hiddenCount}` : "";
  const countLabel = isAllGroup(state.settings.activeGroupId)
    ? `${state.cards.length} / ${MAX_CARDS}`
    : `${groupCards.length}枚（全体 ${state.cards.length} / ${MAX_CARDS}）`;
  els.deckMeta.textContent = `${countLabel} · ${formatBytes(totalSize)}${hiddenLabel}`;
}

// サムネイル一覧は現在の表示グループだけを描画する。非表示画像は選択対象から外す。
function renderThumbList() {
  els.thumbList.textContent = "";

  if (state.cards.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-line";
    empty.textContent = "まだ画像がありません。";
    els.thumbList.append(empty);
    return;
  }

  const groupIndices = getGroupIndices();
  if (groupIndices.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-line";
    empty.textContent = "このグループにはまだ画像がありません。";
    els.thumbList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  groupIndices.forEach((index, displayIndex) => {
    const card = state.cards[index];
    const item = document.createElement("article");
    item.className = `thumb-item${index === state.currentIndex && !card.hidden ? " active" : ""}${
      card.hidden ? " is-hidden" : ""
    }`;

    const select = document.createElement("button");
    select.type = "button";
    select.className = "thumb-select";
    select.disabled = card.hidden;
    select.title = card.hidden ? "非表示中です（目アイコンで再表示）" : "この画像をプレビューに表示";
    select.addEventListener("click", () => selectCard(index));

    const figure = document.createElement("span");
    figure.className = "thumb-figure";

    const image = document.createElement("img");
    image.src = getObjectUrl(card);
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    figure.append(image);

    if (card.hidden) {
      const badge = document.createElement("span");
      badge.className = "thumb-badge";
      badge.textContent = "非表示";
      figure.append(badge);
    }

    const body = document.createElement("span");
    body.className = "thumb-body";
    const name = document.createElement("span");
    name.className = "thumb-name";
    name.textContent = card.name;

    const sub = document.createElement("span");
    sub.className = "thumb-sub";
    sub.textContent = `${displayIndex + 1}枚目 · ${formatBytes(card.size || 0)}`;

    body.append(name, sub);
    select.append(figure, body);

    const toggle = makeHideToggle(card, index);
    const rename = makeMiniButton("名", "名前変更", () => renameCard(index), "thumb-rename");

    const actions = document.createElement("div");
    actions.className = "thumb-actions";
    actions.append(toggle, rename);

    const remove = makeMiniButton("×", "削除", () => removeCard(index), "danger thumb-remove");

    item.append(select, actions, remove);
    const groups = makeGroupAssignments(card, index);
    if (groups) {
      item.append(groups);
    }

    const reorder = document.createElement("div");
    reorder.className = "thumb-reorder";
    reorder.append(
      makeMiniButton("↑", "前へ移動", () => moveCard(index, -1), "", displayIndex === 0),
      makeMiniButton("↓", "後ろへ移動", () => moveCard(index, 1), "", displayIndex === groupIndices.length - 1),
    );

    const row = document.createElement("div");
    row.className = "thumb-row";
    row.append(item, reorder);
    fragment.append(row);
  });

  els.thumbList.append(fragment);
}

function makeHideToggle(card, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `mini-button toggle${card.hidden ? " active" : ""}`;
  button.innerHTML = card.hidden ? EYE_OFF_ICON : EYE_ICON;
  button.title = card.hidden ? "プレビュー/PiPで表示する" : "プレビュー/PiPで非表示にする";
  button.setAttribute("aria-label", card.hidden ? "再表示する" : "非表示にする");
  button.addEventListener("click", () => toggleHidden(index));
  return button;
}

function makeMiniButton(label, title, onClick, extraClass = "", disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `mini-button ${extraClass}`.trim();
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function makeGroupAssignments(card, index) {
  if (state.settings.groups.length === 0) {
    return null;
  }

  const groupIds = normalizeCardGroupIds(card.groupIds);
  const wrapper = document.createElement("div");
  wrapper.className = "thumb-groups";

  state.settings.groups.forEach((group) => {
    const label = document.createElement("label");
    const checked = groupIds.includes(group.id);
    label.className = `thumb-group-option${checked ? " is-active" : ""}`;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.addEventListener("change", () => updateCardGroup(index, group.id));

    const name = document.createElement("span");
    name.textContent = group.name;

    label.append(input, name);
    wrapper.append(label);
  });

  return wrapper;
}

async function updateCardGroup(index, groupId) {
  const card = state.cards[index];
  if (!card) {
    return;
  }

  state.cards = toggleCardGroup(state.cards, index, groupId);
  const updatedCard = state.cards[index];
  await putCard(updatedCard);
  normalizeCurrentIndex();
  render();
  setStatus(`「${updatedCard.name}」のグループを更新しました。`);
}

// プレビューは通常画面側の確認用。PiPと同じCSSクラスを使って見た目の差を減らす。
function updatePreview() {
  const card = getCurrentCard();
  const hasCards = Boolean(card);
  const multipleVisible = getVisibleIndices().length > 1;

  els.emptyState.style.display = hasCards ? "none" : "block";
  els.previewImage.style.display = hasCards ? "block" : "none";
  els.previewImage.classList.toggle("cover", state.settings.fitMode === "cover");
  els.previewStage.classList.toggle("separate", state.settings.pipControlsSeparateFromImage);
  els.previewStage.classList.toggle("auto-hide-controls", state.settings.pipControlsAutoHide);
  els.previewPipControls.style.display = hasCards ? "grid" : "none";
  applyPipControlClasses(els.previewPipControls);
  updatePipButtonLabels(els.previewPipPrev, els.previewPipNext);

  if (!hasCards) {
    updateEmptyState();
  }

  if (hasCards) {
    els.previewImage.src = getObjectUrl(card);
    els.previewImage.alt = card.name;
    els.previewPipLabel.textContent = formatPipLabel(card);
    els.previewPipPrev.disabled = !multipleVisible;
    els.previewPipNext.disabled = !multipleVisible;
  } else {
    els.previewImage.removeAttribute("src");
    els.previewImage.alt = "";
    els.previewPipLabel.textContent = "";
    els.previewPipPrev.disabled = true;
    els.previewPipNext.disabled = true;
  }
}

function updateEmptyState() {
  const strong = els.emptyState.querySelector("strong");
  const span = els.emptyState.querySelector("span");
  if (!strong || !span) {
    return;
  }

  if (state.cards.length === 0) {
    strong.textContent = "攻略中に見たい画像を登録してください";
    span.textContent = "PiP小窓の左右ボタン、またはこの画面の←→で切り替えできます。";
  } else if (getGroupIndices().length === 0) {
    strong.textContent = "このグループにはまだ画像がありません";
    span.textContent = "このグループを選んだまま画像を追加するか、登録画像のグループチェックをオンにしてください。";
  } else {
    strong.textContent = "表示できる画像がありません";
    span.textContent = "登録画像リストの目アイコンを押すと、非表示にした画像を再表示できます。";
  }
}

function updateControls() {
  const hasCards = state.cards.length > 0;
  const hasVisibleCards = getVisibleIndices().length > 0;

  els.openPip.disabled = !hasVisibleCards || !("documentPictureInPicture" in window);
  els.clearAll.disabled = !hasCards;
}

// Document Picture-in-Pictureを開く。失敗時はユーザー操作から再試行してもらう。
async function openPip() {
  if (!("documentPictureInPicture" in window)) {
    setStatus("このブラウザはDocument Picture-in-Pictureに対応していません。", true);
    return;
  }

  if (!getCurrentCard()) {
    const hasGroupCards = getGroupIndices().length > 0;
    setStatus(
      state.cards.length > 0 && hasGroupCards
        ? "表示できる画像がありません。リストの目アイコンで非表示を解除してください。"
        : state.cards.length > 0
          ? "このグループにはまだ画像がありません。画像を追加するか、登録画像のグループチェックをオンにしてください。"
          : "PiPで表示する画像を登録してください。",
      true,
    );
    return;
  }

  try {
    const [width, height] = state.settings.pipSize.split("x").map(Number);
    state.pipWindow = await window.documentPictureInPicture.requestWindow({
      width,
      height,
      disallowReturnToOpener: true,
      preferInitialWindowPlacement: true,
    });

    buildPipDocument();
    updatePip();
    setStatus("PiPを開きました。FF14は仮想フルスクリーンまたはウィンドウモードで表示できます。");
  } catch (error) {
    console.error(error);
    setStatus("PiPを開けませんでした。ボタン操作からもう一度試してください。", true);
  }
}

// PiPは別documentなので、必要なDOMとCSSを小窓側に作り直す。
function buildPipDocument() {
  const pip = state.pipWindow;
  if (!pip || pip.closed) {
    return;
  }

  pip.document.title = formatPipDocumentTitle(getCurrentCard());
  pip.document.body.className = "pip-body";

  const style = pip.document.createElement("style");
  style.textContent = getPipCss();

  const shell = pip.document.createElement("main");
  shell.className = "pip-shell";
  shell.id = "pip-shell";

  const image = pip.document.createElement("img");
  image.id = "pip-image";
  image.alt = "";

  const controls = pip.document.createElement("div");
  controls.className = "pip-controls";
  controls.id = "pip-controls";

  const prev = pip.document.createElement("button");
  prev.id = "pip-prev";
  prev.className = "pip-button";
  prev.type = "button";
  prev.title = "前の画像";

  const label = pip.document.createElement("div");
  label.id = "pip-label";
  label.className = "pip-label";

  const next = pip.document.createElement("button");
  next.id = "pip-next";
  next.className = "pip-button";
  next.type = "button";
  next.title = "次の画像";

  controls.append(prev, label, next);
  shell.append(image, controls);
  pip.document.head.replaceChildren(style);
  pip.document.body.replaceChildren(shell);

  prev.addEventListener("click", previousCard);
  next.addEventListener("click", nextCard);
  shell.addEventListener("click", handlePipControlsHitAreaClick);
  pip.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      previousCard();
    }
    if (event.key === "ArrowRight") {
      nextCard();
    }
  });
  pip.addEventListener("pagehide", () => {
    state.pipWindow = null;
  });
}

// 同一オリジンでもPiP側documentにはCSSが自動継承されないため、pip関連ルールをコピーする。
function getPipCss() {
  const cssRules = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.cssText.includes("pip-") || rule.cssText.includes("body.pip-body")) {
          cssRules.push(rule.cssText);
        }
      }
    } catch (error) {
      console.warn("PiP CSS copy skipped", error);
    }
  }
  return cssRules.join("\n");
}

// 現在のカード、表示設定、ボタン状態をPiP小窓へ反映する。
function updatePip() {
  const pip = state.pipWindow;
  if (!pip || pip.closed) {
    return;
  }

  const image = pip.document.getElementById("pip-image");
  const shell = pip.document.getElementById("pip-shell");
  const label = pip.document.getElementById("pip-label");
  const prev = pip.document.getElementById("pip-prev");
  const next = pip.document.getElementById("pip-next");
  const controls = pip.document.getElementById("pip-controls");
  const card = getCurrentCard();

  if (!image || !label || !prev || !next || !controls || !shell) {
    return;
  }

  if (!card) {
    image.removeAttribute("src");
    image.style.display = "none";
    image.alt = "";
    pip.document.title = getActiveGroup() ? `PiP カンペ - ${getActiveGroup().name}` : formatPipDocumentTitle(null);
    label.textContent =
      state.cards.length > 0 && getGroupIndices().length === 0
        ? "このグループにはまだ画像がありません"
        : state.cards.length > 0
          ? "表示できる画像がありません"
          : "";
    prev.disabled = true;
    next.disabled = true;
    return;
  }

  image.src = getObjectUrl(card);
  image.style.display = "block";
  image.alt = card.name;
  pip.document.title = formatPipDocumentTitle(card);
  image.classList.toggle("cover", state.settings.fitMode === "cover");
  shell.classList.toggle("separate", state.settings.pipControlsSeparateFromImage);
  shell.classList.toggle("auto-hide-controls", state.settings.pipControlsAutoHide);
  applyPipControlClasses(controls);
  updatePipButtonLabels(prev, next);
  label.textContent = formatPipLabel(card);
  const multipleVisible = getVisibleIndices().length > 1;
  prev.disabled = !multipleVisible;
  next.disabled = !multipleVisible;
}

// 設定値をCSSクラスへ変換する。PiPとプレビューが同じ関数を使うのが重要。
function applyPipControlClasses(controls) {
  controls.classList.remove(
    ...PIP_CONTROL_SIZE_CLASSES,
    ...PIP_CONTROL_PLACEMENT_CLASSES,
    ...PIP_CONTROL_BEHAVIOR_CLASSES,
    ...PIP_CONTROL_POSITION_CLASSES,
    ...PIP_CONTROL_BACKGROUND_CLASSES,
  );
  controls.classList.add(
    getPipControlsSize(),
    getPipControlsPlacementClass(),
    getPipControlsPosition(),
    getPipControlsBackground(),
  );
  controls.classList.toggle("vertical", isVerticalPipControls());
  controls.classList.toggle("full-height-buttons", state.settings.pipControlsFullHeightButtons === true);
  controls.classList.toggle("separate", state.settings.pipControlsSeparateFromImage);
  controls.classList.toggle("label-hidden", !shouldShowPipLabel());
}

function getPipControlsSize() {
  return resolvePipControlsSize(state.settings);
}

function getPipControlsPlacement() {
  return PIP_CONTROL_PLACEMENTS.includes(state.settings.pipControlsPlacement)
    ? state.settings.pipControlsPlacement
    : DEFAULT_PIP_CONTROL_PLACEMENT;
}

function getPipControlsPlacementClass() {
  return getPipControlsPlacement();
}

function isVerticalPipControls() {
  return getPipControlsPlacement() !== "horizontal";
}

function getPipControlsPosition() {
  return resolvePipControlsPosition(state.settings);
}

function getPipControlsBackground() {
  return resolvePipControlsBackground(state.settings);
}

function formatPipLabel(card) {
  return formatCorePipLabel(state.cards, state.currentIndex, state.settings, state.settings.activeGroupId);
}

function shouldShowPipLabel() {
  return state.settings.showPipLabel !== false;
}

function updatePipButtonLabels(prev, next) {
  const vertical = isVerticalPipControls();
  prev.textContent = vertical ? "↑" : "←";
  next.textContent = vertical ? "↓" : "→";
}

// 「縦いっぱい」のクリック判定。見た目のボタンは小さいまま、矢印レーンだけを広く扱う。
function handlePipControlsHitAreaClick(event) {
  if (state.settings.pipControlsFullHeightButtons !== true || getVisibleIndices().length <= 1) {
    return;
  }

  const target = event.target;
  if (target && typeof target.closest === "function" && target.closest(".pip-button")) {
    return;
  }

  const container = event.currentTarget;
  if (!container || typeof container.getBoundingClientRect !== "function") {
    return;
  }

  const controls = container.querySelector(".pip-controls");
  const previousButton = controls?.querySelector(".pip-button:first-of-type");
  const nextButton = controls?.querySelector(".pip-button:last-of-type");
  if (!controls || !previousButton || !nextButton || previousButton.disabled || nextButton.disabled) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const previousRect = previousButton.getBoundingClientRect();
  const nextRect = nextButton.getBoundingClientRect();
  if (
    containerRect.width <= 0 ||
    containerRect.height <= 0 ||
    previousRect.width <= 0 ||
    nextRect.width <= 0
  ) {
    return;
  }

  if (isVerticalPipControls()) {
    const laneLeft = Math.min(previousRect.left, nextRect.left);
    const laneRight = Math.max(previousRect.right, nextRect.right);
    if (event.clientX < laneLeft || event.clientX > laneRight) {
      return;
    }

    if (event.clientY < containerRect.top + containerRect.height / 2) {
      previousCard();
    } else {
      nextCard();
    }
    return;
  }

  if (event.clientX >= previousRect.left && event.clientX <= previousRect.right) {
    previousCard();
  } else if (event.clientX >= nextRect.left && event.clientX <= nextRect.right) {
    nextCard();
  }
}

function formatPipDocumentTitle(card) {
  return card ? `PiP カンペ - ${formatPipName(card)}` : "PiP カンペ";
}

function formatPipName(card) {
  return formatCorePipName(card, state.settings);
}

// カード操作はIndexedDB更新後にrender()へ戻す。表示中のPiPもrender()経由で同期される。
function selectCard(index) {
  const card = state.cards[index];
  if (!card || card.hidden || !isCardInGroup(card, state.settings.activeGroupId)) {
    return;
  }

  state.currentIndex = index;
  render();
}

function previousCard() {
  stepCard(-1);
}

function nextCard() {
  stepCard(1);
}

function stepCard(direction) {
  const nextIndex = stepVisibleCard(state.cards, state.currentIndex, direction, state.settings.activeGroupId);
  if (nextIndex === state.currentIndex) {
    return;
  }

  state.currentIndex = nextIndex;
  render();
}

async function toggleHidden(index) {
  const card = state.cards[index];
  if (!card) {
    return;
  }

  state.cards = toggleHiddenCards(state.cards, index);
  const updatedCard = state.cards[index];
  await putCard(updatedCard);
  normalizeCurrentIndex();
  render();
  setStatus(
    updatedCard.hidden
      ? `「${updatedCard.name}」をプレビュー/PiPで非表示にしました。`
      : `「${updatedCard.name}」を再表示しました。`,
  );
}

async function renameCard(index) {
  const card = state.cards[index];
  if (!card) {
    return;
  }

  const nextName = window.prompt("画像名を入力してください。", card.name);
  if (nextName === null) {
    return;
  }

  const name = nextName.trim();
  if (!name) {
    setStatus("画像名を入力してください。", true);
    return;
  }

  if (name === card.name) {
    return;
  }

  const updatedCard = { ...card, name };
  try {
    await putCard(updatedCard);
    state.cards = state.cards.map((currentCard, cardIndex) => (cardIndex === index ? updatedCard : currentCard));
    render();
    updatePip();
    setStatus(`画像名を「${name}」に変更しました。`);
  } catch (error) {
    console.error(error);
    setStatus("画像名を変更できませんでした。", true);
  }
}

async function removeCard(index) {
  const card = state.cards[index];
  if (!card) {
    return;
  }

  await deleteCardFromDb(card.id);
  revokeObjectUrl(card.id);
  state.cards.splice(index, 1);
  normalizeCurrentIndex();
  await persistOrder();
  render();
  setStatus("画像を削除しました。");
}

async function moveCard(index, direction) {
  const result = isAllGroup(state.settings.activeGroupId)
    ? reorderCards(state.cards, index, direction, state.currentIndex)
    : reorderCardInActiveGroup(index, direction);
  if (!result) {
    return;
  }

  if (result.cards.every((card, cardIndex) => card === state.cards[cardIndex])) {
    return;
  }

  state.cards = result.cards;
  state.currentIndex = result.currentIndex;
  await persistOrder();
  render();
}

// 表示グループ内の並び替えは、全体配列の相対順を入れ替えて保存する。
function reorderCardInActiveGroup(index, direction) {
  const groupIndices = getGroupIndices();
  const groupPosition = groupIndices.indexOf(index);
  const targetIndex = groupIndices[groupPosition + direction];
  if (groupPosition === -1 || targetIndex === undefined) {
    return null;
  }

  const currentCardId = state.cards[state.currentIndex]?.id;
  const nextCards = [...state.cards];
  const [card] = nextCards.splice(index, 1);
  nextCards.splice(targetIndex, 0, card);

  const nextCurrentIndex = currentCardId
    ? Math.max(0, nextCards.findIndex((nextCard) => nextCard.id === currentCardId))
    : state.currentIndex;

  return { cards: nextCards, currentIndex: nextCurrentIndex };
}

async function persistOrder() {
  const updates = state.cards.map((card, index) => {
    card.order = index;
    return putCard(card);
  });
  await Promise.all(updates);
}

async function clearAllCards() {
  if (state.cards.length === 0) {
    return;
  }

  const ok = confirm("登録画像をすべて削除します。よろしいですか？");
  if (!ok) {
    return;
  }

  await clearImageStore();
  revokeAllObjectUrls();
  state.cards = [];
  state.currentIndex = 0;
  render();
  setStatus("すべて削除しました。");
}

function normalizeCurrentIndex() {
  state.currentIndex = normalizeIndex(state.cards, state.currentIndex, state.settings.activeGroupId);
}

function getGroupIndices() {
  return getCardGroupIndices(state.cards, state.settings.activeGroupId);
}

function getVisibleIndices() {
  return getVisibleCardIndices(state.cards, state.settings.activeGroupId);
}

function getCurrentCard() {
  return getCurrentVisibleCard(state.cards, state.currentIndex, state.settings.activeGroupId);
}

// 画像プレビュー用のObject URLは使い回し、削除や画面離脱で解放する。
function getObjectUrl(card) {
  if (!state.objectUrls.has(card.id)) {
    state.objectUrls.set(card.id, URL.createObjectURL(card.blob));
  }
  return state.objectUrls.get(card.id);
}

function revokeObjectUrl(id) {
  const url = state.objectUrls.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    state.objectUrls.delete(id);
  }
}

function revokeAllObjectUrls() {
  for (const url of state.objectUrls.values()) {
    URL.revokeObjectURL(url);
  }
  state.objectUrls.clear();
}

// 設定はlocalStorage保存。画像本体とは分けて、軽く読み書きできるようにする。
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      state.settings = { ...state.settings, ...JSON.parse(raw) };
    }
  } catch (error) {
    console.warn("Settings load failed", error);
  }

  normalizeSettingsGroups();
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

// 保存済み設定をフォームへ反映する。初回ガイド表示の判定もここで行う。
function applySettingsToControls() {
  els.fitMode.value = state.settings.fitMode;
  els.pipSize.value = state.settings.pipSize;
  const pipControlsSize = getPipControlsSize();
  const pipControlsPlacement = getPipControlsPlacement();
  const pipControlsPosition = getPipControlsPosition();
  const pipControlsBackground = getPipControlsBackground();
  els.pipControlsSizeSmall.checked = pipControlsSize === "small";
  els.pipControlsSizeMedium.checked = pipControlsSize === "medium";
  els.pipControlsSizeLarge.checked = pipControlsSize === "large";
  els.pipControlsPlacementHorizontal.checked = pipControlsPlacement === "horizontal";
  els.pipControlsPlacementVerticalLeft.checked = pipControlsPlacement === "vertical-left";
  els.pipControlsPlacementVerticalRight.checked = pipControlsPlacement === "vertical-right";
  els.pipControlsFullHeightButtons.checked = state.settings.pipControlsFullHeightButtons === true;
  els.pipControlsPositionTop.checked = pipControlsPosition === "top";
  els.pipControlsPositionMiddle.checked = pipControlsPosition === "middle";
  els.pipControlsPositionBottom.checked = pipControlsPosition === "bottom";
  els.pipControlsBackgroundSolid.checked = pipControlsBackground === "background-solid";
  els.pipControlsBackgroundTranslucent.checked = pipControlsBackground === "background-translucent";
  els.pipControlsBackgroundClear.checked = pipControlsBackground === "background-clear";
  els.pipControlsSeparate.checked = state.settings.pipControlsSeparateFromImage;
  els.pipControlsAutoHide.checked = state.settings.pipControlsAutoHide;
  els.showPipLabel.checked = shouldShowPipLabel();
  els.showFileExtension.checked = state.settings.showFileExtension;
  syncPipLabelOptions();
  els.optimizeImages.checked = state.settings.optimizeImages;
  els.hideGuideNextTime.checked = state.settings.hideGuideOnLaunch;

  const guideForced = new URLSearchParams(window.location.search).get("guide") === "1";
  if (guideForced || !state.settings.hideGuideOnLaunch) {
    requestAnimationFrame(showGuideModal);
  }
}

function syncPipLabelOptions() {
  els.showFileExtension.disabled = !shouldShowPipLabel();
}

function setStatus(message, isError = false) {
  els.statusLine.textContent = message;
  els.statusLine.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
