# Bruno 项目自动化测试建设方案

## 1. 目标

本文回答两个问题：

- 当前仓库已有怎样的自动化测试基础
- 若要把 Bruno 的测试体系做成可持续扩展的工程能力，还需要补哪些功能模块

目标不是推翻现有测试，而是在现有 Playwright + Jest 基础上补齐“分层、标准化、覆盖矩阵、CI 门禁、公共基建”。

## 2. 当前测试现状

## 2.1 已有测试框架

仓库已经具备两类主测试能力：

- E2E：`playwright.config.ts` + `playwright/` + `tests/`
- 单元/集成：各 package 内的 Jest 测试

现有根脚本中已存在：

- `npm run test:e2e`
- `npm run test:e2e:ssl`
- `npm run test:e2e:auth`
- 部分子包的 `npm test`

## 2.2 Playwright 现状

当前 Playwright 已经具备：

- Electron App 启动封装
- 测试用临时目录与用户数据目录 fixture
- Trace、HTML、JSON 报告
- 默认 / auth / ssl 三类项目划分
- 配套测试服务 `packages/bruno-tests`

`tests/` 已覆盖的功能域较广，包括：

- 工作区
- 集合
- 请求设置
- 响应展示
- Runner
- 环境与变量
- 脚本错误
- WebSocket
- GraphQL
- gRPC
- Proxy
- SSL
- Cookies
- 偏好设置
- 快捷键
- Onboarding
- DevTools

这说明项目已有较强 E2E 基础，不属于“从零建设”。

## 2.3 包级测试现状

当前已有明显测试沉淀的包：

- `bruno-cli`
- `bruno-common`
- `bruno-converters`
- `bruno-electron`
- `bruno-js`
- `bruno-query`
- `bruno-requests`
- `bruno-schema`
- `bruno-toml`
- `bruno-app`（仅部分工具与 util，组件测试不足）

当前测试薄弱或未形成体系的包：

- `bruno-filestore`
- `bruno-graphql-docs`
- `bruno-lang`
- `bruno-schema-types`

## 2.4 当前体系的优点

- 已覆盖大量真实用户路径
- Electron 测试基建已经可复用
- CLI 和底层库已有不少单元测试
- 特殊场景已考虑到：SSL、Proxy、OAuth、Workspace Recovery、脚本错误

## 2.5 当前体系的主要缺口

- 缺统一的测试分层规范，很多测试“存在”，但没有统一边界
- 缺功能覆盖矩阵，无法快速回答“某个功能到底测到哪一层”
- `bruno-app` 缺系统化组件测试与页面级集成测试
- 若干底层包有能力但无成体系测试门禁
- 缺覆盖率要求与质量门槛
- 缺按 PR / nightly / full regression 的分层执行策略
- 缺更标准的测试数据工厂与场景复用机制

## 3. 为项目补齐自动化测试能力，建议新增的功能模块

以下“功能模块”是测试体系建设模块，不是业务功能模块。

### 3.1 测试分层规范模块

目标：明确每种测试该测什么，不该测什么。

建议定义 4 层：

- Unit：纯函数、解析器、转换器、schema、runner 工具
- Integration：单包内多个模块协作，如 filestore + schema、requests + auth、electron ipc + store
- E2E：从 UI/CLI 入口走完整真实流程
- Smoke：PR 必跑核心路径，时长可控

建议输出一份统一约定文档，例如：

- 哪类问题优先写 unit
- 哪类问题必须写 E2E
- 哪类 UI 变更必须补组件测试

### 3.2 功能覆盖矩阵模块

目标：让测试建设从“目录堆积”变成“按功能治理”。

建议建立一张覆盖矩阵，按以下维度记录：

- 功能域
- 用户影响级别
- 核心模块
- 当前测试层级
- 当前覆盖状态
- 必补测试类型

示例条目：

| 功能域 | 核心模块 | 当前覆盖 | 缺口 |
| --- | --- | --- | --- |
| 工作区恢复 | `bruno-electron` | E2E 强 | 缺 store / IPC 边界集成测试 |
| 请求编辑 UI | `bruno-app` | E2E 中等 | 缺组件测试 |
| OpenAPI 同步 | `bruno-electron` + `bruno-app` | 可能偏弱 | 缺 diff/apply 分层测试 |
| Filestore | `bruno-filestore` | 弱 | 缺单元+回归样例 |

