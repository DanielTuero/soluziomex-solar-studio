"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, FolderPlus, Search, X } from "lucide-react";
import { money, number } from "@/lib/economics";

type PipelineProject = {
  id: string; code: string; name: string; customer_name: string; location: string; status: string;
  capacity_kw: number; equipment_cost: number; soft_costs: number; monthly_customer_fee: number;
  item_count: number; target_install_date: string | null;
};
const stages = ["Prospect", "Design", "Procurement", "Installation", "Operating"];

export function ProjectsView() {
  const [projects, setProjects] = useState<PipelineProject[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => fetch("/api/projects").then(async (response) => {
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setProjects(payload.projects);
  }).catch((reason) => setError(reason.message)).finally(() => setLoading(false));

  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => projects.filter((project) => `${project.code} ${project.name} ${project.customer_name} ${project.location}`.toLowerCase().includes(search.toLowerCase())), [projects, search]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    setOpen(false);
    await load();
  }

  async function changeStage(project: PipelineProject, status: string) {
    setProjects((current) => current.map((item) => item.id === project.id ? { ...item, status } : item));
    const response = await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error);
      await load();
    }
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">Development pipeline</p><h1>Projects</h1><p>Track every opportunity from first model through operation.</p></div><button className="button primary" onClick={() => setOpen(true)}><FolderPlus size={16} />New project</button></div>
    {error && <div className="error-banner">{error}</div>}
    <section className="card">
      <div className="card-header"><div><h2>All solar projects</h2><p>{projects.length} opportunities · {number(projects.reduce((sum, project) => sum + Number(project.capacity_kw), 0) / 1000, 2)} MW</p></div><div className="filters"><Search size={15} color="#819087" /><input className="filter-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects…" /></div></div>
      {loading ? <div className="loading"><div><div className="spinner" />Loading projects…</div></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Project</th><th>Stage</th><th>Capacity</th><th>Equipment + costs</th><th>Monthly fee</th><th>Target date</th><th></th></tr></thead><tbody>{visible.map((project) =>
        <tr key={project.id}>
          <td><div className="table-title"><div><span className="project-code">{project.code}</span><strong>{project.name}</strong><span>{project.customer_name} · {project.location}</span></div></div></td>
          <td><select className="inline-select" aria-label={`Stage for ${project.name}`} value={project.status} onChange={(event) => changeStage(project, event.target.value)}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></td>
          <td>{number(Number(project.capacity_kw), 2)} kW</td>
          <td><strong>{money(Number(project.equipment_cost) + Number(project.soft_costs), true)}</strong><span style={{ display: "block", color: "#7c8982", fontSize: 9, marginTop: 3 }}>{project.item_count} sourced items</span></td>
          <td>{money(Number(project.monthly_customer_fee))}</td>
          <td>{project.target_install_date ? formatDate(project.target_install_date, true) : "—"}</td>
          <td><Link className="button secondary small" href={`/projects/${project.id}`}>Model <ArrowRight size={13} /></Link></td>
        </tr>)}</tbody></table></div>}
    </section>
    {open && <div className="modal-backdrop"><form className="modal" onSubmit={create}><div className="modal-head"><div><p className="eyebrow">New opportunity</p><h2>Create a solar project</h2></div><button type="button" className="button ghost small" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button></div><div className="modal-body"><div className="form-grid">
      <Field name="code" label="Project code" placeholder="SLX-26004" required /><Field name="name" label="Project name" placeholder="Guadalajara Logistics Hub" required /><Field name="customer_name" label="Customer" placeholder="Customer company" required /><Field name="location" label="Location" placeholder="City, State" required /><Select name="status" label="Development stage" options={stages} /><Field name="target_install_date" label="Target installation" type="date" /><Field name="capacity_kw" label="System size (kW)" type="number" step="0.01" defaultValue="250" /><Field name="annual_usage_kwh" label="Annual load (kWh)" type="number" defaultValue="600000" /><Field name="electricity_rate" label="Electricity rate (MXN/kWh)" type="number" step="0.01" defaultValue="3.20" /><Field name="monthly_customer_fee" label="Monthly customer fee (MXN)" type="number" defaultValue="70000" /><Field name="specific_yield_kwh_kw" label="Specific yield (kWh/kW)" type="number" defaultValue="1650" /><Field name="utility_escalation_pct" label="Utility escalation (%)" type="number" step="0.1" defaultValue="5" />
    </div></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Cancel</button><button className="button primary">Create project</button></div></form></div>}
  </>;
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { const { label, ...rest } = props; return <div className="form-field"><label>{label}</label><input {...rest} /></div>; }
function Select({ name, label, options }: { name: string; label: string; options: string[] }) { return <div className="form-field"><label>{label}</label><select name={name}>{options.map((item) => <option key={item}>{item}</option>)}</select></div>; }
function formatDate(value: string, includeYear = false) { const parsed = new Date(value.length === 10 ? `${value}T00:00:00Z` : value); return parsed.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", ...(includeYear ? { year: "numeric" as const } : {}) }); }
