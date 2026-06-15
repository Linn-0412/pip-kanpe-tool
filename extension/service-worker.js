const TOOL_URL_PATTERN = "https://linn-0412.github.io/pip-kanpe-tool/*";

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

async function findToolTab() {
  const tabs = await chrome.tabs.query({ url: TOOL_URL_PATTERN });
  if (tabs.length === 0) {
    return null;
  }

  return tabs.find((tab) => tab.active) ?? tabs[0];
}

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
