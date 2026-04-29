from flask import Response
from flask_restx import Namespace, Resource
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest


metrics_ns = Namespace("metrics", path="/", description="Metrics endpoints")


@metrics_ns.route("/metrics")
class MetricsResource(Resource):
    def get(self):
        return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)
