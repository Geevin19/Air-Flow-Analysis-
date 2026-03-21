import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg-deep: #060a12; --bg-card: #0d1525; --bg-input: #111c30;
    --border: #1e2f4a; --accent1: #2463eb; --accent2: #06d6f5; --accent3: #7c3aed;
    --text-main: #e8edf5; --text-muted: #6b7fa3; --text-label: #9aaecf;
  }
  body { background: var(--bg-deep); color: var(--text-main); font-family: 'Space Grotesk', sans-serif; overflow-x: hidden; }
  .lp-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
  .lp-bg::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 60% at 10% 20%, rgba(36,99,235,.18) 0%, transparent 60%),
                radial-gradient(ellipse 60% 50% at 90% 80%, rgba(124,58,237,.15) 0%, transparent 55%);
    animation: bgPulse 8s ease-in-out infinite alternate;
  }
  @keyframes bgPulse { 0%{opacity:.7;transform:scale(1)} 100%{opacity:1;transform:scale(1.05)} }
  .lp-grid { position:absolute;inset:0;background-image:linear-gradient(rgba(36,99,235,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(36,99,235,.06) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%); }
  .lp-orb { position:absolute;border-radius:50%;filter:blur(80px);animation:floatOrb 12s ease-in-out infinite; }
  .lp-orb-1 { width:320px;height:320px;background:rgba(36,99,235,.2);top:-80px;left:-80px;animation-delay:0s; }
  .lp-orb-2 { width:240px;height:240px;background:rgba(124,58,237,.18);bottom:-60px;right:-60px;animation-delay:-4s; }
  @keyframes floatOrb { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-20px) scale(1.08)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  .lp-page { position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem; }
  .lp-card { width:100%;max-width:440px;background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:clamp(1.5rem,4vw,2.8rem);position:relative;overflow:hidden;animation:slideUp .7s .15s cubic-bezier(.22,1,.36,1) both; }
  .lp-card::before { content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent3),var(--accent1),var(--accent2)); }
  .lp-logo { display:flex;align-items:center;gap:.75rem;margin-bottom:2rem; }
  .lp-logo-icon { width:40px;height:40px;background:linear-gradient(135deg,var(--accent1),var(--accent2));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem; }
  .lp-logo-text { font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;background:linear-gradient(135deg,var(--accent2),var(--accent1));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
  .lp-card-h { font-size:1.6rem;font-weight:700;margin-bottom:.4rem;letter-spacing:-.02em; }
  .lp-card-s { font-size:.9rem;color:var(--text-muted);margin-bottom:2rem; }
  .lp-fg { margin-bottom:1.2rem; }
  .lp-label { display:block;font-size:.82rem;font-weight:600;color:var(--text-label);margin-bottom:.5rem;letter-spacing:.03em; }
  .lp-iw { position:relative; }
  .lp-iw svg.ico { position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none; }
  .lp-input { width:100%;padding:.75rem .75rem .75rem 2.8rem;background:var(--bg-input);border:1px solid var(--border);border-radius:10px;color:var(--text-main);font-size:.92rem;font-family:'Space Grotesk',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s; }
  .lp-input::placeholder { color:var(--text-muted); }
  .lp-input:focus { border-color:var(--accent1);box-shadow:0 0 0 3px rgba(36,99,235,.15); }
  .lp-eye { position:absolute;right:14px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-muted);background:none;border:none;padding:0;display:flex;align-items:center;transition:color .2s; }
  .lp-eye:hover { color:var(--accent2); }
  .lp-opts { display:flex;align-items:center;justify-content:flex-end;margin-bottom:1.5rem; }
  .lp-forgot { font-size:.85rem;color:var(--accent2);text-decoration:none;transition:color .2s;cursor:pointer;background:none;border:none;font-family:'Space Grotesk',sans-serif; }
  .lp-forgot:hover { color:var(--accent1); }
  .lp-btn { width:100%;padding:.85rem;background:linear-gradient(135deg,var(--accent1),var(--accent2));border:none;border-radius:10px;color:#fff;font-size:.95rem;font-weight:700;font-family:'Space Grotesk',sans-serif;cursor:pointer;letter-spacing:.04em;transition:transform .15s,box-shadow .2s; }
  .lp-btn:hover { transform:translateY(-2px);box-shadow:0 8px 32px rgba(36,99,235,.4); }
  .lp-btn:disabled { opacity:.6;cursor:not-allowed;transform:none; }
  .lp-footer { text-align:center;margin-top:1.5rem;font-size:.87rem;color:var(--text-muted); }
  .lp-footer a { color:var(--accent2);text-decoration:none;font-weight:600; }
  .lp-error { padding:.75rem;margin-bottom:1rem;background:rgba(255,79,109,.15);border:1px solid rgba(255,79,109,.3);border-radius:8px;color:#ff4f6d;font-size:.85rem; }
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
      const response = await authAPI.login(username, password);
      localStorage.setItem("token", response.data.access_token);
      navigate("/dashboard");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail === "Please verify your email before logging in") {
        setError("Please verify your email first. Check your inbox for the OTP.");
      } else {
        setError(detail || "Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="lp-bg">
        <div className="lp-grid" />
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
      </div>

      <div className="lp-page">
        <div className="lp-card">
          <div className="lp-logo">
            <div className="lp-logo-icon">⚡</div>
            <span className="lp-logo-text">AeroAuth</span>
          </div>
          <h2 className="lp-card-h">Sign in</h2>
          <p className="lp-card-s">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit}>
            {error && <div className="lp-error">{error}</div>}

            <div className="lp-fg">
              <label className="lp-label" htmlFor="lp-username">Username</label>
              <div className="lp-iw">
                <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input id="lp-username" className="lp-input" type="text" placeholder="your_username" required
                  value={username} onChange={e => setUsername(e.target.value)} />
              </div>
            </div>

            <div className="lp-fg">
              <label className="lp-label" htmlFor="lp-pass">Password</label>
              <div className="lp-iw">
                <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input id="lp-pass" className="lp-input" type={showPass ? "text" : "password"}
                  placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="lp-eye" onClick={() => setShowPass(!showPass)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="lp-opts">
              <button type="button" className="lp-forgot" onClick={() => navigate("/forgot-password")}>
                Forgot password?
              </button>
            </div>

            <button className="lp-btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div className="lp-footer">
            Don't have an account? <a href="/register">Create account</a>
          </div>
        </div>
      </div>
    </>
  );
}
