from flask import Flask
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest


REQUESTS = Counter("chat_requests_total", "Total chat service HTTP requests")


def register_metrics(app: Flask) -> None:
    @app.before_request
    def before_request() -> None:
        REQUESTS.inc()

    @app.get("/metrics")
    def metrics():
        return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}
