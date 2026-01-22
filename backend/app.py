from flask import Flask, jsonify
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from prometheus_client import CollectorRegistry, multiprocess
from prometheus_client import make_wsgi_app
from werkzeug.middleware.dispatcher import DispatcherMiddleware

REQUESTS = Counter('app_requests_total', 'Total HTTP requests')

app = Flask(__name__)

@app.route('/')
def index():
    REQUESTS.inc()
    return jsonify({"message": "Hello from Flask backend"})

@app.route('/metrics')
def metrics():
    # Use default registry
    data = generate_latest()
    return data, 200, {'Content-Type': CONTENT_TYPE_LATEST}

# Expose metrics at /metrics via WSGI app if desired
# app.wsgi_app = DispatcherMiddleware(app.wsgi_app, {'/metrics': make_wsgi_app()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
