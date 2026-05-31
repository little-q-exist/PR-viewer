import ReactDiffViewerComponent, { DiffMethod } from 'react-diff-viewer';
import { List } from 'antd';
import type { FileAnalysis, Suggestion } from '@/types';
import SuggestionPopover from './SuggestionPopover';

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
  fileAnalysis?: FileAnalysis;
}

export default function DiffViewer({ oldCode, newCode, fileAnalysis }: DiffViewerProps) {
  return (
    <div>
      <ReactDiffViewerComponent
        oldValue={oldCode}
        newValue={newCode}
        splitView={false}
        compareMethod={DiffMethod.WORDS}
        useDarkTheme={true}
        leftTitle="原代码"
        rightTitle="变更后"
        styles={{
          diffContainer: {
            background: 'transparent',
            borderRadius: 8,
            overflow: 'hidden',
          },
          line: {
            wordBreak: 'break-all',
            fontSize: 12,
          },
        }}
      />
      {fileAnalysis && fileAnalysis.suggestions.length > 0 && (
        <div style={{
          marginTop: 16,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.06)',
          padding: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 10 }}>
            AI 建议 ({fileAnalysis.suggestions.length})
          </div>
          <List
            size="small"
            dataSource={fileAnalysis.suggestions}
            split={false}
            renderItem={(suggestion: Suggestion) => (
              <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '8px 0' }}>
                <SuggestionPopover suggestion={suggestion} />
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );
}
