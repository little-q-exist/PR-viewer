# OCR CLI Runner 设计与接入计划

> 基线：`@alibaba-group/open-code-review` v1.11.8，Windows/Node 子进程接入结论见
> [phase-0-findings.md](../phase-0/phase-0-findings.md) 第 5 节。
>
> 本文只定义 OCR CLI Runner 的调用边界和运行机制。`processReview` 的完整编排顺序已经记录在
> [ocr-harness-roadmap.md](../ocr-harness-roadmap.md) 与
> [ocr-integration.md](./ocr-integration.md)，本文不重复。Runner 异常到 Review/API 的公共映射见
> [error-mapping.md](./error-mapping.md)。

## 1. 目标与边界

Runner 的唯一职责是：在已经物化好的本地 Git 仓库中执行一次 OCR review，并将 UTF-8 原始 JSON
返回给调用方。

Runner 负责：

- 解析 OCR CLI 入口；
- 校验调用参数；
- 使用受限的 `spawn` 参数启动 OCR；
- 控制超时并终止完整子进程树；
- 使用临时输出文件，避免依赖 stdout；
- 读取并返回原始 JSON；
- 清理本次调用产生的临时文件；
- 将执行失败转换为 `OcrRunnerError`。

Runner 不负责：

- 获取 GitHub token 或 clone 仓库；
- 解析 OCR JSON 的业务字段；
- 将 comments 转换为 Finding；
- 写入 MongoDB；
- 将错误映射为 HTTP 或 Review 字段。

Runner 的输入中不得包含 GitHub access token。

## 2. 公共接口

```ts
export type OcrRunnerErrorCode =
    | 'OCR_INVALID_INPUT'
    | 'OCR_CLI_NOT_FOUND'
    | 'OCR_SPAWN_FAILED'
    | 'OCR_TIMEOUT'
    | 'OCR_EXECUTION_FAILED'
    | 'OCR_OUTPUT_MISSING'
    | 'OCR_OUTPUT_READ_FAILED';

export interface RunOcrReviewInput {
    repoDir: string;
    baseRef: string;
    headRef: string;
    timeoutMs?: number;
}

export interface OcrRunResult {
    rawOutput: string;
    exitCode: 0;
    stderr: string;
    durationMs: number;
}

export class OcrRunnerError extends Error {
    code: OcrRunnerErrorCode;
    exitCode?: number;
    diagnostics?: string;
}

export async function runOcrReview(
    input: RunOcrReviewInput,
): Promise<OcrRunResult>;
```

实现时应提供依赖注入点，允许测试覆盖入口解析、`spawn`、临时目录创建和时钟，避免单元测试
真的启动 OCR CLI。

## 3. OCR 入口解析

按以下顺序解析 OCR CLI 入口：

1. `OCR_CLI_ENTRY` 环境变量。
   - 相对路径以 `process.cwd()` 为基准解析。
   - 文件必须存在，否则返回 `OCR_CLI_NOT_FOUND`。
2. 项目本地依赖：

```ts
require.resolve('@alibaba-group/open-code-review/bin/ocr.js');
```

3. 仅当前两步失败时，回退到全局 npm 安装目录探测入口。

所有解析路径在执行前都必须做可读性检查。入口不存在、无法解析或不可读时统一返回
`OCR_CLI_NOT_FOUND`，不得退化成 `shell: true` 或直接 `spawn('ocr')`。

## 4. 输入校验

启动进程前必须完成以下校验：

- `repoDir` 非空、存在且为目录；
- `baseRef` 与 `headRef` 非空；
- ref 不以 `-` 开头，避免被 CLI 解释为选项；
- `timeoutMs` 若提供，必须是正有限整数。

任何校验失败都返回 `OCR_INVALID_INPUT`，且不得创建子进程或临时输出目录。

## 5. CLI 调用协议

每次调用固定使用以下参数：

```text
review
--from <baseRef>
--to <headRef>
--format json
--audience agent
--output <临时输出文件>
--color never
```

实际调用方式固定为：

```ts
spawn(process.execPath, [ocrEntry, ...args], {
    cwd: repoDir,
    shell: false,
    windowsHide: true,
});
```

约束：

- 不通过 shell 拼接命令；
- 不直接执行 `ocr.cmd` 或 `ocr.ps1`；
- 不从 stdout 推断完整 JSON；
- 每次调用使用独立输出文件，防止并发调用互相覆盖；
- 默认继承当前进程环境，但不得向环境或参数中额外注入 GitHub token。

