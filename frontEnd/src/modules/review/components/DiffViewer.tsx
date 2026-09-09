import ReactDiffViewerModule, { DiffMethod } from 'react-diff-viewer';
import { List } from 'antd';
import type { FileAnalysis, Suggestion } from '@/types';
import SuggestionPopover from './SuggestionPopover';

// react-diff-viewer 是纯 CJS 的旧库：`__esModule = true`，真正的组件挂在 `exports.default`。
// Vite 8 在 dev 下按 esbuild/Node 语义预打包 CJS 依赖，默认导出是整个 `module.exports`
// 对象（组件在 `.default`），而生产构建 / vitest / 旧版 Vite 会直接把 default 解包成组件。
// 统一在这里兼容两种形态，避免 dev 下 React 拿到一个 object 当组件类型（Element type is invalid）。
const ReactDiffViewerComponent =
  (ReactDiffViewerModule as unknown as { default?: typeof ReactDiffViewerModule }).default ??
  ReactDiffViewerModule;

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
