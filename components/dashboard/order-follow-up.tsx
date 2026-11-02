import { Mail, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardOrder as Order } from '@/lib/dashboard-types';

export function OrderFollowUp({
  order,
  onPrepareEmail,
}: {
  order: Order;
  onPrepareEmail: () => void;
}) {
  return (
    <>
      <article className="info-card">
        <div className="card-title">
          <PackageCheck />
          <div>
            <h3>{order.shippingMethod}</h3>
            <p>Método de envío registrado en WooCommerce</p>
          </div>
        </div>
      </article>
      <article className="email-action-card">
        <div className="card-title">
          <Mail />
          <div>
            <h3>Avisar al cliente por email</h3>
            <p>
              El texto se adapta al tipo de entrega y se puede editar antes de
              enviarlo.
            </p>
          </div>
        </div>
        <Button onClick={onPrepareEmail}>
          <Mail /> Preparar email
        </Button>
      </article>
    </>
  );
}
