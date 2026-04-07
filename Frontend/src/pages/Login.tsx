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
    width: 100%; max-width: 420px; background: #fff;
    border: 1px solid #0066FF; padding: 48px 40px;
  }
  .auth-logo { font-size: 24px; font-weight: 700; color: #0066FF; margin-bottom: 48px; text-align: center; }
  .auth-title { font-size: 32px; font-weight: 700; color: #000; margin-bottom: 8px; }
  .auth-sub { font-size: 15px; color: #666; margin-bottom: 40px; }
  .auth-fg { margin-bottom: 24px; }
  .auth-label { display: block; font-size: 13px; font-weight: 600; color: #000; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
  .auth-input {
    width: 100%; padding: 14px 16px; background: #fff; border: 1px solid #ddd;
    color: #000; font-size: 15px; outline: none; transition: border-color 0.2s;
  }
  .auth-input::placeholder { color: #999; }
  .auth-input:focus { border-color: #0066FF; }
  .auth-opts { display: flex; justify-content: flex-end; margin-bottom: 32px; }
  .auth-forgot { font-size: 13px; color: #0066FF; text-decoration: none; cursor: pointer; }
  .auth-forgot:hover { text-decoration: underline; }
  .auth-btn {
    width: 100%; padding: 16px; background: #0066FF; border: none;
    color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
    transition: opacity 0.2s; text-transform: uppercase; letter-spacing: 1px;
  }
  .auth-btn:hover { opacity: 0.9; }
  .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-footer { text-align: center; margin-top: 32px; font-size: 14px; color: #666; }
  .auth-footer a { color: #0066FF; text-decoration: none; cursor: pointer; }
  .auth-footer a:hover { text-decoration: underline; }
  .auth-error { padding: 12px 16px; margin-bottom: 24px; background: transparent; border: 1px solid #0066FF; color: #0066FF; font-size: 14px; }
`;

export default function LoginPage() {
  const navigate = useNavigate();
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
      const msg = err.response?.data?.detail || "Login failed";
      if (msg.includes("verify your email")) {
        setError("Please verify your email first");
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
          <div className="auth-logo">SmartTracker</div>
          <h2 className="auth-title">Login</h2>
          <p className="auth-sub">Enter your credentials</p>

          <form onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-fg">
              <label className="auth-label" htmlFor="login-user">Username</label>
              <input id="login-user" className="auth-input" type="text" placeholder="username"
                required value={username} onChange={e => setUsername(e.target.value)} />
            </div>

            <div className="auth-fg">
              <label className="auth-label" htmlFor="login-pass">Password</label>
              <input id="login-pass" className="auth-input" type="password"
                placeholder="password" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <div className="auth-opts">
              <a className="auth-forgot" onClick={() => navigate("/forgot-password")}>
                Forgot password?
              </a>
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Loading..." : "Sign In"}
            </button>
          </form>

          <div className="auth-footer">
            No account? <a onClick={() => navigate("/register")}>Create one</a>
          </div>
        </div>
      </div>
    </>
  );
}
