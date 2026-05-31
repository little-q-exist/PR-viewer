import { Alert } from 'antd';
import { useAuth } from '@/shared/hooks/useAuth';
import { useDashboard } from '../hooks/useDashboard';
import StatsCards from './StatsCards';
import PRUrlInput from './PRUrlInput';
import RecentReviews from './RecentReviews';

export default function Dashboard() {
  const { user } = useAuth();
  const { totalCount, highRiskCount, mediumRiskCount, lowRiskCount, recentReviews, isLoading, error } = useDashboard();

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 24, fontWeight: 600 }}>
          欢迎回来{user ? `，${user.login}` : ''}
        </h2>
      </div>

      <StatsCards
        totalCount={totalCount}
        highRiskCount={highRiskCount}
        mediumRiskCount={mediumRiskCount}
        lowRiskCount={lowRiskCount}
        isLoading={isLoading}
      />

      <PRUrlInput />

      {error && (
        <Alert
          type="error"
          message="加载失败"
          description={(error as Error).message}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <RecentReviews reviews={recentReviews} isLoading={isLoading} />
    </div>
  );
}
