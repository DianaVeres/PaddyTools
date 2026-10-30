export type PackingRecordSummary = {
  id: string;
  school: string;
  shippingDate: string;
  orderYear: number;
  orderMonth: number;
  createdAt: string;
};

export const localIsoDate = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const today = () => localIsoDate(new Date());

export const monthName = (month: number) =>
  new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(
    new Date(2026, month - 1, 1),
  );

export const displayDate = (date: string) =>
  new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(
    new Date(`${date}T12:00:00`),
  );

export const archiveStartDate = (now = new Date()) => {
  const date = new Date(now);
  date.setDate(date.getDate() - 56);
  return localIsoDate(date);
};

export const packingWeekStart = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return localIsoDate(date);
};

export const packingWeekLabel = (start: string) => {
  const first = new Date(`${start}T12:00:00`);
  const last = new Date(first);
  last.setDate(last.getDate() + 6);
  const formatter = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
  });
  return `Semana del ${formatter.format(first)} al ${formatter.format(last)} de ${last.getFullYear()}`;
};

export const packingRecordsByWeek = <T extends PackingRecordSummary>(
  items: T[],
) => {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const start = packingWeekStart(item.shippingDate);
    grouped.set(start, [...(grouped.get(start) || []), item]);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([start, rows]) => ({
      start,
      label: packingWeekLabel(start),
      rows: rows.sort(
        (left, right) =>
          right.shippingDate.localeCompare(left.shippingDate) ||
          right.createdAt.localeCompare(left.createdAt),
      ),
    }));
};
