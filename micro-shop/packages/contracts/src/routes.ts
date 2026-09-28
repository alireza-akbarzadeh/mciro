// URL contract: the public, deep-linkable paths each app promises to keep working.
//
// URLs are an API. Other apps link to them, users bookmark them, search engines
// index them. Renaming `/orders/:id` is a breaking change, like renaming an export.
//
// Types only. An app checks a link by giving it this type:
//   const url: AppPath = `/shipping/order/${order.id}`;
//
// Ownership of each prefix:
//   /            shell
//   /orders/*    orders
//   /shipping/*  shipping

export type AppPath =
  | '/'
  | '/orders'
  | `/orders/${string}`
  | '/shipping'
  | `/shipping/${string}`
  /** Shipping resolves the shipment for an order. Orders only knows the order id. */
  | `/shipping/order/${string}`;
