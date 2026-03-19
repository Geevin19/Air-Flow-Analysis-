import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Register.module.css";

interface RegisterForm {
  fullName:        string;
  username:        string;
  email:           string;
  password:        string;
  confirmPassword: string;
}

const PIPES = [
  { label: "Circular", icon: "◯" },
  { label: "Square",   icon: "▢" },
  { label: "Elliptic", icon: "⬭" },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterForm>({
    fullName:"", username:"", email:"", password:"", confirmPassword:"",
  });
  const [errors, setErrors]   = useState<Partial<RegisterForm>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedPipe, setSelectedPipe] = useState("Circular");

  const validate = (): boolean => {
    const e: Partial<RegisterForm> = {};
    if (!form.fullName.trim())  e.fullName = "Full name is required";
    if (!form.username.trim())  e.username = "Username is required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = "Valid email is required";
    if (!form.password || form.password.length < 6)
      e.password = "Min 6 characters";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError("");

    try {
      const response = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email:    form.email,
          password: form.password,
          purpose:  selectedPipe,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setApiError(err.detail || "Registration failed. Try a different username.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);

    } catch {
      setApiError("Cannot connect to server. Make sure backend is running.");
      setLoading(false);
    }
  };

  const set = (field: keyof RegisterForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
      setErrors((p) => ({ ...p, [field]: undefined }));
      setApiError("");
    };

  return (
    <div className={styles.root}>
      <div className={styles.bgGlow1} />
      <div className={styles.bgGlow2} />

      <div className={styles.card}>
        <div className={styles.cornerTL} /><div className={styles.cornerTR} />
        <div className={styles.cornerBL} /><div className={styles.cornerBR} />
        <div className={styles.shimmer} />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logoRow}>
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
              <rect x="1" y="1" width="38" height="38" rx="2" stroke="#b967ff" strokeWidth="1" strokeOpacity="0.3"/>
              <circle cx="20" cy="20" r="11" stroke="#b967ff" strokeWidth="1.1" fill="none" strokeOpacity="0.4"/>
              <circle cx="20" cy="20" r="5" stroke="#e040fb" strokeWidth="1.5" fill="none"/>
              <circle cx="20" cy="20" r="1.8" fill="#b967ff"/>
              <line x1="4" y1="20" x2="14" y2="20" stroke="#b967ff" strokeWidth="1.1" strokeOpacity="0.5"/>
              <line x1="26" y1="20" x2="36" y2="20" stroke="#b967ff" strokeWidth="1.1" strokeOpacity="0.5"/>
              <line x1="20" y1="4" x2="20" y2="14" stroke="#b967ff" strokeWidth="1.1" strokeOpacity="0.5"/>
              <line x1="20" y1="26" x2="20" y2="36" stroke="#b967ff" strokeWidth="1.1" strokeOpacity="0.5"/>
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
          <h2>Create Account</h2>
          <p>Register to start your simulation environment</p>
        </div>

        {/* Form */}
        <div className={styles.formBody}>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Full Name</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <input className={`${styles.input}${errors.fullName?" "+styles.err:""}`} placeholder="Dr. Jane Doe" value={form.fullName} onChange={set("fullName")} autoComplete="name"/>
              </div>
              {errors.fullName && <div className={styles.errorMsg}>⚠ {errors.fullName}</div>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Username</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <input className={`${styles.input}${errors.username?" "+styles.err:""}`} placeholder="jane_doe" value={form.username} onChange={set("username")} autoComplete="username"/>
              </div>
              {errors.username && <div className={styles.errorMsg}>⚠ {errors.username}</div>}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email Address</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </span>
              <input className={`${styles.input}${errors.email?" "+styles.err:""}`} type="email" placeholder="researcher@institute.edu" value={form.email} onChange={set("email")} autoComplete="email"/>
            </div>
            {errors.email && <div className={styles.errorMsg}>⚠ {errors.email}</div>}
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input className={`${styles.input}${errors.password?" "+styles.err:""}`} type="password" placeholder="••••••••" value={form.password} onChange={set("password")} autoComplete="new-password"/>
              </div>
              {errors.password && <div className={styles.errorMsg}>⚠ {errors.password}</div>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Confirm Password</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input className={`${styles.input}${errors.confirmPassword?" "+styles.err:""}`} type="password" placeholder="••••••••" value={form.confirmPassword} onChange={set("confirmPassword")} autoComplete="new-password"/>
              </div>
              {errors.confirmPassword && <div className={styles.errorMsg}>⚠ {errors.confirmPassword}</div>}
            </div>
          </div>

          {/* Pipe selector */}
          <label className={styles.pipeLabel}>Select Pipe Type for Simulation</label>
          <div className={styles.pipeOptions}>
            {PIPES.map((p) => (
              <div key={p.label}
                className={`${styles.pipeOpt}${selectedPipe===p.label?" "+styles.sel:""}`}
                onClick={() => setSelectedPipe(p.label)}>
                <span className={styles.pipeIcon}>{p.icon}</span>
                {p.label}
              </div>
            ))}
          </div>

          {apiError && <div className={styles.apiError}>⚠ {apiError}</div>}

          <button
            className={`${styles.btn}${loading?" "+styles.loading:""}`}
            onClick={handleRegister}
            disabled={loading}
          >
            {loading
              ? <><span className={styles.spinner}/>Creating Account...</>
              : "▶  Create Account"}
          </button>

          {success && (
            <div className={styles.successBanner}>
              <span>✦</span> Account created! Redirecting to login...
            </div>
          )}

          <div className={styles.redirectRow}>
            <span>Already have an account?</span>
            <button className={styles.redirectLink} onClick={() => navigate("/login")}>
              Login
            </button>
          </div>
        </div>

        <div className={styles.statusBar}>
          <div className={styles.statusTxt}><span className={styles.statusDot}/>System Online</div>
          <div className={styles.statusTxt}>AirFlow SIM © 2026</div>
        </div>
      </div>
    </div>
  );
}