## 6. 超时与进程终止

进程级超时配置为：

```text
PRVIEWER_OCR_TIMEOUT_MS
```

默认值为 `900000`，即 15 分钟。环境变量缺失、非正整数或解析失败时使用默认值。

超时后必须终止完整 OCR 子进程树：

- Windows：使用 `taskkill /PID <pid> /T /F`，参数以数组传入且 `shell: false`；
- 非 Windows：终止子进程所属进程组，必要时升级为 `SIGKILL`。

终止完成后返回 `OCR_TIMEOUT`。超时错误优先于子进程稍后返回的非零退出码。

## 7. 输出、读取与清理

Runner 为每次调用创建独立临时目录：

```text
<os.tmpdir()>/prviewer-ocr-<random>/result.json
```

执行步骤：

1. 创建临时目录；
2. 将 `result.json` 作为 `--output`；
3. 等待子进程结束；
4. 仅在退出码为 0 时读取输出；
5. 使用 UTF-8 读取，去除 BOM；
6. 在 `finally` 中递归删除本次临时目录。

错误处理：

- 退出码非 0：`OCR_EXECUTION_FAILED`；
- 退出码为 0 但文件不存在或为空：`OCR_OUTPUT_MISSING`；
- 文件存在但读取失败：`OCR_OUTPUT_READ_FAILED`；
- JSON 非法或字段不符合契约：Runner 不负责判断，由 OCR parser 返回 `OcrContractError`。

`rawOutput` 只在内存中传递给 parser，不得写回临时目录或 MongoDB。

## 8. 诊断与安全

- stdout/stderr 仅用于诊断，最大保留 64 KiB；
- 超出限制时保留尾部，并附加明确的截断标记；
- 日志可以记录入口路径、退出码、耗时和截断后的 stderr；
- 日志禁止记录 token、用户 OCR 配置、完整 OCR JSON 或完整消息上下文；
- 对外错误只暴露稳定错误码和安全消息；
- 原始异常和诊断信息只写服务端日志。

## 9. 错误判定顺序

同一次执行出现多个问题时，按以下优先级分类：

1. `OCR_INVALID_INPUT`；
2. `OCR_CLI_NOT_FOUND`；
3. `OCR_SPAWN_FAILED`；
4. `OCR_TIMEOUT`；
5. `OCR_EXECUTION_FAILED`；
6. `OCR_OUTPUT_MISSING`；
7. `OCR_OUTPUT_READ_FAILED`。

`spawn` 的 `ENOENT` 映射为 `OCR_CLI_NOT_FOUND`；其他启动错误映射为
`OCR_SPAWN_FAILED`。

## 10. 测试矩阵

| 场景 | 预期 |
|------|------|
| `OCR_CLI_ENTRY` 指向有效入口 | 使用该入口，不解析本地依赖 |
| 无环境变量且本地依赖存在 | 使用本地 `ocr.js` |
| 本地依赖缺失、全局安装存在 | 使用全局入口 |
| 所有入口均不存在 | `OCR_CLI_NOT_FOUND` |
| `repoDir` 或 ref 非法 | `OCR_INVALID_INPUT`，不启动进程 |
| 正常退出并生成 UTF-8 JSON | 返回原始 JSON、退出码 0、stderr、耗时 |
| CLI 参数断言 | 参数、顺序、cwd、`shell` 和 `windowsHide` 完全符合本文 |
| 退出码非 0 | `OCR_EXECUTION_FAILED` |
| 超时 | 终止完整进程树并返回 `OCR_TIMEOUT` |
| spawn 返回 `ENOENT` | `OCR_CLI_NOT_FOUND` |
| spawn 返回其他错误 | `OCR_SPAWN_FAILED` |
| 退出码 0 但无输出文件 | `OCR_OUTPUT_MISSING` |
| 输出文件读取失败 | `OCR_OUTPUT_READ_FAILED` |
| stderr 超过 64 KiB | 只保留尾部并带截断标记 |
| 成功或失败路径 | 临时目录均被清理 |

Runner 单元测试默认使用 fake spawn；真实 OCR smoke test 只在显式配置了可用 provider 的环境
中手动运行，不纳入普通单元测试。
