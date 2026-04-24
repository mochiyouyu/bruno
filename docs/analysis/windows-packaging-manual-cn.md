# Bruno Windows 打包操作手册

本文档面向开发者，说明如何在 Windows 环境下把当前项目打包为 Bruno 安装包。

## 一、适用场景

适用于以下情况：

- 需要在本地生成 Windows 安装包
- 需要验证项目是否可以完整构建和打包
- 需要排查 Electron、前端资源或工作区依赖缺失导致的启动问题

## 二、打包前准备

建议先确认以下条件已经满足：

- 已安装 Node.js 22.x 或当前 LTS
- 已安装 npm
- 当前仓库依赖已安装完成

推荐执行：

```bash
npm i --legacy-peer-deps
```

如果你之前安装 Electron 时遇到网络问题，例如：

```text
RequestError: read ECONNRESET
```

建议先重新安装依赖，再继续打包。

## 三、推荐命令

在 Windows 下，最常用的是下面两个命令：

### 1. 生成目录包

```bash
npm run package:dir
```

用途：

- 用于快速验证打包链路
- 用于检查包内容是否完整
- 适合优先排查构建问题

### 2. 生成 Windows 安装包

```bash
npm run package:win
```

用途：

- 生成 Windows 可安装的 `.exe` 安装包
- 适合交付测试或内部试用

## 四、推荐操作顺序

建议按下面顺序执行：

### 第一步：先验证目录包

```bash
npm run package:dir
```

如果这一步成功，说明：

- 工作区依赖构建正常
- 前端构建正常
- Electron Web 资源准备正常
- Electron 打包链路基本正常

### 第二步：再生成安装包

```bash
npm run package:win
```

这样能减少直接打安装包时排查问题的成本。

## 五、脚本实际会做什么

执行 `npm run package:win` 时，脚本会自动完成以下步骤：

1. 构建 `bruno-common`
2. 构建 `bruno-query`
3. 构建 `bruno-converters`
4. 构建 `bruno-requests`
5. 构建 `bruno-filestore`
6. 构建 `bruno-graphql-docs`
7. 构建 `bruno-schema-types`
8. 打包 `bruno-js` 的 sandbox 依赖
9. 构建前端页面
10. 复制前端产物到 Electron 的 `web` 目录
11. 修正静态资源路径
12. 调用 `electron-builder` 生成安装包

## 六、打包输出位置

打包完成后，产物默认输出到：

```text
packages/bruno-electron/out
```

Windows 常见产物包括：

- `*.exe` 安装包
- 可能存在 `latest.yml` 等更新相关文件
- 如果是目录包模式，则会看到未安装目录

## 七、常见问题

### 1. 启动时提示 `ipcRenderer not found in window object`

这通常说明你打开的是前端页面，而不是 Electron 应用。

正确方式是：

- 开发模式运行 Electron
- 或者直接使用本文的打包脚本生成桌面安装包后运行

### 2. 启动时提示缺少 `@usebruno/requests/dist/...`

说明工作区依赖没有构建完整。直接重新执行：

```bash
npm run package:win
```

通常即可自动补齐。

### 3. 前端页面能打开，但 Electron 没有正确加载资源

脚本已经自动处理静态资源路径。如果仍然有问题，重点检查：

- `packages/bruno-app/dist` 是否生成成功
- `packages/bruno-electron/web/index.html` 是否存在
- `packages/bruno-electron/web/static` 是否完整

### 4. 目录特别脏，担心影响打包

当前打包脚本不会主动清理你的源码改动，只会清理：

- `packages/bruno-electron/out`
- `packages/bruno-electron/web`

不会删除业务源码和文档改动。

## 八、推荐排查命令

如果打包失败，建议按下面顺序单独检查：

```bash
npm run build:bruno-requests
npm run build:bruno-filestore
npm run build:web
node ./scripts/build-electron.js dir
```

这样可以比较快地定位到底是依赖包、前端还是 Electron 打包本身出问题。

## 九、最短操作路径

如果只需要最简流程，直接执行：

```bash
npm run package:win
```

如果想更稳一点，执行：

```bash
npm run package:dir
npm run package:win
```
