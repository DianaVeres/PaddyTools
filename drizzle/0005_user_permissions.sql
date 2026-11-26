ALTER TABLE `auth_users` ADD `permissions` text DEFAULT '["detalle","packing","reservas","recogidas","envios","incidencias"]' NOT NULL;
