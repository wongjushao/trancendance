from .account import account_ns
from .auth import auth_ns
from .avatar import avatar_ns
from .docs import AUTH_API_DESCRIPTION, AUTH_API_TITLE, AUTH_API_VERSION, AUTH_DOC_PATH
from .health import health_ns
from .metadata import metadata_ns
from .metrics import metrics_ns
from .MFA import mfa_ns
from .onboarding import onboarding_ns
from .profile import profile_ns
from .register import register_ns

__all__ = [
    "AUTH_API_DESCRIPTION",
    "AUTH_API_TITLE",
    "AUTH_API_VERSION",
    "AUTH_DOC_PATH",
    "account_ns",
    "auth_ns",
    "avatar_ns",
    "health_ns",
    "metadata_ns",
    "metrics_ns",
    "mfa_ns",
    "onboarding_ns",
    "profile_ns",
    "register_ns",
]

