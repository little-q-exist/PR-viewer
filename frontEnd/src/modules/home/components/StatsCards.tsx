import { Card, Col, Row, Statistic, Skeleton } from 'antd';
import { AlertOutlined, SafetyCertificateOutlined, AuditOutlined, WarningOutlined } from '@ant-design/icons';

interface StatsCardsProps {
  totalCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  isLoading: boolean;
}

export default function StatsCards({ totalCount, highRiskCount, mediumRiskCount, lowRiskCount, isLoading }: StatsCardsProps) {
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
    { title: '高风险', value: highRiskCount, icon: <AlertOutlined />, color: '#ff5252' },
    { title: '中风险', value: mediumRiskCount, icon: <WarningOutlined />, color: '#ff9800' },
    { title: '低风险', value: lowRiskCount, icon: <SafetyCertificateOutlined />, color: '#4caf50' },
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
