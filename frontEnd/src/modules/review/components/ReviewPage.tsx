import { Tabs, Button, Result } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useReviewDetailData } from '../hooks/useReviewDetail';
import PRInfoBar from './PRInfoBar';
import PollingIndicator from './PollingIndicator';
import { Typography } from 'antd';
import OverviewTab from './OverviewTab';

const { Text } = Typography;

function ChangesTabPlaceholder() {
  return <Text style={{ color: '#888' }}>变更加载中...</Text>;
}

export default function ReviewPage() {
  const { review, isLoading, error } = useReviewDetailData();

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <PollingIndicator status="pending" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Result
          status="error"
          title="加载失败"
          subTitle={(error as Error).message}
          extra={<Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>重试</Button>}
        />
      </div>
    );
  }

  if (!review) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Result status="404" title="评审未找到" subTitle="该评审记录不存在或已被删除" />
      </div>
    );
  }

  const pr = typeof review.prId === 'object' ? review.prId : null;

  // pending / analyzing → polling indicator
  if (review.status === 'pending' || review.status === 'analyzing') {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <PRInfoBar pr={pr} />
        <PollingIndicator status={review.status} startedAt={review.startedAt} />
      </div>
    );
  }

  // failed
  if (review.status === 'failed') {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <PRInfoBar pr={pr} />
        <Result
          status="error"
          title="分析失败"
          subTitle={review.errorMessage || '未知错误'}
          extra={<Button type="primary" icon={<ReloadOutlined />}>重新分析</Button>}
        />
      </div>
    );
  }

  // completed
  const tabItems = [
    {
      key: 'overview',
      label: '总览',
      children: <OverviewTab review={review} />,
    },
    {
      key: 'changes',
      label: '具体变更',
      children: <ChangesTabPlaceholder />,
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <PRInfoBar pr={pr} />
      <Tabs
        defaultActiveKey="overview"
        items={tabItems}
      />
    </div>
  );
}
