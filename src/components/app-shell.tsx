"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, FolderKanban, LayoutDashboard, Leaf, Search, ShieldCheck, SunMedium } from "lucide-react";

const navigation = [
  { href: "/", label: "Portfolio", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/products", label: "Product catalog", icon: Boxes },
  { href: "/settings", label: "Security", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/unlock") return children;
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
          <div className="avatar">DS</div>
        </header>
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  );
}
