import { useAuth } from '@/shared/hooks/useAuth';
import WelcomeHero from './WelcomeHero';
import Dashboard from './Dashboard';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <WelcomeHero />;
  }

  return <Dashboard />;
}
