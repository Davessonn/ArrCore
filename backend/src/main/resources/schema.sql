CREATE TABLE IF NOT EXISTS service_settings (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL UNIQUE,
    url VARCHAR(512) NOT NULL,
    api_key VARCHAR(512),
    username VARCHAR(512),
    password VARCHAR(512),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
