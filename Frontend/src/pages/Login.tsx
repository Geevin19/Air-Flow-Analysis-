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
    width: 100%; max-width: 420px; background: #ffffff;
    border-radius: 20px; padding: 2.5rem 2rem;
    box-shadow: 0 4px 32px rgba(36,99,235,.10), 0 1px 4px rgba(0,0,0,.06);
    animation: fadeUp .5s cubic-bezier(.22,1,.36,1) both;
  }
  @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  .auth-logo { display:flex;align-items:center;gap:.6rem;margin-bottom:2rem;justify-content:center; }
  .auth-logo-icon { width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden; }
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
  .auth-opts { display:flex;align-items:center;justify-content:space-between;margin-bottom:1.4rem; }
  .auth-forgot { font-size:.85rem;color:#2463eb;text-decoration:none;font-weight:500; }
  .auth-forgot:hover { color:#1d4ed8; }
  .auth-btn {
    width:100%;padding:.82rem;background:linear-gradient(135deg,#2463eb,#06d6f5);
    border:none;border-radius:10px;color:#fff;font-size:.95rem;font-weight:700;
    font-family:'Space Grotesk',sans-serif;cursor:pointer;letter-spacing:.03em;
    transition:transform .15s,box-shadow .2s;
  }
  .auth-btn:hover { transform:translateY(-2px);box-shadow:0 6px 24px rgba(36,99,235,.35); }
  .auth-btn:disabled { opacity:.7;cursor:not-allowed;transform:none; }
  .auth-footer { text-align:center;margin-top:1.4rem;font-size:.87rem;color:#6b7280; }
  .auth-footer a { color:#2463eb;text-decoration:none;font-weight:600; }
  .auth-footer a:hover { color:#1d4ed8; }
  .auth-error { padding:.7rem 1rem;margin-bottom:1rem;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:.85rem; }
`;

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.login(username, password);
      localStorage.setItem("token", res.data.access_token);
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Login failed. Please check your credentials.";
      if (msg.includes("verify your email")) {
        setError("Please verify your email first.");
        setTimeout(() => navigate("/verify-otp", { state: { email: "" } }), 1500);
      } else {
        setError(msg);
      }
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
            <div className="auth-logo-icon"><img src="/logo.png" alt="SmartTracker logo" style={{width:'38px',height:'38px',objectFit:'contain'}} /></div>
            <span className="auth-logo-text">SmartTracker</span>
          </div>
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-sub">Sign in to your account</p>

          <form onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-fg">
              <label className="auth-label" htmlFor="login-user">Username</label>
              <div className="auth-iw">
                <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input id="login-user" className="auth-input" type="text" placeholder="your_username"
                  required value={username} onChange={e => setUsername(e.target.value)} />
              </div>
            </div>

            <div className="auth-fg">
              <label className="auth-label" htmlFor="login-pass">Password</label>
              <div className="auth-iw">
                <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input id="login-pass" className="auth-input" type={showPass ? "text" : "password"}
                  placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="auth-opts">
              <span />
              <a className="auth-forgot" onClick={() => navigate("/forgot-password")} style={{ cursor: "pointer" }}>
                Forgot password?
              </a>
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <a onClick={() => navigate("/register")} style={{ cursor: "pointer" }}>Create account</a>
          </div>
        </div>
      </div>
    </>
  );
}
