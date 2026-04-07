import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authAPI } from "../services/api";

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail]     = useState((location.state as any)?.email || "");
  const [otp, setOtp]         = useState("");
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await authAPI.verifyOTP(email, otp);
      setSuccess("Email verified! Redirecting to login…");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Verification failed.");
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setError(""); setSuccess(""); setResending(true);
    try { await authAPI.resendOTP(email); setSuccess("New OTP sent to your email."); }
    catch (err: any) { setError(err.response?.data?.detail || "Failed to resend OTP."); }
    finally { setResending(false); }
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .fi:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,.12)!important;outline:none;}
        .fb:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(37,99,235,.35)!important;}
      `}</style>

      <div style={s.card}>
        <div style={s.logoRow}>
          <img src="/logo.png" alt="" style={{ width:36, height:36, objectFit:'contain', borderRadius:10 }} />
          <span style={s.logoText}>SmartTracker</span>
        </div>

        <h2 style={s.title}>Verify your email</h2>
        <p style={s.sub}>
          We sent a 6-digit code to <strong style={{ color:'#0f172a' }}>{email || 'your email'}</strong>
        </p>

        {error   && <div style={s.errorBox}>{error}</div>}
        {success && <div style={s.successBox}>{success}</div>}

        <form onSubmit={handleVerify}>
          {!email && (
            <div style={s.field}>
              <label style={s.label}>Email Address</label>
              <input style={s.input} className="fi" type="email" placeholder="you@example.com"
                required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          )}

          <div style={s.field}>
            <label style={s.label}>6-digit OTP code</label>
            <input style={{ ...s.input, textAlign:'center', fontSize:22, fontWeight:800, letterSpacing:'0.5em', fontFamily:'"JetBrains Mono",monospace' }}
              className="fi" type="text" placeholder="——————"
              maxLength={6} required value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} />
            <p style={{ fontSize:11, color:'#94a3b8', marginTop:6, textAlign:'center' }}>
              Code expires in 10 minutes
            </p>
          </div>

          <button type="submit" disabled={loading} className="fb"
            style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Verifying…' : 'Verify Email'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:18, fontSize:13, color:'#64748b' }}>
          Didn't receive the code?{' '}
          <span onClick={handleResend}
            style={{ color:'#3b82f6', fontWeight:600, cursor: resending ? 'default' : 'pointer', opacity: resending ? 0.6 : 1 }}>
            {resending ? 'Sending…' : 'Resend OTP'}
          </span>
        </p>

        <p style={{ textAlign:'center', marginTop:10, fontSize:13 }}>
          <span onClick={() => navigate('/login')}
            style={{ color:'#94a3b8', cursor:'pointer' }}>
            Back to login
          </span>
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:       { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', fontFamily:'"Inter",sans-serif', padding:24 },
  card:       { width:'100%', maxWidth:420, background:'#fff', borderRadius:20, padding:'40px 36px', boxShadow:'0 4px 32px rgba(0,0,0,.08)', animation:'fadeUp .4s ease' },
  logoRow:    { display:'flex', alignItems:'center', gap:10, marginBottom:32 },
  logoText:   { fontSize:17, fontWeight:800, color:'#0f172a' },
  title:      { fontSize:26, fontWeight:800, color:'#0f172a', marginBottom:6 },
  sub:        { fontSize:14, color:'#64748b', marginBottom:28, lineHeight:1.5 },
  errorBox:   { padding:'12px 16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, color:'#dc2626', fontSize:13, fontWeight:500, marginBottom:18 },
  successBox: { padding:'12px 16px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, color:'#16a34a', fontSize:13, fontWeight:500, marginBottom:18 },
  field:      { marginBottom:18 },
  label:      { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:7 },
  input:      { width:'100%', padding:'13px 16px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:15, color:'#0f172a', background:'#f8fafc', transition:'all .2s', fontFamily:'"Inter",sans-serif' },
  btn:        { width:'100%', padding:'13px', background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', transition:'all .2s', boxShadow:'0 4px 14px rgba(37,99,235,.25)', fontFamily:'"Inter",sans-serif' },
};
