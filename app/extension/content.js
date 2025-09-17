// Intercepta mensagens postMessage do script de automação
window.addEventListener("message", async (event) => {
  // Verifica se a mensagem vem do próprio domínio e tem source correto
  if (
    event.origin === window.location.origin &&
    event.data &&
    event.data.source === "selenium-automation"
  ) {
    console.log("Mensagem recebida do script de automação:", event.data);

    // Processa diferentes ações baseadas no campo 'action'
    switch (event.data.action) {
      case "setValues":
        // Armazena valores no chrome.storage
        await new Promise((resolve) => {
          chrome.storage.local.set(event.data.values, () => {
            console.log("Valores configurados com sucesso");
            resolve();
          });
        });
        break;

      case "iniciarAgd":
        // Envia mensagem para o background script para iniciar o processo
        chrome.runtime.sendMessage(
          {
            action: "iniciarAgd",
            data: event.data.data,
          },
          (response) => {
            console.log("Resposta do background:", response);
          }
        );
        break;

      default:
        console.warn("Ação não reconhecida:", event.data.action);
    }
  }
});

// Logs de depuração
console.log("Content script carregado e pronto para receber mensagens.");
