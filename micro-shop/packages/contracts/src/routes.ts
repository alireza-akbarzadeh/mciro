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
//   /categories/*    storefront (one page per category)
//   /search          storefront (catalog search, ?q=<words>)
//   /orders/*        orders     (via the shell, signed-in)
//   /shipping/*      shipping   (via the shell, signed-in)
//   /cart/*          cart       (via the shell, guests welcome)
//   /checkout        cart       (via the shell, signed-in)
//
// Links that cross between the storefront and the shell are different ZONES:
// use a plain <a href>, a full page load, not client-side navigation.

export type AppPath =
  | '/'
  | `/products/${string}`
  | `/categories/${string}`
  | '/search'
  /** The query parameter is part of the contract: other apps may link to a search. */
  | `/search?q=${string}`
  | '/orders'
  | `/orders/${string}`
  | '/cart'
  /** Adds one of a product and shows the cart. A plain link, so it works from any zone. */
  | `/cart/add?product=${string}`
  | '/checkout'
  | '/shipping'
  | `/shipping/${string}`
  /** Shipping resolves the shipment for an order. Orders only knows the order id. */
  | `/shipping/order/${string}`;
