const TOOL_URL_PATTERN = "https://linn-0412.github.io/pip-kanpe-tool/*";

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
  const tabs = await chrome.tabs.query({ url: TOOL_URL_PATTERN });
  if (tabs.length === 0) {
    return null;
  }

  return tabs.find((tab) => tab.active) ?? tabs[0];
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
