CREATE TABLE order_returns (
  id TEXT PRIMARY KEY NOT NULL,
  order_id INTEGER NOT NULL,
  order_number TEXT NOT NULL,
  item_name TEXT NOT NULL,
  size TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
CREATE INDEX idx_order_returns_received ON order_returns(received_at, id);
