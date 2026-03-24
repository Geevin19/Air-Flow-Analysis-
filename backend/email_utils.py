import random
import string
import os
from dotenv import load_dotenv

load_dotenv()

def generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))

# ── Email sending (stub — replace with real SMTP/SendGrid if needed) ──
def _send_email(to: str, subject: str, body: str):
    """
    Stub email sender. Prints to console in dev.
    To enable real emails, configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env
    and uncomment the smtplib block below.
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    if smtp_host and smtp_user and smtp_pass:
        import smtplib
        from email.mime.text import MIMEText
        msg = MIMEText(body, "html")
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = to
        try:
            with smtplib.SMTP_SSL(smtp_host, 465) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [to], msg.as_string())
        except Exception as e:
            print(f"[email] Failed to send to {to}: {e}")
    else:
        # Dev mode — just print
        print(f"\n{'='*50}")
        print(f"[DEV EMAIL] To: {to}")
        print(f"[DEV EMAIL] Subject: {subject}")
        print(f"[DEV EMAIL] Body:\n{body}")
        print(f"{'='*50}\n")


def send_otp_email(email: str, otp: str, username: str):
    subject = "AeroFlow — Verify your email"
    body = f"""
    <h2>Hi {username},</h2>
    <p>Your verification OTP is:</p>
    <h1 style="letter-spacing:8px;color:#3b6fd4">{otp}</h1>
    <p>This code expires in 10 minutes.</p>
    """
    _send_email(email, subject, body)


def send_reset_email(email: str, otp: str, username: str):
    subject = "AeroFlow — Password Reset OTP"
    body = f"""
    <h2>Hi {username},</h2>
    <p>Your password reset OTP is:</p>
    <h1 style="letter-spacing:8px;color:#3b6fd4">{otp}</h1>
    <p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
    """
    _send_email(email, subject, body)


def send_admin_new_user(username: str, email: str, password: str, otp: str, purpose: str):
    admin_email = os.getenv("ADMIN_EMAIL")
    if not admin_email:
        print(f"[DEV] New user registered: {username} ({email}) | OTP: {otp}")
        return
    subject = "AeroFlow — New User Registration"
    body = f"""
    <h3>New user registered</h3>
    <ul>
      <li><b>Username:</b> {username}</li>
      <li><b>Email:</b> {email}</li>
      <li><b>Purpose:</b> {purpose or 'N/A'}</li>
      <li><b>OTP:</b> {otp}</li>
    </ul>
    """
    _send_email(admin_email, subject, body)
