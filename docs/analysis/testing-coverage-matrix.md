# Bruno 功能覆盖矩阵

## 1. 目的

本文把 Bruno 的核心功能域映射到源码模块、现有测试层级、风险等级与建议补强方向，用于：

- 扩展功能时快速定位应改动和应补测的位置
- 判断哪些能力已经有较强回归
- 判断哪些能力虽然存在测试，但测试层次失衡

状态说明：

- `强`：已有较明确、较系统的回归
- `中`：已有测试，但层级不完整或覆盖不均
- `弱`：功能存在，但自动化保障薄弱

## 2. 覆盖矩阵

| 功能域 | 主要模块 | 当前测试层级 | 当前覆盖 | 风险 | 主要缺口 | 建议优先补强 |
| --- | --- | --- | --- | --- | --- | --- |
| 默认工作区创建/迁移/恢复 | `bruno-electron/store/default-workspace` `ipc/workspace` | E2E、少量 Integration | 强 | 高 | IPC/store 边界集成不足 | Integration |
| 工作区创建/重命名/关闭/切换 | `bruno-app/ManageWorkspace` `bruno-electron/ipc/workspace` | E2E | 中 | 高 | UI 组件与 IPC 契约测试不足 | UI Component + Integration |
| 工作区环境管理 | `store/workspace-environments` `ipc/workspace` | E2E | 中 | 高 | 文件格式与边界条件覆盖偏弱 | Integration |
| 集合打开/删除/挂载工作区 | `ipc/collection` `ipc/workspace` | E2E | 中 | 高 | 主进程文件操作缺系统集成测试 | Integration |
| 集合树移动/拖拽/重排序号 | `bruno-app/Sidebar` `electron/ipc/collection` | E2E、少量 Unit | 中 | 高 | 跨格式/跨集合边界仍偏依赖 E2E | UI Component + Integration |
| 草稿、标签页、Transient/Scratch Request | `RequestTabs` `collection IPC` | E2E | 中 | 中 | UI 状态测试不足 | UI Component |
| HTTP 请求编辑 | `RequestPane` `EditableTable` `prepare-request` | E2E、Unit | 中 | 高 | 组件级交互测试不足 | UI Component |
| GraphQL 请求与文档 | `bruno-graphql-docs` `network IPC` | E2E | 中 | 中 | docs/explorer 基本无组件与库级测试 | UI Component + Unit |
| gRPC 请求 | `bruno-requests/grpc` `network IPC` | Unit、E2E | 中 | 高 | 主进程集成与 UI 编辑测试不足 | Integration |
| WebSocket 请求 | `bruno-requests/ws` `ws IPC` | E2E、少量 Unit | 中 | 高 | 连接状态与消息流缺更多底层测试 | Integration |
| SSE | `network IPC` `request/response UI` | E2E | 弱 | 中 | 缺分层测试 | Integration |
| OpenAPI 同步 | `ipc/openapi-sync` `OpenAPISyncTab` | 代码存在，回归未知/偏弱 | 弱 | 高 | 缺 diff/apply 的系统化自动化保障 | Integration + UI Component |
| 导入 OpenAPI/WSDL | `bruno-cli/import` `bruno-converters` | Unit、E2E | 中 | 中 | CLI 命令级验证还不够系统 | CLI Integration |
| Postman/Insomnia/OpenCollection 转换 | `bruno-converters` | Unit | 强 | 中 | 缺少 end-to-end 导入回归矩阵 | Integration |
| Filestore `.bru` / `yml` / dotenv` | `bruno-filestore` | 入口具备，测试弱 | 弱 | 高 | 缺独立回归体系 | Unit + Integration |
| 环境变量与全局环境 | `Environments` `global-environments IPC` | E2E、Unit | 中 | 高 | UI 与文件层之间缺集成保障 | Integration + UI Component |
| 变量插值 | `bruno-common` `cli/interpolate-vars` `bruno-js` | Unit、E2E | 强 | 高 | 多协议场景矩阵还可加强 | Integration |
| Prompt Variables | `bruno-common` `cli/run-single-request` | Unit、E2E | 中 | 中 | GUI 与 CLI 分支行为未统一矩阵化 | Integration |
| `.env` 读写与 watcher | `dotenv-watcher` `filestore/common utils` | E2E、Unit | 中 | 中 | watcher 边界和编码场景不足 | Integration |
| `bru.setEnvVar` 持久化 | `bruno-js` runtime `runner` | Unit、E2E | 中 | 高 | runner 持久化链路缺命令级集成测试 | CLI Integration |
| Pre-request / Post-response / Tests 脚本 | `bruno-js/runtime` `collection utils` | Unit、E2E | 中 | 高 | 元数据、报错、脚本拼接缺更多集成回归 | Integration |
| `bru` API 运行时对象 | `bruno-js` | Unit | 强 | 高 | 与真实 runner 的协同还可增强 | Integration |
| JS Sandbox（safe/developer） | `bruno-js/sandbox` `cli/run` | Unit、E2E | 中 | 高 | CLI 命令级覆盖不足 | CLI Integration |
| Runner 递归/跳转/bail/tests-only | `bruno-cli/run` `common/runner` | CLI、E2E | 中 | 高 | 参数组合矩阵不完整 | CLI Integration |
| 报表输出 JSON/JUnit/HTML | `bruno-cli/reporters` | CLI、E2E | 中 | 中 | 多组合参数和脱敏规则需系统验证 | CLI Integration |
| 响应格式化与预览 | `ResponsePane` `ResponseExample` | E2E | 中 | 中 | 缺组件层渲染回归 | UI Component |
| 大响应保护 | `network IPC` `response UI` | E2E | 中 | 高 | 缺底层性能/边界测试 | Integration |
| Cookie 管理 | `bruno-requests/cookies` `store/cookies` | Unit、E2E | 中 | 高 | Electron store / IPC 协调仍偏弱 | Integration |
| 认证 OAuth1/OAuth2/Digest/AWSV4/NTLM | `bruno-requests/auth` `electron/oauth2` | Unit、专项 E2E、专项 workflow | 强 | 高 | UI 授权流程仍可加组件/集成测试 | Integration |
| Proxy / System Proxy / PAC | `bruno-requests/network/system-proxy` | Unit、E2E | 中 | 高 | Electron 偏好与系统代理联动偏弱 | Integration |
| SSL / 自定义 CA / 客户端证书 | `network IPC` `requests/utils` | CLI、E2E、专项 workflow | 强 | 高 | 组件级设置测试不足 | UI Component |
| Preferences / Zoom / Window State | `Preferences` `store/preferences` `index.js` | E2E | 中 | 中 | store 层自动化不足 | Integration + UI Component |
| 快捷键 | `AppTitleBar` `renderer bindings` | E2E | 中 | 中 | 组件层验证不足 | UI Component |
| Welcome Modal / Sample Collection | `WelcomeModal` `app/onboarding` | E2E | 中 | 中 | UI 渲染与状态持久化缺组件/集成测试 | UI Component + Integration |
| DevTools / 性能监控 | `Devtools` `system-monitor` | E2E | 中 | 中 | 主进程监控逻辑缺集成验证 | Integration |
| Git Clone | `ipc/git` `utils/git` | 能力存在，测试未知/弱 | 弱 | 中 | 自动化保障不足 | Integration |
| 终端集成 | `ipc/terminal` | 能力存在，测试弱 | 弱 | 中 | 缺会话生命周期测试 | Integration |

## 3. 按包看缺口优先级

### 3.1 高优先级

- `packages/bruno-app`
  - 缺系统化 UI 组件测试
- `packages/bruno-electron`
  - 高风险逻辑很多，但中间层集成测试不够均衡
- `packages/bruno-filestore`
  - 文件格式能力关键，但缺成体系测试
- `packages/bruno-cli`
  - 命令级参数组合需要更完整矩阵

### 3.2 中优先级

- `packages/bruno-graphql-docs`
- `packages/bruno-schema-types`
- `packages/bruno-lang`

### 3.3 低优先级或维持现状

- `packages/bruno-common`
- `packages/bruno-converters`
- `packages/bruno-js`
- `packages/bruno-requests`

这些包已有较多单元测试，但仍需随着功能扩展补局部回归。

## 4. PR 必看清单

修改以下模块时，建议直接对照补测：

### 4.1 改动工作区/集合

至少检查：

- 是否需要补 `tests/workspace` 或 `tests/collection`
- 是否需要补 `bruno-electron` Integration

### 4.2 改动请求发送、认证、代理、SSL

至少检查：

- 是否先补 `bruno-requests` Unit
- 是否需要补 CLI Integration
- 是否需要补专项 E2E 或专项 workflow

### 4.3 改动前端交互

至少检查：

- 是否补了 `bruno-app` UI Component
- 是否真的需要新增 E2E

### 4.4 改动导入导出 / OpenAPI Sync / Filestore

至少检查：

- converter / filestore 单元回归
- 命令级或 IPC 集成测试
- 一条代表性端到端回归

## 5. 建议的近期补强顺序

### 第一批

- `bruno-app` 核心组件测试基建
- `bruno-filestore` 回归测试
- `bruno-electron` workspace / collection / openapi-sync 集成测试
- `bruno-cli` run/import 命令级集成测试

### 第二批

- GraphQL docs 组件测试
- Terminal / Git 集成测试
- Preferences / ResponsePane / Sidebar 组件测试

### 第三批

- 覆盖率门禁
- smoke 清单固化
- flaky case 专项治理台账

## 6. 结论

当前 Bruno 的自动化测试并不薄弱，但结构上明显存在“上层强、中层弱”的问题：

- E2E 很多
- Unit 也不少
- 缺的主要是 `bruno-app` 组件测试、`bruno-electron` 集成测试、`bruno-cli` 命令级集成测试、`bruno-filestore` 回归测试

后续如果按这份矩阵推进，测试建设会更接近“按产品功能治理”，而不是继续按目录被动补洞。
