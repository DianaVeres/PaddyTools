import { CalendarDays, Mail, Printer, Shirt, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardMondayRecord as MondayRecord } from '@/lib/dashboard-types';

export function MondayCards({
  records,
  onPrintReservation,
  onEmailReservation,
}: {
  records: MondayRecord[];
  onPrintReservation: (record: MondayRecord, mode?: 'card' | 'label') => void;
  onEmailReservation: (record: MondayRecord) => void;
}) {
  return (
    <>
      {records.map((record) => (
        <article className={`linked-card monday-live ${record.kind}`} key={`${record.kind}-${record.id}`}>
          <div className="linked-accent">{record.kind === 'reserva' ? <CalendarDays /> : <Shirt />}</div>
          <div className="linked-main">
            <div className="section-head">
              <div>
                <span className="linked-type">
                  {record.kind === 'reserva' ? `Reserva nº ${record.reference || record.id}` : `Monday · ${record.board}`}
                </span>
                <h3>{record.article || record.specialDetails || (record.kind === 'reserva' ? 'Reserva registrada' : 'Prenda especial')}</h3>
              </div>
              {record.status && <span className="status status-green">{record.status}</span>}
            </div>
            <dl className="incident-details">
              <div><dt>Cliente</dt><dd>{record.customer || 'No indicado'}</dd></div>
              <div><dt>Teléfono</dt><dd>{record.phone || 'No indicado'}</dd></div>
              <div><dt>Colegio</dt><dd>{record.school || 'No indicado'}</dd></div>
              <div><dt>Fecha</dt><dd>{record.date || 'No indicada'}</dd></div>
              <div><dt>Código</dt><dd>{record.code || 'No indicado'}</dd></div>
              {record.kind === 'reserva' && (
                <div className="wide"><dt>Descripción del artículo</dt><dd>{record.articleDescription || record.article || 'No indicada'}</dd></div>
              )}
              <div><dt>Talla / unidades</dt><dd>{[record.size, record.units && `${record.units} uds.`].filter(Boolean).join(' · ') || 'No indicado'}</dd></div>
              {record.specialDetails && <div className="wide"><dt>Datos de la prenda especial</dt><dd>{record.specialDetails}</dd></div>}
              {record.observations && <div className="wide"><dt>Observaciones</dt><dd>{record.observations}</dd></div>}
            </dl>
            {record.kind === 'reserva' && (
              <div className="reservation-card-actions">
                <Button variant="outline" onClick={() => onPrintReservation(record, 'label')}><Tag /> Imprimir etiqueta</Button>
                <Button onClick={() => onPrintReservation(record, 'card')}><Printer /> Imprimir</Button>
                <Button variant="outline" onClick={() => onEmailReservation(record)}><Mail /> Preparar email</Button>
              </div>
            )}
          </div>
        </article>
      ))}
    </>
  );
}
