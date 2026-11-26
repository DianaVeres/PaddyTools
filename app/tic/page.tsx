'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Clipboard, KeyRound, Plus, RefreshCw, Save, ShieldCheck, UserRoundCheck, UserRoundX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import './tic.css';

import { PERMISSIONS, type AppPermission as Permission } from '@/lib/module-permissions';
type User = { email: string; displayName: string; active: boolean; permissions: Permission[]; createdAt: number; updatedAt: number };

export default function TicPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activationUrl, setActivationUrl] = useState('');
  const [form, setForm] = useState({ displayName: '', email: '', permissions: [] as Permission[] });

  const loadUsers = useCallback(async () => {
    setLoading(true); setError('');
    const response = await fetch('/api/tic/users');
    if (response.status === 401) return window.location.assign('/login');
    if (response.status === 403) return window.location.assign('/');
    const data = await response.json() as { users?: User[]; error?: string };
    if (!response.ok) setError(data.error || 'No se pudieron cargar los usuarios.');
    else setUsers(data.users || []);
    setLoading(false);
  }, []);
  useEffect(() => { void loadUsers(); }, [loadUsers]);

  function toggleFormPermission(permission: Permission) {
    setForm((current) => ({ ...current, permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission] }));
  }

  async function createUser(event: FormEvent) {
    event.preventDefault(); setSaving('new'); setError(''); setNotice('');
    const response = await fetch('/api/tic/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
    const data = await response.json() as { activationUrl?: string; error?: string };
    setSaving('');
    if (!response.ok) return setError(data.error || 'No se pudo crear el usuario.');
    setActivationUrl(data.activationUrl || '');
    setNotice('Usuario creado. Comparte su enlace de activación.');
    setForm({ displayName: '', email: '', permissions: [] as Permission[] });
    await loadUsers();
  }

  function updateLocal(email: string, changes: Partial<User>) {
    setUsers((current) => current.map((user) => user.email === email ? { ...user, ...changes } : user));
  }

  async function saveUser(user: User, options?: { newActivationLink?: boolean }) {
    setSaving(user.email); setError(''); setNotice('');
    const response = await fetch('/api/tic/users', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...user, ...options }) });
    const data = await response.json() as { activationUrl?: string; error?: string };
    setSaving('');
    if (!response.ok) return setError(data.error || 'No se pudieron guardar los cambios.');
    if (data.activationUrl) { setActivationUrl(data.activationUrl); setNotice('Nuevo enlace generado. El anterior ya no es válido.'); }
    else setNotice(user.active ? 'Permisos guardados.' : 'Usuario dado de baja y sesiones cerradas.');
    await loadUsers();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(activationUrl);
    setNotice('Enlace copiado al portapapeles.');
  }

  return <main className="tic-page">
    <header className="tic-header"><div>
      <a href="/"><ArrowLeft /> Volver a Detalle</a>
      <p className="eyebrow">Administración · Acceso restringido</p>
      <h1><ShieldCheck /> TIC</h1><p>Altas, bajas y permisos de acceso de los usuarios.</p>
    </div><Button variant="outline" onClick={() => void loadUsers()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> Actualizar</Button></header>

    {(error || notice) && <div className={`tic-message ${error ? 'error' : 'success'}`}>{error || notice}</div>}
    {activationUrl && <section className="activation-box"><div><b>Enlace de activación (válido durante 7 días)</b><span>{activationUrl}</span></div><Button onClick={() => void copyLink()}><Clipboard /> Copiar enlace</Button></section>}

    <section className="tic-card new-user"><div className="section-title"><Plus /><div><h2>Dar de alta un usuario</h2><p>La cuenta quedará pendiente hasta que el usuario elija su contraseña.</p></div></div>
      <form onSubmit={createUser}>
        <div className="tic-fields"><label>Nombre completo<Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Nombre y apellidos" required /></label><label>Correo electrónico<Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="usuario@paddy.es" required /></label></div>
        <fieldset><legend>Permisos iniciales</legend><div className="permission-grid">{PERMISSIONS.map(([key, label, description]) => <label className="permission" key={key}><input type="checkbox" checked={form.permissions.includes(key)} onChange={() => toggleFormPermission(key)} /><span><b>{label}</b><small>{description}</small></span></label>)}</div></fieldset>
        <Button disabled={saving === 'new'}><UserRoundCheck /> {saving === 'new' ? 'Creando…' : 'Crear usuario'}</Button>
      </form>
    </section>

    <section className="users-section"><div className="section-title"><KeyRound /><div><h2>Usuarios</h2><p>{users.length} cuentas registradas</p></div></div>
      {loading ? <div className="tic-empty">Cargando usuarios…</div> : <div className="user-list">{users.map((user) => <article className={`tic-card user-card ${user.active ? '' : 'inactive'}`} key={user.email}>
        <div className="user-heading"><div className="user-avatar">{user.displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div><div><Input className="name-input" value={user.displayName} onChange={(e) => updateLocal(user.email, { displayName: e.target.value })} /><p>{user.email}</p></div><span className={`status ${user.active ? 'active' : ''}`}>{user.active ? <><Check /> Activo</> : 'Inactivo'}</span></div>
        <div className="permission-grid compact">{PERMISSIONS.map(([key, label]) => <label className="permission" key={key}><input type="checkbox" checked={user.permissions.includes(key)} onChange={() => updateLocal(user.email, { permissions: user.permissions.includes(key) ? user.permissions.filter((item) => item !== key) : [...user.permissions, key] })} /><span><b>{label}</b></span></label>)}</div>
        <div className="user-actions"><Button variant="outline" onClick={() => void saveUser(user)} disabled={saving === user.email}><Save /> Guardar permisos</Button>{!user.active && <Button variant="outline" onClick={() => void saveUser(user, { newActivationLink: true })} disabled={saving === user.email}><KeyRound /> Generar enlace</Button>}<Button className={user.active ? 'danger-button' : ''} variant="outline" disabled={user.email === 'administracion@paddy.es' || saving === user.email} onClick={() => void saveUser({ ...user, active: !user.active })}>{user.active ? <><UserRoundX /> Dar de baja</> : <><UserRoundCheck /> Reactivar</>}</Button></div>
      </article>)}</div>}
    </section>
  </main>;
}
