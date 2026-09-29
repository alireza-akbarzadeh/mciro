// The catalog's SEED DATA: what `pnpm db:seed` writes to the database, and what
// the storefront shows when there's no database (DATABASE_URL unset), so a fresh
// checkout still has a shop. The live catalog is in Postgres (db/schema.ts).
//
// A leaf module (no imports): the seed script runs it directly in Node.

export type Category = {
  slug: string;
  name: string;
  description: string;
};

export type Product = {
  slug: string;
  name: string;
  /** Display name of the category. */
  category: string;
  categorySlug: string;
  /** USD. Stored as cents in the database. */
  price: number;
  summary: string;
  description: string;
};

export const seedCategories: readonly Category[] = [
  { slug: 'peripherals', name: 'Peripherals', description: 'What your hands touch all day.' },
  { slug: 'audio', name: 'Audio', description: 'Hear and be heard clearly.' },
  { slug: 'displays', name: 'Displays', description: 'More pixels, less squinting.' },
  { slug: 'desk', name: 'Desk', description: 'The surface everything else stands on.' },
  { slug: 'lighting', name: 'Lighting', description: 'Light the work, not the screen.' },
  { slug: 'accessories', name: 'Accessories', description: 'Small things that fix big annoyances.' },
];

type SeedProduct = Omit<Product, 'category'>;

