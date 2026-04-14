# Yaya — Marcos do Desenvolvimento: Guia de Implementação para Claude Code

**Versão:** 1.0 | **Data:** 2026-04-13

> **INSTRUÇÕES:** Este documento contém TUDO que você precisa para implementar Marcos do Desenvolvimento no Yaya Baby. Leia o documento inteiro antes de começar. Execute na ordem dos steps. Cada step tem contexto do que já existe e o que precisa ser criado. Para detalhes de produto (textos, regras, comportamento), consulte `MARCOS_DESENVOLVIMENTO_SPEC.md`.

---

## Contexto do Projeto

- **Stack:** React 19 + Vite + TypeScript + Capacitor (iOS/Android) + Supabase (Auth, DB, Storage, Edge Functions)
- **App ID:** `app.yayababy`
- **Supabase:** SDK 2.101.1 já configurado
- **Monetização:** RevenueCat (entitlement: `yaya_plus`), contexto em `src/contexts/PurchaseContext.tsx`
- **Design tokens:** globals.css (Manrope headline, Plus Jakarta Sans label, #b79fff primary, #0d0a27 surface, #e7e2ff on-surface, #ff96b9 tertiary, #7dffba success)

---

## Mapa do que JÁ EXISTE (não recriar)

### Tabelas Supabase existentes:
| Tabela | Campos relevantes |
|--------|-------------------|
| `babies` | id, name, birth_date, gender, photo_url |
| `baby_members` | user_id, baby_id, display_name, role |
| `profiles` | id, is_premium, subscription_status, subscription_plan |
| `logs` | baby_id, event_id, timestamp, ml, duration, notes, created_by |

### Arquivos-chave existentes:
| Arquivo | O que faz |
|---------|-----------|
| `app/src/contexts/AppContext.tsx` | Carrega logs, intervals, baby, members. State global |
| `app/src/contexts/PurchaseContext.tsx` | RevenueCat. `isPremium`. Entitlement: `yaya_plus` |
| `app/src/hooks/usePremium.ts` | Hook que expõe `isPremium` |
| `app/src/lib/developmentLeaps.ts` | DEVELOPMENT_LEAPS array, getActiveLeap(), getUpcomingLeap() |
| `app/src/lib/ageUtils.ts` | AgeBand type, getAgeBand(), getHighlightedEvents() |
| `app/src/components/LeapCard.tsx` | Card de saltos na home. Modelo visual para MilestoneHomeCard |
| `app/src/components/ui/Toast.tsx` | Toast component reutilizável |
| `app/src/components/ui/PaywallModal.tsx` | Modal de paywall com trigger |
| `app/src/pages/TrackerPage.tsx` | Home. Já tem LeapCard integrado na linha ~141-155 |
| `app/src/pages/ProfilePage.tsx` | Perfil. Seções: BabyCard, GrowthSection, Cuidadores, SharedReports, Sair |
| `app/src/lib/supabase.ts` | Cliente Supabase inicializado |
| `app/src/lib/haptics.ts` | hapticSuccess(), hapticLight(), hapticMedium() |
| `app/src/styles/globals.css` | Todos os design tokens, animações (page-enter) |
| `app/capacitor.config.ts` | appId: app.yayababy |

### O que NÃO existe (precisa criar):
- ❌ Tabela `milestones` (referência de marcos)
- ❌ Tabela `baby_milestones` (registros do usuário)
- ❌ Storage bucket `milestone-photos`
- ❌ Arquivo `milestoneData.ts` com array de marcos
- ❌ Hook `useMilestones.ts`
- ❌ Componente `MilestoneHomeCard.tsx`
- ❌ Componente `MilestoneRegister.tsx`
- ❌ Componente `MilestoneCelebration.tsx`
- ❌ Componente `MilestoneShareImage.tsx`
- ❌ Página `MilestonesPage.tsx` (repositório)
- ❌ Componentes de timeline (`MilestoneTimeline.tsx`, `MilestoneCard.tsx`, `MilestoneDetail.tsx`)
- ❌ Botão de acesso no ProfilePage
- ❌ Rota `/marcos` no router

---

## STEP 1 — Migration: Tabelas + Storage + Seed Data

**Objetivo:** Criar as tabelas `milestones` e `baby_milestones`, o bucket de fotos e popular com ~35 marcos.

### Migration: `supabase/migrations/20260414_milestones.sql`

```sql
-- ============================================
-- MARCOS DO DESENVOLVIMENTO — Tabelas, RLS, Storage, Seed
-- ============================================

-- 1. Tabela de referência de marcos (read-only para o app)
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('motor', 'cognitivo', 'social', 'linguagem', 'alimentacao', 'autonomia', 'motor_fino', 'comunicacao')),
  typical_age_days_min INT NOT NULL,
  typical_age_days_max INT NOT NULL,
  age_band TEXT NOT NULL,
  sort_order INT NOT NULL,
  source TEXT DEFAULT 'CDC/SBP'
);

-- 2. Tabela de marcos registrados pelo usuário
CREATE TABLE IF NOT EXISTS baby_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES milestones(id),
  achieved_at DATE NOT NULL,
  photo_url TEXT,
  note TEXT CHECK (char_length(note) <= 140),
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(baby_id, milestone_id)
);

-- RLS baby_milestones
ALTER TABLE baby_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view milestones"
  ON baby_milestones FOR SELECT
  USING (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert milestones"
  ON baby_milestones FOR INSERT
  WITH CHECK (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update milestones"
  ON baby_milestones FOR UPDATE
  USING (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can delete milestones"
  ON baby_milestones FOR DELETE
  USING (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));

-- RLS milestones (todos podem ler, ninguém altera pelo app)
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read milestones"
  ON milestones FOR SELECT
  USING (true);

-- 3. Storage bucket para fotos de marcos
INSERT INTO storage.buckets (id, name, public)
VALUES ('milestone-photos', 'milestone-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Members can upload milestone photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'milestone-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT baby_id::text FROM baby_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view milestone photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'milestone-photos');

-- 4. Seed: ~35 marcos organizados por faixa etária
-- Idade em dias: 1 mês ≈ 30d, 1 semana ≈ 7d

INSERT INTO milestones (code, name, description, emoji, category, typical_age_days_min, typical_age_days_max, age_band, sort_order) VALUES
-- 0 a 2 meses (newborn)
('fixes_gaze',       'Fixa o olhar em rostos',              'O bebê olha diretamente para o rosto de quem está perto.',                '👀', 'cognitivo',   15,  45,  'newborn', 1),
('first_smile',      'Primeiro sorriso social',             'O primeiro sorriso intencional, em resposta a um rosto ou voz.',          '😊', 'social',      35,  56,  'newborn', 2),
('tracks_objects',   'Segue objetos com os olhos',          'Acompanha um objeto em movimento com o olhar.',                           '👁️', 'cognitivo',   45,  75,  'newborn', 3),
('lifts_head_brief', 'Levanta a cabeça brevemente',         'Quando de barriga, levanta a cabeça por alguns segundos.',                '💪', 'motor',       15,  45,  'newborn', 4),

-- 2 a 4 meses (early)
('holds_head_steady','Sustenta a cabeça firme',             'Mantém a cabeça firme e estável sem apoio.',                              '💪', 'motor',       60,  105, 'early', 5),
('laughs_aloud',     'Ri alto (gargalhada)',                'A primeira gargalhada verdadeira.',                                       '😂', 'social',      90,  120, 'early', 6),
('grasps_objects',   'Agarra objetos com a mão',            'Pega e segura objetos intencionalmente.',                                 '🤲', 'motor',       90,  120, 'early', 7),
('pushes_up_arms',   'Empurra o corpo para cima com os braços', 'De barriga, levanta o tronco apoiando nos braços.',                   '🏋️', 'motor',       90,  120, 'early', 8),

-- 4 a 6 meses (growing)
('rolls_over',       'Rola de barriga',                     'Rola de barriga para cima ou vice-versa.',                                '🔄', 'motor',       120, 165, 'growing', 9),
('mouths_objects',   'Leva objetos à boca',                 'Explora objetos levando-os à boca.',                                      '👄', 'motor',       120, 150, 'growing', 10),
('babbles',          'Balbucia sons (ba-ba, da-da)',         'Produz sequências de sons com consoantes.',                               '🗣️', 'linguagem',   150, 180, 'growing', 11),
('sits_supported',   'Senta com apoio',                     'Consegue sentar quando apoiado por almofadas ou mãos.',                   '🪑', 'motor',       150, 180, 'growing', 12),
('recognizes_name',  'Reconhece o próprio nome',            'Vira a cabeça ou reage quando chamam pelo nome.',                         '👂', 'cognitivo',   150, 180, 'growing', 13),

-- 6 a 9 meses (weaning)
('sits_unsupported', 'Senta sem apoio',                     'Senta firme sozinho, sem precisar de apoio.',                             '🧘', 'motor',       180, 210, 'weaning', 14),
('transfers_hands',  'Transfere objetos entre as mãos',     'Passa um objeto de uma mão para a outra.',                                '🤹', 'motor',       195, 225, 'weaning', 15),
('stranger_anxiety', 'Estranha pessoas desconhecidas',      'Demonstra desconforto ou choro com pessoas que não conhece.',             '😟', 'social',      210, 255, 'weaning', 16),
('crawls',           'Engatinha (ou se arrasta)',            'Se locomove pelo chão, engatinhando ou se arrastando.',                   '🐛', 'motor',       240, 285, 'weaning', 17),
('pincer_grasp',     'Usa pinça (polegar + indicador)',      'Pega objetos pequenos usando o polegar e o indicador.',                   '🤏', 'motor_fino',  240, 285, 'weaning', 18),
('first_solids',     'Primeiros alimentos sólidos',          'Início da introdução alimentar.',                                        '🥑', 'alimentacao', 180, 195, 'weaning', 19),

-- 9 a 12 meses (active)
('stands_supported', 'Fica em pé com apoio',                'Fica em pé segurando em móveis ou nas mãos de alguém.',                  '🧍', 'motor',       270, 315, 'active', 20),
('says_mama_papa',   'Fala "mamã" ou "papá" com intenção',  'Usa "mamã" ou "papá" direcionado à pessoa certa.',                       '🗨️', 'linguagem',   300, 345, 'active', 21),
('claps_waves',      'Bate palmas / dá tchau',              'Imita gestos sociais como bater palmas e dar tchau.',                     '👋', 'social',      270, 315, 'active', 22),
('cruises',          'Anda com apoio (cruzeiro)',            'Caminha segurando nos móveis.',                                           '🚶', 'motor',       330, 365, 'active', 23),
('first_steps',      'Primeiros passos sozinho',            'Dá os primeiros passos sem apoio. Um momento inesquecível!',              '👣', 'motor',       345, 395, 'active', 24),
('drinks_cup',       'Bebe no copo com ajuda',              'Consegue beber líquidos de um copo com assistência.',                     '🥤', 'motor',       300, 365, 'active', 25),

-- 12 a 18 meses (toddler_early)
('walks_steady',     'Anda sozinho com firmeza',            'Caminha com equilíbrio e confiança.',                                     '🚶', 'motor',       395, 460, 'toddler_early', 26),
('speaks_5_words',   'Fala 5 a 10 palavras',               'Vocabulário de pelo menos 5 palavras reconhecíveis.',                     '💬', 'linguagem',   365, 460, 'toddler_early', 27),
('stacks_2_blocks',  'Empilha 2 blocos',                   'Consegue empilhar dois blocos sem derrubar.',                              '🧱', 'motor_fino',  425, 490, 'toddler_early', 28),
('points_wants',     'Aponta para o que quer',              'Usa o dedo indicador para mostrar o que deseja.',                          '☝️', 'comunicacao', 365, 425, 'toddler_early', 29),
('eats_hands',       'Come sozinho com as mãos',            'Pega alimentos e leva à boca de forma independente.',                     '🍽️', 'alimentacao', 365, 425, 'toddler_early', 30),
('scribbles',        'Rabisca com giz',                     'Segura um giz ou lápis e faz rabiscos no papel.',                         '✏️', 'motor_fino',  460, 545, 'toddler_early', 31),

-- 18 a 24 meses (toddler)
('runs_unstable',    'Corre (instável)',                    'Corre com passos curtos, ainda sem muito equilíbrio.',                    '🏃', 'motor',       545, 610, 'toddler', 32),
('combines_words',   'Combina 2 palavras',                  'Junta duas palavras: "quero água", "mamãe vem".',                        '💬', 'linguagem',   545, 610, 'toddler', 33),
('stacks_4_blocks',  'Empilha 4+ blocos',                   'Empilha quatro ou mais blocos.',                                          '🧱', 'motor_fino',  610, 670, 'toddler', 34),
('imitates_chores',  'Imita atividades domésticas',         'Brinca de varrer, cozinhar ou limpar, imitando adultos.',                 '🧹', 'social',      545, 730, 'toddler', 35),
('climbs_stairs',    'Sobe escadas com apoio',              'Sobe degraus segurando no corrimão ou na mão de alguém.',                 '🪜', 'motor',       610, 730, 'toddler', 36),
('potty_interest',   'Desfralde: demonstra interesse',      'Mostra curiosidade pelo banheiro ou avisa quando está sujo.',             '🚽', 'autonomia',   670, 730, 'toddler', 37);
```

**IMPORTANTE:** Execute esta migration no Supabase. Depois verifique com `SELECT count(*) FROM milestones;` que retorna 37.

---

## STEP 2 — Dados client-side: `milestoneData.ts`

**Objetivo:** Array local de marcos para uso sem consulta ao banco (performance). Espelha a tabela `milestones`.

### Criar: `app/src/lib/milestoneData.ts`

```typescript
import type { AgeBand } from './ageUtils'

export interface Milestone {
  id?: string             // UUID do banco (preenchido após fetch)
  code: string
  name: string
  description: string
  emoji: string
  category: 'motor' | 'cognitivo' | 'social' | 'linguagem' | 'alimentacao' | 'autonomia' | 'motor_fino' | 'comunicacao'
  typicalAgeDaysMin: number
  typicalAgeDaysMax: number
  ageBand: AgeBand
  sortOrder: number
}

export interface BabyMilestone {
  id: string
  babyId: string
  milestoneId: string
  milestoneCode: string   // join
  achievedAt: string       // ISO date
  photoUrl: string | null
  note: string | null
  recordedBy: string | null
  createdAt: string
}

export const MILESTONES: Milestone[] = [
  // ---- newborn (0-2 meses) ----
  { code: 'fixes_gaze',       name: 'Fixa o olhar em rostos',              description: 'O bebê olha diretamente para o rosto de quem está perto.',      emoji: '👀', category: 'cognitivo',   typicalAgeDaysMin: 15,  typicalAgeDaysMax: 45,  ageBand: 'newborn',       sortOrder: 1 },
  { code: 'first_smile',      name: 'Primeiro sorriso social',             description: 'O primeiro sorriso intencional, em resposta a um rosto ou voz.', emoji: '😊', category: 'social',      typicalAgeDaysMin: 35,  typicalAgeDaysMax: 56,  ageBand: 'newborn',       sortOrder: 2 },
  { code: 'tracks_objects',   name: 'Segue objetos com os olhos',          description: 'Acompanha um objeto em movimento com o olhar.',                  emoji: '👁️', category: 'cognitivo',   typicalAgeDaysMin: 45,  typicalAgeDaysMax: 75,  ageBand: 'newborn',       sortOrder: 3 },
  { code: 'lifts_head_brief', name: 'Levanta a cabeça brevemente',         description: 'Quando de barriga, levanta a cabeça por alguns segundos.',       emoji: '💪', category: 'motor',       typicalAgeDaysMin: 15,  typicalAgeDaysMax: 45,  ageBand: 'newborn',       sortOrder: 4 },
  // ---- early (2-4 meses) ----
  { code: 'holds_head_steady',name: 'Sustenta a cabeça firme',             description: 'Mantém a cabeça firme e estável sem apoio.',                     emoji: '💪', category: 'motor',       typicalAgeDaysMin: 60,  typicalAgeDaysMax: 105, ageBand: 'early',         sortOrder: 5 },
  { code: 'laughs_aloud',     name: 'Ri alto (gargalhada)',                description: 'A primeira gargalhada verdadeira.',                              emoji: '😂', category: 'social',      typicalAgeDaysMin: 90,  typicalAgeDaysMax: 120, ageBand: 'early',         sortOrder: 6 },
  { code: 'grasps_objects',   name: 'Agarra objetos com a mão',            description: 'Pega e segura objetos intencionalmente.',                        emoji: '🤲', category: 'motor',       typicalAgeDaysMin: 90,  typicalAgeDaysMax: 120, ageBand: 'early',         sortOrder: 7 },
  { code: 'pushes_up_arms',   name: 'Empurra o corpo para cima com os braços', description: 'De barriga, levanta o tronco apoiando nos braços.',          emoji: '🏋️', category: 'motor',       typicalAgeDaysMin: 90,  typicalAgeDaysMax: 120, ageBand: 'early',         sortOrder: 8 },
  // ---- growing (4-6 meses) ----
  { code: 'rolls_over',       name: 'Rola de barriga',                     description: 'Rola de barriga para cima ou vice-versa.',                       emoji: '🔄', category: 'motor',       typicalAgeDaysMin: 120, typicalAgeDaysMax: 165, ageBand: 'growing',       sortOrder: 9 },
  { code: 'mouths_objects',   name: 'Leva objetos à boca',                 description: 'Explora objetos levando-os à boca.',                             emoji: '👄', category: 'motor',       typicalAgeDaysMin: 120, typicalAgeDaysMax: 150, ageBand: 'growing',       sortOrder: 10 },
  { code: 'babbles',          name: 'Balbucia sons (ba-ba, da-da)',         description: 'Produz sequências de sons com consoantes.',                      emoji: '🗣️', category: 'linguagem',   typicalAgeDaysMin: 150, typicalAgeDaysMax: 180, ageBand: 'growing',       sortOrder: 11 },
  { code: 'sits_supported',   name: 'Senta com apoio',                     description: 'Consegue sentar quando apoiado por almofadas ou mãos.',          emoji: '🪑', category: 'motor',       typicalAgeDaysMin: 150, typicalAgeDaysMax: 180, ageBand: 'growing',       sortOrder: 12 },
  { code: 'recognizes_name',  name: 'Reconhece o próprio nome',            description: 'Vira a cabeça ou reage quando chamam pelo nome.',                emoji: '👂', category: 'cognitivo',   typicalAgeDaysMin: 150, typicalAgeDaysMax: 180, ageBand: 'growing',       sortOrder: 13 },
  // ---- weaning (6-9 meses) ----
  { code: 'sits_unsupported', name: 'Senta sem apoio',                     description: 'Senta firme sozinho, sem precisar de apoio.',                    emoji: '🧘', category: 'motor',       typicalAgeDaysMin: 180, typicalAgeDaysMax: 210, ageBand: 'weaning',       sortOrder: 14 },
  { code: 'transfers_hands',  name: 'Transfere objetos entre as mãos',     description: 'Passa um objeto de uma mão para a outra.',                       emoji: '🤹', category: 'motor',       typicalAgeDaysMin: 195, typicalAgeDaysMax: 225, ageBand: 'weaning',       sortOrder: 15 },
  { code: 'stranger_anxiety', name: 'Estranha pessoas desconhecidas',      description: 'Demonstra desconforto ou choro com pessoas que não conhece.',    emoji: '😟', category: 'social',      typicalAgeDaysMin: 210, typicalAgeDaysMax: 255, ageBand: 'weaning',       sortOrder: 16 },
  { code: 'crawls',           name: 'Engatinha (ou se arrasta)',            description: 'Se locomove pelo chão, engatinhando ou se arrastando.',           emoji: '🐛', category: 'motor',       typicalAgeDaysMin: 240, typicalAgeDaysMax: 285, ageBand: 'weaning',       sortOrder: 17 },
  { code: 'pincer_grasp',     name: 'Usa pinça (polegar + indicador)',      description: 'Pega objetos pequenos usando o polegar e o indicador.',          emoji: '🤏', category: 'motor_fino', typicalAgeDaysMin: 240, typicalAgeDaysMax: 285, ageBand: 'weaning',       sortOrder: 18 },
  { code: 'first_solids',     name: 'Primeiros alimentos sólidos',          description: 'Início da introdução alimentar.',                               emoji: '🥑', category: 'alimentacao',typicalAgeDaysMin: 180, typicalAgeDaysMax: 195, ageBand: 'weaning',       sortOrder: 19 },
  // ---- active (9-12 meses) ----
  { code: 'stands_supported', name: 'Fica em pé com apoio',                description: 'Fica em pé segurando em móveis ou nas mãos de alguém.',          emoji: '🧍', category: 'motor',       typicalAgeDaysMin: 270, typicalAgeDaysMax: 315, ageBand: 'active',        sortOrder: 20 },
  { code: 'says_mama_papa',   name: 'Fala "mamã" ou "papá" com intenção',  description: 'Usa "mamã" ou "papá" direcionado à pessoa certa.',               emoji: '🗨️', category: 'linguagem',  typicalAgeDaysMin: 300, typicalAgeDaysMax: 345, ageBand: 'active',        sortOrder: 21 },
  { code: 'claps_waves',      name: 'Bate palmas / dá tchau',              description: 'Imita gestos sociais como bater palmas e dar tchau.',             emoji: '👋', category: 'social',     typicalAgeDaysMin: 270, typicalAgeDaysMax: 315, ageBand: 'active',        sortOrder: 22 },
  { code: 'cruises',          name: 'Anda com apoio (cruzeiro)',            description: 'Caminha segurando nos móveis.',                                  emoji: '🚶', category: 'motor',      typicalAgeDaysMin: 330, typicalAgeDaysMax: 365, ageBand: 'active',        sortOrder: 23 },
  { code: 'first_steps',      name: 'Primeiros passos sozinho',            description: 'Dá os primeiros passos sem apoio. Um momento inesquecível!',     emoji: '👣', category: 'motor',      typicalAgeDaysMin: 345, typicalAgeDaysMax: 395, ageBand: 'active',        sortOrder: 24 },
  { code: 'drinks_cup',       name: 'Bebe no copo com ajuda',              description: 'Consegue beber líquidos de um copo com assistência.',             emoji: '🥤', category: 'motor',      typicalAgeDaysMin: 300, typicalAgeDaysMax: 365, ageBand: 'active',        sortOrder: 25 },
  // ---- toddler_early (12-18 meses) ----
  { code: 'walks_steady',     name: 'Anda sozinho com firmeza',            description: 'Caminha com equilíbrio e confiança.',                            emoji: '🚶', category: 'motor',      typicalAgeDaysMin: 395, typicalAgeDaysMax: 460, ageBand: 'toddler_early', sortOrder: 26 },
  { code: 'speaks_5_words',   name: 'Fala 5 a 10 palavras',               description: 'Vocabulário de pelo menos 5 palavras reconhecíveis.',             emoji: '💬', category: 'linguagem',  typicalAgeDaysMin: 365, typicalAgeDaysMax: 460, ageBand: 'toddler_early', sortOrder: 27 },
  { code: 'stacks_2_blocks',  name: 'Empilha 2 blocos',                   description: 'Consegue empilhar dois blocos sem derrubar.',                     emoji: '🧱', category: 'motor_fino', typicalAgeDaysMin: 425, typicalAgeDaysMax: 490, ageBand: 'toddler_early', sortOrder: 28 },
  { code: 'points_wants',     name: 'Aponta para o que quer',              description: 'Usa o dedo indicador para mostrar o que deseja.',                 emoji: '☝️', category: 'comunicacao',typicalAgeDaysMin: 365, typicalAgeDaysMax: 425, ageBand: 'toddler_early', sortOrder: 29 },
  { code: 'eats_hands',       name: 'Come sozinho com as mãos',            description: 'Pega alimentos e leva à boca de forma independente.',             emoji: '🍽️', category: 'alimentacao',typicalAgeDaysMin: 365, typicalAgeDaysMax: 425, ageBand: 'toddler_early', sortOrder: 30 },
  { code: 'scribbles',        name: 'Rabisca com giz',                     description: 'Segura um giz ou lápis e faz rabiscos no papel.',                 emoji: '✏️', category: 'motor_fino', typicalAgeDaysMin: 460, typicalAgeDaysMax: 545, ageBand: 'toddler_early', sortOrder: 31 },
  // ---- toddler (18-24 meses) ----
  { code: 'runs_unstable',    name: 'Corre (instável)',                    description: 'Corre com passos curtos, ainda sem muito equilíbrio.',            emoji: '🏃', category: 'motor',      typicalAgeDaysMin: 545, typicalAgeDaysMax: 610, ageBand: 'toddler',       sortOrder: 32 },
  { code: 'combines_words',   name: 'Combina 2 palavras',                  description: 'Junta duas palavras: "quero água", "mamãe vem".',                emoji: '💬', category: 'linguagem',  typicalAgeDaysMin: 545, typicalAgeDaysMax: 610, ageBand: 'toddler',       sortOrder: 33 },
  { code: 'stacks_4_blocks',  name: 'Empilha 4+ blocos',                   description: 'Empilha quatro ou mais blocos.',                                 emoji: '🧱', category: 'motor_fino', typicalAgeDaysMin: 610, typicalAgeDaysMax: 670, ageBand: 'toddler',       sortOrder: 34 },
  { code: 'imitates_chores',  name: 'Imita atividades domésticas',         description: 'Brinca de varrer, cozinhar ou limpar, imitando adultos.',        emoji: '🧹', category: 'social',     typicalAgeDaysMin: 545, typicalAgeDaysMax: 730, ageBand: 'toddler',       sortOrder: 35 },
  { code: 'climbs_stairs',    name: 'Sobe escadas com apoio',              description: 'Sobe degraus segurando no corrimão ou na mão de alguém.',        emoji: '🪜', category: 'motor',      typicalAgeDaysMin: 610, typicalAgeDaysMax: 730, ageBand: 'toddler',       sortOrder: 36 },
  { code: 'potty_interest',   name: 'Desfralde: demonstra interesse',      description: 'Mostra curiosidade pelo banheiro ou avisa quando está sujo.',    emoji: '🚽', category: 'autonomia',  typicalAgeDaysMin: 670, typicalAgeDaysMax: 730, ageBand: 'toddler',       sortOrder: 37 },
]

/**
 * Retorna o próximo marco não-registrado para o card na home.
 * Janela: idade atual - 30d até idade atual + 60d.
 * Prioridade: mais próximo da idade atual.
 */
export function getNextMilestoneForHome(
  achievedCodes: Set<string>,
  ageDays: number,
  dismissedCodes?: Set<string>
): Milestone | null {
  const candidates = MILESTONES.filter(m =>
    !achievedCodes.has(m.code) &&
    !(dismissedCodes?.has(m.code)) &&
    m.typicalAgeDaysMin <= ageDays + 60 &&
    m.typicalAgeDaysMax >= ageDays - 30
  )

  candidates.sort((a, b) => {
    const midA = (a.typicalAgeDaysMin + a.typicalAgeDaysMax) / 2
    const midB = (b.typicalAgeDaysMin + b.typicalAgeDaysMax) / 2
    return Math.abs(midA - ageDays) - Math.abs(midB - ageDays)
  })

  return candidates[0] || null
}

/**
 * Textos introdutórios por faixa etária para o card na home.
 */
export const BAND_INTRO_TEXT: Record<string, string> = {
  newborn:       'Nas primeiras semanas, cada olhar é uma conquista.',
  early:         'Entre 1 e 3 meses, as respostas sociais começam a aparecer.',
  growing:       'Descobrindo o próprio corpo. Muita coisa nova!',
  weaning:       'Com 6 a 9 meses, a mobilidade muda tudo.',
  active:        'Quase andando! Os próximos marcos são inesquecíveis.',
  toddler_early: 'Palavras, passos firmes e muita personalidade.',
  toddler:       'De 18 a 24 meses: a autonomia explode.',
}
```

---

## STEP 3 — Hook: `useMilestones.ts`

**Objetivo:** Hook que carrega marcos do banco, expõe dados e funções de registro.

### Criar: `app/src/hooks/useMilestones.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { MILESTONES, type Milestone, type BabyMilestone } from '../lib/milestoneData'
import { getAgeBand } from '../lib/ageUtils'

export function useMilestones(babyId: string | undefined, birthDate: string | undefined) {
  const [achieved, setAchieved] = useState<BabyMilestone[]>([])
  const [loading, setLoading] = useState(true)

  const ageDays = birthDate
    ? Math.floor((Date.now() - new Date(birthDate).getTime()) / 86400000)
    : 0
  const currentBand = birthDate ? getAgeBand(birthDate) : 'beyond'

  // Fetch achieved milestones
  useEffect(() => {
    if (!babyId) return
    setLoading(true)

    supabase
      .from('baby_milestones')
      .select('id, baby_id, milestone_id, achieved_at, photo_url, note, recorded_by, created_at, milestones(code)')
      .eq('baby_id', babyId)
      .order('achieved_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setAchieved(data.map((d: any) => ({
            id: d.id,
            babyId: d.baby_id,
            milestoneId: d.milestone_id,
            milestoneCode: d.milestones?.code || '',
            achievedAt: d.achieved_at,
            photoUrl: d.photo_url,
            note: d.note,
            recordedBy: d.recorded_by,
            createdAt: d.created_at,
          })))
        }
        setLoading(false)
      })
  }, [babyId])

  const achievedCodes = new Set(achieved.map(a => a.milestoneCode))

  const registerMilestone = useCallback(async (
    milestoneCode: string,
    achievedAt: string,
    photoUri?: string,
    note?: string,
    userId?: string
  ) => {
    if (!babyId) return null

    // Find milestone ID from DB
    const { data: mData } = await supabase
      .from('milestones')
      .select('id')
      .eq('code', milestoneCode)
      .single()

    if (!mData) return null

    let photoUrl: string | null = null

    // Upload photo if provided
    if (photoUri) {
      const fileName = `${babyId}/${milestoneCode}.jpg`
      const response = await fetch(photoUri)
      const blob = await response.blob()

      const { error: uploadError } = await supabase.storage
        .from('milestone-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('milestone-photos')
          .getPublicUrl(fileName)
        photoUrl = urlData.publicUrl
      }
    }

    const { data, error } = await supabase
      .from('baby_milestones')
      .insert({
        baby_id: babyId,
        milestone_id: mData.id,
        achieved_at: achievedAt,
        photo_url: photoUrl,
        note: note || null,
        recorded_by: userId || null,
      })
      .select()
      .single()

    if (!error && data) {
      setAchieved(prev => [...prev, {
        id: data.id,
        babyId: data.baby_id,
        milestoneId: data.milestone_id,
        milestoneCode,
        achievedAt: data.achieved_at,
        photoUrl: data.photo_url,
        note: data.note,
        recordedBy: data.recorded_by,
        createdAt: data.created_at,
      }])
      return data
    }
    return null
  }, [babyId])

  const deleteMilestone = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('baby_milestones')
      .delete()
      .eq('id', id)

    if (!error) {
      setAchieved(prev => prev.filter(a => a.id !== id))
    }
  }, [])

  return {
    allMilestones: MILESTONES,
    achieved,
    achievedCodes,
    ageDays,
    currentBand,
    achievedCount: achieved.length,
    totalForAge: MILESTONES.filter(m => m.typicalAgeDaysMax <= ageDays + 30).length,
    loading,
    registerMilestone,
    deleteMilestone,
  }
}
```

---

## STEP 4 — Componente: `MilestoneHomeCard.tsx`

**Objetivo:** Card que aparece na home (TrackerPage) abaixo do LeapCard, sugerindo o próximo marco.

### Criar: `app/src/components/milestones/MilestoneHomeCard.tsx`

```typescript
import { useState, useEffect, useCallback } from 'react'
import { hapticLight } from '../../lib/haptics'
import { getNextMilestoneForHome, BAND_INTRO_TEXT, type Milestone } from '../../lib/milestoneData'

