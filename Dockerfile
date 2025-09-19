# Etapa 1: Builder (se precisar instalar dependências Python ou compilar algo)
FROM python:3.9-slim-bullseye AS builder

# Evita arquivos pyc e força saída no stdout
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV DEBIAN_FRONTEND=noninteractive

# Instala dependências Python se houver requirements.txt
WORKDIR /install
# Opcional, se você tiver
COPY ./app/requirements.txt .  
RUN pip install --prefix=/install -r requirements.txt || true


# Etapa 2: Imagem final
FROM python:3.9-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV DEBIAN_FRONTEND=noninteractive
ENV HOME=/home/chrome

# Instala dependências do sistema + Chrome
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    xvfb \
    x11-utils \
    fonts-liberation \
    libgtk-3-0 \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libdbus-1-3 \
    libexpat1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libnss3 \
    libgconf-2-4 \
    libfontconfig1 \
    libu2f-udev \
    libvulkan1 \
    

# instalar chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \    
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# cria usuário não-root e pastas necessárias
RUN mkdir -p /app /home/chrome \
    && groupadd -r chrome \
    && useradd -r -g chrome -G audio,video chrome \
    && chown -R chrome:chrome /home/chrome /app

# Copia código da aplicação
WORKDIR /app
COPY --from=builder /install /usr/local
COPY app/ .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Usuário não-root
USER chrome

ENV HOME=/home/chrome

# Entrypoint e comando padrão
ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "script.py"]