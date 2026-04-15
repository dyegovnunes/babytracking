-- =========================================================================
-- Caderneta de Vacinas
-- Spec: docs/specs/CADERNETA_VACINAS_SPEC.md
-- Guide: docs/guides/CADERNETA_VACINAS_IMPLEMENTATION_GUIDE.md
-- =========================================================================

-- -------------------------------------------------------------------------
-- Tabela: vaccines (referência, read-only)
-- Calendário PNI (SUS) + SBP (particular) de 0 a 18 meses.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vaccines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  protects_against TEXT NOT NULL,
  dose_label TEXT NOT NULL,
  dose_number INT NOT NULL,
  total_doses INT NOT NULL,
  recommended_age_days INT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('PNI', 'SBP')),
  note TEXT,
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vaccines ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler a tabela de referência.
DROP POLICY IF EXISTS "Anyone can read vaccines" ON vaccines;
CREATE POLICY "Anyone can read vaccines" ON vaccines
  FOR SELECT USING (true);

-- -------------------------------------------------------------------------
-- Tabela: baby_vaccines (registros do usuário)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS baby_vaccines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  vaccine_id UUID NOT NULL REFERENCES vaccines(id),
  applied_at DATE NOT NULL,
  location TEXT,
  batch_number TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (baby_id, vaccine_id)
);

CREATE INDEX IF NOT EXISTS idx_baby_vaccines_baby_id ON baby_vaccines(baby_id);

ALTER TABLE baby_vaccines ENABLE ROW LEVEL SECURITY;

