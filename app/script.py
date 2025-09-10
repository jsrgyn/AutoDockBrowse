import os
import time
from selenium import webdriver
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

    # Caminho para a extensão descompactada dentro do container
    extension_path = '/app/extension'
    print(f"Carregando extensão de: {extension_path}")
    chrome_options.add_argument(f'--load-extension={extension_path}')
    
    # Opções essenciais para execução em container Docker
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

        # --- Lógica da Automação ---
        # Pega a URL do .env, com um valor padrão caso não seja encontrada
        target_url = os.getenv("TARGET_URL", "https://www.google.com")
        print(f"Acessando a URL: {target_url}")
        driver.get(target_url)
        time.sleep(5)

        print(f"Título da página: {driver.title}")

        # Adicione sua lógica personalizada aqui

        print("Lógica de automação concluída.")

    except Exception as e:
        print(f"Ocorreu um erro durante a automação: {e}")
    finally:
        if 'driver' in locals() and driver:
            print("Encerrando o WebDriver.")
            driver.quit()
        print("Automação finalizada.")

if __name__ == "__main__":
    run_automation()