interface Props {
  milestone: Milestone
  babyName: string
  babyGender: 'boy' | 'girl'
  ageBand: string
  onRegister: (milestone: Milestone) => void
  onDismiss: (milestone: Milestone) => void
}

export default function MilestoneHomeCard({ milestone, babyName, babyGender, ageBand, onRegister, onDismiss }: Props) {
  const article = babyGender === 'boy' ? 'o' : 'a'

  return (
    <div className="bg-surface-container rounded-2xl p-5 border border-tertiary/15 page-enter">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-tertiary/12 flex items-center justify-center text-2xl">
          🎯
        </div>
        <span className="font-headline text-sm font-bold text-tertiary">
          Marcos desta fase
        </span>
      </div>

      <p className="font-label text-sm text-on-surface leading-relaxed mb-4">
        {milestone.description}{' '}
        <span className="text-primary font-semibold">{article} {babyName}</span> já fez isso?
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => { hapticLight(); onRegister(milestone) }}
          className="bg-tertiary text-surface font-label text-sm font-bold py-2.5 px-5 rounded-xl active:scale-95 transition-transform"
        >
          Sim, registrar!
        </button>
        <button
          onClick={() => { hapticLight(); onDismiss(milestone) }}
          className="text-on-surface-variant font-label text-xs underline underline-offset-2"
        >
          Ainda não
        </button>
      </div>
    </div>
  )
}
```

Regras de dismiss: ao tocar "Ainda não", o componente pai (TrackerPage) salva no localStorage `milestone_dismissed_{code}` com timestamp. Após 14 dias, expira. Também exibe um Toast: "Você pode acessar os marcos no perfil do(a) {nome}".

---

## STEP 5 — Componente: `MilestoneRegister.tsx`

**Objetivo:** Tela de registro de marco com data, foto opcional e nota.

### Criar: `app/src/components/milestones/MilestoneRegister.tsx`

Implementar como modal fullscreen ou nova rota. Campos:

1. **Emoji + nome do marco** (header)
2. **Data** — input date, default hoje, pode alterar para o passado
3. **Foto** — usar `@capacitor/camera` (Camera.getPhoto). Fallback: `<input type="file" accept="image/*" capture="environment">`. Preview circular.
4. **Nota** — textarea, max 140 chars, com contador
5. **Botão "Salvar marco"** — chama `registerMilestone()` do hook

Ao salvar com sucesso, navega para `MilestoneCelebration`.

**Dependência:** instalar `@capacitor/camera` se ainda não instalado.

```bash
cd app && npm install @capacitor/camera
```

---

## STEP 6 — Componente: `MilestoneCelebration.tsx`

**Objetivo:** Tela de celebração com confetti após registrar um marco.

### Criar: `app/src/components/milestones/MilestoneCelebration.tsx`

1. **Confetti:** usar biblioteca `canvas-confetti` (`npm install canvas-confetti`) ou CSS puro com divs animadas
2. **Layout:** emoji grande, "Parabéns! [nome] alcançou:", nome do marco em destaque, idade em meses e dias, data, foto circular (se houver), nota em itálico
3. **Botões:** "Compartilhar" (abre MilestoneShareImage) e "Fechar" (navega de volta)
4. **Animação:** confetti dispara automaticamente ao montar, duração 2s

---

## STEP 7 — Componente: `MilestoneShareImage.tsx`

**Objetivo:** Gerar imagem 1080x1080 compartilhável usando Canvas API.

### Criar: `app/src/components/milestones/MilestoneShareImage.tsx`

Usar `html2canvas` ou Canvas API nativo:
- **Fundo:** gradiente (linear-gradient 135deg, #1a1145 → #0d0a27)
- **Topo:** "YAYA BABY" em Manrope 11px, letter-spacing 1px, cor primary
- **Centro:** foto circular 300px (se houver) ou emoji 180px. Border 3px primary
- **Texto:** nome do marco (Manrope bold 48px), "[nome] alcançou com X meses e Y dias", data, nota em itálico
- **Rodapé:** "yayababy.app" em 24px, cor dim

Após gerar o canvas, converter para blob e usar `navigator.share()` (ou `@capacitor/share`) para compartilhar.

```bash
cd app && npm install html2canvas
```

---

## STEP 8 — Página: `MilestonesPage.tsx` (Repositório)

**Objetivo:** Página de repositório/galeria com timeline vertical de marcos.

### Criar: `app/src/pages/MilestonesPage.tsx`

Componentes internos:
- **Header:** "Marcos de [nome]" + botão voltar
- **Barra de progresso:** X/Y marcos registrados vs total até a idade atual
- **Filtros:** Todos | Registrados | Pendentes (chips horizontais)
- **Timeline:** agrupada por faixa etária (seções com título "0 a 2 meses", "2 a 4 meses", etc.)
- **MilestoneCard:** cada marco na timeline com dot (achieved=verde, next=rosa pulsante, future=dim)
- **MilestoneDetail:** modal ao tocar em marco registrado (foto full, data, nota, conexão com salto)
- **Paywall:** após a faixa atual, se free, mostrar banner "Veja todos os marcos de X a 24 meses com Yaya+"

**Paywall logic:**
- Free: vê apenas marcos até a faixa atual (`currentBand`)
- Yaya+: vê todas as faixas

**Conexão com saltos:** ao exibir um marco registrado, verificar se na data `achieved_at` havia um salto ativo usando `DEVELOPMENT_LEAPS`:
```typescript
import { DEVELOPMENT_LEAPS } from '../../lib/developmentLeaps'

