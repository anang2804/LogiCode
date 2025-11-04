-- Create table for supporting materials (files, links, videos)
CREATE TABLE IF NOT EXISTS public.materi_pendukung (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  materi_id UUID NOT NULL REFERENCES public.materi(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('file', 'link', 'video')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  url TEXT, -- For links and videos
  file_path TEXT, -- For uploaded files in storage
  file_name TEXT, -- Original file name
  file_size BIGINT, -- File size in bytes
  file_type VARCHAR(100), -- MIME type
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_materi_pendukung_materi_id ON public.materi_pendukung(materi_id);
CREATE INDEX IF NOT EXISTS idx_materi_pendukung_created_by ON public.materi_pendukung(created_by);
CREATE INDEX IF NOT EXISTS idx_materi_pendukung_type ON public.materi_pendukung(type);

-- Enable RLS
ALTER TABLE public.materi_bab ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materi_sub_bab ENABLE ROW LEVEL SECURITY;

-- Policies for materi_bab
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

-- Guru can insert bab to their materi
CREATE POLICY "Guru can insert materi bab"
  ON public.materi_bab
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.materi 
      WHERE id = materi_id AND created_by = auth.uid()
    )
  );

-- Guru can update their materi bab
CREATE POLICY "Guru can update their materi bab"
  ON public.materi_bab
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.materi 
      WHERE id = materi_id AND created_by = auth.uid()
    )
  );

-- Guru can delete their materi bab
CREATE POLICY "Guru can delete their materi bab"
  ON public.materi_bab
  FOR DELETE
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
      SELECT 1 FROM public.materi 
      WHERE id = materi_id AND is_published = true
    ) AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'siswa'
    )
  );

-- Policies for materi_sub_bab
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

-- Guru can insert sub bab to their materi
CREATE POLICY "Guru can insert materi sub_bab"
  ON public.materi_sub_bab
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.materi_bab mb
      JOIN public.materi m ON m.id = mb.materi_id
      WHERE mb.id = bab_id AND m.created_by = auth.uid()
    )
  );

-- Guru can update their materi sub bab
CREATE POLICY "Guru can update their materi sub_bab"
  ON public.materi_sub_bab
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.materi_bab mb
      JOIN public.materi m ON m.id = mb.materi_id
      WHERE mb.id = bab_id AND m.created_by = auth.uid()
    )
  );

-- Guru can delete their materi sub bab
CREATE POLICY "Guru can delete their materi sub_bab"
  ON public.materi_sub_bab
  FOR DELETE
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
      SELECT 1 FROM public.materi_bab mb
      JOIN public.materi m ON m.id = mb.materi_id
      WHERE mb.id = bab_id AND m.is_published = true
    ) AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'siswa'
    )
  );

-- Create triggers to update updated_at timestamp
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
