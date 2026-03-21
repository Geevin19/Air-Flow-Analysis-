import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM", MAIL_USERNAME)

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

def send_otp_email(to_email: str, otp: str, subject: str, purpose: str = "verification"):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = MAIL_FROM
    msg["To"] = to_email

    html = f"""
    <html><body style="font-family:sans-serif;background:#060a12;color:#e8edf5;padding:40px;">
      <div style="max-width:480px;margin:0 auto;background:#0d1525;border:1px solid #1e2f4a;border-radius:16px;padding:40px;">
        <h2 style="color:#06d6f5;margin-bottom:8px;">⚡ AeroAuth</h2>
        <h3 style="margin-bottom:24px;">Your {purpose} code</h3>
        <div style="background:#111c30;border:1px solid #1e2f4a;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#06d6f5;">{otp}</span>
        </div>
        <p style="color:#6b7fa3;font-size:14px;">This code expires in <strong style="color:#e8edf5;">10 minutes</strong>. Do not share it with anyone.</p>
      </div>
    </body></html>
    """
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(MAIL_USERNAME, MAIL_PASSWORD)
        server.sendmail(MAIL_FROM, to_email, msg.as_string())

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")

def send_admin_notification(new_username: str, new_email: str, purpose: str):
    if not ADMIN_EMAIL:
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"New user registered: {new_username}"
    msg["From"] = MAIL_FROM
    msg["To"] = ADMIN_EMAIL

    html = f"""
    <html><body style="font-family:sans-serif;background:#060a12;color:#e8edf5;padding:40px;">
      <div style="max-width:480px;margin:0 auto;background:#0d1525;border:1px solid #1e2f4a;border-radius:16px;padding:40px;">
        <h2 style="color:#06d6f5;margin-bottom:8px;">⚡ AeroAuth — New Registration</h2>
        <p style="color:#6b7fa3;margin-bottom:24px;">A new user just created an account.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#9aaecf;font-size:14px;">Username</td><td style="padding:8px 0;color:#e8edf5;font-weight:600;">{new_username}</td></tr>
          <tr><td style="padding:8px 0;color:#9aaecf;font-size:14px;">Email</td><td style="padding:8px 0;color:#e8edf5;font-weight:600;">{new_email}</td></tr>
          <tr><td style="padding:8px 0;color:#9aaecf;font-size:14px;">Purpose</td><td style="padding:8px 0;color:#e8edf5;font-weight:600;">{purpose or 'Not specified'}</td></tr>
        </table>
      </div>
    </body></html>
    """
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.sendmail(MAIL_FROM, ADMIN_EMAIL, msg.as_string())
    except Exception as e:
        print(f"Admin notification failed: {e}")
