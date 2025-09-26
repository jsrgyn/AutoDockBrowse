import os
import requests
import time
import logging
import tempfile
import uuid
import shutil
import socket
from base64 import b64encode
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# === Configuração do Logger ===
logger = logging.getLogger("AutoDock")
logger.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s", "%Y-%m-%d %H:%M:%S")
console_handler.setFormatter(formatter)

if not logger.hasHandlers():
    logger.addHandler(console_handler)

# === Função para encontrar porta livre ===
def find_free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()
    return port

# === Classe Principal ===
class BrowserSession:
    def __init__(self, extension_path, max_attempts=3):
        self.extension_path = extension_path
        self.driver = None
        self.current_url = ""
        self.max_attempts = max_attempts
        self.user_data_dir = None
        self.remote_debugging_port = find_free_port()
        logger.info(f"📁 Porta de debug escolhida: {self.remote_debugging_port}")

    def _make_user_dir(self):
        self.user_data_dir = tempfile.mkdtemp(prefix=f"chrome_profile_{os.getpid()}_{uuid.uuid4().hex}_")
        logger.info(f"📁 Criando perfil Chrome em: {self.user_data_dir}")

    def _remove_possible_locks(self):
        if not self.user_data_dir or not os.path.exists(self.user_data_dir):
            return
        candidates = [
            os.path.join(self.user_data_dir, "SingletonLock"),
            os.path.join(self.user_data_dir, "SingletonCookie"),
            os.path.join(self.user_data_dir, "LOCK"),
        ]
        for c in candidates:
            if os.path.exists(c):
                try:
                    os.remove(c)
                    logger.warning(f"⚠️ Lock removido: {c}")
                except Exception as e:
                    logger.warning(f"⚠️ Erro ao remover lock {c}: {e}")

    def configurar_chrome(self):
        chrome_options = Options()
        chrome_options.add_argument(f"--load-extension={self.extension_path}")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_argument(f"--user-data-dir={self.user_data_dir}")
        chrome_options.add_argument(f"--remote-debugging-port={self.remote_debugging_port}")
        chrome_options.add_argument("--no-first-run")
        chrome_options.add_argument("--no-default-browser-check")
        chrome_options.add_experimental_option('prefs', {
            'intl.accept_languages': 'pt-BR',
            'profile.default_content_settings.popups': 0
        })
        chrome_options.add_argument("--disable-extensions-except=" + self.extension_path)
        chrome_options.add_experimental_option('excludeSwitches', ['enable-automation', 'enable-logging'])
        return chrome_options

    def iniciar_navegador(self):
        last_exc = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                self._make_user_dir()
                self._remove_possible_locks()

                service = Service(ChromeDriverManager().install(), log_path="/tmp/chromedriver.log")
                self.driver = webdriver.Chrome(service=service, options=self.configurar_chrome())
                self.driver.set_page_load_timeout(30)
                self.driver.implicitly_wait(10)

                logger.info("✅ Chrome iniciado com extensão SAVI")
                return True

            except Exception as e:
                last_exc = e
                logger.error(f"❌ Erro ao iniciar navegador (tentativa {attempt}): {e}")
                if "user data directory is already in use" in str(e).lower():
                    shutil.rmtree(self.user_data_dir, ignore_errors=True)
                    time.sleep(1)
                    continue
                break

        logger.error(f"❌ Falha após {self.max_attempts} tentativas. Último erro: {last_exc}")
        return False

    def acessar_site(self, url):
        try:
            logger.info(f"🌐 Acessando URL: {url}")
            self.driver.get(url)
            self.current_url = self.driver.current_url
            WebDriverWait(self.driver, 15).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            logger.info(f"✅ Site carregado: {self.current_url}")
            return True
        except Exception as e:
            logger.error(f"❌ Erro ao acessar site: {e}")
            return False



    def preencher_formulario_login(self):
        try:
            cpf = os.getenv("usr_cpf")
            senha = os.getenv("pw_savi_atd")
            if not cpf or not senha:
                logger.error("❌ Credenciais não encontradas")
                return False

            logger.info("🔑 Preenchendo formulário")
            cpf_input = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.ID, "login_form:username"))
            )
            cpf_input.clear()
            cpf_input.send_keys(cpf)

            senha_input = self.driver.find_element(By.ID, "login_form:password")
            senha_input.clear()
            senha_input.send_keys(senha)

            # --- NOVA LÓGICA PARA RESOLVER O CAPTCHA ---
            try:
                captcha_input = self.driver.find_element(By.ID, "login_form:codigo_captcha")
                logger.info("🕵️‍♂️ Captcha detectado - Iniciando resolução...")

                # 1. Encontrar o elemento da imagem do CAPTCHA (ajuste o seletor conforme necessário)
                captcha_image = self.driver.find_element(By.XPATH, "//img[contains(@src, 'captcha') or contains(@id, 'captcha')]")
                captcha_image.screenshot("captcha.png")  # Tira um screenshot da imagem

                # 2. Usar um serviço para resolver o CAPTCHA (exemplo com 2Captcha)
                api_key = "SUA_CHAVE_API_2CAPTCHA"
                with open("captcha.png", "rb") as image_file:
                    encoded_image = b64encode(image_file.read()).decode('utf-8')

                # Enviar a imagem para a API
                response = requests.post(
                    url='https://2captcha.com/in.php',
                    data={
                        'key': api_key,
                        'method': 'base64',
                        'body': encoded_image,
                        'json': 1
                    }
                ).json()

                if response['status'] != 1:
                    logger.error(f"❌ Erro ao enviar CAPTCHA: {response.get('request')}")
                    return False

                task_id = response['request']
                # Aguardar a resolução
                for _ in range(30):  # Tenta por até 30 segundos
                    time.sleep(1)
                    result = requests.get(
                        url=f'https://2captcha.com/res.php?key={api_key}&action=get&id={task_id}&json=1'
                    ).json()
                    if result['status'] == 1:
                        captcha_solution = result['request']
                        break
                else:
                    logger.error("❌ Tempo esgotado aguardando resolução do CAPTCHA")
                    return False

                # 3. Preencher o campo com a solução
                captcha_input.clear()
                captcha_input.send_keys(captcha_solution)
                logger.info("✅ CAPTCHA resolvido com sucesso.")

            except Exception as e:
                logger.error(f"❌ Erro durante a resolução do CAPTCHA: {e}")
                return False
            # --- FIM DA NOVA LÓGICA ---

            self.driver.find_element(By.ID, "login_form:j_idt24").click()
            time.sleep(3)

            if self.driver.current_url != self.current_url:
                logger.info("🔐 Login realizado")
            return True
        
        except Exception as e:
            logger.error(f"❌ Erro no login: {e}")
            return False

    def fechar_navegador(self):
        if self.driver:
            try:
                self.driver.quit()
                logger.info("✅ Navegador fechado")
            except Exception as e:
                logger.error(f"❌ Erro ao fechar navegador: {e}")
        if self.user_data_dir:
            shutil.rmtree(self.user_data_dir, ignore_errors=True)

# === Funções Auxiliares ===
def verificar_extensao_savi():
    ext_path = "/app/extension"
    if not os.path.exists(ext_path):
        logger.error(f"❌ Extensão não encontrada: {ext_path}")
        return False
    return True

# === Função Principal ===
def main():
    logger.info("🚀 Iniciando automação")
    if not verificar_extensao_savi():
        return

    target_url = os.getenv("TARGET_URL")
    if not target_url:
        logger.error("❌ TARGET_URL não definida")
        return

    session = BrowserSession("/app/extension")
    try:
        if not session.iniciar_navegador():
            return
        if not session.acessar_site(target_url):
            return
        if not session.preencher_formulario_login():
            return
        time.sleep(10)
    finally:
        session.fechar_navegador()

if __name__ == "__main__":
    main()