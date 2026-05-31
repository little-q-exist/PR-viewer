import { Alert } from 'antd';
import { usePRList } from '../hooks/usePRList';
import StatusFilter from './StatusFilter';
import ReviewTable from './ReviewTable';

export default function PRListPage() {
  const { reviews, pagination, statusFilter, setStatusFilter, page, setPage, isLoading, error } = usePRList();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ color: '#fff', marginBottom: 24, fontSize: 24, fontWeight: 600 }}>PR 评审列表</h2>

      <StatusFilter value={statusFilter} onChange={setStatusFilter} />

      {error && (
        <Alert
          type="error"
          message="加载失败"
          description={(error as Error).message}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <ReviewTable
        reviews={reviews}
        isLoading={isLoading}
        page={page}
        total={pagination.total}
        onPageChange={setPage}
      />
    </div>
  );
}
