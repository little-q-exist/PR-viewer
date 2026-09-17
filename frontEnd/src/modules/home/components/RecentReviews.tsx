import { useNavigate } from 'react-router-dom';
import { List, Card, Tag, Typography, Empty, Skeleton } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { Review } from '@/types';

const { Text } = Typography;

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  completed: { color: 'green', icon: <CheckCircleOutlined />, label: '已完成' },
  failed: { color: 'red', icon: <CloseCircleOutlined />, label: '失败' },
  analyzing: { color: 'orange', icon: <LoadingOutlined />, label: '分析中' },
  pending: { color: 'default', icon: <ClockCircleOutlined />, label: '等待中' },
};

interface RecentReviewsProps {
  reviews: Review[];
  isLoading: boolean;
}

export default function RecentReviews({ reviews, isLoading }: RecentReviewsProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
      }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  return (
    <Card
      title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>最近评审</span>}
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
      }}
    >
      {reviews.length === 0 ? (
        <Empty description={<span style={{ color: 'rgba(255,255,255,0.45)' }}>暂无评审记录</span>} />
      ) : (
        <List
          dataSource={reviews}
          renderItem={(review) => {
            const pr = typeof review.prId === 'object' ? review.prId : null;
            const status = statusConfig[review.status] || statusConfig.pending;

            return (
              <List.Item
                style={{ cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onClick={() => navigate(`/review/${review._id}`)}
              >
                <List.Item.Meta
                  title={<Text style={{ color: '#e0e0e0' }}>{pr?.title || `PR #${pr?.pullNumber || '?'}`}</Text>}
                  description={
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                      <Tag color={status.color} icon={status.icon}>{status.label}</Tag>
                      <Tag>{review.engine}</Tag>
                      <Text style={{ color: '#aaa', fontSize: 12 }}>
                        发现 {review.runSummary.comments} 项
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}
