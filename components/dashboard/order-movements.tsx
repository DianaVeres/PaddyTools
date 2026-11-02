import { ClipboardList } from 'lucide-react';
import { formatDashboardDate as fmt } from '@/components/dashboard/common';
import type { DashboardOrder as Order } from '@/lib/dashboard-types';

export function OrderMovements({ order }: { order: Order }) {
  return (
    <article className="info-card notes-card">
      <div className="card-title">
        <ClipboardList />
        <div>
          <h3>Movimientos de WooCommerce</h3>
          <p>El historial que aparece en el margen derecho del pedido</p>
        </div>
      </div>
      <div className="woo-movements">
        {order.movements?.length ? (
          order.movements.map((movement) => (
            <article className="woo-movement" key={movement.id}>
              <span className="woo-movement-dot" />
              <div>
                <div className="note-head">
                  <b>{movement.author}</b>
                  <time>{movement.date ? fmt(movement.date) : 'Sin fecha'}</time>
                </div>
                <p>{movement.text || 'Movimiento sin descripción'}</p>
                {movement.customerVisible && (
                  <small>Nota visible para el cliente</small>
                )}
              </div>
            </article>
          ))
        ) : (
          <p className="notes-empty">
            WooCommerce no tiene movimientos para este pedido.
          </p>
        )}
      </div>
    </article>
  );
}
