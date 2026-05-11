# Bruno 项目功能盘点

## 1. 文档目的

本文用于快速建立 `bruno-main` 仓库的功能全景认知，方便后续做功能扩展、缺口分析与测试规划。盘点口径采用“产品功能 + 技术模块映射”，重点覆盖当前开源仓库中可见、可追踪、可验证的能力。

## 2. 项目概览

### 2.1 项目定位

Bruno 是一个以本地文件为中心的 API 探索与测试工具，核心形态包括：

- Electron 桌面应用
- React Web UI
- CLI 自动化执行工具
- 配套的解析、转换、文件存储、脚本运行时与请求执行基础库

### 2.2 Monorepo 结构

| 包/目录 | 作用 |
| --- | --- |
| `packages/bruno-app` | 前端 UI，负责请求编辑、响应展示、环境管理、工作区交互等 |
| `packages/bruno-electron` | Electron 主进程与 IPC，负责文件系统、窗口、网络、OAuth、工作区、终端等桌面能力 |
| `packages/bruno-cli` | `bru` 命令行入口，负责导入、运行、报表输出 |
| `packages/bruno-requests` | 请求执行基础能力，含认证、代理、Cookie、gRPC、WebSocket、网络代理等 |
| `packages/bruno-filestore` | `.bru` / `yml` / dotenv 等文件格式读写与转换 |
| `packages/bruno-converters` | OpenAPI / Postman / Insomnia / WSDL / OpenCollection 格式转换 |
| `packages/bruno-js` | 脚本运行时、`bru` API、断言与测试运行辅助对象 |
| `packages/bruno-common` | 公共 runner 汇总、标签、插值、URL 等工具 |
| `packages/bruno-schema` / `packages/bruno-schema-types` | 集合与请求数据结构定义与校验 |
| `tests` | Electron + UI 端到端回归测试 |
| `playwright` | Playwright Electron 测试基建与 fixtures |

### 2.3 当前支持的请求模型

从 `packages/bruno-schema-types/src/requests` 可见当前显式建模的请求类型包括：

- HTTP
- gRPC
- WebSocket

结合 `tests/graphql`、`tests/sse`、`packages/bruno-graphql-docs`、Electron network IPC，可确认项目还包含：

- GraphQL 请求与文档能力
- SSE 能力
- OpenAPI / API Spec 相关能力

## 3. 功能域盘点

以下列表按“用户可见功能域 -> 功能点 -> 技术模块映射 -> 现有证据”组织。

### 3.1 工作区管理

#### 3.1.1 默认工作区初始化与迁移

- 功能说明：首次启动自动创建默认工作区；从旧的 `lastOpenedCollections` 数据迁移到新工作区模型；异常时支持恢复。
- 主要模块：
  - `packages/bruno-electron/src/store/default-workspace.js`
  - `packages/bruno-electron/src/ipc/workspace.js`
  - `packages/bruno-electron/src/utils/workspace-config.js`
- 现有证据：
  - `tests/workspace/default-workspace/*.spec.ts`

#### 3.1.2 新建、打开、重命名、关闭工作区

- 功能说明：支持新建工作区、打开已有工作区、重命名工作区、关闭工作区。
- 主要模块：
  - `packages/bruno-app/src/components/ManageWorkspace`
  - `packages/bruno-electron/src/ipc/workspace.js`
- 现有证据：
  - `tests/workspace/create-workspace/create-workspace.spec.ts`

#### 3.1.3 工作区集合挂载与排序持久化

- 功能说明：工作区内部维护集合清单、排序、关闭标签后保持当前工作区上下文。
- 主要模块：
  - `packages/bruno-app/src/components/WorkspaceSidebar`
  - `packages/bruno-app/src/utils/workspaces/index.js`
  - `packages/bruno-electron/src/utils/workspace-config.js`
- 现有证据：
  - `tests/workspace/collection-reorder-persistence.spec.ts`
  - `tests/workspace/close-tab-stays-in-workspace.spec.ts`

