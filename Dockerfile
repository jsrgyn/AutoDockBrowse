FROM python:3.9-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV DEBIAN_FRONTEND=noninteractive

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
    && rm -rf /var/lib/apt/lists/*

# instalar chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# cria usuário não-root opcional
RUN mkdir -p /app /home/chrome \
    && groupadd -r chrome \
    && useradd -r -g chrome -G audio,video chrome \
    && chown -R chrome:chrome /home/chrome /app

WORKDIR /app
COPY --from=builder /install /usr/local
COPY app/ .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER chrome
ENV HOME=/home/chrome
ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "script.py"]