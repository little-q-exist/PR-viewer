import ReactDiffViewerModule, { DiffMethod } from 'react-diff-viewer';

// react-diff-viewer 是纯 CJS 的旧库：`__esModule = true`，真正的组件挂在 `exports.default`。
// Vite 8 在 dev 下按 esbuild/Node 语义预打包 CJS 依赖，默认导出是整个 `module.exports`
// 对象（组件在 `.default`），而生产构建 / vitest / 旧版 Vite 会直接把 default 解包成组件。
// 独立导出解析函数，便于用纯单元测试覆盖两种形态，避免测试通过重置模块触发大型依赖重载。
export function resolveReactDiffViewerComponent(module: unknown): unknown {
  if (typeof module === 'object' && module !== null && 'default' in module) {
    const defaultExport = (module as { default?: unknown }).default;
    if (defaultExport !== undefined && defaultExport !== null) {
      return defaultExport;
    }
  }

  return module;
}

const ReactDiffViewerComponent = resolveReactDiffViewerComponent(
  ReactDiffViewerModule,
) as typeof ReactDiffViewerModule;

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
}

export default function DiffViewer({ oldCode, newCode }: DiffViewerProps) {
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
    </div>
  );
}
