'use client';

import { FormEvent, useState } from 'react';
import { KeyRound } from 'lucide-react';

export default function ActivatePage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 10)
      return setError('La contraseña debe tener al menos 10 caracteres.');
    if (password !== confirmation)
      return setError('Las dos contraseñas no coinciden.');
    const token =
      new URLSearchParams(window.location.search).get('token') || '';
    if (!token) return setError('Falta el código personal de activación.');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(data.error || 'No se pudo activar la cuenta.');
      window.location.assign('/');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo activar la cuenta.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img src="/paddy-logo-granate.png" alt="Paddy" />
        <p className="eyebrow">PaddyTools</p>
        <h1>Activar mi cuenta</h1>
        <p className="auth-intro">
          Elige una contraseña personal. El enlace solo puede utilizarse una
          vez.
        </p>
        <form onSubmit={submit}>
          <label>
            <span>Contraseña</span>
            <div className="auth-input">
              <KeyRound />
              <input
                type="password"
                autoComplete="new-password"
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </label>
          <label>
            <span>Repetir contraseña</span>
            <div className="auth-input">
              <KeyRound />
              <input
                type="password"
                autoComplete="new-password"
                minLength={10}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            </div>
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Activando…' : 'Activar y entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
