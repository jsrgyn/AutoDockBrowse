chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ fluxo: "" }, () => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "setFluxo") {
    chrome.storage.local.set({ fluxo: message.value }, () => {});
    return true;
  }
});
