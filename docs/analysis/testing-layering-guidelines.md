# Bruno 自动化测试分层规范

## 1. 目的

本文为 Bruno 仓库定义统一的测试分层规范，解决以下问题：

- 新增功能时，应该补哪一层测试
- 什么时候写 unit，什么时候写 E2E
- 如何避免把所有回归都压到 Playwright
- 如何让 CI 执行层次与测试层次对齐

本文基于仓库当前真实结构编写，不是抽象测试教材。

## 2. 当前测试入口

### 2.1 本地/根脚本入口

- `npm run test:e2e`
- `npm run test:e2e:ssl`
- `npm run test:e2e:auth`
- 各 workspace package 的 `npm test`

### 2.2 CI 入口

主 workflow `tests.yml` 当前已分成 3 类：

- `unit-test`
- `cli-test`
- `e2e-test`

额外专项 workflow：

- `auth-tests.yml`
- `ssl-tests.yml`
- `flaky-test-detector.yml`

这说明仓库已经天然适合“分层测试”治理，而不是单一回归流。

## 3. 分层定义

建议 Bruno 测试体系统一分为 5 层。

### 3.1 Unit

定义：验证单一函数、类、解析器、转换器、算法、轻量运行时逻辑，不依赖真实 GUI、不依赖完整进程链路。

适用对象：

- schema 校验
- URL / query / interpolation 工具
- auth 签名算法
- converter 纯转换逻辑
- Cookie / proxy / agent cache / PAC 解析工具
- `bru` API 运行时对象
- filestore 格式解析与序列化

仓库中的典型位置：

- `packages/bruno-common/src/**/*.spec.ts`
- `packages/bruno-requests/src/**/*.spec.ts`
- `packages/bruno-js/tests/*.spec.js`
- `packages/bruno-converters/tests/**/*.spec.js`
- `packages/bruno-schema/src/**/*.spec.js`
- `packages/bruno-toml/tests/*.spec.js`

### 3.2 Integration

定义：验证单包内或少量模块之间的协作，允许访问文件系统、模拟 IPC、临时目录、mock 网络，但不走完整用户界面。

适用对象：

- Electron IPC handler 与 store / filesystem 的协作
- CLI 命令与 runner / env / reporter 的协作
- filestore 与 schema / lang 的协作
- OpenAPI sync 的 diff / apply 逻辑
- workspace 配置读写与恢复逻辑

仓库中的典型位置：

- `packages/bruno-electron/src/store/tests/*`
- `packages/bruno-electron/src/ipc/**/*.spec.*`
- `packages/bruno-cli/tests/**/*`
- 后续建议新增的 `packages/bruno-filestore/tests/**/*`

### 3.3 UI Component

定义：验证 React 组件或页面在 provider/store 包裹下的渲染、交互、状态切换，不启动 Electron。

适用对象：

- 请求编辑表单
- 环境选择器
- 侧边栏交互
- 响应格式切换
- Preferences 表单
- WelcomeModal
- OpenAPISyncTab

仓库现状：

- `bruno-app` 已有 Jest 入口，但当前以 util 测试为主，组件级体系不足

建议位置：

- `packages/bruno-app/src/components/**/__tests__/*`
- 或 `packages/bruno-app/src/components/**/*.spec.jsx?`

### 3.4 E2E

定义：从真实入口触发，走完整用户路径，验证 Electron + Renderer + IPC + 文件系统 + 网络链路的真实协同。

适用对象：

- 新建工作区到请求发送的完整流程
- 默认工作区迁移与恢复
- WebSocket / gRPC / GraphQL / SSL / Proxy 等端到端场景
- 偏好设置、快捷键、Onboarding、标签页行为

仓库中的典型位置：

- `tests/**/*.spec.ts`
- `playwright/`

### 3.5 Smoke

定义：为 PR 门禁准备的高价值、短时长、低脆弱性场景集合。Smoke 不是新框架，而是从 unit / integration / E2E 中选出的“关键子集”。

适用对象：

- App 启动
- 默认工作区可用
- 创建集合与发送简单请求
- 环境选择生效
- Runner 报表输出

建议从现有目录中选取：

- `tests/start`
- `tests/workspace/default-workspace`
- `tests/request/settings`
- `tests/runner`
- `tests/environments`

## 4. 层级选择规则

新增功能或修复缺陷时，按以下顺序判断。

### 4.1 先问：问题属于哪一层

如果是纯数据或算法逻辑：

- 先写 Unit

如果是模块协作、文件写入、IPC 输入输出：

- 先写 Integration

如果是 React UI 交互、渲染分支、组件状态：

- 先写 UI Component

如果是用户能直接感知的完整流程：

- 补 E2E

### 4.2 默认组合策略

对于 Bruno 这种桌面 API 工具，推荐默认组合如下：