function getLeapAtDate(birthDate: string, achievedAt: string): string | null {
  const birth = new Date(birthDate)
  const achieved = new Date(achievedAt)
  const ageWeeks = Math.floor((achieved.getTime() - birth.getTime()) / (7 * 86400000))
  const leap = DEVELOPMENT_LEAPS.find(l => ageWeeks >= l.weekStart && ageWeeks <= l.weekEnd)
  return leap ? `Durante o salto ${leap.id}: ${leap.name}` : null
}
```

---

## STEP 9 — Integrar na TrackerPage

**Objetivo:** Adicionar MilestoneHomeCard na home, abaixo do LeapCard.

### Editar: `app/src/pages/TrackerPage.tsx`

Adicionar imports:
```typescript
import MilestoneHomeCard from '../components/milestones/MilestoneHomeCard'
import { getNextMilestoneForHome } from '../lib/milestoneData'
import { useMilestones } from '../hooks/useMilestones'
```

Dentro do componente, após o LeapCard (linha ~155):
```tsx
{/* Milestone Home Card */}
{nextMilestone && baby && (
  <section className="px-5 mt-3">
    <MilestoneHomeCard
      milestone={nextMilestone}
      babyName={baby.name}
      babyGender={baby.gender}
      ageBand={band}
      onRegister={(m) => { /* navigate to register */ }}
      onDismiss={(m) => {
        // Save dismiss to localStorage with timestamp
        localStorage.setItem(`milestone_dismissed_${m.code}`, Date.now().toString())
        setToast(`Você pode acessar os marcos no perfil do(a) ${baby.name}`)
      }}
    />
  </section>
)}
```

Lógica de dismiss (dentro do componente):
```typescript
// Check dismissed milestones (14 day expiry)
const getDismissedCodes = (): Set<string> => {
  const dismissed = new Set<string>()
  const FOURTEEN_DAYS = 14 * 86400000
  MILESTONES.forEach(m => {
    const ts = localStorage.getItem(`milestone_dismissed_${m.code}`)
    if (ts && Date.now() - parseInt(ts) < FOURTEEN_DAYS) {
      dismissed.add(m.code)
    }
  })
  return dismissed
}

