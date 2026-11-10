# docker build -t signova-inference backend/inference
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8080
WORKDIR /srv
COPY pyproject.toml ./
COPY app app
COPY gunicorn.conf.py ./
RUN pip install --no-cache-dir .
USER nobody
EXPOSE 8080
CMD ["gunicorn", "app:create_app()", "-c", "gunicorn.conf.py"]
