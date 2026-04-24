# Bruno 项目打包说明

本文档说明如何在本地把当前项目打包为 Bruno 桌面安装包，以及新增打包脚本的使用方式。

## 一、打包流程概览

当前项目是一个基于 React 和 Electron 的桌面应用，完整打包流程如下：

1. 构建工作区依赖包
2. 构建前端页面
3. 将前端产物复制到 Electron 使用的 `web` 目录
4. 使用 `electron-builder` 生成安装包或目录包

涉及的关键目录如下：

- 前端构建产物目录：`packages/bruno-app/dist`
- Electron 临时 Web 目录：`packages/bruno-electron/web`
- 最终打包输出目录：`packages/bruno-electron/out`

## 二、常见打包产物

不同平台常见输出如下：

- Windows：`packages/bruno-electron/out/*.exe`
- macOS：`packages/bruno-electron/out/*.dmg`、`*.pkg`、`*.zip`
- Linux：`packages/bruno-electron/out/*.AppImage`、`*.deb`、`*.rpm`
- 目录包：`packages/bruno-electron/out` 下的未安装目录

如果只是想先验证打包链路是否正常，建议优先生成目录包。

## 三、环境要求

建议准备以下环境：

- Node.js 22.x 或当前 LTS 版本
- npm
- 已完成依赖安装

推荐安装命令：

```bash
npm i --legacy-peer-deps
```

如果之前遇到过下面这些错误：

- `ipcRenderer not found in window object`
- `Cannot find module ... @usebruno/requests/dist/cjs/index.js`

通常说明工作区依赖包或前端资源没有构建完整。本文新增脚本会把这些前置步骤一起补齐。

## 四、当前新增的打包脚本

本次新增了两层脚本：

- 统一打包脚本：`scripts/package-electron.js`
- 底层打包脚本：`scripts/build-electron.js`

两者职责不同：

### 1. `package-electron.js`

这个脚本负责完整打包流程，会自动执行：

1. 构建工作区依赖包
2. 构建 Bruno Web 前端
3. 调用底层 Electron 打包脚本

适合日常本地打包使用。

### 2. `build-electron.js`

这个脚本只负责 Electron 打包前的收尾工作，会自动执行：

1. 清理旧的 `out` 和 `web` 目录
2. 将 `packages/bruno-app/dist` 复制到 `packages/bruno-electron/web`
3. 修正静态资源路径
4. 删除 sourcemap
5. 调用 `electron-builder`

这个脚本适合已经完成前端构建的场景。

## 五、推荐使用的打包命令

### 1. 打包当前平台默认安装包

```bash
npm run package:auto
```

说明：

- 在 Windows 上等价于打包 `win`
- 在 macOS 上等价于打包 `mac`
- 在 Linux 上等价于打包 `linux`

### 2. Windows 打包

```bash
npm run package:win
```

### 3. macOS 打包

```bash
npm run package:mac
```

### 4. Linux 通用打包

```bash
npm run package:linux
```

### 5. Linux 指定格式打包

```bash
npm run package:deb
npm run package:rpm
npm run package:snap
```

### 6. 只生成目录包

```bash
npm run package:dir
```

这个命令适合本地快速验证打包结果，不会优先追求安装包格式。

## 六、底层脚本直接调用方式

如果你已经手动完成了依赖构建和前端构建，也可以直接调用底层脚本：

```bash
node ./scripts/build-electron.js
node ./scripts/build-electron.js win
node ./scripts/build-electron.js dir
```

注意：

- 这个脚本不会自动构建工作区依赖包
- 这个脚本也不会自动执行 `npm run build:web`
- 如果前端产物缺失，会直接报错

## 七、推荐的使用顺序

对于本地开发者，建议按下面方式使用：

### 方案一：直接完整打包

```bash
npm run package:win
```

适合 Windows 本地直接产出安装包。

### 方案二：先验证目录包，再生成安装包

```bash
npm run package:dir
npm run package:win
```

这样更容易定位问题，也能先确认构建链路是否正常。

## 八、打包输出目录

最终打包结果默认输出到：

```text
packages/bruno-electron/out
```

每次执行底层打包前，脚本会自动清理以下目录：

- `packages/bruno-electron/out`
- `packages/bruno-electron/web`

因此一般不需要手动删除旧文件。

## 九、常见问题排查

### 1. Electron 安装失败

如果安装 Electron 时遇到网络错误，例如：

```text
RequestError: read ECONNRESET
```

建议按下面顺序排查：

1. 检查网络或代理配置
2. 重新执行 `npm i --legacy-peer-deps`
3. 确认 `node_modules/electron` 是否已正确安装

### 2. 启动时提示缺少 `@usebruno/requests/dist/...`

这通常说明工作区依赖包没有构建完成。可以直接执行：

```bash
npm run package:win
```

或者至少执行：

```bash
npm run build:bruno-requests
npm run build:bruno-filestore
npm run build:web
```

### 3. 打包后静态资源路径异常

脚本会在复制前端产物后自动修正资源路径，把原本面向 Web 服务器的 `/static` 路径改为 Electron 可用的相对路径。

### 4. macOS 签名或公证问题

仓库内已有 `electron-builder` 的 macOS 配置，但如果本地没有证书、签名身份或相关环境变量，可能只能完成未签名构建，或者需要按照团队正式发布流程单独处理。

### 5. 只想确认打包链路是否正常

优先使用：

```bash
npm run package:dir
```

这个命令速度更快，也更适合本地排查问题。

## 十、最常用命令速查

```bash
# 自动按当前系统打包
npm run package:auto

# Windows 安装包
npm run package:win

# 仅生成目录包
npm run package:dir
```

## 十一、补充文档

为了区分开发者使用和最终用户使用，已额外补充两份中文文档：

- 开发者 Windows 打包手册：`docs/analysis/windows-packaging-manual-cn.md`
- 最终用户简版说明：`docs/readme/readme_packaging_cn.md`
