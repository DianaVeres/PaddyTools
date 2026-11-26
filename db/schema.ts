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

export const orderReturns = sqliteTable(
  'order_returns',
  {
    id: text('id').primaryKey(),
    orderId: integer('order_id').notNull(),
    orderNumber: text('order_number').notNull(),
    itemName: text('item_name').notNull(),
    sku: text('sku'),
    quantity: integer('quantity').notNull().default(1),
    size: text('size').notNull(),
    receivedAt: integer('received_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('idx_order_returns_received').on(table.receivedAt, table.id)],
);

export const authUsers = sqliteTable('auth_users', {
  // El correo funciona como identificador único del usuario.
  email: text('email').primaryKey(),
  displayName: text('display_name').notNull(),
  permissions: text('permissions').notNull().default('["detalle","packing","reservas","recogidas","envios","incidencias"]'),
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

export const packingListDrafts = sqliteTable(
  'packing_list_drafts',
  {
    id: text('id').primaryKey(),
    school: text('school').notNull().default(''),
    shippingDate: text('shipping_date').notNull(),
    orderYear: integer('order_year').notNull(),
    orderMonth: integer('order_month').notNull(),
    boxes: text('boxes').notNull(),
    createdByEmail: text('created_by_email').notNull(),
    createdByName: text('created_by_name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('idx_packing_drafts_updated_at').on(table.updatedAt),
    index('idx_packing_drafts_school').on(table.school),
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

export const inventorySessions = sqliteTable(
  'inventory_sessions',
  {
    id: text('id').primaryKey(),
    warehouse: text('warehouse').notNull(),
    season: text('season').notNull().default(''),
    countDate: text('count_date').notNull(),
    status: text('status', { enum: ['draft', 'closed', 'exported'] })
      .notNull()
      .default('draft'),
    createdByEmail: text('created_by_email').notNull(),
    createdByName: text('created_by_name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    closedAt: integer('closed_at', { mode: 'timestamp_ms' }),
    stmExportedAt: integer('stm_exported_at', { mode: 'timestamp_ms' }),
    stmExportedByEmail: text('stm_exported_by_email').notNull().default(''),
    stmExportedByName: text('stm_exported_by_name').notNull().default(''),
  },
  (table) => [
    index('idx_inventory_sessions_date').on(table.countDate, table.updatedAt),
    index('idx_inventory_sessions_status').on(table.status, table.updatedAt),
  ],
);

export const inventoryItems = sqliteTable(
  'inventory_items',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => inventorySessions.id, { onDelete: 'cascade' }),
    barcode: text('barcode').notNull(),
    quantity: integer('quantity').notNull().default(1),
    firstScannedAt: integer('first_scanned_at', {
      mode: 'timestamp_ms',
    }).notNull(),
    lastScannedAt: integer('last_scanned_at', {
      mode: 'timestamp_ms',
    }).notNull(),
  },
  (table) => [
    index('idx_inventory_items_session').on(table.sessionId),
    index('idx_inventory_items_barcode').on(table.sessionId, table.barcode),
  ],
);

export const inventoryCatalog = sqliteTable(
  'inventory_catalog',
  {
    code: text('code').primaryKey(),
    article: text('article').notNull(),
    description: text('description').notNull(),
    color: text('color').notNull().default(''),
    colorDescription: text('color_description').notNull().default(''),
    size: text('size').notNull().default(''),
    sourceCode: text('source_code').notNull().default(''),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('idx_inventory_catalog_article').on(table.article)],
);

// Copia consultable de las fichas técnicas exportadas desde STM. Los campos
// de uso habitual quedan normalizados y rawJson conserva todas las columnas
// originales para que una futura ampliación no obligue a repetir la carga.
export const stmTechnicalSheets = sqliteTable(
  'stm_technical_sheets',
  {
    id: text('id').primaryKey(),
    season: text('season').notNull().default(''),
    code: text('code').notNull(),
    description: text('description').notNull().default(''),
    internalDescription: text('internal_description').notNull().default(''),
    articleType: text('article_type').notNull().default(''),
    sizes: text('sizes').notNull().default(''),
    familyCode: text('family_code').notNull().default(''),
    familyDescription: text('family_description').notNull().default(''),
    compositionCode: text('composition_code').notNull().default(''),
    compositionDescription: text('composition_description').notNull().default(''),
    garmentType: text('garment_type').notNull().default(''),
    collectionCode: text('collection_code').notNull().default(''),
    collectionDescription: text('collection_description').notNull().default(''),
    barcodeBase: text('barcode_base').notNull().default(''),
    supplier1Code: text('supplier1_code').notNull().default(''),
    supplier1Name: text('supplier1_name').notNull().default(''),
    supplier1Reference: text('supplier1_reference').notNull().default(''),
    supplier2Code: text('supplier2_code').notNull().default(''),
    supplier2Name: text('supplier2_name').notNull().default(''),
    supplier2Reference: text('supplier2_reference').notNull().default(''),
    notes: text('notes').notNull().default(''),
    imagesJson: text('images_json').notNull().default('[]'),
    washSymbols: text('wash_symbols').notNull().default(''),
    rawJson: text('raw_json').notNull(),
    sourceFile: text('source_file').notNull().default(''),
    sourceModifiedAt: integer('source_modified_at').notNull(),
    importedAt: integer('imported_at').notNull(),
  },
  (table) => [
    index('idx_stm_technical_code').on(table.code),
    index('idx_stm_technical_description').on(table.description),
    index('idx_stm_technical_family').on(table.familyCode),
    index('idx_stm_technical_collection').on(table.collectionCode),
  ],
);

export const stmTechnicalSheetColors = sqliteTable(
  'stm_technical_sheet_colors',
  {
    id: text('id').primaryKey(),
    technicalSheetId: text('technical_sheet_id')
      .notNull()
      .references(() => stmTechnicalSheets.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    colorCode: text('color_code').notNull().default(''),
    colorDescription: text('color_description').notNull().default(''),
    impactType: text('impact_type').notNull().default(''),
    applicationType: text('application_type').notNull().default(''),
    rate: text('rate').notNull().default(''),
  },
  (table) => [
    index('idx_stm_technical_colors_sheet').on(table.technicalSheetId),
    index('idx_stm_technical_colors_code').on(table.colorCode),
  ],
);

// Filas de las pestañas secundarias de la ficha técnica. Se conserva el JSON
// completo de STM porque cada pestaña tiene una estructura distinta.
export const stmTechnicalSheetSections = sqliteTable(
  'stm_technical_sheet_sections',
  {
    id: text('id').primaryKey(),
    technicalSheetId: text('technical_sheet_id')
      .notNull()
      .references(() => stmTechnicalSheets.id, { onDelete: 'cascade' }),
    section: text('section').notNull(),
    sourceTable: text('source_table').notNull(),
    rowIndex: integer('row_index').notNull(),
    dataJson: text('data_json').notNull(),
    importedAt: integer('imported_at').notNull(),
  },
  (table) => [
    index('idx_stm_sections_sheet').on(table.technicalSheetId, table.section),
    index('idx_stm_sections_source').on(table.sourceTable),
  ],
);

export const orderPreparationCompletions = sqliteTable(
  'order_preparation_completions',
  {
    orderId: integer('order_id').primaryKey(),
    orderNumber: text('order_number').notNull(),
    customerName: text('customer_name').notNull().default(''),
    customerEmail: text('customer_email').notNull().default(''),
    customerPhone: text('customer_phone').notNull().default(''),
    units: integer('units').notNull().default(0),
    products: integer('products').notNull().default(0),
    completedByEmail: text('completed_by_email').notNull(),
    completedByName: text('completed_by_name').notNull(),
    shippingMethod: text('shipping_method').notNull().default(''),
    hasReservation: integer('has_reservation', { mode: 'boolean' })
      .notNull()
      .default(false),
    treatment: text('treatment').notNull().default('manual-review'),
    wooStatus: text('woo_status').notNull().default(''),
    carrier: text('carrier').notNull().default(''),
    trackingNumber: text('tracking_number').notNull().default(''),
    reservationSummary: text('reservation_summary').notNull().default(''),
    completionDate: text('completion_date').notNull(),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('idx_order_preparation_completion_date').on(
      table.completionDate,
      table.completedAt,
    ),
  ],
);
