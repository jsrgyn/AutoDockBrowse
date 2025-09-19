# Etapa 1: Builder (para dependências Python)
FROM python:3.9-slim-bullseye AS builder

# Evita arquivos pyc e força saída no stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /install

# Copia requirements.txt se existir e instala dependências
COPY ./app/requirements.txt ./requirements.txt
RUN if [ -f "requirements.txt" ]; then pip install --prefix=/install -r requirements.txt; fi


# Etapa 2: Imagem final
FROM python:3.9-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    HOME=/home/chrome

# Instala dependências do sistema
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
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Instala Chrome
RUN wget -q -O /tmp/linux_signing_key.pub https://dl-ssl.google.com/linux/linux_signing_key.pub \
    && apt-key add /tmp/linux_signing_key.pub \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/linux_signing_key.pub

# Cria usuário não-root e pastas necessárias
RUN mkdir -p /app /home/chrome \
    && groupadd -r chrome \
    && useradd -r -g chrome -G audio,video chrome \
    && chown -R chrome:chrome /home/chrome /app

# Copia dependências Python da etapa builder
COPY --from=builder /install /usr/local

# Copia código da aplicação
WORKDIR /app
COPY app/ .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Usa usuário não-root
USER chrome

# Entrypoint e comando padrão
ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "script.py"]