#### 3.1.4 工作区文档与环境

- 功能说明：工作区支持文档内容与独立环境列表管理。
- 主要模块：
  - `packages/bruno-electron/src/ipc/workspace.js`
  - `packages/bruno-electron/src/store/workspace-environments.js`
- 现有证据：
  - IPC 中存在 `save-workspace-docs`、`load-workspace-environments`、`create/copy/update/delete workspace environment` 能力

#### 3.1.5 工作区导入导出

- 功能说明：工作区可导出 zip、导入 zip。
- 主要模块：
  - `packages/bruno-electron/src/ipc/workspace.js`
- 现有证据：
  - IPC 中存在 `export-workspace`、`import-workspace`

### 3.2 集合管理

#### 3.2.1 本地集合创建、打开、删除、导入

- 功能说明：集合保存在本地目录；支持打开单个或多个集合、删除集合、导入集合。
- 主要模块：
  - `packages/bruno-app/src/components/Sidebar`
  - `packages/bruno-electron/src/ipc/collection.js`
  - `packages/bruno-electron/src/app/collection-watcher.js`
- 现有证据：
  - `tests/collection/open/open-multiple-collections.spec.ts`
  - `tests/collection/delete/delete-collection.spec.ts`

#### 3.2.2 集合与工作区关联

- 功能说明：集合可挂载到工作区，也可从工作区移除。
- 主要模块：
  - `packages/bruno-electron/src/ipc/workspace.js`
  - `packages/bruno-electron/src/ipc/collection.js`
- 现有证据：
  - IPC 中存在 `add-collection-to-workspace`、`remove-collection-from-workspace`、`set-collection-workspace`

#### 3.2.3 集合文件监听与热更新

- 功能说明：桌面端监听集合文件变化、dotenv 变化、工作区变化并同步 UI。
- 主要模块：
  - `packages/bruno-electron/src/app/collection-watcher.js`
  - `packages/bruno-electron/src/app/workspace-watcher.js`
  - `packages/bruno-electron/src/app/dotenv-watcher.js`
- 现有证据：
  - `tests/dotenv/special-chars-collection-path/dotenv-special-chars.spec.ts`

#### 3.2.4 集合安全配置

- 功能说明：集合级安全配置单独存储，供脚本与运行时使用。
- 主要模块：
  - `packages/bruno-electron/src/store/collection-security.js`
  - `packages/bruno-electron/src/ipc/collection.js`
- 现有证据：
  - 多个 E2E 测试目录下提供 `collection-security.json` 初始化数据

#### 3.2.5 集合分享与压缩导入导出

- 功能说明：支持集合 zip 导出、zip 格式识别与导入。
- 主要模块：
  - `packages/bruno-app/src/components/ShareCollection`
  - `packages/bruno-electron/src/ipc/collection.js`
- 现有证据：
  - IPC 中存在 `export-collection-zip`、`is-bruno-collection-zip`、`import-collection-zip`

### 3.3 目录、请求与草稿管理

#### 3.3.1 新建请求、临时请求、未命名请求

- 功能说明：支持创建正式请求、Transient Request、Untitled Request、Scratch/Workspace Scratch。
- 主要模块：
  - `packages/bruno-app/src/components/CreateTransientRequest`
  - `packages/bruno-app/src/components/CreateUntitledRequest`
  - `packages/bruno-electron/src/ipc/collection.js`
- 现有证据：
  - `tests/transient-requests/transient-requests.spec.ts`
  - `tests/scratch-requests/scratch-requests.spec.ts`

#### 3.3.2 请求树编辑

- 功能说明：支持文件夹与请求移动、跨集合拖拽、跨格式移动、克隆、重排、序号维护。
- 主要模块：
  - `packages/bruno-app/src/components/Sidebar`
  - `packages/bruno-app/src/utils/tests/collections/items-sequencing.spec.js`
  - `packages/bruno-electron/src/ipc/collection.js`
