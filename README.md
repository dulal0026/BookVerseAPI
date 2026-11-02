# BookVerse API Backend

Production-oriented REST API for BookVerse, an online bookstore. The approved API contract is documented in [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md).

## Status

The collection-facing API foundation is implemented. Payment gateway processing, reviews, wishlist, coupons, shipping configuration, and the wider admin surface remain planned because they are not included in the current Postman collection.

## Planned stack

- Node.js with Express
- MySQL (InnoDB, UTF8MB4)
- JWT access tokens and rotated refresh sessions
- BDT amounts represented as integer poisha

## Documentation

- [API specification](docs/API_SPECIFICATION.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database schema proposal](docs/DATABASE_SCHEMA.md)
- [Changelog](docs/CHANGELOG.md)
- [Postman contract collection](postman/BookVerse_API.postman_collection.json)

## Run locally

1. Copy `.env.example` to `.env` and set the MySQL password and long JWT secrets.
2. Run `npm install`, then `npm run migrate`.
3. Start the server with `npm run dev`.

The API listens on `http://localhost:3000`; collection routes use `/api/v1` and the health endpoint is `GET /health`.