const { achievedCodes, ageDays } = useMilestones(baby?.id, baby?.birthDate)
const dismissedCodes = getDismissedCodes()
const nextMilestone = baby?.birthDate
  ? getNextMilestoneForHome(achievedCodes, ageDays, dismissedCodes)
  : null
```

---

## STEP 10 — Integrar no ProfilePage

**Objetivo:** Adicionar botão "Marcos do Desenvolvimento" no perfil.

### Editar: `app/src/pages/ProfilePage.tsx`

Adicionar entre a seção GrowthSection e Cuidadores (~linha 197):

```tsx
{/* ===== MARCOS DO DESENVOLVIMENTO ===== */}
<button
  onClick={() => { /* navigate to /marcos */ }}
  className="w-full bg-surface-container rounded-lg p-4 flex items-center gap-3 active:bg-surface-container-high transition-colors"
>
  <span className="text-xl">🎯</span>
  <div className="flex-1 text-left">
    <h3 className="text-on-surface font-headline text-sm font-bold">Marcos do Desenvolvimento</h3>
    <p className="text-on-surface-variant font-label text-xs">Registre e acompanhe as conquistas</p>
  </div>
  <span className="material-symbols-outlined text-on-surface-variant text-lg">chevron_right</span>
</button>
```

---

## STEP 11 — Rota no Router

**Objetivo:** Adicionar rota `/marcos` no router do app.

Localizar o router (provavelmente em `App.tsx` ou `main.tsx`) e adicionar:

```tsx
import MilestonesPage from './pages/MilestonesPage'

