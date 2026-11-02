# BookVerse Implementation Plan

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Audit and planning | Completed |
| 1 | Foundation | In Progress |
| 2 | Authentication and authorization | In Progress |
| 3 | Catalog | In Progress |
| 4 | Customer shopping | In Progress |
| 5 | Checkout and orders | In Progress |
| 6 | Payments | Planned |
| 7 | Admin API | In Progress |
| 8 | Admin frontend | Planned |
| 9 | Customer frontend integration | Planned |
| 10 | Testing and documentation | Planned |

## Phase 0 audit

The backend repository contains a README and the proposed API specification only. It has no application source, migrations, package manifest, tests, admin application, or existing backend behavior. The source frontend named in the brief (`BookVerse.git`) is not present in this checkout, so its local data models and simulated flows could not be verified.

The contract at `docs/API_SPECIFICATION.md` defines the target API as version `1.0.0 draft`; it explicitly states that no endpoints currently exist. It establishes JSON envelopes, `/api/v1`, BDT integer poisha, opaque IDs, UTC timestamps, paginated collections, JWT access tokens, rotated refresh sessions, RBAC, checkout idempotency, and server-authoritative pricing/inventory/payment state.

## Roadmap

1. **Foundation:** Express bootstrap, typed configuration validation, MySQL pool, migration runner, request IDs, JSON parser, CORS policy, structured logger, error envelope, rate limiting, and `GET /health`.
2. **Identity:** users, staff roles/permissions, password hashing, access JWTs, hashed refresh sessions with rotation/revocation, reset-token flow, authorization middleware, and auth abuse controls.
3. **Catalog:** categories, authors, books, media metadata, public catalog/search endpoints, and privileged catalog administration.
4. **Shopping:** profile, addresses, wishlist, cart, shipping methods, quotes, and coupon evaluation.
5. **Orders:** transactional quote validation, stock reservation, immutable order snapshots, status event ledger, tracking, cancellation policy, and order history.
6. **Payments:** COD support plus a provider abstraction; gateway methods only after provider selection and signed webhook verification are defined.
7. **Operations:** staff administration, inventory ledger, fulfillment, returns/refunds, coupon management, reports, CMS pages, settings, and audit trails.
8. **Client integration:** replace only confirmed frontend demo paths with API clients after each corresponding API phase is accepted.
9. **Validation:** contract, service, integration, authorization, concurrency, and security tests; publish a machine-readable OpenAPI schema when the draft is approved.

## Phase 1 checklist

- [ ] Approve the open contract decisions below and Phase 1 scope.
- [ ] Add `backend/package.json` and lockfile with Express, MySQL driver, validation, logging, security, and test dependencies.
- [ ] Add `.env.example` with non-secret variable names and validation at startup.
- [ ] Add MySQL connection pooling and migration infrastructure.
- [ ] Add base application, `/api/v1` router, `GET /health`, request IDs, and the specified response/error envelopes.
- [ ] Add security middleware, CORS allowlist configuration, request-body limits, and baseline rate limiting.
- [ ] Add structured logging with redaction and graceful shutdown.
- [ ] Add foundation tests and setup instructions.

## Decisions requiring approval before implementation

1. MVP payment scope: COD only, or which verified bKash/Nagad/card provider(s)?
2. Guest behavior: authenticated-only cart/checkout, or guest cart/checkout with account merge?
3. Tax/VAT, shipping zones/couriers, and cancellation/return/refund policy rules.
4. One book row per edition/format, or product records with variants; also whether e-books are in v1.
5. Single inventory location or multi-warehouse reservation rules.
6. The authoritative source and integration approach for the existing `BookVerse.git` frontend.
7. Production MFA requirements, staff permission matrix, and retention/privacy policy for audit, session, and customer data.
