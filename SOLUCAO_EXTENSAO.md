# Solução para Problema de Comunicação com a Extensão Chrome

## Problema Identificado

O script Python não está conseguindo acessar o popup da extensão Chrome para passar os valores do arquivo .env.

## Mudanças Implementadas

### 1. Atualização do Content Script (savi.js)

Adicionado um novo listener para receber mensagens via `postMessage`:

```javascript
// Adicionar listener para postMessage do script Python
window.addEventListener("message", async (event) => {
  // Aceitar apenas mensagens da própria origem
  if (event.origin !== window.location.origin) return;

  // Verificar se é uma mensagem do script Python
  if (event.data && event.data.source === "selenium-automation") {
    console.log("Mensagem recebida do script Python:", event.data);

    if (event.data.action === "setValues") {
      // Definir valores no storage
      const values = event.data.values;
      for (const [key, value] of Object.entries(values)) {
        await setValue({ [key]: value });
      }
      console.log("Valores definidos no storage:", values);
    } else if (event.data.action === "iniciarAgd") {
      // Executar a função main
      await main("iniciarAgd", event.data.data);
      console.log("Função main executada via postMessage");
    }
  }
});
```

### 2. Atualização do Script Python (script.py)

Modificado para usar `postMessage` ao invés de tentar abrir o popup:

```python
# Passo 1: Enviar valores via postMessage
driver.execute_script("""
    console.log('Enviando valores para a extensão via postMessage...');

    // Enviar mensagem para definir valores
    window.postMessage({
        source: 'selenium-automation',
        action: 'setValues',
        values: {
            diasRetroceder: arguments[0],
            diasProcessar: arguments[1],
            dtFimProcessamento: arguments[2],
            statusProcessamento: '9',
            dtProcessamento: arguments[3],
            processamento: 'S',
            fluxo: 'abrir-orcamento'
        }
    }, window.location.origin);

    console.log('Valores enviados via postMessage');
""", dias_retroceder, dias_processar, data_fim, dt_processamento)

# Aguardar os valores serem processados
time.sleep(2)

# Passo 2: Iniciar o processo
print("Iniciando o processamento via postMessage...")
driver.execute_script("""
    console.log('Enviando comando iniciarAgd via postMessage...');

    window.postMessage({
        source: 'selenium-automation',
        action: 'iniciarAgd',
        data: {
            login: arguments[0],
            senha: arguments[1]
        }
    }, window.location.origin);

    console.log('Comando iniciarAgd enviado');
""", os.getenv("COD_CONCESSIONARIA"), os.getenv("PW_CONCESSIONARIA"))
```

### 3. Melhorias no Script Python

- Adicionado mais tempo de espera para o carregamento da página
- Adicionado verificação se o content script está carregado
- Adicionado captura de logs do console para debug
- Temporariamente removido o modo headless para facilitar o debug

## Como Testar

### Opção 1: Testar Localmente (Recomendado para Debug)

```bash
# Instalar dependências localmente
pip install -r app/requirements.txt

# Executar o script de teste
python app/test_extension.py

# Ou executar o script principal
python app/script.py
```

### Opção 2: Testar com Docker

```bash
# Reconstruir a imagem
docker-compose build

# Executar
docker-compose up
```

## Verificações de Debug

1. **Verificar se a extensão está carregada:**

   - Abrir chrome://extensions/ no navegador
   - Verificar se a extensão "Savi" está listada e ativada

2. **Verificar logs do console:**

   - Os logs mostrarão se o content script está recebendo as mensagens
   - Procurar por mensagens como "Mensagem recebida do script Python"

3. **Verificar o Chrome Storage:**
   - No console do navegador, executar:
   ```javascript
   chrome.storage.local.get(null, (items) => console.log(items));
   ```

## Possíveis Problemas e Soluções

1. **Content script não carrega:**

   - Verificar se a URL está no manifest.json
   - Verificar se a extensão está ativada

2. **Mensagens não são recebidas:**

   - Verificar se o script está esperando o carregamento completo da página
   - Verificar os logs do console para erros

3. **Valores não são salvos no storage:**
   - Verificar se a função `setValue` está funcionando corretamente
   - Verificar permissões da extensão no manifest.json

## Próximos Passos

1. Testar as mudanças localmente primeiro
2. Se funcionar, reabilitar o modo headless no script
3. Fazer deploy via Docker

## Modo Headless

Para reabilitar o modo headless após os testes, descomente a linha no script.py:

```python
chrome_options.add_argument("--headless")
```
