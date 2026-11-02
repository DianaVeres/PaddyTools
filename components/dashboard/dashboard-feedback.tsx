import { AlertTriangle, Check, RefreshCw, Search } from 'lucide-react';

export function DashboardFeedback({
  saved,
  error,
  loading,
  hasContent,
}: {
  saved: string;
  error: string;
  loading: boolean;
  hasContent: boolean;
}) {
  return (
    <>
      {saved && (
        <div className="success-toast">
          <Check />
          {saved}
        </div>
      )}
      {error && (
        <div className="error-banner">
          <AlertTriangle />
          <div>
            <b>No hemos podido mostrar el pedido</b>
            <span>{error}</span>
          </div>
        </div>
      )}
      {!hasContent && !loading && !error && (
        <div className="empty-state">
          <Search />
          <h2>Busca un pedido, reserva o prenda especial</h2>
          <p>Consultaremos WooCommerce, incidencias y Monday.</p>
        </div>
      )}
      {loading && (
        <div className="empty-state">
          <RefreshCw className="spin" />
          <h2>Consultando WooCommerce, Monday e incidencias</h2>
          <p>
            Estamos buscando todos los pedidos, reservas, prendas e incidencias.
          </p>
        </div>
      )}
    </>
  );
}
