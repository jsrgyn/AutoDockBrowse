import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

def test_chrome_basic():
    """
    Teste básico do Chrome sem extensão para verificar se está funcionando.
    """
    print("=== TESTE BÁSICO DO CHROME ===")
    
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920x1080")
    chrome_options.add_argument(f"--user-data-dir=/tmp/chrome-data-test-{os.getpid()}")
    
    try:
        print("Iniciando o Chrome...")
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        print("Chrome iniciado com sucesso!")
        
        print("Navegando para Google...")
        driver.get("https://www.google.com")
        print(f"Título da página: {driver.title}")
        print(f"URL atual: {driver.current_url}")
        
        print("\nTeste básico concluído com sucesso!")
        
    except Exception as e:
        print(f"Erro durante o teste: {e}")
    finally:
        if 'driver' in locals():
            driver.quit()
            print("Chrome fechado.")

if __name__ == "__main__":
    test_chrome_basic()