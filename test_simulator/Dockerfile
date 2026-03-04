# Production-style image for TV Remote web server.
# Build: docker build -t tv-remote .
# Run:   docker run --rm -p 5000:5000 -e TV_REMOTE_SECRET_KEY=... -e TV_REMOTE_API_KEY=... tv-remote

FROM python:3.11-slim

WORKDIR /app

# Install deps (no dev)
COPY pyproject.toml poetry.lock* ./
RUN pip install --no-cache-dir poetry \
    && poetry config virtualenvs.create false \
    && poetry install --no-dev --no-interaction --no-ansi

COPY . .

ENV TV_REMOTE_HOST=0.0.0.0
ENV TV_REMOTE_PORT=5000
ENV PYTHONUNBUFFERED=1

EXPOSE 5000

CMD ["python", "web_server.py"]
