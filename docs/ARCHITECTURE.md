# Architecture

## Status

Proposed during Phase 0. No application code has been implemented.

## Component layout

```text
Customer Web / Admin Dashboard
            |
      HTTPS JSON /api/v1
            |
 Express application
  routes -> controllers -> services -> repositories
            |                 |
       middleware          transactions
            |                 |
  auth, RBAC, validation   MySQL (InnoDB)
            |
 logging, rate limits, request IDs
```

Use a modular backend layout under `backend/src`: `config`, `database`, `middleware`, `modules`, and `utils`. Each domain module owns its routes, controller, service, repository, validation, and tests. Controllers translate HTTP to domain calls; services own business rules and transactions; repositories are the only layer issuing SQL.

## Cross-cutting behavior

- Serve only `/api/v1` routes plus an unauthenticated health check.
- Return the success, collection, and error envelopes in the API specification; attach a generated request ID to every response and log entry.
- Validate inputs before domain handling and whitelist sorting/filter fields.
- Authenticate bearer access tokens; persist only hashed refresh tokens and rotate them on refresh. Use Secure, HttpOnly, SameSite refresh cookies for browser clients with CSRF protection.
- Enforce ownership at the service boundary and explicit staff permissions for all `/admin/*` routes.
- Use transactions and row locks for stock reservation/release, order creation, payment transition, refunds, and coupon redemption.
- Store idempotency keys and response fingerprints for retry-sensitive mutations.
- Keep secrets in environment configuration, redact credentials/tokens/PII from logs, and use rate limits for auth and checkout paths.

## Integration boundaries

Media uploads should return signed URLs or opaque media identifiers; the API stores metadata, not untrusted client URLs. Payment providers must be invoked behind a provider interface, with payment state updated only after authenticated provider/webhook verification. The database remains the authoritative source for money, stock, discounts, and order state.
