import smtplib
import random
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = os.getenv("MAIL_USERNAME", "geevinrv19@gmail.com")
SMTP_PASS = os.getenv("MAIL_PASSWORD", "ajyxagossubtrdsq")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "geevinr18@gmail.com")
SENDER_NAME = "AeroAuth"


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


def _send(to: str, subject: str, html: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((SENDER_NAME, SMTP_USER))
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.starttls()
        s.login(SMTP_USER, SMTP_PASS)
        s.sendmail(SMTP_USER, to, msg.as_string())


def send_otp_email(to: str, otp: str, username: str):
    html = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2463eb,#06d6f5);padding:28px 32px;text-align:center;">
            <span style="font-size:28px;">&#9889;</span>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;letter-spacing:1px;">AeroAuth</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111827;font-size:20px;margin:0 0 12px;">Verify your email address</h2>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Hi <b>{username}</b>, thanks for signing up. Use the code below to verify your account.
            </p>
            <div style="background:#f0f7ff;border:2px solid #2463eb;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
              <p style="margin:0 0 6px;color:#6b7280;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Your OTP Code</p>
              <span style="font-size:42px;font-weight:800;letter-spacing:14px;color:#2463eb;">{otp}</span>
            </div>
            <p style="color:#6b7280;font-size:13px;margin:0;">
              This code expires in <b>10 minutes</b>. Do not share it with anyone.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; 2025 AeroAuth. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    _send(to, "Verify your AeroAuth account", html)


def send_reset_email(to: str, otp: str, username: str):
    html = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#2463eb,#06d6f5);padding:28px 32px;text-align:center;">
            <span style="font-size:28px;">&#9889;</span>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;letter-spacing:1px;">AeroAuth</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111827;font-size:20px;margin:0 0 12px;">Reset your password</h2>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Hi <b>{username}</b>, we received a request to reset your password. Use the code below.
            </p>
            <div style="background:#f0f7ff;border:2px solid #2463eb;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
              <p style="margin:0 0 6px;color:#6b7280;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Reset Code</p>
              <span style="font-size:42px;font-weight:800;letter-spacing:14px;color:#2463eb;">{otp}</span>
            </div>
            <p style="color:#6b7280;font-size:13px;margin:0;">
              This code expires in <b>10 minutes</b>. If you did not request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; 2025 AeroAuth. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    _send(to, "AeroAuth password reset code", html)


def send_admin_new_user(username: str, email: str, plain_password: str, otp: str, purpose: str = ""):
    purpose_row = f"<tr><td style='padding:8px 12px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;'>Purpose</td><td style='padding:8px 12px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;'>{purpose or 'Not specified'}</td></tr>"
    html = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#111827,#1e3a8a);padding:28px 32px;">
            <span style="font-size:24px;">&#9889;</span>
            <h1 style="margin:6px 0 0;color:#ffffff;font-size:20px;letter-spacing:1px;">AeroAuth Admin</h1>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">New user registration alert</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111827;font-size:18px;margin:0 0 20px;">&#128100; New Account Created</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#f9fafb;">
                <td style="padding:8px 12px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;">Username</td>
                <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">{username}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;">Email</td>
                <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">{email}</td>
              </tr>
              {purpose_row}
            </table>

            <!-- Sensitive box -->
            <div style="background:#fef9ec;border:1.5px solid #f59e0b;border-radius:10px;padding:20px;margin-bottom:16px;">
              <p style="margin:0 0 14px;color:#92400e;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">&#128274; Credentials (Admin Only)</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#6b7280;font-size:13px;padding:4px 0;width:120px;">Plain Password</td>
                  <td style="font-size:14px;font-weight:700;color:#111827;font-family:monospace;background:#fff;padding:4px 10px;border-radius:6px;border:1px solid #e5e7eb;">{plain_password}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:13px;padding:8px 0 4px;width:120px;">OTP Sent</td>
                  <td style="font-size:14px;font-weight:700;color:#2463eb;font-family:monospace;background:#fff;padding:4px 10px;border-radius:6px;border:1px solid #e5e7eb;">{otp}</td>
                </tr>
              </table>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin:0;">Keep this information confidential. Do not forward this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; 2025 AeroAuth Admin Panel</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    _send(ADMIN_EMAIL, f"[AeroAuth] New registration: {username}", html)
