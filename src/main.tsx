import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.esm.js';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import App from './App';

(function () {
  if (window.location.hash) { return; }
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (path === '') { return; }
  const route =
    path === 'hospice' ? null :
    path.startsWith('hospice/') ? path.slice('hospice/'.length) :
    path;
  if (route) { window.location.replace('#/' + route); }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