- 现有证据：
  - `tests/collection/moving-requests/*`
  - `tests/collection/moving-tabs/move-tabs.spec.ts`
  - `tests/request/delete-request/delete-request-sequence-updation.spec.ts`

#### 3.3.3 草稿与标签页行为

- 功能说明：支持草稿状态、标签页关闭/移动、标签与上下文保持。
- 主要模块：
  - `packages/bruno-app/src/components/RequestTabs`
  - `packages/bruno-app/src/components/RequestTabPanel`
- 现有证据：
  - `tests/collection/draft/*.spec.ts`
  - `tests/collection/moving-tabs/move-tabs.spec.ts`

### 3.4 请求编辑能力

#### 3.4.1 HTTP 请求编辑

- 功能说明：编辑 URL、Method、Headers、Query、Path Params、Body、多种请求设置。
- 主要模块：
  - `packages/bruno-app/src/components/RequestPane`
  - `packages/bruno-app/src/components/BodyModeSelector`
  - `packages/bruno-app/src/components/EditableTable`
  - `packages/bruno-app/src/utils/url`
  - `packages/bruno-cli/src/runner/prepare-request.js`
- 现有证据：
  - `tests/request/settings/*`
  - `tests/request/encoding/curl-encoding.spec.ts`
  - `packages/bruno-app/src/utils/url/index.spec.js`

#### 3.4.2 GraphQL 请求编辑与文档能力

- 功能说明：支持 GraphQL schema 加载、GraphQL docs / explorer、GraphQL 相关请求工作流。
- 主要模块：
  - `packages/bruno-graphql-docs`
  - `packages/bruno-app/src/components/OpenAPISpecTab`
  - `packages/bruno-electron/src/ipc/collection.js`
  - `packages/bruno-electron/src/ipc/network/index.js`
- 现有证据：
  - `tests/graphql/*`
  - IPC 中存在 `load-gql-schema-file`、`fetch-gql-schema`

#### 3.4.3 gRPC 请求编辑与连接

- 功能说明：支持 gRPC 请求、proto / reflection、连接、代理、元数据处理。
- 主要模块：
  - `packages/bruno-requests/src/grpc`
  - `packages/bruno-electron/src/ipc/network/prepare-grpc-request.js`
  - `packages/bruno-electron/src/ipc/network/grpc-event-handlers.spec.js`
- 现有证据：
  - `tests/grpc/*`
  - `packages/bruno-requests/src/grpc/grpc-client.spec.js`

#### 3.4.4 WebSocket 请求编辑与连接

- 功能说明：支持 WebSocket URL、Query、Headers、Subprotocol、消息发送、连接持久化、变量插值。
- 主要模块：
  - `packages/bruno-requests/src/ws`
  - `packages/bruno-electron/src/ipc/network/ws-event-handlers.js`
  - `packages/bruno-app/src/components/RequestPane`
- 现有证据：
  - `tests/websockets/*.spec.ts`

#### 3.4.5 SSE 与其他实时请求

- 功能说明：仓库存在 SSE 相关测试目录，说明已纳入产品能力范围。
- 主要模块：
  - Electron network IPC
  - 前端 Request/Response 面板
- 现有证据：
  - `tests/sse/*`

#### 3.4.6 API Spec / OpenAPI 相关请求编辑与同步

- 功能说明：支持 API Spec 标签、OpenAPI 同步、差异检测、增量应用、缺失端点补齐、删除/重置端点。
- 主要模块：
  - `packages/bruno-app/src/components/ApiSpecPanel`
  - `packages/bruno-app/src/components/OpenAPISyncTab`
  - `packages/bruno-electron/src/ipc/openapi-sync.js`
- 现有证据：
  - IPC 中存在 `check-openapi-updates`、`compare-openapi-specs`、`apply-openapi-sync` 等能力

