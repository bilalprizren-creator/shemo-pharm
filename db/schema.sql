-- SHEMO PHARM — database schema
--
-- GENERATED FILE. Produced by scripts/dump-schema.mjs; do not edit by hand.
-- Re-run that script after a migration and commit the diff.
--
-- Replay top to bottom into an empty database to recreate the shape:
--   node scripts/apply-schema.mjs
-- Verify that it really does, against a throwaway Neon branch:
--   node scripts/verify-schema.mjs
--
-- Structure only — no rows. The catalogue is reseeded with `npm run seed:db`
-- from src/data/*.json; customer data comes from a backup, never from here.
--
-- Tables: categories, contact_messages, orders, product_categories, products, rate_limits, users

-- Sequences, before the tables that default to them

CREATE SEQUENCE IF NOT EXISTS contact_messages_id_seq
  AS integer
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 2147483647
  START WITH 1
  CACHE 1
  NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS orders_id_seq
  AS integer
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 2147483647
  START WITH 1
  CACHE 1
  NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS users_id_seq
  AS integer
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 2147483647
  START WITH 1
  CACHE 1
  NO CYCLE;

CREATE TABLE IF NOT EXISTS categories (
  id integer NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  parent integer DEFAULT 0 NOT NULL,
  count integer DEFAULT 0 NOT NULL,
  display_name text,
  kind text DEFAULT 'type'::text NOT NULL,
  sort integer DEFAULT 0 NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_slug_key UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id integer DEFAULT nextval('contact_messages_id_seq'::regclass) NOT NULL,
  name text DEFAULT ''::text NOT NULL,
  company text DEFAULT ''::text NOT NULL,
  email text DEFAULT ''::text NOT NULL,
  phone text DEFAULT ''::text NOT NULL,
  subject text DEFAULT ''::text NOT NULL,
  message text DEFAULT ''::text NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS orders (
  id integer DEFAULT nextval('orders_id_seq'::regclass) NOT NULL,
  customer_name text DEFAULT ''::text NOT NULL,
  customer_email text DEFAULT ''::text NOT NULL,
  channel text NOT NULL,
  items jsonb NOT NULL,
  items_count integer NOT NULL,
  total_cents integer DEFAULT 0 NOT NULL,
  is_handled boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT orders_channel_check CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'email'::text]))),
  CONSTRAINT orders_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS product_categories (
  product_id integer NOT NULL,
  category_id integer NOT NULL,
  CONSTRAINT product_categories_pkey PRIMARY KEY (product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_category ON public.product_categories USING btree (category_id);

CREATE TABLE IF NOT EXISTS products (
  id integer NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  sku text DEFAULT ''::text NOT NULL,
  price_cents integer DEFAULT 0 NOT NULL,
  regular_cents integer DEFAULT 0 NOT NULL,
  on_sale boolean DEFAULT false NOT NULL,
  currency text DEFAULT 'EUR'::text NOT NULL,
  images jsonb DEFAULT '[]'::jsonb NOT NULL,
  in_stock boolean DEFAULT true NOT NULL,
  description text DEFAULT ''::text NOT NULL,
  short_description text DEFAULT ''::text NOT NULL,
  display_name text,
  image_override text,
  featured boolean DEFAULT false NOT NULL,
  hidden boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  blur_data_url text,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_slug_key UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket text NOT NULL,
  subject text NOT NULL,
  window_start timestamp with time zone NOT NULL,
  count integer DEFAULT 0 NOT NULL,
  CONSTRAINT rate_limits_pkey PRIMARY KEY (bucket, subject, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx ON public.rate_limits USING btree (window_start);

CREATE TABLE IF NOT EXISTS users (
  id integer DEFAULT nextval('users_id_seq'::regclass) NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  name text DEFAULT ''::text NOT NULL,
  company text DEFAULT ''::text NOT NULL,
  phone text DEFAULT ''::text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  role text DEFAULT 'customer'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  email_verified_at timestamp with time zone,
  verification_sent_at timestamp with time zone,
  lang text DEFAULT 'sq'::text NOT NULL,
  reset_sent_at timestamp with time zone,
  sessions_valid_from timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email)
);

-- Sequence ownership, so DROP TABLE takes the sequence too

ALTER SEQUENCE contact_messages_id_seq OWNED BY contact_messages.id;
ALTER SEQUENCE orders_id_seq OWNED BY orders.id;
ALTER SEQUENCE users_id_seq OWNED BY users.id;

-- Foreign keys, last so the file needs no table ordering

ALTER TABLE product_categories ADD CONSTRAINT product_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE product_categories ADD CONSTRAINT product_categories_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
