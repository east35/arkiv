-- =============================================================================
-- ShelfLog — Initial Schema Migration
-- =============================================================================
-- Creates all tables, indexes, RLS policies, and triggers for the MVP.
-- Run this in the Supabase SQL Editor or via `supabase db push`.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------------

-- Core item table. Every tracked book or game is a row here.
-- Media-specific fields live in `books` or `games` (1:1 extension).
CREATE TABLE public.items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type    text        NOT NULL CHECK (media_type IN ('game', 'book')),
  title         text        NOT NULL,
  cover_url     text,
  genres        text[]      NOT NULL DEFAULT '{}',
  description   text,
  status        text        NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'paused', 'completed', 'dropped')),
  user_score    numeric(3,1) CHECK (user_score >= 0 AND user_score <= 10),
  source_score  numeric(5,2),
  notes         text,
  source        text        NOT NULL DEFAULT 'manual' CHECK (source IN ('igdb', 'google_books', 'manual')),
  external_id   text,
  started_at    timestamptz,
  completed_at  timestamptz,
  paused_at     timestamptz,
  dropped_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Book-specific fields (1:1 with items where media_type = 'book')
CREATE TABLE public.books (
  item_id       uuid        PRIMARY KEY REFERENCES public.items(id) ON DELETE CASCADE,
  author        text,
  publisher     text,
  publish_date  text,           -- String: formats vary from Google Books
  page_count    integer,        -- Total pages from source
  progress      integer,        -- Current page
  format        text,           -- e.g., paperback, hardcover, ebook
  themes        text[]      NOT NULL DEFAULT '{}',
  isbn          text,
  collection    text            -- Calibre library reference
);

-- Game-specific fields (1:1 with items where media_type = 'game')
CREATE TABLE public.games (
  item_id          uuid     PRIMARY KEY REFERENCES public.items(id) ON DELETE CASCADE,
  developer        text,
  publisher        text,
  release_date     text,        -- String: formats vary from IGDB
  platforms        text[]   NOT NULL DEFAULT '{}',
  format           text,        -- e.g., digital, physical
  themes           text[]   NOT NULL DEFAULT '{}',
  screenshots      text[]   NOT NULL DEFAULT '{}',  -- URLs from IGDB
  progress_hours   integer  NOT NULL DEFAULT 0,
  progress_minutes integer  NOT NULL DEFAULT 0 CHECK (progress_minutes >= 0 AND progress_minutes <= 59),
  collection       text         -- Steam, custom source
);

-- User-created lists. Can contain both books and games.
CREATE TABLE public.lists (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  description   text,
  cover_item_id uuid        REFERENCES public.items(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Junction table: items ↔ lists (many-to-many)
CREATE TABLE public.list_items (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id   uuid        NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  item_id   uuid        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  added_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, item_id)
);

-- Append-only log of status transitions for timeline + statistics
CREATE TABLE public.activity_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id     uuid        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  from_status text,               -- NULL for first status assignment
  to_status   text        NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

-- One row per user, auto-created on sign-up via trigger
CREATE TABLE public.user_preferences (
  user_id            uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username           text,
  hide_hover_overlay boolean NOT NULL DEFAULT false,
  date_format        text    NOT NULL DEFAULT 'iso' CHECK (date_format IN ('iso', 'eu', 'us', 'long')),
  time_format        text    NOT NULL DEFAULT '12hr' CHECK (time_format IN ('12hr', '24hr')),
  steam_id           text,
  calibre_path       text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX idx_items_user_id     ON public.items (user_id);
CREATE INDEX idx_items_user_status ON public.items (user_id, status);
CREATE INDEX idx_items_user_media  ON public.items (user_id, media_type);

-- Prevent duplicate imports from the same external source per user
CREATE UNIQUE INDEX idx_items_user_external
  ON public.items (user_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX idx_lists_user_id ON public.lists (user_id);

CREATE INDEX idx_activity_user_date ON public.activity_log (user_id, occurred_at DESC);
CREATE INDEX idx_activity_item      ON public.activity_log (item_id);


-- ---------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Tables with direct user_id column
CREATE POLICY "Users can CRUD own items"
  ON public.items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own lists"
  ON public.lists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own activity"
  ON public.activity_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Extension tables: user_id lives on parent items table
CREATE POLICY "Users can CRUD own book rows"
  ON public.books FOR ALL
  USING (EXISTS (SELECT 1 FROM public.items WHERE items.id = books.item_id AND items.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.items WHERE items.id = books.item_id AND items.user_id = auth.uid()));

CREATE POLICY "Users can CRUD own game rows"
  ON public.games FOR ALL
  USING (EXISTS (SELECT 1 FROM public.items WHERE items.id = games.item_id AND items.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.items WHERE items.id = games.item_id AND items.user_id = auth.uid()));

-- Junction table: user_id lives on parent lists table
CREATE POLICY "Users can CRUD own list items"
  ON public.list_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()));


-- ---------------------------------------------------------------------------
-- 4. TRIGGERS
-- ---------------------------------------------------------------------------

-- Auto-update `updated_at` on row modification
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_items
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_lists
  BEFORE UPDATE ON public.lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_user_preferences
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create user_preferences row when a new user signs up
CREATE OR REPLACE FUNCTION public.create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_preferences();
