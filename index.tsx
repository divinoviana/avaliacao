
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<div style="color:red; padding:20px;">Erro Fatal: Elemento root não encontrado.</div>';
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  console.error("Erro na renderização:", e);
  rootElement.innerHTML = `<div style="padding: 20px; font-family: sans-serif;">
    <h2 style="color: #e11d48;">Ocorreu um erro na inicialização</h2>
    <p>Tente recarregar a página.</p>
    <pre style="background: #f1f5f9; padding: 10px; border-radius: 4px; color: #475569;">${e}</pre>
  </div>`;
}
