import { ShoppingBag } from 'lucide-react';
import type { StoreTicketRecord as StoreTicket } from '@/lib/store-ticket';

export function StoreTicketCard({ ticket }: { ticket: StoreTicket }) {
  return (
    <div className="workspace">
      <div className="result-heading">
        <div>
          <span className="result-label">Ticket de caja · DetallWPF</span>
          <div className="title-row">
            <h2>Ticket #{ticket.number}</h2>
          </div>
          <p>
            {ticket.date || 'Fecha no indicada'} ·{' '}
            {ticket.store || 'Tienda no indicada'}
          </p>
        </div>
      </div>
      <article className="items-card">
        <div className="section-head">
          <div>
            <h3>{ticket.customer || 'Cliente desconocido'}</h3>
            <p>
              Operario: {ticket.operator || 'No indicado'} · Pago:{' '}
              {ticket.payment || 'No indicado'}
            </p>
          </div>
          <strong>{ticket.total || ''}</strong>
        </div>
        {ticket.items.map((item, index) => (
          <div className="item-row" key={index}>
            <div className="product-thumb">
              <ShoppingBag />
            </div>
            <div className="product-name">
              <b>{item.name || item.article || 'Artículo'}</b>
              <small>
                {[item.color, item.size && `Talla ${item.size}`]
                  .filter(Boolean)
                  .join(' · ')}
              </small>
            </div>
            <div>
              <small>Uds.</small>
              <b>{item.units ?? '—'}</b>
            </div>
            <div />
            <strong>{item.total || item.price || ''}</strong>
          </div>
        ))}
      </article>
    </div>
  );
}
