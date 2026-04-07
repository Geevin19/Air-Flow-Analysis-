import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

export default function LandingPage() {
  return (
    <div style={styles.container}>
      <NeuralGrid />
      <NeuralCanvas />
      <ScanBeam />
      
      <nav style={styles.nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="SmartTracker" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
          <h1 style={styles.logo}>SmartTracker</h1>
        </div>
        <div style={styles.navLinks}>
          <Link to="/login" style={styles.navLink}>Login</Link>
          <Link to="/register" style={styles.navButton}>Get Started</Link>
        </div>
      </nav>

      <main style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            NEURAL SIMULATION ENGINE
          </div>
          <h1 style={styles.heroTitle}>
            ADVANCED AIRFLOW<br />SIMULATION PLATFORM
          </h1>
          <p style={styles.heroSubtitle}>
            Real-time CFD analysis • IoT integration • Neural grid visualization
          </p>
          <div style={styles.heroButtons}>
            <Link to="/register" style={styles.primaryButton}>
              <span>Initialize System</span>
              <span style={{ fontSize: '18px' }}>→</span>
            </Link>
            <Link to="/login" style={styles.secondaryButton}>
              Access Portal
            </Link>
          </div>
        </div>

        <div style={styles.features}>
          <FeatureCard 
            icon="⚡"
            title="Real-time CFD"
            desc="Advanced computational fluid dynamics with live particle visualization"
            accent="cyan"
          />
          <FeatureCard 
            icon="📡"
            title="IoT Integration"
            desc="Direct sensor data streaming via WebSocket for live monitoring"
            accent="violet"
          />
          <FeatureCard 
            icon="🔬"
            title="Neural Analysis"
            desc="AI-powered flow pattern recognition and predictive modeling"
            accent="lime"
          />
        </div>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <span>&copy; 2026 SmartTracker</span>
          <span style={styles.footerDivider}>◆</span>
          <span>Neural Grid Active</span>
          <span style={styles.footerDivider}>◆</span>
          <span>All Systems Operational</span>
        </div>
      </footer>
    </div>
  );
}

function NeuralGrid() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      backgroundImage: `
        linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      animation: 'grid-scroll 8s linear infinite',
    }} />
  );
}

function NeuralCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const nodes = Array.from({ length: 40 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
      r: Math.random() * 2 + 1,
      ph: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? [0, 229, 255] : [157, 78, 221],
    }));

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 150) {
            const a = (1 - d / 150) * 0.08;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${nodes[i].color.join(',')},${a})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      nodes.forEach(p => {
        p.ph += 0.008;
        const pulse = 0.5 + 0.5 * Math.sin(p.ph);
        const [r, g, b] = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.8 + 0.4 * pulse), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + 0.5 * pulse})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }} />;
}

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

function FeatureCard({ icon, title, desc, accent }: { icon: string; title: string; desc: string; accent: 'cyan' | 'violet' | 'lime' }) {
  const [hov, setHov] = useState(false);
  const colors = { cyan: '#00E5FF', violet: '#9D4EDD', lime: '#AAFF00' };
  const color = colors[accent];
  
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...styles.featureCard,
        border: `1px solid ${hov ? color + '44' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: hov ? `0 0 0 1px ${color}22, 0 20px 60px rgba(0,0,0,0.5), inset 0 0 30px ${color}18` : '0 4px 24px rgba(0,0,0,0.3)',
        transform: hov ? 'translateY(-8px)' : 'none',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: hov ? `linear-gradient(90deg, transparent, ${color}, transparent)` : 'transparent', transition: 'background 0.2s' }} />
      <div style={{ ...styles.featureIcon, color }}>{icon}</div>
      <h3 style={styles.featureTitle}>{title.toUpperCase()}</h3>
      <p style={styles.featureText}>{desc}</p>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#060608',
    fontFamily: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 60px',
    background: 'rgba(12,12,16,0.85)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    position: 'relative',
    zIndex: 10,
  },
  logo: {
    fontSize: '24px',
    fontWeight: 900,
    fontFamily: '"Orbitron", sans-serif',
    letterSpacing: '0.15em',
    background: 'linear-gradient(135deg, #00E5FF 0%, #9D4EDD 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    textTransform: 'uppercase',
  },
  navLinks: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  navLink: {
    color: 'rgba(238,240,247,0.7)',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '500',
    letterSpacing: '0.08em',
    fontFamily: '"Syne Mono", monospace',
    transition: 'color 0.2s',
    textTransform: 'uppercase',
  },
  navButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #00E5FF 0%, #9D4EDD 100%)',
    color: '#060608',
    textDecoration: 'none',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    fontFamily: '"Orbitron", sans-serif',
    textTransform: 'uppercase',
    border: '1px solid rgba(0,229,255,0.3)',
    boxShadow: '0 0 20px rgba(0,229,255,0.3), inset 0 0 20px rgba(0,229,255,0.1)',
    transition: 'all 0.2s',
  },
  hero: {
    flex: 1,
    padding: '120px 60px 80px',
    position: 'relative',
    zIndex: 3,
  },
  heroContent: {
    textAlign: 'center',
    maxWidth: '900px',
    margin: '0 auto 100px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    background: 'rgba(0,229,255,0.08)',
    border: '1px solid rgba(0,229,255,0.3)',
    fontSize: '10px',
    fontFamily: '"Syne Mono", monospace',
    letterSpacing: '0.2em',
    color: '#00E5FF',
    marginBottom: '32px',
    textTransform: 'uppercase',
  },
  badgeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#00E5FF',
    boxShadow: '0 0 8px #00E5FF',
    animation: 'blink 1.8s ease infinite',
    display: 'block',
  },
  heroTitle: {
    fontSize: '64px',
    fontWeight: 900,
    fontFamily: '"Orbitron", sans-serif',
    letterSpacing: '0.08em',
    background: 'linear-gradient(135deg, #EEF0F7 0%, #00E5FF 50%, #9D4EDD 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 24px 0',
    lineHeight: '1.1',
    textTransform: 'uppercase',
  },
  heroSubtitle: {
    fontSize: '16px',
    fontFamily: '"Syne Mono", monospace',
    color: 'rgba(124,126,146,1)',
    margin: '0 0 48px 0',
    lineHeight: '1.8',
    letterSpacing: '0.05em',
  },
  heroButtons: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '18px 36px',
    background: 'linear-gradient(135deg, #00E5FF 0%, #9D4EDD 100%)',
    color: '#060608',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 900,
    fontFamily: '"Orbitron", sans-serif',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    border: '1px solid rgba(0,229,255,0.5)',
    boxShadow: '0 0 30px rgba(0,229,255,0.4), inset 0 0 30px rgba(0,229,255,0.15)',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    padding: '18px 36px',
    background: 'rgba(12,12,16,0.6)',
    backdropFilter: 'blur(8px)',
    color: '#00E5FF',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: '"Orbitron", sans-serif',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    border: '1px solid rgba(0,229,255,0.3)',
    transition: 'all 0.2s',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 3,
  },
  featureCard: {
    position: 'relative',
    background: 'rgba(12,12,16,0.7)',
    backdropFilter: 'blur(12px)',
    padding: '40px 32px',
    textAlign: 'center',
    transition: 'all 0.22s cubic-bezier(0.23,1,0.32,1)',
  },
  featureIcon: {
    fontSize: '56px',
    marginBottom: '24px',
    display: 'block',
  },
  featureTitle: {
    fontSize: '16px',
    fontWeight: 900,
    fontFamily: '"Orbitron", sans-serif',
    letterSpacing: '0.15em',
    color: '#EEF0F7',
    margin: '0 0 16px 0',
  },
  featureText: {
    fontSize: '13px',
    fontFamily: '"Space Grotesk", sans-serif',
    color: 'rgba(124,126,146,1)',
    lineHeight: '1.7',
    margin: 0,
    fontWeight: 300,
  },
  footer: {
    padding: '24px 60px',
    background: 'rgba(12,12,16,0.85)',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    position: 'relative',
    zIndex: 10,
  },
  footerContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    fontFamily: '"Syne Mono", monospace',
    fontSize: '10px',
    color: 'rgba(124,126,146,0.7)',
    letterSpacing: '0.1em',
  },
  footerDivider: {
    color: 'rgba(0,229,255,0.3)',
  },
};
