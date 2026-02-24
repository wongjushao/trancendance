Unified Alembic migrations for all backend microservices.

Commands (run from repository root):

1) Install Alembic in your environment:
   pip install alembic SQLAlchemy psycopg[binary]

2) Export connection URL (or rely on SUPABASE_DB_URL in .env):
   export DATABASE_URL='postgresql://...'

3) Apply migrations:
   alembic -c backend/migrations/alembic.ini upgrade head

4) Roll back one revision:
   alembic -c backend/migrations/alembic.ini downgrade -1
