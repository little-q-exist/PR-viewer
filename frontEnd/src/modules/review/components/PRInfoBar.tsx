import { Avatar, Tag } from 'antd';
import { BranchesOutlined } from '@ant-design/icons';
import type { PullRequest } from '@/types';

interface PRInfoBarProps {
  pr?: PullRequest | null;
}

export default function PRInfoBar({ pr }: PRInfoBarProps) {
  if (!pr) return null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
      padding: '14px 20px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <Avatar src={pr.author.avatarUrl} size={36} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#e0e0e0', marginBottom: 4 }}>
          {pr.title}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#888' }}>
          <span>{pr.author.login}</span>
          <span>
            <BranchesOutlined style={{ marginRight: 4 }} />
            {pr.baseBranch} ← {pr.headBranch}
          </span>
        </div>
      </div>
      <Tag color={pr.state === 'open' ? 'green' : pr.state === 'merged' ? 'purple' : 'default'}>
        {pr.state}
      </Tag>
    </div>
  );
}
