"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Database, KeyRound, Save, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";

const sections = [
  {id:"portfolio",label:"Portfolio"},{id:"projects",label:"Projects"},{id:"products",label:"Product catalog"},
  {id:"cost_catalog",label:"Cost catalog"},{id:"partners",label:"Partners"},{id:"operations",label:"Data & history"},{id:"security",label:"Security"},
];

type ManagedUser = {id:string;username:string;display_name:string;is_admin:boolean;is_active:boolean;last_login_at:string|null;created_at:string;permissions:string[]};

export function SecuritySettings() {
  const [enabled,setEnabled]=useState(true);
  const [isAdmin,setIsAdmin]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [users,setUsers]=useState<ManagedUser[]>([]);
  const [securityToken,setSecurityToken]=useState("");
  const [newPermissions,setNewPermissions]=useState<string[]>(["portfolio","projects"]);

  function securityHeaders(token=securityToken,json=false){return {...(json?{"Content-Type":"application/json"}:{}),...(token?{"x-solar-studio-security":token}:{})}}
  async function loadUsers(token=securityToken){const response=await fetch("/api/security/users",{cache:"no-store",credentials:"same-origin",headers:securityHeaders(token)});const payload=await response.json();if(!response.ok)throw new Error(payload.error);setUsers(payload.users)}
  useEffect(()=>{fetch("/api/security/status",{cache:"no-store",credentials:"same-origin"}).then(response=>response.json()).then(async state=>{const token=typeof state.security_token==="string"?state.security_token:"";setEnabled(Boolean(state.enabled));setIsAdmin(Boolean(state.user?.is_admin));setSecurityToken(token);if(state.user?.is_admin)await loadUsers(token)}).catch(reason=>setError(reason.message)).finally(()=>setLoading(false))},[]);

  async function toggleProtection(){setLoading(true);clearNotices();const next=!enabled;try{const response=await fetch("/api/security/settings",{method:"PUT",credentials:"same-origin",headers:securityHeaders(securityToken,true),body:JSON.stringify({enabled:next})});const result=await response.json();if(!response.ok)throw new Error(result.error);setEnabled(result.enabled);setMessage(result.enabled?"Password entry is enabled.":"Password entry is disabled for this computer.")}catch(reason){setError(reason instanceof Error?reason.message:"Could not update this setting.")}finally{setLoading(false)}}
  async function changePassword(event:FormEvent<HTMLFormElement>){event.preventDefault();clearNotices();setBusy("password");const formElement=event.currentTarget;const form=new FormData(formElement);const next=String(form.get("new_password")??"");if(next!==String(form.get("confirm_password")??"")){setError("The new passwords do not match.");setBusy("");return}try{const response=await fetch("/api/security/password",{method:"PUT",credentials:"same-origin",headers:securityHeaders(securityToken,true),body:JSON.stringify({current_password:form.get("current_password"),new_password:next})});const result=await response.json();if(!response.ok)throw new Error(result.error);formElement.reset();if(typeof result.security_token==="string")setSecurityToken(result.security_token);setEnabled(true);setMessage("Your password was changed. Other signed-in sessions were closed.")}catch(reason){setError(reason instanceof Error?reason.message:"Could not change the password.")}finally{setBusy("")}}
  async function createUser(event:FormEvent<HTMLFormElement>){event.preventDefault();clearNotices();setBusy("create-user");const formElement=event.currentTarget;const form=new FormData(formElement);try{const response=await fetch("/api/security/users",{method:"POST",credentials:"same-origin",headers:securityHeaders(securityToken,true),body:JSON.stringify({display_name:form.get("display_name"),username:form.get("username"),password:form.get("password"),permissions:newPermissions})});const result=await response.json();if(!response.ok)throw new Error(result.error);formElement.reset();setNewPermissions(["portfolio","projects"]);await loadUsers();setMessage("New local user created.")}catch(reason){setError(reason instanceof Error?reason.message:"Could not create the user.")}finally{setBusy("")}}
  async function saveUser(user:ManagedUser,password:string){clearNotices();setBusy(user.id);try{const response=await fetch(`/api/security/users/${encodeURIComponent(user.id)}`,{method:"PUT",credentials:"same-origin",headers:securityHeaders(securityToken,true),body:JSON.stringify({...user,password})});const result=await response.json();if(!response.ok)throw new Error(result.error);await loadUsers();setMessage(`${user.display_name}'s access was updated.`)}catch(reason){setError(reason instanceof Error?reason.message:"Could not update the user.")}finally{setBusy("")}}
  async function removeUser(user:ManagedUser){if(!confirm(`Delete the local account for ${user.display_name}?`))return;clearNotices();setBusy(user.id);try{const response=await fetch(`/api/security/users/${encodeURIComponent(user.id)}`,{method:"DELETE",credentials:"same-origin",headers:securityHeaders()});if(!response.ok){const result=await response.json();throw new Error(result.error)}await loadUsers();setMessage("Local user deleted.")}catch(reason){setError(reason instanceof Error?reason.message:"Could not delete the user.")}finally{setBusy("")}}
  function updateUser(id:string,changes:Partial<ManagedUser>){setUsers(current=>current.map(user=>user.id===id?{...user,...changes}:user))}
  function toggleUserPermission(user:ManagedUser,section:string){const permissions=user.permissions.includes(section)?user.permissions.filter(item=>item!==section):[...user.permissions,section];updateUser(user.id,{permissions})}
  function clearNotices(){setMessage("");setError("")}

  return <>
    <div className="page-heading"><div><p className="eyebrow">Workspace settings</p><h1>Security & users</h1><p>Manage local passwords and decide which parts of Solar Studio each person can access.</p></div></div>
    {error&&<div className="error-banner">{error}</div>}{message&&<div className="settings-message security-page-message"><Check size={14}/>{message}</div>}

    <div className="security-top-grid">
      <section className="card security-card">
        <div className="security-heading"><span><KeyRound size={22}/></span><div><h2>Change your password</h2><p>Your current password is required before a new one can be saved.</p></div></div>
        <form className="security-password-form" onSubmit={changePassword}>
          <label><span>Current password</span><input name="current_password" type="password" autoComplete="current-password" required/></label>
          <label><span>New password</span><input name="new_password" type="password" autoComplete="new-password" minLength={4} required/></label>
          <label><span>Confirm new password</span><input name="confirm_password" type="password" autoComplete="new-password" minLength={4} required/></label>
          <button className="button primary" disabled={Boolean(busy)}><Save size={14}/>{busy==="password"?"Changing…":"Change password"}</button>
        </form>
      </section>
      <aside className="card security-info"><ShieldCheck size={19}/><h3>Local protection</h3><p>Passwords are stored as one-way cryptographic hashes. Account permissions and project data stay on this computer.</p><div><Database size={15}/><span>Restoring a recent backup also restores the users and access rules saved in that version.</span></div></aside>
    </div>

    {isAdmin&&<>
      <section className="card launch-protection-card"><div><strong>Password on app launch</strong><span>{enabled?"Everyone must sign in when Solar Studio opens.":"This computer opens Solar Studio without asking for a password."}</span></div><button type="button" className={`switch ${enabled?"on":""}`} onClick={toggleProtection} disabled={loading||Boolean(busy)} role="switch" aria-checked={enabled}><span/></button></section>

      <section className="card users-admin-card">
        <div className="card-header"><div><h2>Local users</h2><p>{users.length} account{users.length===1?"":"s"} · use the switches to control visible menu sections</p></div><span className="backup-count"><Users size={14}/>{users.length}</span></div>
        <div className="user-access-list">{users.map(user=><UserAccessCard key={user.id} user={user} busy={busy===user.id} update={changes=>updateUser(user.id,changes)} togglePermission={section=>toggleUserPermission(user,section)} save={password=>saveUser(user,password)} remove={()=>removeUser(user)}/>)}</div>
      </section>

      <section className="card create-user-card">
        <div className="security-heading"><span><UserPlus size={22}/></span><div><h2>Create a new user</h2><p>Give them a username, starting password, and only the menu access they need.</p></div></div>
        <form onSubmit={createUser}>
          <div className="security-user-fields"><label><span>Display name</span><input name="display_name" placeholder="María López" required/></label><label><span>Username</span><input name="username" placeholder="maria" autoComplete="off" required/></label><label><span>Starting password</span><input name="password" type="password" minLength={4} autoComplete="new-password" required/></label></div>
          <PermissionSwitches permissions={newPermissions} toggle={section=>setNewPermissions(current=>current.includes(section)?current.filter(item=>item!==section):[...current,section])}/>
          <button className="button primary" disabled={Boolean(busy)}><UserPlus size={14}/>{busy==="create-user"?"Creating…":"Create user"}</button>
        </form>
      </section>
    </>}
  </>;
}

