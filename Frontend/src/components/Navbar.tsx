import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
  :root{--bg:#eef2f7;--surf:#ffffff;--border:#dde3ec;--a1:#3b6fd4;--a2:#5b9bd5;--text:#1a2333;--muted:#6b7a90;--label:#44546a;}
  .nav{position:sticky;top:0;z-index:100;background:rgba(245,248,252,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);padding:0 clamp(1rem,4vw,3rem);}
  .nav-inner{max-width:1280px;margin:0 auto;height:62px;display:flex;align-items:center;justify-content:space-between;gap:1rem;}
  .nav-logo{display:flex;align-items:center;gap:.55rem;text-decoration:none;}
  .nav-logo-icon{width:32px;height:32px;background:linear-gradient(135deg,var(--a1),var(--a2));border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.95rem;box-shadow:0 2px 8px rgba(59,111,212,.2);}
  .nav-logo-name{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.1rem;font-weight:800;color:var(--a1);}
  .nav-links{display:flex;align-items:center;gap:.2rem;}
  .nav-link{padding:.4rem .8rem;border-radius:7px;font-size:.86rem;font-weight:500;color:var(--muted);text-decoration:none;transition:color .18s,background .18s;font-family:'Inter',sans-serif;}
  .nav-link:hover{color:var(--text);background:rgba(59,111,212,.06);}
  .nav-link.active{color:var(--a1);background:rgba(59,111,212,.08);}
  .nav-right{display:flex;align-items:center;gap:.65rem;}
  .nav-user{display:flex;align-items:center;gap:.55rem;}
  .nav-avatar{width:32px;height:32px;background:linear-gradient(135deg,var(--a1),var(--a2));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:white;}
  .nav-uname{font-size:.86rem;font-weight:600;color:var(--text);font-family:'Inter',sans-serif;}
  .nav-btn{padding:.4rem 1rem;border-radius:7px;font-size:.84rem;font-weight:600;cursor:pointer;transition:all .18s;font-family:'Inter',sans-serif;text-decoration:none;display:inline-flex;align-items:center;}
  .nav-btn-ghost{border:1px solid var(--border);background:transparent;color:var(--label);}
  .nav-btn-ghost:hover{border-color:var(--a2);color:var(--a1);background:rgba(59,111,212,.05);}
  .nav-btn-primary{border:none;background:linear-gradient(135deg,var(--a1),var(--a2));color:white;box-shadow:0 2px 8px rgba(59,111,212,.25);}
  .nav-btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(59,111,212,.32);}
  .nav-btn-danger{border:1px solid rgba(217,95,95,.25);background:transparent;color:#d95f5f;}
  .nav-btn-danger:hover{background:rgba(217,95,95,.07);}
  .nav-toggle{display:none;background:none;border:none;color:var(--muted);cursor:pointer;padding:.35rem;}
  .nav-mobile{display:flex;flex-direction:column;gap:.4rem;padding:.85rem 1rem;border-top:1px solid var(--border);background:rgba(245,248,252,.97);}
  @media(max-width:720px){.nav-links{display:none}.nav-toggle{display:flex}}
`

export default function Navbar({ variant = 'app' }: { variant?: 'landing' | 'app' }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [open, setOpen] = useState(false)

  const userStr = localStorage.getItem('user')
  const user    = userStr ? JSON.parse(userStr) : null
  const initials = user ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() : 'U'
  const active  = (p: string) => location.pathname === p || location.pathname.startsWith(p + '/') ? ' active' : ''

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  return (
    <>
      <style>{S}</style>
      <nav className="nav">
        <div className="nav-inner">
          <Link to={user ? '/dashboard' : '/'} className="nav-logo">
            <div className="nav-logo-icon">⚡</div>
            <span className="nav-logo-name">AeroFlow</span>
          </Link>

          {variant === 'app' && user && (
            <div className="nav-links">
              <Link to="/dashboard"      className={`nav-link${active('/dashboard')}`}>Dashboard</Link>
              <Link to="/simulation/new" className={`nav-link${active('/simulation')}`}>New Simulation</Link>
            </div>
          )}
          {variant === 'landing' && (
            <div className="nav-links">
              <a href="#features"    className="nav-link">Features</a>
              <a href="#how-it-works" className="nav-link">How It Works</a>
            </div>
          )}

          <div className="nav-right">
            {user ? (
              <>
                <div className="nav-user">
                  <div className="nav-avatar">{initials}</div>
                  <span className="nav-uname">{user.first_name}</span>
                </div>
                <button className="nav-btn nav-btn-danger" onClick={logout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login"    className="nav-btn nav-btn-ghost">Sign In</Link>
                <Link to="/register" className="nav-btn nav-btn-primary">Get Started</Link>
              </>
            )}
          </div>

          <button className="nav-toggle" onClick={() => setOpen(!open)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>

        {open && (
          <div className="nav-mobile">
            {user ? (
              <>
                <Link to="/dashboard"      className="nav-link" onClick={() => setOpen(false)}>Dashboard</Link>
                <Link to="/simulation/new" className="nav-link" onClick={() => setOpen(false)}>New Simulation</Link>
                <button className="nav-btn nav-btn-danger" style={{width:'fit-content'}} onClick={logout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login"    className="nav-link" onClick={() => setOpen(false)}>Sign In</Link>
                <Link to="/register" className="nav-link" onClick={() => setOpen(false)}>Register</Link>
              </>
            )}
          </div>
        )}
      </nav>
    </>
  )
}