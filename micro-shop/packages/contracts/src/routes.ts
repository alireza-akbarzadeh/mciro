// URL contract: the public, deep-linkable paths each app promises to keep working.
//
// URLs are an API. Other apps link to them, users bookmark them, search engines
// index them. Renaming `/orders/:id` is a breaking change, like renaming an export.
//
// Types only. An app checks a link by giving it this type:
//   const url: AppPath = `/shipping/order/${order.id}`;
//
// Ownership of each prefix (behind the gateway on :8080):
//   /, /products/*   storefront (Next.js, server-rendered, public, SEO)
//   /orders/*        orders     (via the shell, signed-in)
//   /shipping/*      shipping   (via the shell, signed-in)
//
// Links that cross between the storefront and the shell are different ZONES:
// use a plain <a href>, a full page load, not client-side navigation.

export type AppPath =
  | '/'
  | `/products/${string}`
  | '/orders'
  | `/orders/${string}`
  | '/shipping'
  | `/shipping/${string}`
  /** Shipping resolves the shipment for an order. Orders only knows the order id. */
  | `/shipping/order/${string}`;
