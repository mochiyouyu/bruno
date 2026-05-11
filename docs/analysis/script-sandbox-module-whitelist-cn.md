# Bruno 脚本沙箱模块白名单扩展说明

本文档说明 Bruno 前置脚本、后置脚本、测试脚本中 `require()` 可用模块的注册机制，并记录本项目新增 `require('crypto')` 支持的实现方案。后续如果需要继续扩展其他模块，应按本文流程处理。

## 一、背景

Bruno 的请求脚本运行在 QuickJS 沙箱中，不等同于完整 Node.js 环境。脚本里调用：

```js
const crypto = require('crypto');
```

如果沙箱没有注册 `crypto` 模块，会报错：

```text
Error: Cannot find module crypto
```

原因是沙箱内的 `require()` 只会从 `globalThis.requireObject` 查找已注册模块。没有注册到 `requireObject` 的模块，即使 Node.js 本身存在，也不能直接被脚本访问。

## 二、模块白名单如何工作

相关文件：

- `packages/bruno-js/src/sandbox/quickjs/index.js`
- `packages/bruno-js/src/sandbox/quickjs/shims/require.js`
- `packages/bruno-js/src/sandbox/bundle-libraries.js`
- `packages/bruno-js/src/sandbox/quickjs/shims/lib/*.js`

核心流程：

1. `quickjs/index.js` 创建 QuickJS VM。
2. `bundle-browser-rollup.js` 注入打包后的通用 JS 库。
3. `getRequireCode()` 注入沙箱内的 `require()` 函数。
4. `require()` 从 `globalThis.requireObject[moduleName]` 查找模块。
5. 找不到模块时抛出 `Cannot find module xxx`。

简化后的 `require()` 逻辑如下：

```js
globalThis.require = (mod) => {
  const lib = globalThis.requireObject[mod];

  if (lib) {
    return lib;
  }

  throw new Error('Cannot find module ' + mod);
};
```

因此，新增模块支持的关键不是 Node.js 能否 `require()` 到，而是 Bruno 沙箱是否把该模块注册到了 `globalThis.requireObject`。

## 三、当前已支持的 crypto 使用方式

本项目已在 QuickJS crypto shim 中注册：

- `require('crypto')`
- `require('node:crypto')`

支持的常用 API：

- `crypto.randomBytes(size)`
- `crypto.getRandomValues(typedArray)`
- `crypto.createHash(algorithm)`
- `crypto.createHmac(algorithm, key)`
- `crypto.randomUUID()`

请求前置脚本示例：

```js
const crypto = require('crypto');

const timestamp = Date.now().toString();
const body = req.getBody();
const secret = bru.getEnvVar('secret');

const signature = crypto
  .createHmac('sha256', secret)
  .update(`${timestamp}.${body}`)
  .digest('hex');

req.setHeader('X-Timestamp', timestamp);
req.setHeader('X-Signature', signature);
```

Hash 示例：

```js
const crypto = require('crypto');

const digest = crypto
  .createHash('sha256')
  .update('hello')
  .digest('hex');
```

随机 UUID 示例：

```js
const crypto = require('crypto');

const requestId = crypto.randomUUID();
req.setHeader('X-Request-Id', requestId);
```

## 四、crypto 与 crypto-js 的选择

Bruno 默认已经支持 `crypto-js`：

```js
const CryptoJS = require('crypto-js');
```

两者区别：

- `crypto` 是 Node.js 风格 API，适合复制 Node 示例代码，常见写法是 `createHash()`、`createHmac()`、`randomBytes()`。
- `crypto-js` 是纯 JavaScript 库，适合 Hash、HMAC、AES 等常规签名场景，返回值通常是 `WordArray`。
- 如果脚本需要兼容未合入本项目 crypto shim 的原版 Bruno，优先使用 `crypto-js`。
- 如果需要兼容 Node.js 示例或使用 `randomBytes`、`randomUUID`，使用本项目新增的 `require('crypto')`。

`crypto-js` HMAC 示例：

```js
const CryptoJS = require('crypto-js');

const signature = CryptoJS
  .HmacSHA256('hello', 'secret')
  .toString(CryptoJS.enc.Hex);
```

## 五、当前 crypto 支持的实现方式

实现文件：

- `packages/bruno-js/src/sandbox/quickjs/shims/lib/crypto-utils.js`
- `packages/bruno-js/src/sandbox/quickjs/shims/lib/crypto-utils.spec.js`

实现原则：

- 不把 Node.js 原生 `crypto` 对象完整暴露进 QuickJS。
- 只通过 QuickJS bridge 暴露明确允许的安全方法。
- 传入和返回值必须可序列化，例如字符串、数字、数组、Buffer 可转换内容。
- 在沙箱内构造 Node 风格 API 对象，再注册到 `requireObject`。

注册方式示例：

```js
globalThis.requireObject = {
  ...(globalThis.requireObject || {}),
  crypto: cryptoModule,
  'node:crypto': cryptoModule
};
```

## 六、后续扩展其他模块的两类方式