- 纯逻辑改动：`Unit`
- 模块边界改动：`Unit + Integration`
- UI 交互改动：`UI Component + 必要时 E2E`
- 高风险主路径改动：`Integration + E2E`
- 跨协议能力改动（SSL / Proxy / OAuth / gRPC / WS）：`Unit + Integration + 专项 E2E`

### 4.3 不推荐的做法

- 不要仅靠 E2E 验证纯函数或解析逻辑
- 不要为了一个字段校验去写全链路 Electron 测试
- 不要把稳定性差的超长链路场景作为唯一回归保障
- 不要在多个层级重复测试同一细粒度断言

## 5. 仓库级测试职责映射

| 领域 | 首选层级 | 次选层级 | 说明 |
| --- | --- | --- | --- |
| `bruno-common` 工具 | Unit | 无 | 应保持纯工具测试为主 |
| `bruno-converters` | Unit | Integration | 导入/导出转换逻辑优先单元测试 |
| `bruno-js` 运行时 | Unit | Integration | 脚本 API、断言、sandbox 适合单元优先 |
| `bruno-requests` | Unit | Integration / E2E | auth、proxy、grpc、cookies 要先测底层 |
| `bruno-filestore` | Unit | Integration | 当前缺口较大，应补文件格式回归 |
| `bruno-cli` | Integration | Unit / E2E | 命令级行为更重要 |
| `bruno-electron` IPC/store | Integration | E2E | 不应只依赖 Playwright |
| `bruno-app` 组件 | UI Component | E2E | 当前最需要补的是这一层 |
| 工作区恢复/迁移 | Integration | E2E | 当前 E2E 强，Integration 偏弱 |

## 6. 缺陷修复时的补测规则

建议以后统一遵循以下规则。

### 6.1 修纯逻辑 Bug

- 必须补对应 Unit
- 如果该逻辑已被多个上层消费，可补一个 Integration

### 6.2 修 IPC / 文件系统 Bug

- 必须补 Integration
- 如果用户能通过 UI 直接触发该问题，补一个 E2E 回归

### 6.3 修 UI Bug

- 必须补 UI Component
- 若涉及完整交互链路、状态持久化、主进程行为，则再补 E2E

### 6.4 修协议相关 Bug

- 先补底层 Unit / Integration
- 再补一条真实协议场景的专项 E2E

### 6.5 修 flaky E2E

- 优先判断是否应该下沉到更低层
- 如果必须保留 E2E，重构 selector、等待策略和 fixture，而不是简单增加 sleep

## 7. 推荐的 CI 分层执行策略

结合当前 workflow，建议固化为以下策略。

### 7.1 PR Smoke

目标：10 到 20 分钟内给出高置信度反馈。

建议包含：

- 全量 Unit 中的关键包
- CLI 集成冒烟
- 少量高价值 Playwright E2E

建议重点包：

- `bruno-common`
- `bruno-js`
- `bruno-requests`
- `bruno-converters`
- `bruno-electron`

### 7.2 Main / Merge Regression

目标：覆盖主线合并质量。

建议包含：

- 当前 `tests.yml` 中的 unit-test、cli-test、e2e-test

### 7.3 专项回归

目标：覆盖重依赖场景。

当前已经存在专项流，建议保留并持续增强：

- `auth-tests.yml`
- `ssl-tests.yml`

未来可考虑新增：

- `proxy-tests.yml`
- `openapi-sync-tests.yml`

### 7.4 Nightly Full

目标：跑慢测试、长链路、多平台协议场景。

建议包含：

- 全量 Playwright
- 专项 auth / ssl / proxy
- 大型导入转换样例
- 历史 flaky 重点回归集

## 8. 稳定性规范

### 8.1 Selector 规范

优先级建议：

1. `data-testid`
2. `getByRole`
3. `getByLabel`
4. `getByText`
5. CSS 类选择器仅作最后手段

### 8.2 等待规范

- 禁止固定长时间 `sleep`
- 优先等待可见性、状态变更、响应完成、文件落盘
- Electron / Playwright 中尽量复用已有 fixture 能力

### 8.3 测试数据隔离

- 每个测试使用独立的临时 workspace 或 userData
- 避免跨测试共享可变目录
- 可重用样例数据，但不能共享运行时状态

### 8.4 失败产物

建议保留并扩展：

- Playwright trace
- HTML 报告
- JSON 报告
- 失败时用户数据快照
- 关键配置文件快照

## 9. 近期最值得补的层级

结合当前现状，近期优先级如下：

1. `bruno-app` UI Component
2. `bruno-electron` Integration
3. `bruno-cli` Integration
4. `bruno-filestore` Unit + Integration

## 10. 结论

Bruno 当前不是缺测试，而是缺“统一的分层规则”。后续新增测试应严格回答两个问题：

- 这个问题最低成本、最高稳定性的验证层级是什么
- 哪一层才是它的主要归属

只要把这一层规范坚持住，后续测试增长就不会继续偏向“只会加 E2E”。
