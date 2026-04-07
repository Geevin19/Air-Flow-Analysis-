import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .auth-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #fff; padding: 24px;
  }
  .auth-card {
    width: 100%; max-width: 440px; background: #fff;
    border: 1px solid #0066FF; padding: 48px 40px;
  }
  .auth-logo { font-size: 24px; font-weight: 700; color: #0066FF; margin-bottom: 48px; text-align: center; }
  .auth-title { font-size: 32px; font-weight: 700; color: #000; margin-bottom: 8px; }
  .auth-sub { font-size: 15px; color: #666; margin-bottom: 40px; }
  .auth-fg { margin-bottom: 20px; }
  .auth-label { display: block; font-size: 13px; font-weight: 600; color: #000; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
  .auth-input {
    width: 100%; padding: 14px 16px; background: #fff; border: 1px solid #ddd;
    color: #000; font-size: 15px; outline: none; transition: border-color 0.2s;
  }
  .auth-input::placeholder { color: #999; }
  .auth-input:focus { border-color: #0066FF; }
  .auth-strength { display: flex; gap: 4px; height: 3px; margin-top: 8px; }
  .auth-strength span { flex: 1; background: #ddd; transition: background 0.3s; }
  .auth-strength.s1 span:nth-child(1) { background: #0066FF; }
  .auth-strength.s2 span:nth-child(-n+2) { background: #0066FF; }
  .auth-strength.s3 span:nth-child(-n+3) { background: #0066FF; }
  .auth-strength.s4 span { background: #0066FF; }
  .auth-hint { font-size: 12px; color: #666; margin-top: 6px; }
  .auth-btn {
    width: 100%; padding: 16px; background: #0066FF; border: none;
    color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
    transition: opacity 0.2s; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px;
  }
  .auth-btn:hover { opacity: 0.9; }
  .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-footer { text-align: center; margin-top: 32px; font-size: 14px; color: #666; }
  .auth-footer a { color: #0066FF; text-decoration: none; cursor: pointer; }
  .auth-footer a:hover { text-decoration: underline; }
  .auth-error { padding: 12px 16px; margin-bottom: 24px; background: transparent; border: 1px solid #0066FF; color: #0066FF; font-size: 14px; }
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
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">SmartTracker</div>
          <h2 className="auth-title">Register</h2>
          <p className="auth-sub">Create your account</p>
          
          <form onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}
            
            <div className="auth-fg">
              <label className="auth-label" htmlFor="reg-user">Username</label>
              <input id="reg-user" className="auth-input" type="text" placeholder="username"
                required value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            
            <div className="auth-fg">
              <label className="auth-label" htmlFor="reg-email">Email</label>
              <input id="reg-email" className="auth-input" type="email" placeholder="you@example.com"
                required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            
            <div className="auth-fg">
              <label className="auth-label" htmlFor="reg-purpose">Purpose (Optional)</label>
              <input id="reg-purpose" className="auth-input" type="text" placeholder="Research, Education, etc."
                value={purpose} onChange={e => setPurpose(e.target.value)} />
            </div>
            
            <div className="auth-fg">
              <label className="auth-label" htmlFor="reg-pass">Password</label>
              <input id="reg-pass" className="auth-input" type="password"
                placeholder="Min. 8 characters" required value={password} onChange={e => setPassword(e.target.value)} />
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
              <input id="reg-confirm" className="auth-input" type="password"
                placeholder="Repeat password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>
          
          <div className="auth-footer">
            Have an account? <a onClick={() => navigate("/login")}>Sign in</a>
          </div>
        </div>
      </div>
    </>
  );
}
