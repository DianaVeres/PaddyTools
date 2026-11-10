import { AlertTriangle, ExternalLink, Printer, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IncidentRecord as Incident } from '@/lib/incident-record';

export function IncidentCard({
  incident,
  onPrintIncident,
}: {
  incident: Incident;
  onPrintIncident: (incident: Incident, mode?: 'document' | 'label') => void;
}) {
  return (
    <article className="linked-card incident-live">
      <div className="linked-accent">
        <AlertTriangle />
      </div>
      <div className="linked-main">
        <div className="section-head">
          <div>
            <span className="linked-type">
              Incidencia nº {incident.orderNumber || 'sin número'}
            </span>
            <h3>{incident.incidentText || 'Incidencia registrada'}</h3>
          </div>
          <span
            className={`status ${incident.solved ? 'status-green' : 'status-amber'}`}
          >
            {incident.solved ? 'Resuelta' : 'Pendiente'}
          </span>
        </div>
        <dl className="incident-details">
          <div>
            <dt>Fecha</dt>
            <dd>{incident.incidentDate || 'No indicada'}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>{incident.customerName || 'No indicado'}</dd>
          </div>
          <div>
            <dt>Colegio</dt>
            <dd>
              {incident.school || incident.pickupSchoolName || 'No indicado'}
            </dd>
          </div>
          <div>
            <dt>Recogida</dt>
            <dd>
              {incident.pickupSchool
                ? incident.pickupReceived
                  ? 'Recibida'
                  : 'Pendiente'
                : 'No solicitada'}
            </dd>
          </div>
          <div>
            <dt>Envío</dt>
            <dd>
              {incident.shippingRequired
                ? incident.sent
                  ? 'Enviado'
                  : 'Pendiente'
                : 'No requerido'}
            </dd>
          </div>
          {incident.pickupDetails && (
            <div className="wide">
              <dt>Detalles de recogida</dt>
              <dd>{incident.pickupDetails}</dd>
            </div>
          )}
        </dl>
        {incident.recurrenceCount > 0 && (
          <div className="meta-line">
            <span>{incident.recurrenceCount} recurrencia(s) registrada(s)</span>
          </div>
        )}
        {incident.images.length > 0 && (
          <div className="meta-line">
            <span>{incident.images.length} imagen(es) adjunta(s)</span>
          </div>
        )}
        <div className="reservation-card-actions">
          <Button
            variant="outline"
            onClick={() => onPrintIncident(incident, 'label')}
          >
            <Tag /> Imprimir etiqueta
          </Button>
          <Button onClick={() => onPrintIncident(incident, 'document')}>
            <Printer /> Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const params = new URLSearchParams({
                openIncident: incident.orderNumber,
                source: incident.sourceType || 'order',
              });
              window.location.assign(`/incidencias?${params}`);
            }}
          >
            <ExternalLink /> Abrir incidencia
          </Button>
        </div>
      </div>
    </article>
  );
}
