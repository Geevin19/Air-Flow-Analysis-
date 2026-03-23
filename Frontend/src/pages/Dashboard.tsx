import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, simulationAPI } from '../services/api';

type Theme = 'dark' | 'light';

/* ═══════════════════════════════════════════════════════
   GLOBAL STYLES — NEURAL GRID AESTHETIC
═══════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Syne+Mono&family=Orbitron:wght@400;700;900&family=Bricolage+Grotesque:opsz,wght@12..96,200;12..96,400;12..96,700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --cyan:    #00E5FF;
  --cyan2:   #00B8D9;
  --cyan-dim: rgba(0,229,255,0.07);
  --cyan-glow: rgba(0,229,255,0.22);
  --violet:  #9D4EDD;
  --violet2: #7B2FBE;
  --violet-dim: rgba(157,78,221,0.08);
  --violet-glow: rgba(157,78,221,0.22);
  --lime:    #AAFF00;
  --lime-dim: rgba(170,255,0,0.07);
  --red:     #FF3864;
  --red-dim: rgba(255,56,100,0.08);
  --gold:    #FFB700;
  --gold-dim: rgba(255,183,0,0.08);
  --font-hud:  'Orbitron', sans-serif;
  --font-mono: 'Syne Mono', monospace;
  --font-body: 'Bricolage Grotesque', sans-serif;
  --font-ui:   'Space Grotesk', sans-serif;
}

[data-theme="dark"] {
  --bg:      #060608;
  --bg2:     #0C0C10;
  --bg3:     #111118;
  --bg4:     #16161F;
  --bg5:     #1D1D28;
  --bg6:     #242432;
  --border:  rgba(255,255,255,0.05);
  --border2: rgba(255,255,255,0.09);
  --border3: rgba(255,255,255,0.16);
  --text1:   #EEF0F7;
  --text2:   #7C7E92;
  --text3:   #3E4058;
  --grid-line: rgba(0,229,255,0.04);
  --noise: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
}

[data-theme="light"] {
  --bg:      #F0F2F8;
  --bg2:     #FAFBFF;
  --bg3:     #ECEEF5;
  --bg4:     #E2E5EF;
  --bg5:     #D6DAE8;
  --bg6:     #CBD0DF;
  --border:  rgba(0,0,0,0.06);
  --border2: rgba(0,0,0,0.10);
  --border3: rgba(0,0,0,0.16);
  --text1:   #0D0E18;
  --text2:   #4A4C64;
  --text3:   #9294A8;
  --grid-line: rgba(0,150,200,0.06);
  --noise: none;
}

/* ── KEYFRAMES ── */
@keyframes grid-scroll  { to { background-position: 0 40px } }
@keyframes fade-up      { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
@keyframes spin         { to { transform: rotate(360deg) } }
@keyframes blink        { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes ticker-scroll{ 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
@keyframes pulse-cyan   { 0%,100%{box-shadow:0 0 0 0 var(--cyan-glow)} 50%{box-shadow:0 0 28px 4px var(--cyan-glow)} }
@keyframes shimmer      { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
@keyframes float        { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes scan-line    { 0%{top:-10%} 100%{top:110%} }
@keyframes data-rain    { 0%{opacity:0;transform:translateY(-20px)} 10%{opacity:1} 90%{opacity:1} 100%{opacity:0;transform:translateY(120px)} }
@keyframes glitch-1     { 0%,96%,100%{clip-path:none;transform:none} 97%{clip-path:inset(40% 0 50% 0);transform:translateX(-3px)} 98%{clip-path:inset(10% 0 85% 0);transform:translateX(3px)} 99%{clip-path:inset(70% 0 15% 0);transform:translateX(-1px)} }
@keyframes node-pulse   { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.5);opacity:1} }
@keyframes border-flow  { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
@keyframes reveal-bar   { from{width:0} to{width:var(--w)} }

::-webkit-scrollbar { width: 3px }
::-webkit-scrollbar-track { background: transparent }
::-webkit-scrollbar-thumb { background: var(--border3); border-radius: 2px }
`;

function injectCSS() {
  if (document.getElementById('st-css')) return;
  const s = document.createElement('style');
  s.id = 'st-css';
  s.textContent = CSS;
  document.head.prepend(s);
}

/* ═══════════════════════════════════════════════════════
   NEURAL GRID BACKGROUND
═══════════════════════════════════════════════════════ */
function NeuralGrid() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      backgroundImage: `
        linear-gradient(var(--grid-line) 1px, transparent 1px),
        linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      animation: 'grid-scroll 8s linear infinite',
    }} />
  );
}

