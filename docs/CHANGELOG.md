# Changelog

## Unreleased

### Phase 0 — Completed

- Recorded the proposed v1 REST API specification as the implementation contract.
- Documented the implementation plan, proposed architecture, and database design.
- Recorded the absence of application code and the approvals required before Phase 1.
- Added a Postman collection for contract exploration; its requests remain unimplemented until their respective phases are approved and completed.

No application endpoints, schema migrations, or automated tests have been added.

### Collection API implementation

- Added Express application, environment configuration, MySQL pooling, and a migration runner.
- Added migrations for users, sessions, catalog, carts, addresses, orders, and order items.
- Implemented the Postman collection's health, authentication, catalog, cart, address, quote, order, and admin catalog/dashboard endpoints.
- Added JWT access tokens, hashed refresh-session rotation, password hashing, request IDs, validation, RBAC checks, rate limiting, and transactional order placement.
