export const MONDAY_BOARDS = [
  { id: '5098167633', kind: 'reserva', name: 'REGISTRO RESERVAS' },
  { id: '5098279909', kind: 'prenda', name: 'REGISTRO PRENDAS ESPECIALES' },
] as const;

export const MONDAY_RESERVATION_COLUMNS = {
  customer: 'board_relation_mm458cjj',
  school: 'color_mm45f745',
  date: 'date_mm45b8rj',
  article: 'board_relation_mm45m9w9',
  size: 'text_mm45ag8c',
  units: 'numeric_mm4574r6',
  paid: 'color_mm45vsc8',
  observations: 'dropdown_mm45zpss',
  status: 'color_mm455nq5',
  endDate: 'date_mm458zp2',
  productionDate: 'date_mm51g99g',
} as const;

export const MONDAY_RESERVATION_OPTIONS = {
  schools: [
    'SPF',
    'BCLC',
    'SAN ENRIQUE',
    'CLARET',
    'SAGE',
    'SAN JUAN BOSCO',
    'ESCOLANÍA',
    'SHACKLETON',
    'BENAGUASIL',
    'SAN RAFAEL',
    'TEATINAS PINTO',
    'ALBORXÍ',
    'TORREALEDUA',
    'RIBARROJA',
    'JOSE LLUCH',
    'PURISIMA',
    'SAGRADO CORAZÓN',
  ],
  paid: ['SÍ', 'NO'],
  observations: [
    'ENVÍO A DOMICILIO',
    'ENTREGA COLEGIO',
    'RECOGIDA EN TIENDA',
  ],
  status: [
    'PARA PREPARAR',
    'ENTREGADO/ENVIADO',
    'ENTREGA PARCIAL',
    'BLOQUEADO',
    'EN PRODUCCIÓN',
  ],
} as const;

export type MondayBoard = (typeof MONDAY_BOARDS)[number];
