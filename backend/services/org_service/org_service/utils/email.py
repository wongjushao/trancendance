import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from html import escape


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
