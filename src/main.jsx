import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { WarpBackground } from './WarpBackground.jsx';

createRoot(document.getElementById('root')).render(
  <>
    <WarpBackground />
    <div className="sage-root-app">
      <App />
    </div>
  </>
);
