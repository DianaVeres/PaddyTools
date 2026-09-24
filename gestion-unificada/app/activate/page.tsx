'use client';

import { FormEvent, useEffect, useState } from 'react';
import { LockKeyhole } from 'lucide-react';

export default function ActivatePage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => setToken(new URLSearchParams(window.location.search).get('token') || ''), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) return setError('Las dos contraseñas no coinciden.');
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo activar la cuenta.');
      window.location.assign('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo activar la cuenta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img src="/paddy-logo-granate.png" alt="Paddy" />
        <p className="eyebrow">Activación segura</p>
        <h1>Elige tu contraseña</h1>
        <p className="auth-intro">Debe tener al menos 10 caracteres. Este enlace solo puede utilizarse una vez.</p>
        {!token ? <p className="auth-error">Falta el código del enlace de activación.</p> : (
          <form onSubmit={submit}>
            <label><span>Nueva contraseña</span><div className="auth-input"><LockKeyhole /><input type="password" autoComplete="new-password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required /></div></label>
            <label><span>Repite la contraseña</span><div className="auth-input"><LockKeyhole /><input type="password" autoComplete="new-password" minLength={10} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button type="submit" disabled={loading}>{loading ? 'Activando…' : 'Activar y entrar'}</button>
          </form>
        )}
      </section>
    </main>
  );
}
