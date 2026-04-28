START TRANSACTION;
UPDATE ragDocuments SET cnaeGroups = '64,65,66' WHERE id IN (148, 178, 179, 213, 214, 944);
UPDATE ragDocuments SET cnaeGroups = '86,87,88,45,46,47' WHERE id = 39;
SELECT id, cnaeGroups FROM ragDocuments WHERE id IN (39, 148, 178, 179, 213, 214, 944);
-- se valores correspondem ao snapshot pre-mutacao: COMMIT; senao: ROLLBACK;