### 3.3 公共 Fixtures 与 Test Data Factory 模块

目标：降低测试编写成本，提高稳定性。

建议新增统一测试工厂，覆盖：

- 临时 workspace 工厂
- collection 工厂
- request 工厂（HTTP / WS / gRPC / GraphQL）
- environment 工厂
- SSL 证书与 proxy 配置工厂
- 初始化用户数据工厂
- 示例响应与 mock 数据工厂

优先落地位置建议：

- `tests/utils/` 扩展 E2E fixtures
- 各 package 增加 `test-utils/` 或 `tests/helpers/`

### 3.4 UI 组件测试模块

目标：补齐 `bruno-app` 的中间层测试，避免所有 UI 回归都压到 E2E。

建议新增：

- React Testing Library + Jest 组件测试规范
- 关键组件的渲染、交互、状态切换测试
- 页面级集成测试，验证 Redux/store/provider 协同

优先组件：

- `RequestPane`
- `ResponsePane`
- `Environments`
- `Sidebar`
- `WorkspaceSidebar`
- `Preferences`
- `OpenAPISyncTab`
- `WelcomeModal`

### 3.5 Electron 主进程 / IPC 集成测试模块

目标：把高风险桌面逻辑从纯 E2E 中下沉一层。

建议补测试的重点模块：

- `ipc/workspace.js`
- `ipc/collection.js`
- `ipc/openapi-sync.js`
- `ipc/network/index.js`
- `store/default-workspace.js`
- `store/global-environments.js`
- `store/workspace-environments.js`

重点验证：

- IPC 输入输出契约
- 文件写入与恢复逻辑
- 异常路径
- 并发与锁
- 路径规范化与跨平台行为

### 3.6 CLI 集成测试模块

目标：把 `bru run`、`bru import` 的稳定性从局部单元测试提升到命令级验证。

建议新增命令级集成测试：

- `bru run` 基础执行
- `--env` / `--env-file` / `--global-env`
- `--tests-only`
- `--bail`
- `--tags` / `--exclude-tags`
- `--cacert` / `--ignore-truststore`
- `--client-cert-config`
- `--noproxy`
- 报表输出 JSON / HTML / JUnit
- `bru import openapi`
- `bru import wsdl`

这类测试建议使用临时目录与固定 fixtures，不依赖 GUI。

### 3.7 Mock 服务与协议仿真模块

目标：减少对外部真实服务的依赖，提高回归稳定性。

建议补齐或标准化以下 mock 服务能力：

- HTTP mock 服务
- WebSocket mock 服务
- GraphQL mock 服务
- gRPC mock 服务
- SSE mock 服务
- 自签名 SSL 服务
- Proxy / PAC 场景模拟
- OAuth 模拟授权端点

现有 `packages/bruno-tests` 可以作为统一承载点继续增强。

### 3.8 测试稳定性增强模块

目标：减少 flaky tests。

建议统一：

- 选择器规范：优先 `data-testid` / role / label
- 等待策略：禁止任意 sleep，统一使用稳定状态等待
- 目录隔离：每个测试独立 user data / workspace / collection
- 失败产物：trace、截图、日志、环境快照
- 长链路分解：把超长 E2E 拆成更稳定的场景用例

### 3.9 覆盖率与质量门禁模块

目标：让“有测试”变成“可度量、可卡口”。

建议增加：

- Jest 覆盖率采集与聚合
- 关键包覆盖率基线
- PR 门禁最小阈值
- 高风险目录变更时的必跑测试规则

建议优先纳入门禁的包：

- `bruno-requests`
- `bruno-js`
- `bruno-electron`
- `bruno-converters`
- `bruno-common`

### 3.10 CI 编排模块

目标：让测试运行策略与开发节奏匹配。

建议分为 3 档：

- PR Smoke
  - 关键 unit
  - 关键 integration
  - 少量高价值 E2E
- Main / Merge Regression
  - 全量 unit + integration
  - 常规 E2E
- Nightly Full
  - 含 auth / ssl / proxy / 大样例导入 / 长链路场景

### 3.11 测试文档与贡献者模板模块

目标：降低新人补测试的门槛。

建议补充：

- 测试目录命名规范
- 新增测试模板
- UI 测试最佳实践
- CLI 测试最佳实践
- fixture 复用方式
- 常见 flaky 问题处理手册

