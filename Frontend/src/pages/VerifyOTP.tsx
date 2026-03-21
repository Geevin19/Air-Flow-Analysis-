import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authAPI } from "../services/api";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --bg-deep:#060a12;--bg-card:#0d1525;--bg-input:#111c30;--border:#1e2f4a;--accent1:#2463eb;--accent2:#06d6f5;--text-main:#e8edf5;--text-muted:#6b7fa3;--text-label:#9aaecf;--danger:#ff4f6d;--success:#06d6a0; }
  body { background:var(--bg-deep);color:var(--text-main);font-family:'Space Grotesk',sans-serif; }
  .otp-bg { position:fixed;inset:0;z-index:0;pointer-events:none; }
  .otp-bg::before { content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 55% at 80% 10%,rgba(124,58,237,.2) 0%,transparent 55%),radial-gradient(ellipse 60% 45% at 10% 80%,rgba(36,99,235,.18) 0%,transparent 55%); }
  .otp-grid { position:absolute;inset:0;background-image:linear-gradient(rgba(36,99,235,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(36,99,235,.06) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%); }
  .otp-page { position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem; }
  .otp-card { width:100%;max-width:440px;background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:2.5rem;position:relative;overflow:hidden;animation:slideUp .7s cubic-bezier(.22,1,.36,1) both; }
  .otp-card::before { content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent2),var(--accent1)); }
  @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  .otp-logo { display:flex;align-items:center;gap:.75rem;margin-bottom:2rem; }
  .otp-logo-icon { width:40px;height:40px;background:linear-gradient(135deg,var(--accent1),var(--accent2));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem; }
  .otp-logo-text { font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;background:linear-gradient(135deg,var(--accent2),var(--accent1));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
  .otp-icon { width:64px;height:64px;background:rgba(36,99,235,.15);border:1px solid rgba(36,99,235,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 1.5rem; }
  .otp-h { font-size:1.5rem;font-weight:700;text-align:center;margin-bottom:.5rem; }
  .otp-sub { font-size:.9rem;color:var(--text-muted);text-align:center;margin-bottom:2rem;line-height:1.6; }
  .otp-sub strong { color:var(--accent2); }
  .otp-inputs { display:flex;gap:.75rem;justify-content:center;margin-bottom:1.5rem; }
  .otp-input { width:52px;height:60px;background:var(--bg-input);border:2px solid var(--border);border-radius:12px;color:var(--text-main);font-size:1.5rem;font-weight:700;text-align:center;outline:none;transition:border-color .2s,box-shadow .2s;font-family:'Space Grotesk',sans-serif; }
  .otp-input:focus { border-color:var(--accent1);box-shadow:0 0 0 3px rgba(36,99,235,.15); }
  .otp-input.filled { border-color:var(--accent2); }
  .otp-btn { width:100%;padding:.85rem;background:linear-gradient(135deg,var(--accent1),var(--accent2));border:none;border-radius:10px;color:#fff;font-size:.95rem;font-weight:700;font-family:'Space Grotesk',sans-serif;cursor:pointer;transition:transform .15s,box-shadow .2s;margin-bottom:1rem; }
  .otp-btn:hover { transform:translateY(-2px);box-shadow:0 8px 32px rgba(36,99,235,.4); }
  .otp-btn:disabled { opacity:.6;cursor:not-allowed;transform:none; }
  .otp-resend { text-align:center;font-size:.87rem;color:var(--text-muted); }
  .otp-resend button { background:none;border:none;color:var(--accent2);font-weight:600;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:.87rem; }
  .otp-resend button:disabled { color:var(--text-muted);cursor:not-allowed; }
  .otp-error { padding:.75rem;margin-bottom:1rem;background:rgba(255,79,109,.15);border:1px solid rgba(255,79,109,.3);border-radius:8px;color:#ff4f6d;font-size:.85rem;text-align:center; }
  .otp-success { padding:.75rem;margin-bottom:1rem;background:rgba(6,214,160,.15);border:1px solid rgba(6,214,160,.3);border-radius:8px;color:var(--success);font-size:.85rem;text-align:center; }
`;

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email || "";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) navigate("/register");
    const t = setInterval(() => setResendTimer(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Enter all 6 digits"); return; }
    setLoading(true); setError("");
    try {
      await authAPI.verifyOtp(email, code);
      setSuccess("Email verified! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Verification failed");
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    try {
      await authAPI.resendOtp(email);
      setResendTimer(60);
      setSuccess("New OTP sent to your email");
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to resend OTP");
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="otp-bg"><div className="otp-grid" /></div>
      <div className="otp-page">
        <div className="otp-card">
          <div className="otp-logo">
            <div className="otp-logo-icon">⚡</div>
            <span className="otp-logo-text">AeroAuth</span>
          </div>
          <div className="otp-icon">📧</div>
          <h2 className="otp-h">Verify your email</h2>
          <p className="otp-sub">We sent a 6-digit code to<br /><strong>{email}</strong></p>

          {error && <div className="otp-error">{error}</div>}
          {success && <div className="otp-success">{success}</div>}

          <div className="otp-inputs">
            {otp.map((d, i) => (
              <input key={i} ref={el => inputs.current[i] = el}
                className={`otp-input${d ? " filled" : ""}`}
                type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)} />
            ))}
          </div>

          <button className="otp-btn" onClick={handleVerify} disabled={loading}>
            {loading ? "Verifying..." : "Verify Email →"}
          </button>

          <div className="otp-resend">
            Didn't receive it?{" "}
            <button onClick={handleResend} disabled={resendTimer > 0}>
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
