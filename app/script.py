import os
import time
import logging
import tempfile
import uuid
import shutil
import socket
import subprocess
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# logging já configurado no seu arquivo

def find_free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()
    return port

class BrowserSession:
    def __init__(self, extension_path, max_attempts=3):
        self.extension_path = extension_path
        self.driver = None
        self.current_url = ""
        self.max_attempts = max_attempts
        self.user_data_dir = None
        self.remote_debugging_port = find_free_port()
        logger.info(f"📁 remote_debugging_port escolhido: {self.remote_debugging_port}")

    def _make_user_dir(self):
        # cria um dir único para cada tentativa
        self.user_data_dir = tempfile.mkdtemp(prefix=f"chrome_profile_{os.getpid()}_{uuid.uuid4().hex}_")
        logger.info(f"📁 Criando perfil Chrome em: {self.user_data_dir}")

    def _remove_possible_locks(self):
        # tenta identificar e remover arquivos de lock deixados por runs anteriores,
        # mas apenas no nosso user_data_dir (nunca varrer /).
        try:
            if not self.user_data_dir or not os.path.exists(self.user_data_dir):
                return
            # padrões comuns
            candidates = [
                os.path.join(self.user_data_dir, "SingletonLock"),
                os.path.join(self.user_data_dir, "SingletonCookie"),
                os.path.join(self.user_data_dir, "LOCK"),
            ]
            for c in candidates:
                if os.path.exists(c):
                    logger.warning(f"⚠️ Lock encontrado e removido: {c}")
                    try:
                        os.remove(c)
                    except Exception as e:
                        logger.warning(f"⚠️ Falha ao remover lock {c}: {e}")
        except Exception as e:
            logger.warning(f"⚠️ Erro ao verificar locks: {e}")

    def configurar_chrome(self):
        chrome_options = Options()
        # carregar extensão unpacked
        chrome_options.add_argument(f"--load-extension={self.extension_path}")

        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")

        # user-data-dir (único)
        chrome_options.add_argument(f"--user-data-dir={self.user_data_dir}")

        # porta válida (não use 0)
        chrome_options.add_argument(f"--remote-debugging-port={self.remote_debugging_port}")

        chrome_options.add_argument("--no-first-run")
        chrome_options.add_argument("--no-default-browser-check")
        chrome_options.add_argument("--disable-background-timer-throttling")
        chrome_options.add_argument("--disable-backgrounding-occluded-windows")
        chrome_options.add_argument("--disable-renderer-backgrounding")

        chrome_options.add_experimental_option('prefs', {
            'intl.accept_languages': 'pt-BR',
            'profile.default_content_settings.popups': 0
        })

        chrome_options.add_argument("--disable-extensions-except=" + self.extension_path)
        chrome_options.add_experimental_option('excludeSwitches', ['enable-automation', 'enable-logging'])

        return chrome_options

    def iniciar_navegador(self):
        """Tenta iniciar o Chrome com retries se o profile estiver em uso."""
        last_exc = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                self._make_user_dir()
                # remover locks se houver
                self._remove_possible_locks()

                chrome_options = self.configurar_chrome()

                service = Service(ChromeDriverManager().install(), log_path="/tmp/chromedriver.log")
                logger.info(f"🔧 Iniciando chromedriver (tentativa {attempt}) - logs em /tmp/chromedriver.log")

                self.driver = webdriver.Chrome(service=service, options=chrome_options)
                self.driver.set_page_load_timeout(30)
                self.driver.implicitly_wait(10)

                logger.info("✅ Navegador Chrome iniciado com extensão SAVI")
                logger.info(f"📁 Usando perfil em: {self.user_data_dir}")
                return True

            except Exception as e:
                last_exc = e
                msg = str(e).lower()
                logger.error(f"❌ Erro ao iniciar navegador (tentativa {attempt}): {e}")

                # se é conflito de 'user data dir already in use', tenta com novo dir
                if "user data directory is already in use" in msg or "session not created" in msg:
                    logger.warning("⚠️ Conflito de user-data-dir detectado — tentarei com outro diretório")
                    try:
                        shutil.rmtree(self.user_data_dir, ignore_errors=True)
                        time.sleep(0.5)
                    except Exception as cleanup_error:
                        logger.warning(f"⚠️ Falha ao remover user_data_dir problemático: {cleanup_error}")
                    continue  # next attempt

                # outro tipo de erro: não faz retry
                break

        logger.error(f"❌ Não foi possível iniciar o navegador após {self.max_attempts} tentativas. Último erro: {last_exc}")
        # cleanup final
        try:
            if self.user_data_dir:
                shutil.rmtree(self.user_data_dir, ignore_errors=True)
        except Exception:
            pass
        return False
    
    # restante dos métodos inalterados (acessar_site, preencher_formulario_login, fechar_navegador)
    def acessar_site(self, url):
        """Acessa o site alvo e monitora mudanças de URL."""
        try:
            logger.info(f"🌐 Acessando URL: {url}")
            self.driver.get(url)
            self.current_url = self.driver.current_url
            time.sleep(3)
            
            # Aguardar até que a página esteja carregada
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            logger.info(f"✅ Site carregado: {self.current_url}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao acessar site: {e}")
            return False

    def monitorar_mudancas_url(self):
        """Monitora mudanças na URL e faz log quando detectadas."""
        nova_url = self.driver.current_url
        
        if nova_url != self.current_url:
            logger.info(f"🔄 URL modificada: {self.current_url} -> {nova_url}")
            self.current_url = nova_url
            return True
            
        return False

    def preencher_formulario_login(self):
        """Preenche o formulário de login com as credenciais."""
        try:
            # Obter credenciais do ambiente
            cpf = os.getenv("usr_cpf")
            senha = os.getenv("pw_savi_atd")
            
            if not cpf or not senha:
                logger.error("❌ Credenciais não encontradas nas variáveis de ambiente")
                return False
            
            logger.info("🔑 Preenchendo formulário de login")
            
            # Preencher campo CPF
            cpf_input = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.ID, "login_form:username"))
            )
            cpf_input.clear()
            cpf_input.send_keys(cpf)
            logger.info(f"✅ CPF preenchido: {cpf}")
            
            # Preencher campo senha
            senha_input = self.driver.find_element(By.ID, "login_form:password")
            senha_input.clear()
            senha_input.send_keys(senha)
            logger.info("✅ Senha preenchida")
            
            # Resolver captcha (assumindo que o valor já está visível na página)
            try:
                captcha_input = self.driver.find_element(By.ID, "login_form:codigo_captcha")
                # Aqui você precisaria implementar a lógica para resolver o captcha
                # Como não foi especificado como resolver, vamos apenas logar
                logger.info("⚠️  Campo de captcha detectado - necessário implementar solução")
            except Exception as e:
                logger.info(f"ℹ️  Campo de captcha não encontrado: {e}")
            
            # Clicar no botão de login
            login_button = self.driver.find_element(By.ID, "login_form:j_idt24")
            login_button.click()
            logger.info("✅ Botão de login clicado")
            
            # Aguardar possível redirecionamento
            time.sleep(3)
            
            # Verificar se houve mudança na URL após o login
            if self.monitorar_mudancas_url():
                logger.info("🔐 Processo de login realizado")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao preencher formulário de login: {e}")
            return False

    def fechar_navegador(self):
        """Fecha o navegador e limpa recursos."""
        if self.driver:
            try:
                self.driver.quit()
                logger.info("✅ Navegador fechado")
            except Exception as e:
                logger.error(f"❌ Erro ao fechar navegador: {e}")
        
        # Limpar diretório temporário
        try:
            shutil.rmtree(self.user_data_dir, ignore_errors=True)
            logger.info(f"🗑️  Diretório temporário removido: {self.user_data_dir}")
        except Exception as e:
            logger.warning(f"⚠️  Não foi possível remover diretório temporário: {e}")

