ALTER TABLE order_returns ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0);
ALTER TABLE order_returns ADD COLUMN sku TEXT;
