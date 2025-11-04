-- Add additional profile fields for students
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS kelas TEXT,
ADD COLUMN IF NOT EXISTS tanggal_lahir DATE,
ADD COLUMN IF NOT EXISTS jenis_kelamin TEXT CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan', NULL)),
ADD COLUMN IF NOT EXISTS no_telepon TEXT,
ADD COLUMN IF NOT EXISTS alamat TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_kelas ON public.profiles(kelas);
