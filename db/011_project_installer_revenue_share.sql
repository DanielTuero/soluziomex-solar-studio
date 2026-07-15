ALTER TABLE project_partners
ADD COLUMN installer_share_pct numeric(7,3) NOT NULL DEFAULT 0
CHECK (installer_share_pct >= 0 AND installer_share_pct <= 100);

ALTER TABLE project_partners
ADD COLUMN installer_share_terms text NOT NULL DEFAULT '';

UPDATE project_partners
SET installer_share_pct = COALESCE((SELECT installer_share_pct FROM partners WHERE partners.id = project_partners.partner_id), 0),
    installer_share_terms = COALESCE((SELECT installer_share_terms FROM partners WHERE partners.id = project_partners.partner_id), '')
WHERE relationship = 'Installer';
