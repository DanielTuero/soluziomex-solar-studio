"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Boxes, Building2, ClipboardList, DatabaseBackup, FolderKanban, LayoutDashboard, Leaf, Moon, Search, ShieldCheck, Sun, SunMedium } from "lucide-react";

const navigation = [
  { href: "/", label: "Portfolio", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/products", label: "Product catalog", icon: Boxes },
  { href: "/cost-catalog", label: "Cost catalog", icon: ClipboardList },
  { href: "/partners", label: "Partners", icon: Building2 },
  { href: "/operations", label: "Data & history", icon: DatabaseBackup },
  { href: "/settings", label: "Security", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    setDarkMode(document.documentElement.dataset.theme === "dark");
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
          {navigation.map(({ href, label, icon: Icon }) => {
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
          <div className="avatar">DS</div>
        </header>
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  );
}
