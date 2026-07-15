CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  username text NOT NULL COLLATE NOCASE UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL DEFAULT '',
  is_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_user_permissions (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('portfolio','projects','products','cost_catalog','partners','operations','security')),
  visible boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, section)
);

INSERT INTO app_users (id, username, display_name, password_hash, is_admin, is_active)
SELECT 'admin', 'admin', 'Admin', passcode_hash, true, true
FROM app_security
WHERE id = 1
ON CONFLICT (id) DO UPDATE SET
  password_hash = CASE WHEN app_users.password_hash = '' THEN excluded.password_hash ELSE app_users.password_hash END,
  is_admin = true,
  is_active = true;

INSERT INTO app_user_permissions (user_id, section, visible)
SELECT 'admin', section, true
FROM (
  SELECT 'portfolio' AS section UNION ALL SELECT 'projects' UNION ALL SELECT 'products'
  UNION ALL SELECT 'cost_catalog' UNION ALL SELECT 'partners' UNION ALL SELECT 'operations'
  UNION ALL SELECT 'security'
)
WHERE true
ON CONFLICT (user_id, section) DO UPDATE SET visible = true;

CREATE INDEX IF NOT EXISTS app_users_active_idx ON app_users(is_active, username);
