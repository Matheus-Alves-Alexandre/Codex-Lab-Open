import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {LibraryProvider} from './hooks/useLibrary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LibraryProvider><App /></LibraryProvider>
  </StrictMode>,
);
