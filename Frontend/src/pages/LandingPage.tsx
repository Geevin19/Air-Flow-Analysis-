import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>SmartTracker</h1>
        <div style={styles.navLinks}>
          <Link to="/login" style={styles.navLink}>Login</Link>
          <Link to="/register" style={styles.navButton}>Start</Link>
        </div>
      </nav>

      <main style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Airflow Simulation
          </h1>
          <p style={styles.heroSubtitle}>
            Real-time CFD analysis and IoT integration
          </p>
          <div style={styles.heroButtons}>
            <Link to="/register" style={styles.primaryButton}>
              Get Started
            </Link>
            <Link to="/login" style={styles.secondaryButton}>
              Sign In
            </Link>
          </div>
        </div>

        <div style={styles.features}>
          <div style={styles.featureCard}>
            <div style={styles.featureNumber}>01</div>
            <h3 style={styles.featureTitle}>Real-time CFD</h3>
            <p style={styles.featureText}>Live particle visualization</p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureNumber}>02</div>
            <h3 style={styles.featureTitle}>IoT Integration</h3>
            <p style={styles.featureText}>Direct sensor streaming</p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureNumber}>03</div>
            <h3 style={styles.featureTitle}>Analysis</h3>
            <p style={styles.featureText}>Pattern recognition</p>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <span>© 2026 SmartTracker</span>
      </footer>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    color: '#000',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 48px',
    borderBottom: '1px solid #0066FF',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0066FF',
    margin: 0,
  },
  navLinks: {
    display: 'flex',
    gap: '32px',
    alignItems: 'center',
  },
  navLink: {
    color: '#000',
    textDecoration: 'none',
    fontSize: '15px',
    transition: 'color 0.2s',
  },
  navButton: {
    padding: '10px 24px',
    background: '#0066FF',
    color: '#fff',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  hero: {
    flex: 1,
    padding: '120px 48px 80px',
  },
  heroContent: {
    textAlign: 'center',
    maxWidth: '800px',
    margin: '0 auto 120px',
  },
  heroTitle: {
    fontSize: '72px',
    fontWeight: 700,
    color: '#000',
    margin: '0 0 24px 0',
    lineHeight: '1.1',
    letterSpacing: '-2px',
  },
  heroSubtitle: {
    fontSize: '20px',
    color: '#666',
    margin: '0 0 48px 0',
    lineHeight: '1.6',
  },
  heroButtons: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  primaryButton: {
    padding: '16px 40px',
    background: '#0066FF',
    color: '#fff',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  secondaryButton: {
    padding: '16px 40px',
    background: 'transparent',
    color: '#000',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 600,
    border: '1px solid #0066FF',
    transition: 'all 0.2s',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1px',
    maxWidth: '1200px',
    margin: '0 auto',
    background: '#0066FF',
  },
  featureCard: {
    background: '#fff',
    padding: '48px 32px',
    transition: 'all 0.3s',
  },
  featureNumber: {
    fontSize: '48px',
    fontWeight: 700,
    color: '#0066FF',
    marginBottom: '24px',
    lineHeight: 1,
  },
  featureTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#000',
    margin: '0 0 12px 0',
  },
  featureText: {
    fontSize: '15px',
    color: '#666',
    lineHeight: '1.6',
    margin: 0,
  },
  footer: {
    padding: '32px 48px',
    borderTop: '1px solid #0066FF',
    textAlign: 'center',
    color: '#666',
    fontSize: '14px',
  },
};
