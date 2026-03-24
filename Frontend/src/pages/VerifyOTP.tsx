import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  .auth-input{width:100%;padding:.72rem .85rem;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:10px;color:#111827;font-size:1.2rem;letter-spacing:.3em;text-align:center;font-family:'Space Grotesk',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s;}
  .auth-input:focus{border-color:#2463eb;box-shadow:0 0 0 3px rgba(36,99,235,.12);background:#fff;}
  .auth-btn{width:100%;padding:.82rem;background:linear-gradient(135deg,#2463eb,#06d6f5);border:none;border-radius:10px;color:#fff;font-size:.95rem;font-weight:700;font-family:'Space Grotesk',sans-serif;cursor:pointer;transition:transform .15s,box-shadow .2s;}
  .auth-btn:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(36,99,235,.35);}
  .auth-btn:disabled{opacity:.7;cursor:not-allowed;transform:none;}
  .auth-footer{text-align:center;margin-top:1.4rem;font-size:.87rem;color:#6b7280;}
  .auth-footer a{color:#2463eb;text-decoration:none;font-weight:600;cursor:pointer;}
`

export default function VerifyOTP() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state as any)?.email || ''
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.verifyOTP(email, otp)
      toast.success('Email verified! Please sign in.')
      navigate('/login')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid OTP. Please try again.')
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    try {
      await authAPI.resendOTP(email)
      toast.success('OTP resent to your email.')
    } catch { toast.error('Failed to resend OTP.') }
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
          <h2 className="auth-title">Verify your email</h2>
          <p className="auth-sub">Enter the OTP sent to <strong>{email || 'your email'}</strong></p>
          <form onSubmit={handleSubmit}>
            <div className="auth-fg">
              <label className="auth-label" htmlFor="otp">One-Time Password</label>
              <input id="otp" className="auth-input" type="text" maxLength={6} placeholder="000000" value={otp} onChange={e => setOtp(e.target.value)} required/>
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify Email'}</button>
          </form>
          <div className="auth-footer">
            Didn't receive it? <a onClick={handleResend}>Resend OTP</a>
          </div>
        </div>
      </div>
    </>
  )
}
