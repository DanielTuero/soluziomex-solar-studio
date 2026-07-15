CREATE TABLE cost_catalog (
  id uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX cost_catalog_name_idx ON cost_catalog(name);

INSERT INTO cost_catalog (name, description)
VALUES
  ('Engineering & design', 'Site assessment, system design, electrical drawings, structural review, and stamped engineering deliverables.'),
  ('Permits & interconnection', 'Permitting, utility interconnection applications, studies, inspections, and administrative fees.'),
  ('Freight & site handling', 'Inbound freight, unloading, secure storage, lifting equipment, and material movement at the project site.'),
  ('Installation labor', 'Mechanical, electrical, civil, supervision, safety, and commissioning labor required to deliver the installation.'),
  ('Monitoring', 'Remote system monitoring, reporting, alerts, communications, and ongoing performance oversight.'),
  ('Preventive maintenance', 'Scheduled inspections, testing, torque checks, cleaning coordination, and preventive asset care.'),
  ('Corrective maintenance', 'Troubleshooting, repairs, replacement labor, emergency response, and corrective site work.'),
  ('Insurance', 'Project-specific construction, liability, equipment, or operating insurance allowances.');
