-- Case-insensitive unique emails: normalize + drop case-only duplicates, then index.
-- Keep the earliest row per lower(email); later case-variants are removed if they have no FK blockers.
-- Rows that can't be deleted (FK) are renamed so the unique index can still be created.

UPDATE users
SET email = lower(trim(email))
WHERE email IS NOT NULL
  AND email <> lower(trim(email))
  AND NOT EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id <> users.id
        AND lower(trim(u2.email)) = lower(trim(users.email))
  );

-- Prefer verified / older accounts when collapsing case duplicates
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY lower(trim(email))
            ORDER BY verify_email DESC, id ASC
        ) AS rn
    FROM users
),
dupes AS (
    SELECT id FROM ranked WHERE rn > 1
)
UPDATE users u
SET email = lower(trim(u.email)) || '.dup.' || u.id::text
FROM dupes d
WHERE u.id = d.id
  AND u.email NOT LIKE '%.dup.%';

UPDATE users
SET email = lower(trim(email))
WHERE email IS NOT NULL
  AND email <> lower(trim(email));

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON users (lower(email));
