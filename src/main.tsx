import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeLocalApiInterceptor } from './utils/localApiInterceptor.ts';

// Launch static-proof database overlay
initializeLocalApiInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
