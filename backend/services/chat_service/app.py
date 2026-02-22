import os

from flask import Flask, jsonify, request
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from supabase import create_client


REQUESTS = Counter("chat_requests_total", "Total chat service HTTP requests")


def is_valid_supabase_config(url: str, key: str) -> bool:
    if not url or not key:
        return False
    if "your-project-ref.supabase.co" in url:
        return False
    if key in {"your-service-role-key", "your-anon-key"}:
        return False
    return True


def create_app():
    app = Flask(__name__)

    supabase_url = os.getenv("CHAT_SUPABASE_URL", "")
    service_role_key = os.getenv("CHAT_SUPABASE_SERVICE_ROLE_KEY", "")
    chat_table = os.getenv("CHAT_TABLE", "chat_messages")
    supabase = create_client(supabase_url, service_role_key) if is_valid_supabase_config(supabase_url, service_role_key) else None

    @app.before_request
    def before_request():
        REQUESTS.inc()

    @app.get("/health")
    def health():
        return jsonify({"service": "chat", "status": "ok"})

    @app.get("/messages")
    def list_messages():
        if not supabase:
            return jsonify({"error": "Supabase chat store is not configured. Set valid CHAT_SUPABASE_URL and CHAT_SUPABASE_SERVICE_ROLE_KEY"}), 503

        try:
            response = supabase.table(chat_table).select("*").order("created_at", desc=False).limit(100).execute()
            return jsonify(response.data or [])
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.post("/messages")
    def create_message():
        if not supabase:
            return jsonify({"error": "Supabase chat store is not configured. Set valid CHAT_SUPABASE_URL and CHAT_SUPABASE_SERVICE_ROLE_KEY"}), 503

        payload = request.get_json(silent=True) or {}
        text = payload.get("text")
        author = payload.get("author")

        if not text or not author:
            return jsonify({"error": "Fields 'author' and 'text' are required"}), 400

        record = {
            "author": author,
            "text": text,
        }

        try:
            response = supabase.table(chat_table).insert(record).execute()
            return jsonify(response.data or []), 201
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.get("/metrics")
    def metrics():
        return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)
