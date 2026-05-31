import { useNavigate } from 'react-router-dom';
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { Review } from '@/types';

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  completed: { color: 'green', icon: <CheckCircleOutlined />, label: '已完成' },
  failed: { color: 'red', icon: <CloseCircleOutlined />, label: '失败' },
  analyzing: { color: 'orange', icon: <LoadingOutlined />, label: '分析中' },
  pending: { color: 'default', icon: <ClockCircleOutlined />, label: '等待中' },
};

const riskConfig: Record<string, { color: string; label: string }> = {
  high: { color: 'red', label: '高风险' },
  medium: { color: 'orange', label: '中风险' },
  low: { color: 'green', label: '低风险' },
};

interface ReviewTableProps {
  reviews: Review[];
  isLoading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function ReviewTable({ reviews, isLoading, page, total, onPageChange }: ReviewTableProps) {
  const navigate = useNavigate();

  const columns: ColumnsType<Review> = [
    {
      title: 'PR 标题',
      dataIndex: 'prId',
      key: 'title',
      render: (prId: Review['prId']) => {
        if (typeof prId === 'object' && prId !== null) {
          return <span style={{ color: '#4fc3f7', cursor: 'pointer' }}>{prId.title}</span>;
        }
        return <span style={{ color: '#888' }}>—</span>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const cfg = statusConfig[status] || statusConfig.pending;
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
      },
    },
    {
      title: '风险',
      key: 'risk',
      width: 90,
      render: (_: unknown, record: Review) => {
        if (!record.summary) return <span style={{ color: '#666' }}>—</span>;
        const cfg = riskConfig[record.summary.riskLevel];
        return <Tag color={cfg?.color}>{cfg?.label}</Tag>;
      },
    },
    {
      title: '评分',
      key: 'score',
      width: 80,
      render: (_: unknown, record: Review) => {
        if (!record.summary) return <span style={{ color: '#666' }}>—</span>;
        const color = record.summary.score >= 80 ? '#4caf50' : record.summary.score >= 60 ? '#ff9800' : '#ff5252';
        return <span style={{ color, fontWeight: 700, fontSize: 15 }}>{record.summary.score}</span>;
      },
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'time',
      width: 140,
      render: (val: string) => {
        const date = new Date(val);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHrs = Math.floor(diffMs / 3600000);
        if (diffHrs < 1) return '刚刚';
        if (diffHrs < 24) return `${diffHrs}h 前`;
        return `${Math.floor(diffHrs / 24)}d 前`;
      },
    },
  ];

  return (
    <Table<Review>
      columns={columns}
      dataSource={reviews}
      rowKey="_id"
      loading={isLoading}
      pagination={{
        current: page,
        pageSize: 20,
        total,
        onChange: onPageChange,
        showSizeChanger: false,
      }}
      onRow={(record) => ({
        onClick: () => navigate(`/review/${record._id}`),
        style: { cursor: 'pointer' },
      })}
      locale={{ emptyText: '暂无评审记录' }}
    />
  );
}
