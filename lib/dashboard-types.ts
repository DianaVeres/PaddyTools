export type DashboardModal =
  | 'incidencia'
  | 'reserva'
  | 'registro'
  | 'reservas'
  | 'recogidas'
  | 'detalle-incidencia'
  | 'reserva-creada'
  | 'email'
  | null;

export type DashboardOrder = {
  id: number;
  number: string;
  status: string;
  statusLabel: string;
  dateCreated: string;
  dateModified: string;
  total: string;
  payment: string;
  transactionId: string;
  returnAttended: boolean;
  shippingMethod: string;
  wooUrl: string;
  movements: Array<{
    id: number;
    author: string;
    date: string;
    text: string;
    customerVisible: boolean;
  }>;
  customer: { name: string; phone: string; email: string; address: string };
  items: Array<{
    id: number;
    name: string;
    sku: string;
    quantity: number;
    size: string;
    total: string;
  }>;
};

export type DashboardShipment = {
  order: string;
  date: string;
  school: string;
  box: string;
  file: string;
};

export type DashboardMondayRecord = {
  id: string;
  kind: 'reserva' | 'prenda';
  board: string;
  reference: string;
  customer: string;
  phone: string;
  customerEmail: string;
  school: string;
  date: string;
  article: string;
  articleDescription: string;
  code: string;
  size: string;
  units: string;
  sentUnits?: string;
  pending: string;
  paid: string;
  status: string;
  observations: string;
  specialDetails: string;
  articleIds?: string[];
  customerIds?: string[];
  endDate?: string;
  productionDate?: string;
  estimatedProduction?: string;
  formula?: string;
  updatedAt: string;
};

export type IncidentDraft = {
  date: string;
  school: string;
  text: string;
  customerEmail: string;
  observations: string;
  pickup: boolean;
  pickupSchool: string;
  pickupNotes: string;
  recurrence: boolean;
  solved: boolean;
  sent: boolean;
  pickupItems: Record<
    number,
    { selected: boolean; size: string; units: number }
  >;
};

export type SchoolProduct = { id: number; name: string; sku: string };

export type ReservationDraft = {
  reference: string;
  customerId: string;
  customerName: string;
  phone: string;
  customerEmail: string;
  school: string;
  date: string;
  articleId: string;
  size: string;
  units: number;
  sentUnits: number;
  pending: number;
  paid: string;
  observations: string;
  status: string;
  endDate: string;
  productionDate: string;
  estimatedProduction: string;
  formula: string;
};

export type ReservationOptions = {
  customers: Array<{
    id: string;
    name: string;
    phone: string;
    email: string;
    school: string;
  }>;
  articles: Array<{ id: string; code: string; description: string }>;
  schools: string[];
  paid: string[];
  observations: string[];
  status: string[];
};

export type MondayUpdate = {
  id: string;
  itemId: string;
  text: string;
  createdAt: string;
  author: string;
};

export type OrderSearchMatch = {
  id: number;
  number: string;
  customerName: string;
  phone: string;
  email: string;
  dateCreated: string;
  total: string;
  statusLabel: string;
};

export type SessionUser = { email: string; displayName: string };
