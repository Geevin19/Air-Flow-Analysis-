import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          <h1 style={styles.heroTitle}>
            Advanced Simulation Platform
          </h1>
          <p style={styles.heroSubtitle}>
            Run powerful simulations, analyze data, and make informed decisions with SmartTracker
          </p>
          <div style={styles.heroButtons}>
            <Link to="/register" style={styles.primaryButton}>
              Start Free Trial
            </Link>
            <Link to="/login" style={styles.secondaryButton}>
              Sign In
            </Link>
          </div>
        </div>

        <div style={styles.features}>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📊</div>
            <h3 style={styles.featureTitle}>Real-time Analytics</h3>
            <p style={styles.featureText}>
              Monitor your simulations in real-time with interactive charts and dashboards
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>🚀</div>
            <h3 style={styles.featureTitle}>Fast Performance</h3>
            <p style={styles.featureText}>
              Lightning-fast simulations powered by optimized algorithms
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>🔒</div>
            <h3 style={styles.featureTitle}>Secure & Private</h3>
            <p style={styles.featureText}>
              Your data is encrypted and protected with enterprise-grade security
            </p>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <p>&copy; 2026 SmartTracker. All rights reserved.</p>
      </footer>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background:
      'radial-gradient(circle at 10% 10%, rgba(102,126,234,0.18) 0%, rgba(102,126,234,0) 35%), radial-gradient(circle at 90% 20%, rgba(118,75,162,0.16) 0%, rgba(118,75,162,0) 38%), #f6f7ff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 60px',
    background: 'rgba(255,255,255,0.78)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    border: '1px solid rgba(102,126,234,0.12)',
  },
  logo: {
    fontSize: '28px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  navLinks: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
  },
  navLink: {
    color: '#333',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: '500',
  },
  navButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    boxShadow: '0 10px 22px rgba(102,126,234,0.25)',
  },
  hero: {
    flex: 1,
    padding: '80px 60px',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  },
  heroContent: {
    textAlign: 'center',
    maxWidth: '800px',
    margin: '0 auto 80px',
  },
  heroTitle: {
    fontSize: '56px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: '0 0 20px 0',
    lineHeight: '1.2',
  },
  heroSubtitle: {
    fontSize: '20px',
    color: '#666',
    margin: '0 0 40px 0',
    lineHeight: '1.6',
  },
  heroButtons: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
  },
  primaryButton: {
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: '600',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  secondaryButton: {
    padding: '16px 32px',
    backgroundColor: 'white',
    color: '#667eea',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: '600',
    border: '2px solid #667eea',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  featureCard: {
    background:
      'linear-gradient(180deg, rgba(102,126,234,0.10) 0%, rgba(255,255,255,1) 58%, rgba(255,255,255,1) 100%)',
    padding: '40px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
    border: '1px solid rgba(102,126,234,0.14)',
  },
  featureIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  featureTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: '0 0 12px 0',
  },
  featureText: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.6',
    margin: 0,
  },
  footer: {
    padding: '30px',
    textAlign: 'center',
    background:
      'linear-gradient(135deg, rgba(102,126,234,1) 0%, rgba(118,75,162,1) 100%)',
    color: 'white',
    boxShadow: '0 -10px 28px rgba(102,126,234,0.15)',
  },
};