### 3.5 请求发送与运行时能力

#### 3.5.1 HTTP 请求发送

- 功能说明：发送 HTTP 请求、取消请求、保存响应到文件、处理大响应。
- 主要模块：
  - `packages/bruno-electron/src/ipc/network/index.js`
  - `packages/bruno-requests/src/network`
- 现有证据：
  - `tests/start/app-open.spec.ts`
  - `tests/response/large-response-crash-prevention.spec.ts`

#### 3.5.2 请求设置

- 功能说明：超时、重定向、编码、代理、SSL、Cookie、客户端证书、缓存 SSL session 等。
- 主要模块：
  - `packages/bruno-app/src/components/SecuritySettings`
  - `packages/bruno-electron/src/ipc/network/index.js`
  - `packages/bruno-cli/src/commands/run.js`
  - `packages/bruno-requests/src/utils/agent-cache.ts`
- 现有证据：
  - `tests/request/settings/*`
  - `tests/ssl/*`
  - `tests/proxy/*`

#### 3.5.3 认证机制

- 功能说明：支持 OAuth1、OAuth2、Digest、AWS V4、NTLM 等请求鉴权。
- 主要模块：
  - `packages/bruno-requests/src/auth`
  - `packages/bruno-cli/src/runner/awsv4auth-helper.js`
  - `packages/bruno-cli/src/runner/interpolate-vars.js`
  - `packages/bruno-electron/src/utils/oauth2.js`
  - `packages/bruno-electron/src/store/oauth2.js`
- 现有证据：
  - `tests/auth/*`
  - `packages/bruno-requests/src/auth/*.spec.ts`

#### 3.5.4 代理与系统代理发现

- 功能说明：支持集合级代理、系统代理探测、PAC 解析、禁用代理、跨平台系统代理读取。
- 主要模块：
  - `packages/bruno-requests/src/network/system-proxy`
  - `packages/bruno-requests/src/utils/pac-resolver.ts`
  - `packages/bruno-electron/src/store/system-proxy.js`
  - `packages/bruno-electron/src/ipc/preferences.js`
- 现有证据：
  - `tests/proxy/*`
  - `packages/bruno-requests/src/network/system-proxy/**/*.spec.*`

#### 3.5.5 Cookie 管理

- 功能说明：请求级 Cookie 自动收集、查看、增删改、域名维度清理、持久化。
- 主要模块：
  - `packages/bruno-app/src/components/Cookies`
  - `packages/bruno-electron/src/store/cookies.js`
  - `packages/bruno-requests/src/cookies`
- 现有证据：
  - `tests/cookies/*.spec.ts`
  - `packages/bruno-requests/src/cookies/*.spec.ts`

### 3.6 环境、变量与插值

#### 3.6.1 集合环境与全局环境

- 功能说明：支持集合环境、工作区环境、全局环境的创建、导入、导出、复制、更新、颜色管理。
- 主要模块：
  - `packages/bruno-app/src/components/Environments`
  - `packages/bruno-app/src/components/ColorPicker`
  - `packages/bruno-electron/src/ipc/global-environments.js`
  - `packages/bruno-electron/src/ipc/workspace.js`
  - `packages/bruno-electron/src/store/global-environments.js`
- 现有证据：
  - `tests/environments/*`
  - `tests/global-environments/*`

#### 3.6.2 变量插值

- 功能说明：支持 URL、Headers、Body、Path Params、WebSocket 消息等场景下的变量插值。
- 主要模块：
  - `packages/bruno-common/src/interpolate`
  - `packages/bruno-cli/src/runner/interpolate-vars.js`
  - `packages/bruno-js/src/interpolate-string.js`
- 现有证据：
  - `tests/interpolation/*`
  - `tests/websockets/variable-interpolation/*`

#### 3.6.3 Prompt Variables

