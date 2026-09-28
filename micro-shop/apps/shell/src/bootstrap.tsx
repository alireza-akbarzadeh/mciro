import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import './shell.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('[shell] #root element not found');
}

// The shell owns the page, so it owns the ONE router. Remotes rendered inside it
// read this router's context through the shared react-router singleton.
createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
