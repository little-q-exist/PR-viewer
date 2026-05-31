import { useState } from 'react';
import { Input, Button, Card, message } from 'antd';
import { SendOutlined, LinkOutlined } from '@ant-design/icons';
import { useCreateReview } from '@/shared/hooks/useReviews';

export default function PRUrlInput() {
  const [prUrl, setPrUrl] = useState('');
  const createReview = useCreateReview();

  const handleAnalyze = () => {
    const trimmed = prUrl.trim();
    if (!trimmed) {
      message.warning('请输入 GitHub PR URL');
      return;
    }
    if (!trimmed.match(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/)) {
      message.error('无效的 GitHub PR URL，格式: https://github.com/owner/repo/pull/123');
      return;
    }
    createReview.mutate(trimmed);
  };

  return (
    <Card
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        marginBottom: 24,
      }}
      styles={{ body: { padding: 20 } }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 12 }}>
        <LinkOutlined style={{ marginRight: 8 }} />
        开始新的代码评审
      </div>
      <Input.Group compact style={{ display: 'flex' }}>
        <Input
          style={{ flex: 1 }}
          size="large"
          placeholder="粘贴 GitHub PR URL，例如 https://github.com/owner/repo/pull/123"
          value={prUrl}
          onChange={(e) => setPrUrl(e.target.value)}
          onPressEnter={handleAnalyze}
        />
        <Button
          type="primary"
          size="large"
          icon={<SendOutlined />}
          onClick={handleAnalyze}
          loading={createReview.isPending}
          style={{ borderRadius: '0 8px 8px 0' }}
        >
          分析
        </Button>
      </Input.Group>
    </Card>
  );
}
