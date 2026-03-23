import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  .auth-logo-icon { width:38px;height:38px;background:linear-gradient(135deg,#2463eb,#06d6f5);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem; }
  .auth-logo-text { font-size:1.25rem;font-weight:700;color:#1e3a8a; }
  .auth-title { font-size:1.5rem;font-weight:700;color:#111827;text-align:center;margin-bottom:.35rem; }
  .auth-sub { font-size:.88rem;color:#6b7280;text-align:center;margin-bottom:2rem;line-height:1.6; }
  .auth-fg { margin-bottom:1.1rem; }
  .auth-label { display:block;font-size:.82rem;font-weight:600;color:#374151;margin-bottom:.45rem; }
  .auth-iw { position:relative; }
  .auth-iw svg.ico { position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none; }
  .auth-input {
    width:100%;padding:.72rem .72rem .72rem 2.6rem;
    background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:10px;
    color:#111827;font-size:.92rem;font-family:'Space Grotesk',sans-serif;outline:none;
    transition:border-color .2s,box-shadow .2s;
  }
  .auth-input-plain {
    width:100%;padding:.72rem 1rem;
    background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:10px;
    color:#111827;font-size:1.3rem;font-family:'Space Grotesk',sans-serif;outline:none;
    letter-spacing:.4rem;text-align:center;
    transition:border-color .2s,box-shadow .2s;
  }
  .auth-input::placeholder,.auth-input-plain::placeholder { color:#9ca3af;letter-spacing:normal;font-size:.92rem; }
  .auth-input:focus,.auth-input-plain:focus { border-color:#2463eb;box-shadow:0 0 0 3px rgba(36,99,235,.12);background:#fff; }
  .auth-eye { position:absolute;right:12px;top:50%;transform:translateY(-50%);cursor:pointer;color:#9ca3af;background:none;border:none;padding:0;display:flex;align-items:center; }
  .auth-eye:hover { color:#2463eb; }
  .auth-btn {
    width:100%;padding:.82rem;background:linear-gradient(135deg,#2463eb,#06d6f5);
    border:none;border-radius:10px;color:#fff;font-size:.95rem;font-weight:700;
    font-family:'Space Grotesk',sans-serif;cursor:pointer;letter-spacing:.03em;
    transition:transform .15s,box-shadow .2s;
  }
  .auth-btn:hover { transform:translateY(-2px);box-shadow:0 6px 24px rgba(36,99,235,.35); }
  .auth-btn:disabled { opacity:.7;cursor:not-allowed;transform:none; }
  .auth-back { text-align:center;margin-top:1.2rem;font-size:.87rem;color:#6b7280; }
  .auth-back a { color:#2463eb;font-weight:600;cursor:pointer;text-decoration:none; }
  .auth-back a:hover { color:#1d4ed8; }
  .auth-error { padding:.7rem 1rem;margin-bottom:1rem;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:.85rem; }
  .auth-success { padding:.7rem 1rem;margin-bottom:1rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;color:#16a34a;font-size:.85rem; }
`;

type Step = "email" | "otp" | "password";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSuccess("OTP sent to your email.");
      setStep("otp");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setStep("password");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    try {
      await authAPI.resetPassword(email, otp, newPassword);
      setSuccess("Password reset! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Reset failed.");
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">&#9889;</div>
            <span className="auth-logo-text">AeroAuth</span>
          </div>

          {step === "email" && (
            <>
              <h2 className="auth-title">Forgot password?</h2>
              <p className="auth-sub">Enter your email and we will send you a reset code.</p>
              <form onSubmit={handleSendOTP}>
                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}
                <div className="auth-fg">
                  <label className="auth-label" htmlFor="fp-email">Email Address</label>
                  <div className="auth-iw">
                    <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <input id="fp-email" className="auth-input" type="email" placeholder="you@example.com"
                      required value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>
                <button className="auth-btn" type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Code"}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <h2 className="auth-title">Enter OTP</h2>
              <p className="auth-sub">Check your email for the 6-digit code.</p>
              <form onSubmit={handleVerifyOTP}>
                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}
                <div className="auth-fg">
                  <label className="auth-label" htmlFor="fp-otp">6-digit code</label>
                  <input id="fp-otp" className="auth-input-plain" type="text" placeholder="------"
                    maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} />
                </div>
                <button className="auth-btn" type="submit">Continue</button>
              </form>
            </>
          )}

          {step === "password" && (
            <>
              <h2 className="auth-title">New password</h2>
              <p className="auth-sub">Choose a strong new password.</p>
              <form onSubmit={handleReset}>
                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}
                <div className="auth-fg">
                  <label className="auth-label" htmlFor="fp-newpass">New Password</label>
                  <div className="auth-iw">
                    <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <input id="fp-newpass" className="auth-input" type={showPass ? "text" : "password"}
                      placeholder="Min. 8 characters" required minLength={8}
                      value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <button className="auth-btn" type="submit" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          )}

          <div className="auth-back">
            <a onClick={() => navigate("/login")}>Back to login</a>
          </div>
        </div>
      </div>
    </>
  );
}
