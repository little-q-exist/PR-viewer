import { Timeline, Typography, Empty } from 'antd';
import type { CommitInfo } from '@/types';

const { Text } = Typography;

interface CommitListProps {
  commits?: CommitInfo[];
}

export default function CommitList({ commits }: CommitListProps) {
  if (!commits || commits.length === 0) {
    return <Empty description="暂无 commit 数据" />;
  }

  return (
    <div style={{ padding: 8 }}>
      <Timeline
        items={commits.map((commit, index) => ({
          color: index === 0 ? '#4fc3f7' : 'gray',
          children: (
            <div>
              <div style={{ color: index === 0 ? '#e0e0e0' : '#999', fontSize: 13, marginBottom: 4 }}>
                {commit.message}
              </div>
              <Text style={{ fontSize: 11, color: '#666' }}>
                {commit.sha.slice(0, 7)} · {commit.author.login}
              </Text>
            </div>
          ),
        }))}
      />
    </div>
  );
}
