const TOOL_URL_PATTERNS = [
  "https://linn-0412.github.io/pip-kanpe-tool/*",
  "http://localhost/*",
  "http://127.0.0.1/*",
];

// Chromeのcommands APIで受けた名前を、Webアプリ側の前/次コマンドへ対応させる。
const COMMAND_TO_ACTION = {
  "previous-card": "previous",
  "next-card": "next",
};

chrome.commands.onCommand.addListener(async (command) => {
  const action = COMMAND_TO_ACTION[command];
  if (!action) {
    return;
  }

  const tab = await findToolTab();
  if (!tab?.id) {
    return;
  }

  await sendActionToTab(tab.id, action);
});

// 複数タブで開かれている場合は、操作中である可能性が高いactiveタブを優先する。
async function findToolTab() {
  const tabsByPattern = await Promise.all(TOOL_URL_PATTERNS.map((url) => chrome.tabs.query({ url })));
  const tabs = uniqueTabs(tabsByPattern.flat());
  if (tabs.length === 0) {
    return null;
  }

  return tabs.find((tab) => tab.active) ?? tabs[0];
}

function uniqueTabs(tabs) {
  const seen = new Set();
  return tabs.filter((tab) => {
    if (!tab.id || seen.has(tab.id)) {
      return false;
    }

    seen.add(tab.id);
    return true;
  });
}

// content-script未注入のタブでも動くよう、送信失敗時に注入してから再送する。
async function sendActionToTab(tabId, action) {
  const message = {
    target: "pip-kanpe-tool",
    type: "command",
    command: action,
  };

  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-script.js"],
    });
    await chrome.tabs.sendMessage(tabId, message);
  }
}