- 功能说明：请求执行时提示用户输入动态变量；CLI 检测到 prompt 变量时阻止执行并提示。
- 主要模块：
  - `packages/bruno-common/src/utils/prompt-variables.spec.ts`
  - `packages/bruno-cli/src/runner/run-single-request.js`
- 现有证据：
  - `tests/interpolation/prompt-variables/*`

#### 3.6.4 `.env` 文件集成

- 功能说明：自动读取集合根目录 `.env`，支持特殊路径与 watcher 检测。
- 主要模块：
  - `packages/bruno-cli/src/commands/run.js`
  - `packages/bruno-electron/src/app/dotenv-watcher.js`
  - `packages/bruno-common/src/utils/jsonToDotenv.spec.ts`
- 现有证据：
  - `tests/dotenv/special-chars-collection-path/dotenv-special-chars.spec.ts`

#### 3.6.5 脚本写环境变量

- 功能说明：脚本可通过 `bru.setEnvVar` 等 API 设置环境变量，并支持持久化。
- 主要模块：
  - `packages/bruno-js/src/bru.js`
  - `packages/bruno-js/tests/setEnvVar.spec.js`
  - CLI / Electron runner 对持久化变量的承接逻辑
- 现有证据：
  - `tests/environments/api-setEnvVar/*`

### 3.7 脚本、断言与自动化测试脚本

#### 3.7.1 Pre-request / Post-response / Tests 脚本

- 功能说明：支持请求前脚本、响应后脚本、测试脚本；支持脚本段元数据与错误定位。
- 主要模块：
  - `packages/bruno-js/src/runtime`
  - `packages/bruno-electron/src/utils/collection.js`
  - `packages/bruno-cli/src/runner/run-single-request.js`
- 现有证据：
  - `tests/script-errors/*`
  - `packages/bruno-electron/tests/utils/collection.spec.js`
  - `packages/bruno-js/tests/runtime.spec.js`

#### 3.7.2 Bruno 脚本 API

- 功能说明：提供 `bru` API、请求对象、响应对象、CookieList、PropertyList、只读属性列表等运行时对象。
- 主要模块：
  - `packages/bruno-js/src/bru.js`
  - `packages/bruno-js/src/bruno-request.js`
  - `packages/bruno-js/src/bruno-response.js`
  - `packages/bruno-js/src/cookie-list.js`
  - `packages/bruno-js/src/property-list.js`
- 现有证据：
  - `packages/bruno-js/tests/*.spec.js`
  - `tests/scripting/*`

#### 3.7.3 JS Sandbox 模式

- 功能说明：支持 safe / developer 两种 CLI sandbox 策略，底层包含 quickjs 与 node-vm 能力。
- 主要模块：
  - `packages/bruno-js/src/sandbox/quickjs`
  - `packages/bruno-js/src/sandbox/node-vm`
  - `packages/bruno-cli/src/commands/run.js`
- 现有证据：
  - `packages/bruno-js/src/sandbox/node-vm/index.spec.js`
  - `tests/scripting/bru-api/isSafeMode/*`
- 扩展说明：`docs/analysis/script-sandbox-module-whitelist-cn.md`

#### 3.7.4 内置测试框架与断言运行时

- 功能说明：支持 `test()` 风格脚本测试与断言收集。
- 主要模块：
  - `packages/bruno-js/src/test.js`
  - `packages/bruno-js/src/test-results.js`
  - `packages/bruno-cli/src/utils/request.js`
- 现有证据：
  - `packages/bruno-js/tests/runtime.spec.js`
  - `packages/bruno-converters/tests/bruno/bruno-to-postman-translations/testing-framework.test.js`

### 3.8 Runner 与批量执行

#### 3.8.1 集合/文件夹/请求执行

- 功能说明：支持单请求、文件夹、递归、默认执行整个集合。
- 主要模块：
  - `packages/bruno-cli/src/commands/run.js`
  - `packages/bruno-cli/src/runner/run-single-request.js`
  - `packages/bruno-common/src/runner`
