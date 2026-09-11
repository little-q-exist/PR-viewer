import { List, Badge, Tooltip } from 'antd';
import { FileAddOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons';
import type { FileInfo, FileAnalysis } from '@/types';

interface FileTreeProps {
  files: FileInfo[];
  fileAnalyses: FileAnalysis[];
  selectedFile: string | null;
  onSelectFile: (filename: string) => void;
}

const statusIcon: Record<string, React.ReactNode> = {
  added: <FileAddOutlined style={{ color: '#4caf50' }} />,
  modified: <FileTextOutlined style={{ color: '#ff9800' }} />,
  removed: <DeleteOutlined style={{ color: '#ff5252' }} />,
};

export default function FileTree({ files, fileAnalyses, selectedFile, onSelectFile }: FileTreeProps) {
  const getRiskColor = (filename: string) => {
    const analysis = fileAnalyses.find((fa) => fa.filename === filename);
    if (!analysis) return undefined;
    if (analysis.riskLevel === 'high') return '#ff5252';
    if (analysis.riskLevel === 'medium') return '#ff9800';
    return '#4caf50';
  };

  const addedCount = files.filter((f) => f.status === 'added').length;
  const modifiedCount = files.filter((f) => f.status === 'modified').length;
  const removedCount = files.filter((f) => f.status === 'removed').length;

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, padding: '0 4px' }}>
        <Badge count={addedCount} color="#4caf50" overflowCount={99} size="small">
          <span style={{ fontSize: 10, color: '#888', marginRight: 4 }}>新增</span>
        </Badge>
        <Badge count={modifiedCount} color="#ff9800" overflowCount={99} size="small">
          <span style={{ fontSize: 10, color: '#888', marginRight: 4 }}>修改</span>
        </Badge>
        <Badge count={removedCount} color="#ff5252" overflowCount={99} size="small">
          <span style={{ fontSize: 10, color: '#888' }}>删除</span>
        </Badge>
      </div>
      <List
        size="small"
        dataSource={files}
        split={false}
        renderItem={(file) => (
          <Tooltip key={file.filename} title={file.filename} placement="right" mouseEnterDelay={0.2}>
            <List.Item
              onClick={() => onSelectFile(file.filename)}
              style={{
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 4,
                background: selectedFile === file.filename ? 'rgba(79,195,247,0.12)' : 'transparent',
                border: 'none',
                marginBottom: 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                {statusIcon[file.status]}
                <span style={{
                  flex: 1,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: selectedFile === file.filename ? '#4fc3f7' : '#ccc',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {file.filename}
                </span>
                <span style={{ fontSize: 10, color: '#4caf50' }}>+{file.additions}</span>
                <span style={{ fontSize: 10, color: '#ff5252' }}>-{file.deletions}</span>
                {getRiskColor(file.filename) && (
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: getRiskColor(file.filename),
                    flexShrink: 0,
                  }} />
                )}
              </div>
            </List.Item>
          </Tooltip>
        )}
      />
    </div>
  );
}
