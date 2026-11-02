import { CircleUserRound, ShoppingBag } from 'lucide-react';
import { formatDashboardDate as fmt } from '@/components/dashboard/common';
import type { DashboardOrder as Order } from '@/lib/dashboard-types';

export function OrderSummary({
  order,
  returnUpdating,
  onReturnAttendedChange,
}: {
  order: Order;
  returnUpdating: boolean;
  onReturnAttendedChange: (attended: boolean) => void;
}) {
  return (
    <div className="two-cards">
      <article className="info-card">
        <div className="card-title">
          <CircleUserRound />
          <div>
            <h3>Cliente</h3>
            <p>Datos de WooCommerce</p>
          </div>
        </div>
        <dl>
          <div>
            <dt>Nombre</dt>
            <dd>{order.customer.name || 'No indicado'}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>{order.customer.phone || 'No indicado'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{order.customer.email || 'No indicado'}</dd>
          </div>
          <div>
            <dt>Dirección</dt>
            <dd>{order.customer.address || 'No indicada'}</dd>
          </div>
        </dl>
      </article>
      <article className="info-card">
        <div className="card-title">
          <ShoppingBag />
          <div>
            <h3>Pedido</h3>
            <p>Información comercial</p>
          </div>
        </div>
        <dl>
          <div>
            <dt>Fecha</dt>
            <dd>{fmt(order.dateCreated)}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{order.statusLabel}</dd>
          </div>
          <div>
            <dt>Pago</dt>
            <dd>{order.payment}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd className="total">{order.total}</dd>
          </div>
        </dl>
        <label className="return-attended-control">
          <input
            type="checkbox"
            checked={order.returnAttended}
            disabled={returnUpdating}
            onChange={(event) => onReturnAttendedChange(event.target.checked)}
          />
          <span>
            <b>Devolución atendida</b>
            <small>
              {returnUpdating
                ? 'Actualizando WooCommerce…'
                : 'Sincronizado con WooCommerce'}
            </small>
          </span>
        </label>
      </article>
    </div>
  );
}
