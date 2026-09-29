import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LuLogOut, LuMenu, LuMonitor, LuMoon, LuSun, LuUserRound, LuX } from "react-icons/lu";
import { useAuth, useTheme } from "../context/contexts";
import { initials } from "../lib/format";
import { FEATURES as NAV } from "../lib/features";
import Logo from "./Logo";
import "./shell.css";

const THEMES = [
  { value: "light", label: "Paper", icon: LuSun },
  { value: "dark", label: "Chalkboard", icon: LuMoon },
  { value: "system", label: "System", icon: LuMonitor },
];

function useDismiss(open, close) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) close();
    };
    const onKey = (event) => event.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function ThemeSwitcher() {
  const { preference, resolved, setPreference } = useTheme();
  const index = THEMES.findIndex((theme) => theme.value === preference);
  const next = THEMES[(index + 1) % THEMES.length];
  const Icon = resolved === "dark" ? LuMoon : LuSun;
  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon"
      onClick={() => setPreference(next.value)}
      aria-label={`Theme: ${THEMES[index]?.label ?? "System"}. Switch to ${next.label}.`}
      title={`Theme: ${THEMES[index]?.label ?? "System"}`}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <span className="avatar">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials(user.name)}
        </span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-header">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <Link to="/profile" role="menuitem" className="menu-item" onClick={() => setOpen(false)}>
            <LuUserRound aria-hidden="true" /> Your profile
          </Link>
          <div className="menu-theme" role="group" aria-label="Theme">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={preference === value}
                onClick={() => setPreference(value)}
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => {
              signOut();
              navigate("/login", { replace: true });
            }}
          >
            <LuLogOut aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Header() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header no-print${scrolled ? " is-scrolled" : ""}`}>
      <div className="container header-inner">
        <Logo to={isAuthenticated ? "/evaluations" : "/"} />

        <nav className="main-nav" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, blurb }) => (
            <NavLink
              key={to}
              to={to}
              className="nav-link"
              end={to === "/evaluations"}
              title={isAuthenticated ? undefined : `${blurb} Sign in to use it.`}
            >
              <Icon aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <Link to="/evaluate" className="btn btn-primary btn-sm header-cta">
                New evaluation
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <ThemeSwitcher />
              <Link to="/login" className="btn btn-ghost btn-sm header-signin">
                Sign in
              </Link>
              <Link to="/signup" className="btn btn-ink btn-sm">
                Get started
              </Link>
            </>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-icon mobile-toggle"
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <LuX aria-hidden="true" /> : <LuMenu aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="mobile-nav" className="mobile-nav" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, blurb }) => (
            <NavLink key={to} to={to} className="mobile-link" end={to === "/evaluations"}>
              <Icon aria-hidden="true" />
              <span>
                {label}
                <small>{blurb}</small>
              </span>
            </NavLink>
          ))}
          {isAuthenticated ? (
            <NavLink to="/profile" className="mobile-link">
              <LuUserRound aria-hidden="true" />
              <span>Your profile</span>
            </NavLink>
          ) : (
            <div className="mobile-auth">
              <Link to="/login" className="btn btn-block">
                Sign in
              </Link>
              <Link to="/signup" className="btn btn-ink btn-block">
                Get started
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer no-print">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Logo />
          <p>AI-assisted marking for handwritten answer sheets. The teacher always has the final say.</p>
        </div>
        <div className="footer-meta">
          <span className="hand">marked with care</span>
          <nav className="footer-links" aria-label="Legal">
            <a href="/privacy.html">Privacy Policy</a>
            <a href="/terms.html">Terms of Service</a>
          </nav>
          <span>© {new Date().getFullYear()} AI-EvaluAIte</span>
        </div>
      </div>
    </footer>
  );
}

export default function AppShell() {
  return (
    <>
      <button type="button" className="skip-link" onClick={() => document.getElementById("main")?.focus()}>
        Skip to content
      </button>
      <Header />
      <main id="main" className="site-main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
