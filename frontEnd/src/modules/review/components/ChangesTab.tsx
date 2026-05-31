import { useState } from 'react';
import { Col, Row, Empty } from 'antd';
import type { Review, FileInfo, FileAnalysis } from '@/types';
import FileTree from './FileTree';
import DiffViewer from './DiffViewer';

interface ChangesTabProps {
  review: Review;
}

export default function ChangesTab({ review }: ChangesTabProps) {
  const pr = typeof review.prId === 'object' ? review.prId : null;
  const files: FileInfo[] = pr?.files || [];
  const fileAnalyses: FileAnalysis[] = review.fileAnalyses || [];
  const [selectedFile, setSelectedFile] = useState<string | null>(files[0]?.filename || null);

  const currentFile = files.find((f) => f.filename === selectedFile);
  const currentAnalysis = fileAnalyses.find((fa) => fa.filename === selectedFile);

  return (
    <Row gutter={20}>
      <Col flex="240px">
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: 10,
          height: 'calc(100vh - 250px)',
          overflow: 'auto',
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#aaa',
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            变更文件 ({files.length})
          </div>
          <FileTree
            files={files}
            fileAnalyses={fileAnalyses}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        </div>
      </Col>
      <Col flex="auto">
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: 16,
          minHeight: 500,
        }}>
          {currentFile ? (
            <>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 12, fontFamily: 'monospace' }}>
                {currentFile.filename}
              </div>
              <DiffViewer
                oldCode=""
                newCode={currentFile.patch || ''}
                fileAnalysis={currentAnalysis}
              />
            </>
          ) : (
            <Empty description="选择一个文件查看变更" />
          )}
        </div>
      </Col>
    </Row>
  );
}
