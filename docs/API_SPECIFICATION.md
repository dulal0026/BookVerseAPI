# BookVerse REST API Specification

**Status:** Proposed contract — not implemented  
**Version:** 1.0.0 draft  
**Base path:** `/api/v1`  
**Consumers:** Customer website, future customer mobile app, admin dashboard  
**Suggested implementation:** Node.js + Express + MySQL

## 1. Scope and existing frontend mapping

The current BookVerse React frontend uses local catalog arrays and in-memory state for customer accounts, carts, wishlists, coupons, checkout, and order tracking. This document defines proposed endpoints to replace that demo behavior. **No endpoints in this document are confirmed to exist.**

Customer features: register/login, book discovery, categories, search/filter/sort, wishlist, cart, addresses, checkout, orders, tracking, account. Admin features: dashboard, catalog, inventory, orders, customers, discounts, delivery, reviews, content, staff, audit logs.

## 2. General conventions

- JSON requests and responses, UTF-8, HTTPS in production.
- Currency is `BDT`. All monetary values are **integer poisha** (e.g., `69900` = ৳699.00); frontend formats values for display.
- Identifiers are opaque strings (UUID/ULID recommended), never assumed sequential.
- Timestamps are ISO 8601 UTC strings; dates are `YYYY-MM-DD`.
- API uses `Authorization: Bearer <access_token>` for protected endpoints.
- Customer and admin use separate role-based permissions; server enforces authorization.
- Pagination: `page` (default 1), `limit` (default 20, max 100); response includes `pagination`.
- Sort keys must be whitelisted. Unknown query parameters should be rejected or documented explicitly.
- Idempotency: require `Idempotency-Key` on order placement, payment initiation, refunds and other retry-sensitive mutations.
- Soft deletion for catalog and customer records where retention is needed.
- Never trust client-provided totals, discounts, inventory, or payment status.

### Success envelope

```json
{
  "data": {"id": "book_01", "title": "Atomic Habits"},
  "meta": {"request_id": "req_123"}
}
```

### Collection envelope

