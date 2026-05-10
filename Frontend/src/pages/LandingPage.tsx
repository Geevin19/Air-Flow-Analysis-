import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.6);opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        @keyframes dash { to { stroke-dashoffset: 0; } }
        .hero-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(59,130,246,.45) !important; }
        .calc-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(245,158,11,.45) !important; }
        .sec-btn:hover { background: #f0f7ff !important; }
        .feat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,.08) !important; }
        .nav-link:hover { color: #3b82f6 !important; }
        @media(max-width:767px){
          .landing-nav{padding:12px 16px!important;}
          .landing-nav-links{display:none!important;}
          .landing-hero{padding:48px 16px 36px!important;}
          .landing-hero-title{font-size:clamp(28px,8vw,48px)!important;}
          .landing-hero-sub{font-size:15px!important;}
          .landing-hero-btns{flex-direction:column!important;align-items:center!important;}
          .landing-hero-btns a{width:100%!important;max-width:300px!important;justify-content:center!important;}
          .landing-stats{grid-template-columns:1fr 1fr!important;gap:0!important;}
          .landing-stats>div{border-right:none!important;border-bottom:1px solid #f1f5f9;padding:14px 0!important;}
          .landing-feat-grid{grid-template-columns:1fr!important;}
          .landing-steps{flex-direction:column!important;gap:20px!important;}
          .landing-step-arrow{display:none!important;}
          .landing-cta{padding:40px 16px!important;}
          .landing-footer{padding:16px!important;flex-direction:column!important;text-align:center!important;}
          .landing-feat-section{padding:48px 16px!important;}
          .landing-how-section{padding:48px 16px!important;}
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={s.nav} className="landing-nav">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/logo.png" alt="" style={{ width:34, height:34, objectFit:'contain', borderRadius:8 }} />
          <span style={s.logo}>SmartTracker</span>
        </div>
        {/* Desktop links */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }} className="landing-nav-links">
          <Link to="/calculator" className="nav-link" style={s.navLink}>Calculator</Link>
          <Link to="/login" className="nav-link" style={s.navLink}>Sign In</Link>
          <Link to="/register" className="hero-btn" style={s.navCta}>Get Started →</Link>
        </div>
        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(v => !v)}
          style={{ display:'none', background:'none', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:18, color:'#374151' }}
          className="show-mobile">
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>
      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'12px 16px', display:'flex', flexDirection:'column', gap:8, zIndex:49, position:'relative' }}>
          <Link to="/calculator" style={{ padding:'10px 14px', borderRadius:8, color:'#374151', textDecoration:'none', fontWeight:600, fontSize:14, background:'#f8fafc' }} onClick={() => setMenuOpen(false)}>Calculator</Link>
          <Link to="/login" style={{ padding:'10px 14px', borderRadius:8, color:'#374151', textDecoration:'none', fontWeight:600, fontSize:14, background:'#f8fafc' }} onClick={() => setMenuOpen(false)}>Sign In</Link>
          <Link to="/register" style={{ padding:'12px 14px', borderRadius:10, color:'#fff', textDecoration:'none', fontWeight:700, fontSize:14, background:'linear-gradient(135deg,#2563eb,#7c3aed)', textAlign:'center' as const }} onClick={() => setMenuOpen(false)}>Get Started →</Link>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={s.hero} className="landing-hero">
        {/* Background grid */}
        <div style={s.gridBg} />
        <div style={s.gradBlob1} />
        <div style={s.gradBlob2} />

        <div style={{ position:'relative', zIndex:2, textAlign:'center', animation:'fadeUp .7s ease both' }}>
          <div style={s.heroBadge}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', display:'inline-block', marginRight:7, boxShadow:'0 0 0 0 #22c55e', animation:'pulse-ring 1.5s infinite' }} />
            Live IoT · Real-time CFD · Physics Engine
          </div>

          <h1 style={s.heroTitle} className="landing-hero-title">
            Airflow Analysis<br />
            <span style={s.heroAccent}>Reimagined</span>
          </h1>

          <p style={s.heroSub} className="landing-hero-sub">
            Stream live sensor data from Arduino, compute fluid dynamics in real-time,<br />
            and visualise 3D pipe flow — all in one platform.
          </p>

          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }} className="landing-hero-btns">
            <Link to="/register" className="hero-btn" style={s.primaryBtn}>
              Get Started — it's free
            </Link>
            <Link to="/calculator" className="calc-btn" style={s.calculatorBtn}>
              Calculator
            </Link>
            <Link to="/login" className="sec-btn" style={s.secondaryBtn}>
              Sign In
            </Link>
          </div>

          {/* Stats row */}
          <div style={s.statsRow} className="landing-stats">
            {[
              { val:'Real-time', label:'Data Streaming' },
              { val:'6+',        label:'Physics Metrics' },
              { val:'3D',        label:'CFD Visualisation' },
              { val:'WiFi',      label:'Arduino / ESP32' },
            ].map(st => (
              <div key={st.label} style={s.statItem}>
                <div style={s.statVal}>{st.val}</div>
                <div style={s.statLabel}>{st.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={s.featSection} className="landing-feat-section">
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={s.sectionTag}>What's inside</div>
          <h2 style={s.sectionTitle}>Everything you need</h2>
          <p style={s.sectionSub}>From raw sensor bytes to publication-ready physics — in seconds.</p>
        </div>

        <div style={s.featGrid} className="landing-feat-grid">
          {[
            {
              icon: '⚡',
              num: '00',
              title: 'Smart Calculator',
              desc: 'Professional calculator with glassmorphism design, voice feedback, and advanced mathematical functions.',
              color: '#f59e0b',
            },
            {
              icon: '🌊',
              num: '01',
              title: 'Real-time CFD',
              desc: 'Interactive 3D pipe visualisation with live particle flow, pressure heatmaps, and 5 pipe shapes.',
              color: '#3b82f6',
            },
            {
              icon: '📡',
              num: '02',
              title: 'IoT Integration',
              desc: 'Arduino / ESP32 streams data over WiFi via WebSocket. Zero latency, no polling.',
              color: '#8b5cf6',
            },
            {
              icon: '⚗️',
              num: '03',
              title: 'Physics Engine',
              desc: 'Humidity-corrected air density, Reynolds number, dynamic pressure, mass flow rate — computed live.',
              color: '#f59e0b',
            },
            {
              icon: '📊',
              num: '04',
              title: 'Live Charts',
              desc: 'Sparkline charts for every sensor and derived physics value, updating every second.',
              color: '#10b981',
            },
            {
              icon: '🔐',
              num: '05',
              title: 'Secure Auth',
              desc: 'OTP email verification, JWT tokens, forgot-password flow — production-ready security.',
              color: '#ef4444',
            },
            {
              icon: '💾',
              num: '06',
              title: 'Simulation History',
              desc: 'Save, name, and revisit any simulation. Compare runs side by side from your dashboard.',
              color: '#0ea5e9',
            },
          ].map(f => (
            <div key={f.num} className="feat-card" style={{ ...s.featCard, '--accent': f.color } as React.CSSProperties}>
              <div style={{ ...s.featIconBox, background: f.color + '14', border: `1px solid ${f.color}30` }}>
                <span style={{ fontSize:22 }}>{f.icon}</span>
              </div>
              <div style={{ ...s.featNum, color: f.color }}>{f.num}</div>
              <h3 style={s.featTitle}>{f.title}</h3>
              <p style={s.featDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={s.howSection} className="landing-how-section">
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <div style={s.sectionTag}>Workflow</div>
          <h2 style={s.sectionTitle}>How it works</h2>
        </div>
        <div style={s.stepsRow} className="landing-steps">
          {[
            { n:'1', title:'Connect Arduino', desc:'Flash your ESP32/Arduino with the WebSocket client sketch and connect to WiFi.' },
            { n:'2', title:'Stream Live Data', desc:'Sensor readings (temp, humidity, pressure) are pushed to the backend instantly.' },
            { n:'3', title:'Physics Computed', desc:'Air density, velocity, Reynolds number and more are derived automatically.' },
            { n:'4', title:'Visualise & Save', desc:'Watch live charts update, run 3D CFD simulations, and save results.' },
          ].map((step, i) => (
            <div key={step.n} style={{ display:'flex', alignItems:'flex-start', gap:20, flex:1, minWidth:200 }}>
              <div style={s.stepNum}>{step.n}</div>
              <div style={{ flex:1 }}>
                <div style={s.stepTitle}>{step.title}</div>
                <div style={s.stepDesc}>{step.desc}</div>
              </div>
              {i < 3 && <div style={s.stepArrow} className="landing-step-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={s.ctaBanner} className="landing-cta">
        <div style={s.ctaGlow} />
        <div style={{ position:'relative', zIndex:1, textAlign:'center' }}>
          <h2 style={s.ctaTitle}>Ready to analyse airflow?</h2>
          <p style={s.ctaSub}>Create a free account and connect your Arduino in minutes.</p>
          <Link to="/register" className="hero-btn" style={{ ...s.primaryBtn, fontSize:16, padding:'15px 40px' }}>
            Start for free →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer} className="landing-footer">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <img src="/logo.png" alt="" style={{ width:22, height:22, objectFit:'contain', borderRadius:4, opacity:.7 }} />
          <span style={{ fontWeight:700, color:'#94a3b8' }}>SmartTracker</span>
        </div>
        <span style={{ color:'#cbd5e1', fontSize:13 }}>© 2026 · Airflow Simulation Platform</span>
        <div style={{ display:'flex', gap:20 }}>
          <Link to="/calculator" style={{ color:'#94a3b8', textDecoration:'none', fontSize:13 }}>Calculator</Link>
          <Link to="/login" style={{ color:'#94a3b8', textDecoration:'none', fontSize:13 }}>Sign In</Link>
          <Link to="/register" style={{ color:'#94a3b8', textDecoration:'none', fontSize:13 }}>Register</Link>
        </div>
      </footer>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight:'100vh', background:'#ffffff', fontFamily:'"Inter",sans-serif', color:'#0f172a', overflowX:'hidden' },

  // nav
  nav: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 48px', background:'rgba(255,255,255,.9)', backdropFilter:'blur(12px)', borderBottom:'1px solid #f1f5f9', position:'sticky', top:0, zIndex:50 },
  logo: { fontSize:18, fontWeight:800, color:'#0f172a', letterSpacing:'-0.02em' },
  navLink: { color:'#64748b', textDecoration:'none', fontSize:14, fontWeight:500, padding:'6px 12px', borderRadius:8, transition:'color .2s' },
  navCta: { padding:'9px 20px', background:'#1d4ed8', color:'#fff', textDecoration:'none', fontSize:14, fontWeight:700, borderRadius:10, transition:'all .2s', boxShadow:'0 2px 8px rgba(29,78,216,.3)' },

  // hero
  hero: { position:'relative', padding:'100px 24px 80px', textAlign:'center', overflow:'hidden', background:'linear-gradient(180deg,#f8faff 0%,#ffffff 100%)' },
  gridBg: { position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(59,130,246,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.05) 1px,transparent 1px)', backgroundSize:'48px 48px', pointerEvents:'none' },
  gradBlob1: { position:'absolute', top:'-20%', left:'10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 70%)', pointerEvents:'none' },
  gradBlob2: { position:'absolute', top:'10%', right:'5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,.1) 0%,transparent 70%)', pointerEvents:'none' },

  heroBadge: { display:'inline-flex', alignItems:'center', padding:'6px 16px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:999, fontSize:12, fontWeight:600, color:'#15803d', marginBottom:28, letterSpacing:'0.02em' },
  heroTitle: { fontSize:'clamp(40px,6vw,76px)', fontWeight:900, color:'#0f172a', lineHeight:1.08, letterSpacing:'-0.03em', marginBottom:24 },
  heroAccent: { background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' },
  heroSub: { fontSize:18, color:'#64748b', lineHeight:1.7, marginBottom:40, maxWidth:600, margin:'0 auto 40px' },
  primaryBtn: { display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', textDecoration:'none', fontSize:15, fontWeight:700, borderRadius:12, transition:'all .2s', boxShadow:'0 4px 16px rgba(99,102,241,.35)', border:'none' },
  calculatorBtn: { display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', background:'linear-gradient(135deg,#f59e0b,#f97316)', color:'#fff', textDecoration:'none', fontSize:15, fontWeight:600, borderRadius:12, transition:'all .2s', boxShadow:'0 4px 16px rgba(245,158,11,.35)', border:'none' },
  secondaryBtn: { display:'inline-flex', alignItems:'center', padding:'14px 32px', background:'#fff', color:'#1e293b', textDecoration:'none', fontSize:15, fontWeight:600, borderRadius:12, border:'1.5px solid #e2e8f0', transition:'all .2s' },

  statsRow: { display:'flex', justifyContent:'center', gap:0, marginTop:64, borderTop:'1px solid #f1f5f9', paddingTop:40, flexWrap:'wrap' },
  statItem: { padding:'0 40px', textAlign:'center', borderRight:'1px solid #f1f5f9' },
  statVal:  { fontSize:28, fontWeight:800, color:'#1e293b', fontFamily:'"JetBrains Mono",monospace', letterSpacing:'-0.02em' },
  statLabel:{ fontSize:12, color:'#94a3b8', fontWeight:500, marginTop:4, textTransform:'uppercase', letterSpacing:'0.06em' },

  // features
  featSection: { padding:'96px 48px', background:'#f8fafc' },
  sectionTag:  { display:'inline-block', fontSize:12, fontWeight:700, color:'#3b82f6', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12, background:'#eff6ff', padding:'4px 14px', borderRadius:999, border:'1px solid #bfdbfe' },
  sectionTitle:{ fontSize:'clamp(28px,4vw,42px)', fontWeight:800, color:'#0f172a', letterSpacing:'-0.02em', marginBottom:14 },
  sectionSub:  { fontSize:16, color:'#64748b', lineHeight:1.6 },
  featGrid:    { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:20, maxWidth:1100, margin:'0 auto' },
  featCard:    { background:'#fff', borderRadius:16, padding:'28px 28px 32px', border:'1px solid #e2e8f0', transition:'all .25s', boxShadow:'0 1px 4px rgba(0,0,0,.04)', cursor:'default' },
  featIconBox: { width:48, height:48, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 },
  featNum:     { fontSize:12, fontWeight:800, letterSpacing:'0.1em', marginBottom:8, fontFamily:'"JetBrains Mono",monospace' },
  featTitle:   { fontSize:17, fontWeight:700, color:'#0f172a', marginBottom:10 },
  featDesc:    { fontSize:14, color:'#64748b', lineHeight:1.65 },

  // how it works
  howSection: { padding:'96px 48px', background:'#fff' },
  stepsRow:   { display:'flex', gap:0, maxWidth:1100, margin:'0 auto', flexWrap:'wrap' },
  stepNum:    { width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#6366f1)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, flexShrink:0 },
  stepTitle:  { fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:6 },
  stepDesc:   { fontSize:13, color:'#64748b', lineHeight:1.6 },
  stepArrow:  { fontSize:20, color:'#cbd5e1', alignSelf:'center', flexShrink:0, padding:'0 4px' },

  // cta
  ctaBanner: { position:'relative', padding:'80px 48px', background:'linear-gradient(135deg,#1e1b4b,#1e3a8a)', overflow:'hidden', textAlign:'center' },
  ctaGlow:   { position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,.3) 0%,transparent 70%)', pointerEvents:'none' },
  ctaTitle:  { fontSize:'clamp(26px,4vw,42px)', fontWeight:800, color:'#fff', marginBottom:14, letterSpacing:'-0.02em' },
  ctaSub:    { fontSize:16, color:'rgba(255,255,255,.65)', marginBottom:36, lineHeight:1.6 },

  // footer
  footer: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'24px 48px', borderTop:'1px solid #f1f5f9', background:'#fff', flexWrap:'wrap', gap:12 },
};
