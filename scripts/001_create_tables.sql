-- Create users profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('guru', 'siswa', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create mapel (subjects) table
CREATE TABLE IF NOT EXISTS public.mapel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create kelas (classes) table
CREATE TABLE IF NOT EXISTS public.kelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  mapel_id UUID NOT NULL REFERENCES public.mapel(id) ON DELETE CASCADE,
  guru_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create kelas_siswa (class students) table
CREATE TABLE IF NOT EXISTS public.kelas_siswa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kelas_id UUID NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
  siswa_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kelas_id, siswa_id)
);

-- Create materi (materials) table
CREATE TABLE IF NOT EXISTS public.materi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  kelas_id UUID NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create asesmen (assessments) table
CREATE TABLE IF NOT EXISTS public.asesmen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  kelas_id UUID NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_questions INT DEFAULT 0,
  passing_score INT DEFAULT 70,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create soal (questions) table
CREATE TABLE IF NOT EXISTS public.soal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asesmen_id UUID NOT NULL REFERENCES public.asesmen(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pilihan_ganda', 'essay')),
  options JSONB,
  correct_answer TEXT,
  points INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create jawaban_siswa (student answers) table
CREATE TABLE IF NOT EXISTS public.jawaban_siswa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asesmen_id UUID NOT NULL REFERENCES public.asesmen(id) ON DELETE CASCADE,
  siswa_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  soal_id UUID NOT NULL REFERENCES public.soal(id) ON DELETE CASCADE,
  answer TEXT,
  is_correct BOOLEAN,
  points_earned INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create nilai (grades) table
CREATE TABLE IF NOT EXISTS public.nilai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asesmen_id UUID NOT NULL REFERENCES public.asesmen(id) ON DELETE CASCADE,
  siswa_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INT,
  status TEXT CHECK (status IN ('lulus', 'tidak_lulus')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create pjbl (project-based learning) table
CREATE TABLE IF NOT EXISTS public.pjbl (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  kelas_id UUID NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create pjbl_stages (PjBL stages) table
CREATE TABLE IF NOT EXISTS public.pjbl_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pjbl_id UUID NOT NULL REFERENCES public.pjbl(id) ON DELETE CASCADE,
  stage_number INT NOT NULL,
  stage_name TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create pjbl_submissions (PjBL submissions) table
CREATE TABLE IF NOT EXISTS public.pjbl_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pjbl_id UUID NOT NULL REFERENCES public.pjbl(id) ON DELETE CASCADE,
  siswa_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.pjbl_stages(id) ON DELETE CASCADE,
  submission_text TEXT,
  file_url TEXT,
  status TEXT CHECK (status IN ('draft', 'submitted', 'reviewed')),
  feedback TEXT,
  score INT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asesmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jawaban_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjbl ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjbl_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjbl_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- RLS Policies for mapel (admin can create, all can view)
CREATE POLICY "mapel_select_all" ON public.mapel FOR SELECT USING (true);
CREATE POLICY "mapel_insert_admin" ON public.mapel FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for kelas
CREATE POLICY "kelas_select_own_or_member" ON public.kelas FOR SELECT USING (
  guru_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.kelas_siswa WHERE kelas_id = id AND siswa_id = auth.uid())
);
CREATE POLICY "kelas_insert_guru" ON public.kelas FOR INSERT WITH CHECK (
  guru_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guru')
);

-- RLS Policies for kelas_siswa
CREATE POLICY "kelas_siswa_select_own" ON public.kelas_siswa FOR SELECT USING (
  siswa_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.kelas WHERE id = kelas_id AND guru_id = auth.uid())
);

-- RLS Policies for materi
CREATE POLICY "materi_select_own_class" ON public.materi FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.kelas 
    WHERE id = kelas_id AND (guru_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.kelas_siswa WHERE kelas_id = id AND siswa_id = auth.uid()))
  )
);
CREATE POLICY "materi_insert_guru" ON public.materi FOR INSERT WITH CHECK (
  created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guru')
);

-- RLS Policies for asesmen
CREATE POLICY "asesmen_select_own_class" ON public.asesmen FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.kelas 
    WHERE id = kelas_id AND (guru_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.kelas_siswa WHERE kelas_id = id AND siswa_id = auth.uid()))
  )
);
CREATE POLICY "asesmen_insert_guru" ON public.asesmen FOR INSERT WITH CHECK (
  created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guru')
);

-- RLS Policies for soal
CREATE POLICY "soal_select_own_asesmen" ON public.soal FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.asesmen 
    WHERE id = asesmen_id AND EXISTS (
      SELECT 1 FROM public.kelas 
      WHERE id = kelas_id AND (guru_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.kelas_siswa WHERE kelas_id = id AND siswa_id = auth.uid()))
    )
  )
);

-- RLS Policies for jawaban_siswa
CREATE POLICY "jawaban_siswa_select_own" ON public.jawaban_siswa FOR SELECT USING (
  siswa_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.asesmen 
    WHERE id = asesmen_id AND created_by = auth.uid()
  )
);
CREATE POLICY "jawaban_siswa_insert_own" ON public.jawaban_siswa FOR INSERT WITH CHECK (
  siswa_id = auth.uid()
);

-- RLS Policies for nilai
CREATE POLICY "nilai_select_own" ON public.nilai FOR SELECT USING (
  siswa_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.asesmen 
    WHERE id = asesmen_id AND created_by = auth.uid()
  )
);

-- RLS Policies for pjbl
CREATE POLICY "pjbl_select_own_class" ON public.pjbl FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.kelas 
    WHERE id = kelas_id AND (guru_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.kelas_siswa WHERE kelas_id = id AND siswa_id = auth.uid()))
  )
);
CREATE POLICY "pjbl_insert_guru" ON public.pjbl FOR INSERT WITH CHECK (
  created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guru')
);

-- RLS Policies for pjbl_stages
CREATE POLICY "pjbl_stages_select_own" ON public.pjbl_stages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.pjbl 
    WHERE id = pjbl_id AND EXISTS (
      SELECT 1 FROM public.kelas 
      WHERE id = kelas_id AND (guru_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.kelas_siswa WHERE kelas_id = id AND siswa_id = auth.uid()))
    )
  )
);

-- RLS Policies for pjbl_submissions
CREATE POLICY "pjbl_submissions_select_own" ON public.pjbl_submissions FOR SELECT USING (
  siswa_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.pjbl 
    WHERE id = pjbl_id AND created_by = auth.uid()
  )
);
CREATE POLICY "pjbl_submissions_insert_own" ON public.pjbl_submissions FOR INSERT WITH CHECK (
  siswa_id = auth.uid()
);
