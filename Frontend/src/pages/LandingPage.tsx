import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#eef2f7;--surf:#ffffff;--surf2:#f5f8fc;--border:#dde3ec;--a1:#3b6fd4;--a2:#5b9bd5;--text:#1a2333;--muted:#6b7a90;--label:#44546a;}
  body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;overflow-x:hidden;}
  .bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
  .bg::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 65% 50% at 0% 0%,rgba(91,155,213,.12) 0%,transparent 55%),radial-gradient(ellipse 55% 45% at 100% 100%,rgba(59,111,212,.07) 0%,transparent 50%);}
  .bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(59,111,212,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,111,212,.04) 1px,transparent 1px);background-size:36px 36px;}
  .wrap{position:relative;z-index:1;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  .hero{min-height:calc(100vh - 62px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4rem clamp(1rem,5vw,3rem);animation:fadeUp .55s cubic-bezier(.22,1,.36,1) both;}
  .hero-eyebrow{display:inline-flex;align-items:center;gap:.42rem;background:rgba(59,111,212,.07);border:1px solid rgba(59,111,212,.16);border-radius:100px;padding:.28rem .85rem;font-size:.73rem;font-weight:600;color:var(--a1);letter-spacing:.06em;text-transform:uppercase;margin-bottom:1.8rem;}
  .hero-eyebrow::before{content:'';width:6px;height:6px;background:var(--a2);border-radius:50%;animation:blink 2.2s ease-in-out infinite;}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
  .hero-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(2.6rem,6vw,4.8rem);font-weight:800;line-height:1.06;letter-spacing:-.03em;color:var(--text);margin-bottom:1.4rem;}
  .hero-title .ac{color:var(--a1);}
  .hero-sub{font-size:clamp(.95rem,2vw,1.1rem);color:var(--muted);line-height:1.8;max-width:560px;margin-bottom:2.4rem;}
  .ctas{display:flex;gap:.85rem;flex-wrap:wrap;justify-content:center;}
  .btn-p{padding:.82rem 1.9rem;background:linear-gradient(135deg,var(--a1),var(--a2));border:none;border-radius:9px;color:#fff;font-size:.92rem;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:.45rem;transition:transform .18s,box-shadow .18s;box-shadow:0 3px 12px rgba(59,111,212,.28);}
  .btn-p:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(59,111,212,.35);}
  .btn-g{padding:.82rem 1.9rem;border:1px solid var(--border);border-radius:9px;color:var(--label);font-size:.92rem;font-weight:500;font-family:'Inter',sans-serif;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;transition:border-color .18s,color .18s,background .18s;}
  .btn-g:hover{border-color:var(--a2);color:var(--a1);background:rgba(59,111,212,.04);}
  .stats-band{padding:2.5rem clamp(1rem,5vw,3rem);border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--surf2);}
  .stats-inner{max-width:900px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;text-align:center;}
  .sn{font-family:'Plus Jakarta Sans',sans-serif;font-size:2rem;font-weight:800;color:var(--a1);}
  .sl{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-top:.15rem;}
  .section{padding:clamp(3.5rem,7vw,6rem) clamp(1rem,5vw,3rem);}
  .section-inner{max-width:1180px;margin:0 auto;}
  .sec-label{font-size:.73rem;font-weight:600;color:var(--a1);letter-spacing:.1em;text-transform:uppercase;margin-bottom:.9rem;}
  .sec-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(1.7rem,3.5vw,2.6rem);font-weight:800;letter-spacing:-.02em;color:var(--text);margin-bottom:.9rem;line-height:1.15;}
  .sec-title .ac{color:var(--a1);}
  .sec-sub{font-size:.95rem;color:var(--muted);line-height:1.7;max-width:500px;margin-bottom:2.8rem;}
  .feat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:1.25rem;}
  .feat-card{background:var(--surf);border:1px solid var(--border);border-radius:14px;padding:1.6rem;transition:border-color .18s,transform .18s;box-shadow:0 1px 4px rgba(59,111,212,.04);}
  .feat-card:hover{border-color:rgba(59,111,212,.3);transform:translateY(-2px);}
  .feat-icon{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;margin-bottom:1rem;}
  .feat-title{font-size:.95rem;font-weight:700;color:var(--text);margin-bottom:.45rem;}
  .feat-desc{font-size:.85rem;color:var(--muted);line-height:1.65;}
  .steps-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:1.25rem;}
  .step-card{background:var(--surf);border:1px solid var(--border);border-radius:14px;padding:1.6rem;box-shadow:0 1px 4px rgba(59,111,212,.04);}
  .step-num{font-family:'Plus Jakarta Sans',sans-serif;font-size:2.4rem;font-weight:800;color:var(--a1);line-height:1;margin-bottom:.7rem;}
  .step-title{font-size:.95rem;font-weight:700;color:var(--text);margin-bottom:.4rem;}
  .step-desc{font-size:.84rem;color:var(--muted);line-height:1.65;}
  .cta-banner{margin:0 clamp(1rem,5vw,3rem) 4.5rem;background:rgba(59,111,212,.05);border:1px solid rgba(59,111,212,.15);border-radius:18px;padding:clamp(2rem,5vw,4rem);text-align:center;}
  .cta-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(1.6rem,3.5vw,2.4rem);font-weight:800;letter-spacing:-.02em;color:var(--text);margin-bottom:.9rem;}
  .cta-sub{color:var(--muted);font-size:.95rem;margin-bottom:2rem;max-width:440px;margin-left:auto;margin-right:auto;}
  .footer{border-top:1px solid var(--border);padding:1.8rem clamp(1rem,5vw,3rem);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;}
  .footer-logo{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.05rem;font-weight:800;color:var(--a1);}
  .footer-copy{font-size:.8rem;color:var(--muted);}
  @media(max-width:700px){.stats-inner{grid-template-columns:repeat(2,1fr)}.ctas{flex-direction:column;align-items:center}}
