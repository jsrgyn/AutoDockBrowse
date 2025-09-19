import os
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

def run_automation():
    """
    Função principal que executa a automação com Selenium.
    """
    print("Iniciando a automação...")

    # Variável para armazenar a URL anterior
    previous_url = None

    def log_url_change(current_url):
        """
        Registra log apenas quando a URL é alterada.
        
        :param current_url: URL atual do navegador
        """
        nonlocal previous_url
        if current_url != previous_url:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] 🔗 URL ALTERADA: {current_url}")
            previous_url = current_url

    # --- Configuração do Selenium ---
    chrome_options = Options()
    
    # Verificar se o diretório da extensão existe
    extension_path = '/app/extension'
    if not os.path.exists(extension_path):
        print(f"AVISO: Diretório da extensão não encontrado em: {extension_path}")
        print("Conteúdo de /app:", os.listdir('/app') if os.path.exists('/app') else "Diretório /app não existe")
    else:
        print(f"Extensão encontrada em: {extension_path}")
        print(f"Arquivos da extensão: {os.listdir(extension_path)}")
    
    chrome_options.add_argument(f'--load-extension={extension_path}')
    chrome_options.add_argument("--headless")  # Reabilitado para execução em container
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920x1080")
    # Adicionar diretório de dados único para evitar conflitos
    chrome_options.add_argument(f"--user-data-dir=/tmp/chrome-data-{os.getpid()}")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("--disable-extensions-except=/app/extension")
    chrome_options.add_argument("--disable-web-security")
    # Habilitar logs do console
    chrome_options.add_experimental_option('prefs', {'intl.accept_languages': 'pt-BR'})
    chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL', 'driver': 'ALL'})

    # --- Inicialização do WebDriver ---
    try:
        print("Configurando o ChromeDriver...")
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        print("WebDriver iniciado com sucesso.")

        # --- 1. INTERAÇÃO COM A EXTENSÃO ---
        try:
            print("Iniciando interação com a extensão...")
            
            # Passo 1: Navegar para a página de login para ativar o content script
            target_url = os.getenv("TARGET_URL")
            print(f"Navegando para a página de login para ativar a extensão: {target_url}")
            driver.get(target_url)
            
            # Aguardar o carregamento completo da página
            print("Aguardando o carregamento completo da página...")
            time.sleep(5)
            
            # Encontrar o ID da extensão
            def find_savi_extension_id():
                """
                Encontra o ID da extensão SAVI no sistema de arquivos.
                
                :return: ID da extensão ou None
                """
                # Usar caminho do diretório da extensão para encontrar o ID
                extension_path = '/app/extension'
                manifest_path = os.path.join(extension_path, 'manifest.json')
                
                try:
                    with open(manifest_path, 'r') as manifest_file:
                        import json
                        manifest = json.load(manifest_file)
                        extension_name = manifest.get('name', 'Savi')
                        extension_id = manifest.get('chrome_runtime_id', 'extension_id_not_found')
                        
                        print(f"Nome da extensão no manifest: {extension_name}")
                        print(f"ID da extensão no manifest: {extension_id}")
                        
                        return extension_id
                        
                except Exception as e:
                    print(f"Erro ao ler manifest: {e}")
                    return None
            
            # Capturar o ID da extensão
            extension_id = find_savi_extension_id()
            
            if not extension_id or extension_id == 'extension_id_not_found':
                # Tentar um ID genérico baseado no nome do arquivo
                import hashlib
                
                def generate_extension_id(name):
                    """
                    Gera um ID de extensão baseado no nome.
                    
                    :param name: Nome da extensão
                    :return: ID gerado
                    """
                    hash_obj = hashlib.sha256(name.encode())
                    return hash_obj.hexdigest()[:32].lower()
                
                extension_id = generate_extension_id('Savi')
                print(f"ID da extensão gerado: {extension_id}")
            
            if not extension_id:
                print("Extensão SAVI não encontrada!")
                raise RuntimeError("Extensão SAVI não instalada")
            
            # URL completa do popup
            popup_url = f'chrome-extension://{extension_id}/popup.html'
            print(f"URL do popup: {popup_url}")
            
            # Lista de estratégias para abrir o popup
            popup_opening_strategies = [
                # Estratégia 1: Usar chrome.tabs.create
                lambda: driver.execute_script(f"""
                    try {{
                        chrome.tabs.create({{
                            url: '{popup_url}',
                            active: true
                        }});
                        return true;
                    }} catch (error) {{
                        console.error('Erro ao criar tab:', error);
                        return false;
                    }}
                """),
                
                # Estratégia 2: Navegar diretamente
                lambda: driver.get(popup_url),
                
                # Estratégia 3: Executar script para abrir popup
                lambda: driver.execute_script(f"""
                    window.open('{popup_url}', '_blank');
                """)
            ]
            
            # Tentar abrir o popup com múltiplas estratégias
            popup_opened = False
            for strategy in popup_opening_strategies:
                try:
                    strategy()
                    popup_opened = True
                    break
                except Exception as e:
                    print(f"Falha na estratégia de abertura do popup: {e}")
            
            if not popup_opened:
                raise RuntimeError("Não foi possível abrir o popup da extensão")
            
            # Aguardar o popup ser carregado
            time.sleep(5)
            
            # Trocar para a janela do popup
            driver.switch_to.window(driver.window_handles[-1])
            
            # Mudar para o popup
            driver.switch_to.window(driver.window_handles[-1])
            
            # Log detalhado do popup
            try:
                # Capturar valores dos inputs
                popup_inputs = driver.execute_script("""
                    const inputs = document.querySelectorAll('input, select');
                    const inputValues = {};
                    inputs.forEach(input => {
                        inputValues[input.id] = input.value;
                    });
                    
                    // Capturar estado dos botões
                    const buttons = document.querySelectorAll('button');
                    const buttonStates = {};
                    buttons.forEach(button => {
                        buttonStates[button.id] = {
                            disabled: button.disabled,
                            text: button.textContent
                        };
                    });
                    
                    return {
                        inputs: inputValues,
                        buttons: buttonStates
                    };
                """)
                
                print("\n--- ESTADO DO POPUP ---")
                print("Valores dos Inputs:")
                for input_id, value in popup_inputs['inputs'].items():
                    print(f"{input_id}: {value}")
                
                print("\nEstado dos Botões:")
                for button_id, state in popup_inputs['buttons'].items():
                    print(f"{button_id}: Disabled={state['disabled']}, Texto={state['text']}")
                print("--- FIM DO ESTADO DO POPUP ---\n")
                
            except Exception as popup_error:
                print(f"Erro ao capturar estado do popup: {popup_error}")
            
            def preencher_popup(driver, dias_retroceder, dias_processar, data_fim, status_processamento):
                """
                Preenche os campos do popup da extensão.
                
                :param driver: WebDriver do Selenium
                :param dias_retroceder: Dias para retroceder
                :param dias_processar: Dias para processar
                :param data_fim: Data final de processamento
                :param status_processamento: Status do processamento
                """
                # Dias a Retroceder
                dias_retroceder_input = driver.find_element(By.ID, "diasRetroceder")
                dias_retroceder_input.clear()
                dias_retroceder_input.send_keys(dias_retroceder)
                
                # Dias a Processar
                dias_processar_input = driver.find_element(By.ID, "diasProcessar")
                dias_processar_input.clear()
                dias_processar_input.send_keys(dias_processar)
                
                # Data Final de Processamento
                data_fim_input = driver.find_element(By.ID, "dtFimProcessamento")
                data_fim_input.clear()
                data_fim_input.send_keys(data_fim)
                
                # Status de Processamento
                status_processamento_select = Select(driver.find_element(By.ID, "statusProcessamento"))
                status_processamento_select.select_by_value(status_processamento)
                
                # Clicar no botão Iniciar
                iniciar_button = driver.find_element(By.ID, "btnIniciarAgd")
                iniciar_button.click()
            
            # Valores para configuração
            dias_retroceder = os.getenv("Dias_Retroceder", "180")
            dias_processar = os.getenv("Dias_Processar", "1")
            data_fim = datetime.now().strftime('%Y-%m-%d')
            status_processamento = '9'
            
            # Preencher campos do popup
            print("Preenchendo campos do popup...")
            preencher_popup(driver, dias_retroceder, dias_processar, data_fim, status_processamento)
            
            print("Popup da extensão preenchido e iniciado.")
            time.sleep(5)  # Tempo para processamento
            
            # Voltar para a janela original
            driver.switch_to.window(driver.window_handles[0])
            
        except Exception as ext_error:
            print(f"AVISO: Não foi possível configurar a extensão. Erro: {ext_error}")
            print("Continuando para a etapa de login...")

        # --- 2. LÓGICA DE LOGIN NA PÁGINA ---
        print("Prosseguindo com o login...")
        username = os.getenv("COD_CONCESSIONARIA")
        password = os.getenv("PW_CONCESSIONARIA")

        if not username or not password:
            print("Erro: Credenciais não encontradas no .env")
        else:
            try:
                # Tratamento de popup de erro antes do login
                def handle_error_popup():
                    """Tenta encontrar e clicar no botão 'OK' de popups de erro."""
                    print("Procurando por popup de erro...")
                    
                    # Lista de possíveis localizadores para o botão 'OK'
                    popup_locators = [
                        (By.XPATH, "//button[contains(text(), 'OK')]"),
                        (By.XPATH, "//input[@value='OK']"),
                        (By.XPATH, "//*[contains(@class, 'btn-ok')]"),
                        (By.ID, "okButton"),
                        (By.XPATH, "//div[contains(@class, 'modal')]//button[contains(text(), 'OK')]")
                    ]
                    
                    for by, locator in popup_locators:
                        try:
                            popup_button = driver.find_element(by, locator)
                            print(f"Botão 'OK' encontrado usando {by}: {locator}")
                            popup_button.click()
                            print("Popup de erro fechado com sucesso.")
                            time.sleep(2)  # Aguardar após fechar o popup
                            return True
                        except Exception:
                            print(f"Não encontrado usando {by}: {locator}")
                    
                    return False

                # Tentar lidar com popup antes do login
                handle_error_popup()

                # Login
                driver.find_element(By.ID, "login_form:username").clear()
                driver.find_element(By.ID, "login_form:username").send_keys(username)
                driver.find_element(By.ID, "login_form:password").clear()
                driver.find_element(By.ID, "login_form:password").send_keys(password)
                print("Credenciais inseridas na página de login.")
                
                # Aguardar brevemente e tentar novamente lidar com popup
                time.sleep(2)
                handle_error_popup()
                
                # Realizar login
                driver.find_element(By.ID, "login_form:j_idt11").click()
                print("Botão 'Entrar' clicado.")
                
                # Tentar uma última vez lidar com popup após o login
                time.sleep(2)
                handle_error_popup()

            except Exception as login_error:
                print(f"Erro ao tentar fazer login (pode já ter sido feito pela extensão): {login_error}")

        # --- 3. MONITORAMENTO DINÂMICO ---
        print("\nIniciando monitoramento dinâmico...")
        
        # Configurar variáveis de monitoramento
        previous_url = None
        previous_title = None
        monitoring_duration = 300  # 5 minutos de monitoramento
        check_interval = 5  # Verificar a cada 5 segundos
        start_time = time.time()
        
        while time.time() - start_time < monitoring_duration:
            try:
                # Capturar estado atual
                current_url = driver.current_url
                current_title = driver.title
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                # Detectar mudança de URL
                if current_url != previous_url:
                    print(f"[{timestamp}] 🔗 URL ALTERADA: {current_url}")
                    print("\n--- CONTEÚDO DA PÁGINA ---")
                    print(driver.page_source)
                    print("--- FIM DO CONTEÚDO ---\n")
                    previous_url = current_url
                
                # Detectar refresh (mudança de título sem mudança de URL)
                if current_url == previous_url and current_title != previous_title:
                    print(f"[{timestamp}] 🔄 REFRESH DETECTADO")
                    print(f"URL: {current_url}")
                    print(f"Novo Título: {current_title}")
                    previous_title = current_title
                
                # Logs de console do navegador
                browser_logs = driver.get_log('browser')
                if browser_logs:
                    print("\n--- LOGS DO NAVEGADOR ---")
                    for log in browser_logs:
                        print(f"{log['level']}: {log['message']}")
                    print("--- FIM DOS LOGS ---\n")
                
                # Intervalo entre verificações
                time.sleep(check_interval)
            
            except Exception as e:
                print(f"[ERRO NO MONITORAMENTO] {e}")
                break

        print("Monitoramento concluído.")

    except Exception as e:
        print(f"Ocorreu um erro fatal durante a automação: {e}")
    finally:
        if 'driver' in locals() and driver:
            print("Encerrando o WebDriver.")
            driver.quit()
        print("Automação finalizada.")

if __name__ == "__main__":
    run_automation()
