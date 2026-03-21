import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing:border-box;margin:0;padding:0; }
  :root { --bg-deep:#060a12;--bg-card:#0d1525;--bg-input:#111c30;--border:#1e2f4a;--accent1:#2463eb;--accent2:#06d6f5;--text-main:#e8edf5;--text-muted:#6b7fa3;--text-label:#9aaecf;--danger:#ff4f6d;--success:#06d6a0; }
  body { background:var(--bg-deep);color:var(--text-main);font-family:'Space Grotesk',sans-serif; }
  .fp-bg { position:fixed;inset:0;z-index:0;pointer-events:none; }
  .fp-bg::before { content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 55% at 20% 20%,rgba(36,99,235,.18) 0%,transparent 55%),radial-gradient(ellipse 60% 45% at 80% 80%,rgba(124,58,237,.15) 0%,transparent 55%); }
  .fp-grid { position:absolute;inset:0;background-image:linear-gradient(rgba(36,99,235,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(36,99,235,.06) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%); }
  .fp-page { position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem; }
  .fp-card { width:100%;max-width:440px;background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:2.5rem;position:relative;overflow:hidden;animation:slideUp .7s cubic-bezier(.22,1,.36,1) both; }
  .fp-card::before { content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent3,#7c3aed),var(--accent1),var(--accent2)); }
  @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  .fp-logo { display:flex;align-items:center;gap:.75rem;margin-bottom:2rem; }
  .fp-logo-icon { width:40px;height:40px;background:linear-gradient(135deg,var(--accent1),var(--accent2));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem; }
  .fp-logo-text { font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;background:linear-gradient(135deg,var(--accent2),var(--accent1));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
  .fp-icon { width:64px;height:64px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 1.5rem; }
  .fp-h { font-size:1.5rem;font-weight:700;text-align:center;margin-bottom:.5rem; }
  .fp-sub { font-size:.9rem;color:var(--text-muted);text-align:center;margin-bottom:2rem;line-height:1.6; }
  .fp-fg { margin-bottom:1.2rem; }
  .fp-label { display:block;font-size:.82rem;font-weight:600;color:var(--text-label);margin-bottom:.5rem;letter-spacing:.03em; }
  .fp-iw { position:relative; }
  .fp-iw svg { position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none; }
  .fp-input { width:100%;padding:.75rem .75rem .75rem 2.8rem;background:var(--bg-input);border:1px solid var(--border);border-radius:10px;color:var(--text-main);font-size:.92rem;font-family:'Space Grotesk',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s; }
  .fp-input::placeholder { color:var(--text-muted); }
  .fp-input:focus { border-color:var(--accent1);box-shadow:0 0 0 3px rgba(36,99,235,.15); }
  .fp-eye { position:absolute;right:14px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-muted);background:none;border:none;padding:0;display:flex;align-items:center; }
  .fp-btn { width:100%;padding:.85rem;background:linear-gradient(135deg,var(--accent1),var(--accent2));border:none;border-radius:10px;color:#fff;font-size:.95rem;font-weight:700;font-family:'Space Grotesk',sans-serif;cursor:pointer;transition:transform .15s,box-shadow .2s;margin-bottom:1rem; }
  .fp-btn:hover { transform:translateY(-2px);box-shadow:0 8px 32px rgba(36,99,235,.4); }
  .fp-btn:disabled { opacity:.6;cursor:not-allowed;transform:none; }
  .fp-back { text-align:center;font-size:.87rem;color:var(--text-muted); }
  .fp-back a { color:var(--accent2);text-decoration:none;font-weight:600; }
  .fp-error { padding:.75rem;margin-bottom:1rem;background:rgba(255,79,109,.15);border:1px solid rgba(255,79,109,.3);border-radius:8px;color:#ff4f6d;font-size:.85rem;text-align:center; }
  .fp-success { padding:.75rem;margin-bottom:1rem;background:rgba(6,214,160,.15);border:1px solid rgba(6,214,160,.3);border-radius:8px;color:var(--success);font-size:.85rem;text-align:center; }
  .fp-otp-inputs { display:flex;gap:.75rem;justify-content:center;margin-bottom:1.5rem; }
  .fp-otp-input { width:52px;height:60px;background:var(--bg-input);border:2px solid var(--border);border-radius:12px;color:var(--text-main);font-size:1.5rem;font-weight:700;text-align:center;outline:none;transition:border-color .2s;font-family:'Space Grotesk',sans-serif; }
  .fp-otp-input:focus { border-color:var(--accent1);box-shadow:0 0 0 3px rgba(36,99,235,.15); }
  .fp-otp-input.filled { border-color:var(--accent2); }
`;

type Step = "email" | "otp" | "newpass";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRefs = Array.from({ length: 6 }, () => ({ current: null as HTMLInputElement | null }));

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSuccess("OTP sent to your email");
      setStep("otp");
    } catch (err: any) { setError(err.response?.data?.detail || "Failed to send OTP"); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next);
    if (val && i < 5) (otpRefs[i + 1].current as any)?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) (otpRefs[i - 1].current as any)?.focus();
  };

  const handleVerifyOtp = () => {
    if (otp.join("").length < 6) { setError("Enter all 6 digits"); return; }
    setError(""); setStep("newpass");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (newPass !== confirmPass) { setError("Passwords do not match"); return; }
    if (newPass.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword(email, otp.join(""), newPass);
      setSuccess("Password reset! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) { setError(err.response?.data?.detail || "Reset failed"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="fp-bg"><div className="fp-grid" /></div>
      <div className="fp-page">
        <div className="fp-card">
          <div className="fp-logo">
            <div className="fp-logo-icon">⚡</div>
            <span className="fp-logo-text">AeroAuth</span>
          </div>

          {step === "email" && (
            <>
              <div className="fp-icon">🔑</div>
              <h2 className="fp-h">Forgot password?</h2>
              <p className="fp-sub">Enter your email and we'll send you a reset code</p>
              {error && <div className="fp-error">{error}</div>}
              <form onSubmit={handleSendOtp}>
                <div className="fp-fg">
                  <label className="fp-label">Email Address</label>
                  <div className="fp-iw">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <input className="fp-input" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>
                <button className="fp-btn" type="submit" disabled={loading}>{loading ? "Sending..." : "Send Reset Code →"}</button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="fp-icon">📧</div>
              <h2 className="fp-h">Enter reset code</h2>
              <p className="fp-sub">We sent a 6-digit code to<br /><strong style={{color:"#06d6f5"}}>{email}</strong></p>
              {error && <div className="fp-error">{error}</div>}
              {success && <div className="fp-success">{success}</div>}
              <div className="fp-otp-inputs">
                {otp.map((d, i) => (
                  <input key={i} ref={otpRefs[i] as any}
                    className={`fp-otp-input${d ? " filled" : ""}`}
                    type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)} />
                ))}
              </div>
              <button className="fp-btn" onClick={handleVerifyOtp}>Continue →</button>
            </>
          )}

          {step === "newpass" && (
            <>
              <div className="fp-icon">🔒</div>
              <h2 className="fp-h">Set new password</h2>
              <p className="fp-sub">Choose a strong new password</p>
              {error && <div className="fp-error">{error}</div>}
              {success && <div className="fp-success">{success}</div>}
              <form onSubmit={handleReset}>
                <div className="fp-fg">
                  <label className="fp-label">New Password</label>
                  <div className="fp-iw">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <input className="fp-input" type={showPass ? "text" : "password"} placeholder="Min. 6 characters" required value={newPass} onChange={e => setNewPass(e.target.value)} />
                    <button type="button" className="fp-eye" onClick={() => setShowPass(!showPass)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                </div>
                <div className="fp-fg">
                  <label className="fp-label">Confirm Password</label>
                  <div className="fp-iw">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <input className="fp-input" type="password" placeholder="Repeat password" required value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
                  </div>
                </div>
                <button className="fp-btn" type="submit" disabled={loading}>{loading ? "Resetting..." : "Reset Password →"}</button>
              </form>
            </>
          )}

          <div className="fp-back"><a href="/login">← Back to login</a></div>
        </div>
      </div>
    </>
  );
}
