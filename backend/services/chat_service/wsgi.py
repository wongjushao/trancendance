# backend/services/chat_service/wsgi.py
import eventlet
eventlet.monkey_patch()

from backend.services.chat_service.app import app, socketio

# Gunicorn entrypoint
application = app

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5002, debug=False)