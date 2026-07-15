"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Mail, MapPin, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import type { Partner, PartnerQuote, PartnerType } from "@/lib/types";

type ProjectOption = { id: string; code: string; name: string; status: string };
const partnerCategories:PartnerType[]=["Installer","CFE Technician","Electrician","CFE Office Contact"];
const money = (value: number) => new Intl.NumberFormat("en-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${value.slice(0,10)}T12:00:00`));

export function PartnersView() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [editing, setEditing] = useState<Partner | "new" | null>(null);
  const [quoteEditor, setQuoteEditor] = useState<{ partner: Partner; quote?: PartnerQuote } | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/partners", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setPartners(payload.partners); setProjects(payload.projects); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load partners."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => partners.filter(partner => {
    const matchesType = type === "All" || partner.partner_type === type;
    const text = `${partner.company_name} ${partner.contact_name} ${partner.email} ${partner.phone}`.toLowerCase();
    return matchesType && text.includes(query.toLowerCase());
  }), [partners, query, type]);

  async function savePartner(event: FormEvent<HTMLFormElement>, links: Array<{project_id:string;relationship:string}>) {
    event.preventDefault();
    const body = { ...Object.fromEntries(new FormData(event.currentTarget)), project_links: links };
    const isNew = editing === "new";
    const response = await fetch(isNew ? "/api/partners" : `/api/partners/${editing?.id}`, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    setEditing(null); await load();
  }

  async function remove(partner: Partner) {
    if (!confirm(`Remove ${partner.company_name} from the directory? Its historical project costs and sourcing records will remain unchanged.`)) return;
    const response = await fetch(`/api/partners/${partner.id}`, { method: "DELETE" });
    if (!response.ok) { const payload = await response.json(); setError(payload.error); return; }
    await load();
  }

  async function saveQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!quoteEditor) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const editingQuote = quoteEditor.quote;
    const response = await fetch(editingQuote ? `/api/quotes/${editingQuote.id}` : `/api/partners/${quoteEditor.partner.id}/quotes`, { method: editingQuote ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    setQuoteEditor(null); await load();
  }

  async function removeQuote(quote: PartnerQuote) {
    if (!confirm(`Remove quote ${quote.reference || "record"}?`)) return;
    const response = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
    if (!response.ok) { const payload=await response.json(); setError(payload.error); return; }
    await load();
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">Project contact network</p><h1>Installers & CFE contacts</h1><p>Installer, electrical, technical, and CFE office contacts with project relationships, commercial terms, and performance notes.</p></div><button className="button primary" onClick={() => setEditing("new")}><Plus size={16}/>Add contact</button></div>
    {error && <div className="error-banner">{error}</div>}
    <div className="partner-toolbar"><div className="filters"><div className="partner-search"><Search size={14}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search company, contact, email, phone…"/></div><select className="inline-select" value={type} onChange={event=>setType(event.target.value)}><option>All</option>{partnerCategories.map(category=><option key={category}>{category}</option>)}</select></div><span>{visible.length} contact{visible.length===1?"":"s"}</span></div>
    {loading ? <div className="loading"><div><div className="spinner"/>Loading partner directory…</div></div> : visible.length ? <div className="partner-grid">{visible.map(partner => <PartnerCard key={partner.id} partner={partner} edit={()=>setEditing(partner)} remove={()=>remove(partner)} addQuote={()=>setQuoteEditor({partner})} editQuote={quote=>setQuoteEditor({partner,quote})} removeQuote={removeQuote}/>)}</div> : <section className="card empty-state"><Building2 size={30}/><h3>No matching partners</h3><p>Add a supplier or installer, or change the current filters.</p></section>}
    {editing && <PartnerModal partner={editing==="new"?null:editing} projects={projects} close={()=>setEditing(null)} submit={savePartner}/>} 
    {quoteEditor && <QuoteModal editor={quoteEditor} projects={projects} close={()=>setQuoteEditor(null)} submit={saveQuote}/>} 
  </>;
}

function PartnerCard({partner,edit,remove,addQuote,editQuote,removeQuote}:{partner:Partner;edit:()=>void;remove:()=>void;addQuote:()=>void;editQuote:(quote:PartnerQuote)=>void;removeQuote:(quote:PartnerQuote)=>void}) {
  return <article className="card partner-card">
    <header className="partner-card-head"><span className="partner-logo">{partner.company_name.slice(0,2).toUpperCase()}</span><div><span className={`partner-type ${partner.partner_type}`}>{partner.partner_type}</span><h2>{partner.company_name}</h2><small>{partner.status}</small></div><div className="partner-actions"><button className="button ghost small" onClick={edit}><Pencil size={13}/></button><button className="button ghost small" onClick={remove}><Trash2 size={13}/></button></div></header>
    <div className="partner-contact">{partner.contact_name&&<strong>{partner.contact_name}</strong>}{partner.email&&<a href={`mailto:${partner.email}`}><Mail size={12}/>{partner.email}</a>}{partner.phone&&<a href={`tel:${partner.phone}`}><Phone size={12}/>{partner.phone}</a>}{partner.address&&<span><MapPin size={12}/>{partner.address}</span>}</div>
    <div className="partner-details"><div><span>Payment terms</span><strong>{partner.payment_terms||"Not specified"}</strong></div>{partner.partner_type==="Installer"&&<div><span>Installer revenue-share terms</span><strong>{partner.installer_share_pct}% of customer revenue{partner.installer_share_terms?` · ${partner.installer_share_terms}`:""}</strong></div>}<div><span>Performance notes</span><strong>{partner.performance_notes||"No performance notes yet."}</strong></div></div>
    <div className="partner-projects"><span>Active projects</span>{partner.projects.length?<div>{partner.projects.map(project=><i key={`${project.id}-${project.relationship}`}>{project.code} · {project.name}<small>{project.relationship}</small></i>)}</div>:<p>No linked active projects.</p>}</div>
    <div className="quote-history"><div className="quote-history-head"><div><strong>Quote history</strong><span>{partner.quotes.length} record{partner.quotes.length===1?"":"s"}</span></div><button className="button secondary small" onClick={addQuote}><Plus size={12}/>Add quote</button></div>{partner.quotes.length?<div className="quote-list">{partner.quotes.slice(0,5).map(quote=><div className="quote-row" key={quote.id}><div><strong>{quote.reference||"Unnumbered quote"}</strong><span>{quote.project_name||"General quotation"} · {date(quote.quote_date)}</span></div><b>{money(quote.amount)}</b><span className={`status ${quote.status}`}>{quote.status}</span><button className="button ghost small" onClick={()=>editQuote(quote)}><Pencil size={12}/></button><button className="button ghost small" onClick={()=>removeQuote(quote)}><Trash2 size={12}/></button></div>)}</div>:<p className="quote-empty">No quotations recorded yet.</p>}</div>
  </article>;
}

function PartnerModal({partner,projects,close,submit}:{partner:Partner|null;projects:ProjectOption[];close:()=>void;submit:(event:FormEvent<HTMLFormElement>,links:Array<{project_id:string;relationship:string}>)=>void}) {
  const [type,setType]=useState<PartnerType>(partner?.partner_type||"Installer");
  const initial=Object.fromEntries((partner?.projects||[]).map(project=>[project.id,project.relationship]));
  const [links,setLinks]=useState<Record<string,string>>(initial);
  const toggle=(id:string,checked:boolean)=>setLinks(current=>{const next={...current};if(checked)next[id]=type;else delete next[id];return next});
  return <div className="modal-backdrop"><form className="modal partner-modal" onSubmit={event=>submit(event,Object.entries(links).map(([project_id,relationship])=>({project_id,relationship})))}><div className="modal-head"><div><p className="eyebrow">Contact directory</p><h2>{partner?"Edit contact":"Add project contact"}</h2></div><button type="button" className="button ghost small" onClick={close}>×</button></div><div className="modal-body"><div className="form-grid"><Field name="company_name" label="Company or office name" defaultValue={partner?.company_name} required/><div className="form-field"><label>Contact category</label><select name="partner_type" value={type} onChange={event=>setType(event.target.value as PartnerType)}>{partnerCategories.map(category=><option key={category}>{category}</option>)}</select></div><Field name="contact_name" label="Contact person" defaultValue={partner?.contact_name}/><Field name="email" label="Email" type="email" defaultValue={partner?.email}/><Field name="phone" label="Phone" defaultValue={partner?.phone}/><Field name="website" label="Website" defaultValue={partner?.website}/><div className="form-field full"><label>Address</label><input name="address" defaultValue={partner?.address}/></div>{type==="Installer"&&<><Field name="installer_share_pct" label="Installer revenue share (%)" type="number" min="0" max="100" step="0.1" defaultValue={partner?.installer_share_pct||0}/><Field name="installer_share_terms" label="Revenue-share terms" defaultValue={partner?.installer_share_terms} placeholder="Paid monthly after collection; 15-year term…"/></>}<Field name="payment_terms" label="Payment terms" defaultValue={partner?.payment_terms} placeholder="Net 30, paid after completion…"/><div className="form-field full"><label>Performance notes</label><textarea name="performance_notes" defaultValue={partner?.performance_notes} placeholder="Responsiveness, technical ability, reliability, useful context…"/></div><div className="form-field"><label>Status</label><select name="status" defaultValue={partner?.status||"Active"}><option>Active</option><option>Inactive</option></select></div><div className="form-field full"><label>Active projects</label><div className="project-link-list">{projects.map(project=><div key={project.id}><label><input type="checkbox" checked={Boolean(links[project.id])} onChange={event=>toggle(project.id,event.target.checked)}/><span><strong>{project.code} · {project.name}</strong><small>{project.status}</small></span></label></div>)}</div></div></div></div><div className="modal-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">{partner?"Save changes":"Add contact"}</button></div></form></div>;
}

function QuoteModal({editor,projects,close,submit}:{editor:{partner:Partner;quote?:PartnerQuote};projects:ProjectOption[];close:()=>void;submit:(event:FormEvent<HTMLFormElement>)=>void}) {
  const quote=editor.quote;
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">{editor.partner.company_name}</p><h2>{quote?"Edit quote":"Record a quote"}</h2></div><button type="button" className="button ghost small" onClick={close}>×</button></div><div className="modal-body"><div className="form-grid"><Field name="reference" label="Quote reference" defaultValue={quote?.reference} placeholder="Q-2026-014"/><Field name="quote_date" label="Quote date" type="date" defaultValue={quote?.quote_date?.slice(0,10)||new Date().toISOString().slice(0,10)} required/><div className="form-field"><label>Project</label><select name="project_id" defaultValue={quote?.project_id||""}><option value="">General quotation</option>{projects.map(project=><option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></div><Field name="amount" label="Quoted amount (MXN)" type="number" min="0" step="0.01" defaultValue={quote?.amount||0} required/><div className="form-field"><label>Status</label><select name="status" defaultValue={quote?.status||"Received"}>{["Draft","Requested","Received","Accepted","Declined","Expired"].map(status=><option key={status}>{status}</option>)}</select></div><div className="form-field full"><label>Quote notes</label><textarea name="notes" defaultValue={quote?.notes} placeholder="Scope, validity, exclusions, included products, delivery terms…"/></div></div></div><div className="modal-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">{quote?"Save quote":"Add quote"}</button></div></form></div>;
}

function Field({name,label,type="text",defaultValue,...props}:React.InputHTMLAttributes<HTMLInputElement>&{name:string;label:string}) { return <div className="form-field"><label>{label}</label><input name={name} type={type} defaultValue={defaultValue} {...props}/></div>; }
