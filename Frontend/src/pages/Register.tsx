import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, api } from "../services/api";

function getStrength(v: string) {
  if (!v) return { score: 0, label: '', color: '#e2e8f0' };
  let s = 0;
  if (v.length >= 8) s++; if (/[A-Z]/.test(v)) s++; if (/[0-9]/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
  return { score: s, label: labels[s], color: colors[s] };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername]       = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [purpose, setPurpose]         = useState("");
  const [role, setRole]               = useState<'worker'|'manager'>('worker');
  const [managerCode, setManagerCode] = useState("");
  const [managers, setManagers]       = useState<{id:number;username:string;manager_code:string}[]>([]);
  const [showPw, setShowPw]           = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const { score, label, color }       = getStrength(password);

  useEffect(() => {
    api.get('/managers').then(r => setManagers(r.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (role === 'worker' && !managerCode.trim()) {
      setError("Workers must enter their Manager Code to register"); return;
    }
    setLoading(true);
    try {
      await authAPI.register({
        username, email, password,
        purpose: purpose || undefined,
        role,
        manager_code: role === 'worker' ? managerCode.trim().toUpperCase() : undefined,
      } as any);
      navigate("/verify-otp", { state: { email } });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed");
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
        <div style={s.logoRow}>
          <img src="/logo.png" alt="" style={{ width:36, height:36, objectFit:'contain', borderRadius:10 }} />
          <span style={s.logoText}>SmartTracker</span>
        </div>

        <h2 style={s.title}>Create account</h2>
        <p style={s.sub}>Join SmartTracker — it's free</p>

        {error && <div style={s.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Username</label>
            <input style={s.input} className="fi" type="text" placeholder="username"
              required value={username} onChange={e => setUsername(e.target.value)} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Purpose <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional)</span></label>
            <input style={s.input} className="fi" type="text" placeholder="Research, Education, etc."
              value={purpose} onChange={e => setPurpose(e.target.value)} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} className="fi" type="email" placeholder="you@example.com"
              required value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Role</label>
            <div style={{ display:'flex', gap:10 }}>
              {(['worker','manager'] as const).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  style={{ flex:1, padding:'10px', border:`1.5px solid ${role===r?'#3b82f6':'#e2e8f0'}`, borderRadius:10, background: role===r?'#eff6ff':'#f8fafc', color: role===r?'#1d4ed8':'#64748b', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'"Inter",sans-serif', textTransform:'capitalize' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {role === 'worker' && (
            <div style={s.field}>
              <label style={s.label}>
                Manager Code <span style={{ color:'#ef4444', fontWeight:700 }}>*</span>
              </label>
              {managers.length > 0 ? (
                <select style={{ ...s.input, cursor:'pointer' }}
                  value={managerCode} onChange={e => setManagerCode(e.target.value)} required>
                  <option value="">-- Select your manager --</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.manager_code}>
                      {m.username} — {m.manager_code}
                    </option>
                  ))}
                </select>
              ) : (
                <input style={s.input} className="fi" type="text"
                  placeholder="e.g. MGR-GEEVIN-4821" required
                  value={managerCode} onChange={e => setManagerCode(e.target.value.toUpperCase())} />
              )}
              <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                Ask your manager for their unique code — required to register as a worker
              </p>
            </div>
          )}

          <div style={s.field}>
            <label style={s.label}>Password</label>
            <div style={{ position:'relative' }}>
              <input style={s.input} className="fi" type={showPw ? "text" : "password"}
                placeholder="Min. 8 characters" required value={password}
                onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#94a3b8', fontFamily:'"Inter",sans-serif' }}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {password && (
              <div style={{ marginTop:8 }}>
                <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i <= score ? color : '#e2e8f0', transition:'background .3s' }} />
                  ))}
                </div>
                <span style={{ fontSize:11, color, fontWeight:600 }}>{label}</span>
              </div>
            )}
          </div>

          <div style={s.field}>
            <label style={s.label}>Confirm Password</label>
            <input style={s.input} className="fi" type="password"
              placeholder="Repeat password" required value={confirm}
              onChange={e => setConfirm(e.target.value)} />
            {confirm && password !== confirm && (
              <p style={{ fontSize:11, color:'#ef4444', marginTop:4 }}>Passwords don't match</p>
            )}
          </div>

          <button type="submit" disabled={loading} className="fb"
            style={{ ...s.btn, opacity: loading ? 0.7 : 1, marginTop:4 }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={s.footer}>
          Already have an account?{' '}
          <span className="fl" onClick={() => navigate("/login")}
            style={{ color:'#3b82f6', cursor:'pointer', fontWeight:600 }}>
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:     { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', fontFamily:'"Inter",sans-serif', padding:24 },
  card:     { width:'100%', maxWidth:460, background:'#fff', borderRadius:20, padding:'40px 36px', boxShadow:'0 4px 32px rgba(0,0,0,.08)', animation:'fadeUp .4s ease' },
  logoRow:  { display:'flex', alignItems:'center', gap:10, marginBottom:32 },
  logoText: { fontSize:17, fontWeight:800, color:'#0f172a' },
  title:    { fontSize:26, fontWeight:800, color:'#0f172a', marginBottom:6 },
  sub:      { fontSize:14, color:'#64748b', marginBottom:28 },
  errorBox: { padding:'12px 16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, color:'#dc2626', fontSize:13, fontWeight:500, marginBottom:20 },
  field:    { marginBottom:14 },
  label:    { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:7 },
  input:    { width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, color:'#0f172a', background:'#f8fafc', transition:'all .2s', fontFamily:'"Inter",sans-serif' },
  btn:      { width:'100%', padding:'13px', background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', transition:'all .2s', boxShadow:'0 4px 14px rgba(37,99,235,.25)', fontFamily:'"Inter",sans-serif' },
  footer:   { textAlign:'center', marginTop:24, fontSize:14, color:'#64748b' },
};
