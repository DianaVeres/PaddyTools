import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Drizzle describe las tablas con TypeScript. Después genera/ejecuta SQL para D1.

export const records = sqliteTable('records', {
  id: text('id').primaryKey(), type: text('type', { enum: ['incidencia', 'reserva'] }).notNull(), reference: text('reference').notNull(),
  customerName: text('customer_name').notNull(), phone: text('phone'), subject: text('subject').notNull(), details: text('details'),
  status: text('status').notNull().default('abierto'), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_records_reference').on(table.reference), index('idx_records_type_status').on(table.type, table.status)]);

export const storeTickets = sqliteTable('store_tickets', {
  ticketNumber: text('ticket_number').primaryKey(), date: text('date'), customer: text('customer'), store: text('store'),
  operator: text('operator'), total: text('total'), payment: text('payment'), itemsJson: text('items_json').notNull().default('[]'),
  rawJson: text('raw_json').notNull(), syncedAt: integer('synced_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_store_tickets_date').on(table.date)]);

export const orderNotes = sqliteTable('order_notes', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull(),
  kind: text('kind', { enum: ['nota', 'llamada', 'email'] }).notNull().default('nota'),
  content: text('content').notNull(),
  // Estos campos permiten que todos vean quién creó una nota compartida.
  authorEmail: text('author_email'),
  authorName: text('author_name'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_order_notes_number_date').on(table.orderNumber, table.createdAt)]);

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

export const authSessions = sqliteTable('auth_sessions', {
  // Una fila representa un navegador que ha iniciado sesión.
  tokenHash: text('token_hash').primaryKey(),
  userEmail: text('user_email').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_auth_sessions_user').on(table.userEmail), index('idx_auth_sessions_expiry').on(table.expiresAt)]);

export const authActivationTokens = sqliteTable('auth_activation_tokens', {
  // Token de un solo uso para que cada persona elija su primera contraseña.
  tokenHash: text('token_hash').primaryKey(),
  userEmail: text('user_email').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp_ms' }),
}, (table) => [index('idx_auth_activation_user').on(table.userEmail), index('idx_auth_activation_expiry').on(table.expiresAt)]);

export const incidentCache = sqliteTable('incident_cache', {
  scope: text('scope').primaryKey(),
  payload: text('payload').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
