import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#eef2f7;--surf:#ffffff;--surf2:#f5f8fc;--border:#dde3ec;--border2:#c5cfdf;--a1:#3b6fd4;--a2:#5b9bd5;--text:#1a2333;--muted:#6b7a90;--label:#44546a;}
  body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh;overflow-x:hidden;}
  .bg-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
  .bg-canvas::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 65% 55% at 0% 0%,rgba(91,155,213,.13) 0%,transparent 55%),radial-gradient(ellipse 55% 45% at 100% 100%,rgba(59,111,212,.08) 0%,transparent 50%);}
  .bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(59,111,212,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(59,111,212,.045) 1px,transparent 1px);background-size:36px 36px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
  .page{position:relative;z-index:1;min-height:100vh;display:grid;grid-template-columns:1fr 1fr;align-items:stretch;}
  .hero{display:flex;flex-direction:column;justify-content:center;padding:clamp(2.5rem,6vw,5rem);border-right:1px solid var(--border);animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both;}
  .brand{display:flex;align-items:center;gap:.65rem;margin-bottom:3.5rem;text-decoration:none;width:fit-content;}
  .brand-icon{width:38px;height:38px;background:linear-gradient(135deg,var(--a1),var(--a2));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;box-shadow:0 2px 10px rgba(59,111,212,.22);}
  .brand-name{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.25rem;font-weight:800;color:var(--a1);letter-spacing:-.01em;}
  .eyebrow{display:inline-flex;align-items:center;gap:.42rem;background:rgba(59,111,212,.07);border:1px solid rgba(59,111,212,.16);border-radius:100px;padding:.28rem .85rem;font-size:.73rem;font-weight:600;color:var(--a1);letter-spacing:.06em;text-transform:uppercase;width:fit-content;margin-bottom:1.5rem;}
  .eyebrow::before{content:'';width:6px;height:6px;background:var(--a2);border-radius:50%;animation:blink 2.2s ease-in-out infinite;}
  .h-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(1.9rem,3.5vw,3rem);font-weight:800;line-height:1.12;letter-spacing:-.03em;color:var(--text);margin-bottom:1.1rem;}
  .h-title .ac{color:var(--a1);}
  .h-sub{font-size:.95rem;color:var(--muted);line-height:1.75;max-width:390px;margin-bottom:2.8rem;}
  .feat-list{list-style:none;display:flex;flex-direction:column;gap:.8rem;margin-bottom:2.8rem;}
  .feat-list li{display:flex;align-items:center;gap:.65rem;font-size:.88rem;color:var(--label);}
  .f-check{width:19px;height:19px;flex-shrink:0;border-radius:50%;background:rgba(59,111,212,.09);border:1px solid rgba(59,111,212,.22);display:flex;align-items:center;justify-content:center;color:var(--a1);font-size:.6rem;font-weight:700;}
  .stat-row{display:flex;gap:2rem;flex-wrap:wrap;padding-top:2rem;border-top:1px solid var(--border);}
  .stat{display:flex;flex-direction:column;gap:.12rem;}
  .s-val{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.5rem;font-weight:800;color:var(--a1);}
  .s-lbl{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;}
  .form-panel{display:flex;flex-direction:column;justify-content:center;align-items:center;padding:clamp(2rem,5vw,4rem);background:var(--surf2);}
  .card{width:100%;max-width:420px;background:var(--surf);border:1px solid var(--border);border-radius:18px;padding:clamp(1.75rem,4vw,2.5rem);box-shadow:0 4px 24px rgba(59,111,212,.07),0 1px 3px rgba(0,0,0,.04);animation:fadeUp .5s .1s cubic-bezier(.22,1,.36,1) both;}
  .c-logo{display:flex;align-items:center;gap:.6rem;margin-bottom:1.8rem;text-decoration:none;}
  .c-logo-icon{width:34px;height:34px;background:linear-gradient(135deg,var(--a1),var(--a2));border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1rem;box-shadow:0 2px 8px rgba(59,111,212,.2);}
  .c-logo-name{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.15rem;font-weight:800;color:var(--a1);}
  .c-title{font-size:1.42rem;font-weight:700;color:var(--text);letter-spacing:-.02em;margin-bottom:.3rem;}
  .c-sub{font-size:.86rem;color:var(--muted);margin-bottom:1.7rem;}
  .soc-row{display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin-bottom:1.4rem;}
  .soc-btn{display:flex;align-items:center;justify-content:center;gap:.45rem;padding:.62rem;border:1px solid var(--border);border-radius:9px;background:var(--surf);color:var(--label);font-size:.83rem;font-weight:500;font-family:'Inter',sans-serif;cursor:pointer;transition:border-color .18s,background .18s,box-shadow .18s;}
  .soc-btn:hover{border-color:var(--a2);background:rgba(59,111,212,.04);box-shadow:0 2px 8px rgba(59,111,212,.09);}
  .sep{display:flex;align-items:center;gap:.85rem;font-size:.77rem;color:var(--muted);margin-bottom:1.4rem;}
  .sep::before,.sep::after{content:'';flex:1;height:1px;background:var(--border);}
  .fg{margin-bottom:1rem;}
  .lbl{display:block;font-size:.79rem;font-weight:600;color:var(--label);margin-bottom:.4rem;letter-spacing:.02em;}
  .iw{position:relative;}
  .iw svg.ico{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--border2);pointer-events:none;transition:color .18s;}
  .iw:focus-within svg.ico{color:var(--a1);}
  .inp{width:100%;padding:.7rem .7rem .7rem 2.5rem;background:var(--surf2);border:1.5px solid var(--border);border-radius:8px;color:var(--text);font-size:.88rem;font-family:'Inter',sans-serif;outline:none;transition:border-color .18s,box-shadow .18s,background .18s;}
  .inp::placeholder{color:#b8c4d4;}
  .inp:focus{border-color:var(--a1);background:var(--surf);box-shadow:0 0 0 3px rgba(59,111,212,.09);}
  .eye{position:absolute;right:11px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--border2);background:none;border:none;padding:0;display:flex;align-items:center;transition:color .18s;}
  .eye:hover{color:var(--a1);}
  .opts{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.3rem;flex-wrap:wrap;gap:.4rem;}
  .chk{display:flex;align-items:center;gap:.4rem;font-size:.81rem;color:var(--muted);cursor:pointer;}
  .chk input[type=checkbox]{appearance:none;width:15px;height:15px;border:1.5px solid var(--border2);border-radius:4px;background:var(--surf);cursor:pointer;position:relative;transition:all .18s;}
  .chk input[type=checkbox]:checked{background:var(--a1);border-color:var(--a1);}
  .chk input[type=checkbox]:checked::after{content:'';position:absolute;top:2px;left:4px;width:5px;height:8px;border:2px solid white;border-top:none;border-left:none;transform:rotate(45deg);}
  .forgot{font-size:.81rem;color:var(--a1);font-weight:500;text-decoration:none;transition:color .18s;}
  .forgot:hover{color:var(--a2);}
  .btn{width:100%;padding:.78rem;background:linear-gradient(135deg,var(--a1),var(--a2));border:none;border-radius:8px;color:#fff;font-size:.9rem;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;letter-spacing:.02em;transition:transform .15s,box-shadow .18s;box-shadow:0 3px 12px rgba(59,111,212,.28);}
  .btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 18px rgba(59,111,212,.32);}
  .btn:active{transform:translateY(0);}
  .btn:disabled{opacity:.58;cursor:not-allowed;}
  .c-foot{text-align:center;margin-top:1.3rem;font-size:.82rem;color:var(--muted);}
  .c-foot a{color:var(--a1);text-decoration:none;font-weight:600;}
  .c-foot a:hover{text-decoration:underline;}
  @media(max-width:860px){.page{grid-template-columns:1fr}.hero{border-right:none;border-bottom:1px solid var(--border);padding:2.5rem 1.5rem 2rem}.h-title{font-size:clamp(1.7rem,6vw,2.3rem)}.feat-list{display:none}}
  @media(max-width:520px){.hero{padding:2rem 1.2rem 1.75rem}.form-panel{padding:1.5rem 1rem}.card{padding:1.5rem 1.2rem;border-radius:14px}.soc-row{grid-template-columns:1fr}}
