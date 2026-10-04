import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import PageLoading from './components/PageLoading';

// Lazy-loaded so the first visit — almost always to "/" from a WhatsApp
// link — only pays for Landing's own code. See CLAUDE.md rule 1.
const Register = lazy(() => import('./pages/Register'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Ticket = lazy(() => import('./pages/Ticket'));
const FindTicket = lazy(() => import('./pages/FindTicket'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminApp = lazy(() => import('./admin/AdminApp'));
const CheckInApp = lazy(() => import('./checkin/CheckInApp'));

function lazyRoute(Component) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Component />
    </Suspense>
  );
}

function App() {
  return (
    <main>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={lazyRoute(Register)} />
        <Route path="/privacy" element={lazyRoute(Privacy)} />
        <Route path="/ticket/:code" element={lazyRoute(Ticket)} />
        <Route path="/find-ticket" element={lazyRoute(FindTicket)} />
        <Route path="/admin/*" element={lazyRoute(AdminApp)} />
        <Route path="/checkin" element={lazyRoute(CheckInApp)} />
        <Route path="*" element={lazyRoute(NotFound)} />
      </Routes>
    </main>
  );
}

export default App;