/* ═══════════════════════════════════════════════════════
   PARTICLE NEURAL NET CANVAS
═══════════════════════════════════════════════════════ */
function NeuralCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>(0);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const nodes = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 2 + 1,
      ph: Math.random() * Math.PI * 2,
      color: Math.random() > 0.6 ? [0, 229, 255] : [157, 78, 221],
    }));

    const tick = () => {
      ctx.clearRect(0, 0, W, H);

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 150) {
            const a = (1 - d / 150) * 0.08;
            const grad = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
            grad.addColorStop(0, `rgba(${nodes[i].color.join(',')},${a})`);
            grad.addColorStop(1, `rgba(${nodes[j].color.join(',')},${a})`);
            ctx.beginPath();
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.6;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Nodes
      nodes.forEach(p => {
        p.ph += 0.008;
        const pulse = 0.5 + 0.5 * Math.sin(p.ph);
        const [r, g, b] = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.8 + 0.4 * pulse), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + 0.5 * pulse})`;
        ctx.fill();

        // Glow ring
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.06 * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      });

      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }} />;
}

/* ═══════════════════════════════════════════════════════
   SCAN LINE EFFECT
═══════════════════════════════════════════════════════ */
function ScanBeam() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, height: '2px', top: 0,
        background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.15), transparent)',
        animation: 'scan-line 6s linear infinite',
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LIVE DATA RAIN (right edge)
═══════════════════════════════════════════════════════ */
function DataRain() {
  const items = ['01001011', '█▓▒░', 'μ=0.847', '∂/∂t', 'FFT►', 'σ²=0.02', '⌬3.14', 'Rₙ↑', '∫∞₀', 'SYNC'];
  return (
    <div style={{ position: 'fixed', right: 16, top: 80, bottom: 80, zIndex: 3, pointerEvents: 'none', overflow: 'hidden', width: 48 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          position: 'absolute', top: `${i * 10}%`, right: 0,
          fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--cyan)',
          opacity: 0,
          animation: `data-rain ${2.5 + i * 0.4}s ease-in-out ${i * 0.6}s infinite`,
          letterSpacing: '0.05em',
        }}>{item}</div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   GLOWING BORDER CARD
═══════════════════════════════════════════════════════ */
function GlowCard({ children, style, accent = 'cyan', hoverLift = true }: {
  children: React.ReactNode; style?: React.CSSProperties;
  accent?: 'cyan' | 'violet' | 'lime' | 'gold'; hoverLift?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const colors = { cyan: 'var(--cyan)', violet: 'var(--violet)', lime: 'var(--lime)', gold: 'var(--gold)' };
  const glows = { cyan: 'var(--cyan-glow)', violet: 'var(--violet-glow)', lime: 'rgba(170,255,0,0.18)', gold: 'rgba(255,183,0,0.18)' };
  const c = colors[accent], g = glows[accent];
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', backgroundColor: 'var(--bg2)',
        border: `1px solid ${hov ? c : 'var(--border2)'}`,
        boxShadow: hov ? `0 0 0 1px ${c}22, 0 20px 60px rgba(0,0,0,0.5), inset 0 0 30px ${g}` : '0 4px 24px rgba(0,0,0,0.3)',
        transition: 'all 0.22s cubic-bezier(0.23,1,0.32,1)',
        transform: hov && hoverLift ? 'translateY(-4px)' : 'none',
        ...style,
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: hov ? `linear-gradient(90deg, transparent, ${c}, transparent)` : 'transparent',
        transition: 'background 0.22s',
      }} />
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HEX CORNERS
═══════════════════════════════════════════════════════ */
function HexCorners({ color = 'var(--border3)', size = 10 }: { color?: string; size?: number }) {
  const s: React.CSSProperties = { position: 'absolute', width: size, height: size };
  return (
    <>
      <span style={{ ...s, top: -1, left: -1, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <span style={{ ...s, top: -1, right: -1, borderTop: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
      <span style={{ ...s, bottom: -1, left: -1, borderBottom: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <span style={{ ...s, bottom: -1, right: -1, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   STATUS BADGE
═══════════════════════════════════════════════════════ */
function StatusBadge({ label, color, blink = false }: { label: string; color: string; blink?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', border: `1px solid ${color}44`,
      backgroundColor: `${color}10`, fontFamily: 'var(--font-mono)',
      fontSize: 9, letterSpacing: '0.16em', color,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', backgroundColor: color,
        boxShadow: `0 0 6px ${color}`,
        animation: blink ? 'blink 1.8s ease infinite' : 'none',
        display: 'block', flexShrink: 0,
      }} />
      {label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION HEADER
═══════════════════════════════════════════════════════ */
function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <span style={{ width: 2, height: 16, backgroundColor: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan-glow)', display: 'block' }} />
        <span style={{ width: 2, height: 8, backgroundColor: 'var(--violet)', boxShadow: '0 0 8px var(--violet-glow)', display: 'block' }} />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text3)', textTransform: 'uppercase' }}>
          {sub || '// module'}
        </div>
        <div style={{ fontFamily: 'var(--font-hud)', fontSize: 13, letterSpacing: '0.2em', color: 'var(--text1)', fontWeight: 700, textTransform: 'uppercase' }}>
          {label}
        </div>
      </div>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border2), transparent)' }} />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)' }}>
        [{Math.floor(Math.random() * 9000 + 1000)}]
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LIVE CLOCK
═══════════════════════════════════════════════════════ */
function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: 'var(--font-hud)', fontSize: 14, color: 'var(--cyan)', letterSpacing: '0.12em' }}>
        {p(t.getHours())}:{p(t.getMinutes())}:{p(t.getSeconds())}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '0.1em' }}>
        UTC{t.getTimezoneOffset() > 0 ? '-' : '+'}{String(Math.abs(t.getTimezoneOffset() / 60)).padStart(2, '0')}00
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TICKER TAPE
═══════════════════════════════════════════════════════ */
function TickerTape({ sims }: { sims: any[] }) {
  const items = sims.length > 0
    ? sims.map(s => `${s.name.toUpperCase()} ${s.results ? `▲ μ=${Number(s.results.mean).toFixed(4)} σ=${Number(s.results.std ?? 0).toFixed(4)}` : '◎ COMPUTING'}`)
    : ['NO SIMULATION DATA', 'INITIALIZE ENGINE', 'NEURAL GRID ACTIVE', 'AWAITING INPUT'];
  const text = [...items, ...items].join('     ◆     ');
  return (
    <div style={{
      overflow: 'hidden', whiteSpace: 'nowrap',
      borderTop: '1px solid var(--border2)', borderBottom: '1px solid var(--border2)',
      background: 'linear-gradient(90deg, var(--bg) 0%, var(--bg2) 20%, var(--bg2) 80%, var(--bg) 100%)',
      padding: '8px 0', position: 'relative',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(90deg, var(--bg), transparent)', zIndex: 1 }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(270deg, var(--bg), transparent)', zIndex: 1 }} />
      <span style={{ display: 'inline-block', animation: 'ticker-scroll 28s linear infinite', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cyan)', letterSpacing: '0.1em' }}>
        {text + '     ◆     ' + text}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   RADIAL GAUGE (redesigned)
═══════════════════════════════════════════════════════ */
function RadialGauge({ value, max, label, color, size = 110 }: { value: number; max: number; label: string; color: string; size?: number }) {
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(max > 0 ? value / max : 0, 1);
  const id = `rg-${label}-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block', filter: `drop-shadow(0 0 8px ${color}44)` }}>
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>
          {/* Tick marks */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const cx = size / 2, cy = size / 2;
            const x1 = cx + Math.cos(angle) * (r + 4), y1 = cy + Math.sin(angle) * (r + 4);
            const x2 = cx + Math.cos(angle) * (r + 8), y2 = cy + Math.sin(angle) * (r + 8);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1" strokeOpacity="0.2" />;
          })}
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg5)" strokeWidth="6" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth="6"
            strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-hud)', fontSize: size * 0.22, color: 'var(--text1)', lineHeight: 1, fontWeight: 900 }}>{value}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text3)', marginTop: 2 }}>/{max}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 24, height: 2, background: color, margin: '0 auto 5px', boxShadow: `0 0 6px ${color}` }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{label}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ANIMATED COUNTER