## 4. 推荐的目标测试架构

## 4.1 目录层级建议

建议保留现有结构并增强，不做激进迁移：

- `tests/`
  - 保留 E2E 主目录
  - 按功能域继续扩展
- `playwright/`
  - 继续承载 Electron fixtures、启动逻辑、trace 包装
- `packages/*/tests` 或 `src/**/*.spec.*`
  - 继续承载单元/集成测试
- `packages/bruno-app/src/test-utils`
  - 补齐 UI 组件测试基建
- `tests/utils/factories`
  - 新增跨场景数据工厂

## 4.2 测试层与包的推荐映射

| 层级 | 主要对象 | 代表包/目录 |
| --- | --- | --- |
| Unit | 解析、转换、schema、插值、认证算法 | `bruno-common` `bruno-converters` `bruno-js` `bruno-requests` `bruno-schema` |
| Integration | filestore、IPC、store、OpenAPI sync、runner | `bruno-electron` `bruno-filestore` `bruno-cli` |
| UI Component | 组件与页面交互 | `bruno-app` |
| E2E | 真实桌面用户路径 | `tests/` |
| Smoke | 高频核心链路 | `tests/start` `tests/workspace` `tests/request` `tests/runner` 的精选子集 |

## 5. 优先级实施路线

### 阶段 1：先补“治理层”

先做这些，不改动现有测试思路：

- 建立测试分层规范文档
- 建立功能覆盖矩阵
- 统一 PR / merge / nightly 执行策略
- 增强公共 fixtures 与测试数据工厂

原因：这些投入能立刻提高新增测试的一致性。

### 阶段 2：补高风险缺口

优先补以下模块的测试：

- `bruno-app` 核心组件测试
- `bruno-electron` 的 workspace / collection / openapi-sync IPC 集成测试
- `bruno-cli` 命令级集成测试
- `bruno-filestore` 文件格式回归测试

### 阶段 3：建立门禁

在第二阶段稳定后引入：

- 覆盖率采集
- 关键目录变更的必跑规则
- smoke 回归门禁

### 阶段 4：优化稳定性与执行效率

- 缩短长 E2E
- 优化 mock 服务复用
- 追踪 flaky case
- 拆分慢测试与夜间测试

## 6. 推荐优先补测的功能域

结合产品风险与当前仓库形态，建议优先顺序如下：

1. 工作区恢复、迁移、排序、环境管理
2. 请求发送链路中的认证、代理、SSL、Cookie
3. 环境变量、插值、脚本运行时
4. OpenAPI 同步与导入转换
5. `bruno-app` 请求编辑与响应展示组件
6. CLI 报表与批量执行

## 7. 具体建议新增的测试模块清单

下面这份清单可直接作为后续实施 backlog：

- `测试分层规范模块`
- `功能覆盖矩阵模块`
- `跨场景 fixture / factory 模块`
- `UI 组件测试模块（bruno-app）`
- `Electron IPC 集成测试模块`
- `CLI 命令级集成测试模块`
- `协议 mock 服务模块`
- `稳定性治理模块`
- `覆盖率与质量门禁模块`
- `CI 分层编排模块`
- `测试文档与模板模块`

## 8. 验收标准

当测试体系建设达到以下状态时，可认为方案落地有效：

- 新增功能能明确归类到某个测试层级
- 关键功能域都有“功能 -> 模块 -> 测试”映射
- `bruno-app` 不再主要依赖 E2E 才能发现 UI 回归
- `bru run` / `bru import` 有命令级集成保障
- PR 阶段有稳定的 smoke 门禁
- 夜间回归可覆盖 SSL / auth / proxy / import 等重场景
- flaky case 有定位手段和治理流程

## 9. 结论

Bruno 当前最大的测试问题不是“没有测试”，而是“缺少统一治理层，导致测试资产难以被系统化复用”。因此，后续建设不应只继续堆 E2E，而应补齐以下中间能力：

- 分层规范
- 覆盖矩阵
- `bruno-app` 组件测试
- Electron IPC 集成测试
- CLI 集成测试
- mock 服务与 CI 门禁

这套方案能在不推翻现有体系的前提下，把项目测试能力从“已有较多回归用例”升级为“可持续扩展的工程化质量体系”。
