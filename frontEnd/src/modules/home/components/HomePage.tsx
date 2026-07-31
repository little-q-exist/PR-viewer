import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { useAuth } from '@/shared/hooks/useAuth';
import { useInstall } from '@/shared/hooks/useReviews';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import WelcomeHero from './WelcomeHero';
import Dashboard from './Dashboard';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { mutate: install } = useInstall();
  const installationStarted = useRef(false);

  const installationId = searchParams.get('installation_id');
  const code = searchParams.get('code');

  useEffect(() => {
    if (!installationId || !code || installationStarted.current) {
      return;
    }

    const parsedInstallationId = Number(installationId);
    if (!Number.isSafeInteger(parsedInstallationId) || parsedInstallationId <= 0) {
      message.error('Invalid GitHub App installation details. Please try again.');
      setSearchParams({}, { replace: true });
      return;
    }

    // GitHub OAuth codes are single-use. Remove them before the async request so
    // rerenders cannot submit the same code again.
    installationStarted.current = true;
    setSearchParams({}, { replace: true });

    install(
      { installationId: parsedInstallationId, code },
      {
        onSuccess: () => {
          message.success('Signed in successfully.');
        },
        onError: () => {
          message.error('GitHub sign-in failed. Please reinstall the app and try again.');
        },
      },
    );
  }, [code, installationId, install, setSearchParams]);

  // GitHub 回调中，显示加载状态
  if (installationId && code) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <WelcomeHero />;
  }

  return <Dashboard />;
}
