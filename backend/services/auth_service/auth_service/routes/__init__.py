from . import MFA  # noqa: F401
from .profile import profile_bp
from .MFA import mfa_bp  # Add this
from .avatar import avatar_bp
from .register import register_bp
from .health import health_bp
from .metrics import metrics_bp
from .docs import docs_bp
from .onboarding import onboarding_bp

__all__ = [
    "docs_bp", 
    "health_bp", 
    "metrics_bp", 
    "register_bp", 
    "profile_bp", 
    "mfa_bp", 
    "avatar_bp",
    "onboarding_bp"
]


