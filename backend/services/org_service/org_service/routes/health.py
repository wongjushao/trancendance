from flask import jsonify
from flask_restx import Namespace, Resource

health_ns = Namespace("health", path="/", description="Health check endpoints")


@health_ns.route("/health")
class HealthResource(Resource):
    def get(self):
        return jsonify({"service": "org", "status": "ok"})