function UserAccessCard({user,busy,update,togglePermission,save,remove}:{user:ManagedUser;busy:boolean;update:(changes:Partial<ManagedUser>)=>void;togglePermission:(section:string)=>void;save:(password:string)=>void;remove:()=>void}){
  const [password,setPassword]=useState("");
  return <article className={`user-access-card ${!user.is_active?"inactive":""}`}><div className="user-access-head"><div className="user-avatar">{user.display_name.split(/\s+/).map(part=>part[0]).join("").slice(0,2).toUpperCase()}</div><div><input aria-label="Display name" value={user.display_name} onChange={event=>update({display_name:event.target.value})} disabled={user.is_admin}/><span>@{user.username}{user.is_admin?" · Administrator":""}</span></div>{!user.is_admin&&<label className="account-active"><span>Active</span><button type="button" className={`switch mini ${user.is_active?"on":""}`} onClick={()=>update({is_active:!user.is_active})} role="switch" aria-checked={user.is_active}><span/></button></label>}</div>
    {user.is_admin?<div className="admin-full-access"><ShieldCheck size={15}/>Full access to every Solar Studio section</div>:<><PermissionSwitches permissions={user.permissions} toggle={togglePermission}/><div className="user-card-actions"><label><span>Reset password (optional)</span><input type="password" value={password} onChange={event=>setPassword(event.target.value)} placeholder="Leave blank to keep it" minLength={4}/></label><button type="button" className="button secondary small" onClick={()=>{save(password);setPassword("")}} disabled={busy}><Save size={12}/>{busy?"Saving…":"Save user"}</button><button type="button" className="button ghost small danger-text" onClick={remove} disabled={busy} title="Delete user"><Trash2 size={13}/></button></div></>}
  </article>;
}

function PermissionSwitches({permissions,toggle}:{permissions:string[];toggle:(section:string)=>void}){return <div className="permission-switches">{sections.map(section=><div key={section.id}><span>{section.label}</span><button type="button" className={`switch mini ${permissions.includes(section.id)?"on":""}`} onClick={()=>toggle(section.id)} role="switch" aria-checked={permissions.includes(section.id)}><span/></button></div>)}</div>}
