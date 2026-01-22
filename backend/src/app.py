from flask import Flask, jsonify
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

REQUESTS = Counter('app_requests_total', 'Total HTTP requests')

def create_app():
    app = Flask(__name__)

    @app.route('/')
    def index():
        REQUESTS.inc()
        return jsonify({"message": "Hello from Flask backend"})

    @app.route('/metrics')
    def metrics():
        return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

    return app

if __name__ == '__main__':
    create_app().run(host='0.0.0.0', port=5000)
