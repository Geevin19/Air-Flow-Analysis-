import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

type Step = "email" | "otp" | "password";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep]       = useState<Step>("email");
  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState("");
  const [newPw, setNewPw]     = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try { await authAPI.forgotPassword(email); setSuccess("OTP sent to your email."); setStep("otp"); }
    catch (err: any) { setError(err.response?.data?.detail || "Failed to send OTP."); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setStep("password");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await authAPI.resetPassword(email, otp, newPw);
      setSuccess("Password reset! Redirecting…");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Reset failed."); setStep("otp");
    } finally { setLoading(false); }
  };

  const steps: Step[] = ['email', 'otp', 'password'];
  const stepLabels = ['Email', 'Verify', 'Reset'];

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

        {/* Step progress */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:32 }}>
          {steps.map((st, i) => (
            <div key={st} style={{ display:'flex', alignItems:'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700,
                  background: steps.indexOf(step) > i ? '#3b82f6' : steps.indexOf(step) === i ? '#eff6ff' : '#f1f5f9',
                  border: `2px solid ${steps.indexOf(step) >= i ? '#3b82f6' : '#e2e8f0'}`,
                  color: steps.indexOf(step) > i ? '#fff' : steps.indexOf(step) === i ? '#3b82f6' : '#94a3b8' }}>
                  {steps.indexOf(step) > i ? '✓' : i + 1}
                </div>
                <span style={{ fontSize:10, fontWeight:600, color: steps.indexOf(step) >= i ? '#3b82f6' : '#94a3b8', whiteSpace:'nowrap' }}>
                  {stepLabels[i]}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex:1, height:2, background: steps.indexOf(step) > i ? '#3b82f6' : '#e2e8f0', margin:'0 8px', marginBottom:20, transition:'background .3s' }} />
              )}
            </div>
          ))}
        </div>

        {error   && <div style={s.errorBox}>{error}</div>}
        {success && <div style={s.successBox}>{success}</div>}

        {step === 'email' && (
          <>
            <h2 style={s.title}>Forgot password?</h2>
            <p style={s.sub}>Enter your email and we'll send a reset code.</p>
            <form onSubmit={handleSendOTP}>
              <div style={s.field}>
                <label style={s.label}>Email Address</label>
                <input style={s.input} className="fi" type="email" placeholder="you@example.com"
                  required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button type="submit" disabled={loading} className="fb"
                style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Sending…' : 'Send Reset Code'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <h2 style={s.title}>Enter reset code</h2>
            <p style={s.sub}>Check your inbox for the 6-digit code sent to <strong style={{ color:'#0f172a' }}>{email}</strong>.</p>
            <form onSubmit={handleVerifyOTP}>
              <div style={s.field}>
                <label style={s.label}>6-digit code</label>
                <input style={{ ...s.input, textAlign:'center', fontSize:22, fontWeight:800, letterSpacing:'0.5em', fontFamily:'"JetBrains Mono",monospace' }}
                  className="fi" type="text" placeholder="——————"
                  maxLength={6} required value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} />
              </div>
              <button type="submit" className="fb" style={s.btn}>Continue</button>
            </form>
          </>
        )}

        {step === 'password' && (
          <>
            <h2 style={s.title}>New password</h2>
            <p style={s.sub}>Choose a strong new password for your account.</p>
            <form onSubmit={handleReset}>
              <div style={s.field}>
                <label style={s.label}>New Password</label>
                <div style={{ position:'relative' }}>
                  <input style={s.input} className="fi" type={showPw ? "text" : "password"}
                    placeholder="Min. 8 characters" required minLength={8}
                    value={newPw} onChange={e => setNewPw(e.target.value)} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#94a3b8', fontFamily:'"Inter",sans-serif' }}>
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="fb"
                style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#94a3b8', cursor:'pointer' }}
          onClick={() => navigate('/login')}>
          Back to login
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:       { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', fontFamily:'"Inter",sans-serif', padding:24 },
  card:       { width:'100%', maxWidth:440, background:'#fff', borderRadius:20, padding:'40px 36px', boxShadow:'0 4px 32px rgba(0,0,0,.08)', animation:'fadeUp .4s ease' },
  logoRow:    { display:'flex', alignItems:'center', gap:10, marginBottom:32 },
  logoText:   { fontSize:17, fontWeight:800, color:'#0f172a' },
  title:      { fontSize:24, fontWeight:800, color:'#0f172a', marginBottom:6 },
  sub:        { fontSize:14, color:'#64748b', marginBottom:24, lineHeight:1.5 },
  errorBox:   { padding:'12px 16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, color:'#dc2626', fontSize:13, fontWeight:500, marginBottom:18 },
  successBox: { padding:'12px 16px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, color:'#16a34a', fontSize:13, fontWeight:500, marginBottom:18 },
  field:      { marginBottom:18 },
  label:      { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:7 },
  input:      { width:'100%', padding:'12px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, color:'#0f172a', background:'#f8fafc', transition:'all .2s', fontFamily:'"Inter",sans-serif' },
  btn:        { width:'100%', padding:'13px', background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', transition:'all .2s', boxShadow:'0 4px 14px rgba(37,99,235,.25)', fontFamily:'"Inter",sans-serif' },
};
