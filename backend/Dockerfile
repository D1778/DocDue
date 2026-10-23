# Backend image for Render. Match the first line to your own "python --version" (major.minor).
FROM python:3.14-slim

# Tesseract is a program, not a Python package, so the image has to contain it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install the libraries first. Docker reuses this step when only your code changed.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Do not run the server as root
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

# Render tells the server which port to use through the PORT variable (10000 by default)
EXPOSE 10000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers --forwarded-allow-ips='*'"]