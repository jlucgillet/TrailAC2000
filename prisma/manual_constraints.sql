-- Contraintes critiques non exprimables directement en Prisma.
-- À exécuter APRÈS `npx prisma migrate deploy` (ou `migrate dev`),
-- une seule fois, sur la base de données cible.
--
-- Ce fichier est le cœur de la fiabilité anti-double-scan du système :
-- même si deux requêtes de scan "start" arrivent au même instant pour
-- le même participant, PostgreSQL n'en acceptera qu'une seule.

-- 1) Un seul run "running" à la fois par participant.
CREATE UNIQUE INDEX IF NOT EXISTS one_running_run_per_participant
  ON runs (participant_id)
  WHERE status = 'running';

-- 2) Un seul run "registered" (pas encore démarré) à la fois par participant,
--    pour éviter la création de doublons avant même le premier départ.
CREATE UNIQUE INDEX IF NOT EXISTS one_registered_run_per_participant
  ON runs (participant_id)
  WHERE status = 'registered';

-- 3) Garde-fou : une fois "finished", le run est un fait acquis.
--    (Empêche toute UPDATE malencontreuse de finishTimestamp après coup.)
--    Implémenté ici via un trigger plutôt qu'une contrainte simple,
--    car PostgreSQL ne permet pas de CHECK basé sur l'ancienne valeur.
CREATE OR REPLACE FUNCTION forbid_finished_run_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'finished' AND NEW.finish_timestamp IS DISTINCT FROM OLD.finish_timestamp THEN
    RAISE EXCEPTION 'Un run terminé ne peut plus être modifié (finish_timestamp).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forbid_finished_run_mutation ON runs;
CREATE TRIGGER trg_forbid_finished_run_mutation
  BEFORE UPDATE ON runs
  FOR EACH ROW
  EXECUTE FUNCTION forbid_finished_run_mutation();
