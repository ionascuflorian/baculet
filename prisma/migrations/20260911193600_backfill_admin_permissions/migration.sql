-- Backfill: adminii existenți primesc setul complet de permisiuni.
UPDATE "User"
SET "permissions" = ARRAY[
  'MANAGE_CONTENT', 'MANAGE_QUIZZES', 'MANAGE_EXAMS',
  'MANAGE_SITE_SETTINGS', 'MANAGE_SITE_AI', 'MANAGE_AI_CONTENT', 'MANAGE_USERS'
]::"AdminPermission"[]
WHERE "role" = 'ADMIN';

-- Cel mai vechi admin devine owner (contul fondatorului, cu toate drepturile).
UPDATE "User"
SET "isOwner" = true
WHERE "id" = (
  SELECT "id" FROM "User"
  WHERE "role" = 'ADMIN'
  ORDER BY "createdAt" ASC, "id" ASC
  LIMIT 1
);