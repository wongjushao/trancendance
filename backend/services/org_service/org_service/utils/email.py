import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from html import escape
from typing import NotRequired, TypedDict
from urllib.parse import urlencode


logger = logging.getLogger(__name__)


class EmailConfigurationError(RuntimeError):
    pass


class EmailDeliveryError(RuntimeError):
    pass


def _env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_host(value: str) -> tuple[str, int]:
    if ":" not in value:
        return value, 587

    host, port = value.rsplit(":", 1)
    try:
        return host, int(port)
    except ValueError as exc:
        raise EmailConfigurationError("GF_SMTP_HOST port must be a number") from exc


def build_org_verification_url(token: str) -> str:
    base_url = os.getenv("ORG_VERIFICATION_URL") or os.getenv("NEXT_PUBLIC_SITE_URL") or "https://localhost"
    return f"{base_url.rstrip('/')}/organizations/verify?token={token}"


def build_org_verification_html(org_name: str, verification_url: str) -> str:
    escaped_org_name = escape(org_name)
    escaped_verification_url = escape(verification_url, quote=True)

    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirm your organization</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f7fb; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7fb; padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg, #2563eb, #1d4ed8); padding:32px 24px; text-align:center;">
                <h1 style="margin:0; font-size:28px; color:#ffffff;">Educatorio</h1>
                <p style="margin:8px 0 0; font-size:14px; color:#dbeafe;">
                  Learning starts with one click
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px;">
                <h2 style="margin:0 0 16px; font-size:24px; color:#111827;">
                  Confirm your organization
                </h2>

                <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#4b5563;">
                  Welcome to <strong>Educatorio</strong>. You have been invited to verify <strong>{escaped_org_name}</strong> as an organization admin.
                </p>

                <p style="margin:0 0 28px; font-size:16px; line-height:1.6; color:#4b5563;">
                  Click the button below to complete the organization verification:
                </p>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px;">
                  <tr>
                    <td align="center" style="border-radius:8px; background-color:#2563eb;">
                      <a
                        href="{escaped_verification_url}"
                        style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;"
                      >
                        Verify Organization
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 12px; font-size:14px; line-height:1.6; color:#6b7280;">
                  If the button does not work, copy and paste this link into your browser:
                </p>

                <p style="margin:0 0 24px; font-size:14px; line-height:1.6; word-break:break-all;">
                  <a href="{escaped_verification_url}" style="color:#2563eb; text-decoration:none;">
                    {escaped_verification_url}
                  </a>
                </p>

                <p style="margin:0; font-size:14px; line-height:1.6; color:#9ca3af;">
                  If you did not expect this invitation from Educatorio, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background-color:#f9fafb; text-align:center; border-top:1px solid #e5e7eb;">
                <p style="margin:0; font-size:13px; color:#9ca3af;">
                  &copy; 2026 Educatorio. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def send_org_verification_email(admin_email: str, org_name: str, verification_url: str) -> None:
    if not _env_flag("GF_SMTP_ENABLED", default=True):
        raise EmailConfigurationError("SMTP is disabled")

    smtp_host = os.getenv("GF_SMTP_HOST")
    from_address = os.getenv("GF_SMTP_FROM_ADDRESS")

    if not smtp_host or not from_address:
        raise EmailConfigurationError("GF_SMTP_HOST and GF_SMTP_FROM_ADDRESS must be configured")

    host, port = _parse_host(smtp_host)
    username = os.getenv("GF_SMTP_USER")
    password = os.getenv("GF_SMTP_PASSWORD")
    from_name = os.getenv("GF_SMTP_FROM_NAME", "Trancendance")
    ehlo_identity = os.getenv("GF_SMTP_EHLO_IDENTITY")
    skip_verify = _env_flag("GF_SMTP_SKIP_VERIFY")
    starttls_policy = os.getenv("GF_SMTP_STARTTLS_POLICY", "OpportunisticStartTLS").lower()

    message = EmailMessage()
    message["Subject"] = f"Verify {org_name} on Trancendance"
    message["From"] = formataddr((from_name, from_address))
    message["To"] = admin_email
    message.set_content(
        "\n".join(
            [
                f"You have been invited to verify {org_name} on Trancendance.",
                "",
                "Open the link below to verify the organization:",
                verification_url,
                "",
                "If you did not expect this email, you can ignore it.",
            ]
        )
    )
    message.add_alternative(build_org_verification_html(org_name, verification_url), subtype="html")

    context = ssl._create_unverified_context() if skip_verify else ssl.create_default_context()
    use_ssl = port == 465

    try:
        if use_ssl:
            smtp = smtplib.SMTP_SSL(host, port, local_hostname=ehlo_identity, timeout=20, context=context)
        else:
            smtp = smtplib.SMTP(host, port, local_hostname=ehlo_identity, timeout=20)

        with smtp:
            if not use_ssl and starttls_policy != "nostarttls":
                smtp.starttls(context=context)
            if username and password:
                smtp.login(username, password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("Failed to send organization verification email") from exc


def build_member_invite_accept_url(raw_token: str) -> str:
    base_url = (
        os.getenv("MEMBER_INVITE_ACCEPT_URL_BASE")
        or os.getenv("NEXT_PUBLIC_SITE_URL")
        or os.getenv("ORG_VERIFICATION_URL")
        or "http://localhost:3000"
    )
    query = urlencode({"token": raw_token})
    return f"{base_url.rstrip('/')}/accept-invite?{query}"


def build_member_invite_register_url(raw_token: str) -> str:
    """New invitees land on register first when they don't have an account yet."""
    base_url = (
        os.getenv("MEMBER_INVITE_ACCEPT_URL_BASE")
        or os.getenv("NEXT_PUBLIC_SITE_URL")
        or os.getenv("ORG_VERIFICATION_URL")
        or "http://localhost:3000"
    )
    query = urlencode({"invite_token": raw_token})
    return f"{base_url.rstrip('/')}/register?{query}"


def _member_role_label(role: str) -> str:
    mapping = {
        "student": "Student",
        "teacher": "Teacher",
        "sub_admin": "Sub-Administrator",
    }
    return mapping.get(role, role.title())


_MEMBER_ROLE_LINES = (
    "- Student — Can view and join courses, submit assignments\n"
    "- Teacher — Can create courses, manage assignments, invite students\n"
    "- Sub-Administrator — Can manage organization, members, and approve requests (cannot demote primary admin)\n"
)


class MemberInviteEmailOutcome(TypedDict):
    """Result of attempting to send a member-invitation email."""

    sent: bool
    """True only when SMTP accepted the message."""

    delivery_mode: str
    """smtp | not_configured | smtp_failed"""

    mock_envelope: NotRequired[dict]
    """Present when sent is False: same content that would have been emailed."""


def deliver_organization_member_invitation_email(
    to_email: str,
    organization_name: str,
    member_role: str,
    inviter_display: str,
    raw_token_for_url: str,
    personal_message: str | None,
) -> MemberInviteEmailOutcome:
    """
    Attempts SMTP delivery using the same settings as verification mail.
    On success returns sent=True (no envelope echoed). Otherwise returns sent=False,
    mock_envelope (dev capture), and delivery_mode not_configured or smtp_failed.
    """
    accept_url = build_member_invite_accept_url(raw_token_for_url)
    register_url = build_member_invite_register_url(raw_token_for_url)
    escaped_org = escape(organization_name)
    role_label = _member_role_label(member_role)

    escaped_inviter = escape(inviter_display)
    escaped_register = escape(register_url)
    escaped_accept = escape(accept_url)
    escaped_role_line = escape(
        "- Student — Can view and join courses, submit assignments\n"
        "- Teacher — Can create courses, manage assignments, invite students\n"
        "- Sub-Administrator — Can manage organization, members, and approve requests (cannot demote primary admin)",
    )

    note_block = ""
    if personal_message and personal_message.strip():
        escaped_note = escape(personal_message.strip())
        note_block = f"""

<p style=\"margin:0 0 16px; font-size:15px; line-height:1.6; color:#4b5563;\">
  <strong>Note from {escaped_inviter}:</strong><br/>
  {escaped_note}
</p>"""

    html = f"""<!DOCTYPE html>
<html lang=\"en\">
  <head><meta charset=\"UTF-8\" /><title>Organization invitation</title></head>
  <body style=\"margin:0; padding:0; background-color:#f4f7fb; font-family:Arial, Helvetica, sans-serif; color:#1f2937;\">
    <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color:#f4f7fb; padding:40px 20px;\">
      <tr><td align=\"center\">
        <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);\">
          <tr><td style=\"background:linear-gradient(135deg, #7c3aed, #2563eb); padding:28px 24px; text-align:center;\">
              <h1 style=\"margin:0; font-size:26px; color:#ffffff;\">You've been invited</h1>
              <p style=\"margin:8px 0 0; font-size:14px; color:#ede9fe;\">Join your organization on Trancendance</p>
          </td></tr>
          <tr><td style=\"padding:36px 32px;\">
              <p style=\"margin:0 0 14px; font-size:17px; line-height:1.6; color:#111827;\"><strong>{escaped_inviter}</strong> invited you to join <strong>{escaped_org}</strong> as <strong>{escape(role_label)}</strong>.</p>
              {note_block}
              <p style=\"margin:0 0 10px; font-size:14px; line-height:1.6; color:#6b7280;\"><strong>What each role can do:</strong></p>
              <p style=\"margin:0 0 22px; font-size:14px; line-height:1.55; color:#4b5563; white-space:pre-line;\">{escaped_role_line}</p>
              <p style=\"margin:0 0 18px; font-size:14px; line-height:1.55; color:#4b5563;\">Don't have an account yet? Register with the invited email below, complete verification if prompted, then you can accept the invitation.</p>
              <table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:0 auto 22px;\"><tr>
                <td align=\"center\" style=\"border-radius:8px; background-color:#7c3aed;\">
                  <a href=\"{escaped_register}\" style=\"display:inline-block; padding:14px 28px; font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;\">Create account &amp; join</a>
                </td>
              </tr></table>
              <p style=\"margin:0 0 10px; font-size:13px; line-height:1.55; color:#6b7280;\">Already have an account?</p>
              <table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:0 auto 22px;\"><tr>
                <td align=\"center\" style=\"border-radius:8px; background:#f4f7fb; border:1px solid #e5e7eb;\"><a href=\"{escaped_accept}\" style=\"display:inline-block; padding:12px 24px; font-size:14px; font-weight:600; color:#4c1d95; text-decoration:none; border-radius:8px;\">Sign in &amp; accept</a></td>
              </tr></table>
              <p style=\"margin:0 0 12px; font-size:13px; line-height:1.6; color:#6b7280;\">Links (copy and paste if needed)</p>
              <p style=\"margin:0 0 12px; font-size:13px; line-height:1.55; word-break:break-all;\"><strong>New user:</strong> <a href=\"{escaped_register}\" style=\"color:#7c3aed; text-decoration:none;\">{escaped_register}</a></p>
              <p style=\"margin:0 0 18px; font-size:13px; line-height:1.55; word-break:break-all;\"><strong>Existing account:</strong> <a href=\"{escaped_accept}\" style=\"color:#7c3aed; text-decoration:none;\">{escaped_accept}</a></p>
              <p style=\"margin:0; font-size:13px; line-height:1.6; color:#9ca3af;\">If you are not already a member of the organization, you'll be added when your account matches this invitation email and you complete acceptance.</p>
          </td></tr>
        </table>
      </td></tr></table>
  </body>
</html>"""

    plaintext_sections = [
        f"{inviter_display} invited you to join {organization_name} as a {role_label}.",
        "",
    ]
    if personal_message and personal_message.strip():
        plaintext_sections.extend(
            [
                f"Personal note:\n{personal_message.strip()}",
                "",
            ]
        )
    plaintext_sections.extend(
        [
            "Role overview:",
            _MEMBER_ROLE_LINES,
            "",
            "If you DON'T HAVE AN ACCOUNT YET — register with this email:",
            register_url,
            "",
            "If YOU ALREADY HAVE AN ACCOUNT — accept (sign in if needed):",
            accept_url,
            "",
            "If you did not expect this invitation you can safely ignore this email.",
        ]
    )

    plaintext = "\n".join(plaintext_sections)
    subject = f"Invitation to join {organization_name}"

    invite_query = urlencode({"invite_token": raw_token_for_url})
    capture = {
        "to": to_email,
        "subject": subject,
        "body": plaintext,
        "link": f"/register?{invite_query}",
        "invite_register_url_absolute": register_url,
        "invite_accept_url_absolute": accept_url,
        "organization_name": organization_name,
        "member_role": member_role,
    }

    smtp_ready = (
        _env_flag("GF_SMTP_ENABLED", default=True)
        and bool(os.getenv("GF_SMTP_HOST"))
        and bool(os.getenv("GF_SMTP_FROM_ADDRESS"))
    )

    if not smtp_ready:
        enabled = _env_flag("GF_SMTP_ENABLED", default=True)
        has_host = bool(os.getenv("GF_SMTP_HOST"))
        has_from = bool(os.getenv("GF_SMTP_FROM_ADDRESS"))
        logger.info(
            "Member invite email not sent (SMTP not ready): GF_SMTP_ENABLED=%s GF_SMTP_HOST_set=%s GF_SMTP_FROM_ADDRESS_set=%s",
            enabled,
            has_host,
            has_from,
        )
        return {
            "sent": False,
            "delivery_mode": "not_configured",
            "mock_envelope": capture,
        }

    host_raw = os.getenv("GF_SMTP_HOST")
    from_address = os.getenv("GF_SMTP_FROM_ADDRESS")
    username = os.getenv("GF_SMTP_USER")
    password = os.getenv("GF_SMTP_PASSWORD")
    from_name = os.getenv("GF_SMTP_FROM_NAME", "Trancendance")
    ehlo_identity = os.getenv("GF_SMTP_EHLO_IDENTITY")
    skip_verify = _env_flag("GF_SMTP_SKIP_VERIFY")
    starttls_policy = os.getenv("GF_SMTP_STARTTLS_POLICY", "OpportunisticStartTLS").lower()

    host, port = _parse_host(host_raw)  # type: ignore[arg-type]

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((from_name, from_address))
    message["To"] = to_email
    message.set_content(plaintext)
    message.add_alternative(html, subtype="html")

    context = ssl._create_unverified_context() if skip_verify else ssl.create_default_context()
    use_ssl = port == 465

    try:
        if use_ssl:
            smtp = smtplib.SMTP_SSL(host, port, local_hostname=ehlo_identity, timeout=20, context=context)
        else:
            smtp = smtplib.SMTP(host, port, local_hostname=ehlo_identity, timeout=20)

        with smtp:
            if not use_ssl and starttls_policy != "nostarttls":
                smtp.starttls(context=context)
            if username and password:
                smtp.login(username, password)
            smtp.send_message(message)
    except (EmailConfigurationError, EmailDeliveryError, OSError, smtplib.SMTPException) as exc:
        logger.warning("Member invite email SMTP failure for %s: %s", to_email, exc, exc_info=True)
        return {"sent": False, "delivery_mode": "smtp_failed", "mock_envelope": capture}
    return {"sent": True, "delivery_mode": "smtp"}