`

export default function Login() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try {
      const res = await authAPI.login({ email, password })
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      toast.success(`Welcome back, ${res.data.user.first_name}!`)
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid email or password')
    } finally { setLoading(false) }
  }

  return (
    <>
      <style>{S}</style>
      <div className="bg-canvas"><div className="bg-grid"/></div>
      <div className="page">
        <section className="hero">
          <Link to="/" className="brand"><div className="brand-icon">⚡</div><span className="brand-name">AeroFlow</span></Link>
          <span className="eyebrow">Trusted Platform</span>
          <h1 className="h-title">Welcome back<br/>to <span className="ac">AeroFlow</span></h1>
          <p className="h-sub">Sign in to access your simulations, manage projects, and run cloud-based aerodynamic analysis in seconds.</p>
          <ul className="feat-list">
            {['Real-time CFD simulations','Drag, lift & pressure analysis','Interactive flow visualisation','Multi-vehicle support'].map(f=>(
              <li key={f}><span className="f-check">✓</span>{f}</li>
            ))}
          </ul>
          <div className="stat-row">
            {[['50K+','Active users'],['99.9%','Uptime'],['< 2s','Avg compute']].map(([v,l])=>(
              <div className="stat" key={l}><span className="s-val">{v}</span><span className="s-lbl">{l}</span></div>
            ))}
          </div>
        </section>

        <section className="form-panel">
          <div className="card">
            <Link to="/" className="c-logo"><div className="c-logo-icon">⚡</div><span className="c-logo-name">AeroFlow</span></Link>
            <h2 className="c-title">Sign in</h2>
            <p className="c-sub">Enter your credentials to continue</p>
            <div className="soc-row">
              <button className="soc-btn" type="button" onClick={()=>toast('OAuth coming soon!')}>
                <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
              <button className="soc-btn" type="button" onClick={()=>toast('OAuth coming soon!')}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#1a2333"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
              </button>
            </div>
            <div className="sep">or sign in with email</div>
            <form onSubmit={handleSubmit}>
              <div className="fg">
                <label className="lbl" htmlFor="l-email">Email address</label>
                <div className="iw">
                  <svg className="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input id="l-email" className="inp" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/>
                </div>
              </div>
              <div className="fg">
                <label className="lbl" htmlFor="l-pass">Password</label>
                <div className="iw">
                  <svg className="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <input id="l-pass" className="inp" type={showPass?'text':'password'} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/>
                  <button type="button" className="eye" onClick={()=>setShowPass(!showPass)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <div className="opts">
                <label className="chk"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Remember me</label>
                <a href="#" className="forgot">Forgot password?</a>
              </div>
              <button className="btn" type="submit" disabled={loading}>{loading?'Signing in…':'Sign In →'}</button>
            </form>
            <div className="c-foot">Don't have an account? <Link to="/register">Create one</Link></div>
          </div>
        </section>
      </div>
    </>
  )
}