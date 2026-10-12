import { Link } from 'react-router';

export function MorePage() {
  return (
    <div className="stack">
      <h1>Más</h1>
      <Link className="btn block" to="/practica">Práctica libre (5–15 min)</Link>
      <Link className="btn block" to="/input">Registrar input (listening extensivo)</Link>
      <Link className="btn block" to="/vocabulario">Vocabulario NGSL</Link>
      <Link className="btn block" to="/test/weekly">Re-evaluación</Link>
      <Link className="btn block" to="/ajustes">Ajustes y respaldo</Link>
    </div>
  );
}
