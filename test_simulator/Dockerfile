# syntax=docker/dockerfile:1
# Production-style image for the TV Remote web server (web_server.py).
# Build: docker build -t tv-remote test_simulator
# Run:   docker run --rm -p 5000:5000 -e TV_REMOTE_SECRET_KEY=... -e TV_REMOTE_API_KEY=... tv-remote

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    TV_REMOTE_HOST=0.0.0.0 \
    TV_REMOTE_PORT=5000

WORKDIR /app

# Runtime deps only. pygame is needed by the desktop simulator (main.py /
# virtual_tv.py), not by the web server, so it is excluded from the image.
COPY requirements.txt ./
RUN grep -viE '^(pygame|pywin32)' requirements.txt > /tmp/requirements.web.txt \
    && pip install -r /tmp/requirements.web.txt \
    && rm /tmp/requirements.web.txt

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin app

COPY --chown=app:app . .

USER app

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/api/health' % os.environ.get('TV_REMOTE_PORT', '5000'), timeout=4)" || exit 1

CMD ["python", "web_server.py"]
