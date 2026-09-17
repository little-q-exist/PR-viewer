import { Card, Col, Row, Statistic, Skeleton } from 'antd';
import { CheckCircleOutlined, CommentOutlined, AuditOutlined, NumberOutlined } from '@ant-design/icons';

interface StatsCardsProps {
  totalCount: number;
  recentCompletedCount: number;
  recentFindingCount: number;
  recentTokenCount: number;
  isLoading: boolean;
}

export default function StatsCards({
  totalCount,
  recentCompletedCount,
  recentFindingCount,
  recentTokenCount,
  isLoading,
}: StatsCardsProps) {
  if (isLoading) {
    return (
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={12} sm={6} key={i}>
            <Card><Skeleton active paragraph={{ rows: 1 }} /></Card>
          </Col>
        ))}
      </Row>
    );
  }

  const stats = [
    { title: '总评审数', value: totalCount, icon: <AuditOutlined />, color: '#4fc3f7' },
    { title: '最近完成', value: recentCompletedCount, icon: <CheckCircleOutlined />, color: '#4caf50' },
    { title: '最近发现问题', value: recentFindingCount, icon: <CommentOutlined />, color: '#ff9800' },
    { title: '最近 Token', value: recentTokenCount, icon: <NumberOutlined />, color: '#9c88ff' },
  ];

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      {stats.map((s) => (
        <Col xs={12} sm={6} key={s.title}>
          <Card
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
            }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{s.title}</span>}
              value={s.value}
              valueStyle={{ color: s.color, fontSize: 28, fontWeight: 700 }}
              prefix={s.icon}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
