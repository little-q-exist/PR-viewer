import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { useAuth } from '@/shared/hooks/useAuth';
import { useInstall } from '@/shared/hooks/useReviews';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import WelcomeHero from './WelcomeHero';
import Dashboard from './Dashboard';

const OAUTH_STATE_KEY = 'github-oauth-state';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { mutate: install, isPending } = useInstall();
  const loginStarted = useRef(false);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  useEffect(() => {
    if (oauthError) {
      message.error('GitHub authorization was cancelled or denied.');
      setSearchParams({}, { replace: true });
      return;
    }

    if (!code || loginStarted.current) {
      return;
    }

    const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
    if (!state || state !== expectedState) {
      message.error('Invalid GitHub sign-in response. Please try again.');
      setSearchParams({}, { replace: true });
      return;
    }

    sessionStorage.removeItem(OAUTH_STATE_KEY);
    // GitHub OAuth codes are single-use. Remove it before the async request so
    // rerenders cannot submit the same code again.
    loginStarted.current = true;
    setSearchParams({}, { replace: true });

    install(
      { code },
      {
        onSuccess: () => {
          message.success('Signed in successfully.');
        },
        onError: (error) => {
          const status = error instanceof Error && 'response' in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;
          message.error(
            status === 409
              ? 'Please install the GitHub App first, then sign in again.'
              : 'GitHub sign-in failed. Please try again.',
          );
        },
      },
    );
  }, [code, install, oauthError, setSearchParams, state]);

  // Redux authentication controls the page. Do not let a stale mutation
  // notification keep covering the dashboard after setAuth has succeeded.
  if (!isAuthenticated && (code || isPending)) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <WelcomeHero />;
  }

  return <Dashboard />;
}
