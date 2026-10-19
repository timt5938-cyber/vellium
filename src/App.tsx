import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Landing from './Landing';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import JoinFamily from './JoinFamily';

const Dashboard = lazy(() => import('./Dashboard'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previous;
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Suspense fallback={<div className="auth-screen"><p>Загружаем дневник…</p></div>}><Dashboard /></Suspense>} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/join/:token" element={<JoinFamily />} />
      </Routes>
    </BrowserRouter>
  );
}
