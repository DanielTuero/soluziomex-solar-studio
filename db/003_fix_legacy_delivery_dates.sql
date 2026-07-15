UPDATE project_items
SET expected_delivery = NULL
WHERE expected_delivery IS NOT NULL
  AND (typeof(expected_delivery) IN ('integer', 'real') OR expected_delivery NOT GLOB '????-??-??*');
