-- Ecolink - Supabase Schema
-- Execute este SQL no SQL Editor do Supabase (https://app.supabase.com)

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('restaurant', 'collector')),
    address TEXT,
    cnpj_cpf TEXT,
    contact TEXT,
    cep TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oil_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publication_id TEXT UNIQUE NOT NULL,
    restaurant_id TEXT NOT NULL,
    restaurant_name TEXT NOT NULL,
    restaurant_address TEXT NOT NULL,
    volume_liters DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'scheduled', 'collected')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id TEXT UNIQUE NOT NULL,
    collector_id TEXT NOT NULL,
    collector_name TEXT NOT NULL,
    restaurant_id TEXT NOT NULL,
    restaurant_name TEXT NOT NULL,
    publication_id TEXT NOT NULL,
    scheduled_volume DOUBLE PRECISION NOT NULL,
    collected_volume DOUBLE PRECISION,
    scheduled_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    collected_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS volume_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT NOT NULL,
    volume_liters DOUBLE PRECISION NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('published', 'collected')),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_oil_publications_status ON oil_publications(status);
CREATE INDEX IF NOT EXISTS idx_oil_publications_restaurant ON oil_publications(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_collections_collector ON collections(collector_id);
CREATE INDEX IF NOT EXISTS idx_collections_restaurant ON collections(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_volume_history_restaurant ON volume_history(restaurant_id);
