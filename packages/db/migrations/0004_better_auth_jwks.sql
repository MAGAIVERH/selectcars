-- Better Auth `jwt` plugin: key material for signing access tokens.
--
-- The private key never leaves this table (only the marketplace, the identity issuer,
-- reads it). The public half is served at /api/auth/jwks so the API can verify tokens
-- offline. See docs/adr/002-service-auth-jwt-jwks.md.
--
-- Only the `jwks` table is new here: the rest of the Better Auth schema landed in 0003.

create table if not exists "jwks" (
  "id" text not null primary key,
  "publicKey" text not null,
  "privateKey" text not null,
  "createdAt" timestamptz not null,
  "expiresAt" timestamptz
);