`

const features = [
  {icon:'🌊',bg:'rgba(59,111,212,.08)',title:'CFD Simulation Engine',desc:'Physics-based drag, lift and pressure calculations using validated aerodynamics models.'},
  {icon:'📊',bg:'rgba(91,155,213,.08)',title:'Real-time Visualisation',desc:'Interactive charts for flow velocity, pressure distribution and turbulence intensity.'},
  {icon:'⚡',bg:'rgba(59,111,212,.08)',title:'Instant Results',desc:'Full simulation output in under 2 seconds — no queue times or hardware required.'},
  {icon:'🚗',bg:'rgba(46,158,107,.08)',title:'Multi-Vehicle Support',desc:'Cars, trucks, motorcycles, aircraft, drones and custom geometries supported.'},
  {icon:'🔬',bg:'rgba(91,155,213,.08)',title:'Reynolds Analysis',desc:'Automatic Reynolds number calculation with laminar, transitional and turbulent detection.'},
  {icon:'📁',bg:'rgba(59,111,212,.08)',title:'Project Management',desc:'Save, compare and iterate on simulations. Build a full configuration library.'},
]

const steps = [
  {n:'01',title:'Configure Parameters',desc:'Enter velocity, air density, frontal area, drag coefficient and angle of attack.'},
  {n:'02',title:'Run Simulation',desc:'Our engine computes drag, lift, Reynolds number and the full flow field.'},
  {n:'03',title:'Analyse Results',desc:'Explore interactive charts: velocity profiles, pressure distributions and power requirements.'},
  {n:'04',title:'Iterate & Optimise',desc:'Compare configurations side by side and fine-tune for peak aerodynamic efficiency.'},
]

export default function LandingPage() {
  return (
    <>
      <style>{S}</style>
      <div className="bg"><div className="bg-grid"/></div>
      <div className="wrap">
        <Navbar variant="landing"/>

        <section className="hero" id="home">
          <span className="hero-eyebrow">Cloud-based CFD Platform</span>
          <h1 className="hero-title">Aerodynamics<br/><span className="ac">Made Simple</span></h1>
          <p className="hero-sub">Run professional-grade computational fluid dynamics simulations in your browser. Analyse drag, lift and pressure distributions for any vehicle — instantly.</p>
          <div className="ctas">
            <Link to="/register" className="btn-p">Start for Free →</Link>
            <Link to="/login"    className="btn-g">Sign In</Link>
          </div>
        </section>

        <div className="stats-band">
          <div className="stats-inner">
            {[['50K+','Simulations Run'],['99.9%','Uptime'],['< 2s','Avg Compute'],['200+','Vehicle Profiles']].map(([n,l])=>(
              <div key={l}><div className="sn">{n}</div><div className="sl">{l}</div></div>
            ))}
          </div>
        </div>

        <section className="section" id="features">
          <div className="section-inner">
            <div className="sec-label">Platform Capabilities</div>
            <h2 className="sec-title">Everything you need to<br/><span className="ac">analyse airflow</span></h2>
            <p className="sec-sub">From quick drag estimates to full pressure distribution analysis — all in one unified platform.</p>
            <div className="feat-grid">
              {features.map(f=>(
                <div className="feat-card" key={f.title}>
                  <div className="feat-icon" style={{background:f.bg}}>{f.icon}</div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="how-it-works" style={{background:'var(--surf2)',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>
          <div className="section-inner">
            <div className="sec-label">Workflow</div>
            <h2 className="sec-title">How it <span className="ac">works</span></h2>
            <p className="sec-sub">From configuration to insight in four simple steps.</p>
            <div className="steps-grid">
              {steps.map(s=>(
                <div className="step-card" key={s.n}>
                  <div className="step-num">{s.n}</div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-inner">
            <div className="cta-banner">
              <h2 className="cta-title">Ready to optimise your <span style={{color:'var(--a1)'}}>aerodynamics?</span></h2>
              <p className="cta-sub">Join thousands of engineers using AeroFlow to build faster, more efficient vehicles.</p>
              <Link to="/register" className="btn-p">Create Free Account →</Link>
            </div>
          </div>
        </section>

        <footer className="footer">
          <span className="footer-logo">⚡ AeroFlow</span>
          <span className="footer-copy">© {new Date().getFullYear()} AeroFlow. Built for engineers.</span>
        </footer>
      </div>
    </>
  )
}