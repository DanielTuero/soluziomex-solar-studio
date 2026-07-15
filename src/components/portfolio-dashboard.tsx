"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, CircleDollarSign, FolderKanban, Gauge, Zap } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, number } from "@/lib/economics";

type PortfolioProject = {
  id: string; code: string; name: string; customer_name: string; location: string; status: string;
  capacity_kw: number; equipment_cost: number; soft_costs: number; monthly_customer_fee: number; contract_years: number;
};

const stages = ["Prospect", "Design", "Procurement", "Installation", "Operating"];

export function PortfolioDashboard() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProjects(data.projects);
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => {
    const capacity = projects.reduce((s, p) => s + Number(p.capacity_kw), 0);
    const investment = projects.reduce((s, p) => s + Number(p.equipment_cost) + Number(p.soft_costs), 0);
    const annualRevenue = projects.reduce((s, p) => s + Number(p.monthly_customer_fee) * 12, 0);
    const contractValue = projects.reduce((s, p) => s + Number(p.monthly_customer_fee) * 12 * Number(p.contract_years), 0);
    return { capacity, investment, annualRevenue, contractValue };
  }, [projects]);

  const forecast = useMemo(() => Array.from({ length: 15 }, (_, index) => ({
    year: `Y${index + 1}`,
    revenue: totals.annualRevenue * Math.pow(1.03, index),
    platform: totals.annualRevenue * Math.pow(1.03, index) * .82,
  })), [totals.annualRevenue]);

  if (loading) return <div className="loading"><div><div className="spinner" />Loading your solar portfolio…</div></div>;
  return <>
    <div className="page-heading">
      <div><p className="eyebrow">Portfolio command center</p><h1>Good afternoon, Admin.</h1><p>Live economics across your solar development pipeline.</p></div>
      <Link className="button primary" href="/projects">Open project pipeline <ArrowRight size={15} /></Link>
    </div>
    {error && <div className="error-banner">{error}</div>}
    <div className="metric-grid">
      <div className="metric-card hero"><div className="metric-top"><span>Total capacity</span><span className="metric-icon"><Zap size={16} /></span></div><div className="metric-value">{number(totals.capacity / 1000, 2)} MW</div><div className="metric-note">Across {projects.length} active opportunities</div></div>
      <div className="metric-card"><div className="metric-top"><span>Modeled project cost</span><span className="metric-icon"><Banknote size={16} /></span></div><div className="metric-value">{money(totals.investment, true)}</div><div className="metric-note">Equipment + development + delivery</div></div>
      <div className="metric-card"><div className="metric-top"><span>Annual recurring revenue</span><span className="metric-icon"><CircleDollarSign size={16} /></span></div><div className="metric-value">{money(totals.annualRevenue, true)}</div><div className="metric-note positive">Year-one contracted fees</div></div>
      <div className="metric-card"><div className="metric-top"><span>Contracted revenue</span><span className="metric-icon"><Gauge size={16} /></span></div><div className="metric-value">{money(totals.contractValue, true)}</div><div className="metric-note">Nominal value over modeled terms</div></div>
    </div>
    <div className="dashboard-grid">
      <section className="card"><div className="card-header"><div><h2>Portfolio revenue outlook</h2><p>Platform share vs. gross customer fees</p></div><span className="status Operating">15-year view</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={forecast} margin={{top:5,right:15,left:4,bottom:0}}><defs><linearGradient id="gross" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5d9a79" stopOpacity={.28}/><stop offset="95%" stopColor="#5d9a79" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#e8ede9" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="year" tick={{fontSize:9,fill:'#7b8881'}} tickLine={false} axisLine={false}/><YAxis tickFormatter={(v)=>money(v,true)} tick={{fontSize:9,fill:'#7b8881'}} tickLine={false} axisLine={false}/><Tooltip formatter={(value)=>money(Number(value),true)} contentStyle={{border:'1px solid #e2e8e4',borderRadius:10,fontSize:11}}/><Area type="monotone" dataKey="revenue" name="Gross revenue" stroke="#85a897" fill="url(#gross)" strokeWidth={2}/><Area type="monotone" dataKey="platform" name="Soluziomex share" stroke="#143d2d" fill="transparent" strokeWidth={3}/></AreaChart></ResponsiveContainer></div></section>
      <section className="card"><div className="card-header"><div><h2>Development pipeline</h2><p>Projects by current stage</p></div><FolderKanban size={18} color="#476c5a" /></div><div className="pipeline">{stages.map(stage=>{const count=projects.filter(p=>p.status===stage).length; const pct=projects.length?Math.max(5,count/projects.length*100):0; return <div className="pipeline-row" key={stage}><span>{stage}</span><div className="pipeline-bar"><span style={{width:`${pct}%`}} /></div><strong>{count}</strong></div>})}</div></section>
    </div>
    <section className="card project-list"><div className="card-header"><div><h2>Priority projects</h2><p>Latest projects and commercial exposure</p></div><Link href="/projects" className="button secondary small">View all <ArrowRight size={13}/></Link></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Project</th><th>Status</th><th>Capacity</th><th>Modeled cost</th><th>Monthly fee</th><th></th></tr></thead><tbody>{projects.slice(0,5).map(project=><tr key={project.id}><td><div className="table-title"><div><span className="project-code">{project.code}</span><strong>{project.name}</strong><span>{project.customer_name} · {project.location}</span></div></div></td><td><span className={`status ${project.status}`}>{project.status}</span></td><td><strong>{number(Number(project.capacity_kw),2)} kW</strong></td><td>{money(Number(project.equipment_cost)+Number(project.soft_costs),true)}</td><td>{money(Number(project.monthly_customer_fee),false)}</td><td><Link className="button ghost small" href={`/projects/${project.id}`}>Open <ArrowRight size={13}/></Link></td></tr>)}</tbody></table></div></section>
  </>;
}
