// const URLBase = "http://localhost:3000";
const URLBase = "https://api.drmais.com.br";

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

function getLastDayOfMonth(year, month) {
  if (month < 1 || month > 12) {
    throw new Error("O mês deve estar entre 1 (janeiro) e 12 (dezembro).");
  }
  const nextMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(nextMonth.getTime() - 1);
  return lastDayOfMonth;
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  return `${day}/${month}/${year}`;
}

async function main(action, data) {
  try {
    if (action === "pararAgd") {
      await setValue({ processamento: "N" });
    } else if (action === "iniciarAgd") {
      if (!window.location.href.includes("login.faces")) {
        alert(
          "Não está na página correta! Você deve estar na página de login."
        );
        return;
      }

      const { login, senha } = data;

      const inputLogin = document.querySelector("#login_form\\:username");
      const inputSenha = document.querySelector("#login_form\\:password");
      const btnEntrar = document.querySelector("#login_form\\:j_idt14");

      inputLogin.value = login;
      inputSenha.value = senha;

      await setValue({ importacao: { data: [] } });
      await setValue({ fluxo: "abrir-orcamento" });
      await setValue({ pageOrcamento: 1 });
      await setValue({ processamento: "S" });

      btnEntrar.click();
    } else if (action === "processarAgenda") {
      if (
        !window.location.href.includes("relatorio_efetivacao_consulta.faces")
      ) {
        alert(
          "Não está na página correta! Você deve estar na página de relatório da agenda."
        );
        return;
      }

      const btnPesquisar = document.querySelector(
        "input.btn.btn-small.btn-success"
      );
      const dtIni = document.querySelector("#formulario\\:dataInicialInput");
      const dtFin = document.querySelector("#formulario\\:dataFinalInput");

      const lastDay = getLastDayOfMonth(ano, mes);
      const formattedDate = formatDate(lastDay);

      dtIni.value = `01/${mes > 9 ? mes : `0${mes}`}/${ano}`;
      dtFin.value = formattedDate;

      btnPesquisar.click();
    } else if (action === "processarProducao") {
      alert("Não implementado rotina para produção!");
    } else {
      alert("Ação não implementado!");
    }
  } catch (err) {
    alert(
      `Ops! Ocorreu erro no processamento! ${err.message} Stack: ${err.stack}`
    );
  }
}

// Intercepta pushState e replaceState
(function () {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    handleNavigationChange();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    handleNavigationChange();
  };
})();

window.addEventListener("load", async () => {
  const processamento = await getValue("processamento");
  if (processamento === "S") {
    if (window.location.href.includes("/home.faces")) {
      abrirOrcamento();
    } else if (window.location.href.includes("/busca_orcamento.faces")) {
      processarOrcamento();
    } else if (window.location.href.includes("/digitar_orcamento.faces")) {
      await setValue({ etapaOrcamento: 1 });
      await setValue({ detalheDependente: {} });
      await setValue({ dependentes: null });

      processarDetalheOrcamento();
      const observer = new MutationObserver((mutations) => {
        processarDetalheOrcamento();
      });

      observer.observe(document, { childList: true, subtree: true });
    }
  }
});

