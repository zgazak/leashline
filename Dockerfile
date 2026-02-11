FROM python:3.11-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy workspace structure
COPY pyproject.toml uv.lock ./
COPY engine/ engine/
COPY app/ app/
COPY resources/ resources/
COPY leashline/ leashline/

# Install the app package (resolves workspace deps)
RUN uv pip install ./engine ./resources ./app --system

# Copy config files and certs
COPY resources/src/resources/config/ /app/config/
COPY resources/certs/ /app/certs/

EXPOSE 8000

CMD ["python", "-m", "app.main", "--config", "/app/config/leashline.yaml"]