-- RLS padrão baby_members (igual baby_milestones)
DROP POLICY IF EXISTS "Members can read baby_vaccines" ON baby_vaccines;
CREATE POLICY "Members can read baby_vaccines" ON baby_vaccines
  FOR SELECT USING (
    baby_id IN (
      SELECT baby_members.baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert baby_vaccines" ON baby_vaccines;
CREATE POLICY "Members can insert baby_vaccines" ON baby_vaccines
  FOR INSERT WITH CHECK (
    baby_id IN (
      SELECT baby_members.baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update baby_vaccines" ON baby_vaccines;
CREATE POLICY "Members can update baby_vaccines" ON baby_vaccines
  FOR UPDATE USING (
    baby_id IN (
      SELECT baby_members.baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete baby_vaccines" ON baby_vaccines;
CREATE POLICY "Members can delete baby_vaccines" ON baby_vaccines
  FOR DELETE USING (
    baby_id IN (
      SELECT baby_members.baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- Seed: ~40 vacinas (PNI + SBP)
-- Conversão de idade: meses * 30 dias (calendário flat, coerente com o spec)
-- sort_order: idade * 10 + prioridade dentro da faixa (PNI antes de SBP)
-- -------------------------------------------------------------------------
INSERT INTO vaccines (code, name, short_name, protects_against, dose_label, dose_number, total_doses, recommended_age_days, source, note, sort_order) VALUES
  -- Ao nascer (0 dias)
  ('BCG',              'BCG',                                       'BCG',              'Tuberculose',                                          'Dose única', 1, 1, 0,   'PNI', NULL, 1),
  ('HEPB_BIRTH',       'Hepatite B',                                'Hepatite B',       'Hepatite B',                                           '1ª dose',    1, 1, 0,   'PNI', 'Aplicada nas primeiras 12 horas de vida.', 2),

  -- 2 meses (60 dias) — PNI
  ('PENTA_1',          'Pentavalente',                              'Pentavalente',     'Difteria, Tétano, Coqueluche, Hib, Hepatite B',        '1ª dose',    1, 3, 60,  'PNI', NULL, 20),
  ('VIP_1',            'VIP (Poliomielite inativada)',              'Poliomielite',     'Poliomielite',                                         '1ª dose',    1, 4, 60,  'PNI', NULL, 21),
  ('ROTA_MONO_1',      'Rotavírus monovalente',                     'Rotavírus',        'Rotavírus',                                            '1ª dose',    1, 2, 60,  'PNI', NULL, 22),
  ('VPC10_1',          'Pneumocócica 10-valente',                   'Pneumo 10',        'Doenças pneumocócicas (10 sorotipos)',                 '1ª dose',    1, 3, 60,  'PNI', NULL, 23),
  ('MENC_1',           'Meningocócica C',                           'Meningo C',        'Meningite tipo C',                                     '1ª dose',    1, 3, 60,  'PNI', NULL, 24),
  -- 2 meses (60 dias) — SBP
  ('VPC13_1',          'Pneumocócica 13-valente',                   'Pneumo 13',        'Doenças pneumocócicas (13 sorotipos)',                 '1ª dose',    1, 4, 60,  'SBP', 'Alternativa particular à VPC10 com maior cobertura.', 25),
  ('ROTA_PENTA_1',     'Rotavírus pentavalente',                    'Rotavírus Penta',  'Rotavírus (5 sorotipos)',                              '1ª dose',    1, 3, 60,  'SBP', 'Alternativa particular à monovalente com maior cobertura.', 26),

  -- 3 meses (90 dias) — SBP
  ('MENB_1',           'Meningocócica B',                           'Meningo B',        'Meningite tipo B',                                     '1ª dose',    1, 3, 90,  'SBP', 'Não disponível no SUS.', 30),

  -- 4 meses (120 dias) — PNI
  ('PENTA_2',          'Pentavalente',                              'Pentavalente',     'Difteria, Tétano, Coqueluche, Hib, Hepatite B',        '2ª dose',    2, 3, 120, 'PNI', NULL, 40),
  ('VIP_2',            'VIP (Poliomielite inativada)',              'Poliomielite',     'Poliomielite',                                         '2ª dose',    2, 4, 120, 'PNI', NULL, 41),
  ('ROTA_MONO_2',      'Rotavírus monovalente',                     'Rotavírus',        'Rotavírus',                                            '2ª dose',    2, 2, 120, 'PNI', NULL, 42),
  ('VPC10_2',          'Pneumocócica 10-valente',                   'Pneumo 10',        'Doenças pneumocócicas (10 sorotipos)',                 '2ª dose',    2, 3, 120, 'PNI', NULL, 43),
  ('MENC_2',           'Meningocócica C',                           'Meningo C',        'Meningite tipo C',                                     '2ª dose',    2, 3, 120, 'PNI', NULL, 44),
  -- 4 meses (120 dias) — SBP
  ('VPC13_2',          'Pneumocócica 13-valente',                   'Pneumo 13',        'Doenças pneumocócicas (13 sorotipos)',                 '2ª dose',    2, 4, 120, 'SBP', NULL, 45),
  ('ROTA_PENTA_2',     'Rotavírus pentavalente',                    'Rotavírus Penta',  'Rotavírus (5 sorotipos)',                              '2ª dose',    2, 3, 120, 'SBP', NULL, 46),

  -- 5 meses (150 dias) — SBP
  ('MENB_2',           'Meningocócica B',                           'Meningo B',        'Meningite tipo B',                                     '2ª dose',    2, 3, 150, 'SBP', NULL, 50),

  -- 6 meses (180 dias) — PNI
  ('PENTA_3',          'Pentavalente',                              'Pentavalente',     'Difteria, Tétano, Coqueluche, Hib, Hepatite B',        '3ª dose',    3, 3, 180, 'PNI', NULL, 60),
  ('VIP_3',            'VIP (Poliomielite inativada)',              'Poliomielite',     'Poliomielite',                                         '3ª dose',    3, 4, 180, 'PNI', NULL, 61),
  ('INFLU_1',          'Influenza',                                 'Gripe',            'Gripe',                                                '1ª dose',    1, 2, 180, 'PNI', 'Campanha anual a partir dos 6 meses.', 62),
  -- 6 meses (180 dias) — SBP
  ('VPC13_3',          'Pneumocócica 13-valente',                   'Pneumo 13',        'Doenças pneumocócicas (13 sorotipos)',                 '3ª dose',    3, 4, 180, 'SBP', NULL, 63),
  ('ROTA_PENTA_3',     'Rotavírus pentavalente',                    'Rotavírus Penta',  'Rotavírus (5 sorotipos)',                              '3ª dose',    3, 3, 180, 'SBP', NULL, 64),
  ('MENACWY_1',        'Meningocócica ACWY',                        'Meningo ACWY',     'Meningite tipos A, C, W, Y',                           '1ª dose',    1, 3, 180, 'SBP', 'Substitui a Meningo C com maior cobertura.', 65),

  -- 7 meses (210 dias)
  ('INFLU_2',          'Influenza',                                 'Gripe',            'Gripe',                                                '2ª dose',    2, 2, 210, 'PNI', 'Segunda dose 30 dias após a primeira, apenas no primeiro ano.', 70),

  -- 9 meses (270 dias)
  ('FEBRE_AMARELA',    'Febre Amarela',                             'Febre Amarela',    'Febre Amarela',                                        '1ª dose',    1, 1, 270, 'PNI', 'Reforço aos 4 anos.', 90),

  -- 12 meses (360 dias) — PNI
  ('SCR_1',            'Tríplice Viral (SCR)',                      'Tríplice Viral',   'Sarampo, Caxumba, Rubéola',                            '1ª dose',    1, 1, 360, 'PNI', NULL, 120),
  ('VPC10_REF',        'Pneumocócica 10-valente',                   'Pneumo 10',        'Doenças pneumocócicas',                                'Reforço',    3, 3, 360, 'PNI', NULL, 121),
  ('MENC_REF',         'Meningocócica C',                           'Meningo C',        'Meningite tipo C',                                     'Reforço',    3, 3, 360, 'PNI', NULL, 122),
  ('VARICELA_1',       'Varicela',                                  'Varicela',         'Catapora',                                             '1ª dose',    1, 1, 360, 'PNI', NULL, 123),
  -- 12 meses (360 dias) — SBP
  ('VPC13_REF',        'Pneumocócica 13-valente',                   'Pneumo 13',        'Doenças pneumocócicas (13 sorotipos)',                 'Reforço',    4, 4, 360, 'SBP', NULL, 124),
  ('MENB_REF',         'Meningocócica B',                           'Meningo B',        'Meningite tipo B',                                     'Reforço',    3, 3, 360, 'SBP', NULL, 125),
  ('MENACWY_2',        'Meningocócica ACWY',                        'Meningo ACWY',     'Meningite tipos A, C, W, Y',                           '2ª dose',    2, 3, 360, 'SBP', NULL, 126),
  ('HEPA_SBP_1',       'Hepatite A',                                'Hepatite A',       'Hepatite A',                                           '1ª dose',    1, 2, 360, 'SBP', 'SBP recomenda 2 doses (12m e 18m).', 127),

  -- 15 meses (450 dias) — PNI
  ('DTP_REF1',         'DTP',                                       'DTP',              'Difteria, Tétano, Coqueluche',                         '1º reforço', 1, 1, 450, 'PNI', NULL, 150),
  ('VIP_REF1',         'VIP (Poliomielite inativada)',              'Poliomielite',     'Poliomielite',                                         '1º reforço', 4, 4, 450, 'PNI', NULL, 151),
  ('HEPA_PNI',         'Hepatite A',                                'Hepatite A',       'Hepatite A',                                           'Dose única', 1, 1, 450, 'PNI', NULL, 152),
  ('TETRA_VIRAL',      'Tetra Viral (SCR-V)',                       'Tetra Viral',      'Sarampo, Caxumba, Rubéola, Varicela',                  '2ª dose',    1, 1, 450, 'PNI', NULL, 153),

  -- 18 meses (540 dias) — SBP
  ('HEPA_SBP_2',       'Hepatite A',                                'Hepatite A',       'Hepatite A',                                           '2ª dose',    2, 2, 540, 'SBP', 'Completa o esquema SBP de 2 doses.', 180),
  ('MENACWY_REF',      'Meningocócica ACWY',                        'Meningo ACWY',     'Meningite tipos A, C, W, Y',                           'Reforço',    3, 3, 540, 'SBP', NULL, 181)
ON CONFLICT (code) DO NOTHING;
