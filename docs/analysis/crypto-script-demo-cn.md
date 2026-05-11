# Bruno 前置脚本 crypto 使用 Demo

本文档给出 Bruno 请求前置脚本中使用 `crypto` 和 `sm-crypto` 的示例，包括 SHA256 摘要、HMAC-SHA256 签名，以及 SM2 签名/验签。

## 一、适用范围

当前项目已支持在 QuickJS 脚本沙箱中使用：

```js
const crypto = require('crypto');
```

当前 `crypto` shim 已支持：

- `crypto.randomBytes(size)`
- `crypto.getRandomValues(typedArray)`
- `crypto.createHash(algorithm)`
- `crypto.createHmac(algorithm, key)`
- `crypto.randomUUID()`

当前项目也已把纯 JS 国密库 `sm-crypto` 注册到脚本沙箱白名单，可直接使用：

```js
const { sm2 } = require('sm-crypto');
```

注意：当前 `crypto` shim 没有开放完整 Node.js `crypto` 模块，也没有直接实现 SM2 的 `createSign()` / `createVerify()`。SM2 能力由 `sm-crypto` 提供。

## 二、SHA256 摘要 Demo

适合在请求前置脚本中生成请求体摘要、参数摘要、幂等键等。

```js
const crypto = require('crypto');

const body = req.getBody() || '';

const bodySha256 = crypto
  .createHash('sha256')
  .update(body)
  .digest('hex');

req.setHeader('X-Body-SHA256', bodySha256);
```

固定字符串示例：

```js
const crypto = require('crypto');

const digest = crypto
  .createHash('sha256')
  .update('hello')
  .digest('hex');

console.log(digest);
// 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
```

## 三、HMAC-SHA256 签名 Demo

适合常见开放平台签名、API 网关签名、Webhook 签名。

```js
const crypto = require('crypto');

const timestamp = Date.now().toString();
const nonce = crypto.randomUUID();
const body = req.getBody() || '';
const secret = bru.getEnvVar('apiSecret');

const signText = `${timestamp}\n${nonce}\n${body}`;

const signature = crypto
  .createHmac('sha256', secret)
  .update(signText)
  .digest('hex');

req.setHeader('X-Timestamp', timestamp);
req.setHeader('X-Nonce', nonce);
req.setHeader('X-Signature', signature);
```

## 四、SM2 签名/验签

SM2 不建议直接依赖 Node.js 原生 `crypto`，原因是：

- 不同 Node.js / OpenSSL 版本对国密算法支持差异较大。
- Bruno 当前 QuickJS `crypto` shim 没有开放 `createSign()`、`createVerify()`。
- 直接暴露完整 Node `crypto` API 会扩大脚本沙箱能力边界。

当前项目已把纯 JS 库 `sm-crypto` 加入 Bruno 脚本沙箱白名单，可以在前置脚本、后置脚本或测试脚本里使用：

```js
const { sm2 } = require('sm-crypto');
```

### 4.1 sm-crypto 白名单实现位置

当前实现涉及：

- `packages/bruno-js/package.json`
- `package-lock.json`
- `packages/bruno-js/src/sandbox/bundle-libraries.js`
- `packages/bruno-js/src/sandbox/bundle-browser-rollup.js`
- `packages/bruno-js/src/sandbox/quickjs/shims/lib/sm-crypto.spec.js`

如果后续重新安装依赖或修改 `bundle-libraries.js`，需要重新生成沙箱 bundle：

安装依赖：

```bash
npm run sandbox:bundle-libraries --workspace=packages/bruno-js
```

重新启动 Bruno 后，脚本里可继续使用：

```js
const { sm2 } = require('sm-crypto');
```

### 4.2 SM2 生成密钥对 Demo

仅用于本地 demo。实际生产环境不要在脚本中生成并打印私钥。

```js
const { sm2 } = require('sm-crypto');

const keyPair = sm2.generateKeyPairHex();

console.log('privateKey:', keyPair.privateKey);
console.log('publicKey:', keyPair.publicKey);
```

### 4.3 SM2 签名 Demo

建议把私钥放到 Bruno 环境变量中，例如 `sm2PrivateKey`。

```js
const { sm2 } = require('sm-crypto');

const privateKey = bru.getEnvVar('sm2PrivateKey');
const timestamp = Date.now().toString();
const body = req.getBody() || '';
const signText = `${timestamp}\n${body}`;

const signature = sm2.doSignature(signText, privateKey, {
  hash: true,
  der: true
});

req.setHeader('X-Timestamp', timestamp);
req.setHeader('X-SM2-Signature', signature);
```

### 4.4 SM2 验签 Demo

适合在后置脚本或测试脚本中验证服务端响应签名。

```js
const { sm2 } = require('sm-crypto');

const publicKey = bru.getEnvVar('sm2PublicKey');
const responseBody = res.getBody() || '';
const signature = res.getHeader('X-SM2-Signature');

const verified = sm2.doVerifySignature(responseBody, signature, publicKey, {
  hash: true,
  der: true
});

if (!verified) {
  throw new Error('SM2 response signature verification failed');
}
```

在测试脚本中也可以写成断言：

```js
const { sm2 } = require('sm-crypto');

test('response SM2 signature should be valid', () => {
  const publicKey = bru.getEnvVar('sm2PublicKey');
  const responseBody = res.getBody() || '';
  const signature = res.getHeader('X-SM2-Signature');

  const verified = sm2.doVerifySignature(responseBody, signature, publicKey, {
    hash: true,
    der: true
  });

  expect(verified).to.equal(true);
});
```

## 五、SM2 请求签名完整示例

假设服务端要求签名原文为：

```text
HTTP_METHOD\nREQUEST_PATH\nTIMESTAMP\nBODY_SHA256
```

前置脚本：

```js
const crypto = require('crypto');
const { sm2 } = require('sm-crypto');

const privateKey = bru.getEnvVar('sm2PrivateKey');
const timestamp = Date.now().toString();
const body = req.getBody() || '';

const bodySha256 = crypto
  .createHash('sha256')
  .update(body)
  .digest('hex');

const method = req.getMethod();
const url = req.getUrl();
const path = new URL(url).pathname;

const signText = `${method}\n${path}\n${timestamp}\n${bodySha256}`;

const signature = sm2.doSignature(signText, privateKey, {
  hash: true,
  der: true
});

req.setHeader('X-Timestamp', timestamp);
req.setHeader('X-Body-SHA256', bodySha256);
req.setHeader('X-SM2-Signature', signature);
```

如果 `new URL(req.getUrl())` 在某些脚本环境不可用，可直接把 path 写入环境变量或从请求 URL 字符串中截取。

## 六、安全建议

- 私钥只放在 Bruno 环境变量或安全配置中，不要写死在 Collection 文件里。
- 不要在脚本中 `console.log()` 私钥、密钥、完整签名原文。
- 不建议把 `fs`、`child_process`、`net`、`tls` 等宿主能力加入脚本白名单。
- 新增白名单模块时，优先选择纯 JS 库；必须桥接 Node 能力时，只开放最小必要 API。
- 每次新增模块后，都要补充 QuickJS 单元测试和真实前置脚本示例。

## 七、相关文档

- `docs/analysis/script-sandbox-module-whitelist-cn.md`
- `packages/bruno-js/src/sandbox/quickjs/shims/lib/crypto-utils.js`
- `packages/bruno-js/src/sandbox/bundle-libraries.js`
