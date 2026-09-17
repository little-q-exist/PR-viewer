import { List } from 'antd';
import type { Finding } from '@/types';
import FindingPopover from './FindingPopover';

interface FindingListProps {
  findings: Finding[];
}

export default function FindingList({ findings }: FindingListProps) {
  if (findings.length === 0) return null;

  return (
    <div style={{
      marginTop: 16,
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.06)',
      padding: 12,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 10 }}>
        AI 问题 ({findings.length})
      </div>
      <List
        size="small"
        dataSource={findings}
        split={false}
        renderItem={(finding) => (
          <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '8px 0' }}>
            <FindingPopover finding={finding} />
          </List.Item>
        )}
      />
    </div>
  );
}
