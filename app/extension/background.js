chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ fluxo: "" }, () => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "setFluxo") {
    chrome.storage.local.set({ fluxo: message.value }, () => {});
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "iniciarAgd") {
    console.log("Iniciando processo de AGD com dados:", message.data);
    // Você pode adicionar lógica adicional aqui se necessário
    chrome.storage.local.set(message.data, () => {
      sendResponse({ success: true, message: "Processo iniciado" });
    });
    return true;
  }
});
