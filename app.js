import {
  ALL_GROUP_ID,
  DECK_FILE_EXTENSION,
  DECK_FILE_FORMAT,
  DECK_SCHEMA_VERSION,
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
  normalizeDeckCards,
  normalizeDeckGroups,
  normalizeIndex,
  removeGroupFromCards,
  reorder as reorderCards,
  resolveAppVariant,
  resolvePipControlsBackground,
  resolvePipControlsPosition,
  resolvePipControlsSize,
  sanitizeDeckFileName,
  step as stepVisibleCard,
  toggleCardGroup,
  toggleHidden as toggleHiddenCards,
} from "./core.js";

// 主要な制限値と保存先。枚数上限やDB名を変えるforkはまずここを見る。
const MAX_CARDS = 80;
const APP_VARIANT = getAppVariant();
const IS_BETA = APP_VARIANT === "beta";
const DB_NAME = IS_BETA ? "pip-kanpe-tool-beta" : "pip-kanpe-tool";
const DB_VERSION = 1;
const IMAGE_STORE = "images";
const SETTINGS_KEY = IS_BETA ? "pip-kanpe-settings-beta" : "pip-kanpe-settings";
const DECK_EXPORT_SETTING_KEYS = [
  "fitMode",
  "pipSize",
  "pipControlsSize",
  "pipControlsPlacement",
  "pipControlsFullHeightButtons",
  "pipControlsPosition",
  "pipControlsBackground",
  "pipControlsSeparateFromImage",
  "pipControlsAutoHide",
  "showPipLabel",
  "showFileExtension",
];
const PIP_CONTROL_PLACEMENTS = ["horizontal", "vertical-left", "vertical-right"];
const DEFAULT_PIP_CONTROL_PLACEMENT = "horizontal";
const PIP_CONTROL_PLACEMENT_CLASSES = ["horizontal", "vertical", "vertical-left", "vertical-right"];
const PIP_CONTROL_BEHAVIOR_CLASSES = ["full-height-buttons"];
const EXTENSION_GUIDES = {
  chrome: {
    browserName: "Chrome",
    downloadUrl:
      "https://github.com/Linn-0412/pip-kanpe-tool/releases/latest/download/pip-kanpe-tool-hotkeys-extension.zip",
    downloadText: "こちらからChrome / Edge用拡張機能ZIPをダウンロード",
    extensionsUrl: "chrome://extensions/",
    shortcutsUrl: "chrome://extensions/shortcuts",
    extensionsInstruction:
      "Chromeの拡張機能画面（chrome://extensions/）を開き、デベロッパーモードをオンにします。",
    loadUnpackedInstruction: "「パッケージ化されていない拡張機能を読み込む」から、解凍したフォルダを選びます。",
    shortcutsInstruction: "ショートカット設定画面（chrome://extensions/shortcuts）でキー設定を確認します。",
    note:
      "※ 初期設定は「Ctrl+Shift+8」が前、「Ctrl+Shift+9」が次です。FF14のキーバインドと衝突する場合はショートカット設定画面で別のキーに変更してください。",
  },
  edge: {
    browserName: "Edge",
    downloadUrl:
      "https://github.com/Linn-0412/pip-kanpe-tool/releases/latest/download/pip-kanpe-tool-hotkeys-extension.zip",
    downloadText: "こちらからChrome / Edge用拡張機能ZIPをダウンロード",
    extensionsUrl: "edge://extensions/",
    shortcutsUrl: "edge://extensions/shortcuts",
    extensionsInstruction:
      "Edgeの拡張機能画面（edge://extensions/）を開き、左下の開発者モードをオンにします。",
    loadUnpackedInstruction: "「展開して読み込む」から、解凍したフォルダを選びます。",
    shortcutsInstruction: "ショートカット設定画面（edge://extensions/shortcuts）でキー設定を確認します。",
    note:
      "※ 初期設定は「Ctrl+Shift+8」が前、「Ctrl+Shift+9」が次です。FF14のキーバインドと衝突する場合はショートカット設定画面で別のキーに変更してください。",
  },
};

const EYE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.5 10.5 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.5 9.5 0 0 1 12 4c6.5 0 10 7 10 7a18.6 18.6 0 0 1-2.16 3.19M1 1l22 22"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>`;
const SVG_NS = "http://www.w3.org/2000/svg";
const MAKER_WIDTH = 1024;
const MAKER_HEIGHT = 1024;
const MAKER_CENTER = { x: MAKER_WIDTH / 2, y: MAKER_HEIGHT / 2 };
const MAKER_AXIS_SCALE_MIN = 0.25;
const MAKER_AXIS_SCALE_MAX = 10;
const ROLE_COLORS = {
  tank: "#4db8ff",
  healer: "#55d989",
  dps: "#ff5a70",
};
const BOSS_MARKER_COLOR = "#ff5a70";
const DICE_COLORS = ["#4db8ff", "#ff6b4a", "#4db8ff", "#ff6b4a", "#4db8ff", "#ff6b4a", "#4db8ff", "#ff6b4a"];
const MAKER_FIELD_BACKGROUNDS = {
  "yosei-p1": {
    label: "絶妖星乱舞 P1",
    name: "絶妖星乱舞 P1",
    src: "./assets/maker/fields/yosei-p1.png",
  },
  "yosei-p2": {
    label: "絶妖星乱舞 P2",
    name: "絶妖星乱舞 P2",
    src: "./assets/maker/fields/yosei-p2.png",
  },
  "yosei-p3": {
    label: "絶妖星乱舞 P3",
    name: "絶妖星乱舞 P3",
    src: "./assets/maker/fields/yosei-p3.png",
  },
  "yosei-p4": {
    label: "絶妖星乱舞 P4",
    name: "絶妖星乱舞 P4",
    src: "./assets/maker/fields/yosei-p4.png",
  },
  "yosei-p5": {
    label: "絶妖星乱舞 P5",
    name: "絶妖星乱舞 P5",
    src: "./assets/maker/fields/yosei-p5.png",
  },
};
const FIELD_MARKER_ASSETS = [
  { id: "a", label: "A", color: "#ff5f8f" },
  { id: "b", label: "B", color: "#f3d64e" },
  { id: "c", label: "C", color: "#6bb7ff" },
  { id: "d", label: "D", color: "#d78bff" },
  { id: "one", label: "1", color: "#ff5f8f" },
  { id: "two", label: "2", color: "#f3d64e" },
  { id: "three", label: "3", color: "#6bb7ff" },
  { id: "four", label: "4", color: "#d78bff" },
];
const DICE_GIMMICK_ASSETS = Array.from({ length: 8 }, (_, index) => ({
  id: `dice-${index + 1}`,
  label: `サイコロ${index + 1}`,
  short: String(index + 1),
  color: DICE_COLORS[index],
  dice: index + 1,
}));
const GIMMICK_ASSETS = [
  { id: "stack", label: "頭割り", short: "頭", color: "#4db8ff" },
  { id: "spread", label: "散開", short: "散", color: "#ff6b4a" },
  { id: "tower", label: "塔", short: "塔", color: "#a78bfa" },
  { id: "knockback", label: "ノックバック", short: "KB", color: "#ffd166" },
  { id: "tether", label: "線", short: "線", color: "#55d989" },
  { id: "cone", label: "扇範囲", short: "扇", color: "#ff8a3d" },
  { id: "circle-aoe", label: "円範囲", short: "円", color: "#ff5a70" },
  { id: "donut", label: "ドーナツ", short: "輪", color: "#ff7a45" },
  { id: "safe", label: "安置", short: "安", color: "#00d1bd" },
  { id: "half-room", label: "半面焼き", short: "半", color: "#ff8a3d" },
  ...DICE_GIMMICK_ASSETS,
  { id: "eight-spread", label: "8方向散開", short: "8散", color: "#ff6b4a", template: true },
  { id: "dice-set", label: "サイコロ1-8", short: "1-8", color: "#ffd166", template: true },
];
const JOB_ICON_ASSETS = [
  { id: "tank-role", label: "TANK", name: "Tank", src: "./assets/maker/official/jobs/TankRole.png" },
  { id: "healer-role", label: "HEAL", name: "Healer", src: "./assets/maker/official/jobs/HealerRole.png" },
  { id: "dps-role", label: "DPS", name: "DPS", src: "./assets/maker/official/jobs/DPSRole.png" },
  { id: "paladin", label: "PLD", name: "Paladin", src: "./assets/maker/official/jobs/Paladin.png" },
  { id: "warrior", label: "WAR", name: "Warrior", src: "./assets/maker/official/jobs/Warrior.png" },
  { id: "dark-knight", label: "DRK", name: "Dark Knight", src: "./assets/maker/official/jobs/DarkKnight.png" },
  { id: "gunbreaker", label: "GNB", name: "Gunbreaker", src: "./assets/maker/official/jobs/Gunbreaker.png" },
  { id: "white-mage", label: "WHM", name: "White Mage", src: "./assets/maker/official/jobs/WhiteMage.png" },
  { id: "scholar", label: "SCH", name: "Scholar", src: "./assets/maker/official/jobs/Scholar.png" },
  { id: "astrologian", label: "AST", name: "Astrologian", src: "./assets/maker/official/jobs/Astrologian.png" },
  { id: "sage", label: "SGE", name: "Sage", src: "./assets/maker/official/jobs/Sage.png" },
  { id: "monk", label: "MNK", name: "Monk", src: "./assets/maker/official/jobs/Monk.png" },
  { id: "dragoon", label: "DRG", name: "Dragoon", src: "./assets/maker/official/jobs/Dragoon.png" },
  { id: "ninja", label: "NIN", name: "Ninja", src: "./assets/maker/official/jobs/Ninja.png" },
  { id: "samurai", label: "SAM", name: "Samurai", src: "./assets/maker/official/jobs/Samurai.png" },
  { id: "reaper", label: "RPR", name: "Reaper", src: "./assets/maker/official/jobs/Reaper.png" },
  { id: "viper", label: "VPR", name: "Viper", src: "./assets/maker/official/jobs/Viper.png" },
  { id: "bard", label: "BRD", name: "Bard", src: "./assets/maker/official/jobs/Bard.png" },
  { id: "machinist", label: "MCH", name: "Machinist", src: "./assets/maker/official/jobs/Machinist.png" },
  { id: "dancer", label: "DNC", name: "Dancer", src: "./assets/maker/official/jobs/Dancer.png" },
  { id: "black-mage", label: "BLM", name: "Black Mage", src: "./assets/maker/official/jobs/BlackMage.png" },
  { id: "summoner", label: "SMN", name: "Summoner", src: "./assets/maker/official/jobs/Summoner.png" },
  { id: "red-mage", label: "RDM", name: "Red Mage", src: "./assets/maker/official/jobs/RedMage.png" },
  { id: "pictomancer", label: "PCT", name: "Pictomancer", src: "./assets/maker/official/jobs/Pictomancer.png" },
];