export const seedProducts: readonly SeedProduct[] = [
  {
    slug: 'mechanical-keyboard',
    name: 'Mechanical keyboard',
    categorySlug: 'peripherals',
    price: 129,
    summary: 'Hot-swappable switches, aluminium case, USB-C.',
    description:
      'A 75% mechanical keyboard with hot-swappable tactile switches, a gasket-mounted aluminium case and a detachable USB-C cable. Built for long writing and coding sessions.',
  },
  {
    slug: 'wireless-mouse',
    name: 'Ergonomic mouse',
    categorySlug: 'peripherals',
    price: 59,
    summary: 'Vertical grip, silent clicks, 70-day battery.',
    description:
      'A vertical wireless mouse that keeps your wrist in a handshake position, with silent switches, three connection slots and a rechargeable 70-day battery.',
  },
  {
    slug: 'precision-trackpad',
    name: 'Precision trackpad',
    categorySlug: 'peripherals',
    price: 99,
    summary: 'Large glass surface, multi-finger gestures.',
    description:
      'A large glass trackpad with pressure-sensitive clicks and multi-finger gestures. Pairs over Bluetooth and charges over USB-C.',
  },
  {
    slug: '4k-webcam',
    name: '4K webcam',
    categorySlug: 'peripherals',
    price: 149,
    summary: 'Auto-framing, dual microphones, privacy shutter.',
    description:
      'A 4K webcam with auto-framing, HDR in back-lit rooms, dual noise-reducing microphones and a physical privacy shutter.',
  },
  {
    slug: 'noise-cancelling-headphones',
    name: 'Noise-cancelling headphones',
    categorySlug: 'audio',
    price: 249,
    summary: 'Adaptive noise cancelling, 40-hour battery.',
    description:
      'Over-ear headphones with adaptive noise cancelling, multipoint Bluetooth and a 40-hour battery. Folds flat into the included case.',
  },
  {
    slug: 'usb-microphone',
    name: 'USB microphone',
    categorySlug: 'audio',
    price: 119,
    summary: 'Cardioid condenser, zero-latency monitoring.',
    description:
      'A cardioid condenser microphone for calls and recording, with a gain dial, a mute button and a headphone output for zero-latency monitoring.',
  },
  {
    slug: 'studio-speakers',
    name: 'Studio speakers',
    categorySlug: 'audio',
    price: 179,
    summary: 'Pair of 4" active monitors, flat response.',
    description:
      'A pair of 4-inch active studio monitors with a flat frequency response, front volume control and Bluetooth, sized for small rooms.',
  },
  {
    slug: '27-inch-monitor',
    name: '27" monitor',
    categorySlug: 'displays',
    price: 319,
    summary: '1440p IPS panel, 144 Hz, USB-C with 90 W charging.',
    description:
      'A 27-inch 2560×1440 IPS display at 144 Hz with factory colour calibration and a single-cable USB-C connection that charges your laptop at 90 W.',
  },
  {
    slug: 'portable-monitor',
    name: 'Portable monitor',
    categorySlug: 'displays',
    price: 199,
    summary: '15.6" 1080p, one USB-C cable, 780 g.',
    description:
      'A 15.6-inch 1080p display that runs from a single USB-C cable, weighs 780 g and folds into its own stand. A second screen for trains and hotel rooms.',
  },
  {
    slug: 'standing-desk',
    name: 'Standing desk',
    categorySlug: 'desk',
    price: 540,
    summary: 'Dual-motor, 160 × 80 cm, four memory presets.',
    description:
      'A dual-motor electric standing desk with a 160 × 80 cm top, four height presets and anti-collision detection.',
  },
  {
    slug: 'monitor-arm',
    name: 'Monitor arm',
    categorySlug: 'desk',
    price: 89,
    summary: 'Gas-spring arm for screens up to 32".',
    description:
      'A gas-spring monitor arm with cable management, VESA 75/100 mounting and a desk clamp. Holds displays up to 32 inches and 9 kg.',
  },
  {
    slug: 'ergonomic-chair',
    name: 'Ergonomic chair',
    categorySlug: 'desk',
    price: 399,
    summary: 'Mesh back, adjustable lumbar and 4D armrests.',
    description:
      'A breathable mesh office chair with adjustable lumbar support, 4D armrests, seat-depth adjustment and a synchronised tilt.',
  },
  {
    slug: 'cable-tray',
    name: 'Cable tray',
    categorySlug: 'desk',
    price: 35,
    summary: 'Under-mount steel tray, no drilling needed.',
    description:
      'A steel under-mount tray that hides power strips and cables, clamping on without drilling.',
  },
  {
    slug: 'led-desk-lamp',
    name: 'LED lamp',
    categorySlug: 'lighting',
    price: 79,
    summary: 'Adjustable colour temperature, wide beam.',
    description:
      'An LED lamp with a wide, even beam, adjustable colour temperature from 2700 K to 6500 K and a touch dimmer.',
  },
  {
    slug: 'monitor-light-bar',
    name: 'Monitor light bar',
    categorySlug: 'lighting',
    price: 69,
    summary: 'Sits on the screen, lights the work, no glare.',
    description:
      'A light bar that sits on top of your screen and lights the surface in front of it without reflecting on the display, with auto-dimming.',
  },
  {
    slug: 'usb-c-cable',
    name: 'USB-C cable',
    categorySlug: 'accessories',
    price: 12,
    summary: 'Braided, 2 m, 100 W, USB 3.2.',
    description: 'A 2-metre braided USB-C to USB-C cable rated for 100 W charging and 10 Gbit/s data.',
  },
  {
    slug: 'usb-c-hub',
    name: 'USB-C hub',
    categorySlug: 'accessories',
    price: 69,
    summary: '8 ports: HDMI 4K, Ethernet, SD, 100 W passthrough.',
    description:
      'An aluminium 8-in-1 hub with 4K HDMI, gigabit Ethernet, SD and microSD readers, three USB-A ports and 100 W charging passthrough.',
  },
  {
    slug: 'laptop-stand',
    name: 'Laptop stand',
    categorySlug: 'accessories',
    price: 49,
    summary: 'Raises the screen to eye level, folds flat.',
    description:
      'An aluminium stand that raises a laptop screen to eye level, with six height settings, and folds flat to fit in a bag.',
  },
  {
    slug: 'felt-desk-mat',
    name: 'Felt mat',
    categorySlug: 'accessories',
    price: 29,
    summary: 'Merino wool felt, 90 × 40 cm.',
    description: 'A 90 × 40 cm mat of dense merino wool felt that quiets clicks and warms up a hard surface.',
  },
  {
    slug: 'wireless-charger',
    name: 'Wireless charger',
    categorySlug: 'accessories',
    price: 39,
    summary: '15 W, fits under a phone case.',
    description: 'A 15 W wireless charging pad that works through most phone cases, with a soft status light.',
  },
];

/** Seed products with their category's display name, for the no-database fallback. */
export function seedCatalog(): Product[] {
  const names = new Map(seedCategories.map((category) => [category.slug, category.name]));
  return seedProducts.map((product) => ({ ...product, category: names.get(product.categorySlug) ?? '' }));
}
