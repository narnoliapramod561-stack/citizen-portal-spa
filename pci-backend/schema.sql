CREATE TABLE IF NOT EXISTS pcu (
    id        VARCHAR   PRIMARY KEY,
    type      VARCHAR   NOT NULL,
    lat       FLOAT     NOT NULL,
    long      FLOAT     NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    image     TEXT,
    credits   FLOAT     DEFAULT 0.0
);