═══════════════════════════════════════════════════════ */
function Counter({ to, decimals = 0, suffix = '' }: { to: number; decimals?: number; suffix?: string }) {
  const [v, setV] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now(), dur = 1300;
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setV(to * ease);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [to]);
  return <>{v.toFixed(decimals)}{suffix}</>;
}

/* ═══════════════════════════════════════════════════════
   SPARK LINE
═══════════════════════════════════════════════════════ */
function SparkLine({ data, color, W = 200, H = 48 }: { data: number[]; color: string; W?: number; H?: number }) {
  if (data.length < 2) {
    const fake = [0.3, 0.5, 0.4, 0.7, 0.6, 0.8, 0.75, 0.9];
    data = fake;
  }
  const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1;
  const step = W / (data.length - 1);
  const pts = data.map((v, i) => [i * step, H - 6 - ((v - mn) / range) * (H - 12)]);
  const pathD = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const fillD = `M 0 ${H} ${pathD.replace('M', 'L')} L ${W} ${H} Z`;
  const [lx, ly] = pts[pts.length - 1];
  const gId = `spk-${color.replace(/[^a-z0-9]/gi, '').slice(0, 8)}`;
  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      <circle cx={lx} cy={ly} r={3.5} fill={color} stroke="var(--bg)" strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
      {/* Vertical drop line from point to baseline */}
      <line x1={lx} y1={ly} x2={lx} y2={H} stroke={color} strokeWidth="1" strokeOpacity="0.2" strokeDasharray="2 2" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   BAR METRIC
═══════════════════════════════════════════════════════ */
function BarMetric({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)', width: 60, flexShrink: 0, letterSpacing: '0.1em' }}>{label}</span>
      <div style={{ flex: 1, height: 3, backgroundColor: 'var(--bg5)', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`, backgroundColor: color,
          boxShadow: `0 0 8px ${color}`,
          transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color, width: 32, textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LAUNCH MODULE CARD
═══════════════════════════════════════════════════════ */
function LaunchCard({ title, sub, tag, icon, primary, onClick }: {
  title: string; sub: string; tag: string; icon: React.ReactNode; primary: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const color = primary ? 'var(--cyan)' : 'var(--violet)';
  const glow = primary ? 'var(--cyan-glow)' : 'var(--violet-glow)';

  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', overflow: 'hidden', cursor: 'pointer', textAlign: 'left', width: '100%',
        padding: '28px 32px',
        border: `1px solid ${hov ? color : 'var(--border2)'}`,
        backgroundColor: hov ? `${color}08` : 'var(--bg2)',
        transition: 'all 0.2s cubic-bezier(0.23,1,0.32,1)',
        transform: hov ? 'translateY(-5px)' : 'none',
        boxShadow: hov ? `0 0 0 1px ${color}33, 0 24px 64px rgba(0,0,0,0.5), inset 0 0 40px ${glow}` : '0 4px 24px rgba(0,0,0,0.2)',
        fontFamily: 'inherit',
      }}
    >
      <HexCorners color={hov ? color : 'var(--border)'} size={12} />

      {/* Shimmer effect */}
      {hov && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(105deg, transparent 30%, ${color}08 50%, transparent 70%)`,
          backgroundSize: '600px 100%', animation: 'shimmer 1.6s linear infinite',
        }} />
      )}

      {/* Corner accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: hov ? `linear-gradient(90deg, transparent, ${color}, transparent)` : 'transparent',
        transition: 'background 0.2s',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, border: `1px solid ${color}44`,
              backgroundColor: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color,
            }}>
              {icon}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.24em', color: hov ? color : 'var(--text3)' }}>{tag}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: 22, letterSpacing: '0.12em', color: 'var(--text1)', marginBottom: 10, fontWeight: 900 }}>
            {title.toUpperCase()}
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, maxWidth: 340, fontWeight: 300 }}>{sub}</div>
        </div>

        <div style={{
          width: 52, height: 52, flexShrink: 0,
          border: `1px solid ${hov ? color : 'var(--border2)'}`,
          backgroundColor: hov ? `${color}14` : 'var(--bg4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: hov ? color : 'var(--text2)', fontSize: 20,
          transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          transform: hov ? 'rotate(45deg) scale(1.12)' : 'none',
        }}>→</div>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   SIM CARD
═══════════════════════════════════════════════════════ */
function SimCard({ sim, onClick, onDelete }: { sim: any; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const [hov, setHov] = useState(false);
  const done = !!sim.results;
  const d = new Date(sim.created_at);
  const color = done ? 'var(--cyan)' : 'var(--gold)';
  const mean = sim.results ? Number(sim.results.mean) : null;
  const median = sim.results ? Number(sim.results.median) : null;

  return (
    <div onClick={onClick} role="button" tabIndex={0}
      onKeyPress={e => { if (e.key === 'Enter') onClick(); }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', cursor: 'pointer', overflow: 'hidden',
        backgroundColor: hov ? 'var(--bg3)' : 'var(--bg2)',
        border: `1px solid ${hov ? color : 'var(--border2)'}`,
        padding: '22px 24px',
        transition: 'all 0.2s cubic-bezier(0.23,1,0.32,1)',
        transform: hov ? 'translateY(-5px)' : 'none',
        boxShadow: hov ? `0 0 0 1px ${color}22, 0 24px 60px rgba(0,0,0,0.5), inset 0 0 30px ${color}08` : '0 4px 20px rgba(0,0,0,0.25)',
      }}
    >
      <HexCorners color={hov ? color : 'var(--border2)'} size={9} />

      {/* Status bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)`, opacity: hov ? 1 : 0.4, transition: 'opacity 0.2s' }} />

      {/* Background hex pattern */}
      <div style={{ position: 'absolute', right: -30, bottom: -30, width: 100, height: 100, opacity: 0.04, pointerEvents: 'none' }}>
        <svg viewBox="0 0 100 100" fill="none">
          <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" stroke={color} strokeWidth="1" />
          <polygon points="50,20 77,35 77,65 50,80 23,65 23,35" stroke={color} strokeWidth="1" />
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: 16, letterSpacing: '0.1em', color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5, fontWeight: 900 }}>
            {sim.name.toUpperCase()}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '0.1em' }}>
            {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            <span style={{ margin: '0 6px', color: 'var(--border3)' }}>·</span>
            {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12, flexShrink: 0 }}>
          <StatusBadge label={done ? 'DONE' : 'WAIT'} color={done ? 'var(--cyan)' : 'var(--gold)'} blink={!done} />
          <button onClick={onDelete} style={{
            width: 28, height: 28, border: '1px solid var(--border2)', backgroundColor: 'transparent',
            color: 'var(--text3)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.14s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.backgroundColor = 'var(--red-dim)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >×</button>
        </div>
      </div>

      {sim.results ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            ['μ MEAN', mean?.toFixed(5), 'var(--cyan)'],
            ['Md MEDIAN', median?.toFixed(5), 'var(--violet)'],
          ].map(([k, v, c]) => (
            <div key={k as string} style={{ padding: '10px 12px', backgroundColor: 'var(--bg4)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 1, background: `linear-gradient(90deg, ${c}, transparent)`, opacity: hov ? 1 : 0.4 }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '0.18em', marginBottom: 5 }}>{k}</div>
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: 13, color: hov ? c as string : 'var(--text1)', transition: 'color 0.2s', fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ height: 56, backgroundColor: 'var(--bg4)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 10, height: 10, border: '1.5px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '0.2em' }}>COMPUTING</span>
        </div>
      )}

      <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '0.1em' }}>ID·{sim.id}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', color: hov ? color : 'var(--text3)', transition: 'color 0.2s' }}>
          INSPECT →
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SYSTEM METRICS PANEL
═══════════════════════════════════════════════════════ */
function SystemPanel({ sims }: { sims: any[] }) {
  const completed = sims.filter(s => s.results).length;
  const total = sims.length;
  const rate = total ? (completed / total) * 100 : 0;
  const [uptime, setUptime] = useState(0);
  useEffect(() => { const id = setInterval(() => setUptime(u => u + 1), 1000); return () => clearInterval(id); }, []);
  const fmt = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <GlowCard accent="violet" hoverLift={false} style={{ padding: '20px 24px', height: '100%' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--violet)', letterSpacing: '0.22em', marginBottom: 16 }}>// SYS.STATUS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { label: 'UPTIME', value: fmt(uptime), highlight: true },
          { label: 'TOTAL_RUNS', value: total },
          { label: 'COMPLETED', value: completed },
          { label: 'PENDING', value: total - completed },
        ].map(({ label, value, highlight }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '0.14em' }}>{label}</span>
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: 13, color: highlight ? 'var(--violet)' : 'var(--text1)', fontWeight: 700 }}>{value}</span>
          </div>
        ))}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '0.14em' }}>EFFICIENCY</span>
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: 13, color: 'var(--lime)', fontWeight: 700 }}>{rate.toFixed(1)}%</span>
          </div>
          <div style={{ height: 4, backgroundColor: 'var(--bg5)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, right: `${100 - rate}%`, backgroundColor: 'var(--lime)', boxShadow: '0 0 8px var(--lime)', transition: 'right 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
        </div>
      </div>
    </GlowCard>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => { injectCSS(); }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    rootRef.current?.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      const [uRes, sRes] = await Promise.all([authAPI.getCurrentUser(), simulationAPI.getAll()]);
      setUser(uRes.data);
      setSimulations(sRes.data);
    } catch (err: any) {
      if (err.response?.status === 401) { localStorage.removeItem('token'); navigate('/login'); }
      else { setUser({ username: 'OPERATOR', purpose: 'N/A' }); setSimulations([]); }
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Purge this simulation from the archive?')) return;
    try {
      await simulationAPI.delete(id);
      setSimulations(p => p.filter(s => s.id !== id));
    } catch (err: any) { alert('Failed: ' + (err.response?.data?.detail || err.message)); }
  };

  const completed = simulations.filter(s => s.results).length;
  const pending = simulations.length - completed;
  const rate = simulations.length ? Math.round((completed / simulations.length) * 100) : 0;
  const meanData = useMemo(() => simulations.filter(s => s.results).slice(-12).map(s => Number(s.results.mean)), [simulations]);
  const shown = showAll ? simulations : simulations.slice(0, 6);
  const gaugeMax = Math.max(simulations.length, 8);

  /* LOADING */
  if (loading) {
    return (
      <div ref={rootRef} data-theme={theme} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)', gap: 24 }}>
        <NeuralGrid />
        <NeuralCanvas />
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, border: '2px solid var(--bg5)', borderTopColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 20px' }} />
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: 10, color: 'var(--cyan)', letterSpacing: '0.4em' }}>INITIALIZING</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '0.2em', marginTop: 8 }}>NEURAL GRID v2 · LOADING</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div ref={rootRef} data-theme={theme} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)' }}>
        <GlowCard accent="violet" style={{ padding: '48px 64px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)', letterSpacing: '0.2em', fontSize: 10, marginBottom: 24 }}>AUTH.FAILURE — SESSION_EXPIRED</div>
          <button onClick={() => navigate('/login')} style={{ padding: '12px 32px', border: '1px solid var(--cyan)', backgroundColor: 'var(--cyan-dim)', color: 'var(--cyan)', fontFamily: 'var(--font-hud)', fontSize: 16, letterSpacing: '0.12em', cursor: 'pointer' }}>
            RE-AUTHENTICATE
          </button>
        </GlowCard>
      </div>
    );
  }

  return (
    <div ref={rootRef} data-theme={theme} style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text1)', fontFamily: 'var(--font-ui)', position: 'relative', overflowX: 'hidden' }}>
      <NeuralGrid />
      <NeuralCanvas />
      <ScanBeam />
      <DataRain />

      {/* ──────────────── NAV ──────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 62,
        backgroundColor: 'var(--bg)',
        borderBottom: '1px solid var(--border2)',
        backdropFilter: 'blur(12px)',
        animation: 'fade-up 0.4s ease both',
      }}>
        {/* LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 40, height: 40, position: 'relative',
            border: '1px solid var(--cyan)',
            backgroundColor: 'var(--cyan-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse-cyan 3s ease-in-out infinite',
          }}>
            {/* Neural icon */}
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="2" fill="var(--cyan)" />
              <circle cx="5" cy="7" r="1.5" fill="var(--cyan)" fillOpacity="0.6" />
              <circle cx="19" cy="7" r="1.5" fill="var(--cyan)" fillOpacity="0.6" />
              <circle cx="5" cy="17" r="1.5" fill="var(--violet)" fillOpacity="0.6" />
              <circle cx="19" cy="17" r="1.5" fill="var(--violet)" fillOpacity="0.6" />
              <line x1="12" y1="10" x2="6.5" y2="7.5" stroke="var(--cyan)" strokeWidth="0.8" strokeOpacity="0.5" />
              <line x1="12" y1="10" x2="17.5" y2="7.5" stroke="var(--cyan)" strokeWidth="0.8" strokeOpacity="0.5" />
              <line x1="12" y1="14" x2="6.5" y2="16.5" stroke="var(--violet)" strokeWidth="0.8" strokeOpacity="0.5" />
              <line x1="12" y1="14" x2="17.5" y2="16.5" stroke="var(--violet)" strokeWidth="0.8" strokeOpacity="0.5" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: 18, letterSpacing: '0.14em', color: 'var(--text1)', lineHeight: 1, fontWeight: 900 }}>
              SMART<span style={{ color: 'var(--cyan)' }}>TRACKER</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.22em', color: 'var(--text3)', marginTop: 3 }}>
              NEURAL SIM ENGINE · v2.0.0
            </div>
          </div>
        </div>

        {/* CENTER — status indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <StatusBadge label="NOMINAL" color="var(--cyan)" blink />
          <StatusBadge label={`${simulations.length} SIMS`} color="var(--violet)" />
          <div style={{ width: 1, height: 20, backgroundColor: 'var(--border2)' }} />
          <LiveClock />
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setTheme(p => p === 'dark' ? 'light' : 'dark')} style={{
            width: 34, height: 34, border: '1px solid var(--border2)', backgroundColor: 'var(--bg3)',
            color: 'var(--text2)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.color = 'var(--cyan)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)'; }}
          >
            {theme === 'dark' ? '◑' : '◐'}
          </button>

          <div style={{ padding: '4px 14px', height: 34, border: '1px solid var(--border2)', backgroundColor: 'var(--bg3)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'var(--cyan)', fontFamily: 'var(--font-hud)', fontSize: 13, color: 'var(--bg)', fontWeight: 900,
            }}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: '0.06em' }}>
              {user?.username?.toUpperCase()}
            </span>
          </div>

          <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }} style={{
            padding: '0 16px', height: 34, border: '1px solid rgba(255,56,100,0.3)', backgroundColor: 'var(--red-dim)',
            color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,56,100,0.14)'; e.currentTarget.style.borderColor = 'var(--red)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--red-dim)'; e.currentTarget.style.borderColor = 'rgba(255,56,100,0.3)'; }}
          >EJECT ⏏</button>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 10 }}>
        <TickerTape sims={simulations} />
      </div>

      {/* ──────────────── MAIN ──────────────── */}
      <main style={{ position: 'relative', zIndex: 5, maxWidth: 1360, margin: '0 auto', padding: '52px 32px 100px' }}>

        {/* ── HERO HEADER ── */}
        <div style={{ marginBottom: 64, animation: 'fade-up 0.5s ease 0.05s both' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'stretch' }}>

            {/* Left — title block */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ height: 1, width: 32, backgroundColor: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.28em' }}>MISSION CONTROL · DASHBOARD</span>
                </div>
                <h1 style={{ fontFamily: 'var(--font-hud)', fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.9, letterSpacing: '0.04em', color: 'var(--text1)', margin: 0, fontWeight: 900 }}>
                  SIMULATION
                  <br />
                  <span style={{ color: 'var(--cyan)', WebkitTextStroke: '1px var(--cyan)', WebkitTextFillColor: 'transparent', letterSpacing: '0.06em' }}>
                    ARCHIVE
                  </span>
                </h1>
                <p style={{ marginTop: 22, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, maxWidth: 420, fontWeight: 300 }}>
                  Real-time Monte Carlo simulation monitoring, parameter control & result analysis.
                  All neural data streams active and nominal.
                </p>
              </div>

              {/* Bar metrics */}
              <div style={{ marginTop: 32, padding: '20px 24px', backgroundColor: 'var(--bg2)', border: '1px solid var(--border2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '0.22em', marginBottom: 4 }}>// PIPELINE.METRICS</div>
                <BarMetric label="COMPLETED" value={completed} max={Math.max(simulations.length, 1)} color="var(--cyan)" />
                <BarMetric label="PENDING" value={pending} max={Math.max(simulations.length, 1)} color="var(--gold)" />
                <BarMetric label="EFFICIENCY" value={rate} max={100} color="var(--lime)" />
              </div>
            </div>

            {/* Right — instruments panel */}
            <GlowCard accent="cyan" hoverLift={false} style={{ padding: '32px 36px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--cyan)', letterSpacing: '0.22em', marginBottom: 24 }}>// INSTRUMENTS.PANEL</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <RadialGauge value={simulations.length} max={gaugeMax} label="Total" color="var(--cyan)" />
                <RadialGauge value={completed} max={gaugeMax} label="Done" color="var(--lime)" />
                <RadialGauge value={pending} max={gaugeMax} label="Pending" color="var(--gold)" />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '0.2em', marginBottom: 6 }}>EFFICIENCY RATE</div>
                    <div style={{ fontFamily: 'var(--font-hud)', fontSize: 52, color: 'var(--cyan)', lineHeight: 1, fontWeight: 900 }}>
                      <Counter to={rate} /><span style={{ fontSize: 28, color: 'var(--text2)' }}>%</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '0.14em', marginBottom: 4 }}>μ-TREND · LAST {Math.min(meanData.length || 8, 12)} RUNS</div>
                    <SparkLine data={meanData} color="var(--cyan)" />
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>
        </div>

        {/* ── LAUNCH MODULES ── */}
        <div style={{ marginBottom: 56, animation: 'fade-up 0.5s ease 0.1s both' }}>
          <SectionHeader label="Launch Modules" sub="// engine.select" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <LaunchCard
              primary
              title="Simulation Engine"
              tag="◆ PRIMARY MODULE"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
              sub="Configure raw parameters, run Monte Carlo and predictive models against custom datasets with full manual control."
              onClick={() => navigate('/simulation')}
            />
            <LaunchCard
              primary={false}
              title="Live IoT Feed"
              tag="◎ SENSOR MODULE"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /></svg>}
              sub="Stream live sensor data directly or paste JSON payload for instant real-world simulation input and monitoring."
              onClick={() => navigate('/iot-live')}
            />
          </div>
        </div>

        {/* ── ARCHIVE GRID ── */}
        <div style={{ animation: 'fade-up 0.5s ease 0.15s both' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', marginBottom: 24 }}>
            <SectionHeader label="Simulation Archive" sub="// archive.records" />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '0.14em' }}>
                {simulations.length} RECORD{simulations.length !== 1 ? 'S' : ''}
              </span>
              {simulations.length > 6 && (
                <button onClick={() => setShowAll(p => !p)} style={{
                  padding: '6px 16px', border: '1px solid var(--border2)', backgroundColor: 'var(--bg3)',
                  color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', cursor: 'pointer', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border3)'; e.currentTarget.style.color = 'var(--text1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)'; }}
                >
                  {showAll ? '↑ COLLAPSE' : `↓ SHOW ALL (${simulations.length})`}
                </button>
              )}
              <button onClick={() => navigate('/simulation')} style={{
                padding: '6px 22px', border: '1px solid var(--cyan)', backgroundColor: 'var(--cyan-dim)',
                color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', cursor: 'pointer',
                boxShadow: '0 0 20px var(--cyan-glow)', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0,229,255,0.12)'; e.currentTarget.style.boxShadow = '0 0 32px var(--cyan-glow)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--cyan-dim)'; e.currentTarget.style.boxShadow = '0 0 20px var(--cyan-glow)'; }}
              >+ NEW SIM</button>
            </div>
          </div>

          {/* Right sidebar + grid layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20, alignItems: 'start' }}>
            <div>
              {simulations.length === 0 ? (
                <GlowCard accent="cyan" style={{ padding: '80px 32px', textAlign: 'center', position: 'relative' }}>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: 36, color: 'var(--text3)', letterSpacing: '0.12em', marginBottom: 12, animation: 'float 4s ease-in-out infinite', fontWeight: 900 }}>
                    ARCHIVE EMPTY
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.14em', marginBottom: 32 }}>
                    NO SIMULATIONS ON RECORD — INITIALIZE FIRST RUN
                  </div>
                  <button onClick={() => navigate('/simulation')} style={{
                    padding: '13px 40px', border: '1px solid var(--cyan)', backgroundColor: 'var(--cyan-dim)',
                    color: 'var(--cyan)', fontFamily: 'var(--font-hud)', fontSize: 18, letterSpacing: '0.14em', cursor: 'pointer',
                    boxShadow: '0 0 40px var(--cyan-glow)', transition: 'all 0.18s', fontWeight: 900,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 60px var(--cyan-glow)'; e.currentTarget.style.backgroundColor = 'rgba(0,229,255,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 40px var(--cyan-glow)'; e.currentTarget.style.backgroundColor = 'var(--cyan-dim)'; }}
                  >
                    INITIALIZE FIRST SIMULATION
                  </button>
                </GlowCard>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
                  {shown.map((sim, i) => (
                    <div key={sim.id} style={{ animation: `fade-up 0.4s ease ${0.04 + i * 0.035}s both` }}>
                      <SimCard
                        sim={sim}
                        onClick={() => navigate(`/simulation?id=${sim.id}`)}
                        onDelete={(e: React.MouseEvent) => handleDelete(sim.id, e)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System panel sidebar */}
            <div style={{ animation: 'fade-up 0.5s ease 0.2s both', position: 'sticky', top: 80 }}>
              <SystemPanel sims={simulations} />
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ marginTop: 80, paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '0.18em' }}>
              SMARTTRACKER © 2025 · NEURAL SIM PLATFORM v2.0
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StatusBadge label="ALL SYSTEMS OPERATIONAL" color="var(--lime)" blink />
          </div>
        </div>
      </main>
    </div>
  );
}