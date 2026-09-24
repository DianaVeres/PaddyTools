'use client';

import { FormEvent, useState } from 'react';
import { LockKeyhole, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo iniciar sesión.');
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.assign(next?.startsWith('/') ? next : '/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img src="/paddy-logo-granate.png" alt="Paddy" />
        <p className="eyebrow">Gestión unificada</p>
        <h1>Acceso del equipo</h1>
        <p className="auth-intro">Entra con tu correo y tu contraseña. Todos trabajaréis sobre la misma información compartida.</p>
        <form onSubmit={submit}>
          <label><span>Correo</span><div className="auth-input"><Mail /><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></label>
          <label><span>Contraseña</span><div className="auth-input"><LockKeyhole /><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <small>Si todavía no tienes contraseña, abre el enlace personal de activación que te facilite Administración.</small>
      </section>
    </main>
  );
}