### 6.1 扩展纯 JS 或浏览器兼容 npm 包

适用场景：

- 目标库可以被 Rollup 打包。
- 不依赖 Node.js 文件系统、网络 socket、子进程等能力。
- 适合工具库、编码库、纯算法库。

操作步骤：

1. 在 `packages/bruno-js/package.json` 增加依赖。
2. 在 `packages/bruno-js/src/sandbox/bundle-libraries.js` 中 import 目标库。
3. 把模块挂到 `globalThis.requireObject`。
4. 重新生成沙箱 bundle。
5. 添加或更新单元测试。
6. 重新构建或重启 Bruno。

示例：新增 `dayjs`：

```js
import dayjs from 'dayjs';

globalThis.requireObject = {
  ...(globalThis.requireObject || {}),
  dayjs
};
```

重新打包命令：

```bash
npm run sandbox:bundle-libraries --workspace=packages/bruno-js
```

该命令会重新生成：

```text
packages/bruno-js/src/sandbox/bundle-browser-rollup.js
```

注意：如果新增 npm 依赖，还需要同步更新 `package-lock.json`。

### 6.2 扩展 Node.js 内置能力或需要宿主桥接的模块

适用场景：

- 目标能力来自 Node.js 内置模块。
- 不能直接打进浏览器 bundle。
- 需要由宿主 Node/Electron 侧执行，再把结果传回 QuickJS。

典型模块：

- `crypto`
- `os`
- 部分安全受控的 `path` 能力

操作步骤：

1. 在 `packages/bruno-js/src/sandbox/quickjs/shims/lib/` 下新增或修改 shim。
2. 使用 `vm.newFunction()` 暴露最小必要能力。
3. 在 VM 内构造用户脚本可使用的模块对象。
4. 注册到 `globalThis.requireObject`。
5. 在 `packages/bruno-js/src/sandbox/quickjs/shims/lib/index.js` 或 `quickjs/index.js` 中确保 shim 被加载。
6. 添加单元测试，覆盖 `require('moduleName')` 和核心 API。

推荐结构：

```js
const addSomeModuleShimToContext = async (vm) => {
  const hostFunctionHandle = vm.newFunction('hostFunction', function (argHandle) {
    const arg = vm.dump(argHandle);
    const result = doSomethingInNode(arg);
    return marshallToVm(result, vm);
  });

  vm.setProp(vm.global, '__bruno__someModule__hostFunction', hostFunctionHandle);
  hostFunctionHandle.dispose();

  vm.evalCode(`
    const someModule = {
      doSomething(value) {
        return globalThis.__bruno__someModule__hostFunction(value);
      }
    };

    globalThis.requireObject = {
      ...(globalThis.requireObject || {}),
      'some-module': someModule
    };
  `);
};
```

## 七、不建议开放的模块

以下模块不要直接加入白名单，除非有非常明确的安全设计和权限控制：

- `fs`
- `child_process`
- `worker_threads`
- `net`
- `tls`
- `http`
- `https`
- `electron`

原因：请求脚本通常来自 Collection 文件，可能被同步、分享或从外部导入。如果开放过多宿主能力，脚本可以读取本地文件、执行命令或访问内部网络，风险较高。

如果确实需要这类能力，应优先设计 Bruno 自己的受控 API，例如只允许读取 Collection 目录内的文件，而不是直接暴露完整 `fs`。

## 八、扩展模块后的验证清单

每次扩展白名单模块后，至少验证以下内容：

1. `require('moduleName')` 能正常返回模块对象。
2. 不支持的模块仍然抛出 `Cannot find module xxx`。
3. 核心 API 在 QuickJS 中可执行。
4. 错误参数能返回清晰错误信息。
5. 相关测试已覆盖前置脚本或测试脚本中的真实用法。
6. 如果修改了 `bundle-libraries.js`，确认 `bundle-browser-rollup.js` 已重新生成。

推荐测试命令：

```bash
node --experimental-vm-modules ./node_modules/jest/bin/jest.js packages/bruno-js/src/sandbox/quickjs/shims/lib/crypto-utils.spec.js --runInBand --testPathIgnorePatterns test.js
```

Windows 下不建议直接使用 `packages/bruno-js/package.json` 里的测试脚本，因为其中包含 Unix 风格的 `$(npx which jest)`，在 PowerShell/cmd 中可能无法解析。

## 九、维护建议

- 优先扩展纯 JS 库，减少宿主桥接复杂度。
- Node 内置模块只开放必要 API，不要直接透传完整模块对象。
- 每个新增模块都要有对应单测。
- 文档中记录模块名、支持 API、使用示例和安全边界。
- 打包发布前确认 `packages/bruno-js/src/sandbox/bundle-browser-rollup.js` 与源码注册逻辑一致。

## 十、Demo 示例

- `docs/analysis/crypto-script-demo-cn.md`：包含 `require('crypto')` 的 SHA256、HMAC-SHA256 示例，以及 `require('sm-crypto')` 的 SM2 签名/验签示例。
