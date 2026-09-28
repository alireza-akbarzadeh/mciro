import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router';
import ShippingApp from './ShippingApp';

// Standalone mode. Shipping owns the page, so it also owns the router, and
// mounts itself at the SAME prefix the shell uses (/shipping/*). Links to other
// apps' paths land in <ForeignRoute>: in the composed app the shell routes them.

function ForeignRoute() {
  const { pathname } = useLocation();
  return (
    <div className="grid justify-items-start gap-2 rounded-xl border-2 border-dashed p-6 text-sm">
      <p>
        <code>{pathname}</code> belongs to another application. In the composed app (localhost:3000)
        the shell would route it.
      </p>
      <Link className="underline" to="/shipping">
        Back to shipping
      </Link>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('[shipping] #root element not found');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-sm">
        <strong>Shipping: standalone mode</strong> (localhost:3003). No shell and no login here;
        the Shipping team develops against this page.
      </div>
      <main className="mx-auto my-8 max-w-4xl px-4">
        <Routes>
          <Route index element={<Navigate to="/shipping" replace />} />
          <Route path="/shipping/*" element={<ShippingApp />} />
          <Route path="*" element={<ForeignRoute />} />
        </Routes>
      </main>
    </BrowserRouter>
  </StrictMode>,
);
