"use client";

import { useEffect, useState } from "react";
import { ArchiveRestore, ChevronLeft, ChevronRight, Clock3, Database, FileClock, HardDriveDownload, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import type { AuditLog, DatabaseBackup } from "@/lib/types";

const dateTime = (value:string) => new Intl.DateTimeFormat("en", { dateStyle:"medium", timeStyle:"short" }).format(new Date(value));
const size = (bytes:number) => bytes < 1024*1024 ? `${Math.round(bytes/1024)} KB` : `${(bytes/1024/1024).toFixed(1)} MB`;

export function OperationsView() {
  const [backups,setBackups]=useState<DatabaseBackup[]>([]);
  const [logs,setLogs]=useState<AuditLog[]>([]);
  const [types,setTypes]=useState<string[]>([]);
  const [filter,setFilter]=useState("");
  const [page,setPage]=useState(1);
  const [pages,setPages]=useState(1);
  const [totalLogs,setTotalLogs]=useState(0);
  const [auditLoading,setAuditLoading]=useState(false);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  async function loadBackups(){const response=await fetch("/api/backups",{cache:"no-store"});const payload=await response.json();if(!response.ok)throw new Error(payload.error);setBackups(payload.backups)}
  async function loadAudit(nextFilter=filter,nextPage=page){setAuditLoading(true);try{const params=new URLSearchParams({page:String(nextPage)});if(nextFilter)params.set("type",nextFilter);const response=await fetch(`/api/audit?${params}`,{cache:"no-store"});const payload=await response.json();if(!response.ok)throw new Error(payload.error);setLogs(payload.logs);setTypes(payload.types);setPage(payload.pagination.page);setPages(payload.pagination.pages);setTotalLogs(payload.pagination.total)}finally{setAuditLoading(false)}}
  useEffect(()=>{Promise.all([loadBackups(),loadAudit("",1)]).catch(reason=>setError(reason.message))},[]);
  async function create(){setBusy("create");setMessage("");try{const response=await fetch("/api/backups",{method:"POST"});const payload=await response.json();if(!response.ok)throw new Error(payload.error);await loadBackups();setMessage("Manual backup created successfully.")}catch(reason){setError(reason instanceof Error?reason.message:"Backup failed.")}finally{setBusy("")}}
  async function restore(backup:DatabaseBackup){if(!confirm(`Restore Solar Studio from ${dateTime(backup.created_at)}?\n\nCurrent data will be replaced with this snapshot. A safety backup of the current database will be created first.`))return;setBusy(backup.name);setMessage("");try{const response=await fetch(`/api/backups/${encodeURIComponent(backup.name)}`,{method:"POST"});const payload=await response.json();if(!response.ok)throw new Error(payload.error);setMessage("Database restored. Reloading the workspace…");setTimeout(()=>window.location.assign("/"),900)}catch(reason){setError(reason instanceof Error?reason.message:"Restore failed.");setBusy("")}}
  async function remove(backup:DatabaseBackup){if(!confirm(`Delete backup from ${dateTime(backup.created_at)}? This cannot be undone.`))return;setBusy(backup.name);try{const response=await fetch(`/api/backups/${encodeURIComponent(backup.name)}`,{method:"DELETE"});if(!response.ok){const payload=await response.json();throw new Error(payload.error)}await Promise.all([loadBackups(),loadAudit()]);setMessage("Backup deleted.")}catch(reason){setError(reason instanceof Error?reason.message:"Could not delete backup.")}finally{setBusy("")}}
  async function changeFilter(value:string){setFilter(value);try{await loadAudit(value,1)}catch(reason){setError(reason instanceof Error?reason.message:"Could not load history.")}}
  async function changePage(next:number){if(next<1||next>pages||next===page)return;try{await loadAudit(filter,next)}catch(reason){setError(reason instanceof Error?reason.message:"Could not load history.")}}
  const pageNumbers=paginationNumbers(page,pages);

  return <>
    <div className="page-heading"><div><p className="eyebrow">Local data protection</p><h1>Backups & audit history</h1><p>Dated database snapshots, safe restore controls, and a chronological record of workspace changes.</p></div><button className="button primary" onClick={create} disabled={Boolean(busy)}><HardDriveDownload size={16}/>{busy==="create"?"Creating…":"Back up database"}</button></div>
    {error&&<div className="error-banner">{error}</div>}{message&&<div className="settings-message operations-message"><ShieldCheck size={14}/>{message}</div>}
    <div className="operations-grid">
      <section className="card backup-card"><div className="card-header"><div><h2>Database snapshots</h2><p>One automatic backup is created each day when Solar Studio opens.</p></div><span className="backup-count"><Database size={14}/>{backups.length}</span></div>{backups.length?<div className="backup-list">{backups.map(backup=><article key={backup.name}><span className={`backup-icon ${backup.kind}`}><ArchiveRestore size={17}/></span><div><strong>{backup.kind} backup</strong><span>{dateTime(backup.created_at)} · {size(backup.size)}</span><small>{backup.name}</small></div><button className="button secondary small" onClick={()=>restore(backup)} disabled={Boolean(busy)}><RotateCcw size={12}/>{busy===backup.name?"Working…":"Restore"}</button><button className="button ghost small" onClick={()=>remove(backup)} disabled={Boolean(busy)} title="Delete backup"><Trash2 size={13}/></button></article>)}</div>:<div className="empty-state"><Database size={30}/><h3>No backups yet</h3><p>Create the first snapshot of the local database.</p></div>}<div className="backup-safety"><ShieldCheck size={16}/><div><strong>Restore safety</strong><span>Before any restore, Solar Studio automatically preserves the current database as a new manual backup.</span></div></div></section>
      <aside className="card backup-info"><Clock3 size={20}/><h3>Automatic protection</h3><p>Daily snapshots are complete copies of projects, catalogs, economics, images, partner records, security settings, and history.</p><div><strong>Storage location</strong><span>Private local data folder · never uploaded to GitHub</span></div></aside>
    </div>
    <section className="card audit-card"><div className="card-header"><div><h2>Change history</h2><p>{totalLogs} latest edits across the Solar Studio workspace</p></div><select className="inline-select" value={filter} onChange={event=>changeFilter(event.target.value)}><option value="">All activity</option>{types.map(type=><option key={type}>{type}</option>)}</select></div>{logs.length?<><div className={`table-wrap audit-table-wrap ${auditLoading?"loading-page":""}`}><table className="data-table audit-table"><thead><tr><th>Change</th><th>Area</th><th>Details</th><th>Date & time</th></tr></thead><tbody>{logs.map(log=><tr key={log.id}><td><div className="audit-change"><span className={`audit-dot ${log.action}`}/><div><strong>{log.entity_name||log.entity_type}</strong><span className="audit-action">{log.action}</span></div></div></td><td><span className="audit-area">{log.entity_type}</span></td><td><p>{log.details||"—"}</p></td><td><time dateTime={log.created_at}>{dateTime(log.created_at)}</time></td></tr>)}</tbody></table></div><div className="table-pagination"><span>Showing page <strong>{page}</strong> of <strong>{pages}</strong> · {totalLogs} changes</span><div><button className="pagination-button arrow" onClick={()=>changePage(page-1)} disabled={page===1||auditLoading} aria-label="Previous history page"><ChevronLeft size={14}/></button>{pageNumbers.map((item,index)=>item==="…"?<span className="pagination-ellipsis" key={`ellipsis-${index}`}>…</span>:<button className={`pagination-button ${item===page?"active":""}`} key={item} onClick={()=>changePage(Number(item))} disabled={auditLoading}>{item}</button>)}<button className="pagination-button arrow" onClick={()=>changePage(page+1)} disabled={page===pages||auditLoading} aria-label="Next history page"><ChevronRight size={14}/></button></div></div></>:<div className="empty-state"><FileClock size={30}/><h3>No changes recorded yet</h3><p>New edits will appear here automatically.</p></div>}</section>
  </>;
}

function paginationNumbers(page:number,pages:number):(number|"…")[]{
  if(pages<=7)return Array.from({length:pages},(_,index)=>index+1);
  const values:(number|"…")[]=[1];
  if(page>4)values.push("…");
  for(let value=Math.max(2,page-1);value<=Math.min(pages-1,page+1);value+=1)values.push(value);
  if(page<pages-3)values.push("…");
  values.push(pages);
  return values;
}