// メモリ上の唯一の状態。IndexedDBの画像本体、localStorageの設定、PiP小窓をここで束ねる。
const state = {
  db: null,
  cards: [],
  currentIndex: 0,
  objectUrls: new Map(),
  pipWindow: null,
  maker: {
    items: [],
    selectedId: null,
    drag: null,
    color: "#ffd166",
    background: "dark",
    renderedBackground: null,
    offset: 0,
  },
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
  buildMakerAssetPalette();
  applyBrowserGuide();
  updateSupportBadge();
  updateVariantBadge();

  try {
    loadSettings();
    applySettingsToControls();
  } catch (error) {
    console.error(error);
    setStatus("設定を読み込めませんでした。初期設定で起動します。", true);
  }

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
    "variant-badge",
    "beta-feedback",
    "support-badge",
    "open-guide",
    "open-pip",
    "open-maker",
    "drop-zone",
    "file-input",
    "pick-files",
    "export-deck",
    "import-deck",
    "deck-import-input",
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
    "guide-extension-download-link",
    "guide-extensions-instruction",
    "guide-extensions-copy",
    "guide-load-unpacked-instruction",
    "guide-shortcuts-instruction",
    "guide-shortcuts-copy",
    "guide-extension-note",
    "maker-modal",
    "close-maker",
    "maker-background",
    "maker-color",
    "maker-size",
    "maker-size-value",
    "maker-width-scale",
    "maker-width-value",
    "maker-height-scale",
    "maker-height-value",
    "maker-rotation",
    "maker-rotation-value",
    "maker-reset-transform",
    "maker-text",
    "maker-field-markers",
    "maker-gimmicks",
    "maker-job-icons",
    "maker-add-text",
    "maker-delete",
    "maker-clear",
    "maker-save",
    "maker-canvas",
    "maker-background-rect",
    "maker-grid",
    "maker-field-background-image",
    "maker-items",
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
  els.exportDeck.addEventListener("click", exportDeck);
  els.importDeck.addEventListener("click", () => {
    els.deckImportInput.click();
  });
  els.deckImportInput.addEventListener("change", async () => {
    await importDeckFile(els.deckImportInput.files?.[0] ?? null);
    els.deckImportInput.value = "";
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
  els.openMaker.addEventListener("click", showMakerModal);
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
  els.closeMaker.addEventListener("click", closeMakerModal);
  els.makerModal.addEventListener("click", handleMakerModalClick);
  els.makerBackground.addEventListener("change", () => {
    state.maker.background = els.makerBackground.value;
    renderMaker();
  });
  els.makerColor.addEventListener("input", () => {
    state.maker.color = els.makerColor.value;
    recolorSelectedMakerItem();
  });
  els.makerSize.addEventListener("input", updateSelectedMakerTransform);
  els.makerWidthScale.addEventListener("input", updateSelectedMakerTransform);
  els.makerHeightScale.addEventListener("input", updateSelectedMakerTransform);
  els.makerRotation.addEventListener("input", updateSelectedMakerTransform);
  els.makerResetTransform.addEventListener("click", resetSelectedMakerTransform);
  els.makerAddText.addEventListener("click", addMakerText);
  els.makerText.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addMakerText();
  });
  els.makerDelete.addEventListener("click", deleteSelectedMakerItem);
  els.makerClear.addEventListener("click", clearMakerItems);
  els.makerSave.addEventListener("click", saveMakerImage);
  els.makerCanvas.addEventListener("pointerdown", handleMakerPointerDown);
  window.addEventListener("pointermove", handleMakerPointerMove);
  window.addEventListener("pointerup", handleMakerPointerUp);

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
    if (!els.makerModal.hidden) {
      handleMakerKeydown(event);
      return;
    }

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
  if (!els.guideModal.hidden || !els.makerModal.hidden) {
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

  if (els.guideExtensionDownloadLink instanceof HTMLAnchorElement) {
    els.guideExtensionDownloadLink.href = guide.downloadUrl;
    els.guideExtensionDownloadLink.textContent = guide.downloadText;
  }
  if (els.guideExtensionsInstruction) {
    els.guideExtensionsInstruction.textContent = guide.extensionsInstruction;
  }
  if (els.guideExtensionsCopy instanceof HTMLButtonElement) {
    els.guideExtensionsCopy.dataset.copyUrl = guide.extensionsUrl;
  }
  if (els.guideLoadUnpackedInstruction) {
    els.guideLoadUnpackedInstruction.textContent = guide.loadUnpackedInstruction;
  }
  if (els.guideShortcutsInstruction) {
    els.guideShortcutsInstruction.textContent = guide.shortcutsInstruction;
  }
  if (els.guideShortcutsCopy instanceof HTMLButtonElement) {
    els.guideShortcutsCopy.dataset.copyUrl = guide.shortcutsUrl;
  }
  if (els.guideExtensionNote) {
    els.guideExtensionNote.textContent = guide.note;
  }
}

function getCurrentBrowserGuide() {
  if (isEdgeBrowser()) {
    return EXTENSION_GUIDES.edge;
  }
  return EXTENSION_GUIDES.chrome;
}

function isEdgeBrowser() {
  return /\bEdg\//.test(navigator.userAgent);
}

function getAppVariant() {
  return resolveAppVariant(window.location.pathname);
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

function showMakerModal() {
  els.makerModal.hidden = false;
  document.body.classList.add("modal-open");
  renderMaker();
  els.makerCanvas.focus();
}

function closeMakerModal() {
  state.maker.drag = null;
  els.makerModal.hidden = true;
  document.body.classList.remove("modal-open");
  els.openMaker.focus();
}

function buildMakerAssetPalette() {
  els.makerFieldMarkers.textContent = "";
  FIELD_MARKER_ASSETS.forEach((marker) => {
    const button = document.createElement("button");
    button.className = "secondary-button maker-marker-button";
    button.type = "button";
    button.title = `フィールドマーカー ${marker.label}`;
    button.dataset.makerMarker = marker.id;

    const mark = document.createElement("span");
    mark.className = "maker-marker-preview";
    mark.style.setProperty("--marker-color", marker.color);
    mark.textContent = marker.label;

    button.append(mark);
    els.makerFieldMarkers.append(button);
  });

  els.makerGimmicks.textContent = "";
  GIMMICK_ASSETS.forEach((gimmick) => {
    const button = document.createElement("button");
    button.className = `secondary-button maker-gimmick-button${gimmick.template ? " template" : ""}`;
    button.type = "button";
    button.title = gimmick.label;
    button.dataset.makerGimmick = gimmick.id;
    button.style.setProperty("--gimmick-color", gimmick.color);

    const symbol = document.createElement("span");
    symbol.className = "maker-gimmick-symbol";
    symbol.textContent = gimmick.short;

    const label = document.createElement("span");
    label.className = "maker-gimmick-label";
    label.textContent = gimmick.label;

    button.append(symbol, label);
    els.makerGimmicks.append(button);
  });

  els.makerJobIcons.textContent = "";

  JOB_ICON_ASSETS.forEach((asset) => {
    const button = document.createElement("button");
    button.className = "secondary-button maker-job-button";
    button.type = "button";
    button.title = asset.name;
    button.dataset.makerJob = asset.id;

    const image = document.createElement("img");
    image.src = asset.src;
    image.alt = "";
    image.loading = "lazy";

    const label = document.createElement("span");
    label.textContent = asset.label;

    button.append(image, label);
    els.makerJobIcons.append(button);
  });
}

async function handleMakerModalClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return;
  }

  const addButton = target.closest("[data-maker-add]");
  if (addButton instanceof HTMLButtonElement) {
    addMakerItem(addButton.dataset.makerAdd);
    return;
  }

  const labelButton = target.closest("[data-maker-label]");
  if (labelButton instanceof HTMLButtonElement) {
    addMakerLabel(labelButton.dataset.makerLabel);
    return;
  }

  const markerButton = target.closest("[data-maker-marker]");
  if (markerButton instanceof HTMLButtonElement) {
    addMakerFieldMarker(markerButton.dataset.makerMarker);
    return;
  }

  const gimmickButton = target.closest("[data-maker-gimmick]");
  if (gimmickButton instanceof HTMLButtonElement) {
    addMakerGimmick(gimmickButton.dataset.makerGimmick);
    return;
  }

  const jobButton = target.closest("[data-maker-job]");
  if (jobButton instanceof HTMLButtonElement) {
    await addMakerJobIcon(jobButton.dataset.makerJob);
    return;
  }

  if (event.target === els.makerModal) {
    closeMakerModal();
  }
}

