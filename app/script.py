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

    # --- Configuração do Selenium ---
    chrome_options = Options()
    extension_path = '/app/extension'
    chrome_options.add_argument(f'--load-extension={extension_path}')
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920x1080")

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
            time.sleep(3)

            # Passo 2: Despachar um evento customizado para o content script
            print("Despachando evento 'GET_POPUP_URL_REQUEST' para o content script (savi.js)...")
            js_event_script = "document.dispatchEvent(new CustomEvent('GET_POPUP_URL_REQUEST'));"
            driver.execute_script(js_event_script)
            
            # Passo 3: Esperar e obter a URL do elemento injetado no DOM
            popup_url = None
            print("Aguardando resposta do content script no DOM...")
            for i in range(5): # Tenta por 5 segundos
                try:
                    container = driver.find_element(By.ID, 'copilot-extension-url-container')
                    popup_url = container.text
                    if popup_url:
                        break
                except:
                    time.sleep(1)
            
            if not popup_url:
                 raise Exception("Não foi possível obter a URL da extensão via CustomEvent.")

            print(f"URL do popup obtida com sucesso: {popup_url}")

            # Passo 4: Abrir o popup em uma nova aba e preencher
            driver.execute_script("window.open(arguments[0]);", popup_url)
            driver.switch_to.window(driver.window_handles[1])
            time.sleep(2)

            dias_retroceder = os.getenv("DIAS_RETROCEDER")
            dias_processar = os.getenv("DIAS_PROCESSAR")
            data_fim = datetime.now().strftime('%Y-%m-%d')

            driver.find_element(By.ID, "diasRetroceder").send_keys(dias_retroceder)
            driver.find_element(By.ID, "diasProcessar").send_keys(dias_processar)
            Select(driver.find_element(By.ID, "statusProcessamento")).select_by_value("9")
            driver.find_element(By.ID, "dtFimProcessamento").send_keys(data_fim)
            
            print("Campos da extensão preenchidos.")
            driver.find_element(By.ID, "btnIniciarAgd").click()
            print("Botão 'Iniciar' da extensão clicado.")
            time.sleep(2)

            driver.close()
            driver.switch_to.window(driver.window_handles[0])
            print("Interação com a extensão concluída.")

        except Exception as ext_error:
            print(f"AVISO: Não foi possível interagir com a extensão. Erro: {ext_error}")
            print("Continuando para a etapa de login...")

        # --- 2. LÓGICA DE LOGIN NA PÁGINA ---
        print("Prosseguindo com o login...")
        username = os.getenv("COD_CONCESSIONARIA")
        password = os.getenv("PW_CONCESSIONARIA")

        if not username or not password:
            print("Erro: Credenciais não encontradas no .env")
        else:
            try:
                driver.find_element(By.ID, "login_form:username").clear()
                driver.find_element(By.ID, "login_form:username").send_keys(username)
                driver.find_element(By.ID, "login_form:password").clear()
                driver.find_element(By.ID, "login_form:password").send_keys(password)
                print("Credenciais inseridas na página de login.")
                driver.find_element(By.ID, "login_form:j_idt11").click()
                print("Botão 'Entrar' clicado.")
            except Exception as login_error:
                print(f"Erro ao tentar fazer login (pode já ter sido feito pela extensão): {login_error}")

        # --- 3. MONITORAMENTO PÓS-LOGIN ---
        print("\nIniciando monitoramento pós-login...")
        num_monitoramentos = 10
        intervalo_segundos = 15
        
        for i in range(num_monitoramentos):
            print(f"\n--- Monitoramento #{i+1}/{num_monitoramentos} ---")
            print(f"Aguardando {intervalo_segundos} segundos...")
            time.sleep(intervalo_segundos)
            
            print(f"URL atual: {driver.current_url}")
            print(f"Título da página: {driver.title}")
            
            print("\n--- CONTEÚDO DA PÁGINA ---")
            print(driver.page_source)
            print("--- FIM DO CONTEÚDO ---\n")

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
