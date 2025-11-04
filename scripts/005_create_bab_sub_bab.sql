-- Create tables for Bab (Chapters) and Sub Bab (Lessons)

-- Table: materi_bab
CREATE TABLE IF NOT EXISTS public.materi_bab (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  materi_id UUID NOT NULL REFERENCES public.materi(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: materi_sub_bab
CREATE TABLE IF NOT EXISTS public.materi_sub_bab (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bab_id UUID NOT NULL REFERENCES public.materi_bab(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('text', 'video', 'file', 'link')),
  content_url TEXT,
  duration INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_materi_bab_materi_id ON public.materi_bab(materi_id);
CREATE INDEX IF NOT EXISTS idx_materi_bab_order ON public.materi_bab(order_index);
CREATE INDEX IF NOT EXISTS idx_materi_sub_bab_bab_id ON public.materi_sub_bab(bab_id);
CREATE INDEX IF NOT EXISTS idx_materi_sub_bab_order ON public.materi_sub_bab(order_index);

-- Enable RLS
ALTER TABLE public.materi_bab ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materi_sub_bab ENABLE ROW LEVEL SECURITY;

-- RLS Policies for materi_bab
-- Admin can do everything
CREATE POLICY "Admin can do everything on materi_bab"
  ON public.materi_bab
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Guru can view bab from their materi
CREATE POLICY "Guru can view their materi bab"
  ON public.materi_bab
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.materi 
      WHERE id = materi_id AND created_by = auth.uid()
    )
  );

-- Guru can insert/update/delete bab to their materi
CREATE POLICY "Guru can manage their materi bab"
  ON public.materi_bab
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.materi 
      WHERE id = materi_id AND created_by = auth.uid()
    )
  );

-- Siswa can view all bab from published materi
CREATE POLICY "Siswa can view materi bab"
  ON public.materi_bab
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'siswa'
    )
  );

-- RLS Policies for materi_sub_bab
-- Admin can do everything
CREATE POLICY "Admin can do everything on materi_sub_bab"
  ON public.materi_sub_bab
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Guru can view sub bab from their materi
CREATE POLICY "Guru can view their materi sub_bab"
  ON public.materi_sub_bab
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.materi_bab mb
      JOIN public.materi m ON m.id = mb.materi_id
      WHERE mb.id = bab_id AND m.created_by = auth.uid()
    )
  );

-- Guru can insert/update/delete sub bab to their materi
CREATE POLICY "Guru can manage their materi sub_bab"
  ON public.materi_sub_bab
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.materi_bab mb
      JOIN public.materi m ON m.id = mb.materi_id
      WHERE mb.id = bab_id AND m.created_by = auth.uid()
    )
  );

-- Siswa can view all sub bab from published materi
CREATE POLICY "Siswa can view materi sub_bab"
  ON public.materi_sub_bab
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'siswa'
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_materi_bab_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_materi_bab_updated_at
  BEFORE UPDATE ON public.materi_bab
  FOR EACH ROW
  EXECUTE FUNCTION update_materi_bab_updated_at();

CREATE OR REPLACE FUNCTION update_materi_sub_bab_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_materi_sub_bab_updated_at
  BEFORE UPDATE ON public.materi_sub_bab
  FOR EACH ROW
  EXECUTE FUNCTION update_materi_sub_bab_updated_at();
