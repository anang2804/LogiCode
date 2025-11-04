-- Create or update materi table structure to match the new form
-- Table structure: Judul Materi, Mata Pelajaran, Deskripsi Singkat, Upload Sampul

-- Create materi table if not exists
CREATE TABLE IF NOT EXISTS public.materi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,                    -- Judul Materi
  mapel_id UUID REFERENCES public.mapel(id) ON DELETE SET NULL,  -- Mata Pelajaran
  description TEXT,                       -- Deskripsi Singkat
  thumbnail_url TEXT,                     -- Upload Sampul (base64 or URL)
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- If table already exists, add missing columns and remove unused ones
DO $$ 
BEGIN
  -- Add mapel_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='materi' AND column_name='mapel_id') THEN
    ALTER TABLE public.materi 
      ADD COLUMN mapel_id UUID REFERENCES public.mapel(id) ON DELETE SET NULL;
  END IF;
  
  -- Add thumbnail_url if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='materi' AND column_name='thumbnail_url') THEN
    ALTER TABLE public.materi 
      ADD COLUMN thumbnail_url TEXT;
  END IF;
  
  -- Drop unused columns if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema='public' AND table_name='materi' AND column_name='kelas_id') THEN
    ALTER TABLE public.materi DROP COLUMN kelas_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema='public' AND table_name='materi' AND column_name='content') THEN
    ALTER TABLE public.materi DROP COLUMN content;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema='public' AND table_name='materi' AND column_name='duration') THEN
    ALTER TABLE public.materi DROP COLUMN duration;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema='public' AND table_name='materi' AND column_name='difficulty') THEN
    ALTER TABLE public.materi DROP COLUMN difficulty;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema='public' AND table_name='materi' AND column_name='total_lessons') THEN
    ALTER TABLE public.materi DROP COLUMN total_lessons;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema='public' AND table_name='materi' AND column_name='is_published') THEN
    ALTER TABLE public.materi DROP COLUMN is_published;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_materi_mapel_id ON public.materi(mapel_id);
CREATE INDEX IF NOT EXISTS idx_materi_created_by ON public.materi(created_by);

-- Enable RLS on materi table
ALTER TABLE public.materi ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_materi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_materi_updated_at ON public.materi;
CREATE TRIGGER set_materi_updated_at
  BEFORE UPDATE ON public.materi
  FOR EACH ROW
  EXECUTE FUNCTION update_materi_updated_at();

-- Drop old policies if exists
DROP POLICY IF EXISTS "materi_select_own_class" ON public.materi;
DROP POLICY IF EXISTS "materi_insert_guru" ON public.materi;

-- Create new RLS Policies for materi
-- Admin can do everything
CREATE POLICY "Admin can do everything on materi"
  ON public.materi
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Guru can view all materi
CREATE POLICY "Guru can view all materi"
  ON public.materi
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'guru'
    )
  );

-- Guru can insert materi
CREATE POLICY "Guru can insert materi"
  ON public.materi
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'guru'
    )
  );

-- Guru can update their own materi
CREATE POLICY "Guru can update their own materi"
  ON public.materi
  FOR UPDATE
  USING (
    created_by = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'guru'
    )
  );

-- Guru can delete their own materi
CREATE POLICY "Guru can delete their own materi"
  ON public.materi
  FOR DELETE
  USING (
    created_by = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'guru'
    )
  );

-- Siswa can view all materi
CREATE POLICY "Siswa can view all materi"
  ON public.materi
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'siswa'
    )
  );
