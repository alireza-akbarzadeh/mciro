import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router';
import OrdersApp from './OrdersApp';

// Standalone mode: the Orders team runs and develops their app without the shell.
// When the shell loads Orders, this file is never executed.
//
// Orders owns the page here, so it also owns the router, and mounts itself at
// the SAME prefix the shell uses (/orders/*). Links to other apps' paths (like
// "Track shipment") land in <ForeignRoute>.

function ForeignRoute() {
  const { pathname } = useLocation();
  return (
    <div className="grid justify-items-start gap-2 rounded-xl border-2 border-dashed p-6 text-sm">
      <p>
        <code>{pathname}</code> belongs to another application. In the composed app (localhost:3000)
        the shell would route it.
      </p>
      <Link className="underline" to="/orders">
        Back to orders
      </Link>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('[orders] #root element not found');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-sm">
        <strong>Orders: standalone mode</strong> (localhost:3002). No shell and no login here;
        the Orders team develops against this page.
      </div>
      <main className="mx-auto my-8 max-w-4xl px-4">
        <Routes>
          <Route index element={<Navigate to="/orders" replace />} />
          <Route path="/orders/*" element={<OrdersApp />} />
          <Route path="*" element={<ForeignRoute />} />
        </Routes>
      </main>
    </BrowserRouter>
  </StrictMode>,
);
