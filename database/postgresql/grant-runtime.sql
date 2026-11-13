\set ON_ERROR_STOP on

SELECT current_database() = :'target_db'
    AND current_user <> :'app_role'
    AND to_regclass('public._prisma_migrations') IS NOT NULL AS valid_target \gset
\if :valid_target
\else
DO $$ BEGIN
    RAISE EXCEPTION 'Run this script as the migration owner on the named, migrated vCraft database.';
END $$;
\endif

BEGIN;

GRANT USAGE ON SCHEMA public TO :"app_role";
REVOKE ALL ON TABLE public._prisma_migrations FROM :"app_role", PUBLIC;

SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO %I',
              n.nspname, c.relname, :'app_role')
FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  AND c.relname <> '_prisma_migrations'
  AND NOT EXISTS (
      SELECT FROM pg_depend AS d
      WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e'
  )
\gexec

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO :"app_role";

COMMIT;