function processarTableOrcamento() {
  const table = document.querySelector("table");

  if (table) {
    const observeTable = async () => {
      const jsonTable = tableToJsonOrcamento(table);
      const importacao = await getValue("importacao");
      const fluxo = await getValue("fluxo");
      const json = [];
      jsonTable.forEach((dado) => {
        if (
          dado[`<spanclass="ui-column-title">orçamento</span>`] &&
          dado[`<spanclass="ui-column-title">orçamento</span>`] !==
            "No records found."
        ) {
          const obj = {
            cpf: dado[`<spanclass="ui-column-title">beneficiário</span>`]
              ? dado[`<spanclass="ui-column-title">beneficiário</span>`]
                  .split("-")[0]
                  .trim()
              : "",
            nome: dado[`<spanclass="ui-column-title">beneficiário</span>`]
              ? dado[`<spanclass="ui-column-title">beneficiário</span>`]
                  .split("-")[1]
                  .trim()
              : "",
            nr_carteirinha: dado[
              `<spanclass="ui-column-title">beneficiário</span>`
            ]
              ? (
                  dado[
                    `<spanclass="ui-column-title">beneficiário</span>`
                  ].split("-")[2] || ""
                ).trim()
              : "",
            datadeenviosms:
              dado[`<spanclass="ui-column-title">datadeenviosms</span>`],
            dependentes:
              dado[`<spanclass="ui-column-title">dependentes</span>`],
            dia_vencimento:
              dado[`<spanclass="ui-column-title">vencimento</span>`],
            dt_vigencia: dado[`<spanclass="ui-column-title">vigência</span>`],
            orcamento: dado[`<spanclass="ui-column-title">orçamento</span>`],
            senhaSMS: dado[`<spanclass="ui-column-title">senhasms</span>`],
            situacao: dado[`<spanclass="ui-column-title">status/data</span>`]
              ? dado[`<spanclass="ui-column-title">status/data</span>`]
                  .split("-")[0]
                  .trim()
              : "",
            dataStatus: dado[`<spanclass="ui-column-title">status/data</span>`]
              ? dado[`<spanclass="ui-column-title">status/data</span>`]
                  .split("-")[1]
                  .trim()
              : "",
            tipo: dado[
              `<spanclass="ui-column-title">titular/responsávelfinanceiro</span>`
            ],
            idlead: dado[`<spanclass="ui-column-title">idlead</span>`],
            origemlead: dado[`<spanclass="ui-column-title">origemlead</span>`],
            codVendedor: dado[`<spanclass="ui-column-title">vendedor</span>`]
              ? dado[`<spanclass="ui-column-title">vendedor</span>`]
                  .split("-")[0]
                  .trim()
              : "",
            nomeVendedor: dado[`<spanclass="ui-column-title">vendedor</span>`]
              ? dado[`<spanclass="ui-column-title">vendedor</span>`]
                  .split("-")[1]
                  .trim()
              : "",
            importacaoDetalhe: "N",
          };

          if (
            (!importacao ||
              !importacao.data.find((d) => d.orcamento === obj.orcamento)) &&
            !json.find((f) => f.orcamento === obj.orcamento) &&
            obj.cpf
          ) {
            json.push(obj);
          }
        }
      });

      if (json.length) {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${URLBase}/importacaoIntLote`, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = () => {
          if (xhr.status !== 200) console.error("Error import! ", xhr.status);
        };
        xhr.send(JSON.stringify(json));
        const data =
          importacao && importacao.data ? importacao.data.concat(json) : json;

        await setValue({ importacao: { data } });

        visualizarOrcamento();
      } else if (fluxo === "orcamento-detalhe-voltar") {
        await setValue({ fluxo: "processar-orcamento" });
        await sleep(1000);
        window.location.reload();
      } else if (fluxo === "processar-orcamento") {
        visualizarOrcamento();
      }

      const observer = new MutationObserver((mutations, observer) => {
        observer.disconnect(); // stop watching changes
        // updateTable(); // do your changes

        let isTable = false;
        mutations.forEach((mutation) => {
          // Verifique cada nó adicionado se é a div que estamos procurando
          mutation.addedNodes.forEach((addedNode) => {
            if (addedNode.nodeType === Node.ELEMENT_NODE) {
              const tagName = addedNode.tagName.toLowerCase();
              if (tagName === "table" || tagName === "tr") {
                isTable = true;
              }
            }
          });
        });
        if (isTable) observeTable(); // start watching for changes again
      });

      observer.observe(table, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    };

    observeTable();
  }
}

window.onload = async () => {
  try {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Verifique cada nó adicionado se é a div que estamos procurando
        mutation.addedNodes.forEach((addedNode) => {
          // eslint-disable-next-line no-undef
          if (addedNode.nodeType === Node.ELEMENT_NODE) {
            if (addedNode.matches("form")) {
              if (
                window.location.href.includes(
                  "relatorio_efetivacao_consulta.faces"
                )
              ) {
                processarAgenda();
              }
              if (window.location.href.includes("relatorio_producao.faces")) {
                processarProducao();
              }
            }
          }
        });
      });
    });

    observer.observe(document, { childList: true, subtree: true });

    if (window.location.href.includes("relatorio_efetivacao_consulta.faces")) {
      processarAgenda();
    }
    if (window.location.href.includes("relatorio_producao.faces")) {
      processarProducao();
    }
  } catch (err) {
    alert(
      `Ops! Ocorreu erro no processamento! ${err.message} Stack: ${err.stack}`
    );
  }
};

async function processarProducao() {
  const tipo = document.querySelector("#formulario\\:situacao");
  const prestador = document.querySelector("#formulario\\:prestador");
  const mesRef = document.querySelector("#formulario\\:medico");
  const diaIni = document.querySelector(
    "#formulario > div:nth-child(6) > div:nth-child(2) > div > input:nth-child(1)"
  );
  const diaFim = document.querySelector(
    "#formulario > div:nth-child(6) > div:nth-child(2) > div > input:nth-child(3)"
  );

  const table = document.querySelector(
    "#formulario > div:nth-child(9) > div > table"
  );

  if (table) {
    const dataProducao = tableToJsonProducao(table);

    const data = {
      tipo_codigo: tipo.value,
      tipo_desc: tipo.options[indexOptionSelect(tipo, tipo.value)].textContent,
      prestador_codigo: prestador.value,
      prestador_desc:
        prestador.options[indexOptionSelect(prestador, prestador.value)]
          .textContent,
      mes_ref: mesRef.value,
      dia_ini: diaIni.value,
      dia_fim: diaFim.value,
      dados: dataProducao,
    };

    await postDataApi(data, "producao");

    await sleep(1000);

    alert("Processo de importação concluído!");
  }

  return;
}

async function abrirOrcamento() {
  const menu = document.querySelector("#navbar-collapse-1");

  if (menu) {
    const menuOrcamento = menu.querySelector(
      "ul:nth-child(1) > li > ul > li:nth-child(1) > ul > li:nth-child(1) > a"
    );
    if (menuOrcamento) {
      menuOrcamento.click();
    }
  }
}

async function visualizarOrcamento() {
  const table = document.querySelector("table");
  if (!table) return;

  const orcamentos = await getValue("importacao");
  const pageOrcamento = (await getValue("pageOrcamento")) || 1;
  let regsDefPage = pageOrcamento * 10;
  let regsCurrentPage = 10;

  if (!orcamentos && !orcamentos.data.length) return;

  const btnProxPage = document.querySelector(
    "#formList\\:dataTable_paginator_bottom > a.ui-paginator-next.ui-state-default.ui-corner-all"
  );
  const regsPage = document.querySelector(
    "#formList\\:dataTable_paginator_bottom > span"
  );

  if (regsPage) {
    const textContent = regsPage.textContent.split(" ")[0];

    const match = textContent.match(/(\d+)-(\d+)/);

    if (match) regsCurrentPage = match[2];
  }

  if (
    regsCurrentPage < regsDefPage &&
    btnProxPage &&
    !btnProxPage.classList.contains("ui-state-disabled")
  ) {
    btnProxPage.click();
    return;
  }

  const orcamentosDetalhe = orcamentos.data.find(
    (orcamento) => orcamento.importacaoDetalhe === "N"
  );

  if (!orcamentosDetalhe) {
    if (btnProxPage && !btnProxPage.classList.contains("ui-state-disabled")) {
      await setValue({ pageOrcamento: pageOrcamento + 1 });
      btnProxPage.click();
    } else {
      const dtFimAtual = await getValue("dtFimAtual");
      const dtFimProcessamento = await getValue("dtFimProcessamento");

      const difDias = calcularDiferencaDias(
        dtFimAtual,
        converterFormatoData(dtFimProcessamento)
      );

      if (difDias > 0) {
        await setValue({ fluxo: "atualizar-pesquisa-orcamento" });
        await setValue({ pageOrcamento: 1 });
        window.location.reload();
      } else {
        await setValue({ processamento: "N" });
        alert("Processo de importação concluído!");
      }
    }
  }

  if (orcamentosDetalhe) {
    const rows = table.querySelectorAll("tr[data-ri]");
    let orcamentoEncontrado = false;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const cells = row.querySelectorAll("td");
      const orcamentoTable = cells[0] ? cells[0].textContent.trim() : null;

      if (orcamentoTable === orcamentosDetalhe.orcamento) {
        const button = row.querySelector(
          'button[id^="formList:dataTable:"][id$=":j_idt108"]'
        );
        if (button) {
          orcamentoEncontrado = true;
          await setValue({ fluxo: "orcamento-detalhe" });
          button.click();
        }
        break;
      }
    }
    if (!orcamentoEncontrado) {
      orcamentosDetalhe.importacaoDetalhe = "NE";
      await setValue({ importacao: { data: orcamentos.data } });
      await sleep(1000);
      window.location.reload();
    }
  }
}

function findButtonByCPF(nome, cpf) {
  // Obtém todos os elementos com o ID "vi_box_cont"
  const dependentes = document.querySelectorAll("#vi_box_cont");
  for (const dependente of dependentes) {
    // Localiza o CPF dentro do dependente
    const nomeElement = dependente.querySelector("#vi_nome p");
    const cpfElement = dependente.querySelector("#vi_cpf p");
    if (
      cpfElement &&
      cpfElement.textContent.trim() === cpf &&
      nomeElement &&
      nomeElement.textContent.trim() === nome
    ) {
      // Retorna o botão associado, assumindo que está na mesma estrutura
      const button = dependente.querySelector(
        "a[id^='j_idt353'][id$=':j_idt355']"
      );
      return button;
    }
  }
  // Retorna null caso o CPF não seja encontrado
  return null;
}

function extrairDadosDoFormulario(form) {
  const dados = {};

  const tables = form.querySelectorAll(".table-rel");

  // Seleciona todas as linhas que contêm os pares de rótulo e valor
  const linhas = tables[0].querySelectorAll(".row");

  linhas.forEach((linha) => {
    // Dentro de cada linha, procura pelos rótulos e valores
    const rotuloElement = linha.querySelector(".vi_text");
    const valorElement = linha.querySelector(".vi_text_vl");

    if (rotuloElement && valorElement) {
      const rotulo = removerAcentos(
        rotuloElement.textContent
          .trim()
          .replace(/:$/, "")
          .toLowerCase()
          .replace(/ /gi, "")
      );
      const valor = valorElement.textContent.trim();

      // Adiciona ao objeto dados
      dados[rotulo] = valor;
    }
  });

  const linhasValores = tables[tables.length - 1].querySelectorAll(".row");

  linhasValores.forEach((linha) => {
    // Dentro de cada linha, procura pelos rótulos e valores
    const elements = linha.querySelectorAll(".control-label");
    elements.forEach((element) => {
      const text = element.textContent;
      const splitIndex = text.indexOf(":");
      let rotulo = (text.slice(0, splitIndex) || "").trim();
      const valor = (text.slice(splitIndex + 1) || "").replace(/:/g, "").trim();
      if (rotulo) {
        rotulo = removerAcentos(
          rotulo
            .replace(/:/g, "")
            .toLowerCase()
            .replace(/ /gi, "")
            .replace(/\?/g, "")
        );
        dados[rotulo] = valor;
      }

      const inputs = element.querySelectorAll("input");
      processarCampos(inputs, dados);
    });
  });

  return dados;
}

function processarCampos(campos, obj) {
  campos.forEach((campo) => {
    if (!campo.hidden && campo.type !== "hidden") {
      if (obj && (campo.id || campo.name)) {
        if (campo.type === "radio" || campo.type === "checkbox") {
          let id = campo.id || campo.name;
          let value = `${campo.value}`;

          const label = campo.labels[0];
          if (label) {
            id = campo.id || campo.name;
            value = `${campo.value} - ${label.innerHTML}`;
          }

          if (campo.checked) {
            obj[id] = value === "on" ? "S" : value || "N";
          } else if (!obj[id]) {
            obj[id] = "";
          }
        } else if (campo.tagName === "SELECT") {
          obj[campo.id || campo.name] = `${campo.value} - ${
            campo.options[campo.selectedIndex].innerHTML
          }`;
        } else {
          obj[campo.id || campo.name] = campo.value;
        }
      }
    }
  });
}

async function processarDetalheOrcamento() {
  const etapaOrcamento = await getValue("etapaOrcamento");
  const detalheDependente = await getValue("detalheDependente");
  const deps = await getValue("dependentes");

  const form = document.querySelector("#formulario");

  const result = [...form.querySelectorAll("input, textarea, select")];
  const json = {};

  processarCampos(result, json);

  const formDependente = document.querySelector("#formdependente");
  const dependentes = deps || [];
  if (formDependente) {
    const depLine = formDependente.querySelectorAll("#vi_box_cont");
    depLine.forEach((line) => {
      const nome = line.querySelector("#text1").innerHTML;
      const cpf = line.querySelector("#text2").innerHTML;

      let obj = dependentes.find(
        (d) => (d.cpf || "") === (cpf || "") && d.nome === nome
      );

      if (!obj) {
        obj = {
          idade: line.querySelector("#text_0").innerHTML,
          nome,
          cpf: cpf || "",
          tipoPlano: line.querySelector("#text3").innerHTML,
          valor: line.querySelector("#text4").innerHTML,
          detalhe: "N",
        };

        dependentes.push(obj);
      }
    });

    if (detalheDependente) {
      let objDep = dependentes.find(
        (d) =>
          (d.cpf || "") === (detalheDependente.cpf || "") &&
          d.nome === detalheDependente.nome
      );
      if (objDep) {
        const inputsDependente = [
          ...formDependente.querySelectorAll("input, textarea, select"),
        ];
        processarCampos(inputsDependente, objDep);

        objDep.detalhe = "S";
      }
    }
  }
  json.dependentes = dependentes || [];

  const formResumo = document.querySelector("#formResumo");
  let resultResumo = null;
  if (formResumo) {
    resultResumo = extrairDadosDoFormulario(formResumo);
  }

  json.resumo = resultResumo;

  await setValue({ dependentes: json.dependentes });

  if (json.dependentes.length) {
    if (etapaOrcamento === 1) {
      const pular = document.querySelector("#j_idt168");
      if (pular) {
        await setValue({ etapaOrcamento: 2 });
        pular.click();
      }
    } else {
      const dependente = json.dependentes.find((d) => d.detalhe === "N");
      if (dependente) {
        const button = findButtonByCPF(dependente.nome, dependente.cpf);
        if (button) {
          await setValue({
            detalheDependente: { cpf: dependente.cpf, nome: dependente.nome },
          });
          button.click();
        }
      }
    }
  }

  if (
    !json.dependentes.length ||
    !json.dependentes.find((d) => d.detalhe === "N")
  ) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${URLBase}/importacaoInt`, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = () => {
      if (xhr.status !== 200) console.error("Error import! ", xhr.status);
    };
    xhr.send(JSON.stringify(json));

    const importacao = await getValue("importacao");
    if (importacao && importacao.data.length > 0) {
      const orcamento = importacao.data.find(
        (orcamento) => orcamento.orcamento == json.orcamento
      );
      if (orcamento) {
        orcamento.importacaoDetalhe = "S";
        await setValue({ importacao: { data: importacao.data } });
        await sleep(1000);
        if (window.history.length > 1) {
          await setValue({ fluxo: "orcamento-detalhe-voltar" });
          window.history.back();
        }
      }
    }
  }
}

function converterFormatoData(data) {
  if (data.includes("-")) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  } else if (data.includes("/")) {
    const [dia, mes, ano] = data.split("/");
    return `${ano}-${mes}-${dia}`;
  } else {
    throw new Error(
      "Formato de data inválido. Use 'yyyy-mm-dd' ou 'dd/mm/yyyy'."
    );
  }
}

function calcularDiferencaDias(data1, data2) {
  const [dia1, mes1, ano1] = data1.split("/").map(Number);
  const [dia2, mes2, ano2] = data2.split("/").map(Number);

  const date1 = new Date(ano1, mes1 - 1, dia1);
  const date2 = new Date(ano2, mes2 - 1, dia2);

  const diferencaMillis = date2 - date1;
  const diferencaDias = diferencaMillis / (1000 * 60 * 60 * 24);

  return diferencaDias;
}

async function processarOrcamento() {
  const fluxo = await getValue("fluxo");
  const statusProcessamento = await getValue("statusProcessamento");
  const diasRetroceder = await getValue("diasRetroceder");
  const diasProcessar = await getValue("diasProcessar");
  const dtFimProcessamento = await getValue("dtFimProcessamento");

  if (fluxo === "abrir-orcamento") {
    const dtInicial = document.querySelector("#formulario_busca\\:dataInicio");
    const dtFinal = document.querySelector("#formulario_busca\\:dataFim");
    const selectStatus = document.querySelector("#formulario_busca\\:status");
    const btnPesquisar = document.querySelector(
      "#formulario_busca > div.table-rel > div:nth-child(3) > div:nth-child(1) > input"
    );

    const dtAtual = new Date().toLocaleDateString();
    const dtIni = incrementarDias(
      converterFormatoData(dtAtual),
      (diasRetroceder > 1 ? diasRetroceder - 1 : diasRetroceder) * -1,
      "dd/mm/yyyy"
    );
    let dtFim = converterFormatoData(dtFimProcessamento);

    if (diasProcessar) {
      const dtFimNew = incrementarDias(
        converterFormatoData(dtIni),
        diasProcessar,
        "dd/mm/yyyy"
      );
      const difFim = calcularDiferencaDias(dtFimNew, dtFim);
      if (difFim > 0) {
        dtFim = dtFimNew;
      }
    }

    if (dtInicial && dtFinal) {
      dtInicial.value = dtIni;
      dtFinal.value = dtFim;
    }

    if (selectStatus) {
      selectStatus.value = statusProcessamento;
    }

    if (btnPesquisar) {
      await setValue({ fluxo: "processar-orcamento" });
      await setValue({ dtFimAtual: dtFim });
      btnPesquisar.click();
    }
  } else if (fluxo === "atualizar-pesquisa-orcamento") {
    const dtFimAtual = await getValue("dtFimAtual");
    const dtFimProcessamento = await getValue("dtFimProcessamento");
    const diasProcessar = await getValue("diasProcessar");

    const dtIni = incrementarDias(
      converterFormatoData(dtFimAtual),
      1,
      "dd/mm/yyyy"
    );
    let dtFim = converterFormatoData(dtFimProcessamento);

    if (diasProcessar) {
      const dtFimNew = incrementarDias(
        converterFormatoData(dtIni),
        diasProcessar,
        "dd/mm/yyyy"
      );
      const difFim = calcularDiferencaDias(dtFimNew, dtFim);
      if (difFim > 0) {
        dtFim = dtFimNew;
      }
    }

    const dtInicial = document.querySelector("#formulario_busca\\:dataInicio");
    const dtFinal = document.querySelector("#formulario_busca\\:dataFim");

    if (dtInicial && dtFinal) {
      dtInicial.value = dtIni;
      dtFinal.value = dtFim;
    }

    const selectStatus = document.querySelector("#formulario_busca\\:status");

    if (selectStatus) {
      const statusProcessamento = await getValue("statusProcessamento");
      selectStatus.value = statusProcessamento;
    }

    const btnPesquisar = document.querySelector(
      "#formulario_busca > div.table-rel > div:nth-child(3) > div:nth-child(1) > input"
    );
    if (btnPesquisar) {
      await setValue({ fluxo: "processar-orcamento" });
      await setValue({ dtFimAtual: dtFim });
      btnPesquisar.click();
    }
  } else if (
    ["processar-orcamento", "orcamento-detalhe-voltar"].includes(fluxo)
  ) {
    processarTableOrcamento();
  }
}

async function processarAgenda() {
  const dtIni = document.querySelector("#formulario\\:dataInicialInput");
  const dtFin = document.querySelector("#formulario\\:dataFinalInput");
  const prestador = document.querySelector("#formulario\\:prestador");
  const btnPesquisar = document.querySelector(
    "input.btn.btn-small.btn-success"
  );
  const valoresPrestador = optionsSelect(prestador);
  let indexPrestador;
  let ultimo;

  if (prestador) {
    indexPrestador = indexOptionSelect(prestador, prestador.value);
    ultimo = indexPrestador === prestador.options.length - 1;
  }

  const proximoPrestador = () => {
    if (!ultimo && indexPrestador >= 0) {
      prestador.value = valoresPrestador[indexPrestador + 1].value;
      btnPesquisar.click();
    }
  };

  const message = document.querySelector(
    "#formulario\\:messages > div > ul > li > span"
  );
  if (message && message.textContent) {
    const btnFecharModal = document.querySelector(
      "#ModalMensagens > div > div > div > div.text-center.margin-bottom-20 > button"
    );
    btnFecharModal.click();

    proximoPrestador();
    return;
  }

  const tableAgenda = document.querySelector("#formulario\\:dataTable");

  if (tableAgenda) {
    const dataAgenda = tableToJson(tableAgenda);

    const data = {
      dtini: dtIni.value,
      dtfin: dtFin.value,
      cd_medico_agendado: valoresPrestador[indexPrestador].value,
      nm_medico_agendado: valoresPrestador[indexPrestador].description,
      dados: dataAgenda,
    };

    await postDataApi(data, "agenda");

    await sleep(1000);

    proximoPrestador();

    if (ultimo) {
      alert("Processo de importação concluído!");
    }
  }

  return;
}

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, ms)
  );
}

