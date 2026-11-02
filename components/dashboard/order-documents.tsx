import { FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IncidentRecord as Incident } from '@/lib/incident-record';

export function OrderDocuments({
  incident,
  onView,
  onPrint,
}: {
  incident: Incident | null;
  onView: (incident: Incident) => void;
  onPrint: (incident: Incident) => void;
}) {
  return (
    <article className="info-card documents-card">
      <div className="card-title">
        <FileText />
        <div>
          <h3>Documentos del pedido</h3>
          <p>Incidencias generadas y listas para reimprimir</p>
        </div>
      </div>
      {incident ? (
        <div className="document-row">
          <span className="document-icon">
            <FileText />
          </span>
          <div>
            <b>Incidencia #{incident.orderNumber}</b>
            <small>
              {incident.incidentDate || 'Fecha no indicada'} ·{' '}
              {incident.solved ? 'Resuelta' : 'Pendiente'}
            </small>
          </div>
          <Button variant="outline" onClick={() => onView(incident)}>
            Ver
          </Button>
          <Button variant="outline" onClick={() => onPrint(incident)}>
            <Printer /> Reimprimir
          </Button>
        </div>
      ) : (
        <p className="documents-empty">
          Este pedido todavía no tiene documentos de incidencia.
        </p>
      )}
    </article>
  );
}
