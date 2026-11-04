import {
  blob,
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

// Drizzle describe las tablas con TypeScript. Después genera/ejecuta SQL para D1.

export const records = sqliteTable(
  'records',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['incidencia', 'reserva'] }).notNull(),
    reference: text('reference').notNull(),
    customerName: text('customer_name').notNull(),
    phone: text('phone'),
    subject: text('subject').notNull(),
    details: text('details'),
    status: text('status').notNull().default('abierto'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('idx_records_reference').on(table.reference),
    index('idx_records_type_status').on(table.type, table.status),
  ],
);

export const storeTickets = sqliteTable(
  'store_tickets',
  {
    ticketNumber: text('ticket_number').primaryKey(),
    date: text('date'),
    customer: text('customer'),
    store: text('store'),
    operator: text('operator'),
    total: text('total'),
    payment: text('payment'),
    itemsJson: text('items_json').notNull().default('[]'),
    rawJson: text('raw_json').notNull(),
    syncedAt: integer('synced_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('idx_store_tickets_date').on(table.date)],
);

export const orderNotes = sqliteTable(
  'order_notes',
  {
    id: text('id').primaryKey(),
    orderNumber: text('order_number').notNull(),
    kind: text('kind', { enum: ['nota', 'llamada', 'email'] })
      .notNull()
      .default('nota'),
    content: text('content').notNull(),
    // Estos campos permiten que todos vean quién creó una nota compartida.
    authorEmail: text('author_email'),
    authorName: text('author_name'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('idx_order_notes_number_date').on(table.orderNumber, table.createdAt),
  ],
);

export const authUsers = sqliteTable('auth_users', {
  // El correo funciona como identificador único del usuario.
  email: text('email').primaryKey(),
  displayName: text('display_name').notNull(),
  // Aquí solo existe una firma criptográfica, nunca la contraseña original.
  passwordHash: text('password_hash'),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const authSessions = sqliteTable(
  'auth_sessions',
  {
    // Una fila representa un navegador que ha iniciado sesión.
    tokenHash: text('token_hash').primaryKey(),
    userEmail: text('user_email').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('idx_auth_sessions_user').on(table.userEmail),
    index('idx_auth_sessions_expiry').on(table.expiresAt),
  ],
);

export const authActivationTokens = sqliteTable(
  'auth_activation_tokens',
  {
    // Token de un solo uso para que cada persona elija su primera contraseña.
    tokenHash: text('token_hash').primaryKey(),
    userEmail: text('user_email').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('idx_auth_activation_user').on(table.userEmail),
    index('idx_auth_activation_expiry').on(table.expiresAt),
  ],
);

export const incidentCache = sqliteTable('incident_cache', {
  scope: text('scope').primaryKey(),
  payload: text('payload').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const incidentRecords = sqliteTable(
  'incident_records',
  {
    id: text('id').primaryKey(),
    orderNumber: text('order_number').notNull(),
    sourceType: text('source_type').notNull().default('order'),
    incidentDate: text('incident_date'),
    updatedAt: text('updated_at').notNull(),
    pickupSchool: integer('pickup_school', { mode: 'boolean' })
      .notNull()
      .default(false),
    rawJson: text('raw_json').notNull(),
  },
  (table) => [
    index('idx_incident_records_order').on(table.orderNumber),
    index('idx_incident_records_updated').on(table.updatedAt),
    index('idx_incident_records_source').on(table.sourceType),
    index('idx_incident_records_pickup').on(table.pickupSchool),
  ],
);

export const incidentImages = sqliteTable(
  'incident_images',
  {
    id: text('id').primaryKey(),
    incidentId: text('incident_id').notNull(),
    name: text('name').notNull(),
    mimeType: text('mime_type').notNull(),
    size: integer('size').notNull(),
    uploadedAt: text('uploaded_at').notNull(),
  },
  (table) => [index('idx_incident_images_incident').on(table.incidentId)],
);

export const incidentImageChunks = sqliteTable(
  'incident_image_chunks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    imageId: text('image_id').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    data: blob('data', { mode: 'buffer' }).notNull(),
  },
  (table) => [
    index('idx_incident_image_chunks_image').on(
      table.imageId,
      table.chunkIndex,
    ),
  ],
);

export const kpiWorkLogs = sqliteTable(
  'kpi_work_logs',
  {
    id: text('id').primaryKey(),
    workDate: text('work_date').notNull(),
    workerEmail: text('worker_email').notNull(),
    workerName: text('worker_name').notNull(),
    activity: text('activity').notNull(),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at').notNull(),
    minutes: integer('minutes').notNull(),
    orders: integer('orders').notNull().default(0),
    products: integer('products').notNull().default(0),
    packingLists: integer('packing_lists').notNull().default(0),
    notes: text('notes').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('idx_kpi_work_date').on(table.workDate),
    index('idx_kpi_work_worker').on(table.workerEmail, table.workDate),
    index('idx_kpi_work_activity').on(table.activity, table.workDate),
  ],
);

export const qualityErrors = sqliteTable(
  'quality_errors',
  {
    id: text('id').primaryKey(),
    errorDate: text('error_date').notNull(),
    process: text('process').notNull(),
    responsibleEmail: text('responsible_email').notNull(),
    responsibleName: text('responsible_name').notNull(),
    reporterEmail: text('reporter_email').notNull(),
    reporterName: text('reporter_name').notNull(),
    severity: text('severity').notNull().default('media'),
    errorType: text('error_type').notNull(),
    reference: text('reference').notNull().default(''),
    description: text('description').notNull(),
    affectedUnits: integer('affected_units').notNull().default(1),
    correctionMinutes: integer('correction_minutes').notNull().default(0),
    recurrence: integer('recurrence', { mode: 'boolean' })
      .notNull()
      .default(false),
    resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('idx_quality_error_date').on(table.errorDate),
    index('idx_quality_process_date').on(table.process, table.errorDate),
    index('idx_quality_worker_date').on(
      table.responsibleEmail,
      table.errorDate,
    ),
  ],
);

// PackingList conserva su D1 histórica separada; así integramos el código sin
// mover ni duplicar datos de producción.
export const packingLists = sqliteTable(
  'packing_lists',
  {
    id: text('id').primaryKey(),
    school: text('school').notNull(),
    shippingDate: text('shipping_date').notNull(),
    orderYear: integer('order_year').notNull(),
    orderMonth: integer('order_month').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('idx_packing_lists_school_date').on(table.school, table.shippingDate),
    index('idx_packing_lists_created_at').on(table.createdAt),
  ],
);

export const packingListOrders = sqliteTable(
  'packing_list_orders',
  {
    id: text('id').primaryKey(),
    packingListId: text('packing_list_id')
      .notNull()
      .references(() => packingLists.id, { onDelete: 'cascade' }),
    orderNumber: text('order_number').notNull(),
    customerName: text('customer_name').notNull(),
    orderType: text('order_type').notNull().default('ON-LINE'),
    orderDate: text('order_date').notNull(),
    shippingDate: text('shipping_date').notNull(),
    phone: text('phone'),
    box: text('box').notNull(),
    schoolMismatch: integer('school_mismatch', { mode: 'boolean' })
      .notNull()
      .default(false),
  },
  (table) => [
    index('idx_packing_orders_list').on(table.packingListId),
    index('idx_packing_orders_number').on(table.orderNumber),
  ],
);

export const packingActivityLogs = sqliteTable(
  'activity_logs',
  {
    id: text('id').primaryKey(),
    action: text('action', {
      enum: ['creado', 'modificado', 'eliminado'],
    }).notNull(),
    entityType: text('entity_type').notNull().default('packing_list'),
    entityId: text('entity_id').notNull(),
    description: text('description').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('idx_activity_created_at').on(table.createdAt),
    index('idx_activity_entity').on(table.entityType, table.entityId),
  ],
);
