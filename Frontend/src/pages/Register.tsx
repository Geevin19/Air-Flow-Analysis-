import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authAPI } from "../services/api";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f1f5f9; font-family: 'Space Grotesk', sans-serif; }
  .auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 50%, #dbeafe 100%);
    padding: 1.5rem;
  }
  .auth-card {
    width: 100%;
    max-width: 440px;
    background: #ffffff;
    border-radius: 20px;
    padding: 2.5rem 2rem;
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
  .auth-input { width:100%; padding:.72rem .72rem .72rem 2.6rem; background:#f9fafb; border:1.5px solid #e5e7eb; border-radius:10px; color:#111827; font-size:.92rem; font-family:'Space Grotesk',sans-serif; outline:none; transition:border-color .2s,box-shadow .2s; }
  .auth-input::placeholder { color:#9ca3af; }
  .auth-input:focus { border-color:#2463eb; box-shadow:0 0 0 3px rgba(36,99,235,.12); background:#fff; }
  .auth-eye { position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; color:#9ca3af; background:none; border:none; padding:0; display:flex; align-items:center; }
  .auth-eye:hover { color:#2463eb; }
  .auth-opts { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.4rem; }
  .auth-forgot { font-size:.85rem; color:#2463eb; text-decoration:none; font-weight:500; }
  .auth-forgot:hover { color:#1d4ed8; }
  .auth-btn { width:100%; padding:.82rem; background:linear-gradient(135deg,#2463eb,#06d6f5); border:none; border-radius:10px; color:#fff; font-size:.95rem; font-weight:700; font-family:'Space Grotesk',sans-serif; cursor:pointer; letter-spacing:.03em; transition:transform .15s,box-shadow .2s; }
  .auth-btn:hover { transform:translateY(-2px); box-shadow:0 6px 24px rgba(36,99,235,.35); }
  .auth-btn:disabled { opacity:.7; cursor:not-allowed; transform:none; }
  .auth-footer { text-align:center; margin-top:1.4rem; font-size:.87rem; color:#6b7280; }
  .auth-footer a { color:#2463eb; text-decoration:none; font-weight:600; }
  .auth-footer a:hover { color:#1d4ed8; }
  .auth-error { padding:.7rem 1rem; margin-bottom:1rem; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; color:#dc2626; font-size:.85rem; }
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

export default function Register() {
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
    if (!username || !email || !password) { toast.error("Please fill in required fields"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      await authAPI.register({ username, email, password, purpose: purpose || undefined });
      toast.success("Account created! Please verify your email.");
      navigate("/verify-otp", { state: { email } });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">⚡</div>
            <span className="auth-logo-text">AeroAuth</span>
          </div>
          <h2 className="auth-title">Create account</h2>
          <p className="auth-sub">Join AeroAuth - it is free</p>
          <form onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}
            <div className="auth-fg"><label className="auth-label" htmlFor="username">Username</label><div className="auth-iw"><input id="username" className="auth-input" value={username} required onChange={e => setUsername(e.target.value)} /></div></div>
            <div className="auth-fg"><label className="auth-label" htmlFor="email">Email</label><div className="auth-iw"><input id="email" type="email" className="auth-input" value={email} required onChange={e => setEmail(e.target.value)} /></div></div>
            <div className="auth-fg"><label className="auth-label" htmlFor="purpose">Purpose (optional)</label><div className="auth-iw"><input id="purpose" className="auth-input" value={purpose} onChange={e => setPurpose(e.target.value)} /></div></div>
            <div className="auth-fg"><label className="auth-label" htmlFor="password">Password</label><div className="auth-iw"><input id="password" className="auth-input" type={showPass ? "text" : "password"} value={password} required onChange={e => setPassword(e.target.value)} /><button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>Show</button></div>
              {password && <div className={`auth-strength s${score}`}>{hint}</div>}
            </div>
            <div className="auth-fg"><label className="auth-label" htmlFor="confirm">Confirm Password</label><div className="auth-iw"><input id="confirm" className="auth-input" type={showConfirm ? "text" : "password"} value={confirm} required onChange={e => setConfirm(e.target.value)} /><button type="button" className="auth-eye" onClick={() => setShowConfirm(!showConfirm)}>Show</button></div></div>
            <button className="auth-btn" type="submit" disabled={loading}>{loading ? "Creating ..." : "Create Account"}</button>
          </form>
          <div className="auth-footer">Already have an account? <a onClick={() => navigate("/login")} style={{ cursor: "pointer" }}>Sign in</a></div>
        </div>
      </div>
    </>
  );
}