function handleMakerKeydown(event) {
  if (event.key === "Escape") {
    closeMakerModal();
    return;
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    if (event.target instanceof Element && event.target.matches("input, select, textarea, [contenteditable='true']")) {
      return;
    }

    event.preventDefault();
    deleteSelectedMakerItem();
  }
}

function addMakerItem(kind) {
  if (!kind) {
    return;
  }

  const point = getMakerSpawnPoint();
  const item = {
    id: createMakerItemId(),
    type: kind.startsWith("arrow-") ? "arrow" : kind,
    direction: kind.replace("arrow-", ""),
    x: point.x,
    y: point.y,
    color: kind === "boss" ? BOSS_MARKER_COLOR : state.maker.color,
    scale: 1,
    rotation: 0,
  };

  state.maker.items = [...state.maker.items, item];
  state.maker.selectedId = item.id;
  renderMaker();
}

function addMakerLabel(label) {
  if (!label) {
    return;
  }

  const point = getMakerSpawnPoint();
  const item = {
    id: createMakerItemId(),
    type: "label",
    label,
    x: point.x,
    y: point.y,
    color: getMakerRoleColor(label) ?? state.maker.color,
    scale: 1,
    rotation: 0,
  };

  state.maker.items = [...state.maker.items, item];
  state.maker.selectedId = item.id;
  renderMaker();
}

function addMakerFieldMarker(markerId) {
  const marker = FIELD_MARKER_ASSETS.find((item) => item.id === markerId);
  if (!marker) {
    return;
  }

  const point = getMakerSpawnPoint();
  const item = {
    id: createMakerItemId(),
    type: "field-marker",
    label: marker.label,
    color: marker.color,
    x: point.x,
    y: point.y,
    scale: 1,
    rotation: 0,
  };

  state.maker.items = [...state.maker.items, item];
  state.maker.selectedId = item.id;
  renderMaker();
}

function addMakerGimmick(gimmickId) {
  const gimmick = GIMMICK_ASSETS.find((item) => item.id === gimmickId);
  if (!gimmick) {
    return;
  }

  if (gimmick.template) {
    addMakerGimmickTemplate(gimmick.id);
    return;
  }

  const point = getMakerSpawnPoint();
  const item = {
    id: createMakerItemId(),
    type: "gimmick",
    gimmickId: gimmick.id,
    label: gimmick.short,
    color: gimmick.color,
    x: point.x,
    y: point.y,
    scale: 1,
    rotation: 0,
  };

  state.maker.items = [...state.maker.items, item];
  state.maker.selectedId = item.id;
  renderMaker();
}

function addMakerGimmickTemplate(templateId) {
  if (templateId === "dice-set") {
    addMakerDiceSetTemplate();
    return;
  }

  if (templateId !== "eight-spread") {
    return;
  }

  const axisOffset = 370;
  const diagonalOffset = 250;
  const roles = [
    { label: "MT", x: MAKER_CENTER.x, y: MAKER_CENTER.y - axisOffset },
    { label: "D1", x: MAKER_CENTER.x + diagonalOffset, y: MAKER_CENTER.y - diagonalOffset },
    { label: "H1", x: MAKER_CENTER.x + axisOffset, y: MAKER_CENTER.y },
    { label: "D2", x: MAKER_CENTER.x + diagonalOffset, y: MAKER_CENTER.y + diagonalOffset },
    { label: "ST", x: MAKER_CENTER.x, y: MAKER_CENTER.y + axisOffset },
    { label: "D3", x: MAKER_CENTER.x - diagonalOffset, y: MAKER_CENTER.y + diagonalOffset },
    { label: "H2", x: MAKER_CENTER.x - axisOffset, y: MAKER_CENTER.y },
    { label: "D4", x: MAKER_CENTER.x - diagonalOffset, y: MAKER_CENTER.y - diagonalOffset },
  ];
  const boss = {
    id: createMakerItemId(),
    type: "boss",
    x: MAKER_CENTER.x,
    y: MAKER_CENTER.y,
    color: BOSS_MARKER_COLOR,
    scale: 1,
    rotation: 0,
  };
  const items = roles.map((role) => ({
    id: createMakerItemId(),
    type: "label",
    color: getMakerRoleColor(role.label),
    scale: 1,
    rotation: 0,
    ...role,
  }));

  state.maker.items = [...state.maker.items, boss, ...items];
  state.maker.selectedId = items[items.length - 1]?.id ?? boss.id;
  renderMaker();
}

function addMakerDiceSetTemplate() {
  const diceItems = DICE_GIMMICK_ASSETS.map((dice, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    return {
      id: createMakerItemId(),
      type: "gimmick",
      gimmickId: dice.id,
      label: dice.short,
      color: dice.color,
      x: MAKER_CENTER.x - 240 + column * 160,
      y: MAKER_CENTER.y - 90 + row * 180,
      scale: 1,
      rotation: 0,
    };
  });

  state.maker.items = [...state.maker.items, ...diceItems];
  state.maker.selectedId = diceItems[diceItems.length - 1]?.id ?? null;
  renderMaker();
}

