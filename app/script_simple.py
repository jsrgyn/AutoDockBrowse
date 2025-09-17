import os
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

def run_automation_simple():
    """
    Versão simplificada da automação que define valores diretamente e faz login.
    """
    print("Iniciando a automação simplificada...")

    # --- Configuração do Selenium ---
    chrome_options = Options()
    extension_path = '/app/extension'
    chrome_options.add_argument(f'--load-extension={extension_path}')
    # chrome_options.add_argument("--headless")  # Desabilitado para debug
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920x1080")
    chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

    # --- Inicialização do WebDriver ---
    try:
        print("Configurando o ChromeDriver...")
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        print("WebDriver iniciado com sucesso.")

        # Navegar para a página
        target_url = os.getenv("TARGET_URL")
        print(f"Navegando para: {target_url}")
        driver.get(target_url)
        
        # Aguardar a página carregar
        print("Aguardando carregamento da página...")
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.ID, "login_form:username")))
        
        # Configurar valores via JavaScript
        print("Configurando valores para o processamento...")
        dias_retroceder = os.getenv("Dias_Retroceder", "180")
        dias_processar = os.getenv("Dias_Processar", "1")
        data_fim = datetime.now().strftime('%Y-%m-%d')
        
        # Executar script para configurar storage e iniciar processo
        resultado = driver.execute_script("""
            console.log('=== Iniciando configuração da extensão ===');
            
            // Configurar valores no localStorage como fallback
            localStorage.setItem('diasRetroceder', arguments[0]);
            localStorage.setItem('diasProcessar', arguments[1]);
            localStorage.setItem('dtFimProcessamento', arguments[2]);
            localStorage.setItem('statusProcessamento', '9');
            localStorage.setItem('processamento', 'S');
            localStorage.setItem('fluxo', 'abrir-orcamento');
            
            console.log('Valores configurados no localStorage');
            
            // Tentar chamar a função main se existir
            if (typeof main === 'function') {
                console.log('Chamando função main...');
                main('iniciarAgd', {
                    login: arguments[3],
                    senha: arguments[4]
                });
                return 'Função main executada';
            } else {
                console.log('Função main não encontrada');
                return 'Função main não disponível';
            }
        """, dias_retroceder, dias_processar, data_fim, 
             os.getenv("COD_CONCESSIONARIA"), 
             os.getenv("PW_CONCESSIONARIA"))
        
        print(f"Resultado da configuração: {resultado}")
        
        # Fazer login manualmente se necessário
        print("\nFazendo login...")
        username = os.getenv("COD_CONCESSIONARIA")
        password = os.getenv("PW_CONCESSIONARIA")
        
        try:
            driver.find_element(By.ID, "login_form:username").clear()
            driver.find_element(By.ID, "login_form:username").send_keys(username)
            driver.find_element(By.ID, "login_form:password").clear()
            driver.find_element(By.ID, "login_form:password").send_keys(password)
            driver.find_element(By.ID, "login_form:j_idt11").click()
            print("Login realizado.")
        except Exception as e:
            print(f"Erro ao fazer login: {e}")
        
        # Monitorar por alguns segundos
        print("\nMonitorando por 30 segundos...")
        for i in range(6):
            time.sleep(5)
            print(f"URL atual ({i*5}s): {driver.current_url}")
            
            # Capturar últimos logs
            logs = driver.get_log('browser')
            if logs:
                print("Últimos logs do console:")
                for log in logs[-5:]:
                    print(f"  {log['message']}")
        
        print("Automação simplificada concluída.")

    except Exception as e:
        print(f"Erro durante a automação: {e}")
    finally:
        if 'driver' in locals():
            driver.quit()
        print("Finalizado.")

if __name__ == "__main__":
    run_automation_simple()