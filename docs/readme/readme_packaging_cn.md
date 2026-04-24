# Bruno Windows 安装包生成简版说明

本文档面向最终使用者或测试人员，介绍如何在本地生成 Bruno 的 Windows 安装包。

## 一、你需要准备什么

开始之前，请先准备：

- 一份完整的项目源码
- 已安装的 Node.js
- 已安装的 npm

然后在项目根目录执行依赖安装：

```bash
npm i --legacy-peer-deps
```

## 二、最常用的两个命令

### 1. 先做快速验证

```bash
npm run package:dir
```

这个命令会先生成目录包，适合确认项目是否可以正常打包。

### 2. 生成 Windows 安装包

```bash
npm run package:win
```

执行完成后，会生成可安装的 Windows 安装包。

## 三、安装包会生成到哪里

安装包默认输出到：

```text
packages/bruno-electron/out
```

你可以在这里找到：

- `.exe` 安装程序
- 可能附带的一些更新描述文件

## 四、如果只想确认能不能打包成功

建议先执行：

```bash
npm run package:dir
```

如果目录包能生成成功，再执行：

```bash
npm run package:win
```

这样更容易排查问题。

## 五、常见问题

### 1. 依赖安装失败

如果安装依赖时报网络错误，先检查网络，再重新执行：

```bash
npm i --legacy-peer-deps
```

### 2. 打开后提示缺少模块

这通常说明项目依赖包没有正确构建。最简单的处理方式是重新执行：

```bash
npm run package:win
```

### 3. 程序能看到网页，但不像桌面应用

这说明打开的是 Web 页面，不是 Electron 桌面程序。请使用打包后的安装包，或者使用 Electron 方式启动。

## 六、推荐做法

如果你只是想拿到一个可以安装的 Bruno：

```bash
npm run package:win
```

如果你希望更稳妥一些：

```bash
npm run package:dir
npm run package:win
```

## 七、补充说明

如果你是开发者，建议同时查看更完整的开发者文档：

- `docs/analysis/project-packaging-guide.md`
- `docs/analysis/windows-packaging-manual-cn.md`
