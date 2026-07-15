"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Boxes, Building2, ClipboardList, DatabaseBackup, FolderKanban, LayoutDashboard, Leaf, LogOut, Moon, Search, ShieldCheck, Sun, SunMedium } from "lucide-react";

const navigation = [
  { href: "/", section:"portfolio", label: "Portfolio", icon: LayoutDashboard },
  { href: "/projects", section:"projects", label: "Projects", icon: FolderKanban },
  { href: "/products", section:"products", label: "Product catalog", icon: Boxes },
  { href: "/cost-catalog", section:"cost_catalog", label: "Cost catalog", icon: ClipboardList },
  { href: "/partners", section:"partners", label: "Partners", icon: Building2 },
  { href: "/operations", section:"operations", label: "Data & history", icon: DatabaseBackup },
  { href: "/settings", section:"security", label: "Security", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [displayName, setDisplayName] = useState("Admin");
  const [securityEnabled, setSecurityEnabled] = useState(false);
  useEffect(() => {
    setDarkMode(document.documentElement.dataset.theme === "dark");
    if (pathname !== "/unlock") void fetch("/api/security/status", { cache:"no-store" }).then(response=>response.json()).then(status=>{setPermissions(status.permissions??[]);setSecurityEnabled(Boolean(status.enabled));if(status.user?.display_name)setDisplayName(status.user.display_name)});
  }, []);
  useEffect(() => { if (pathname !== "/unlock") void fetch("/api/backups", { cache: "no-store" }); }, []);

  function toggleTheme() {
    const nextTheme = darkMode ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem("solar-studio-theme", nextTheme);
    setDarkMode(!darkMode);
  }

  const themeToggle = (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {darkMode ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );

  if (pathname === "/unlock") return <>{children}<div className="unlock-theme-toggle">{themeToggle}</div></>;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark"><SunMedium size={22} /></span>
          <span><strong>Solar Studio</strong><small>by Soluziomex</small></span>
        </Link>
        <nav className="side-nav" aria-label="Main navigation">
          <span className="nav-label">Workspace</span>
          {navigation.filter(item=>permissions?.includes(item.section)).map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} className={active ? "nav-link active" : "nav-link"}><Icon size={18} />{label}</Link>;
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="impact-dot"><Leaf size={17} /></div>
          <div><strong>1.50 MW</strong><span>clean capacity modeled</span></div>
        </div>
      </aside>
      <main className="main-stage">
        <header className="topbar">
          <div className="search"><Search size={17} /><span>Search projects, products, suppliers…</span><kbd>⌘ K</kbd></div>
          <div className="environment"><span />Local workspace</div>
          {themeToggle}
          <div className="avatar" title={displayName}>{displayName.split(/\s+/).map(part=>part[0]).join("").slice(0,2).toUpperCase()}</div>
          {securityEnabled&&<Link href="/api/security/launch" className="sign-out-button" title="Sign out" aria-label="Sign out"><LogOut size={15}/></Link>}
        </header>
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  );
}