- 现有证据：
  - CLI run 命令定义
  - `tests/runner/*`

#### 3.8.2 基于标签的执行过滤

- 功能说明：支持 `--tags` 与 `--exclude-tags` 过滤。
- 主要模块：
  - `packages/bruno-cli/src/commands/run.js`
  - `packages/bruno-common/src/tags`
- 现有证据：
  - CLI builder 中显式定义 tags 参数

#### 3.8.3 Tests-only 与 Bail

- 功能说明：只执行包含测试或断言的请求，或在失败后停止。
- 主要模块：
  - `packages/bruno-cli/src/commands/run.js`
  - `packages/bruno-cli/src/utils/request.js`
- 现有证据：
  - CLI builder / handler 逻辑

#### 3.8.4 结果汇总与报表

- 功能说明：支持 JSON、JUnit、HTML 报表输出，支持过滤头/body 字段。
- 主要模块：
  - `packages/bruno-cli/src/reporters/html.js`
  - `packages/bruno-cli/src/reporters/junit.js`
  - `packages/bruno-cli/src/utils/sanitize-results.js`
- 现有证据：
  - `tests/runner/collection-run-report/*`
  - `tests/runner/cli-json-env-file/*`

#### 3.8.5 Runner 内请求跳转

- 功能说明：支持按请求名跳转下一请求、停止执行、防死循环保护。
- 主要模块：
  - `packages/bruno-cli/src/commands/run.js`
  - `packages/bruno-cli/src/runner/run-single-request.js`
- 现有证据：
  - run 命令内 nextRequestName / shouldStopRunnerExecution 逻辑

### 3.9 响应查看与产物处理

#### 3.9.1 响应格式化与预览

- 功能说明：支持 JSON、HTML 等响应预览与格式切换。
- 主要模块：
  - `packages/bruno-app/src/components/ResponsePane`
  - `packages/bruno-app/src/components/ResponseExample`
- 现有证据：
  - `tests/response/json-response-formatting/*`
  - `tests/response/response-format-select-and-preview/*`

#### 3.9.2 响应动作与存盘

- 功能说明：支持响应相关菜单操作与保存到文件。
- 主要模块：
  - `packages/bruno-electron/src/ipc/network/index.js`
  - `packages/bruno-app/src/components/ResponsePane`
- 现有证据：
  - `tests/response/response-actions.spec.ts`
  - IPC 中存在 `save-response-to-file`

#### 3.9.3 Response Examples

- 功能说明：支持 response examples 展示与菜单操作。
- 主要模块：
  - `packages/bruno-app/src/components/ResponseExample`
- 现有证据：
  - `tests/response-examples/menu-operations.spec.ts`

#### 3.9.4 请求 Timeline

- 功能说明：支持请求时间线相关展示与 URL 更新行为。
- 主要模块：
  - `packages/bruno-app/src/components/ResponsePane`
  - `packages/bruno-electron/src/ipc/network/index.js`
- 现有证据：
  - `tests/request/timeline/timeline-url-update.spec.ts`

### 3.10 导入、导出与格式转换

#### 3.10.1 OpenAPI / WSDL 导入

- 功能说明：CLI 支持从文件或 URL 导入 OpenAPI、WSDL，可按 tags/path 分组，可忽略 SSL 校验。
- 主要模块：
  - `packages/bruno-cli/src/commands/import.js`
  - `packages/bruno-converters/src/openapi`
  - `packages/bruno-converters/src/wsdl`
- 现有证据：
  - CLI `import` 命令
  - `tests/import/wsdl/import-wsdl.spec.ts`
  - `tests/import/url-import/openapi-url-import.spec.ts`

#### 3.10.2 Postman / Insomnia / Bruno / OpenCollection 转换

- 功能说明：支持多格式导入导出与格式翻译。
- 主要模块：
  - `packages/bruno-converters/src/index.js`
  - `packages/bruno-electron/src/ipc/collection.js`
