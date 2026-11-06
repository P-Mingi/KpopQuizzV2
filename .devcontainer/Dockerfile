# Codespace for the owner's SQL sessions (docs/launch/o1/CODESPACE.md): bash, git, python3 and the PostgreSQL 18 client.
# Production runs Postgres 17, and pg_dump must be at least the server's version. The PGDG apt repository is set up by
# postgresql-common, a Debian package whose script ships PGDG's signing key, so nothing is fetched outside apt.
FROM mcr.microsoft.com/devcontainers/base:bookworm@sha256:99f5250dd2d5f8b11046d5662dd94c1e3c1dae56b560c7caad5ceb7edf349046

RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-common python3 \
 && /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y \
 && apt-get install -y --no-install-recommends postgresql-client-18 \
 && rm -rf /var/lib/apt/lists/*
