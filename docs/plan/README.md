# PRviewer → Harness Agent：计划文档

> 目标：把当前“单次 LLM 调用的 PR 评审工具”升级为可写进简历的 **harness agent 项目**。
> 最终对齐的 7 个特性见 [ocr-harness-roadmap.md](./ocr-harness-roadmap.md) 第 1 节。

## 一句话决策

- **底座**：采用 [alibaba/open-code-review](https://github.com/alibaba/open-code-review)（OCR，Apache-2.0）作为评审引擎，因为它已经实现了“确定性工程 × Agent 混合架构”、工具调用循环、行级定位与反思、评测基准，与我们目标完全重合。
- **改造方式**：保留现有 React 19 + Express 5 + MongoDB 的全栈骨架，不重写；只把 `analyzerService` 背后的“单次 LLM 调用”替换为“OCR 引擎适配层”，再补规则落库、状态机、回写 GitHub、评测 harness。
- **快速开发约束**：每个阶段都可独立交付、可回滚、有验收标准，优先做“简历可见、工作量小”的能力。

## 文档清单

| 文档 | 内容 |
|------|------|
| [ocr-harness-roadmap.md](./ocr-harness-roadmap.md) | 主计划：目标架构、阶段划分、开发先后顺序、验收标准、风险 |
| [agent-refactor.md](./agent-refactor.md) | 早前的背景调研与候选开源项目对比（保留作决策依据） |
| [deployment-and-workspace.md](./deployment-and-workspace.md) | 部署与工作区设计：临时 clone 放哪、前端/后端/OCR 如何访问 |

## 目标能力清单（7 项）

1. 目标与计划（goal & plan）
2. 工具调用循环（tool-use loop）
3. 工具注册表（tool registry）
4. 步骤级状态机与持久化（state machine）
5. 确定性工程约束（deterministic guardrails / 规则引擎）
6. 可观测性（observability / trace）
7. 评测 harness（eval）

> 当前项目约 1.5/7：已有任务级状态机（算半条），其余基本缺失。