```json
{
  "data": [],
  "pagination": {"page": 1, "limit": 20, "total": 0, "total_pages": 0},
  "meta": {"request_id": "req_123"}
}
```

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{"field": "email", "message": "Invalid email address"}]
  },
  "meta": {"request_id": "req_123"}
}
```

HTTP status guidance: `200` read/update, `201` create, `204` delete/no body, `400` invalid request, `401` unauthenticated, `403` forbidden, `404` missing, `409` conflict, `422` business validation, `429` rate limit, `500` unexpected error. Rate-limit authentication and checkout endpoints.

## 3. Authentication and authorization

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create customer account |
| POST | `/auth/login` | Public | Customer login |
| POST | `/auth/refresh` | Refresh token | Rotate session tokens |
| POST | `/auth/logout` | Authenticated | Revoke current refresh session |
| POST | `/auth/forgot-password` | Public | Request reset link/code |
| POST | `/auth/reset-password` | Reset token | Set new password |
| GET | `/auth/me` | Customer/Admin | Current user profile |
| PATCH | `/auth/me` | Customer/Admin | Update own basic profile |
| POST | `/auth/change-password` | Authenticated | Change password |
| POST | `/admin/auth/login` | Staff | Admin login, MFA required in production |
| POST | `/admin/auth/refresh` | Staff refresh token | Rotate admin session |
| POST | `/admin/auth/logout` | Staff | Revoke admin session |

`POST /auth/register` body:

```json
{"full_name":"Ayesha Rahman","email":"ayesha@example.com","password":"strong-password","phone":"+8801712345678"}
```

`POST /auth/login` body: `{"email":"ayesha@example.com","password":"strong-password"}`.

Login response example:

```json
{
  "data": {
    "user": {"id":"usr_01","full_name":"Ayesha Rahman","email":"ayesha@example.com","role":"customer"},
    "access_token":"<jwt>",
    "expires_in":900,
    "refresh_token":"<opaque-refresh-token>"
  }
}
```

For browser clients, prefer Secure, HttpOnly, SameSite refresh cookies with CSRF protection; do not store refresh tokens in localStorage. Passwords must be hashed with Argon2id or bcrypt. OAuth Google/Apple login is **future scope**, not real functionality in the current frontend; implement verified provider token exchange before enabling it. Password reset must not reveal whether an account exists.

### Roles

- `customer`: own profile, own cart, wishlist, addresses, orders, reviews.
- `admin`: catalog, inventory, order processing, customer support, promotions, reporting according to assigned permissions.
- `super_admin`: staff management, roles, sensitive settings and audit access.
- Use granular permissions such as `books.write`, `orders.update`, `refunds.approve`, `staff.manage` rather than relying on role name alone.

## 4. Customer-facing API

### 4.1 Categories and catalog

| Method | Endpoint | Access | Details |
|---|---|---|---|
| GET | `/categories` | Public | Active categories, optionally hierarchical |
| GET | `/categories/{slug}` | Public | Category details |
| GET | `/books` | Public | Search/filter/sort/paginate catalog |
| GET | `/books/{slug}` | Public | Book detail |
| GET | `/books/{slug}/related` | Public | Related books |
| GET | `/books/featured` | Public | Homepage featured selection |
| GET | `/books/bestsellers` | Public | Bestseller list |
| GET | `/books/new-arrivals` | Public | New arrivals |
| GET | `/search/suggestions?q=atomic` | Public | Search suggestions |

`GET /books` query parameters: `q`, `category_id`, `author`, `min_price`, `max_price`, `min_rating`, `tag`, `in_stock`, `sort`, `page`, `limit`. Allowed `sort`: `featured`, `price_asc`, `price_desc`, `rating_desc`, `newest`. `min_price` and `max_price` are integer poisha. `min_rating` is decimal from 0 to 5.

`GET /categories` supports `parent_id` (optional); when absent returns top-level categories with optional `children` arrays. Deterministic ordering: `sort_order ASC, name ASC, id ASC`. Admin defines category hierarchy and display order.

Book detail shape:

```json
{
  "data": {
    "id":"book_01",
    "slug":"atomic-habits",
    "title":"Atomic Habits",
    "isbn13":"9780735211292",
    "description":"Book description",
    "authors":[{"id":"author_01","name":"James Clear"}],
    "category":{"id":"cat_self_help","name":"Self-Help","slug":"self-help"},
    "publisher":"Example Publisher",
    "language":"en",
    "format":"paperback",
    "page_count":320,
    "images":[{"url":"https://cdn.example.com/books/atomic.jpg","alt":"Atomic Habits cover"}],
    "price":69900,
    "compare_at_price":89900,
    "currency":"BDT",
    "rating_average":4.8,
    "rating_count":12340,
    "available_quantity":12,
    "in_stock":true,
    "tags":["bestseller"],
    "published_at":"2026-01-01T00:00:00Z"
  }
}
```

All prices, reviews, stock counts, ISBNs and descriptions above are **illustrative**, not verified inventory records.

### 4.2 Wishlist and cart

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/me/wishlist` | Customer | List saved books |
| PUT | `/me/wishlist/{book_id}` | Customer | Add (idempotent) |
| DELETE | `/me/wishlist/{book_id}` | Customer | Remove |
| GET | `/cart` | Customer | Cart with authoritative totals |
| POST | `/cart/items` | Customer | Add book and quantity |
| PATCH | `/cart/items/{item_id}` | Customer | Set quantity |
| DELETE | `/cart/items/{item_id}` | Customer | Remove item |
| DELETE | `/cart/items` | Customer | Clear cart |

`POST /cart/items`: `{"book_id":"book_01","quantity":1}`. `PATCH /cart/items/{item_id}`: `{"quantity":2}`. Quantity must be positive and stock-limited. Cart response includes `items`, `subtotal`, `discount`, `shipping_fee`, `total`, `currency`, and `price_changed` warnings. Revalidate inventory and prices at checkout. Guest cart is optional future scope; use client-only cart until sign-in if not implemented.

