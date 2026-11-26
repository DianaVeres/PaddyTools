import type { ReactNode } from 'react';
import '../preparar-pedidos/preparar-pedidos.css';

export default function ReturnsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="order-preparation-page min-h-screen">
      <header className="order-preparation-topbar">
        <a href="/">← PaddyTools</a>
        <strong>Gestionar devoluciones</strong>
      </header>
      <div className="order-preparation-shell grid min-w-0 gap-3">
        <nav aria-label="Devoluciones" className="flex flex-wrap gap-2">
          <a className="rounded-lg border bg-white p-2.5" href="/gestionar-devoluciones">Registrar recepción</a>
          <a className="rounded-lg border bg-white p-2.5" href="/gestionar-devoluciones/recibidas">Devoluciones recibidas</a>
        </nav>
        {children}
      </div>
    </main>
  );
}
