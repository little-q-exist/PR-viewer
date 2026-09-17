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
      title: '引擎',
      key: 'engine',
      width: 100,
      render: (_: unknown, record: Review) => {
        return <Tag>{record.engine}</Tag>;
      },
    },
    {
      title: '发现问题',
      key: 'findings',
      width: 100,
      render: (_: unknown, record: Review) => {
        return <span style={{ color: '#e0e0e0', fontWeight: 700 }}>{record.runSummary.comments}</span>;
      },
    },
    {
      title: '耗时',
      key: 'elapsed',
      width: 90,
      render: (_: unknown, record: Review) => {
        return <span style={{ color: '#aaa' }}>{record.runSummary.elapsed || '—'}</span>;
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