### 4.3 Addresses, shipping, checkout, orders

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/me/addresses` | Customer | List saved addresses |
| POST | `/me/addresses` | Customer | Add address |
| PATCH | `/me/addresses/{address_id}` | Customer | Edit own address |
| DELETE | `/me/addresses/{address_id}` | Customer | Delete own address |
| GET | `/shipping/methods?district=Dhaka` | Public | Available methods/rates |
| POST | `/checkout/quote` | Customer | Server-computed cart totals |
| POST | `/orders` | Customer | Place order, idempotent |
| GET | `/me/orders` | Customer | Paginated order history |
| GET | `/me/orders/{order_id}` | Customer | Own order detail |
| GET | `/me/orders/{order_id}/tracking` | Customer | Tracking events |
| POST | `/me/orders/{order_id}/cancel` | Customer | Request cancellation if allowed |

Address request:

```json
{
  "recipient_name":"Ayesha Rahman",
  "phone":"+8801712345678",
  "line1":"House 42, Road 9/A",
  "line2":"Dhanmondi",
  "district":"Dhaka",
  "postal_code":"1209",
  "country_code":"BD",
  "is_default":true
}
```

Checkout quote request:

```json
{"address_id":"addr_01","shipping_method_id":"standard","coupon_code":"BOOKVERSE10"}
```

Checkout quote response:

```json
{
  "data": {
    "quote_id":"quote_01",
    "expires_at":"2026-11-02T12:15:00Z",
    "items_subtotal":134800,
    "discount":13480,
    "shipping_fee":0,
    "tax":0,
    "grand_total":121320,
    "currency":"BDT",
    "available_payment_methods":["cod"]
  }
}
```

`POST /orders` requires `Idempotency-Key` header and body:

```json
{
  "quote_id":"quote_01",
  "address_id":"addr_01",
  "shipping_method_id":"standard",
  "payment_method":"cod",
  "customer_note":"Call before delivery"
}
```

Response `201`: order object with `id`, `order_number`, `status` (`pending`), `payment_status` (`unpaid`), `items` snapshots, `totals`, `shipping_address` snapshot, and `tracking_events`. A successful API response is not proof of paid status. Server validates quote freshness, stock, prices, coupon eligibility, delivery availability, and allocates stock atomically. Do not use a random frontend order ID as the authoritative identifier.

Order statuses: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned`. Payment statuses: `unpaid`, `pending`, `paid`, `failed`, `partially_refunded`, `refunded`. Define and enforce allowed transitions in backend.

