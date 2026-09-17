import { Popover, Tag } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import type { Finding } from '@/types';
import MarkdownContent from '@/shared/components/MarkdownContent';

const severityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: '#ff5252', label: '严重' },
  major: { color: '#ff9800', label: '重要' },
  minor: { color: '#ffc107', label: '轻微' },
  nit: { color: '#9e9e9e', label: '建议' },
};

interface FindingPopoverProps {
  finding: Finding;
}

export default function FindingPopover({ finding }: FindingPopoverProps) {
  const severity = severityConfig[finding.severity] ?? severityConfig.nit;

  const popoverContent = (
    <div style={{ maxWidth: 400 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <Tag color={severity.color}>{severity.label}</Tag>
        <Tag>{finding.category}</Tag>
      </div>
      <MarkdownContent
        content={finding.content}
        style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.6 }}
      />
      {finding.suggestionCode && (
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
          {finding.suggestionCode}
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
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 500 }}>
            <Tag color={severity.color} style={{ marginRight: 6 }}>{severity.label}</Tag>
            {finding.content.slice(0, 80)}
            {finding.content.length > 80 ? '...' : ''}
          </div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
            第 {finding.startLine}-{finding.endLine} 行 · {finding.category}
          </div>
        </div>
      </div>
    </Popover>
  );
}
