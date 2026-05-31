import { Segmented } from 'antd';
import type { ReviewStatus } from '@/types';

interface StatusFilterProps {
  value: ReviewStatus | undefined;
  onChange: (status: ReviewStatus | undefined) => void;
}

export default function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Segmented
        value={value ?? 'all'}
        onChange={(val) => onChange(val === 'all' ? undefined : (val as ReviewStatus))}
        options={[
          { value: 'all', label: '全部' },
          { value: 'pending', label: '等待中' },
          { value: 'analyzing', label: '分析中' },
          { value: 'completed', label: '已完成' },
          { value: 'failed', label: '失败' },
        ]}
        style={{
          background: 'rgba(255,255,255,0.05)',
        }}
      />
    </div>
  );
}
