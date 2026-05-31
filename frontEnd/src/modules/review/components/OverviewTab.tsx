import { Col, Row } from 'antd';
import type { Review, CommitInfo } from '@/types';
import CommitList from './CommitList';
import AISummary from './AISummary';

interface OverviewTabProps {
  review: Review;
}

export default function OverviewTab({ review }: OverviewTabProps) {
  const pr = typeof review.prId === 'object' ? review.prId : null;
  const commits: CommitInfo[] = pr?.commits || [];

  return (
    <Row gutter={20}>
      <Col flex="260px">
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: 12,
          minHeight: 300,
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#aaa',
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Commits ({commits.length})
          </div>
          <CommitList commits={commits} />
        </div>
      </Col>
      <Col flex="auto">
        {review.summary ? (
          <AISummary summary={review.summary} />
        ) : (
          <div style={{ color: '#888', textAlign: 'center', padding: 60 }}>暂无 AI 分析结果</div>
        )}
      </Col>
    </Row>
  );
}
