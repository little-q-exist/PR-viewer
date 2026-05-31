import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { usePolling } from '../hooks/usePolling';

interface PollingIndicatorProps {
  status: 'pending' | 'analyzing';
  startedAt?: string;
}

export default function PollingIndicator({ status, startedAt }: PollingIndicatorProps) {
  const { formattedElapsed } = usePolling(startedAt);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      gap: 16,
    }}>
      <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: 500 }}>
        {status === 'pending' ? '排队中...' : 'AI 分析进行中...'}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
        已等待 {formattedElapsed}
      </div>
    </div>
  );
}
