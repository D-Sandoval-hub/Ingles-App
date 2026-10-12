import { createHashRouter } from 'react-router';
import { Layout } from './pages/Layout';
import { TodayPage } from './pages/Today';
import { WelcomePage } from './pages/Welcome';
import { ReviewPage } from './pages/Review';
import { BlockPage } from './pages/Block';
import { InputPage } from './pages/Input';
import { PracticePage } from './pages/Practice';
import { PlanPage } from './pages/Plan';
import { ProgressPage } from './pages/Progress';
import { VocabularyPage } from './pages/Vocabulary';
import { SettingsPage } from './pages/Settings';
import { AssessmentPage } from './pages/Assessment';
import { ResultPage } from './pages/Result';
import { MorePage } from './pages/More';
import { RouteError } from './pages/RouteError';

// Hash router: funciona en cualquier hosting estático (sin reglas de reescritura) y sin conexión.
export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'bienvenida', element: <WelcomePage /> },
      { path: 'repaso', element: <ReviewPage /> },
      { path: 'bloque/:module', element: <BlockPage /> },
      { path: 'input', element: <InputPage /> },
      { path: 'practica', element: <PracticePage /> },
      { path: 'plan', element: <PlanPage /> },
      { path: 'progreso', element: <ProgressPage /> },
      { path: 'vocabulario', element: <VocabularyPage /> },
      { path: 'ajustes', element: <SettingsPage /> },
      { path: 'mas', element: <MorePage /> },
      { path: 'test/:kind', element: <AssessmentPage /> },
      { path: 'resultado/:id', element: <ResultPage /> },
    ],
  },
]);
