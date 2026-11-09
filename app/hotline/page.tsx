'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BookOpenText,
  Check,
  Clipboard,
  FileSearch,
  Inbox,
  Loader2,
  Mail,
  Plus,
  Save,
  Search,
  Timer,
  X,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  beginAutomaticWork,
  cancelAutomaticWork,
  completeAutomaticWork,
  readAutomaticWork,
} from '@/lib/kpi-auto-timer';
import {
  splitSpanishHotlineReply,
  storedHotlineIncoming,
  storedHotlineReply,
  withSpanishHotlineInstruction,
} from '@/lib/hotline-language';
import styles from './hotline.module.css';

type HotlineCase = {
  id?: string;
  fecha: string;
  email: string;
  asunto: string;
  consulta: string;
  respuesta: string;
  estado: string;
  siguiente_paso: string;
  procedimiento: string;
  tipo?: string;
  categoria?: string;
};

type HotlineTemplate = {
  id?: string;
  titulo: string;
  categoria: string;
  origen?: string;
  activa?: string;
  ejemplo: string;
  respuesta: string;
};

type AnalyzeResult = {
  error?: string;
  reply?: string;
  next_step?: string;
  case_status?: string;
  procedure_reference?: string;
  category?: string;
  kind?: string;
  summary?: string;
};

const STATUSES = [
  'Abierto',
  'Pendiente de datos',
  'Pendiente interno',
  'Pendiente de cliente',
  'Resuelto',
  'Incidencia',
];
const HOTLINE_TIMER_KEY = 'hotline-reply';

function hotlineOrderReference(text: string) {
  const explicit = text.match(
    /(?:pedido|order|reserva)\s*(?:n[ºo°.]*)?\s*#?\s*((?:RPA|IPA|PA|R)?\d{4,})/i,
  )?.[1];
  const standalone = text.match(/\b(?:RPA|IPA|PA|R)\d{4,}\b/i)?.[0];
  return (explicit || standalone || '').toUpperCase();
}

async function readJson<T>(response: Response): Promise<T> {
  const raw = await response.text();
  try {
    return (raw ? JSON.parse(raw) : {}) as T;
  } catch {
    throw new Error('Hotline no devolvió una respuesta válida.');
  }
}

