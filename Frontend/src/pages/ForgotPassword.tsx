import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#f1f5f9;font-family:'Space Grotesk',sans-serif;}
  .auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#e0e7ff 0%,#f1f5f9 50%,#dbeafe 100%);padding:1.5rem;}
  .auth-card{width:100%;max-width:420px;background:#fff;border-radius:20px;padding:2.5rem 2rem;box-shadow:0 4px 32px rgba(36,99,235,.10);animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .auth-logo{display:flex;align-items:center;gap:.6rem;margin-bottom:2rem;justify-content:center;}
  .auth-logo-icon{width:38px;height:38px;background:linear-gradient(135deg,#2463eb,#06d6f5);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;}
  .auth-logo-text{font-size:1.25rem;font-weight:700;color:#1e3a8a;}
  .auth-title{font-size:1.55rem;font-weight:700;color:#111827;text-align:center;margin-bottom:.35rem;}
  .auth-sub{font-size:.88rem;color:#6b7280;text-align:center;margin-bottom:2rem;}
  .auth-fg{margin-bottom:1.1rem;}
  .auth-label{display:block;font-size:.82rem;font-weight:600;color:#374151;margin-bottom:.45rem;}
  .auth-iw{position:relative;}
  .auth-input{width:100%;padding:.72rem .85rem;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:10px;color:#111827;font-size:.92rem;font-family:'Space Grotesk',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s;}
  .auth-input::placeholder{color:#9ca3af;}
  .auth-input:focus{border-color:#2463eb;box-shadow:0 0 0 3px rgba(36,99,235,.12);background:#fff;}
  .auth-btn{width:100%;padding:.82rem;background:linear-gradient(135deg,#2463eb,#06d6f5);border:none;border-radius:10px;color:#fff;font-size:.95rem;font-weight:700;font-family:'Space Grotesk',sans-serif;cursor:pointer;transition:transform .15s,box-shadow .2s;}
  .auth-btn:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(36,99,235,.35);}
  .auth-btn:disabled{opacity:.7;cursor:not-allowed;transform:none;}
  .auth-btn-ghost{background:transparent;border:1.5px solid #e5e7eb;color:#374151;margin-top:.65rem;}
  .auth-btn-ghost:hover{border-color:#2463eb;color:#2463eb;box-shadow:none;transform:none;}
  .auth-footer{text-align:center;margin-top:1.4rem;font-size:.87rem;color:#6b7280;}
  .auth-footer a{color:#2463eb;text-decoration:none;font-weight:600;cursor:pointer;}
  .step-indicator{display:flex;gap:.5rem;justify-content:center;margin-bottom:1.8rem;}
  .step-dot{width:8px;height:8px;border-radius:50%;background:#e5e7eb;transition:background .2s;}
  .step-dot.active{background:#2463eb;}
`

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep]         = useState<1|2>(1)
  const [email, setEmail]       = useState('')
  const [otp, setOtp]           = useState('')
  const [newPass, setNewPass]   = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.forgotPassword(email)
      toast.success('OTP sent to your email.')
      setStep(2)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP.')
    } finally { setLoading(false) }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.resetPassword(email, otp, newPass)
      toast.success('Password reset! Please sign in.')
      navigate('/login')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Reset failed. Check your OTP.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <style>{styles}</style>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">⚡</div>
            <span className="auth-logo-text">AeroFlow</span>
          </div>
          <div className="step-indicator">
            <div className={`step-dot${step >= 1 ? ' active' : ''}`}/>
            <div className={`step-dot${step >= 2 ? ' active' : ''}`}/>
          </div>
          <h2 className="auth-title">{step === 1 ? 'Forgot password' : 'Reset password'}</h2>
          <p className="auth-sub">{step === 1 ? "We'll send an OTP to your email" : `Enter the OTP sent to ${email}`}</p>

          {step === 1 ? (
            <form onSubmit={handleSendOTP}>
              <div className="auth-fg">
                <label className="auth-label" htmlFor="fp-email">Email address</label>
                <div className="auth-iw">
                  <input id="fp-email" className="auth-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required/>
                </div>
              </div>
              <button className="auth-btn" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send OTP'}</button>
              <button type="button" className="auth-btn auth-btn-ghost" onClick={() => navigate('/login')}>Back to Sign In</button>
            </form>
          ) : (
            <form onSubmit={handleReset}>
              <div className="auth-fg">
                <label className="auth-label" htmlFor="fp-otp">OTP Code</label>
                <input id="fp-otp" className="auth-input" type="text" maxLength={6} placeholder="000000" value={otp} onChange={e => setOtp(e.target.value)} required style={{letterSpacing:'.3em',textAlign:'center'}}/>
              </div>
              <div className="auth-fg">
                <label className="auth-label" htmlFor="fp-pass">New Password</label>
                <input id="fp-pass" className="auth-input" type="password" placeholder="••••••••" value={newPass} onChange={e => setNewPass(e.target.value)} required/>
              </div>
              <button className="auth-btn" type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
              <button type="button" className="auth-btn auth-btn-ghost" onClick={() => setStep(1)}>Back</button>
            </form>
          )}

          <div className="auth-footer">
            Remembered it? <a onClick={() => navigate('/login')}>Sign in</a>
          </div>
        </div>
      </div>
    </>
  )
}
