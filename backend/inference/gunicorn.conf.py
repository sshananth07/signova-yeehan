"""Gunicorn settings for Cloud Run. Run: gunicorn "app:create_app()" -c gunicorn.conf.py"""
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"
workers = 1  # one model copy per instance; scale with Cloud Run instances, not workers
threads = 4
timeout = 30

# Access log WITHOUT request bodies or query strings: only method, path, status, latency (plan 03 Task 4.2).
accesslog = "-"
access_log_format = '{"method":"%(m)s","path":"%(U)s","status":%(s)s,"latency_us":%(D)s}'
errorlog = "-"
