"use client";

import { FormEvent, useEffect, useState } from "react";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import type { CostCatalogEntry } from "@/lib/types";

export function CostCatalogView() {
  const [costs, setCosts] = useState<CostCatalogEntry[]>([]);
  const [editing, setEditing] = useState<CostCatalogEntry | "new" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = () => fetch("/api/cost-catalog").then(async response => { const payload=await response.json();if(!response.ok)throw new Error(payload.error);setCosts(payload.costs); }).catch(reason=>setError(reason.message)).finally(()=>setLoading(false));
  useEffect(()=>{void load()},[]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));const isNew=editing==='new';const response=await fetch(isNew?'/api/cost-catalog':`/api/cost-catalog/${editing?.id}`,{method:isNew?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok){setError(payload.error);return}setEditing(null);await load()}
  async function remove(cost:CostCatalogEntry){if(!confirm(`Remove ${cost.name} from the cost catalog? Existing project costs will not change.`))return;const response=await fetch(`/api/cost-catalog/${cost.id}`,{method:'DELETE'});if(!response.ok){const payload=await response.json();setError(payload.error);return}await load()}
  return <>
    <div className="page-heading"><div><p className="eyebrow">Reusable budget library</p><h1>Cost catalog</h1><p>Standard cost names and descriptions ready to use across solar projects.</p></div><button className="button primary" onClick={()=>setEditing('new')}><Plus size={16}/>Add cost template</button></div>
    {error&&<div className="error-banner">{error}</div>}
    <section className="card"><div className="card-header"><div><h2>Cost templates</h2><p>{costs.length} reusable names and descriptions</p></div></div>
      {loading?<div className="loading"><div><div className="spinner"/>Loading cost catalog…</div></div>:costs.length?<div className="cost-catalog-list">{costs.map(cost=><article className="cost-catalog-row" key={cost.id}><span className="cost-catalog-icon"><ClipboardList size={16}/></span><div><h3>{cost.name}</h3><p>{cost.description||'No description yet.'}</p></div><div className="cost-catalog-actions"><button className="button ghost small" onClick={()=>setEditing(cost)}><Pencil size={13}/>Edit</button><button className="button ghost small" onClick={()=>remove(cost)}><Trash2 size={13}/>Remove</button></div></article>)}</div>:<div className="empty-state"><ClipboardList size={30}/><h3>No cost templates</h3><p>Add your first reusable project cost name and description.</p></div>}
    </section>
    {editing&&<CostCatalogModal cost={editing==='new'?null:editing} close={()=>setEditing(null)} submit={submit}/>}
  </>;
}

function CostCatalogModal({cost,close,submit}:{cost:CostCatalogEntry|null;close:()=>void;submit:(event:FormEvent<HTMLFormElement>)=>void}){
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">Cost catalog</p><h2>{cost?'Edit cost template':'Add cost template'}</h2></div><button type="button" className="button ghost small" onClick={close}>×</button></div><div className="modal-body"><div className="form-grid"><div className="form-field full"><label>Cost name</label><input name="name" defaultValue={cost?.name} placeholder="Installation labor" required/></div><div className="form-field full"><label>Description</label><textarea name="description" defaultValue={cost?.description} placeholder="Describe what this cost normally includes…"/></div></div></div><div className="modal-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">{cost?'Save changes':'Add template'}</button></div></form></div>;
}
