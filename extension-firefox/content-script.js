if (!globalThis.__pipKanpeHotkeysInstalled) {
  globalThis.__pipKanpeHotkeysInstalled = true;

  browser.runtime.onMessage.addListener((message) => {
    if (message?.target !== "pip-kanpe-tool" || message.type !== "command") {
      return false;
    }

    return Promise.resolve(runCommand(message.command));
  });
}

// Webアプリ側の安定したボタンIDを優先し、見つからない場合はwindow messageへフォールバックする。
function runCommand(command) {
  const buttonIds = {
    previous: ["preview-pip-prev", "prev-main"],
    next: ["preview-pip-next", "next-main"],
  }[command];

  const button = findCommandButton(buttonIds);
  if (button instanceof HTMLButtonElement) {
    if (button.disabled) {
      return { ok: false, reason: "button-disabled" };
    }

    button.click();
    return { ok: true, via: "button-click" };
  }

  window.postMessage(
    {
      source: "pip-kanpe-hotkeys",
      type: "command",
      command,
    },
    window.location.origin,
  );
  return { ok: true, via: "window-message" };
}

function findCommandButton(buttonIds) {
  if (!Array.isArray(buttonIds)) {
    return null;
  }

  for (const buttonId of buttonIds) {
    const button = document.getElementById(buttonId);
    if (button instanceof HTMLButtonElement) {
      return button;
    }
  }

  return null;
}
