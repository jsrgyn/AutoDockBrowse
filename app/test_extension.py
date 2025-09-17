import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

def test_extension():
    """
    Script de teste para verificar se a extensão está sendo carregada.
    """
    print("=== TESTE DA EXTENSÃO ===")
    
    # Configuração do Chrome
    chrome_options = Options()
    
    # Caminho da extensão - ajustar para ambiente local ou Docker
    if os.path.exists('./extension'):
        extension_path = os.path.abspath('./extension')
    elif os.path.exists('/app/extension'):
        extension_path = '/app/extension'
    else:
        extension_path = os.path.abspath('./app/extension')
    
    print(f"Caminho da extensão: {extension_path}")
    
    chrome_options.add_argument(f'--load-extension={extension_path}')
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
    chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    
    try:
        print("Iniciando o Chrome...")
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        # Verificar extensões carregadas
        print("\nVerificando extensões carregadas...")
        driver.get("chrome://extensions/")
        time.sleep(2)
        
        # Navegar para a página alvo
        target_url = os.getenv("TARGET_URL", "https://www.hapvida.com.br/corretor/login.faces")
        print(f"\nNavegando para: {target_url}")
        driver.get(target_url)
        time.sleep(3)
        
        # Verificar se o content script foi injetado
        print("\nVerificando se o content script foi injetado...")
        content_script_check = driver.execute_script("""
            // Verificar se as funções do content script existem
            const checks = {
                setValue: typeof setValue === 'function',
                getValue: typeof getValue === 'function', 
                main: typeof main === 'function',
                addEventListener: document.querySelector('[id="copilot-extension-url-container"]') !== null
            };
            
            console.log('Verificação do content script:', checks);
            return checks;
        """)
        
        print(f"Resultado da verificação: {content_script_check}")
        
        # Testar o envio de mensagem
        print("\nTestando comunicação com a extensão...")
        driver.execute_script("""
            console.log('=== TESTE DE COMUNICAÇÃO ===');
            
            // Teste 1: CustomEvent
            document.dispatchEvent(new CustomEvent('GET_POPUP_URL_REQUEST'));
            
            // Teste 2: postMessage
            window.postMessage({
                source: 'selenium-automation',
                action: 'test',
                message: 'Teste de comunicação'
            }, window.location.origin);
            
            console.log('Eventos enviados');
        """)
        
        time.sleep(2)
        
        # Capturar logs do console
        print("\nLogs do console:")
        logs = driver.get_log('browser')
        for log in logs[-20:]:
            if "Extension" in log['message'] or "content script" in log['message'] or "savi.js" in log['message']:
                print(f"  {log['level']}: {log['message']}")
        
        # Verificar se o container foi criado
        container_exists = driver.execute_script("""
            return document.getElementById('copilot-extension-url-container') !== null;
        """)
        
        if container_exists:
            popup_url = driver.execute_script("""
                return document.getElementById('copilot-extension-url-container').textContent;
            """)
            print(f"\nContainer da extensão encontrado! URL: {popup_url}")
        else:
            print("\nContainer da extensão NÃO foi encontrado.")
        
        print("\n=== TESTE CONCLUÍDO ===")
        
        input("Pressione Enter para fechar o navegador...")
        
    except Exception as e:
        print(f"Erro durante o teste: {e}")
    finally:
        if 'driver' in locals():
            driver.quit()

if __name__ == "__main__":
    test_extension()