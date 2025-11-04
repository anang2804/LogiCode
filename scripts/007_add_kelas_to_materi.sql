-- Add kelas field to materi table for filtering by class
-- This allows materi to be assigned to specific classes

ALTER TABLE public.materi 
ADD COLUMN IF NOT EXISTS kelas TEXT[];

-- Create index for better performance on kelas queries
CREATE INDEX IF NOT EXISTS idx_materi_kelas ON public.materi USING GIN(kelas);

-- Comment on the column
COMMENT ON COLUMN public.materi.kelas IS 'Array of class names that can access this materi. NULL or empty means all classes can access.';

-- Update RLS policy for siswa to filter by kelas
DROP POLICY IF EXISTS "Siswa can view all materi" ON public.materi;

CREATE POLICY "Siswa can view materi for their class"
  ON public.materi
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND role = 'siswa'
        AND (
          -- If kelas is NULL or empty array, show to all students
          materi.kelas IS NULL 
          OR array_length(materi.kelas, 1) IS NULL
          -- If kelas is specified, check if student's kelas is in the array
          OR profiles.kelas = ANY(materi.kelas)
        )
    )
  );