- 现有证据：
  - converters 导出 `postmanToBruno`、`insomniaToBruno`、`brunoToPostman`、`openCollectionToBruno`、`brunoToOpenCollection`
  - `tests/import/url-import/postman-url-import.spec.ts`
  - `tests/import/url-import/insomnia-url-import.spec.ts`

#### 3.10.3 文件格式读写

- 功能说明：支持 `.bru`、`yml`、dotenv、环境文件等格式的解析与输出。
- 主要模块：
  - `packages/bruno-filestore/src/formats`
  - `packages/bruno-toml`
  - `packages/bruno-lang`
- 现有证据：
  - `packages/bruno-filestore/src/index.ts`
  - `packages/bruno-toml/tests/*`

### 3.11 文档、搜索与开发辅助

#### 3.11.1 Welcome / Onboarding

- 功能说明：首次启动欢迎弹窗、引导步骤、样例集合初始化。
- 主要模块：
  - `packages/bruno-app/src/components/WelcomeModal`
  - `packages/bruno-electron/src/app/onboarding.js`
- 现有证据：
  - `tests/onboarding/welcome-modal.spec.ts`
  - `tests/onboarding/sample-collection.spec.ts`

#### 3.11.2 全局搜索与脚本编辑器搜索

- 功能说明：支持全局搜索与脚本编辑器内搜索。
- 主要模块：
  - `packages/bruno-app/src/components/GlobalSearchModal`
  - `packages/bruno-app/src/components/CodeMirrorSearch`
- 现有证据：
  - `tests/request/tests/custom-search/custom-search.spec.ts`

#### 3.11.3 文档查看与 Markdown 支持

- 功能说明：支持集合/工作区文档展示与 Markdown 渲染。
- 主要模块：
  - `packages/bruno-app/src/components/Documentation`
  - `packages/bruno-app/src/components/MarkDown`
  - `packages/bruno-electron/src/ipc/workspace.js`
- 现有证据：
  - 组件目录与 workspace docs IPC

#### 3.11.4 DevTools 与性能监控

- 功能说明：支持打开开发者工具、性能指标监控。
- 主要模块：
  - `packages/bruno-app/src/components/Devtools`
  - `packages/bruno-electron/src/ipc/system-monitor.js`
  - `packages/bruno-electron/src/app/system-monitor.js`
- 现有证据：
  - `tests/devtools/performance/performance-tab.spec.ts`

#### 3.11.5 终端集成

- 功能说明：桌面端提供终端会话创建、输入、resize、销毁与列表查询。
- 主要模块：
  - `packages/bruno-electron/src/ipc/terminal.js`
- 现有证据：
  - Terminal IPC 明确存在

#### 3.11.6 Git 集成

- 功能说明：支持 git clone 等本地仓库交互。
- 主要模块：
  - `packages/bruno-app/src/components/Git`
  - `packages/bruno-electron/src/ipc/git.js`
  - `packages/bruno-electron/src/utils/git.js`
- 现有证据：
  - IPC `clone-git-repository`

### 3.12 偏好设置与系统集成

#### 3.12.1 用户偏好设置

- 功能说明：保存 UI 偏好、主题、缩放、窗口状态、最近工作区/集合等。
- 主要模块：
  - `packages/bruno-app/src/components/Preferences`
  - `packages/bruno-electron/src/store/preferences.js`
  - `packages/bruno-electron/src/store/window-state.js`
  - `packages/bruno-electron/src/store/last-opened-*`
- 现有证据：
  - `tests/preferences/*`

#### 3.12.2 快捷键与窗口控制

- 功能说明：支持快捷键、窗口最小化/最大化/全屏、缩放控制。
- 主要模块：
  - `packages/bruno-app/src/components/AppTitleBar`
  - `packages/bruno-electron/src/index.js`
- 现有证据：
  - `tests/shortcuts/bound-actions.spec.ts`

#### 3.12.3 通知与外链

