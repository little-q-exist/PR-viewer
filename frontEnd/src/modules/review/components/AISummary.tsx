import { Card, Tag, Typography, List } from 'antd';
import type { Summary, Recommendation } from '@/types';
import MarkdownContent from '@/shared/components/MarkdownContent';

const { Text } = Typography;

const riskConfig: Record<string, { color: string; label: string }> = {
  high: { color: '#ff5252', label: '高风险' },
  medium: { color: '#ff9800', label: '中风险' },
  low: { color: '#4caf50', label: '低风险' },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  high: { color: '#ff5252', label: '高' },
  medium: { color: '#ff9800', label: '中' },
  low: { color: '#4caf50', label: '低' },
};

interface AISummaryProps {
  summary: Summary;
}

export default function AISummary({ summary }: AISummaryProps) {
  const risk = riskConfig[summary.riskLevel] || riskConfig.medium;

  return (
    <div>
      {/* Risk level badge + score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <Tag color={risk.color} style={{ fontSize: 14, padding: '2px 12px' }}>{risk.label}</Tag>
        <div style={{ fontSize: 40, fontWeight: 800, color: risk.color, lineHeight: 1 }}>
          {summary.score}
          <span style={{ fontSize: 16, color: '#666', fontWeight: 400 }}>/100</span>
        </div>
      </div>

      {/* Overview */}
      <Card
        size="small"
        title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>总体评价</span>}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <MarkdownContent
          content={summary.overview}
          className="markdown-body"
          style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}
        />
      </Card>

      {/* Recommendations */}
      <Card
        size="small"
        title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>建议 ({summary.recommendations.length})</span>}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
        }}
      >
        <List
          dataSource={summary.recommendations}
          renderItem={(rec: Recommendation) => {
            const pri = priorityConfig[rec.priority] || priorityConfig.medium;
            return (
              <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '12px 0' }}>
                <List.Item.Meta
                  avatar={<Tag color={pri.color}>{pri.label}</Tag>}
                  title={<Text style={{ color: '#e0e0e0' }}>{rec.title}</Text>}
                  description={
                    <div style={{ marginTop: 4 }}>
                      <Tag style={{ marginBottom: 6 }}>{rec.category}</Tag>
                      <MarkdownContent
                        content={rec.description}
                        className="markdown-body"
                        style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}
                      />
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>
    </div>
  );
}
