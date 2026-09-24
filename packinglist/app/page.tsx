'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  Clock3,
  ChevronRight,
  Copy,
  FileSpreadsheet,
  FileText,
  Folder,
  LoaderCircle,
  MessageCircle,
  Mic,
  PackageCheck,
  Pencil,
  Plus,
  Printer,
  Save,
  Send,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Order = {
  orderNumber: string;
  customerName: string;
  orderType?: string;
  orderDate: string;
  phone: string;
  box: string;
  schoolMismatch: boolean;
};
type RecordSummary = {
  id: string;
  school: string;
  shippingDate: string;
  orderYear: number;
  orderMonth: number;
  createdAt: string;
};
type PackingList = RecordSummary & { orders: Array<Order & { id: string }> };
type Activity = { id: string; action: 'creado' | 'modificado' | 'eliminado'; entityId: string; description: string; createdAt: string };
type View = 'create' | 'records' | 'folder' | 'detail' | 'messages' | 'activity';
type SpeechResultEvent = {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};
type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
async function readResponseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}
const today = () => new Date().toLocaleDateString('en-CA');
const monthName = (month: number) =>
  new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(
    new Date(2026, month - 1, 1),
  );
const displayDate = (date: string) =>
  new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(
    new Date(`${date}T12:00:00`),
  );
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
const schoolFolderWords = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(
      (word) =>
        word &&
        ![
          'colegio',
          'college',
          'school',
          'centro',
          'ceip',
          'cp',
          'web',
          'online',
          'tienda',
          'boarding',
          'de',
          'del',
          'el',
          'la',
          'los',
          'las',
        ].includes(word),
    );
const sameSchoolFolder = (left: string, right: string) => {
  const leftWords = schoolFolderWords(left);
  const rightWords = schoolFolderWords(right);
  if (!leftWords.length || !rightWords.length) return fold(left) === fold(right);
  if (leftWords.join(' ') === rightWords.join(' ')) return true;
  const [shorter, longer] =
    leftWords.length <= rightWords.length
      ? [leftWords, rightWords]
      : [rightWords, leftWords];
  return (
    shorter.length >= 2 &&
    shorter.every((word, index) => longer[index] === word)
  );
};
const schoolFolderName = (names: string[]) =>
  [...names].sort((left, right) => {
    const wordDifference =
      schoolFolderWords(left).length - schoolFolderWords(right).length;
    return wordDifference || left.length - right.length || left.localeCompare(right, 'es');
  })[0].trim();
const schoolWords = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(
      (word) =>
        word.length >= 3 &&
        ![
          'colegio',
          'college',
          'school',
          'centro',
          'ceip',
          'cp',
          'de',
          'del',
          'los',
          'las',
        ].includes(word),
    );
const schoolAcronym = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((word) => word && !['DE', 'DEL', 'EL', 'LOS', 'LAS'].includes(word))
    .map((word) => word[0])
    .join('');
const sameSchool = (expected: string, actual: string) => {
  if (!actual.trim()) return true;
  const expectedFolded = fold(expected);
  const actualFolded = fold(actual);
  if (
    !expectedFolded ||
    actualFolded.includes(expectedFolded) ||
    expectedFolded.includes(actualFolded)
  )
    return true;
  const expectedWords = schoolWords(expected);
  const actualWords = new Set(schoolWords(actual));
  if (expectedWords.some((word) => actualWords.has(word))) return true;
  const compactExpected = expected.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const compactActual = actual.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const expectedAcronym = schoolAcronym(expected);
  const actualAcronym = schoolAcronym(actual);
  return (
    compactExpected.length >= 2 &&
    compactExpected.length <= 6 &&
    actualAcronym.includes(compactExpected)
  ) || (
    compactActual.length >= 2 &&
    compactActual.length <= 6 &&
    expectedAcronym.includes(compactActual)
  );
};
const packingListType = (number: string) => {
  const reference = number.trim().toUpperCase();
  if (reference.startsWith('PA')) return 'on-line';
  if (reference.startsWith('I')) return 'Incidencia';
  if (reference.startsWith('R')) return 'Reserva';
  return 'on-line';
};

// Conservamos la referencia escrita porque su prefijo determina el tipo que
// aparecerá en el Packing List y el mensaje enviado al cliente.
const normalizePackingReference = (value: string) => {
  return value.replace(/\s/g, '').toUpperCase();
};

function parseBoxes(text: string) {
  const parsed: Array<{ box: string; orderNumber: string }> = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const split = line.indexOf(':');
    const box = (split >= 0 ? line.slice(0, split) : 'SIN CAJA')
      .trim()
      .toUpperCase();
    const numbers =
      (split >= 0 ? line.slice(split + 1) : line).match(
        /\b(?:RPA\s*\d+|PA\s*\d+|R\s*\d+|I[A-Z]*\d[A-Z0-9-]*)\b/gi,
      ) ?? [];
    for (const number of numbers)
      parsed.push({
        box,
        orderNumber: normalizePackingReference(number),
      });
  }
  return parsed;
}