- 功能说明：支持通知拉取、打开文档、关于页等系统能力。
- 主要模块：
  - `packages/bruno-electron/src/ipc/notifications.js`
  - `packages/bruno-electron/src/index.js`
  - `packages/bruno-electron/src/about`
- 现有证据：
  - IPC `fetch-notifications`、`open-docs`、`open-about`

## 4. CLI 功能清单

### 4.1 `bru run`

已确认支持的主要能力：

- 运行单请求、文件夹、多个路径、递归执行
- 指定 collection env、env file、global env、workspace path
- 环境变量覆盖 `--env-var`
- sandbox 模式切换
- 自定义 CA、忽略 truststore、客户端证书、SSL session cache
- Cookie 开关
- `--tests-only`
- `--bail`
- `--delay`
- `--tags` / `--exclude-tags`
- `--noproxy`
- `--verbose`
- JSON/JUnit/HTML 多报表输出
- 头/body 脱敏和省略

### 4.2 `bru import`

已确认支持的主要能力：

- 导入 OpenAPI、WSDL
- 支持本地文件和 URL
- 支持忽略 SSL 校验
- 支持输出为目录或 JSON
- 支持设置 collection name
- 支持 `bru` / `opencollection` 目标格式
- OpenAPI 支持按 tags 或 path 分组

## 5. 现有测试覆盖概览

### 5.1 E2E 目录覆盖到的产品能力

顶层 `tests/` 已覆盖的主要域包括：

- `workspace`
- `collection`
- `request`
- `response`
- `runner`
- `environments`
- `interpolation`
- `scripting`
- `websockets`
- `graphql`
- `grpc`
- `proxy`
- `ssl`
- `cookies`
- `onboarding`
- `preferences`
- `sidebar`
- `shortcuts`
- `devtools`
- `start`

### 5.2 包级测试现状

当前已明显存在测试的核心包：

- `bruno-cli`
- `bruno-common`
- `bruno-converters`
- `bruno-electron`
- `bruno-js`
- `bruno-query`
- `bruno-requests`
- `bruno-schema`
- `bruno-toml`
- `bruno-app`（以 `src` 下工具类测试为主，组件级体系不完整）

当前从目录层面看未形成明确测试体系或测试较弱的包：

- `bruno-filestore`
- `bruno-graphql-docs`
- `bruno-lang`
- `bruno-schema-types`
- `bruno-tests`（主要是测试服务，不是被测单元）

## 6. 后续扩展建议

为后续做功能扩展，建议优先以“功能域 + 关键模块 + 现有测试证据”三元组定位改动范围：

- 工作区/集合类改动：先看 `bruno-electron/src/ipc/workspace.js`、`collection.js` 与 `tests/workspace`、`tests/collection`
- 请求发送/认证/代理类改动：先看 `bruno-requests`、`bruno-cli/src/runner`、`tests/request`、`tests/proxy`、`tests/ssl`
- 环境/变量/脚本类改动：先看 `bruno-js`、`bruno-common`、`tests/environments`、`tests/interpolation`、`tests/scripting`
- OpenAPI / 导入导出类改动：先看 `bruno-converters`、`bruno-filestore`、`tests/import`
- UI 交互类改动：先看 `bruno-app/src/components` 与对应 E2E 目录

## 7. 结论

当前仓库并不是单一桌面应用，而是一个围绕“本地文件驱动 API 开发与测试”构建的完整产品平台。其核心功能已经覆盖：

- 工作区化组织
- 多协议 API 调试
- 环境/变量/脚本自动化
- CLI 批量执行
- 导入导出与格式转换
- 本地文件、系统代理、证书、终端、Git 等桌面集成

后续扩展时，建议继续沿着“产品功能域”推进需求，同时在实现层保持对 `bruno-app`、`bruno-electron`、`bruno-cli`、`bruno-requests`、`bruno-js` 五个核心包的联动认知。
