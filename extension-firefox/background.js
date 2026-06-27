const TOOL_URL_PATTERNS = [
  "https://linn-0412.github.io/pip-kanpe-tool/*",
  "http://localhost/*",
  "http://127.0.0.1/*",
];

// FirefoxはChrome拡張のservice worker前提とは違うため、background.scriptsで常駐側の橋渡しだけ行う。
const COMMAND_TO_ACTION = {
  "previous-card": "previous",
  "next-card": "next",
};

browser.commands.onCommand.addListener(async (command) => {
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
  const tabsByPattern = await Promise.all(TOOL_URL_PATTERNS.map((url) => browser.tabs.query({ url })));
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

async function sendActionToTab(tabId, action) {
  const message = {
    target: "pip-kanpe-tool",
    type: "command",
    command: action,
  };

  try {
    await browser.tabs.sendMessage(tabId, message);
  } catch (error) {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ["content-script.js"],
    });
    await browser.tabs.sendMessage(tabId, message);
  }
}