export default function HotlinePage() {
  const [tab, setTab] = useState('assistant');
  const [cases, setCases] = useState<HotlineCase[]>([]);
  const [templates, setTemplates] = useState<HotlineTemplate[]>([]);
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [incoming, setIncoming] = useState('');
  const [translatedIncoming, setTranslatedIncoming] = useState('');
  const [guidance, setGuidance] = useState('');
  const [reply, setReply] = useState('');
  const [englishReply, setEnglishReply] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [status, setStatus] = useState('Abierto');
  const [procedure, setProcedure] = useState('');
  const [category, setCategory] = useState('General');
  const [kind, setKind] = useState('Consulta');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [timerStartedIso, setTimerStartedIso] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [viewingOrder, setViewingOrder] = useState('');
  const [templateDraft, setTemplateDraft] = useState({
    titulo: '',
    categoria: 'General',
    ejemplo: '',
    respuesta: '',
  });

  async function refresh() {
    const [caseResponse, templateResponse] = await Promise.all([
      fetch('/api/hotline/cases'),
      fetch('/api/hotline/templates'),
    ]);
    const caseData = await readJson<{ cases?: HotlineCase[]; error?: string }>(
      caseResponse,
    );
    const templateData = await readJson<{
      templates?: HotlineTemplate[];
      error?: string;
    }>(templateResponse);
    if (!caseResponse.ok) throw new Error(caseData.error || 'No se pudo cargar el registro.');
    if (!templateResponse.ok) {
      throw new Error(templateData.error || 'No se pudieron cargar las plantillas.');
    }
    setCases(caseData.cases || []);
    setTemplates(templateData.templates || []);
  }

  useEffect(() => {
    refresh().catch((error) =>
      setNotice(error instanceof Error ? error.message : 'No se pudo cargar Hotline.'),
    );
    setTimerStartedIso(readAutomaticWork(HOTLINE_TIMER_KEY)?.startedIso || '');
  }, []);

  function updateIncoming(value: string) {
    setIncoming(value);
    setTranslatedIncoming('');
    setEnglishReply('');
    if (!orderReference) {
      const detected = hotlineOrderReference(`${subject} ${value}`);
      if (detected) setOrderReference(detected);
    }
    if (!value.trim()) return;
    const timer = beginAutomaticWork(
      HOTLINE_TIMER_KEY,
      'correos',
      'Respuesta gestionada desde Hotline',
    );
    setTimerStartedIso(timer.startedIso);
  }

  async function analyze() {
    if (!incoming.trim()) {
      setNotice('Escribe primero el email recibido.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/hotline/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          subject,
          incoming,
          guidance: withSpanishHotlineInstruction(guidance),
        }),
      });
      const data = await readJson<AnalyzeResult>(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo generar la respuesta.');
      const localized = splitSpanishHotlineReply(data.reply || '');
      setTranslatedIncoming(localized.translation);
      setReply(localized.reply);
      setEnglishReply(localized.englishReply);
      setNextStep(data.next_step || '');
      setStatus(STATUSES.includes(data.case_status || '') ? data.case_status! : 'Abierto');
      setProcedure(data.procedure_reference || 'Respuesta nueva');
      setCategory(data.category || 'General');
      setKind(data.kind || 'Consulta');
      if (!subject.trim()) {
        setSubject((data.summary || data.category || 'Consulta').trim().slice(0, 120));
      }
      setNotice(`Propuesta lista · ${data.procedure_reference || 'Respuesta nueva'}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo generar la respuesta.');
    } finally {
      setBusy(false);
    }
  }

  async function saveCase() {
    if (!reply.trim()) {
      setNotice('No hay una respuesta para guardar.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/hotline/cases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          asunto: subject,
          consulta: storedHotlineIncoming(incoming, translatedIncoming),
          respuesta: storedHotlineReply(reply, englishReply),
          estado: status,
          siguiente_paso: nextStep,
          procedimiento: procedure,
          categoria: category,
          tipo: kind,
        }),
      });
      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el contacto.');
      let timingWarning = '';
      try {
        await completeAutomaticWork(HOTLINE_TIMER_KEY, {
          notes: [email.trim(), subject.trim()].filter(Boolean).join(' · '),
        });
      } catch (error) {
        console.error('El contacto se guardó, pero falló su medición KPI.', error);
        cancelAutomaticWork(HOTLINE_TIMER_KEY);
        timingWarning = ' No se pudo registrar automáticamente el tiempo.';
      }
      setTimerStartedIso('');
      await refresh();
      setIncoming('');
      setTranslatedIncoming('');
      setReply('');
      setEnglishReply('');
      setNextStep('');
      setProcedure('');
      setCategory('General');
      setKind('Consulta');
      setNotice(`Contacto guardado. Puedes continuar el mismo caso.${timingWarning}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  async function saveTemplate() {
    if (!templateDraft.titulo.trim() || !templateDraft.respuesta.trim()) {
      setNotice('Indica el título y la respuesta de la plantilla.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/hotline/templates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(templateDraft),
      });
      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la plantilla.');
      await refresh();
      setTemplateDraft({ titulo: '', categoria: 'General', ejemplo: '', respuesta: '' });
      setShowTemplateForm(false);
      setNotice('Plantilla añadida correctamente.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar la plantilla.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    cancelAutomaticWork(HOTLINE_TIMER_KEY);
    setTimerStartedIso('');
    setEmail('');
    setSubject('');
    setIncoming('');
    setTranslatedIncoming('');
    setGuidance('');
    setReply('');
    setEnglishReply('');
    setNextStep('');
    setStatus('Abierto');
    setProcedure('');
    setCategory('General');
    setKind('Consulta');
    setOrderReference('');
    setNotice('');
  }

  const filteredCases = useMemo(
    () =>
      cases.filter(
        (item) =>
          (filter === 'Todos' || item.estado === filter) &&
          `${item.email} ${item.asunto} ${item.consulta} ${item.respuesta} ${item.procedimiento}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [cases, filter, query],
  );
  const filteredTemplates = useMemo(
    () =>
      templates.filter((item) =>
        `${item.titulo} ${item.categoria} ${item.ejemplo} ${item.respuesta}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [templates, query],
  );
  const latestCases = useMemo(() => {
    const grouped = new Map<string, HotlineCase>();
    for (const item of [...cases].reverse()) {
      grouped.set(item.email ? `${item.email}|${item.asunto}` : item.fecha, item);
    }
    return [...grouped.values()];
  }, [cases]);
  const resolved = latestCases.filter((item) => item.estado === 'Resuelto').length;

  return (
    <main className={styles.hotline}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.back} href="/">
            <ArrowLeft size={17} /> PaddyTools
          </a>
          <span className={styles.logo}><Mail size={22} /></span>
          <div>
            <h1>Hotline</h1>
            <p>Asistente de emails · Paddy</p>
          </div>
          <div id="kpi-timer-slot" className="kpi-timer-slot" />
          <span className={styles.shared}>Datos compartidos</span>
        </div>
      </header>
      <div className={styles.content}>
        <Tabs value={tab} onValueChange={(value) => { setTab(value); setQuery(''); }}>
          <TabsList className={styles.tabs}>
            <TabsTrigger value="assistant"><Mail /> Asistente</TabsTrigger>
            <TabsTrigger value="registry"><Inbox /> Registro</TabsTrigger>
            <TabsTrigger value="templates"><BookOpenText /> Plantillas</TabsTrigger>
            <TabsTrigger value="analysis"><BarChart3 /> Análisis</TabsTrigger>
          </TabsList>

          <TabsContent value="assistant">
            <section className={styles.twoColumns}>
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <div><p className={styles.eyebrow}>Entrada</p><h2>Email de la clienta</h2></div>
                  <button className={styles.secondary} onClick={reset}><Plus /> Nuevo caso</button>
                </div>
                <div className={styles.formGrid}>
                  <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="clienta@email.com" /></Field>
                  <Field label="Asunto / caso"><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Se detectará si lo dejas vacío" /></Field>
                </div>
                <div className={styles.orderLookup}>
                  <Field label="Pedido o reserva">
                    <input value={orderReference} onChange={(e) => setOrderReference(e.target.value.toUpperCase())} placeholder="Ej. PA49547 o R10692" />
                  </Field>
                  <button
                    className={styles.secondary}
                    onClick={() => {
                      const reference = orderReference.trim();
                      if (!reference) return setNotice('Indica el número de pedido o reserva.');
                      setViewingOrder(reference);
                    }}
                  >
                    <FileSearch /> Ver ficha del pedido
                  </button>
                </div>
                <Field label="Email recibido"><textarea className={styles.largeText} value={incoming} onChange={(e) => updateIncoming(e.target.value)} placeholder="Pega aquí el mensaje recibido…" /></Field>
                {translatedIncoming && <Field label="Traducción al castellano"><textarea className={styles.translatedText} value={translatedIncoming} readOnly /></Field>}
                {timerStartedIso && <p className={styles.timerNotice}><Timer /> Medición activa desde {new Date(timerStartedIso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>}
                <Field label="Información para redactar (opcional)"><textarea value={guidance} onChange={(e) => setGuidance(e.target.value)} placeholder="Datos o indicaciones que debe incluir la respuesta…" /></Field>
                <button className={styles.primary} onClick={analyze} disabled={busy}>{busy ? <Loader2 className={styles.spin} /> : <Mail />} Analizar y redactar</button>
              </div>
              <div className={styles.panel}>
                <div><p className={styles.eyebrow}>Propuesta</p><h2>Respuesta lista para revisar</h2></div>
                <Field label={englishReply ? 'Respuesta en castellano' : 'Respuesta'}><textarea className={styles.largeText} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Aquí aparecerá la propuesta…" /></Field>
                {englishReply && <Field label="Respuesta en inglés"><textarea className={styles.largeText} value={englishReply} onChange={(e) => setEnglishReply(e.target.value)} /></Field>}
                <div className={styles.resultGrid}>
                  <Field label="Siguiente paso"><textarea value={nextStep} onChange={(e) => setNextStep(e.target.value)} /></Field>
                  <Field label="Estado"><select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select><small title={procedure}>{procedure || 'Sin plantilla seleccionada'}</small></Field>
                </div>
                <div className={styles.actions}>
                  <button className={styles.primary} onClick={saveCase} disabled={busy}><Save /> Guardar contacto</button>
                  <button className={styles.secondary} onClick={() => { navigator.clipboard.writeText(englishReply || reply); setNotice(englishReply ? 'Respuesta en inglés copiada.' : 'Respuesta copiada.'); }} disabled={!reply && !englishReply}><Clipboard /> {englishReply ? 'Copiar respuesta en inglés' : 'Copiar respuesta'}</button>
                </div>
                {notice && <p className={styles.notice}><Check /> {notice}</p>}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="registry">
            <section className={styles.panel}>
              <SectionHead eyebrow="Historial común" title="Registro de casos">
                <SearchBox value={query} onChange={setQuery} />
                <select className={styles.compact} value={filter} onChange={(e) => setFilter(e.target.value)}><option>Todos</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
              </SectionHead>
              <div className={styles.tableWrap}><table><thead><tr><th>Fecha</th><th>Email</th><th>Asunto</th><th>Estado</th><th>Plantilla</th><th>Pedido</th></tr></thead><tbody>{filteredCases.map((item, index) => { const reference = hotlineOrderReference(`${item.asunto} ${item.consulta}`); return <tr key={item.id || `${item.fecha}-${index}`}><td>{formatDate(item.fecha)}</td><td>{item.email || '—'}</td><td><strong>{item.asunto || 'Sin asunto'}</strong><small>{item.consulta}</small></td><td><span className={styles.status}>{item.estado}</span></td><td>{item.procedimiento || '—'}</td><td>{reference ? <button className={styles.tableAction} onClick={() => setViewingOrder(reference)}><FileSearch /> Ver ficha</button> : '—'}</td></tr>; })}</tbody></table></div>
              <p className={styles.count}>{filteredCases.length} contactos</p>
            </section>
          </TabsContent>

          <TabsContent value="templates">
            <section className={styles.panel}>
              <SectionHead eyebrow="Biblioteca" title="Respuestas tipo">
                <button className={styles.primary} onClick={() => setShowTemplateForm((value) => !value)}><Plus /> {showTemplateForm ? 'Cancelar' : 'Nueva plantilla'}</button>
                <SearchBox value={query} onChange={setQuery} />
              </SectionHead>
              {showTemplateForm && <div className={styles.templateForm}><div className={styles.formGrid}><Field label="Título"><input value={templateDraft.titulo} onChange={(e) => setTemplateDraft({ ...templateDraft, titulo: e.target.value })} /></Field><Field label="Categoría"><input value={templateDraft.categoria} onChange={(e) => setTemplateDraft({ ...templateDraft, categoria: e.target.value })} /></Field></div><Field label="Ejemplo de consulta"><textarea value={templateDraft.ejemplo} onChange={(e) => setTemplateDraft({ ...templateDraft, ejemplo: e.target.value })} /></Field><Field label="Respuesta"><textarea className={styles.largeText} value={templateDraft.respuesta} onChange={(e) => setTemplateDraft({ ...templateDraft, respuesta: e.target.value })} /></Field><button className={styles.primary} onClick={saveTemplate} disabled={busy}><Save /> Guardar plantilla</button></div>}
              {notice && <p className={styles.notice}><Check /> {notice}</p>}
              <div className={styles.templateGrid}>{filteredTemplates.map((item) => <article className={styles.template} key={item.id || item.titulo}><div><span>{item.categoria}</span><h3>{item.titulo}</h3><p>{item.ejemplo}</p></div><details><summary>Ver respuesta completa</summary><pre>{item.respuesta}</pre><button className={styles.secondary} onClick={() => navigator.clipboard.writeText(item.respuesta)}><Clipboard /> Copiar</button></details></article>)}</div>
            </section>
          </TabsContent>

          <TabsContent value="analysis">
            <section className={styles.panel}>
              <div><p className={styles.eyebrow}>Resumen</p><h2>Análisis general</h2></div>
              <div className={styles.metrics}><Metric label="Contactos guardados" value={cases.length} /><Metric label="Casos medidos" value={latestCases.length} /><Metric label="Casos resueltos" value={resolved} /><Metric label="Tasa de resolución" value={`${latestCases.length ? Math.round((resolved * 100) / latestCases.length) : 0}%`} /></div>
              <div className={styles.breakdowns}><Breakdown title="Casos por estado" values={STATUSES.map((item) => [item, latestCases.filter((entry) => entry.estado === item).length])} /><Breakdown title="Plantillas más utilizadas" values={Object.entries(cases.reduce<Record<string, number>>((result, item) => { const key = item.procedimiento || 'Sin identificar'; result[key] = (result[key] || 0) + 1; return result; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8)} /></div>
            </section>
          </TabsContent>
        </Tabs>
      </div>
      {viewingOrder && (
        <div className={styles.orderOverlay} role="dialog" aria-modal="true" aria-label={`Ficha del pedido ${viewingOrder}`}>
          <div className={styles.orderDialog}>
            <header>
              <div><span>Ficha conectada</span><strong>Pedido {viewingOrder}</strong></div>
              <button className={styles.closeOrder} onClick={() => setViewingOrder('')} aria-label="Cerrar ficha"><X /></button>
            </header>
            <iframe src={`/?order=${encodeURIComponent(viewingOrder)}&embedded=1`} title={`Ficha del pedido ${viewingOrder}`} />
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className={styles.field}><span>{label}</span>{children}</label>; }
function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <label className={styles.search}><Search /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Buscar…" aria-label="Buscar" /></label>; }
function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) { return <div className={styles.sectionHead}><div><p className={styles.eyebrow}>{eyebrow}</p><h2>{title}</h2></div>{children}</div>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div className={styles.metric}><strong>{value}</strong><span>{label}</span></div>; }
function Breakdown({ title, values }: { title: string; values: [string, number][] }) { const max = Math.max(1, ...values.map((item) => item[1])); return <div className={styles.breakdown}><h3>{title}</h3>{values.filter((item) => item[1] > 0).map(([label, value]) => <div className={styles.barRow} key={label}><div><span>{label}</span><b>{value}</b></div><i><em style={{ width: `${(value * 100) / max}%` }} /></i></div>)}</div>; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); }
