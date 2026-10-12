import { Link, useRouteError } from 'react-router';

export function RouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : 'Error desconocido';
  return (
    <div className="app">
      <div className="card stack section">
        <h1>Algo salió mal</h1>
        <p>Tus datos están guardados en el teléfono; recargar suele resolverlo.</p>
        <p className="small">Detalle técnico: {message}</p>
        <div className="row">
          <button type="button" className="btn primary" onClick={() => { window.location.reload(); }}>Recargar</button>
          <Link className="btn" to="/">Ir a Hoy</Link>
        </div>
      </div>
    </div>
  );
}