def verificar_extensao_savi():
    """Verifica se o diretório da extensão SAVI existe."""
    extension_path = '/app/extension'
    
    if not os.path.exists(extension_path):
        logger.error(f"❌ Diretório da extensão não encontrado: {extension_path}")
        # Listar conteúdo do diretório /app para diagnóstico
        if os.path.exists('/app'):
            logger.info(f"📁 Conteúdo de /app: {os.listdir('/app')}")
        return False
        
    logger.info(f"✅ Extensão SAVI encontrada em: {extension_path}")
    logger.info(f"📄 Arquivos da extensão: {os.listdir(extension_path)}")
    return True

def main():
    """Função principal para executar o processo de automação."""
    logger.info("🚀 Iniciando processo de automação")
    
    # Verificar se a extensão SAVI está disponível
    if not verificar_extensao_savi():
        return
    
    # Obter URL alvo do ambiente
    target_url = os.getenv("TARGET_URL")
    if not target_url:
        logger.error("❌ URL alvo não definida no ambiente")
        return
    
    logger.info(f"🎯 URL alvo: {target_url}")
    
    # Iniciar sessão do navegador
    session = BrowserSession('/app/extension')
    
    try:
        # Iniciar navegador com extensão SAVI
        if not session.iniciar_navegador():
            return
        
        # Acessar site alvo
        if not session.acessar_site(target_url):
            return
        
        # Preencher formulário de login
        if not session.preencher_formulario_login():
            return
        
        logger.info("✅ Processo de automação concluído com sucesso")
        
        # Manter o navegador aberto por um tempo para visualização
        time.sleep(10)
        
    except Exception as e:
        logger.error(f"❌ Erro durante a execução: {e}")
    finally:
        # Fechar navegador
        session.fechar_navegador()

if __name__ == "__main__":
    main()