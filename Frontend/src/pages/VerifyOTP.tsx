import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authAPI } from "../services/api";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f1f5f9; font-family: 'Space Grotesk', sans-serif; }
  .auth-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 50%, #dbeafe 100%);
    padding: 1.5rem;
  }
  .auth-card {
    width: 100%; max-width: 400px; background: #ffffff;
    border-radius: 20px; padding: 2.5rem 2rem;
    box-shadow: 0 4px 32px rgba(36,99,235,.10), 0 1px 4px rgba(0,0,0,.06);
    animation: fadeUp .5s cubic-bezier(.22,1,.36,1) both;
  }
  @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  .auth-logo { display:flex;align-items:center;gap:.6rem;margin-bottom:2rem;justify-content:center; }
  .auth-logo-icon { width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden; }
  .auth-logo-text { font-size:1.25rem;font-weight:700;color:#1e3a8a; }
  .auth-title { font-size:1.5rem;font-weight:700;color:#111827;text-align:center;margin-bottom:.35rem; }
  .auth-sub { font-size:.88rem;color:#6b7280;text-align:center;margin-bottom:2rem;line-height:1.6; }
  .auth-fg { margin-bottom:1.1rem; }
  .auth-label { display:block;font-size:.82rem;font-weight:600;color:#374151;margin-bottom:.45rem; }
  .auth-input {
    width:100%;padding:.72rem 1rem;
    background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:10px;
    color:#111827;font-size:1.4rem;font-family:'Space Grotesk',sans-serif;outline:none;
    letter-spacing:.5rem;text-align:center;
    transition:border-color .2s,box-shadow .2s;
  }
  .auth-input::placeholder { color:#9ca3af;letter-spacing:normal;font-size:.92rem; }
  .auth-input:focus { border-color:#2463eb;box-shadow:0 0 0 3px rgba(36,99,235,.12);background:#fff; }
  .auth-btn {
    width:100%;padding:.82rem;background:linear-gradient(135deg,#2463eb,#06d6f5);
    border:none;border-radius:10px;color:#fff;font-size:.95rem;font-weight:700;
    font-family:'Space Grotesk',sans-serif;cursor:pointer;letter-spacing:.03em;
    transition:transform .15s,box-shadow .2s;
  }
  .auth-btn:hover { transform:translateY(-2px);box-shadow:0 6px 24px rgba(36,99,235,.35); }
  .auth-btn:disabled { opacity:.7;cursor:not-allowed;transform:none; }
  .auth-resend { text-align:center;margin-top:1.2rem;font-size:.87rem;color:#6b7280; }
  .auth-resend button { background:none;border:none;color:#2463eb;font-weight:600;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:.87rem; }
  .auth-resend button:hover { color:#1d4ed8; }
  .auth-error { padding:.7rem 1rem;margin-bottom:1rem;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:.85rem; }
  .auth-success { padding:.7rem 1rem;margin-bottom:1rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;color:#16a34a;font-size:.85rem; }
`;

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState((location.state as any)?.email || "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    try {
      await authAPI.verifyOTP(email, otp);
      setSuccess("Email verified! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(""); setSuccess("");
    setResending(true);
    try {
      await authAPI.resendOTP(email);
      setSuccess("New OTP sent to your email.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon"><img src="/logo.png" alt="SmartTracker logo" style={{width:'38px',height:'38px',objectFit:'contain'}} /></div>
            <span className="auth-logo-text">SmartTracker</span>
          </div>
          <h2 className="auth-title">Verify your email</h2>
          <p className="auth-sub">
            We sent a 6-digit code to<br />
            <strong style={{ color: "#111827" }}>{email || "your email"}</strong>
          </p>
          <form onSubmit={handleVerify}>
            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}
            {!email && (
              <div className="auth-fg">
                <label className="auth-label" htmlFor="otp-email">Email Address</label>
                <input id="otp-email" className="auth-input" type="email" placeholder="you@example.com"
                  style={{ letterSpacing: "normal", fontSize: ".92rem", textAlign: "left" }}
                  required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            )}
            <div className="auth-fg">
              <label className="auth-label" htmlFor="otp-code">Enter OTP</label>
              <input id="otp-code" className="auth-input" type="text" placeholder="------"
                maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} />
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </form>
          <div className="auth-resend">
            Didn't receive the code?{" "}
            <button onClick={handleResend} disabled={resending}>
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
