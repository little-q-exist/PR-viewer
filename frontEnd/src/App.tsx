import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AppLayout from './shared/components/AppLayout';
import ProtectedRoute from './shared/components/ProtectedRoute';
import LoadingSpinner from './shared/components/LoadingSpinner';
import HomePage from './modules/home/components/HomePage';

// Lazy load non-home routes
const PRListPage = lazy(() => import('./modules/pr-list/components/PRListPage'));
const ReviewPage = lazy(() => import('./modules/review/components/ReviewPage'));

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route
          path="pr-list"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <PRListPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="review/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <ReviewPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
