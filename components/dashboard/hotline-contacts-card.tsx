import { MessageSquareText } from 'lucide-react';
import type { HotlineOrderContact } from '@/lib/hotline-order-history';

const contactDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

export function HotlineContactsCard({
  contacts,
  loading,
  error,
}: {
  contacts: HotlineOrderContact[];
  loading: boolean;
  error: string;
}) {
  return (
    <article className="linked-card hotline-linked">
      <div className="linked-accent">
        <MessageSquareText />
      </div>
      <div className="linked-main">
        <span className="linked-type">Hotline</span>
        <h3>
          {loading
            ? 'Buscando conversaciones…'
            : contacts.length
              ? `${contacts.length} contacto${contacts.length === 1 ? '' : 's'} relacionado${contacts.length === 1 ? '' : 's'}`
              : 'Este pedido no tiene mensajes registrados'}
        </h3>
        {error && <p>{error}</p>}
        {!loading && !error && !contacts.length && (
          <p>No se encontró ningún mensaje ni respuesta vinculados a este número.</p>
        )}
        {contacts.length > 0 && (
          <div className="hotline-contact-list">
            {contacts.map((contact, index) => (
              <details key={contact.id || `${contact.fecha}-${index}`}>
                <summary>
                  <span>{contactDate(contact.fecha)}</span>
                  <b>{contact.asunto || 'Contacto sin asunto'}</b>
                  <small>{contact.estado || 'Sin estado'}</small>
                </summary>
                <div>
                  <b>Mensaje recibido</b>
                  <p>{contact.consulta || 'Sin texto guardado.'}</p>
                  <b>Respuesta enviada</b>
                  <p>{contact.respuesta || 'Sin respuesta guardada.'}</p>
                  {contact.siguiente_paso && (
                    <><b>Siguiente paso</b><p>{contact.siguiente_paso}</p></>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
