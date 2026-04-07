import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await authAPI.login(username, password);
      localStorage.setItem("token", res.data.access_token);
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Login failed. Please check your credentials.";
      if (msg.includes("verify your email")) {
        setError("Please verify your email first.");
        setTimeout(() => navigate("/verify-otp", { state: { email: "" } }), 1500);
      } else { setError(msg); }
    } finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .fi:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,.12)!important;outline:none;}
        .fb:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(37,99,235,.35)!important;}
        .fl:hover{color:#1d4ed8!important;}
      `}</style>

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoRow}>
          <img src="/logo.png" alt="" style={{ width:36, height:36, objectFit:'contain', borderRadius:10 }} />
          <span style={s.logoText}>SmartTracker</span>
        </div>

        <h2 style={s.title}>Welcome back</h2>
        <p style={s.sub}>Sign in to your account</p>

        {error && <div style={s.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Username</label>
            <input style={s.input} className="fi" type="text" placeholder="Enter your username"
              required value={username} onChange={e => setUsername(e.target.value)} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Password</label>
            <div style={{ position:'relative' }}>
              <input style={s.input} className="fi" type={showPw ? "text" : "password"}
                placeholder="Enter your password" required value={password}
                onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#94a3b8', fontFamily:'"Inter",sans-serif' }}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div style={{ textAlign:'right', marginBottom:24 }}>
            <span className="fl" onClick={() => navigate("/forgot-password")}
              style={{ fontSize:13, color:'#3b82f6', cursor:'pointer', fontWeight:500 }}>
              Forgot password?
            </span>
          </div>

          <button type="submit" disabled={loading} className="fb"
            style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={s.footer}>
          Don't have an account?{' '}
          <span className="fl" onClick={() => navigate("/register")}
            style={{ color:'#3b82f6', cursor:'pointer', fontWeight:600 }}>
            Create account
          </span>
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:     { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', fontFamily:'"Inter",sans-serif', padding:24 },
  card:     { width:'100%', maxWidth:420, background:'#fff', borderRadius:20, padding:'40px 36px', boxShadow:'0 4px 32px rgba(0,0,0,.08)', animation:'fadeUp .4s ease' },
  logoRow:  { display:'flex', alignItems:'center', gap:10, marginBottom:32 },
  logoText: { fontSize:17, fontWeight:800, color:'#0f172a' },
  title:    { fontSize:26, fontWeight:800, color:'#0f172a', marginBottom:6 },
  sub:      { fontSize:14, color:'#64748b', marginBottom:28 },
  errorBox: { padding:'12px 16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, color:'#dc2626', fontSize:13, fontWeight:500, marginBottom:20 },
  field:    { marginBottom:18 },
  label:    { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:7 },
  input:    { width:'100%', padding:'12px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, color:'#0f172a', background:'#f8fafc', transition:'all .2s', fontFamily:'"Inter",sans-serif' },
  btn:      { width:'100%', padding:'13px', background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', transition:'all .2s', boxShadow:'0 4px 14px rgba(37,99,235,.25)', fontFamily:'"Inter",sans-serif' },
  footer:   { textAlign:'center', marginTop:24, fontSize:14, color:'#64748b' },
};
