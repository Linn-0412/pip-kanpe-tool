if (!globalThis.__pipKanpeHotkeysInstalled) {
  globalThis.__pipKanpeHotkeysInstalled = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.target !== "pip-kanpe-tool" || message.type !== "command") {
      return false;
    }

    window.postMessage(
      {
        source: "pip-kanpe-hotkeys",
        type: "command",
        command: message.command,
      },
      window.location.origin,
    );
    sendResponse({ ok: true });
    return false;
  });
}