const spokenDigits: Record<string, string> = {
  cero: '0', uno: '1', una: '1', dos: '2', tres: '3', cuatro: '4',
  cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9',
};

function dictatedReferences(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    // Los motores de voz móviles separan las siglas de forma distinta.
    // Mantener estas sustituciones antes de convertir "p a" en un pedido PA.
    .replace(/\b(?:i|y)\s*p(?:e)?\s*a\b|\bipa\b/g, ' IPA ')
    .replace(/\b(?:i|y)\s*(?:ene|n)\b|\bin\b/g, ' IN ')
    .replace(/\b(?:pe|p)\s+a\b/g, ' PA ')
    .replace(/\bpa\b/g, ' PA ')
    .replace(/\breservas?\b|\berre\b/g, ' R ')
    .replace(/\bincidencias?\b/g, ' I ')
    .replace(/\b(cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/g,
      (word) => spokenDigits[word] || word)
    .replace(/\bnumero\b|\bcodigo\b|\bpedido\b|\bcoma\b/g, ' ')
    .toUpperCase();
  const references = (segment: string) =>
    [...segment.matchAll(/\b(RPA|IPA|IN|PA|R|I)\s*((?:\d[\s-]*)+)/g)].map(
      (match) => normalizePackingReference(
        `${match[1]}${match[2].replace(/\D/g, '')}`,
      ),
    );
  const lines: string[] = [];
  for (const match of normalized.matchAll(/CAJA\s*(\d+)([\s\S]*?)(?=CAJA\s*\d+|$)/g)) {
    const codes = references(match[2]);
    if (codes.length) lines.push(`CAJA ${match[1]}: ${codes.join(', ')}`);
  }
  return { lines, references: references(normalized) };
}

function mergeDictation(current: string, transcript: string) {
  const dictated = dictatedReferences(transcript);
  const lines = current.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (dictated.lines.length) {
    for (const dictatedLine of dictated.lines) {
      const label = dictatedLine.slice(0, dictatedLine.indexOf(':')).trim();
      const newCodes = dictatedLine.slice(dictatedLine.indexOf(':') + 1).trim();
      const existingIndex = lines.findIndex(
        (line) => line.slice(0, line.indexOf(':')).trim().toUpperCase() === label,
      );
      if (existingIndex >= 0) {
        const existingCodes = lines[existingIndex].slice(lines[existingIndex].indexOf(':') + 1).trim();
        lines[existingIndex] = `${label}: ${[existingCodes, newCodes].filter(Boolean).join(', ')}`;
      } else {
        lines.push(dictatedLine);
      }
    }
  } else if (dictated.references.length) {
    if (!lines.length) lines.push('CAJA 1:');
    const last = lines.length - 1;
    const separator = lines[last].endsWith(':') ? ' ' : ', ';
    lines[last] += `${separator}${dictated.references.join(', ')}`;
  }
  return { text: lines.join('\n'), count: dictated.references.length };
}

export default function Home() {
  const now = new Date();
  const [view, setView] = useState<View>('create');
  const [school, setSchool] = useState('');
  const [shippingDate, setShippingDate] = useState(today());
  const [orderYear, setOrderYear] = useState(now.getFullYear());
  const [orderMonth, setOrderMonth] = useState(now.getMonth() + 1);
  const [boxes, setBoxes] = useState('CAJA 1: ');
  const [listening, setListening] = useState(false);
  const speechRef = useRef<SpeechRecognitionInstance | null>(null);
  const boxesRef = useRef<HTMLTextAreaElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selected, setSelected] = useState<PackingList | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PackingList | null>(null);
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const schools = useMemo(() => {
    const grouped: Array<{ names: string[]; items: RecordSummary[] }> = [];
    for (const row of records) {
      const group = grouped.find(({ names }) =>
        names.some((name) => sameSchoolFolder(name, row.school)),
      );
      if (group) {
        group.names.push(row.school);
        group.items.push(row);
      } else {
        grouped.push({ names: [row.school], items: [row] });
      }
    }
    return grouped
      .map(({ names, items }) => [schoolFolderName(names), items] as const)
      .sort(([a], [b]) => a.localeCompare(b, 'es'));
  }, [records]);

  useEffect(() => () => speechRef.current?.stop(), []);

  function toggleDictation() {
    if (listening) {
      speechRef.current?.stop();
      return;
    }
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      boxesRef.current?.focus();
      setMessage(
        'En este iPhone el navegador no permite iniciar el micrófono desde la web. He activado el campo: pulsa el micrófono del teclado del iPhone y dicta los códigos.',
      );
      return;
    }
    const recognition = new Recognition();
    speechRef.current = recognition;
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ');
      const merged = mergeDictation(boxes, transcript);
      if (!merged.count) {
        setMessage(`No reconocí ningún código en: “${transcript}”. Vuelve a intentarlo diciendo PA, reserva o incidencia antes del número.`);
        return;
      }
      setBoxes(merged.text);
      setMessage(`${merged.count} código${merged.count === 1 ? '' : 's'} añadido${merged.count === 1 ? '' : 's'} por voz. Revísalos antes de generar.`);
    };
    recognition.onerror = (event) => {
      const messages: Record<string, string> = {
        'not-allowed': 'Necesito permiso para usar el micrófono. Revisa el permiso del navegador.',
        'service-not-allowed': 'El servicio de dictado está desactivado en este dispositivo.',
        'audio-capture': 'No se ha encontrado un micrófono disponible.',
        'no-speech': 'No he oído ningún código. Pulsa Dictar códigos y vuelve a intentarlo.',
        network: 'El servicio de voz no ha respondido. Revisa la conexión e inténtalo de nuevo.',
      };
      setMessage(messages[event.error] || 'No se pudo reconocer el dictado. Inténtalo de nuevo.');
    };
    recognition.onend = () => {
      setListening(false);
      speechRef.current = null;
    };
    setMessage('Escuchando… Di, por ejemplo: caja uno, PA cuatro seis nueve cero cuatro.');
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      speechRef.current = null;
      boxesRef.current?.focus();
      setMessage(
        'No se pudo abrir el micrófono. Pulsa el micrófono del teclado del móvil y dicta directamente en el campo.',
      );
    }
  }

  async function loadRecords() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/packing-lists', { cache: 'no-store' });
      const data = await readResponseJson<RecordSummary[] & {
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los registros.');
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los registros.',
      );
    } finally {
      setLoading(false);
    }
  }
  async function openRecords() {
    setView('records');
    setSelectedSchool('');
    setSelected(null);
    await loadRecords();
  }
  async function openMessages() {
    setView('messages');
    setSelected(null);
    await loadRecords();
  }
  async function openActivity() {
    setView('activity');
    setSelected(null);
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/activity', { cache: 'no-store' });
      const data = await readResponseJson<Activity[] & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar la actividad.');
      setActivity(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo cargar la actividad.');
    } finally {
      setLoading(false);
    }
  }
  async function openPackingList(id: string, editAfter = false) {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/packing-lists?id=${encodeURIComponent(id)}`,
        { cache: 'no-store' },
      );
      const data = await readResponseJson<PackingList & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo abrir el PackingList.');
      setSelected(data);
      setDraft(structuredClone(data));
      setEditing(editAfter);
      setView('detail');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo abrir el PackingList.',
      );
    } finally {
      setLoading(false);
    }
  }
  async function openPackingMessages(id: string) {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/packing-lists?id=${encodeURIComponent(id)}`,
        { cache: 'no-store' },
      );
      const data = await readResponseJson<PackingList & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error || 'No se pudieron preparar los mensajes.');
      setSelected(data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron preparar los mensajes.',
      );
    } finally {
      setLoading(false);
    }
  }
  const referenceType = (number: string) => {
    const reference = number.trim().toUpperCase();
    if (reference.startsWith('I')) return 'Incidencia';
    if (reference.startsWith('R')) return 'Reserva';
    return 'Pedido';
  };
  const customerMessage = (order: Order, list: PackingList) => {
    const type = referenceType(order.orderNumber);
    return `Hola ${order.customerName}. IMPORTANTE: su ${type} ${order.orderNumber} YA ESTÁ EN EL COLEGIO ${list.school}. YA PUEDE IR AL COLEGIO A RECOGERLO. Gracias, un saludo.`;
  };
  const downloadExcel = (list: PackingList) => {
    const escape = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const shipping = list.shippingDate.split('-').reverse().join('/');
    const rows = list.orders
      .map(
        (order) =>
          `<tr><td>${escape(order.orderNumber)}</td><td>${escape(order.customerName)}</td><td>${escape(packingListType(order.orderNumber))}</td><td>${escape(order.orderDate ? order.orderDate.split('-').reverse().join('/') : '')}</td><td>${shipping}</td><td></td><td>${escape(order.phone)}</td><td>${escape(order.box)}</td></tr>`,
      )
      .join('');
    const blanks = Array.from(
      { length: Math.max(0, 14 - list.orders.length) },
      () =>
        '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>',
    ).join('');
    const workbook = `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>@page{size:portrait;margin:0.3in}body{font-family:Arial,sans-serif}.title{color:red;font-weight:bold;font-size:16px;height:55px}.label{color:red;font-weight:bold}.meta{height:30px}table{border-collapse:collapse;width:100%;font-size:9px}th{background:#aaa;color:#fff;font-weight:bold;text-align:center;height:32px;border:1px solid #fff}td{height:28px;border:1px solid #fff;padding:3px}tbody tr:nth-child(odd) td{background:#d3d3d3}tbody tr:nth-child(even) td{background:#ececec}</style><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>PackingList</x:Name><x:WorksheetOptions><x:Selected/><x:FitToPage/><x:PrintArea>$A$1:$H$18</x:PrintArea></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table><tr><td class="title" colspan="8">ALBARAN PEDIDO ON-LINE</td></tr><tr class="meta"><td colspan="2"></td><td class="label">COLEGIO:</td><td colspan="3">${escape(list.school)}</td><td colspan="2"></td></tr><tr class="meta"><td colspan="2"></td><td class="label">FECHA:</td><td colspan="3">${shipping}</td><td colspan="2"></td></tr><tr><th>Nº PEDIDO</th><th>NOMBRE</th><th>TIPO PEDIDO</th><th>FECHA PEDIDO</th><th>FECHA ENVÍO</th><th>FIRMA</th><th>TELEFONO</th><th>CAJA</th></tr><tbody>${rows}${blanks}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff', workbook], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PackingList-${list.school.replace(/[^a-z0-9]+/gi, '-')}-${list.shippingDate}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  async function savePackingList() {
    if (!draft) return;
    if (!draft.orders.length) {
      setMessage('Añade al menos un pedido antes de guardar.');
      return;
    }
    if (draft.orders.some((order) => !order.orderNumber.trim() || !order.customerName.trim())) {
      setMessage('Completa el número y el nombre de todos los pedidos añadidos.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/packing-lists?id=${encodeURIComponent(draft.id)}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(draft),
        },
      );
      const data = await readResponseJson<{ id?: string; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar.');
      await openPackingList(draft.id);
      setMessage('Cambios guardados correctamente.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron guardar los cambios.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function deletePackingList(id: string) {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/packing-lists?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );
      const data = await readResponseJson<{
        deleted?: boolean;
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo eliminar.');
      setSelected(null);
      setDraft(null);
      setEditing(false);
      setView(selectedSchool ? 'folder' : 'records');
      await loadRecords();
      setMessage('PackingList eliminado.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el PackingList.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const requested = parseBoxes(boxes);
    if (!school.trim() || !shippingDate || !requested.length) {
      setMessage(
        'Indica el colegio, la fecha y al menos un pedido, incidencia o reserva dentro de una caja.',
      );
      return;
    }
    const duplicates = requested.filter(
      (item, index) =>
        requested.findIndex(
          (other) => other.orderNumber === item.orderNumber,
        ) !== index,
    );
    if (duplicates.length) {
      setMessage(
        `Hay pedidos repetidos: ${[...new Set(duplicates.map((item) => item.orderNumber))].join(', ')}.`,
      );
      return;
    }
    setLoading(true);
    try {
      const found: Array<{
        orderNumber: string;
        customerName: string;
        orderDate: string;
        phone: string;
        box: string;
        schoolMismatch: boolean;
      }> = [];
      for (let start = 0; start < requested.length; start += 3) {
        const batch = await Promise.all(
          requested.slice(start, start + 3).map(async (item) => {
          if (/^PA/i.test(item.orderNumber)) {
            const response = await fetch(
              `/api/search?number=${encodeURIComponent(item.orderNumber)}`,
              { cache: 'no-store' },
            );
            const data = await readResponseJson<{
              number?: string;
              dateCreated?: string;
              customer?: { name?: string; phone?: string; address?: string };
              error?: string;
            }>(response);
            if (!response.ok)
              throw new Error(
                `${item.orderNumber}: ${data.error || 'no encontrado'}`,
              );
            return {
              orderNumber: data.number ?? item.orderNumber,
              customerName: data.customer?.name ?? '',
              orderDate: (data.dateCreated ?? '').slice(0, 10),
              phone: data.customer?.phone ?? '',
              box: item.box,
              // La dirección postal no identifica de forma fiable el colegio.
              // Los pedidos PA ya se consultan en su origen correcto.
              schoolMismatch: false,
            };
          }
          if (/^I/i.test(item.orderNumber)) {
            const response = await fetch(
              `/api/incidents?number=${encodeURIComponent(item.orderNumber)}`,
              { cache: 'no-store' },
            );
            const data = await readResponseJson<{
              found?: boolean;
              incident?: {
                customerName?: string;
                customerPhone?: string;
                incidentDate?: string;
                school?: string;
                pickupSchoolName?: string;
              };
              error?: string;
            }>(response);
            if (!response.ok || !data.found || !data.incident)
              throw new Error(
                `${item.orderNumber}: ${data.error || 'incidencia no encontrada'}`,
              );
            const incidentSchool =
              data.incident.school || data.incident.pickupSchoolName || '';
            return {
              orderNumber: item.orderNumber,
              customerName: data.incident.customerName ?? '',
              orderDate: (data.incident.incidentDate ?? '').slice(0, 10),
              phone: data.incident.customerPhone ?? '',
              box: item.box,
              schoolMismatch: !sameSchool(school, incidentSchool),
            };
          }
          const response = await fetch(
            `/api/monday?number=${encodeURIComponent(item.orderNumber)}`,
            { cache: 'no-store' },
          );
          const data = await readResponseJson<{
            found?: boolean;
            records?: Array<{
              customer?: string;
              phone?: string;
              date?: string;
              school?: string;
            }>;
            error?: string;
          }>(response);
          const reservation = data.records?.[0];
          if (!response.ok || !data.found || !reservation)
            throw new Error(
              `${item.orderNumber}: ${data.error || 'reserva no encontrada'}`,
            );
          return {
            orderNumber: item.orderNumber,
            customerName: reservation.customer ?? '',
            orderDate: (reservation.date ?? '').slice(0, 10),
            phone: reservation.phone ?? '',
            box: item.box,
            schoolMismatch: !sameSchool(school, reservation.school ?? ''),
          };
          }),
        );
        found.push(...batch);
      }
      const response = await fetch('/api/packing-lists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          school,
          shippingDate,
          orderYear,
          orderMonth,
          orders: found,
        }),
      });
      const saved = await readResponseJson<{ id?: string; error?: string }>(response);
      if (!response.ok || !saved.id)
        throw new Error(saved.error || 'No se pudo guardar.');
      await openPackingList(saved.id);
      setMessage('PackingList generado y archivado automáticamente.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo generar el PackingList.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options?: { signal?: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'abrir_registros_packinglist',
          title: 'Abrir registros de PackingList',
          description: 'Abre el archivo de PackingLists agrupado por colegio.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          async execute() {
            await openRecords();
            return { vista: 'registros' };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  useEffect(() => {
    void fetch('/api/schools', { cache: 'no-store' })
      .then((response) => readResponseJson<unknown>(response))
      .then((data: unknown) => {
        if (Array.isArray(data))
          setSchoolOptions(
            data.filter((item): item is string => typeof item === 'string'),
          );
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <button
          className="brand"
          onClick={() => {
            setView('create');
            setSelected(null);
          }}
        >
          <span className="brand-box">
            <PackageCheck />
          </span>
          <span>
            <b>Paddy Packing List</b>
            <small>Envíos a colegios</small>
          </span>
        </button>
        <div className="header-actions">
          <Button className="activity-button" onClick={() => void openActivity()}>
            <Clock3 /> ACTIVIDAD
          </Button>
          <Button
            className="messages-button"
            onClick={() => void openMessages()}
          >
            <MessageCircle /> MENSAJES
          </Button>
          <Button className="records-button" onClick={() => void openRecords()}>
            <Archive /> REGISTROS
          </Button>
          {view !== 'create' && (
            <Button
              variant="outline"
              onClick={() => {
                setView('create');
                setSelected(null);
              }}
            >
              <ArrowLeft /> Nuevo PackingList
            </Button>
          )}
        </div>
      </header>
      {view === 'create' && (
        <section className="page create-page">
          <div className="page-title">
            <span className="title-icon">
              <FileText />
            </span>
            <div>
              <p>NUEVO ENVÍO</p>
              <h1>Generar packing list</h1>
              <span>
                Pedidos PA, reservas R e incidencias I se consultan en su
                origen y el resultado se archiva automáticamente.
              </span>
            </div>
          </div>
          <form className="packing-form" onSubmit={generate}>
            <div className="form-grid">
              <label>
                <span>Colegio</span>
                <select
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  autoFocus
                  required
                >
                  <option value="">Selecciona un colegio</option>
                  {schoolOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Fecha de envío</span>
                <Input
                  type="date"
                  value={shippingDate}
                  onChange={(e) => setShippingDate(e.target.value)}
                />
              </label>
              <label>
                <span>Año de los pedidos</span>
                <Input
                  type="number"
                  min="2020"
                  max="2100"
                  value={orderYear}
                  onChange={(e) => setOrderYear(Number(e.target.value))}
                />
              </label>
              <label>
                <span>Mes de los pedidos</span>
                <select
                  value={orderMonth}
                  onChange={(e) => setOrderMonth(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {monthName(index + 1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="boxes-field">
              <span>Cajas y referencias</span>
              <small>
                Admite pedidos PA, reservas R e incidencias I. Una caja por
                línea.
              </small>
              <div className="voice-tools">
                <Button
                  type="button"
                  variant={listening ? 'default' : 'outline'}
                  className={listening ? 'voice-button listening' : 'voice-button'}
                  onClick={toggleDictation}
                  aria-pressed={listening}
                >
                  <Mic /> {listening ? 'Detener dictado' : 'Dictar códigos'}
                </Button>
                <small>Ejemplo: “Caja uno, PA 46904, reserva 1234”.</small>
              </div>
              <Textarea
                ref={boxesRef}
                rows={9}
                value={boxes}
                onChange={(e) => setBoxes(e.target.value)}
                placeholder={
                  'CAJA 1: PA46904, R1234, IN5678\nCAJA 2 RESERVAS: R46884, R46883'
                }
              />
            </label>
            <div className="example">
              <b>Ejemplo</b>
              <code>CAJA 1: PA46904, R1234, IN5678</code>
              <code>CAJA 2 RESERVAS: R46884, R46883</code>
            </div>
            {message && <p className="message error">{message}</p>}
            <Button
              className="generate-button"
              type="submit"
              disabled={loading}
            >
              {loading ? <LoaderCircle className="spin" /> : <PackageCheck />}
              {loading ? 'Consultando referencias…' : 'Generar packing list'}
            </Button>
          </form>
        </section>
      )}
      {view === 'activity' && (
        <section className="page records-page">
          <div className="records-heading">
            <div><p>HISTORIAL COMPARTIDO</p><h1>Actividad</h1><span>Registro común de altas, modificaciones y eliminaciones.</span></div>
          </div>
          {message && <p className="message error">{message}</p>}
          {loading ? <div className="loading"><LoaderCircle className="spin" /> Cargando actividad…</div> :
            <div className="activity-list">{activity.map((item) => (
              <article className={`activity-row activity-${item.action}`} key={item.id}>
                <span className="activity-icon"><Clock3 /></span>
                <span><b>{item.action.toUpperCase()}</b><p>{item.description}</p><small>{new Date(item.createdAt).toLocaleString('es-ES')}</small></span>
              </article>
            ))}</div>}
          {!loading && activity.length === 0 && <div className="empty"><Clock3 /><h2>Todavía no hay actividad</h2><p>Los próximos cambios quedarán registrados aquí.</p></div>}
        </section>
      )}
      {view === 'records' && (
        <section className="page records-page">
          <div className="records-heading">
            <div>
              <p>ARCHIVO COMPARTIDO</p>
              <h1>Registros</h1>
              <span>
                Selecciona un colegio para ver sus PackingLists ordenados por
                fecha.
              </span>
            </div>
            <div className="record-search">
              <Search />
              <Input
                placeholder="Buscar colegio"
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
              />
            </div>
          </div>
          {message && <p className="message error">{message}</p>}
          {loading ? (
            <div className="loading">
              <LoaderCircle className="spin" /> Cargando registros…
            </div>
          ) : (
            <div className="folder-grid">
              {schools
                .filter(([name]) => fold(name).includes(fold(selectedSchool)))
                .map(([name, items]) => (
                  <button
                    className="folder-card"
                    key={name}
                    onClick={() => {
                      setSelectedSchool(name);
                      setView('folder');
                    }}
                  >
                    <Folder />
                    <span>
                      <b>{name}</b>
                      <small>
                        {items.length}{' '}
                        {items.length === 1 ? 'PackingList' : 'PackingLists'}
                      </small>
                    </span>
                    <ChevronRight />
                  </button>
                ))}
            </div>
          )}
          {!loading && schools.length === 0 && (
            <div className="empty">
              <Archive />
              <h2>Todavía no hay registros</h2>
              <p>El primer PackingList aparecerá aquí automáticamente.</p>
            </div>
          )}
        </section>
      )}
      {view === 'folder' && (
        <section className="page records-page">
          <button
            className="back-link"
            onClick={() => {
              setSelectedSchool('');
              setView('records');
            }}
          >
            <ArrowLeft /> Todos los colegios
          </button>
          <div className="school-title">
            <Folder />
            <div>
              <p>COLEGIO</p>
              <h1>{selectedSchool}</h1>
            </div>
          </div>
          {message && <p className="message success">{message}</p>}
          <div className="record-list">
            {records
              .filter((item) => sameSchoolFolder(item.school, selectedSchool))
              .map((item) => (
                <div key={item.id} className="record-row-wrap">
                  <button
                    className="record-row"
                    onClick={() => void openPackingList(item.id)}
                  >
                    <span className="date-badge">
                      <CalendarDays />
                    </span>
                    <span>
                      <b>
                        PACKINGLIST_{item.school.replace(/\s+/g, '_')}_
                        {item.shippingDate.split('-').reverse().join('-')}
                      </b>
                      <small>
                        {displayDate(item.shippingDate)} · Pedidos de{' '}
                        {monthName(item.orderMonth)} {item.orderYear}
                      </small>
                    </span>
                    <ChevronRight />
                  </button>
                  <div className="record-actions">
                    <Button
                      variant="outline"
                      onClick={() => void openPackingList(item.id, true)}
                    >
                      <Pencil /> Editar
                    </Button>
                    <DeleteButton
                      onDelete={() => void deletePackingList(item.id)}
                    />
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
      {view === 'messages' && (
        <section className="page messages-page">
          <div className="records-heading">
            <div>
              <p>AVISOS A CLIENTES</p>
              <h1>Mensajes</h1>
              <span>
                Selecciona un PackingList y envía el aviso de entrega a cada
                cliente.
              </span>
            </div>
          </div>
          {message && <p className="message success">{message}</p>}
          {loading ? (
            <div className="loading">
              <LoaderCircle className="spin" /> Preparando mensajes…
            </div>
          ) : !selected ? (
            <div className="record-list">
              {records.map((item) => (
                <button
                  key={item.id}
                  className="record-row"
                  onClick={() => void openPackingMessages(item.id)}
                >
                  <span className="date-badge">
                    <MessageCircle />
                  </span>
                  <span>
                    <b>{item.school}</b>
                    <small>{displayDate(item.shippingDate)}</small>
                  </span>
                  <ChevronRight />
                </button>
              ))}
            </div>
          ) : (
            <>
              <button className="back-link" onClick={() => setSelected(null)}>
                <ArrowLeft /> Elegir otro PackingList
              </button>
              <div className="messages-title">
                <div>
                  <p>PACKINGLIST</p>
                  <h2>{selected.school}</h2>
                  <span>
                    {displayDate(selected.shippingDate)} ·{' '}
                    {selected.orders.length} mensajes
                  </span>
                </div>
              </div>
              <div className="customer-messages">
                {selected.orders.map((order) => {
                  const text = customerMessage(order, selected);
                  const phone = order.phone
                    .replace(/\D/g, '')
                    .replace(/^00/, '');
                  return (
                    <article className="customer-message" key={order.id}>
                      <div>
                        <b>{order.customerName}</b>
                        <small>
                          {order.orderNumber} · {order.phone || 'Sin teléfono'}
                        </small>
                        <p>{text}</p>
                      </div>
                      <div className="message-actions">
                        <Button
                          variant="outline"
                          onClick={() => {
                            void navigator.clipboard.writeText(text);
                            setMessage(
                              `Mensaje de ${order.customerName} copiado.`,
                            );
                          }}
                        >
                          <Copy /> Copiar
                        </Button>
                        {phone && (
                          <a
                            className="whatsapp-button"
                            href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Send /> WhatsApp
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}
      {view === 'detail' && selected && (
        <section className="page detail-page">
          <div className="detail-actions no-print">
            <button
              className="back-link"
              onClick={() => {
                setSelectedSchool(selected.school);
                setView('folder');
                setEditing(false);
              }}
            >
              <ArrowLeft /> {selected.school}
            </button>
            <div className="detail-buttons">
              {editing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraft(structuredClone(selected));
                      setEditing(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => void savePackingList()}
                    disabled={loading}
                  >
                    <Save /> Guardar cambios
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraft(structuredClone(selected));
                      setEditing(true);
                    }}
                  >
                    <Pencil /> Editar
                  </Button>
                  <DeleteButton
                    onDelete={() => void deletePackingList(selected.id)}
                  />
                  <Button variant="outline" onClick={() => downloadExcel(selected)}>
                    <FileSpreadsheet /> Descargar Excel
                  </Button>
                  <Button onClick={() => window.print()}>
                    <Printer /> Imprimir / guardar PDF
                  </Button>
                </>
              )}
            </div>
          </div>
          {message && (
            <p className="message success no-print">
              <PackageCheck /> {message}
              <button onClick={() => setMessage('')}>
                <X />
              </button>
            </p>
          )}
          {editing && draft ? (
            <article className="packing-sheet edit-sheet">
              <h1>EDITAR PACKINGLIST</h1>
              <div className="edit-meta">
                <label>
                  <span>Colegio</span>
                  <select
                    value={draft.school}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        school: e.target.value.toUpperCase(),
                      })
                    }
                  >
                    {!schoolOptions.includes(draft.school) && (
                      <option value={draft.school}>{draft.school}</option>
                    )}
                    {schoolOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Fecha de envío</span>
                  <Input
                    type="date"
                    value={draft.shippingDate}
                    onChange={(e) =>
                      setDraft({ ...draft, shippingDate: e.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Año</span>
                  <Input
                    type="number"
                    value={draft.orderYear}
                    onChange={(e) =>
                      setDraft({ ...draft, orderYear: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  <span>Mes</span>
                  <select
                    value={draft.orderMonth}
                    onChange={(e) =>
                      setDraft({ ...draft, orderMonth: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {monthName(index + 1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="edit-order-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      orders: [
                        ...draft.orders,
                        {
                          id: crypto.randomUUID(),
                          orderNumber: '',
                          customerName: '',
                          orderDate: '',
                          phone: '',
                          box: '',
                          schoolMismatch: false,
                        },
                      ],
                    })
                  }
                >
                  <Plus /> Añadir pedido manualmente
                </Button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nº PEDIDO</th>
                      <th>NOMBRE</th>
                      <th>FECHA PEDIDO</th>
                      <th>TELÉFONO</th>
                      <th>CAJA</th>
                      <th>QUITAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.orders.map((order, index) => (
                      <tr key={order.id}>
                        <td>
                          <Input
                            value={order.orderNumber}
                            onChange={(e) => {
                              const orders = [...draft.orders];
                              orders[index] = {
                                ...order,
                                orderNumber: e.target.value.toUpperCase(),
                              };
                              setDraft({ ...draft, orders });
                            }}
                          />
                        </td>
                        <td>
                          <Input
                            value={order.customerName}
                            onChange={(e) => {
                              const orders = [...draft.orders];
                              orders[index] = {
                                ...order,
                                customerName: e.target.value,
                              };
                              setDraft({ ...draft, orders });
                            }}
                          />
                        </td>
                        <td>
                          <Input
                            type="date"
                            value={order.orderDate}
                            onChange={(e) => {
                              const orders = [...draft.orders];
                              orders[index] = {
                                ...order,
                                orderDate: e.target.value,
                              };
                              setDraft({ ...draft, orders });
                            }}
                          />
                        </td>
                        <td>
                          <Input
                            value={order.phone}
                            onChange={(e) => {
                              const orders = [...draft.orders];
                              orders[index] = {
                                ...order,
                                phone: e.target.value,
                              };
                              setDraft({ ...draft, orders });
                            }}
                          />
                        </td>
                        <td>
                          <Input
                            value={order.box}
                            onChange={(e) => {
                              const orders = [...draft.orders];
                              orders[index] = {
                                ...order,
                                box: e.target.value.toUpperCase(),
                              };
                              setDraft({ ...draft, orders });
                            }}
                          />
                        </td>
                        <td>
                          <Button
                            type="button"
                            variant="outline"
                            className="remove-order-button"
                            aria-label={`Quitar ${order.orderNumber || 'fila nueva'}`}
                            onClick={() =>
                              setDraft({
                                ...draft,
                                orders: draft.orders.filter((_, orderIndex) => orderIndex !== index),
                              })
                            }
                          >
                            <Trash2 />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ) : (
            <article className="packing-sheet print-packing-sheet">
              <header className="packing-print-header">
                <h1>ALBARAN PEDIDO ON-LINE</h1>
                <div className="packing-print-meta">
                  <p>
                    <b>COLEGIO:</b>
                    <span>{selected.school}</span>
                  </p>
                  <p>
                    <b>FECHA:</b>
                    <span>{displayDate(selected.shippingDate)}</span>
                  </p>
                </div>
                <img
                  className="packing-print-logo"
                  src="/paddy-logo.png"
                  alt="Paddy"
                />
              </header>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nº PEDIDO</th>
                      <th>NOMBRE</th>
                      <th>TIPO PEDIDO</th>
                      <th>FECHA PEDIDO</th>
                      <th>FECHA ENVÍO</th>
                      <th>FIRMA</th>
                      <th>TELEFONO</th>
                      <th>CAJA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.orders.map((order) => (
                      <tr
                        key={order.id}
                        className={order.schoolMismatch ? 'mismatch' : ''}
                      >
                        <td>{order.orderNumber}</td>
                        <td>{order.customerName}</td>
                        <td>{packingListType(order.orderNumber)}</td>
                        <td>
                          {order.orderDate
                            ? order.orderDate.split('-').reverse().join('/')
                            : ''}
                        </td>
                        <td>
                          {selected.shippingDate.split('-').reverse().join('/')}
                        </td>
                        <td></td>
                        <td>{order.phone}</td>
                        <td>{order.box}</td>
                      </tr>
                    ))}
                    {Array.from(
                      { length: Math.max(0, 14 - selected.orders.length) },
                      (_, index) => (
                        <tr className="print-blank-row" key={`blank-${index}`}>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              {selected.orders.some((order) => order.schoolMismatch) && (
                <p className="warning no-print">
                  Las filas rojas pueden corresponder a otro colegio. Revísalas
                  antes del envío.
                </p>
              )}
            </article>
          )}
        </section>
      )}
    </main>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="outline" className="delete-button" />}
      >
        <Trash2 /> Eliminar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este PackingList?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borrará el PackingList y todos sus pedidos. Esta acción no se
            puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="confirm-delete" onClick={onDelete}>
            Sí, eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
