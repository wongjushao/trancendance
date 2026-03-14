from flask import Blueprint, jsonify


health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    return jsonify({"service": "chat", "status": "ok"})
