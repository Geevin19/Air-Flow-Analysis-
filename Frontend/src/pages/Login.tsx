import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";

interface LoginForm {
  username: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm]       = useState<LoginForm>({ username: "", password: "" });
  const [errors, setErrors]   = useState<Partial<LoginForm>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  const validate = (): boolean => {
    const e: Partial<LoginForm> = {};
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.password || form.password.length < 6)
      e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", form.username);
      formData.append("password", form.password);

      const response = await fetch("http://localhost:8000/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        setApiError(err.detail || "Invalid username or password");
        setLoading(false);
        return;
      }

      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      setSuccess(true);
      setLoading(false);
      setTimeout(() => navigate("/simulation"), 1500);

    } catch {
      setApiError("Cannot connect to server. Make sure backend is running.");
      setLoading(false);
    }
  };

  const set = (field: keyof LoginForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
      setErrors((p) => ({ ...p, [field]: undefined }));
      setApiError("");
    };

  return (
    <div className={styles.root}>
      {/* Background effects */}
      <div className={styles.bgGlow1} />
      <div className={styles.bgGlow2} />

      <div className={styles.card}>
        {/* Corner accents */}
        <div className={styles.cornerTL} />
        <div className={styles.cornerTR} />
        <div className={styles.cornerBL} />
        <div className={styles.cornerBR} />
        <div className={styles.shimmer} />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logoRow}>
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
              <rect x="1" y="1" width="38" height="38" rx="2"
                stroke="#b967ff" strokeWidth="1" strokeOpacity="0.3"/>
              <circle cx="20" cy="20" r="11"
                stroke="#b967ff" strokeWidth="1.1" fill="none" strokeOpacity="0.4"/>
              <circle cx="20" cy="20" r="5"
                stroke="#e040fb" strokeWidth="1.5" fill="none"/>
              <circle cx="20" cy="20" r="1.8" fill="#b967ff"/>
              <line x1="4"  y1="20" x2="14" y2="20"
                stroke="#b967ff" strokeWidth="1.1" strokeOpacity="0.5"/>
              <line x1="26" y1="20" x2="36" y2="20"
                stroke="#b967ff" strokeWidth="1.1" strokeOpacity="0.5"/>
              <line x1="20" y1="4"  x2="20" y2="14"
                stroke="#b967ff" strokeWidth="1.1" strokeOpacity="0.5"/>
              <line x1="20" y1="26" x2="20" y2="36"
                stroke="#b967ff" strokeWidth="1.1" strokeOpacity="0.5"/>
            </svg>
            <div>
              <div className={styles.logoText}>AirFlow SIM</div>
              <div className={styles.logoSub}>Vector Differentiation System · v2.0</div>
            </div>
          </div>
          <div className={styles.scanLine} />
        </div>

        {/* Page title */}
        <div className={styles.pageTitle}>
          <h2>Welcome Back</h2>
          <p>Sign in to access your simulation dashboard</p>
        </div>

        {/* Form */}
        <div className={styles.formBody}>

          {/* Username */}
          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>
                <svg width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                className={`${styles.input}${errors.username ? " " + styles.err : ""}`}
                placeholder="your_username"
                value={form.username}
                onChange={set("username")}
                autoComplete="username"
              />
            </div>
            {errors.username && (
              <div className={styles.errorMsg}>⚠ {errors.username}</div>
            )}
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>
                <svg width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                className={`${styles.input}${errors.password ? " " + styles.err : ""}`}
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
                autoComplete="current-password"
              />
            </div>
            {errors.password && (
              <div className={styles.errorMsg}>⚠ {errors.password}</div>
            )}
          </div>

          {/* API Error */}
          {apiError && (
            <div className={styles.apiError}>⚠ {apiError}</div>
          )}

          {/* Submit */}
          <button
            className={`${styles.btn}${loading ? " " + styles.loading : ""}`}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading
              ? <><span className={styles.spinner} />Authenticating...</>
              : "▶  Login"}
          </button>

          {/* Success */}
          {success && (
            <div className={styles.successBanner}>
              <span>✦</span> Login successful! Opening simulation...
            </div>
          )}

          {/* Link to Register */}
          <div className={styles.redirectRow}>
            <span>Don't have an account?</span>
            <button
              className={styles.redirectLink}
              onClick={() => navigate("/register")}
            >
              Register
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className={styles.statusBar}>
          <div className={styles.statusTxt}>
            <span className={styles.statusDot} /> System Online
          </div>
          <div className={styles.statusTxt}>AirFlow SIM © 2026</div>
        </div>
      </div>
    </div>
  );
}