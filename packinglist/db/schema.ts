import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

export const packingLists = sqliteTable('packing_lists', {
  id: text('id').primaryKey(), school: text('school').notNull(), shippingDate: text('shipping_date').notNull(),
  orderYear: integer('order_year').notNull(), orderMonth: integer('order_month').notNull(), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_packing_lists_school_date').on(table.school, table.shippingDate), index('idx_packing_lists_created_at').on(table.createdAt)]);

export const packingListOrders = sqliteTable('packing_list_orders', {
  id: text('id').primaryKey(), packingListId: text('packing_list_id').notNull().references(() => packingLists.id, { onDelete: 'cascade' }),
  orderNumber: text('order_number').notNull(), customerName: text('customer_name').notNull(), orderType: text('order_type').notNull().default('ON-LINE'),
  orderDate: text('order_date').notNull(), shippingDate: text('shipping_date').notNull(), phone: text('phone'), box: text('box').notNull(),
  schoolMismatch: integer('school_mismatch', { mode: 'boolean' }).notNull().default(false),
}, (table) => [index('idx_packing_orders_list').on(table.packingListId), index('idx_packing_orders_number').on(table.orderNumber)]);

export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').primaryKey(),
  action: text('action', { enum: ['creado', 'modificado', 'eliminado'] }).notNull(),
  entityType: text('entity_type').notNull().default('packing_list'),
  entityId: text('entity_id').notNull(),
  description: text('description').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  index('idx_activity_created_at').on(table.createdAt),
  index('idx_activity_entity').on(table.entityType, table.entityId),
]);
