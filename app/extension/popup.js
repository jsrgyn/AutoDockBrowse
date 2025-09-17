async function setValue(obj) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(obj, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

async function getValue(variable) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([variable], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[variable]);
      }
    });
  });
}

function calcularDiferencaDias(data1, data2) {
  const [dia1, mes1, ano1] = data1.split("/").map(Number);
  const [dia2, mes2, ano2] = data2.split("/").map(Number);

  const date1 = new Date(ano1, mes1 - 1, dia1);
  const date2 = new Date(ano2, mes2 - 1, dia2);

  const diferencaMillis = Math.abs(date2 - date1);
  const diferencaDias = diferencaMillis / (1000 * 60 * 60 * 24);

  return diferencaDias;
}

function incrementarDias(data, dias, formato = "yyyy-mm-dd") {
  const date = new Date(data);

  date.setDate(date.getDate() + (dias < 0 ? dias : dias + 1));

  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");

  if (formato === "dd/mm/yyyy") {
    return `${dia}/${mes}/${ano}`;
  }

  return `${ano}-${mes}-${dia}`;
}

(async () => {
  const dtProcessamento = await getValue("dtProcessamento");
  const diasRetroceder = await getValue("diasRetroceder");
  const diasProcessar = await getValue("diasProcessar");
  let dtFimProcessamento = await getValue("dtFimProcessamento");
  const statusProcessamento = await getValue("statusProcessamento");
  const processamento = await getValue("processamento");

  const elementDiasRetroceder = document.getElementById("diasRetroceder");
  const elementDiasProcessar = document.getElementById("diasProcessar");
  const elementDtFimProcessamento =
    document.getElementById("dtFimProcessamento");
  const elementStatusProcessamento = document.getElementById(
    "statusProcessamento"
  );

  const btnIniciarAgd = document.getElementById("btnIniciarAgd");
  const btnPararAgd = document.getElementById("btnPararAgd");

  if (btnIniciarAgd && processamento === "S") {
    btnIniciarAgd.disabled = true;
  }
  if (btnPararAgd && processamento === "N") {
    btnPararAgd.disabled = true;
  }

  const diferencaDias = calcularDiferencaDias(
    dtProcessamento || new Date().toLocaleDateString(),
    new Date().toLocaleDateString()
  );

  if (diferencaDias && dtFimProcessamento) {
    dtFimProcessamento = incrementarDias(dtFimProcessamento, diferencaDias + 1);
  }

  if (diasRetroceder) elementDiasRetroceder.value = diasRetroceder;
  if (diasProcessar) elementDiasProcessar.value = diasProcessar;
  if (dtFimProcessamento) elementDtFimProcessamento.value = dtFimProcessamento;
  if (statusProcessamento)
    elementStatusProcessamento.value = statusProcessamento;

  // Lógica para iniciar automático se todos os campos estiverem preenchidos
  if (
    diasRetroceder &&
    diasProcessar &&
    dtFimProcessamento &&
    statusProcessamento &&
    processamento === "N"
  ) {
    console.log("Iniciando processamento automaticamente...");
    btnIniciarAgd.click();
  }
})();

document.getElementById("executeAgenda").addEventListener("click", async () => {
  const mes = parseInt(document.getElementById("mes").value, 10) || 1;
  const ano = parseInt(document.getElementById("ano").value, 10) || 1;

  // Enviar mensagem para o content script para executar a função main
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "processarAgenda", data: { mes, ano, type: "A" } },
      (response) => {
        if (response && response.success) {
          window.close();
        } else {
          console.error("Não foi possível executar as funções para agenda!");
        }
      }
    );
  });
});

document
  .getElementById("executeProducao")
  .addEventListener("click", async () => {
    const mes = parseInt(document.getElementById("mes").value, 10) || 1;
    const ano = parseInt(document.getElementById("ano").value, 10) || 1;

    // Enviar mensagem para o content script para executar a função main
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "processarProducao", data: { mes, ano, type: "P" } },
        (response) => {
          if (response && response.success) {
            window.close();
          } else {
            console.error(
              "Não foi possível executar as funções para produção!"
            );
          }
        }
      );
    });
  });

document.getElementById("btnIniciarAgd").addEventListener("click", async () => {
  const diasRetroceder = Number(
    document.getElementById("diasRetroceder").value
  );
  const diasProcessar = Number(document.getElementById("diasProcessar").value);
  const dtFimProcessamento =
    document.getElementById("dtFimProcessamento").value;
  const statusProcessamento = document.getElementById(
    "statusProcessamento"
  ).value;

  if (!diasRetroceder) {
    alert("Informe a quantidade de dias para retroceder!");
    document.getElementById("diasRetroceder").focus();
    return;
  }

  if (!dtFimProcessamento) {
    alert("Informe a data final para processar!");
    document.getElementById("dtFimProcessamento").focus();
    return;
  }

  if (!statusProcessamento) {
    alert("Informe o status para processar!");
    document.getElementById("statusProcessamento").focus();
    return;
  }

  await setValue({ diasRetroceder });
  await setValue({ diasProcessar });
  await setValue({ dtFimProcessamento });
  await setValue({ statusProcessamento });
  await setValue({ dtProcessamento: new Date().toLocaleDateString() });

  // // Enviar mensagem para o content script para executar a função main
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      {
        action: "iniciarAgd",
        data: {
          login: "8567",
          senha: "415263",
        },
      },
      (response) => {
        if (response && response.success) {
          window.close();
        } else {
          console.error("Não foi possível executar!");
        }
      }
    );
  });
});

document.getElementById("btnPararAgd").addEventListener("click", async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "pararAgd", data: {} },
      (response) => {
        if (response && response.success) {
          window.close();
        } else {
          alert("Não foi possível parar o processo!");
        }
      }
    );
  });
});
