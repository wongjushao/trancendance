from flask import Blueprint
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest


metrics_bp = Blueprint("metrics", __name__)


@metrics_bp.get("/metrics")
def metrics():
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}
