import { Alert, Card, Col, Row, Statistic, Tag, Typography } from 'antd';
import type { Category, Review, Severity } from '@/types';
import MarkdownContent from '@/shared/components/MarkdownContent';

const { Text } = Typography;

const severityConfig: Record<Severity, { color: string; label: string }> = {
  critical: { color: '#ff5252', label: '严重' },
  major: { color: '#ff9800', label: '重要' },
  minor: { color: '#ffc107', label: '轻微' },
  nit: { color: '#9e9e9e', label: '建议' },
};

const categoryLabels: Record<Category, string> = {
  security: '安全',
  performance: '性能',
  style: '风格',
  logic: '逻辑',
  maintainability: '可维护性',
};

interface AISummaryProps {
  review: Review;
}

export default function AISummary({ review }: AISummaryProps) {
  const severityCounts = Object.keys(severityConfig).map((severity) => ({
    severity: severity as Severity,
    count: review.findings.filter((finding) => finding.severity === severity).length,
  }));
  const categoryCounts = Object.keys(categoryLabels).map((category) => ({
    category: category as Category,
    count: review.findings.filter((finding) => finding.category === category).length,
  }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Tag color="blue">{review.engine.toUpperCase()}</Tag>
        <Tag>{review.engineVersion}</Tag>
        {review.engineStatus && <Tag color="green">{review.engineStatus}</Tag>}
        {review.llm && (
          <Text style={{ color: '#aaa' }}>{review.llm.provider} / {review.llm.model}</Text>
        )}
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="评审文件" value={review.runSummary.filesReviewed} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="发现问题" value={review.runSummary.comments} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="总 Token" value={review.runSummary.totalTokens} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="耗时" value={review.runSummary.elapsed || '—'} /></Card></Col>
      </Row>

      {review.message && (
        <Card
          size="small"
          title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>运行说明</span>}
          style={{ marginBottom: 16, background: 'rgba(255,255,255,0.03)' }}
        >
          <MarkdownContent content={review.message} />
        </Card>
      )}

      <Card
        size="small"
        title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>问题分布</span>}
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {severityCounts.map(({ severity, count }) => (
            <Tag key={severity} color={severityConfig[severity].color}>
              {severityConfig[severity].label} {count}
            </Tag>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {categoryCounts.map(({ category, count }) => (
            <Tag key={category}>{categoryLabels[category]} {count}</Tag>
          ))}
        </div>
      </Card>

      {review.warnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="评审警告"
          description={review.warnings.join('；')}
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
}
