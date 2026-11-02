import { Shirt } from 'lucide-react';
import type { DashboardOrder as Order } from '@/lib/dashboard-types';

export function OrderItems({ order, units }: { order: Order; units: number }) {
  return (
    <article className="items-card">
      <div className="section-head">
        <div>
          <h3>Artículos del pedido</h3>
          <p>{order.items.length} artículos · {units} unidades</p>
        </div>
      </div>
      {order.items.map((item) => (
        <div className="item-row" key={item.id}>
          <div className="product-thumb"><Shirt /></div>
          <div className="product-name">
            <b>{item.name}</b>
            <small>{item.sku}</small>
          </div>
          <div><small>Talla</small><b>{item.size}</b></div>
          <div><small>Uds.</small><b>{item.quantity}</b></div>
          <strong>{item.total}</strong>
        </div>
      ))}
    </article>
  );
}
