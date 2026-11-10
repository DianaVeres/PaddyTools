import { AlertTriangle, Download, ExternalLink, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDashboardDate as fmt } from '@/components/dashboard/common';
import type { DashboardOrder as Order } from '@/lib/dashboard-types';

type OrderDocumentType = 'invoice' | 'packing-slip';

export function OrderHeading({
  order,
  documentLoading,
  onDownloadDocument,
  onRefresh,
  onOpenWooCommerce,
  onCreateIncident,
}: {
  order: Order;
  documentLoading: OrderDocumentType | null;
  onDownloadDocument: (type: OrderDocumentType) => void;
  onRefresh: () => void;
  onOpenWooCommerce: () => void;
  onCreateIncident: () => void;
}) {
  return (
    <div className="result-heading">
      <div>
        <span className="result-label">Resultado en WooCommerce</span>
        <div className="title-row">
          <h2>Pedido #{order.number}</h2>
          <span
            className={`status ${['completed', 'processing'].includes(order.status) ? 'status-green' : 'status-amber'}`}
          >
            {order.statusLabel}
          </span>
        </div>
        <p>Actualizado {fmt(order.dateModified)}</p>
      </div>
      <div className="result-actions">
        <Button variant="outline" onClick={onCreateIncident}>
          <AlertTriangle /> Crear incidencia
        </Button>
        <Button
          variant="outline"
          disabled={Boolean(documentLoading)}
          onClick={() => onDownloadDocument('invoice')}
        >
          {documentLoading === 'invoice' ? (
            <RefreshCw className="spin" />
          ) : (
            <Download />
          )}{' '}
          Factura
        </Button>
        <Button
          variant="outline"
          disabled={Boolean(documentLoading)}
          onClick={() => onDownloadDocument('packing-slip')}
        >
          {documentLoading === 'packing-slip' ? (
            <RefreshCw className="spin" />
          ) : (
            <FileText />
          )}{' '}
          Albarán devolución
        </Button>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw /> Actualizar
        </Button>
        <Button variant="outline" onClick={onOpenWooCommerce}>
          <ExternalLink /> Abrir en WooCommerce
        </Button>
      </div>
    </div>
  );
}
