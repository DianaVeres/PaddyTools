'use client';

import { useEffect, useState } from 'react';

export default function IncidenciasPage() {
  const [frameSource, setFrameSource] = useState('/incidencias-app.html');
  useEffect(() => {
    setFrameSource(`/incidencias-app.html${window.location.search}`);
  }, []);
  return (
    <main className="incidents-page-shell">
      <header className="incidents-timer-header">
        <a href="/">PaddyTools · Incidencias</a>
        <div id="kpi-timer-slot" className="kpi-timer-slot" />
      </header>
      <iframe
        src={frameSource}
        title="Paddy · Incidencias de pedidos"
      />
    </main>
  );
}
