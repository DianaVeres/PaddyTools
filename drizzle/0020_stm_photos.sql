CREATE TABLE stm_photos (
  photo_key TEXT NOT NULL,
  part INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (photo_key, part)
);