function postDataApi(data, type) {
  return new Promise((resolve, reject) => {
    if (data) {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${URLBase}/tmpCohp?type=${type}`, true);
        xhr.timeout = 1500 * 1000; // 25 min
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = () => {
          if (xhr.status !== 200) console.error("Error import! ", xhr.status);
          resolve();
        };
        xhr.send(JSON.stringify(data));
      } catch (err) {
        reject(err);
      }
    } else {
      resolve();
    }
  });
}

function optionsSelect(select) {
  const result = [];
  if (select) {
    const qtdOptions = select.options.length;
    for (let i = 0; i <= qtdOptions - 1; i++) {
      option = {
        value: select.options[i].value,
        description: select.options[i].textContent,
      };

      result.push(option);
    }
  }
  return result;
}

function indexOptionSelect(select, value) {
  if (select && value) {
    const indiceEncontrado = Array.from(select.options).findIndex(
      (option) => option.value === value
    );
    return indiceEncontrado;
  }
}

function tableToJson(table) {
  var data = [];

  var headers = [];
  for (var i = 0; i < table.rows[0].cells.length; i++) {
    headers[i] = table.rows[0].cells[i].innerHTML
      .toLowerCase()
      .replace(/ /gi, "")
      .replace(/<label>/gi, "")
      .replace(/<\/label>/gi, "")
      .replace(/\//gi, "_")
      .replace(/-/gi, "");

    headers[i] = removerAcentos(headers[i]);
  }

  for (var i = 1; i < table.rows.length; i++) {
    var tableRow = table.rows[i];
    var rowData = {};

    for (var j = 0; j < tableRow.cells.length; j++) {
      rowData[headers[j]] = tableRow.cells[j].innerHTML
        .trim()
        .replace(/<br>/gi, "=>")
        .replace(/\r?\n|\r/g, "");
    }

    data.push(rowData);
  }

  return data;
}

function tableToJsonOrcamento(table) {
  var data = [];

  // first row needs to be headers
  var headers = [];
  for (var i = 0; i < table.rows[0].cells.length; i++) {
    headers[i] = table.rows[0].cells[i].innerHTML
      .toLowerCase()
      .replace(/ /gi, "");
  }

  // go through cells
  for (var i = 1; i < table.rows.length; i++) {
    var tableRow = table.rows[i];
    var rowData = {};

    for (var j = 0; j < tableRow.cells.length; j++) {
      rowData[headers[j]] = tableRow.cells[j].innerHTML
        .trim()
        .replace(/<br>/gi, "-")
        .replace(/\r?\n|\r/g, "");
    }

    data.push(rowData);
  }

  return data;
}

function tableToJsonProducao(table) {
  const data = [];

  const rows = table.querySelectorAll("tbody tr");

  let tipo;
  let rede;
  for (let i = 0; i < rows.length - 1; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll("td");
    const coluns = row.querySelectorAll("th");

    if (coluns && coluns.length) {
      if (coluns[0] && coluns[0].classList.contains("cabecalho1")) {
        tipo = coluns[0] ? coluns[0].textContent.trim() : null;
      }
      if (coluns[0] && coluns[0].classList.contains("cabecalho2")) {
        rede = coluns[0] ? coluns[0].textContent.trim() : null;
      }
      continue;
    }

    if (cells && cells.length) {
      const rowData = {
        tipo,
        rede,
        data_execucao: cells[0]
          ? cells[0].innerHTML
              .trim()
              .replace(/<br>/gi, "=>")
              .replace(/\r?\n|\r/g, "")
              .replace(/<b>/g, "")
              .replace(/<\/b>/g, "")
          : null,
        usuario: cells[1]
          ? cells[1].innerHTML
              .trim()
              .replace(/<br>/gi, "=>")
              .replace(/\r?\n|\r/g, "")
              .replace(/<b>/g, "")
              .replace(/<\/b>/g, "")
          : null,
        medico_solicitante_executante: cells[2]
          ? cells[2].innerHTML
              .trim()
              .replace(/<br>/gi, "=>")
              .replace(/\r?\n|\r/g, "")
              .replace(/<b>/g, "")
              .replace(/<\/b>/g, "")
          : null,
        procedimento: cells[3]
          ? cells[3].innerHTML
              .trim()
              .replace(/<br>/gi, "=>")
              .replace(/\r?\n|\r/g, "")
              .replace(/<b>/g, "")
              .replace(/<\/b>/g, "")
          : null,
        urgencia: cells[4]
          ? cells[4].innerHTML
              .trim()
              .replace(/<br>/gi, "=>")
              .replace(/\r?\n|\r/g, "")
              .replace(/<b>/g, "")
              .replace(/<\/b>/g, "")
          : null,
        qtde_autorizado: cells[5]
          ? cells[5].innerHTML
              .trim()
              .replace(/<br>/gi, "=>")
              .replace(/\r?\n|\r/g, "")
              .replace(/<b>/g, "")
              .replace(/<\/b>/g, "")
          : null,
        qtde_realizado: cells[6]
          ? cells[6].innerHTML
              .trim()
              .replace(/<br>/gi, "=>")
              .replace(/\r?\n|\r/g, "")
              .replace(/<b>/g, "")
              .replace(/<\/b>/g, "")
          : null,
        data_autorizacao: cells[7]
          ? cells[7].innerHTML
              .trim()
              .replace(/<br>/gi, "=>")
              .replace(/\r?\n|\r/g, "")
              .replace(/<b>/g, "")
              .replace(/<\/b>/g, "")
          : null,
        n_da_guia: cells[8] ? cells[8].textContent.trim() : null,
        senha: cells[9]
          ? cells[9].querySelector("a")
            ? cells[9].querySelector("a").textContent.trim() || null
            : cells[9].textContent.trim() || null
          : null,
      };
      data.push(rowData);
    }
  }

  return data;
}

function removerAcentos(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  setTimeout(() => {
    main(request.action, request.data);
  }, 100);

  sendResponse({ success: true });
});
