-- Stickers dans le chat (avatar de l'expéditeur + légende) : nouveau type de message.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind_check;
ALTER TABLE messages ADD CONSTRAINT messages_kind_check CHECK (kind IN ('text', 'loc', 'meet', 'sticker'));
