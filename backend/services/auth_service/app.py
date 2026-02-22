import os

from flask import Flask, jsonify, request
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from supabase import create_client


REQUESTS = Counter("auth_requests_total", "Total auth service HTTP requests")


def create_app():
    app = Flask(__name__)

    supabase_url = os.getenv("AUTH_SUPABASE_URL", "")
    supabase_anon_key = os.getenv("AUTH_SUPABASE_ANON_KEY", "")
    supabase = create_client(supabase_url, supabase_anon_key) if supabase_url and supabase_anon_key else None

    @app.before_request
    def before_request():
        REQUESTS.inc()

    @app.get("/health")
    def health():
        return jsonify({"service": "auth", "status": "ok"})

    @app.post("/verify")
    def verify_token():
        if not supabase:
            return jsonify({"error": "Supabase auth is not configured"}), 500

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing Bearer token"}), 401

        token = auth_header.replace("Bearer ", "", 1).strip()
        if not token:
            return jsonify({"error": "Missing Bearer token"}), 401

        try:
            user_response = supabase.auth.get_user(token)
            user = getattr(user_response, "user", None)
            if user is None:
                return jsonify({"error": "Invalid token"}), 401

            return jsonify(
                {
                    "id": user.id,
                    "email": user.email,
                    "role": user.role,
                }
            )
        except Exception as exc:
            return jsonify({"error": str(exc)}), 401

    @app.get("/metrics")
    def metrics():
        return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
