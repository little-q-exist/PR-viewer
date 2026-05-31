import { Popover, Tag, Typography } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import type { Suggestion } from '@/types';
import { marked } from 'marked';

const { Text } = Typography;

const severityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: '#ff5252', label: '严重' },
  major: { color: '#ff9800', label: '重要' },
  minor: { color: '#ffc107', label: '轻微' },
  nit: { color: '#9e9e9e', label: '建议' },
};

interface SuggestionPopoverProps {
  suggestion: Suggestion;
}

export default function SuggestionPopover({ suggestion }: SuggestionPopoverProps) {
  const sev = severityConfig[suggestion.severity] || severityConfig.nit;

  const popoverContent = (
    <div style={{ maxWidth: 400 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <Tag color={sev.color}>{sev.label}</Tag>
        <Tag>{suggestion.category}</Tag>
      </div>
      <Text strong style={{ color: '#e0e0e0', display: 'block', marginBottom: 8 }}>
        {suggestion.title}
      </Text>
      <div
        style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{ __html: marked.parse(suggestion.description) as string }}
      />
      {suggestion.suggestionCode && (
        <pre style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 6,
          padding: 10,
          marginTop: 10,
          fontSize: 12,
          overflow: 'auto',
          color: '#a5d6a7',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
        }}>
          {suggestion.suggestionCode}
        </pre>
      )}
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      trigger="click"
      placement="left"
      overlayStyle={{ maxWidth: 440 }}
      overlayInnerStyle={{
        background: 'rgba(30,30,40,0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: '100%' }}>
        <MessageOutlined style={{ color: '#ff9800', fontSize: 14, flexShrink: 0 }} />
        <div>
          <div style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 500 }}>
            <Tag color={sev.color} style={{ marginRight: 6 }}>{sev.label}</Tag>
            {suggestion.title}
          </div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
            第 {suggestion.lineStart}{suggestion.lineEnd ? `-${suggestion.lineEnd}` : ''} 行 · {suggestion.category}
          </div>
        </div>
      </div>
    </Popover>
  );
}
