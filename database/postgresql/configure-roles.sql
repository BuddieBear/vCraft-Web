\set ON_ERROR_STOP on

SELECT current_database() = :'target_db'
    AND :'migration_role' <> :'app_role'
    AND EXISTS (
        SELECT FROM pg_roles
        WHERE rolname = :'migration_role' AND rolcanlogin
          AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)
    )
    AND EXISTS (
        SELECT FROM pg_roles
        WHERE rolname = :'app_role' AND rolcanlogin
          AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)
    )
    AS valid_target \gset
\if :valid_target
\else
DO $$ BEGIN
    RAISE EXCEPTION 'Wrong database or roles. Use the named vCraft database and two separate unprivileged login roles.';
END $$;
\endif

BEGIN;

ALTER DATABASE :"target_db" OWNER TO :"migration_role";
REVOKE ALL ON DATABASE :"target_db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"target_db" TO :"app_role";
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM :"app_role";
GRANT USAGE ON SCHEMA public TO :"app_role";

-- On an existing vCraft database, transfer application objects and Prisma history.
-- Extension objects retain their current owner.
SELECT format('ALTER %s %I.%I OWNER TO %I',
              CASE WHEN c.relkind = 'S' THEN 'SEQUENCE' ELSE 'TABLE' END,
              n.nspname, c.relname, :'migration_role')
FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'S')
  AND NOT EXISTS (
      SELECT FROM pg_depend AS d
      WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e'
  )
ORDER BY (c.relkind = 'S')
\gexec

SELECT format('ALTER TYPE %I.%I OWNER TO %I', n.nspname, t.typname, :'migration_role')
FROM pg_type AS t JOIN pg_namespace AS n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typtype = 'e'
  AND NOT EXISTS (
      SELECT FROM pg_depend AS d
      WHERE d.classid = 'pg_type'::regclass AND d.objid = t.oid AND d.deptype = 'e'
  )
\gexec

SELECT format('ALTER FUNCTION %I.%I(%s) OWNER TO %I',
              n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), :'migration_role')
FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
  AND NOT EXISTS (
      SELECT FROM pg_depend AS d
      WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
  )
\gexec

COMMIT;
