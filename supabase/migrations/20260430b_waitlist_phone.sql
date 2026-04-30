-- Adiciona campo phone na waitlist para Android tester signups
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS phone text;
