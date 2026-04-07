import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Syne+Mono&family=Space+Grotesk:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #060608; font-family: 'Space Grotesk', sans-serif; }
  .auth-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #060608; padding: 1.5rem; position: relative; overflow: hidden;
  }
  .auth-grid {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background-image: linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: grid-scroll 8s linear infinite;
  }
  @keyframes grid-scroll { to { background-position: 0 40px; } }
  .auth-canvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }
  .auth-scan {
    position: fixed; inset: 0; z-index: 2; pointer-events: none; overflow: hidden;
  }
  .auth-scan::after {
    content: ''; position: absolute; left: 0; right: 0; height: 2px; top: 0;
    background: linear-gradient(90deg, transparent, rgba(0,229,255,0.15), transparent);
    animation: scan-line 6s linear infinite;
  }
  @keyframes scan-line { 0% { top: -10%; } 100% { top: 110%; } }
  .auth-card {
    width: 100%; max-width: 420px; background: rgba(12,12,16,0.85);
    backdrop-filter: blur(16px); border: 1px solid rgba(0,229,255,0.2);
    padding: 2.5rem 2rem; position: relative; z-index: 10;
    box-shadow: 0 0 0 1px rgba(0,229,255,0.1), 0 20px 60px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,229,255,0.08);
    animation: fadeUp .6s cubic-bezier(.22,1,.36,1) both;
  }
  @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
  .auth-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, #00E5FF, transparent);
  }
  .auth-corners span {
    position: absolute; width: 12px; height: 12px;
  }
  .auth-corners span:nth-child(1) { top: -1px; left: -1px; border-top: 2px solid rgba(0,229,255,0.5); border-left: 2px solid rgba(0,229,255,0.5); }
  .auth-corners span:nth-child(2) { top: -1px; right: -1px; border-top: 2px solid rgba(0,229,255,0.5); border-right: 2px solid rgba(0,229,255,0.5); }
  .auth-corners span:nth-child(3) { bottom: -1px; left: -1px; border-bottom: 2px solid rgba(0,229,255,0.5); border-left: 2px solid rgba(0,229,255,0.5); }
  .auth-corners span:nth-child(4) { bottom: -1px; right: -1px; border-bottom: 2px solid rgba(0,229,255,0.5); border-right: 2px solid rgba(0,229,255,0.5); }
  .auth-logo { display:flex;align-items:center;gap:.8rem;margin-bottom:2rem;justify-content:center; }
  .auth-logo-icon { width:38px;height:38px;display:flex;align-items:center;justify-content:center;overflow:hidden; }
  .auth-logo-text { font-size:1.25rem;font-weight:900;font-family:'Orbitron',sans-serif;letter-spacing:.15em;
    background:linear-gradient(135deg,#00E5FF 0%,#9D4EDD 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-transform:uppercase; }
  .auth-badge {
    display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px;
    background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.3);
    font-size: 10px; font-family: 'Syne Mono', monospace; letter-spacing: 0.2em;
    color: #00E5FF; margin-bottom: 24px; text-transform: uppercase;
  }
  .auth-badge-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #00E5FF;
    box-shadow: 0 0 8px #00E5FF; animation: blink 1.8s ease infinite;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  .auth-title { font-size:1.8rem;font-weight:900;font-family:'Orbitron',sans-serif;letter-spacing:.08em;
    background:linear-gradient(135deg,#EEF0F7 0%,#00E5FF 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;
    text-align:center;margin-bottom:.5rem;text-transform:uppercase; }
  .auth-sub { font-size:.85rem;font-family:'Syne Mono',monospace;color:rgba(124,126,146,1);text-align:center;margin-bottom:2rem;letter-spacing:.05em; }
  .auth-fg { margin-bottom:1.2rem; }
  .auth-label { display:block;font-size:.75rem;font-weight:700;font-family:'Syne Mono',monospace;letter-spacing:.12em;
    color:rgba(200,210,230,0.7);margin-bottom:.5rem;text-transform:uppercase; }
  .auth-iw { position:relative; }
  .auth-iw svg.ico { position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#00E5FF;pointer-events:none;opacity:0.6; }
  .auth-input {
    width:100%;padding:.85rem .85rem .85rem 2.8rem;
    background:rgba(10,20,40,0.6);border:1px solid rgba(0,229,255,0.2);
    color:#EEF0F7;font-size:.92rem;font-family:'Space Grotesk',sans-serif;outline:none;
    transition:border-color .2s,box-shadow .2s;
  }
  .auth-input::placeholder { color:rgba(124,126,146,0.5); }
  .auth-input:focus { border-color:#00E5FF;box-shadow:0 0 0 1px rgba(0,229,255,0.3), 0 0 20px rgba(0,229,255,0.15);background:rgba(10,20,40,0.8); }
  .auth-eye { position:absolute;right:14px;top:50%;transform:translateY(-50%);cursor:pointer;color:rgba(0,229,255,0.6);background:none;border:none;padding:0;display:flex;align-items:center;transition:color .2s; }
  .auth-eye:hover { color:#00E5FF; }
  .auth-opts { display:flex;align-items:center;justify-content:space-between;margin-bottom:1.6rem; }
  .auth-forgot { font-size:.8rem;color:#00E5FF;text-decoration:none;font-weight:600;font-family:'Syne Mono',monospace;letter-spacing:.05em;transition:color .2s; }
  .auth-forgot:hover { color:#9D4EDD; }
  .auth-btn {
    width:100%;padding:.95rem;background:linear-gradient(135deg,#00E5FF 0%,#9D4EDD 100%);
    border:1px solid rgba(0,229,255,0.5);color:#060608;font-size:.95rem;font-weight:900;
    font-family:'Orbitron',sans-serif;cursor:pointer;letter-spacing:.12em;text-transform:uppercase;
    transition:all .2s;box-shadow:0 0 30px rgba(0,229,255,0.4), inset 0 0 30px rgba(0,229,255,0.15);
  }
  .auth-btn:hover { transform:translateY(-2px);box-shadow:0 0 40px rgba(0,229,255,0.6), inset 0 0 40px rgba(0,229,255,0.25); }
  .auth-btn:disabled { opacity:.6;cursor:not-allowed;transform:none; }
  .auth-footer { text-align:center;margin-top:1.6rem;font-size:.85rem;font-family:'Syne Mono',monospace;color:rgba(124,126,146,0.7);letter-spacing:.05em; }
  .auth-footer a { color:#00E5FF;text-decoration:none;font-weight:600;transition:color .2s; }
  .auth-footer a:hover { color:#9D4EDD; }
  .auth-error { padding:.8rem 1.1rem;margin-bottom:1.2rem;background:rgba(255,56,100,0.12);border:1px solid rgba(255,56,100,0.3);color:#FF3864;font-size:.85rem;font-family:'Syne Mono',monospace;letter-spacing:.03em; }
`;

function NeuralCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const nodes = Array.from({ length: 30 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
      r: Math.random() * 2 + 1, ph: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? [0, 229, 255] : [157, 78, 221],
    }));
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 150) {
            const a = (1 - d / 150) * 0.08;
            ctx.beginPath(); ctx.strokeStyle = `rgba(${nodes[i].color.join(',')},${a})`; ctx.lineWidth = 0.6;
            ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          }
        }
      }
      nodes.forEach(p => {
        p.ph += 0.008; const pulse = 0.5 + 0.5 * Math.sin(p.ph); const [r, g, b] = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.8 + 0.4 * pulse), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + 0.5 * pulse})`; ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={ref} className="auth-canvas" />;
}

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
        <div className="auth-grid" />
        <NeuralCanvas />
        <div className="auth-scan" />
        
        <div className="auth-card">
          <div className="auth-corners">
            <span/><span/><span/><span/>
          </div>
          
          <div className="auth-logo">
            <div className="auth-logo-icon"><img src="/logo.png" alt="SmartTracker" style={{width:'38px',height:'38px',objectFit:'contain'}} /></div>
            <span className="auth-logo-text">SmartTracker</span>
          </div>
          
          <div className="auth-badge" style={{display:'flex',justifyContent:'center',width:'100%'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:'8px'}}>
              <span className="auth-badge-dot" />
              SECURE ACCESS
            </div>
          </div>
          
          <h2 className="auth-title">System Login</h2>
          <p className="auth-sub">// authenticate credentials</p>

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
              {loading ? "Authenticating..." : "Access System →"}
            </button>
          </form>

          <div className="auth-footer">
            No account? <a onClick={() => navigate("/register")} style={{ cursor: "pointer" }}>Initialize new user</a>
          </div>
        </div>
      </div>
    </>
  );
}
