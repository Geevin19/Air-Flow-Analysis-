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
    --danger: #ff4f6d; --success: #06d6a0;
  }
  body { background: var(--bg-deep); color: var(--text-main); font-family: 'Space Grotesk', sans-serif; overflow-x: hidden; }
  .rp-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
  .rp-bg::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse 70% 55% at 80% 10%, rgba(124,58,237,.2) 0%, transparent 55%),
                radial-gradient(ellipse 60% 45% at 10% 80%, rgba(36,99,235,.18) 0%, transparent 55%),
                radial-gradient(ellipse 40% 40% at 50% 50%, rgba(6,214,245,.07) 0%, transparent 60%);
    animation: bgPulse 9s ease-in-out infinite alternate;
  }
  @keyframes bgPulse { 0%{opacity:.7;transform:scale(1)} 100%{opacity:1;transform:scale(1.04)} }
  .rp-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(36,99,235,.06) 1px,transparent 1px), linear-gradient(90deg,rgba(36,99,235,.06) 1px,transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
  }
  .rp-orb { position: absolute; border-radius: 50%; filter: blur(90px); animation: floatOrb 14s ease-in-out infinite; }
  .rp-orb-1 { width:280px;height:280px;background:rgba(124,58,237,.22);top:-40px;right:-40px;animation-delay:0s; }
  .rp-orb-2 { width:220px;height:220px;background:rgba(36,99,235,.2);bottom:-40px;left:-40px;animation-delay:-5s; }
  .rp-orb-3 { width:150px;height:150px;background:rgba(6,214,245,.14);top:50%;left:15%;animation-delay:-9s; }
  @keyframes floatOrb { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-18px,18px) scale(1.07)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  .rp-page { position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem; }
  .rp-form-panel { display:flex;flex-direction:column;justify-content:center;align-items:center;padding:clamp(2rem,5vw,4rem); }
  .rp-card { width:100%;max-width:460px;background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:clamp(1.5rem,4vw,2.6rem);position:relative;overflow:hidden;animation:slideUp .7s cubic-bezier(.22,1,.36,1) both; }
  .rp-card::before { content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent2),var(--accent1),var(--accent3)); }
  .rp-logo { display:flex;align-items:center;gap:.75rem;margin-bottom:1.8rem; }
  .rp-logo-icon { width:40px;height:40px;background:linear-gradient(135deg,var(--accent1),var(--accent2));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem; }
  .rp-logo-text { font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;background:linear-gradient(135deg,var(--accent2),var(--accent1));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
  .rp-card-h { font-size:1.55rem;font-weight:700;margin-bottom:.4rem;letter-spacing:-.02em; }
  .rp-card-s { font-size:.88rem;color:var(--text-muted);margin-bottom:1.8rem; }
  .rp-steps { display:flex;align-items:center;margin-bottom:1.8rem; }
  .rp-step { display:flex;flex-direction:column;align-items:center;gap:.35rem;flex:1;position:relative; }
  .rp-step:not(:last-child)::after { content:'';position:absolute;top:14px;left:50%;right:-50%;height:2px;background:var(--border);z-index:0; }
  .rp-step.active:not(:last-child)::after { background:linear-gradient(90deg,var(--accent1),var(--border)); }
  .rp-step-circle { width:28px;height:28px;border-radius:50%;border:2px solid var(--border);background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:var(--text-muted);position:relative;z-index:1;transition:all .3s; }
  .rp-step.active .rp-step-circle { border-color:var(--accent1);background:rgba(36,99,235,.15);color:var(--accent2);box-shadow:0 0 12px rgba(36,99,235,.4); }
  .rp-step-name { font-size:.7rem;color:var(--text-muted);text-align:center;letter-spacing:.03em; }
  .rp-step.active .rp-step-name { color:var(--accent2); }
  .rp-row { display:grid;grid-template-columns:1fr 1fr;gap:.9rem; }
  .rp-fg { margin-bottom:1.1rem; }
  .rp-label { display:block;font-size:.82rem;font-weight:600;color:var(--text-label);margin-bottom:.45rem;letter-spacing:.03em; }
  .rp-iw { position:relative; }
  .rp-iw svg.ico { position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none;transition:color .2s; }
  .rp-input { width:100%;padding:.72rem .72rem .72rem 2.7rem;background:var(--bg-input);border:1px solid var(--border);border-radius:10px;color:var(--text-main);font-size:.9rem;font-family:'Space Grotesk',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s; }
  .rp-input::placeholder { color:var(--text-muted); }
  .rp-input:focus { border-color:var(--accent1);box-shadow:0 0 0 3px rgba(36,99,235,.15); }
  .rp-eye { position:absolute;right:14px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-muted);background:none;border:none;padding:0;display:flex;align-items:center;transition:color .2s; }
  .rp-eye:hover { color:var(--accent2); }
  .rp-strength { display:flex;gap:.3rem;height:3px;margin-top:.5rem; }
  .rp-strength span { flex:1;border-radius:4px;background:var(--border);transition:background .3s; }
  .rp-strength.s1 span:nth-child(1) { background:var(--danger); }
  .rp-strength.s2 span:nth-child(-n+2) { background:#ff9f43; }
  .rp-strength.s3 span:nth-child(-n+3) { background:#ffd32a; }
  .rp-strength.s4 span { background:var(--success); }
  .rp-hint { font-size:.75rem;color:var(--text-muted);margin-top:.35rem; }
  .rp-plans { display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin-bottom:1.1rem; }
  .rp-plan { cursor:pointer;padding:.7rem .5rem;border:1px solid var(--border);border-radius:10px;text-align:center;transition:border-color .2s,background .2s; }
  .rp-plan input { display:none; }
  .rp-plan-name { font-size:.82rem;font-weight:700;display:block; }
  .rp-plan-price { font-size:.73rem;color:var(--text-muted); }
  .rp-plan:hover { border-color:rgba(36,99,235,.5);background:rgba(36,99,235,.06); }
  .rp-plan.selected { border-color:var(--accent1);background:rgba(36,99,235,.1);box-shadow:0 0 12px rgba(36,99,235,.2); }
  .rp-plan.selected .rp-plan-name { color:var(--accent2); }
  .rp-chk { display:flex;align-items:flex-start;gap:.6rem;font-size:.84rem;color:var(--text-muted);cursor:pointer;line-height:1.5;margin-bottom:.8rem; }
  .rp-chk input[type=checkbox] { appearance:none;flex-shrink:0;width:16px;height:16px;margin-top:2px;border:1px solid var(--border);border-radius:4px;background:var(--bg-input);cursor:pointer;position:relative;transition:border-color .2s,background .2s; }
  .rp-chk input[type=checkbox]:checked { background:var(--accent1);border-color:var(--accent1); }
  .rp-chk input[type=checkbox]:checked::after { content:'';position:absolute;top:2px;left:5px;width:5px;height:9px;border:2px solid white;border-top:none;border-left:none;transform:rotate(45deg); }
  .rp-chk a { color:var(--accent2);text-decoration:none; }
  .rp-btn { width:100%;padding:.85rem;background:linear-gradient(135deg,var(--accent1),var(--accent2));border:none;border-radius:10px;color:#fff;font-size:.95rem;font-weight:700;font-family:'Space Grotesk',sans-serif;cursor:pointer;letter-spacing:.04em;position:relative;overflow:hidden;transition:transform .15s,box-shadow .2s;margin-top:.3rem; }
  .rp-btn:hover { transform:translateY(-2px);box-shadow:0 8px 32px rgba(36,99,235,.4); }
  .rp-btn:active { transform:translateY(0); }
  .rp-footer { text-align:center;margin-top:1.4rem;font-size:.87rem;color:var(--text-muted); }
  .rp-footer a { color:var(--accent2);text-decoration:none;font-weight:600; }
  .rp-hero { display:flex;flex-direction:column;justify-content:center;padding:clamp(2rem,6vw,5rem);overflow:hidden;animation:slideUp .7s .12s cubic-bezier(.22,1,.36,1) both; }
  .rp-badge { display:inline-flex;align-items:center;gap:.5rem;background:rgba(124,58,237,.12);border:1px solid rgba(124,58,237,.35);border-radius:100px;padding:.35rem 1rem;font-size:.78rem;font-weight:600;color:#a78bfa;letter-spacing:.06em;text-transform:uppercase;width:fit-content;margin-bottom:2rem; }
  .rp-badge::before { content:'';width:8px;height:8px;background:#a78bfa;border-radius:50%;animation:blink 2s ease-in-out infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
  .rp-title { font-family:'Syne',sans-serif;font-size:clamp(2.2rem,4vw,3.4rem);font-weight:800;line-height:1.08;letter-spacing:-.02em;margin-bottom:1.5rem; }
  .rp-highlight { background:linear-gradient(135deg,#a78bfa 0%,var(--accent1) 50%,var(--accent2) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
  .rp-sub { font-size:1rem;color:var(--text-muted);line-height:1.7;max-width:400px;margin-bottom:2.5rem; }
  .rp-plan-preview { display:flex;flex-direction:column;gap:.75rem; }
  .rp-plan-card { background:rgba(13,21,37,.7);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;display:flex;align-items:center;justify-content:space-between;backdrop-filter:blur(8px);transition:border-color .2s,transform .2s; }
  .rp-plan-card:hover { border-color:var(--accent1);transform:translateX(4px); }
  .rp-plan-card.feat { border-color:rgba(36,99,235,.5);background:rgba(36,99,235,.08); }
  .rp-plan-card-name { font-weight:700;font-size:.95rem; }
  .rp-plan-card-desc { font-size:.8rem;color:var(--text-muted);margin-top:.15rem; }
  .rp-plan-card-price { font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;color:var(--accent2);white-space:nowrap; }
  .rp-plan-card-price sub { font-size:.65rem;color:var(--text-muted);vertical-align:middle; }
  .rp-pop-tag { display:inline-block;background:linear-gradient(135deg,var(--accent1),var(--accent2));color:white;font-size:.68rem;font-weight:700;padding:.15rem .5rem;border-radius:100px;margin-left:.5rem;letter-spacing:.04em; }
  @media (max-width:900px) {
    .rp-page { grid-template-columns:1fr; }
    .rp-form-panel { border-right:none; }
    .rp-hero { border-top:1px solid var(--border);padding:2rem; }
    .rp-plan-preview { flex-direction:row;flex-wrap:wrap; }
    .rp-plan-card { min-width:160px;flex:1; }
  }
  @media (max-width:600px) {
    .rp-form-panel { padding:1.5rem 1rem; }
    .rp-card { padding:1.5rem 1.25rem; }
    .rp-row { grid-template-columns:1fr; }
    .rp-hero { padding:1.5rem 1rem; }
    .rp-plan-preview { flex-direction:column; }
  }
`;

function getStrength(val: string): { score: number; hint: string } {
  if (!val) return { score: 0, hint: "Use 8+ chars, numbers & symbols" };
  let s = 0;
  if (val.length >= 8) s++;
  if (/[A-Z]/.test(val)) s++;
  if (/[0-9]/.test(val)) s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  const hints = ["", "Weak — try adding numbers", "Fair — add uppercase & symbols", "Good — almost there!", "Strong password ✓"];
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

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await authAPI.register({
        username,
        email,
        password,
        purpose: purpose || undefined,
      });
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

      <div className="rp-bg">
        <div className="rp-grid" />
        <div className="rp-orb rp-orb-1" />
        <div className="rp-orb rp-orb-2" />
        <div className="rp-orb rp-orb-3" />
      </div>

      <div className="rp-page">
        {/* ── LEFT FORM ── */}
        <section className="rp-form-panel">
          <div className="rp-card">
            <div className="rp-logo">
              <div className="rp-logo-icon">⚡</div>
              <span className="rp-logo-text">AeroAuth</span>
            </div>
            <h2 className="rp-card-h">Create account</h2>
            <p className="rp-card-s">Join 50,000+ professionals today — it's free</p>

            {/* Steps */}
            <div className="rp-steps">
              {[["1","Account"],["2","Details"],["3","Done"]].map(([n,l],i) => (
                <div className={`rp-step${i===0?" active":""}`} key={n}>
                  <div className="rp-step-circle">{n}</div>
                  <span className="rp-step-name">{l}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ padding: '.75rem', marginBottom: '1rem', background: 'rgba(255,79,109,.15)', border: '1px solid rgba(255,79,109,.3)', borderRadius: '8px', color: '#ff4f6d', fontSize: '.85rem' }}>
                  {error}
                </div>
              )}

              {/* Username */}
              <div className="rp-fg">
                <label className="rp-label" htmlFor="rp-username">Username</label>
                <div className="rp-iw">
                  <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input id="rp-username" className="rp-input" type="text" placeholder="your_username" required
                    value={username} onChange={e=>setUsername(e.target.value)} />
                </div>
              </div>

              {/* Email */}
              <div className="rp-fg">
                <label className="rp-label" htmlFor="rp-email">Email Address</label>
                <div className="rp-iw">
                  <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input id="rp-email" className="rp-input" type="email" placeholder="you@example.com" required
                    value={email} onChange={e=>setEmail(e.target.value)} />
                </div>
              </div>

              {/* Purpose (optional) */}
              <div className="rp-fg">
                <label className="rp-label" htmlFor="rp-purpose">Purpose (Optional)</label>
                <div className="rp-iw">
                  <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  <input id="rp-purpose" className="rp-input" type="text" placeholder="Research, Education, etc."
                    value={purpose} onChange={e=>setPurpose(e.target.value)} />
                </div>
              </div>

              {/* Password */}
              <div className="rp-fg">
                <label className="rp-label" htmlFor="rp-pass">Password</label>
                <div className="rp-iw">
                  <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  <input id="rp-pass" className="rp-input" type={showPass?"text":"password"} placeholder="Min. 8 characters" required
                    value={password} onChange={e=>setPassword(e.target.value)} />
                  <button type="button" className="rp-eye" onClick={()=>setShowPass(!showPass)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
                {password && (
                  <>
                    <div className={`rp-strength${score>0?` s${score}`:""}`}>
                      <span/><span/><span/><span/>
                    </div>
                    <p className="rp-hint">{hint}</p>
                  </>
                )}
              </div>

              {/* Confirm */}
              <div className="rp-fg">
                <label className="rp-label" htmlFor="rp-confirm">Confirm Password</label>
                <div className="rp-iw">
                  <svg className="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  <input id="rp-confirm" className="rp-input" type={showConfirm?"text":"password"} placeholder="Repeat password" required
                    value={confirm} onChange={e=>setConfirm(e.target.value)} />
                  <button type="button" className="rp-eye" onClick={()=>setShowConfirm(!showConfirm)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </div>

              <button className="rp-btn" type="submit" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account →"}
              </button>
            </form>

            <div className="rp-footer">
              Already have an account? <a href="/login">Sign in</a>
            </div>
          </div>
        </section>


      </div>
    </>
  );
}