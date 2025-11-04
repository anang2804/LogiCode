-- Create table to track completed sub_bab per siswa
CREATE TABLE IF NOT EXISTS sub_bab_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sub_bab_id UUID NOT NULL REFERENCES materi_sub_bab(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(siswa_id, sub_bab_id)
);

-- Create materi_progress table to track overall materi progress (calculated from sub_bab)
CREATE TABLE IF NOT EXISTS materi_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  materi_id UUID NOT NULL REFERENCES materi(id) ON DELETE CASCADE,
  completed_sub_bab INTEGER DEFAULT 0,
  total_sub_bab INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(siswa_id, materi_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sub_bab_progress_siswa ON sub_bab_progress(siswa_id);
CREATE INDEX IF NOT EXISTS idx_sub_bab_progress_sub_bab ON sub_bab_progress(sub_bab_id);
CREATE INDEX IF NOT EXISTS idx_materi_progress_siswa ON materi_progress(siswa_id);
CREATE INDEX IF NOT EXISTS idx_materi_progress_materi ON materi_progress(materi_id);

-- Enable RLS
ALTER TABLE sub_bab_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE materi_progress ENABLE ROW LEVEL SECURITY;

-- Policies for sub_bab_progress
CREATE POLICY "Siswa can view own sub_bab progress"
  ON sub_bab_progress
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = siswa_id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'guru')
    )
  );

CREATE POLICY "Siswa can insert own sub_bab progress"
  ON sub_bab_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = siswa_id);

CREATE POLICY "Siswa can update own sub_bab progress"
  ON sub_bab_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = siswa_id);

-- Policies for materi_progress
CREATE POLICY "Siswa can view own progress"
  ON materi_progress
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = siswa_id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'guru')
    )
  );

CREATE POLICY "Siswa can insert own progress"
  ON materi_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = siswa_id);

CREATE POLICY "Siswa can update own progress"
  ON materi_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = siswa_id);

-- Policy: Admin and Guru can view all progress
CREATE POLICY "Admin and Guru can view all progress"
  ON materi_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'guru')
    )
  );

-- Function to recalculate materi progress based on completed sub_bab
CREATE OR REPLACE FUNCTION recalculate_materi_progress(p_siswa_id UUID, p_materi_id UUID)
RETURNS void AS $$
DECLARE
  v_total_sub_bab INTEGER;
  v_completed_sub_bab INTEGER;
  v_progress INTEGER;
BEGIN
  -- Count total sub_bab for this materi
  SELECT COUNT(DISTINCT msb.id)
  INTO v_total_sub_bab
  FROM materi_sub_bab msb
  JOIN materi_bab mb ON mb.id = msb.bab_id
  WHERE mb.materi_id = p_materi_id;
  
  -- Count completed sub_bab by this siswa
  SELECT COUNT(DISTINCT sbp.sub_bab_id)
  INTO v_completed_sub_bab
  FROM sub_bab_progress sbp
  JOIN materi_sub_bab msb ON msb.id = sbp.sub_bab_id
  JOIN materi_bab mb ON mb.id = msb.bab_id
  WHERE mb.materi_id = p_materi_id
    AND sbp.siswa_id = p_siswa_id
    AND sbp.completed = true;
  
  -- Calculate percentage
  IF v_total_sub_bab > 0 THEN
    v_progress := ROUND((v_completed_sub_bab::NUMERIC / v_total_sub_bab::NUMERIC) * 100);
  ELSE
    v_progress := 0;
  END IF;
  
  -- Upsert materi_progress
  INSERT INTO materi_progress (
    siswa_id,
    materi_id,
    completed_sub_bab,
    total_sub_bab,
    progress_percentage,
    last_read_at,
    completed_at
  ) VALUES (
    p_siswa_id,
    p_materi_id,
    v_completed_sub_bab,
    v_total_sub_bab,
    v_progress,
    now(),
    CASE WHEN v_progress = 100 THEN now() ELSE NULL END
  )
  ON CONFLICT (siswa_id, materi_id)
  DO UPDATE SET
    completed_sub_bab = v_completed_sub_bab,
    total_sub_bab = v_total_sub_bab,
    progress_percentage = v_progress,
    last_read_at = now(),
    completed_at = CASE 
      WHEN v_progress = 100 AND materi_progress.completed_at IS NULL THEN now()
      WHEN v_progress < 100 THEN NULL
      ELSE materi_progress.completed_at
    END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Trigger function to recalculate when sub_bab is marked complete/incomplete
CREATE OR REPLACE FUNCTION trigger_recalculate_materi_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_materi_id UUID;
BEGIN
  -- Get materi_id from sub_bab
  SELECT mb.materi_id INTO v_materi_id
  FROM materi_sub_bab msb
  JOIN materi_bab mb ON mb.id = msb.bab_id
  WHERE msb.id = NEW.sub_bab_id;
  
  -- Recalculate progress
  PERFORM recalculate_materi_progress(NEW.siswa_id, v_materi_id);
  
  -- Update completed_at on sub_bab_progress
  IF NEW.completed = true AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  ELSIF NEW.completed = false THEN
    NEW.completed_at := NULL;
  END IF;
  
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS sub_bab_progress_changed ON sub_bab_progress;
CREATE TRIGGER sub_bab_progress_changed
  BEFORE INSERT OR UPDATE ON sub_bab_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_materi_progress();

COMMENT ON TABLE sub_bab_progress IS 'Tracks which sub_bab has been completed by each student';
COMMENT ON TABLE materi_progress IS 'Calculated progress based on completed sub_bab';
COMMENT ON COLUMN materi_progress.completed_sub_bab IS 'Number of sub_bab marked as completed';
COMMENT ON COLUMN materi_progress.total_sub_bab IS 'Total number of sub_bab in this materi';
COMMENT ON COLUMN materi_progress.progress_percentage IS 'Auto-calculated: (completed/total) * 100';
COMMENT ON COLUMN materi_progress.last_read_at IS 'Last time student marked any sub_bab';
COMMENT ON COLUMN materi_progress.completed_at IS 'When all sub_bab completed (100%)';
