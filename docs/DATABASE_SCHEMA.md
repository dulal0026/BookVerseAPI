# Database Schema Proposal

## Status

Proposed in Phase 0. Migrations have not been created.

## Conventions

- MySQL 8+, InnoDB, `utf8mb4`, UTC timestamps, opaque UUID/ULID primary keys.
- Monetary columns use signed/unsigned integer poisha plus an ISO currency code where relevant; never use floating-point amounts.
- Use `created_at`, `updated_at`, and `deleted_at` where soft deletion/retention is required.
- Add foreign keys, supporting indexes, and unique constraints in migrations. Snapshot order data so catalog edits cannot alter historic orders.

## Domain tables

| Area | Tables | Key constraints / indexes |
| --- | --- | --- |
| Identity | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `refresh_sessions`, `password_reset_tokens` | unique normalized email; hashed token values; sessions indexed by user and expiry |
| Catalog | `categories`, `authors`, `publishers`, `books`, `book_authors`, `book_images`, `media_assets` | unique live slug; ISBN uniqueness policy pending; category parent FK; book filter indexes |
| Inventory | `inventory`, `stock_movements` | one inventory row per book/location policy; immutable movement ledger indexed by book/time |
| Shopping | `wishlists`, `carts`, `cart_items`, `addresses`, `shipping_methods`, `shipping_zones` | unique wishlist(user, book); unique cart item(cart, book); address ownership indexes |
| Promotions | `coupons`, `coupon_redemptions`, `checkout_quotes` | unique normalized coupon code; redemption uniqueness per policy; quote expiry index |
| Orders | `orders`, `order_items`, `order_status_events`, `shipments`, `idempotency_keys` | unique order number; user/date and status/date indexes; immutable price/address/item JSON snapshots as needed |
| Payments | `payments`, `payment_events`, `refunds` | provider transaction reference unique; provider event ID unique; order/payment status indexes |
| Community/CMS | `reviews`, `pages`, `audit_logs` | one review per user/book policy pending; moderation/status indexes; audit actor/time index |

## Critical transactional flows

`POST /orders` locks relevant inventory and coupon rows, recalculates quote totals, persists the idempotency record and order snapshots, reserves stock, records stock movements and coupon redemption, then commits atomically. Failed payment/cancellation/return flows release or adjust stock only through the stock ledger.

Payment webhooks deduplicate provider event IDs and transition payment/order states only after signature verification. Refunds lock the payment/refund totals to prevent over-refunding.