// Dentro das rotas
<Route path="/marcos" element={<MilestonesPage />} />
```

A navegação do ProfilePage e do MilestoneHomeCard deve usar `useNavigate()` do React Router para ir para `/marcos`.

---

## STEP 12 — Testar

1. **Migration:** verificar que `SELECT count(*) FROM milestones` retorna 37
2. **Card na home:** criar um bebê com 4 meses, verificar que o card aparece com marco relevante
3. **Dismiss:** tocar "Ainda não", verificar toast, verificar que card some, verificar que volta após 14 dias (simular com localStorage)
4. **Registro:** registrar um marco com foto, verificar que salva no banco e no storage
5. **Registro sem foto:** registrar sem foto, verificar que funciona
6. **Celebração:** verificar confetti, dados exibidos, botões
7. **Compartilhar:** gerar imagem, verificar visual
8. **Repositório:** abrir pelo perfil, verificar timeline, filtros, barra de progresso
9. **Paywall:** com usuário free, verificar que faixas futuras mostram banner
10. **Coexistência:** verificar que LeapCard e MilestoneHomeCard aparecem juntos sem poluir
11. **Conexão saltos:** registrar marco durante período de salto, verificar nota na timeline

---

## Ordem de execução recomendada

1. STEP 1 (migration) → verificar no banco
2. STEP 2 (milestoneData.ts)
3. STEP 3 (useMilestones hook)
4. STEP 4 (MilestoneHomeCard)
5. STEP 9 (integrar na TrackerPage) → testar card na home
6. STEP 10 (integrar no ProfilePage)
7. STEP 11 (rota)
8. STEP 5 (MilestoneRegister)
9. STEP 6 (MilestoneCelebration) → testar fluxo registro completo
10. STEP 7 (MilestoneShareImage)
11. STEP 8 (MilestonesPage repositório) → testar tudo
12. STEP 12 (testes)
