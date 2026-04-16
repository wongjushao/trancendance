from .docs import docs_bp
from .health import health_bp
from .metrics import metrics_bp
from .register import register_bp
from . import MFA  # noqa: F401


__all__ = ["docs_bp", "health_bp", "metrics_bp", "register_bp"]

