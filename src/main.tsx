import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { useGameStore } from './store/useGameStore';
import { livePlayers } from './net/classRoom';
import './index.css';

// ?debug=1 exposes the game store to end-to-end tests and the browser console. Normal play never sets it.
if (new URLSearchParams(window.location.search).has('debug')) {
  (window as Window & { __mg?: unknown }).__mg = { store: useGameStore, players: livePlayers };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
