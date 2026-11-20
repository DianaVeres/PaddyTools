'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  ScanLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchSessionUser } from '@/lib/dashboard-api';
import './preparar-pedidos.css';

export default function PrepararPedidosPage() {
  const [reference, setReference] = useState('');

  useEffect(() => {
    void fetchSessionUser().catch(() => window.location.assign('/login'));
  }, []);

  function openOrder(event: FormEvent) {
    event.preventDefault();
    const value = reference.trim().toUpperCase();
    if (!value) return;
    window.location.assign(`/?order=${encodeURIComponent(value)}`);
  }

  return (
    <main className="order-preparation-page">
      <header className="order-preparation-topbar">
        <a href="/">
          <img src="/paddy-logo-granate.png" alt="Paddy" />
          <span>
            <strong>PaddyTools · Preparar pedidos</strong>
            <small>Control de preparación</small>
          </span>
        </a>
        <div id="kpi-timer-slot" className="kpi-timer-slot" />
        <Button variant="outline" onClick={() => window.location.assign('/')}>
          <ArrowLeft /> Gestión unificada
        </Button>
      </header>

      <section className="order-preparation-hero">
        <div>
          <span>NUEVO MÓDULO</span>
          <h1>Preparación de pedidos</h1>
          <p>
            Localiza el pedido que vas a preparar. En esta pantalla iremos
            incorporando el control de artículos, comprobación y finalización.
          </p>
        </div>
        <PackageCheck />
      </section>

      <section className="order-preparation-shell">
        <form className="order-preparation-search" onSubmit={openOrder}>
          <div>
            <span>EMPEZAR PREPARACIÓN</span>
            <h2>Escanea o escribe el número del pedido</h2>
          </div>
          <label>
            Pedido
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Ej. PA51206"
              autoCapitalize="characters"
              autoComplete="off"
            />
          </label>
          <Button type="submit" disabled={!reference.trim()}>
            <ScanLine /> Abrir pedido
          </Button>
        </form>

        <div className="order-preparation-columns">
          <article>
            <ClipboardList />
            <div>
              <span>POR PREPARAR</span>
              <strong>Pedidos pendientes</strong>
              <p>Aquí aparecerán los pedidos disponibles para comenzar.</p>
            </div>
          </article>
          <article>
            <PackageCheck />
            <div>
              <span>EN PREPARACIÓN</span>
              <strong>Trabajo en curso</strong>
              <p>Veremos quién prepara cada pedido y el tiempo empleado.</p>
            </div>
          </article>
          <article>
            <CheckCircle2 />
            <div>
              <span>PREPARADOS</span>
              <strong>Finalizados hoy</strong>
              <p>Quedará registrado cuándo se terminó y quién lo hizo.</p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
