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
    width: 100%; max-width: 440px; background: #ffffff;
    border-radius: 20px; padding: 2.5rem 2rem;
    box-shadow: 0 4px 32px rgba(36,99,235,.10), 0 1px 4px rgba(0,0,0,.06);
    animation: fadeUp .5s cubic-bezier(.22,1,.36,1) both;
  }
  @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  .auth-logo { display:flex;align-items:center;gap:.6rem;margin-bottom:2rem;justify-content:center; }
  .auth-logo-icon { width:38px;height:38px;background:linear-gradient(135deg,#2463eb,#06d6f5);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem; }
  .auth-logo-text { font-size:1.25rem;font-weight:700;color:#1e3a8a; }
  .auth-title { font-size:1.55rem;font-weight:700;color:#111827;text-align:center;margin-bottom:.35rem; }
  .auth-sub { font-size:.88rem;color:#6b7280;text-align:center;margin-bottom:2rem; }
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
  .auth-input::placeholder { color:#9ca3af; }
  .auth-input:focus { border-color:#2463eb;box-shadow:0 0 0 3px rgba(36,99,235,.12);background:#fff; }
  .auth-eye { position:absolute;right:12px;top:50%;transform:translateY(-50%);cursor:pointer;color:#9ca3af;background:none;border:none;padding:0;display:flex;align-items:center; }
  .auth-eye:hover { color:#2463eb; }
  .auth-strength { display:flex;gap:.3rem;height:3px;margin-top:.5rem; }
  .auth-strength span { flex:1;border-radius:4px;background:#e5e7eb;transition:background .3s; }
  .auth-strength.s1 span:nth-child(1) { background:#ef4444; }
  .auth-strength.s2 span:nth-child(-n+2) { background:#f97316; }
  .auth-strength.s3 span:nth-child(-n+3) { background:#eab308; }
  .auth-strength.s4 span { background:#22c55e; }
  .auth-hint { font-size:.75rem;color:#6b7280;margin-top:.3rem; }
  .auth-btn {
    width:100%;padding:.82rem;background:linear-gradient(135deg,#2463eb,#06d6f5);
    border:none;border-radius:10px;color:#fff;font-size:.95rem;font-weight:700;
    font-family:'Space Grotesk',sans-serif;cursor:pointer;letter-spacing:.03em;
    transition:transform .15s,box-shadow .2s;margin-top:.4rem;
  }
  .auth-btn:hover { transform:translateY(-2px);box-shadow:0 6px 24px rgba(36,99,235,.35); }
  .auth-btn:disabled { opacity:.7;cursor:not-allowed;transform:none; }
  .auth-footer { text-align:center;margin-top:1.4rem;font-size:.87rem;color:#6b7280; }
  .auth-footer a { color:#2463eb;text-decoration:none;font-weight:600;cursor:pointer; }
  .auth-footer a:hover { color:#1d4ed8; }
  .auth-error { padding:.7rem 1rem;margin-bottom:1rem;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:.85rem; }
`;

function getStrength(val: string) {
  if (!val) return { score: 0, hint: "Use 8+ chars, numbers & symbols" };
  let s = 0;
  if (val.length >= 8) s++;
  if (/[A-Z]/.test(val)) s++;
  if (/[0-9]/.test(val)) s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  const hints = ["", "Weak", "Fair", "Good", "Strong"];
  return { score: s, hint: hints[s] };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [purpose, setPurpose] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { score, hint } = getStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await authAPI.register({ username, email, password, purpose: purpose || undefined });
      navigate("/verify-otp", { state: { email } });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
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
          <h2 className="auth-title">Create account</h2>
          <p className="auth-sub">Join AeroAuth - it is free</p>
          <form onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}
            <div className="auth-fg">
              <label className="auth-label" htmlFor="reg-user">Username</label>
              <div className="auth-iw">
                <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input id="reg-user" className="auth-input" type="text" placeholder="your_username"
                  required value={username} onChange={e => setUsername(e.target.value)} />
              </div>
            </div>
            <div className="auth-fg">
              <label className="auth-label" htmlFor="reg-email">Email Address</label>
              <div className="auth-iw">
                <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <input id="reg-email" className="auth-input" type="email" placeholder="you@example.com"
                  required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="auth-fg">
              <label className="auth-label" htmlFor="reg-purpose">Purpose (Optional)</label>
              <div className="auth-iw">
                <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <input id="reg-purpose" className="auth-input" type="text" placeholder="Research, Education, etc."
                  value={purpose} onChange={e => setPurpose(e.target.value)} />
              </div>
            </div>
            <div className="auth-fg">
              <label className="auth-label" htmlFor="reg-pass">Password</label>
              <div className="auth-iw">
                <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input id="reg-pass" className="auth-input" type={showPass ? "text" : "password"}
                  placeholder="Min. 8 characters" required value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
              {password && (
                <>
                  <div className={"auth-strength" + (score > 0 ? " s" + score : "")}>
                    <span/><span/><span/><span/>
                  </div>
                  <p className="auth-hint">{hint}</p>
                </>
              )}
            </div>
            <div className="auth-fg">
              <label className="auth-label" htmlFor="reg-confirm">Confirm Password</label>
              <div className="auth-iw">
                <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input id="reg-confirm" className="auth-input" type={showConfirm ? "text" : "password"}
                  placeholder="Repeat password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
                <button type="button" className="auth-eye" onClick={() => setShowConfirm(!showConfirm)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
          <div className="auth-footer">
            Already have an account? <a onClick={() => navigate("/login")}>Sign in</a>
          </div>
        </div>
      </div>
    </>
  );
}
