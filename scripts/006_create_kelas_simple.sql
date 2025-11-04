-- Script to create simple kelas (class) table
-- This table only contains class name and homeroom teacher (wali kelas)

-- Create kelas table with simple structure
CREATE TABLE IF NOT EXISTS public.kelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  wali_kelas_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kelas (all authenticated users can view, only admin can insert/update/delete)
CREATE POLICY "kelas_select_all" ON public.kelas FOR SELECT USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "kelas_insert_admin" ON public.kelas FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "kelas_update_admin" ON public.kelas FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "kelas_delete_admin" ON public.kelas FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create index on wali_kelas_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_kelas_wali_kelas ON public.kelas(wali_kelas_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_kelas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kelas_updated_at
  BEFORE UPDATE ON public.kelas
  FOR EACH ROW
  EXECUTE FUNCTION update_kelas_updated_at();