### 4.4 Coupons, payments, reviews, profile

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/coupons/validate` | Customer | Validate code against cart/quote |
| POST | `/payments/intents` | Customer | Future gateway payment intent |
| GET | `/payments/{payment_id}` | Customer | Own payment status |
| GET | `/books/{book_id}/reviews` | Public | Approved reviews |
| POST | `/books/{book_id}/reviews` | Customer | Submit review; purchase policy applies |
| PATCH | `/me/reviews/{review_id}` | Customer | Edit own review |
| DELETE | `/me/reviews/{review_id}` | Customer | Remove own review |
| GET | `/me` | Customer | Profile |
| PATCH | `/me` | Customer | Update profile |
| GET | `/pages/{slug}` | Public | Terms, privacy, help, etc. |
| POST | `/contact` | Public | Customer support inquiry |

`POST /coupons/validate`: `{"code":"BOOKVERSE10","quote_id":"quote_01"}`. The server calculates discounts and returns eligibility/reasons. For real online payments, use a certified payment provider and server-side webhook verification; never collect raw card numbers or CVC in your backend, logs, or custom React forms. The existing demo payment UI must not mark an order paid without provider confirmation.

## 5. Admin dashboard API

All `/admin/*` routes require authenticated staff and explicit permissions. Admin endpoints must be inaccessible to customers even if they guess IDs. Every mutation should produce an audit event.

### 5.1 Dashboard and analytics

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/admin/dashboard/summary` | `dashboard.read` | Sales, orders, customers, low stock |
| GET | `/admin/reports/sales` | `reports.read` | Sales by date/status |
| GET | `/admin/reports/books` | `reports.read` | Bestselling and slow-moving titles |
| GET | `/admin/reports/inventory` | `reports.read` | Stock movement/low stock |
| GET | `/admin/reports/customers` | `reports.read` | Customer trends |

Common filters: `from`, `to`, `group_by=day|week|month`, `page`, `limit`. Define timezone explicitly for date grouping (recommended `Asia/Dhaka`). Exclude cancelled/unpaid orders from recognized sales unless accounting rules explicitly say otherwise.

### 5.2 Catalog management

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/admin/books` | `books.read` | Search all books, including drafts |
| POST | `/admin/books` | `books.write` | Create book |
| GET | `/admin/books/{id}` | `books.read` | Book detail |
| PATCH | `/admin/books/{id}` | `books.write` | Update book |
| DELETE | `/admin/books/{id}` | `books.delete` | Archive book |
| GET | `/admin/categories` | `categories.read` | All categories |
| POST | `/admin/categories` | `categories.write` | Create category |
| PATCH | `/admin/categories/{id}` | `categories.write` | Edit category |
| DELETE | `/admin/categories/{id}` | `categories.delete` | Archive category |
| GET | `/admin/authors` | `books.read` | Authors |
| POST | `/admin/authors` | `books.write` | Create author |
| PATCH | `/admin/authors/{id}` | `books.write` | Edit author |
| POST | `/admin/media/uploads` | `media.write` | Signed upload or multipart asset upload |

Create book body:

```json
{
  "title":"Atomic Habits",
  "slug":"atomic-habits",
  "isbn13":"9780735211292",
  "description":"Description",
  "author_ids":["author_01"],
  "category_id":"cat_self_help",
  "publisher":"Example Publisher",
  "language":"en",
  "format":"paperback",
  "page_count":320,
  "price":69900,
  "compare_at_price":89900,
  "status":"draft",
  "tags":["bestseller"],
  "image_ids":["media_01"]
}
```

`status`: `draft`, `active`, `archived`. A book is purchasable only when active and in stock. Enforce unique slug and ISBN constraints as applicable.

### 5.3 Inventory

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/admin/inventory` | `inventory.read` | Stock overview |
| GET | `/admin/inventory/{book_id}/movements` | `inventory.read` | Ledger history |
| POST | `/admin/inventory/{book_id}/adjustments` | `inventory.adjust` | Increase/decrease stock with reason |
| GET | `/admin/inventory/low-stock` | `inventory.read` | Reorder alerts |

Adjustment body: `{"delta":10,"reason":"supplier_delivery","reference":"PO-1001"}`. Maintain immutable stock movement records; do not directly overwrite quantity without a ledger entry. Reserve/release inventory transactionally around orders.

### 5.4 Orders, fulfillment, returns, refunds

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/admin/orders` | `orders.read` | Filter all orders |
| GET | `/admin/orders/{id}` | `orders.read` | Full order detail |
| PATCH | `/admin/orders/{id}/status` | `orders.update` | Valid state transition |
| POST | `/admin/orders/{id}/shipments` | `orders.fulfill` | Carrier/tracking record |
| POST | `/admin/orders/{id}/cancel` | `orders.cancel` | Cancel with reason |
| GET | `/admin/returns` | `returns.read` | Return requests |
| PATCH | `/admin/returns/{id}` | `returns.manage` | Approve/reject/process return |
| POST | `/admin/orders/{id}/refunds` | `refunds.approve` | Request/execute refund via provider |

Status update body: `{"status":"processing","note":"Packing started"}`. Shipment body: `{"carrier":"Courier Name","tracking_number":"TRACK123","shipped_at":"2026-11-02T10:00:00Z"}`. Refund request must enforce refundable amount and avoid double refunds. Do not accept client-submitted `payment_status=paid` as proof of settlement.

### 5.5 Customers, promotions, content, staff

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/admin/customers` | `customers.read` | Search customers |
| GET | `/admin/customers/{id}` | `customers.read` | Customer profile/order summary |
| PATCH | `/admin/customers/{id}/status` | `customers.manage` | Suspend/reactivate |
| GET | `/admin/coupons` | `coupons.read` | List coupons |
| POST | `/admin/coupons` | `coupons.write` | Create coupon |
| PATCH | `/admin/coupons/{id}` | `coupons.write` | Edit/disable coupon |
| DELETE | `/admin/coupons/{id}` | `coupons.delete` | Archive coupon |
| GET | `/admin/reviews` | `reviews.moderate` | Pending/approved reviews |
| PATCH | `/admin/reviews/{id}/moderation` | `reviews.moderate` | Approve/reject review |
| GET | `/admin/pages` | `content.read` | Site pages |
| PUT | `/admin/pages/{slug}` | `content.write` | Update content |
| GET | `/admin/shipping/methods` | `shipping.read` | Shipping configurations |
| PATCH | `/admin/shipping/methods/{id}` | `shipping.write` | Edit rates/regions |
| GET | `/admin/staff` | `staff.manage` | List staff |
| POST | `/admin/staff` | `staff.manage` | Invite staff |
| PATCH | `/admin/staff/{id}/permissions` | `staff.manage` | Set permissions |
| GET | `/admin/audit-logs` | `audit.read` | Paginated immutable audit trail |
| GET | `/admin/settings` | `settings.read` | Non-secret settings |
| PATCH | `/admin/settings` | `settings.write` | Update permitted settings |

Coupon creation example:

```json
{
  "code":"BOOKVERSE10",
  "discount_type":"percentage",
  "discount_value":10,
  "min_order_amount":100000,
  "max_discount_amount":50000,
  "usage_limit":1000,
  "per_customer_limit":1,
  "starts_at":"2026-11-01T00:00:00Z",
  "expires_at":"2026-12-01T00:00:00Z",
  "is_active":true
}
```

For fixed-amount coupons, `discount_value` is integer poisha; for percentage coupons, it is a percentage from 0 to 100. Validate discount type before interpreting the value.

## 6. Suggested MySQL domain model

| Table | Key fields / relationships |
|---|---|
| `users` | id, name, email unique, phone, password_hash, status |
| `roles`, `permissions`, `user_roles`, `role_permissions` | staff RBAC |
| `refresh_sessions` | user_id, token_hash, expires_at, revoked_at |
| `categories` | id, parent_id nullable, slug unique, name, sort_order, status |
| `authors`, `book_authors` | author records and many-to-many |
| `books` | id, slug unique, isbn13, category_id, price, compare_at_price, status |
| `book_images` | book_id, media_id, sort_order |
| `inventory`, `stock_movements` | book_id, available, reserved, adjustment ledger |
| `wishlists` | user_id, book_id unique pair |
| `carts`, `cart_items` | user_id, book_id, quantity |
| `addresses` | user_id, recipient, phone, district, address lines |
| `coupons`, `coupon_redemptions` | code, rules, usage |
| `shipping_methods`, `shipping_zones` | pricing and availability |
| `orders`, `order_items` | customer, immutable item/price/address snapshots |
| `order_status_events`, `shipments` | history and tracking |
| `payments`, `payment_events`, `refunds` | gateway references and state transitions |
| `reviews` | user_id, book_id, rating, moderation status |
| `pages`, `media_assets`, `audit_logs` | CMS, uploads, admin trail |

Use InnoDB, explicit foreign keys, transaction boundaries for checkout/stock, indexes for book filters and order searches, and UTF8MB4. Store currency alongside amounts where relevant. Never store plaintext passwords, raw card PAN, or CVC.

## 7. Integration sequence

1. Create backend repo and migration baseline; add environment configuration and health endpoint.
2. Implement shared response/error handling, validation, request IDs, logging, rate limits, and auth/RBAC.
3. Implement categories, books, authors, media, and admin catalog; replace `allBooksCatalog` in `src/App.jsx` with API fetches.
4. Implement customer accounts and session handling; replace demo login/signup/social handlers.
5. Implement cart, wishlist, addresses and shipping quotes.
6. Implement coupons, checkout quote, order creation, and customer order history.
7. Implement admin inventory, fulfillment, customer support, promotions and dashboard reports.
8. Integrate verified payment provider and webhooks only after the order lifecycle is reliable.
9. Add contract tests, permission tests, transactional inventory tests, integration tests, and OpenAPI 3.1 machine-readable schema.

## 8. Open decisions before implementation

- Guest checkout and guest cart: supported or authenticated-only?
- Digital books/e-books: excluded in v1 unless explicitly required?
- ISBN/edition/format: one record per edition or variants under a parent book?
- Inventory: single warehouse or multiple locations?
- Shipping: nationwide zones and courier partner rules?
- Payments: COD-only for MVP, or verified bKash/Nagad/card provider integration?
- Taxes/VAT: rate and calculation rules, if applicable?
- Returns, cancellation, refunds: policy windows and eligible states?
- Admin staff roles and MFA requirements?
- Customer mobile app: shared auth contract and token storage rules?

**Contract rule:** Do not implement an endpoint with ambiguous response shape, authorization, validation, ordering, or transactional behavior. Update this specification first, then implement and test.