async function addMakerJobIcon(assetId) {
  const asset = JOB_ICON_ASSETS.find((item) => item.id === assetId);
  if (!asset) {
    return;
  }

  try {
    const href = await loadMakerAssetDataUrl(asset);
    const point = getMakerSpawnPoint();
    const item = {
      id: createMakerItemId(),
      type: "image",
      label: asset.label,
      x: point.x,
      y: point.y,
      href,
      scale: 1,
      rotation: 0,
    };

    state.maker.items = [...state.maker.items, item];
    state.maker.selectedId = item.id;
    renderMaker();
  } catch (error) {
    console.error(error);
    setStatus(`${asset.name} の素材を読み込めませんでした。`, true);
  }
}

async function loadMakerAssetDataUrl(asset) {
  if (asset.dataUrl) {
    return asset.dataUrl;
  }

  const response = await fetch(asset.src);
  if (!response.ok) {
    throw new Error(`Asset load failed: ${asset.src}`);
  }

  asset.dataUrl = await blobToDataUrl(await response.blob());
  return asset.dataUrl;
}

function addMakerText() {
  const label = els.makerText.value.trim().replace(/\s+/g, " ") || "テキスト";
  const point = getMakerSpawnPoint();
  const item = {
    id: createMakerItemId(),
    type: "text",
    label,
    x: point.x,
    y: point.y,
    color: state.maker.color,
    scale: 1,
    rotation: 0,
  };

  state.maker.items = [...state.maker.items, item];
  state.maker.selectedId = item.id;
  els.makerText.value = "";
  renderMaker();
}

