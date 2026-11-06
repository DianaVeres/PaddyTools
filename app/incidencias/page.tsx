export default function IncidenciasPage() {
  return (
    <main className="incidents-page-shell">
      <header className="incidents-timer-header">
        <a href="/">PaddyTools · Incidencias</a>
        <div id="kpi-timer-slot" className="kpi-timer-slot" />
      </header>
      <iframe
        src="/incidencias-app.html"
        title="Paddy · Incidencias de pedidos"
      />
    </main>
  );
}
