import type { FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  formatDashboardDate as fmt,
  SourceBadge,
} from '@/components/dashboard/common';
import type { OrderSearchMatch } from '@/lib/dashboard-types';
import type { IncidentRecord as Incident } from '@/lib/incident-record';

export function GlobalSearchPanel({
  query,
  loading,
  orderMatches,
  incidentMatches,
  onQueryChange,
  onSubmit,
  onSelectOrder,
  onSelectIncident,
}: {
  query: string;
  loading: boolean;
  orderMatches: OrderSearchMatch[];
  incidentMatches: Incident[];
  onQueryChange: (query: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectOrder: (match: OrderSearchMatch) => void;
  onSelectIncident: (match: Incident) => void;
}) {
  return (
    <section className="search-band">
      <div className="search-wrap">
        <p className="eyebrow">Consulta global</p>
        <h1>¿Qué necesitas localizar?</h1>
        <form onSubmit={onSubmit} className="search-box">
          <Search />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Número de pedido, nombre o teléfono…"
            aria-label="Buscar pedido por número, nombre o teléfono"
          />
          {query && (
            <button
              type="button"
              className="clear"
              onClick={() => onQueryChange('')}
            >
              <X />
            </button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Buscando…' : 'Buscar'}
          </Button>
        </form>
        {orderMatches.length > 0 && (
          <div className="order-search-results" aria-live="polite">
            <p>
              {orderMatches.length} pedido
              {orderMatches.length === 1 ? '' : 's'} encontrado
              {orderMatches.length === 1 ? '' : 's'}. Selecciona uno:
            </p>
            {orderMatches.map((match) => (
              <button
                type="button"
                key={match.id}
                onClick={() => onSelectOrder(match)}
              >
                <span>
                  <b>{match.number}</b> ·{' '}
                  {match.customerName || 'Cliente sin nombre'}
                </span>
                <small>
                  {[
                    match.phone,
                    match.email,
                    match.dateCreated ? fmt(match.dateCreated) : '',
                    match.total,
                    match.statusLabel,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </button>
            ))}
          </div>
        )}
        {incidentMatches.length > 0 && (
          <div
            className="order-search-results incident-search-results"
            aria-live="polite"
          >
            <p>
              {incidentMatches.length} incidencia
              {incidentMatches.length === 1 ? '' : 's'} encontrada
              {incidentMatches.length === 1 ? '' : 's'}. Selecciona una:
            </p>
            {incidentMatches.map((match) => (
              <button
                type="button"
                key={match.id}
                onClick={() => onSelectIncident(match)}
              >
                <span>
                  <b>{match.orderNumber}</b> ·{' '}
                  {match.customerName || 'Cliente sin nombre'}
                </span>
                <small>
                  {[
                    match.customerPhone,
                    match.customerEmail,
                    match.incidentDate,
                    match.solved ? 'Resuelta' : 'Pendiente',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </button>
            ))}
          </div>
        )}
        <div className="source-row">
          <SourceBadge color="#7c3aed">WooCommerce conectado</SourceBadge>
          <SourceBadge color="#ea580c">Incidencias conectado</SourceBadge>
          <SourceBadge color="#16a34a">Monday Reservas conectado</SourceBadge>
          <SourceBadge color="#db2777">Monday Prendas conectado</SourceBadge>
          <SourceBadge color="#0284c7">DetalWPF sincronizado</SourceBadge>
        </div>
      </div>
    </section>
  );
}