function createMakerItemId() {
  return `maker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getMakerSpawnPoint() {
  const offset = (state.maker.offset % 8) * 24;
  state.maker.offset += 1;
  return {
    x: Math.min(MAKER_WIDTH - 120, MAKER_CENTER.x + offset),
    y: Math.min(MAKER_HEIGHT - 90, MAKER_CENTER.y + offset),
  };
}

function getMakerRoleColor(label) {
  if (label === "MT" || label === "ST") {
    return ROLE_COLORS.tank;
  }
  if (label === "H1" || label === "H2") {
    return ROLE_COLORS.healer;
  }
  if (/^D[1-4]$/.test(label)) {
    return ROLE_COLORS.dps;
  }
  return null;
}

function getMakerItemScale(item) {
  const scale = Number(item?.scale);
  return Number.isFinite(scale) ? clamp(scale, 0.5, 1.8) : 1;
}

function getMakerItemAxisScale(item, axis) {
  const key = axis === "y" ? "scaleY" : "scaleX";
  const scale = Number(item?.[key]);
  return Number.isFinite(scale) ? clamp(scale, MAKER_AXIS_SCALE_MIN, MAKER_AXIS_SCALE_MAX) : 1;
}

function getMakerItemEffectiveScaleX(item) {
  return getMakerItemScale(item) * getMakerItemAxisScale(item, "x");
}

function getMakerItemEffectiveScaleY(item) {
  return getMakerItemScale(item) * getMakerItemAxisScale(item, "y");
}

function getMakerItemRotation(item) {
  const rotation = Number(item?.rotation);
  return Number.isFinite(rotation) ? rotation : 0;
}

function updateSelectedMakerTransform() {
  const selected = getSelectedMakerItem();
  if (!selected) {
    syncMakerSelectionControls();
    return;
  }

  selected.scale = Number(els.makerSize.value) / 100;
  selected.scaleX = Number(els.makerWidthScale.value) / 100;
  selected.scaleY = Number(els.makerHeightScale.value) / 100;
  selected.rotation = Number(els.makerRotation.value);
  renderMaker();
}

function resetSelectedMakerTransform() {
  const selected = getSelectedMakerItem();
  if (!selected) {
    syncMakerSelectionControls();
    return;
  }

  selected.scale = 1;
  selected.scaleX = 1;
  selected.scaleY = 1;
  selected.rotation = 0;
  renderMaker();
}

function syncMakerSelectionControls() {
  if (!els.makerSize || !els.makerWidthScale || !els.makerHeightScale || !els.makerRotation) {
    return;
  }

  const selected = getSelectedMakerItem();
  const hasSelection = Boolean(selected);
  const scalePercent = selected ? Math.round(getMakerItemScale(selected) * 100) : 100;
  const widthPercent = selected ? Math.round(getMakerItemAxisScale(selected, "x") * 100) : 100;
  const heightPercent = selected ? Math.round(getMakerItemAxisScale(selected, "y") * 100) : 100;
  const rotation = selected ? Math.round(getMakerItemRotation(selected)) : 0;

  els.makerSize.disabled = !hasSelection;
  els.makerWidthScale.disabled = !hasSelection;
  els.makerHeightScale.disabled = !hasSelection;
  els.makerRotation.disabled = !hasSelection;
  els.makerResetTransform.disabled = !hasSelection;
  els.makerSize.value = String(scalePercent);
  els.makerWidthScale.value = String(widthPercent);
  els.makerHeightScale.value = String(heightPercent);
  els.makerRotation.value = String(rotation);
  els.makerSizeValue.textContent = `${scalePercent}%`;
  els.makerWidthValue.textContent = `${widthPercent}%`;
  els.makerHeightValue.textContent = `${heightPercent}%`;
  els.makerRotationValue.textContent = `${rotation}°`;
}

function recolorSelectedMakerItem() {
  const selected = getSelectedMakerItem();
  if (!selected) {
    return;
  }

  selected.color = state.maker.color;
  renderMaker();
}

function deleteSelectedMakerItem() {
  if (!state.maker.selectedId) {
    return;
  }

  state.maker.items = state.maker.items.filter((item) => item.id !== state.maker.selectedId);
  state.maker.selectedId = null;
  renderMaker();
}

function clearMakerItems() {
  if (state.maker.items.length === 0) {
    return;
  }

  const ok = confirm("作成中のカンペを全て消します。よろしいですか？");
  if (!ok) {
    return;
  }

  state.maker.items = [];
  state.maker.selectedId = null;
  renderMaker();
}

function renderMaker() {
  if (!els.makerItems) {
    return;
  }

  state.maker.background = els.makerBackground.value;
  state.maker.color = els.makerColor.value;
  applyMakerBackground();
  els.makerItems.textContent = "";

  state.maker.items.forEach((item) => {
    els.makerItems.append(createMakerElement(item));
  });

  els.makerDelete.disabled = !state.maker.selectedId;
  els.makerClear.disabled = state.maker.items.length === 0;
  els.makerSave.disabled = state.maker.items.length === 0 && !MAKER_FIELD_BACKGROUNDS[state.maker.background];
  syncMakerSelectionControls();
}

function applyMakerBackground() {
  const backgroundId = state.maker.background;
  const fieldAsset = MAKER_FIELD_BACKGROUNDS[backgroundId] ?? null;
  const fills = {
    dark: "#101010",
    light: "#f4f4f4",
    transparent: "transparent",
  };

  els.makerBackgroundRect.setAttribute("fill", fieldAsset ? "#7b7b78" : (fills[state.maker.background] ?? fills.dark));
  els.makerBackgroundRect.setAttribute("display", state.maker.background === "transparent" ? "none" : "block");
  els.makerGrid.setAttribute("display", state.maker.background === "transparent" || fieldAsset ? "none" : "block");
  els.makerGrid.setAttribute("opacity", state.maker.background === "light" ? "0.24" : "1");

  if (!fieldAsset) {
    els.makerFieldBackgroundImage.removeAttribute("href");
    els.makerFieldBackgroundImage.setAttribute("hidden", "");
    state.maker.renderedBackground = null;
    return;
  }

  if (fieldAsset.dataUrl) {
    setMakerFieldBackgroundImage(fieldAsset.dataUrl, state.maker.background);
    return;
  }

  if (state.maker.renderedBackground === backgroundId) {
    return;
  }

  state.maker.renderedBackground = backgroundId;
  els.makerFieldBackgroundImage.setAttribute("hidden", "");
  loadMakerAssetDataUrl(fieldAsset)
    .then((href) => {
      if (state.maker.background !== backgroundId) {
        return;
      }
      setMakerFieldBackgroundImage(href, backgroundId);
    })
    .catch((error) => {
      console.error(error);
      if (state.maker.background === backgroundId) {
        state.maker.renderedBackground = null;
        setStatus(`${fieldAsset.label} のフィールド画像を読み込めませんでした。`, true);
      }
    });
}

function setMakerFieldBackgroundImage(href, backgroundId) {
  els.makerFieldBackgroundImage.setAttribute("href", href);
  els.makerFieldBackgroundImage.removeAttribute("hidden");
  state.maker.renderedBackground = backgroundId;
}

async function ensureMakerFieldBackgroundLoaded() {
  const fieldAsset = MAKER_FIELD_BACKGROUNDS[state.maker.background] ?? null;
  if (!fieldAsset) {
    return;
  }

  const href = await loadMakerAssetDataUrl(fieldAsset);
  setMakerFieldBackgroundImage(href, state.maker.background);
}

function createMakerElement(item) {
  const group = createSvgElement("g", {
    class: `maker-item${item.id === state.maker.selectedId ? " selected" : ""}`,
    transform: `translate(${item.x} ${item.y}) rotate(${getMakerItemRotation(item)}) scale(${getMakerItemEffectiveScaleX(item)} ${getMakerItemEffectiveScaleY(item)})`,
    "data-maker-id": item.id,
  });

  if (item.type === "circle") {
    group.append(
      createSvgElement("circle", {
        cx: 0,
        cy: 0,
        r: 88,
        fill: hexToRgba(item.color, 0.24),
        stroke: item.color,
        "stroke-width": 8,
      }),
    );
  } else if (item.type === "rect") {
    group.append(
      createSvgElement("rect", {
        x: -130,
        y: -76,
        width: 260,
        height: 152,
        rx: 20,
        fill: hexToRgba(item.color, 0.24),
        stroke: item.color,
        "stroke-width": 8,
      }),
    );
  } else if (item.type === "line") {
    group.append(
      createSvgElement("line", {
        x1: -150,
        y1: 0,
        x2: 150,
        y2: 0,
        stroke: item.color,
        "stroke-width": 16,
        "stroke-linecap": "round",
      }),
    );
  } else if (item.type === "boss") {
    appendMakerBoss(group, item);
  } else if (item.type === "arrow") {
    appendMakerArrow(group, item);
  } else if (item.type === "label") {
    appendMakerLabel(group, item);
  } else if (item.type === "field-marker") {
    appendMakerFieldMarker(group, item);
  } else if (item.type === "gimmick") {
    appendMakerGimmick(group, item);
  } else if (item.type === "image") {
    appendMakerImage(group, item);
  } else {
    appendMakerText(group, item);
  }

  if (item.id === state.maker.selectedId) {
    appendMakerSelectionHandles(group, item);
  }

  return group;
}

function appendMakerSelectionHandles(group, item) {
  const bounds = getMakerBaseBounds(item);
  group.append(
    createSvgElement("rect", {
      class: "maker-selection-box",
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rx: 10,
      fill: "none",
      stroke: "rgba(0, 209, 189, 0.88)",
      "stroke-width": 4,
      "stroke-dasharray": "12 10",
      "vector-effect": "non-scaling-stroke",
      "pointer-events": "none",
    }),
    createSvgElement("circle", {
      class: "maker-resize-handle",
      "data-maker-handle": "resize",
      cx: bounds.x + bounds.width,
      cy: bounds.y + bounds.height,
      r: 18,
      fill: "#00d1bd",
      stroke: "#061c1a",
      "stroke-width": 5,
      "vector-effect": "non-scaling-stroke",
    }),
  );
}

function getMakerBaseBounds(item) {
  if (item.type === "circle") {
    return getCenteredBounds(176, 176);
  }
  if (item.type === "rect") {
    return { x: -130, y: -76, width: 260, height: 152 };
  }
  if (item.type === "line") {
    return { x: -150, y: -16, width: 300, height: 32 };
  }
  if (item.type === "boss") {
    return getCenteredBounds(180, 180);
  }
  if (item.type === "arrow") {
    return item.direction === "left" || item.direction === "right"
      ? { x: -156, y: -70, width: 312, height: 140 }
      : { x: -70, y: -156, width: 140, height: 312 };
  }
  if (item.type === "label") {
    return String(item.label ?? "").length > 1 ? { x: -74, y: -40, width: 148, height: 80 } : getCenteredBounds(100, 100);
  }
  if (item.type === "field-marker") {
    return getCenteredBounds(116, 116);
  }
  if (item.type === "image") {
    return getCenteredBounds(108, 108);
  }
  if (item.type === "text") {
    const labelWidth = clamp(String(item.label ?? "").length * 42, 120, 520);
    return getCenteredBounds(labelWidth, 108);
  }
  if (item.type === "gimmick") {
    return getMakerGimmickBounds(item);
  }

  return getCenteredBounds(160, 160);
}

function getMakerGimmickBounds(item) {
  if (item.gimmickId?.startsWith("dice-")) {
    return getCenteredBounds(144, 144);
  }
  if (item.gimmickId === "cone") {
    return { x: -150, y: -190, width: 300, height: 190 };
  }
  if (item.gimmickId === "circle-aoe" || item.gimmickId === "donut") {
    return getCenteredBounds(250, 250);
  }
  if (item.gimmickId === "tether") {
    return { x: -200, y: -40, width: 400, height: 80 };
  }
  if (item.gimmickId === "knockback") {
    return getCenteredBounds(360, 360);
  }
  if (item.gimmickId === "tower") {
    return getCenteredBounds(190, 190);
  }
  if (item.gimmickId === "half-room") {
    return getCenteredBounds(264, 264);
  }

  return getCenteredBounds(280, 280);
}

function getCenteredBounds(width, height) {
  return {
    x: -width / 2,
    y: -height / 2,
    width,
    height,
  };
}

function appendMakerArrow(group, item) {
  const points = getMakerArrowPoints(item.direction);
  group.append(
    createSvgElement("line", {
      x1: points.line[0],
      y1: points.line[1],
      x2: points.line[2],
      y2: points.line[3],
      stroke: item.color,
      "stroke-width": 18,
      "stroke-linecap": "round",
    }),
    createSvgElement("polygon", {
      points: points.head,
      fill: item.color,
    }),
  );
}

function getMakerArrowPoints(direction) {
  if (direction === "down") {
    return { line: [0, -130, 0, 90], head: "0,150 -54,66 54,66" };
  }
  if (direction === "left") {
    return { line: [130, 0, -90, 0], head: "-150,0 -66,-54 -66,54" };
  }
  if (direction === "right") {
    return { line: [-130, 0, 90, 0], head: "150,0 66,-54 66,54" };
  }

  return { line: [0, 130, 0, -90], head: "0,-150 -54,-66 54,-66" };
}

function appendMakerBoss(group, item) {
  group.append(
    createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 86,
      fill: hexToRgba(item.color, 0.16),
      stroke: item.color,
      "stroke-width": 8,
    }),
    createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 60,
      fill: "rgba(18, 20, 20, 0.76)",
      stroke: hexToRgba(item.color, 0.68),
      "stroke-width": 5,
    }),
    createSvgElement("path", {
      d: "M 0 -78 L 14 -46 L 0 -54 L -14 -46 Z",
      fill: item.color,
    }),
    createSvgElement("path", {
      d: "M 78 0 L 46 14 L 54 0 L 46 -14 Z",
      fill: item.color,
    }),
    createSvgElement("path", {
      d: "M 0 78 L -14 46 L 0 54 L 14 46 Z",
      fill: item.color,
    }),
    createSvgElement("path", {
      d: "M -78 0 L -46 -14 L -54 0 L -46 14 Z",
      fill: item.color,
    }),
    createSvgElement(
      "text",
      {
        x: 0,
        y: 4,
        fill: "#ffffff",
        "font-size": 38,
        "font-weight": 900,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": '"Segoe UI", "Yu Gothic UI", "Yu Gothic", sans-serif',
        "paint-order": "stroke",
        stroke: "rgba(0,0,0,0.86)",
        "stroke-width": 8,
        "stroke-linejoin": "round",
      },
      "ボス",
    ),
  );
}

function appendMakerLabel(group, item) {
  const wide = item.label.length > 1;
  if (wide) {
    group.append(
      createSvgElement("rect", {
        x: -74,
        y: -40,
        width: 148,
        height: 80,
        rx: 40,
        fill: item.color,
        stroke: "rgba(255,255,255,0.85)",
        "stroke-width": 5,
      }),
    );
  } else {
    group.append(
      createSvgElement("circle", {
        cx: 0,
        cy: 0,
        r: 50,
        fill: item.color,
        stroke: "rgba(255,255,255,0.85)",
        "stroke-width": 5,
      }),
    );
  }

  group.append(
    createSvgElement(
      "text",
      {
        x: 0,
        y: wide ? 2 : 3,
        fill: "#ffffff",
        "font-size": wide ? 36 : 44,
        "font-weight": 900,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": '"Segoe UI", "Yu Gothic UI", "Yu Gothic", sans-serif',
        "paint-order": "stroke",
        stroke: "rgba(0,0,0,0.75)",
        "stroke-width": 8,
        "stroke-linejoin": "round",
      },
      item.label,
    ),
  );
}

function appendMakerFieldMarker(group, item) {
  group.append(
    createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 58,
      fill: hexToRgba(item.color, 0.14),
      stroke: hexToRgba(item.color, 0.45),
      "stroke-width": 5,
    }),
    createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 48,
      fill: "rgba(18, 20, 20, 0.72)",
      stroke: item.color,
      "stroke-width": 7,
    }),
    createSvgElement(
      "text",
      {
        x: 0,
        y: 3,
        fill: item.color,
        "font-size": item.label.length > 1 ? 40 : 48,
        "font-weight": 900,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": '"Segoe UI", "Yu Gothic UI", "Yu Gothic", sans-serif',
        "paint-order": "stroke",
        stroke: "rgba(0,0,0,0.88)",
        "stroke-width": 7,
        "stroke-linejoin": "round",
      },
      item.label,
    ),
  );
}

function appendMakerGimmick(group, item) {
  if (item.gimmickId?.startsWith("dice-")) {
    appendMakerDice(group, item);
    return;
  }
  if (item.gimmickId === "cone") {
    appendMakerCone(group, item);
    return;
  }
  if (item.gimmickId === "circle-aoe") {
    appendMakerCircleAoe(group, item);
    return;
  }
  if (item.gimmickId === "donut") {
    appendMakerDonut(group, item);
    return;
  }
  if (item.gimmickId === "tether") {
    appendMakerTether(group, item);
    return;
  }
  if (item.gimmickId === "knockback") {
    appendMakerKnockback(group, item);
    return;
  }
  if (item.gimmickId === "tower") {
    appendMakerTower(group, item);
    return;
  }
  if (item.gimmickId === "safe") {
    appendMakerSafe(group, item);
    return;
  }
  if (item.gimmickId === "half-room") {
    appendMakerHalfRoom(group, item);
    return;
  }

  appendMakerGimmickBadge(group, item);
}

function appendMakerDice(group, item) {
  const label = String(item.label ?? item.gimmickId?.replace("dice-", "") ?? "");
  group.append(
    createSvgElement("polygon", {
      points: "0,-72 72,0 0,72 -72,0",
      fill: hexToRgba(item.color, 0.24),
      stroke: item.color,
      "stroke-width": 8,
      "stroke-linejoin": "round",
    }),
    createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 46,
      fill: "rgba(18, 20, 20, 0.74)",
      stroke: hexToRgba(item.color, 0.72),
      "stroke-width": 5,
    }),
    createSvgElement(
      "text",
      {
        x: 0,
        y: 4,
        fill: item.color,
        "font-size": 52,
        "font-weight": 900,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": '"Segoe UI", "Yu Gothic UI", "Yu Gothic", sans-serif',
        "paint-order": "stroke",
        stroke: "rgba(0,0,0,0.9)",
        "stroke-width": 9,
        "stroke-linejoin": "round",
      },
      label,
    ),
  );
}

function appendMakerHalfRoom(group, item) {
  group.append(
    createSvgElement("rect", {
      x: -132,
      y: -132,
      width: 264,
      height: 264,
      rx: 10,
      fill: "rgba(18, 20, 20, 0.64)",
      stroke: "rgba(255,255,255,0.42)",
      "stroke-width": 5,
    }),
    createSvgElement("path", {
      d: "M 0 -132 H 122 Q 132 -132 132 -122 V 122 Q 132 132 122 132 H 0 Z",
      fill: hexToRgba(item.color, 0.34),
      stroke: item.color,
      "stroke-width": 7,
      "stroke-linejoin": "round",
    }),
    createSvgElement("line", {
      x1: 0,
      y1: -132,
      x2: 0,
      y2: 132,
      stroke: "rgba(255,255,255,0.72)",
      "stroke-width": 5,
      "stroke-dasharray": "14 10",
    }),
    createSvgElement("path", {
      d: "M 44 -72 L 112 0 L 44 72",
      fill: "none",
      stroke: item.color,
      "stroke-width": 12,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }),
    createSvgElement(
      "text",
      {
        x: -66,
        y: 4,
        fill: "#ffffff",
        "font-size": 34,
        "font-weight": 900,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": '"Segoe UI", "Yu Gothic UI", "Yu Gothic", sans-serif',
        "paint-order": "stroke",
        stroke: "rgba(0,0,0,0.86)",
        "stroke-width": 8,
        "stroke-linejoin": "round",
      },
      "安置",
    ),
    createSvgElement(
      "text",
      {
        x: 66,
        y: 4,
        fill: item.color,
        "font-size": 40,
        "font-weight": 900,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": '"Segoe UI", "Yu Gothic UI", "Yu Gothic", sans-serif',
        "paint-order": "stroke",
        stroke: "rgba(0,0,0,0.86)",
        "stroke-width": 8,
        "stroke-linejoin": "round",
      },
      "焼き",
    ),
  );
}

function appendMakerGimmickBadge(group, item) {
  const isSpread = item.gimmickId === "spread";
  group.append(
    createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 78,
      fill: hexToRgba(item.color, 0.2),
      stroke: item.color,
      "stroke-width": 8,
      "stroke-dasharray": isSpread ? "14 10" : "0",
    }),
    createSvgElement(
      "text",
      {
        x: 0,
        y: 4,
        fill: item.color,
        "font-size": 46,
        "font-weight": 900,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": '"Segoe UI", "Yu Gothic UI", "Yu Gothic", sans-serif',
        "paint-order": "stroke",
        stroke: "rgba(0,0,0,0.86)",
        "stroke-width": 8,
        "stroke-linejoin": "round",
      },
      item.label,
    ),
  );

  if (isSpread) {
    [
      [0, -132, 0, -92],
      [0, 132, 0, 92],
      [-132, 0, -92, 0],
      [132, 0, 92, 0],
    ].forEach((line) => {
      group.append(
        createSvgElement("line", {
          x1: line[0],
          y1: line[1],
          x2: line[2],
          y2: line[3],
          stroke: item.color,
          "stroke-width": 10,
          "stroke-linecap": "round",
        }),
      );
    });
  }
}

function appendMakerTower(group, item) {
  group.append(
    createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 92,
      fill: hexToRgba(item.color, 0.18),
      stroke: item.color,
      "stroke-width": 8,
    }),
    createSvgElement("rect", {
      x: -36,
      y: -72,
      width: 72,
      height: 144,
      rx: 12,
      fill: hexToRgba(item.color, 0.32),
      stroke: item.color,
      "stroke-width": 7,
    }),
    createSvgElement(
      "text",
      {
        x: 0,
        y: 5,
        fill: "#ffffff",
        "font-size": 42,
        "font-weight": 900,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": '"Segoe UI", "Yu Gothic UI", "Yu Gothic", sans-serif',
        "paint-order": "stroke",
        stroke: "rgba(0,0,0,0.88)",
        "stroke-width": 8,
      },
      item.label,
    ),
  );
}

function appendMakerKnockback(group, item) {
  group.append(
    createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 34,
      fill: hexToRgba(item.color, 0.28),
      stroke: item.color,
      "stroke-width": 6,
    }),
  );

  [
    [0, -34, 0, -130, "0,-170 -34,-112 34,-112"],
    [0, 34, 0, 130, "0,170 -34,112 34,112"],
    [-34, 0, -130, 0, "-170,0 -112,-34 -112,34"],
    [34, 0, 130, 0, "170,0 112,-34 112,34"],
  ].forEach((shape) => {
    group.append(
      createSvgElement("line", {
        x1: shape[0],
        y1: shape[1],
        x2: shape[2],
        y2: shape[3],
        stroke: item.color,
        "stroke-width": 12,
        "stroke-linecap": "round",
      }),
      createSvgElement("polygon", {
        points: shape[4],
        fill: item.color,
      }),
    );
  });
}

function appendMakerTether(group, item) {
  group.append(
    createSvgElement("line", {
      x1: -145,
      y1: 0,
      x2: 145,
      y2: 0,
      stroke: item.color,
      "stroke-width": 18,
      "stroke-linecap": "round",
      "stroke-dasharray": "26 16",
    }),
    createSvgElement("circle", {
      cx: -165,
      cy: 0,
      r: 34,
      fill: hexToRgba(item.color, 0.28),
      stroke: item.color,
      "stroke-width": 7,
    }),
    createSvgElement("circle", {
      cx: 165,
      cy: 0,
      r: 34,
      fill: hexToRgba(item.color, 0.28),
      stroke: item.color,
      "stroke-width": 7,
    }),
  );
}

function appendMakerCone(group, item) {
  group.append(
    createSvgElement("path", {
      d: "M 0 0 L -150 -190 A 250 250 0 0 1 150 -190 Z",
      fill: hexToRgba(item.color, 0.28),
      stroke: item.color,
      "stroke-width": 7,
      "stroke-linejoin": "round",
    }),
    createSvgElement(
      "text",
      {
        x: 0,
        y: -86,
        fill: item.color,
        "font-size": 46,
        "font-weight": 900,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": '"Segoe UI", "Yu Gothic UI", "Yu Gothic", sans-serif',
        "paint-order": "stroke",
        stroke: "rgba(0,0,0,0.86)",
        "stroke-width": 8,
      },
      item.label,
    ),
  );
}

function appendMakerCircleAoe(group, item) {
  group.append(
    createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 112,
      fill: hexToRgba(item.color, 0.24),
      stroke: item.color,
      "stroke-width": 9,
    }),
    createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 26,
      fill: item.color,
      opacity: 0.9,
    }),
  );
}

function appendMakerDonut(group, item) {
  group.append(
    createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 118,
      fill: "none",
      stroke: hexToRgba(item.color, 0.35),
      "stroke-width": 54,
    }),
    createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 56,
      fill: "none",
      stroke: item.color,
      "stroke-width": 7,
      "stroke-dasharray": "12 10",
    }),
    createSvgElement(
      "text",
      {
        x: 0,
        y: 4,
        fill: item.color,
        "font-size": 42,
        "font-weight": 900,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": '"Segoe UI", "Yu Gothic UI", "Yu Gothic", sans-serif',
        "paint-order": "stroke",
        stroke: "rgba(0,0,0,0.86)",
        "stroke-width": 8,
      },
      item.label,
    ),
  );
}

function appendMakerSafe(group, item) {
  group.append(
    createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 80,
      fill: hexToRgba(item.color, 0.16),
      stroke: item.color,
      "stroke-width": 8,
    }),
    createSvgElement("path", {
      d: "M -42 2 L -12 34 L 48 -42",
      fill: "none",
      stroke: item.color,
      "stroke-width": 16,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }),
  );
}

function appendMakerImage(group, item) {
  group.append(
    createSvgElement("image", {
      href: item.href,
      x: -54,
      y: -54,
      width: 108,
      height: 108,
      preserveAspectRatio: "xMidYMid meet",
    }),
  );
}

function appendMakerText(group, item) {
  group.append(
    createSvgElement(
      "text",
      {
        x: 0,
        y: 0,
        fill: item.color,
        "font-size": 48,
        "font-weight": 900,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": '"Segoe UI", "Yu Gothic UI", "Yu Gothic", sans-serif',
        "paint-order": "stroke",
        stroke: "rgba(0,0,0,0.82)",
        "stroke-width": 9,
        "stroke-linejoin": "round",
      },
      item.label,
    ),
  );
}

function createSvgElement(name, attributes = {}, text = "") {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
  if (text) {
    element.textContent = text;
  }
  return element;
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return `rgba(255, 209, 102, ${alpha})`;
  }

  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function handleMakerPointerDown(event) {
  if (els.makerModal.hidden) {
    return;
  }

  const targetElement = event.target instanceof Element ? event.target : null;
  const handle = targetElement?.closest("[data-maker-handle]") ?? null;
  const target = handle ? handle.closest(".maker-item") : targetElement?.closest(".maker-item");
  if (!target) {
    state.maker.selectedId = null;
    renderMaker();
    return;
  }

  const item = getMakerItemById(target.getAttribute("data-maker-id"));
  if (!item) {
    return;
  }

  const point = getMakerPointerPoint(event);
  state.maker.selectedId = item.id;
  state.maker.drag = {
    type: handle ? "resize" : "move",
    id: item.id,
    offsetX: point.x - item.x,
    offsetY: point.y - item.y,
  };
  event.preventDefault();
  renderMaker();
}

function handleMakerPointerMove(event) {
  const drag = state.maker.drag;
  if (!drag) {
    return;
  }

  const item = getMakerItemById(drag.id);
  if (!item) {
    state.maker.drag = null;
    return;
  }

  const point = getMakerPointerPoint(event);
  if (drag.type === "resize") {
    resizeMakerItemWithPointer(item, point);
    renderMaker();
    return;
  }

  item.x = clamp(point.x - drag.offsetX, 40, MAKER_WIDTH - 40);
  item.y = clamp(point.y - drag.offsetY, 40, MAKER_HEIGHT - 40);
  renderMaker();
}

function handleMakerPointerUp() {
  state.maker.drag = null;
}

function getMakerPointerPoint(event) {
  const rect = els.makerCanvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * MAKER_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * MAKER_HEIGHT,
  };
}

function resizeMakerItemWithPointer(item, point) {
  const bounds = getMakerBaseBounds(item);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const local = getMakerUnscaledLocalPoint(item, point);
  const scaleX = Math.abs(local.x - centerX) / Math.max(bounds.width / 2, 1);
  const scaleY = Math.abs(local.y - centerY) / Math.max(bounds.height / 2, 1);

  item.scaleX = clamp(scaleX, MAKER_AXIS_SCALE_MIN, MAKER_AXIS_SCALE_MAX);
  item.scaleY = clamp(scaleY, MAKER_AXIS_SCALE_MIN, MAKER_AXIS_SCALE_MAX);
}

function getMakerUnscaledLocalPoint(item, point) {
  const angle = (-getMakerItemRotation(item) * Math.PI) / 180;
  const dx = point.x - item.x;
  const dy = point.y - item.y;
  const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);
  const scale = getMakerItemScale(item);

  return {
    x: rotatedX / scale,
    y: rotatedY / scale,
  };
}

function getMakerItemById(id) {
  return state.maker.items.find((item) => item.id === id) ?? null;
}

function getSelectedMakerItem() {
  return getMakerItemById(state.maker.selectedId);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function saveMakerImage() {
  const hasFieldBackground = Boolean(MAKER_FIELD_BACKGROUNDS[state.maker.background]);
  if (state.maker.items.length === 0 && !hasFieldBackground) {
    setStatus("作成する素材を追加してください。", true);
    return;
  }

  try {
    setStatus("作成したカンペを画像化しています...");
    await ensureMakerFieldBackgroundLoaded();
    const blob = await makerSvgToPngBlob();
    const file = new File([blob], createMakerImageFileName(), {
      type: "image/png",
      lastModified: Date.now(),
    });
    await addFiles([file], {
      sortFiles: false,
      progressMessage: () => "作成したカンペを登録中...",
      completeMessage: () => "作成したカンペを登録しました。",
    });
    closeMakerModal();
  } catch (error) {
    console.error(error);
    setStatus("作成したカンペを画像化できませんでした。", true);
  }
}

function makerSvgToPngBlob() {
  return new Promise((resolve, reject) => {
    const svg = els.makerCanvas.cloneNode(true);
    svg.setAttribute("xmlns", SVG_NS);
    svg.setAttribute("width", MAKER_WIDTH);
    svg.setAttribute("height", MAKER_HEIGHT);
    svg.querySelectorAll(".maker-item").forEach((item) => item.classList.remove("selected"));
    svg.querySelectorAll(".maker-selection-box, .maker-resize-handle").forEach((item) => item.remove());

    const svgText = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = MAKER_WIDTH;
      canvas.height = MAKER_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      context.drawImage(image, 0, 0, MAKER_WIDTH, MAKER_HEIGHT);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas export failed"));
        }
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG export failed"));
    };
    image.src = url;
  });
}

function createMakerImageFileName() {
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `made-kanpe-${timestamp}.png`;
}

// Chrome / Edge拡張機能のショートカットから届くコマンドをアプリ操作へ変換する。
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

// β版URLでは正式版と別の保存領域を使うことを画面上でも明示する。
function updateVariantBadge() {
  if (!IS_BETA) {
    els.betaFeedback?.remove();
    els.variantBadge?.remove();
    return;
  }

  if (els.betaFeedback) {
    els.betaFeedback.hidden = false;
  }

  if (els.variantBadge) {
    els.variantBadge.hidden = false;
    els.variantBadge.textContent = "β版";
  }
  if (!document.title.startsWith("β版 ")) {
    document.title = `β版 ${document.title}`;
  }
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

// 登録画像とグループ、PiP表示設定を1つの共有・バックアップ用ファイルへまとめる。
async function exportDeck() {
  if (state.cards.length === 0) {
    setStatus("エクスポートできる画像がありません。", true);
    return;
  }

  try {
    setStatus("カンペセットを作成しています...");
    const payload = await createDeckPayload();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    downloadBlob(blob, createDeckExportFileName());
    setStatus(`${state.cards.length}枚のカンペセットを書き出しました。`);
  } catch (error) {
    console.error(error);
    setStatus("カンペセットを書き出せませんでした。", true);
  }
}

async function createDeckPayload() {
  const orderedCards = [...state.cards].sort((a, b) => a.order - b.order);
  const cards = [];

  for (const [index, card] of orderedCards.entries()) {
    cards.push({
      name: card.name,
      type: card.type || card.blob?.type || "image/png",
      size: card.size || card.blob?.size || 0,
      originalSize: card.originalSize || card.size || card.blob?.size || 0,
      order: index,
      hidden: Boolean(card.hidden),
      groupIds: normalizeCardGroupIds(card.groupIds),
      createdAt: card.createdAt || Date.now(),
      dataUrl: await blobToDataUrl(card.blob),
    });
  }

  return {
    format: DECK_FILE_FORMAT,
    version: DECK_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: pickDeckSettings(),
    groups: state.settings.groups.map((group) => ({ id: group.id, name: group.name })),
    cards,
  };
}

function pickDeckSettings() {
  return DECK_EXPORT_SETTING_KEYS.reduce((settings, key) => {
    settings[key] = state.settings[key];
    return settings;
  }, {});
}

function createDeckExportFileName() {
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `${sanitizeDeckFileName("pip-kanpe-set")}-${timestamp}${DECK_FILE_EXTENSION}`;
}

async function importDeckFile(file) {
  if (!file) {
    return;
  }

  if (!state.db) {
    setStatus("保存領域の準備がまだ終わっていません。", true);
    return;
  }

  try {
    const payload = parseDeckPayload(await file.text());
    const remaining = MAX_CARDS - state.cards.length;
    if (payload.cards.length > remaining) {
      setStatus(
        `このカンペセットは${payload.cards.length}枚です。残り登録可能枚数は${remaining}枚なので読み込めません。`,
        true,
      );
      return;
    }

    const ok = window.confirm(
      `「${file.name}」から${payload.cards.length}枚を追加します。グループとPiP表示設定も読み込みます。よろしいですか？`,
    );
    if (!ok) {
      setStatus("カンペセットの読み込みをキャンセルしました。");
      return;
    }

    setStatus("カンペセットを読み込んでいます...");
    const preparedCards = await Promise.all(payload.cards.map((card) => prepareImportedCard(card)));
    const groupMap = mergeImportedGroups(payload.groups);
    const baseOrder = state.cards.length > 0 ? Math.max(...state.cards.map((card) => card.order)) + 1 : 0;
    const importedCards = preparedCards.map((card, index) => ({
      ...card,
      id: crypto.randomUUID(),
      order: baseOrder + index,
      groupIds: card.groupIds.map((groupId) => groupMap.get(groupId)).filter(Boolean),
      createdAt: Date.now(),
    }));

    for (const card of importedCards) {
      await putCard(card);
    }

    applyImportedSettings(payload.settings);
    state.cards.push(...importedCards);
    if (importedCards.length > 0) {
      state.currentIndex = state.cards.length - importedCards.length;
    }
    saveSettings();
    applySettingsToControls();
    normalizeCurrentIndex();
    render();
    setStatus(`${importedCards.length}枚のカンペセットを読み込みました。`);
  } catch (error) {
    console.error(error);
    setStatus("カンペセットを読み込めませんでした。ファイル形式を確認してください。", true);
  }
}

function parseDeckPayload(text) {
  const payload = JSON.parse(text);
  if (!payload || payload.format !== DECK_FILE_FORMAT) {
    throw new Error("Unsupported deck format");
  }

  const version = Number(payload.version ?? 1);
  if (!Number.isFinite(version) || version > DECK_SCHEMA_VERSION) {
    throw new Error("Unsupported deck version");
  }

  const groups = normalizeDeckGroups(payload.groups);
  const cards = normalizeDeckCards(payload.cards);
  if (!Array.isArray(payload.cards) || cards.length === 0 || cards.length !== payload.cards.length) {
    throw new Error("Deck cards are invalid");
  }

  const settings = payload.settings && typeof payload.settings === "object" ? payload.settings : {};
  return { groups, cards, settings };
}

async function prepareImportedCard(card) {
  const blob = dataUrlToBlob(card.dataUrl, card.type);
  if (!blob.type.startsWith("image/")) {
    throw new Error("Imported card is not an image");
  }

  return {
    name: card.name,
    type: blob.type,
    size: blob.size,
    originalSize: card.originalSize || card.size || blob.size,
    hidden: card.hidden,
    groupIds: card.groupIds,
    blob,
  };
}

function mergeImportedGroups(groups) {
  const groupMap = new Map();
  const nextGroups = [...state.settings.groups];

  groups.forEach((group) => {
    const existingGroup = nextGroups.find((currentGroup) => currentGroup.name === group.name);
    if (existingGroup) {
      groupMap.set(group.id, existingGroup.id);
      return;
    }

    const nextGroup = { id: createGroupId(), name: group.name };
    nextGroups.push(nextGroup);
    groupMap.set(group.id, nextGroup.id);
  });

  state.settings.groups = nextGroups;
  return groupMap;
}

function applyImportedSettings(settings) {
  DECK_EXPORT_SETTING_KEYS.forEach((key) => {
    const value = settings[key];
    if (!Object.prototype.hasOwnProperty.call(settings, key)) {
      return;
    }

    if (isValidDeckSetting(key, value)) {
      state.settings[key] = value;
    }
  });
}

function isValidDeckSetting(key, value) {
  if (key === "fitMode") {
    return value === "contain" || value === "cover";
  }
  if (key === "pipSize") {
    return ["480x270", "640x360", "800x450", "960x540"].includes(value);
  }
  if (key === "pipControlsSize") {
    return ["small", "medium", "large"].includes(value);
  }
  if (key === "pipControlsPlacement") {
    return PIP_CONTROL_PLACEMENTS.includes(value);
  }
  if (key === "pipControlsPosition") {
    return ["top", "middle", "bottom"].includes(value);
  }
  if (key === "pipControlsBackground") {
    return ["solid", "translucent", "clear"].includes(value);
  }

  return typeof value === "boolean";
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl, fallbackType = "image/png") {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) {
    throw new Error("Invalid data URL");
  }

  const type = match[1] || fallbackType || "image/png";
  const encodedData = match[3] || "";
  const binary = match[2] ? atob(encodedData) : decodeURIComponent(encodedData);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
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
  els.exportDeck.disabled = !hasCards;
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
