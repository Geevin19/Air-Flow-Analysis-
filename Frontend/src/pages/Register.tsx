import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#eef2f7;--surf:#ffffff;--surf2:#f5f8fc;--border:#dde3ec;--border2:#c5cfdf;--a1:#3b6fd4;--a2:#5b9bd5;--text:#1a2333;--muted:#6b7a90;--label:#44546a;--success:#2e9e6b;}
  body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh;overflow-x:hidden;}
  .bg-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
  .bg-canvas::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 100% 0%,rgba(91,155,213,.11) 0%,transparent 55%),radial-gradient(ellipse 55% 40% at 0% 100%,rgba(59,111,212,.07) 0%,transparent 50%);}
  .bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(59,111,212,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,111,212,.04) 1px,transparent 1px);background-size:36px 36px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
  .page{position:relative;z-index:1;min-height:100vh;display:grid;grid-template-columns:1fr 1fr;align-items:stretch;}
  .form-panel{display:flex;flex-direction:column;justify-content:center;align-items:center;padding:clamp(2rem,5vw,4rem);background:var(--surf2);border-right:1px solid var(--border);}
  .card{width:100%;max-width:440px;background:var(--surf);border:1px solid var(--border);border-radius:18px;padding:clamp(1.75rem,4vw,2.4rem);box-shadow:0 4px 24px rgba(59,111,212,.07),0 1px 3px rgba(0,0,0,.04);animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both;}
  .c-logo{display:flex;align-items:center;gap:.55rem;margin-bottom:1.6rem;text-decoration:none;}
  .c-logo-icon{width:32px;height:32px;background:linear-gradient(135deg,var(--a1),var(--a2));border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.9rem;box-shadow:0 2px 8px rgba(59,111,212,.18);}
  .c-logo-name{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.1rem;font-weight:800;color:var(--a1);}
  .c-title{font-size:1.38rem;font-weight:700;color:var(--text);letter-spacing:-.02em;margin-bottom:.3rem;}
  .c-sub{font-size:.84rem;color:var(--muted);margin-bottom:1.6rem;}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;}
  .fg{margin-bottom:1rem;}
  .lbl{display:block;font-size:.79rem;font-weight:600;color:var(--label);margin-bottom:.4rem;letter-spacing:.02em;}
  .iw{position:relative;}
  .iw svg.ico{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--border2);pointer-events:none;transition:color .18s;}
  .iw:focus-within svg.ico{color:var(--a1);}
  .inp{width:100%;padding:.7rem .7rem .7rem 2.45rem;background:var(--surf2);border:1.5px solid var(--border);border-radius:8px;color:var(--text);font-size:.88rem;font-family:'Inter',sans-serif;outline:none;transition:border-color .18s,box-shadow .18s,background .18s;}
  .inp::placeholder{color:#b8c4d4;}
  .inp:focus{border-color:var(--a1);background:var(--surf);box-shadow:0 0 0 3px rgba(59,111,212,.09);}
  .eye{position:absolute;right:11px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--border2);background:none;border:none;padding:0;display:flex;align-items:center;transition:color .18s;}
  .eye:hover{color:var(--a1);}
  .strength{display:flex;gap:.28rem;height:3px;margin-top:.45rem;}
  .strength span{flex:1;border-radius:4px;background:var(--border);transition:background .25s;}
  .strength.s1 span:nth-child(1){background:#d95f5f;}
  .strength.s2 span:nth-child(-n+2){background:#e8943a;}
  .strength.s3 span:nth-child(-n+3){background:#c9a832;}
  .strength.s4 span{background:var(--success);}
  .str-hint{font-size:.73rem;color:var(--muted);margin-top:.3rem;}
  .btn{width:100%;padding:.78rem;margin-top:.4rem;background:linear-gradient(135deg,var(--a1),var(--a2));border:none;border-radius:8px;color:#fff;font-size:.9rem;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;letter-spacing:.02em;transition:transform .15s,box-shadow .18s;box-shadow:0 3px 12px rgba(59,111,212,.28);}
  .btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 18px rgba(59,111,212,.32);}
  .btn:active{transform:translateY(0);}
  .btn:disabled{opacity:.58;cursor:not-allowed;}
  .c-foot{text-align:center;margin-top:1.3rem;font-size:.82rem;color:var(--muted);}
  .c-foot a{color:var(--a1);text-decoration:none;font-weight:600;}
  .c-foot a:hover{text-decoration:underline;}
  .hero{display:flex;flex-direction:column;justify-content:center;padding:clamp(2.5rem,6vw,5rem);animation:fadeUp .5s .1s cubic-bezier(.22,1,.36,1) both;}
  .brand{display:flex;align-items:center;gap:.65rem;margin-bottom:3rem;text-decoration:none;width:fit-content;}
  .brand-icon{width:38px;height:38px;background:linear-gradient(135deg,var(--a1),var(--a2));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;box-shadow:0 2px 10px rgba(59,111,212,.22);}
  .brand-name{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.25rem;font-weight:800;color:var(--a1);letter-spacing:-.01em;}
  .eyebrow{display:inline-flex;align-items:center;gap:.42rem;background:rgba(59,111,212,.07);border:1px solid rgba(59,111,212,.16);border-radius:100px;padding:.28rem .85rem;font-size:.73rem;font-weight:600;color:var(--a1);letter-spacing:.06em;text-transform:uppercase;width:fit-content;margin-bottom:1.5rem;}
  .eyebrow::before{content:'';width:6px;height:6px;background:var(--a2);border-radius:50%;animation:blink 2.2s ease-in-out infinite;}
  .h-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(1.9rem,3.5vw,3rem);font-weight:800;line-height:1.12;letter-spacing:-.03em;color:var(--text);margin-bottom:1rem;}
  .h-title .ac{color:var(--a1);}
  .h-sub{font-size:.93rem;color:var(--muted);line-height:1.75;max-width:380px;margin-bottom:2.5rem;}
  .info-cards{display:flex;flex-direction:column;gap:.75rem;}
  .info-card{background:var(--surf);border:1px solid var(--border);border-radius:12px;padding:1rem 1.25rem;display:flex;align-items:center;gap:1rem;transition:border-color .18s,transform .18s;box-shadow:0 1px 4px rgba(59,111,212,.05);}
  .info-card:hover{border-color:var(--a2);transform:translateX(3px);}
  .ic-icon{width:38px;height:38px;flex-shrink:0;border-radius:9px;background:rgba(59,111,212,.08);border:1px solid rgba(59,111,212,.14);display:flex;align-items:center;justify-content:center;font-size:1.1rem;}
  .ic-title{font-size:.9rem;font-weight:600;color:var(--text);}
  .ic-desc{font-size:.78rem;color:var(--muted);margin-top:.1rem;}
  @media(max-width:860px){.page{grid-template-columns:1fr}.form-panel{border-right:none}.hero{border-top:1px solid var(--border);padding:2.5rem 1.5rem 2rem}.h-title{font-size:clamp(1.7rem,6vw,2.3rem)}.info-cards{flex-direction:row;flex-wrap:wrap}.info-card{flex:1;min-width:180px}}
  @media(max-width:520px){.form-panel{padding:1.5rem 1rem}.card{padding:1.5rem 1.2rem;border-radius:14px}.two-col{grid-template-columns:1fr}.hero{padding:1.75rem 1.2rem}.info-cards{flex-direction:column}}
`

function getStrength(val: string) {
  if (!val) return { score:0, hint:'Use 8+ characters with numbers & symbols' }
  let s = 0
  if (val.length>=8) s++
  if (/[A-Z]/.test(val)) s++
  if (/[0-9]/.test(val)) s++
  if (/[^A-Za-z0-9]/.test(val)) s++
  return { score:s, hint:['','Weak — add numbers or uppercase','Fair — add a symbol','Good — almost there!','Strong password ✓'][s] }
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({fname:'',lname:'',email:'',company:'',password:'',confirm:''})
  const [showPass, setShowPass] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [loading, setLoading] = useState(false)
  const {score,hint} = getStrength(form.password)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f=>({...f,[k]:e.target.value}))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fname||!form.lname||!form.email||!form.password){toast.error('Please fill in all required fields');return}
    if (form.password!==form.confirm){toast.error('Passwords do not match');return}
    if (score<2){toast.error('Please choose a stronger password');return}
    setLoading(true)
    try {
      const res = await authAPI.register({first_name:form.fname,last_name:form.lname,email:form.email,company:form.company||undefined,password:form.password})
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      toast.success('Account created! Welcome to AeroFlow 🎉')
      navigate('/dashboard')
    } catch(err:any){
      toast.error(err.response?.data?.detail||'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <>
      <style>{S}</style>
      <div className="bg-canvas"><div className="bg-grid"/></div>
      <div className="page">
        <section className="form-panel">
          <div className="card">
            <Link to="/" className="c-logo"><div className="c-logo-icon">⚡</div><span className="c-logo-name">AeroFlow</span></Link>
            <h2 className="c-title">Create account</h2>
            <p className="c-sub">Get started in under 2 minutes — no credit card needed</p>
            <form onSubmit={handleSubmit}>
              <div className="two-col">
                <div className="fg">
                  <label className="lbl">First name *</label>
                  <div className="iw">
                    <svg className="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <input className="inp" type="text" placeholder="Jane" value={form.fname} onChange={set('fname')}/>
                  </div>
                </div>
                <div className="fg">
                  <label className="lbl">Last name *</label>
                  <div className="iw">
                    <svg className="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <input className="inp" type="text" placeholder="Smith" value={form.lname} onChange={set('lname')}/>
                  </div>
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Email address *</label>
                <div className="iw">
                  <svg className="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input className="inp" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')}/>
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Company <span style={{fontWeight:400,color:'var(--muted)'}}>— optional</span></label>
                <div className="iw">
                  <svg className="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <input className="inp" type="text" placeholder="Acme Corp" value={form.company} onChange={set('company')}/>
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Password *</label>
                <div className="iw">
                  <svg className="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <input className="inp" type={showPass?'text':'password'} placeholder="Min. 8 characters" value={form.password} onChange={set('password')}/>
                  <button type="button" className="eye" onClick={()=>setShowPass(!showPass)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
                {form.password && (
                  <>
                    <div className={`strength${score>0?` s${score}`:''}`}><span/><span/><span/><span/></div>
                    <p className="str-hint">{hint}</p>
                  </>
                )}
              </div>
              <div className="fg">
                <label className="lbl">Confirm password *</label>
                <div className="iw">
                  <svg className="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <input className="inp" type={showConf?'text':'password'} placeholder="Repeat password" value={form.confirm} onChange={set('confirm')}/>
                  <button type="button" className="eye" onClick={()=>setShowConf(!showConf)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <button className="btn" type="submit" disabled={loading}>{loading?'Creating account…':'Create Account →'}</button>
            </form>
            <div className="c-foot">Already have an account? <Link to="/login">Sign in</Link></div>
          </div>
        </section>

        <section className="hero">
          <Link to="/" className="brand"><div className="brand-icon">⚡</div><span className="brand-name">AeroFlow</span></Link>
          <span className="eyebrow">Free to get started</span>
          <h1 className="h-title">Build. Simulate.<br/><span className="ac">Optimise.</span></h1>
          <p className="h-sub">Create your account and start running aerodynamic simulations immediately. No setup required.</p>
          <div className="info-cards">
            {[
              {icon:'🌊',title:'CFD Simulation Engine', desc:'Physics-based drag, lift & pressure calculations'},
              {icon:'📊',title:'Interactive Charts',    desc:'Flow velocity, pressure & turbulence profiles'},
              {icon:'🚗',title:'Multi-Vehicle Support', desc:'Cars, trucks, aircraft, drones & more'},
              {icon:'⚡',title:'Instant Results',       desc:'Full simulation output in under 2 seconds'},
            ].map(c=>(
              <div className="info-card" key={c.title}>
                <div className="ic-icon">{c.icon}</div>
                <div><div className="ic-title">{c.title}</div><div className="ic-desc">{c.desc}</div></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}