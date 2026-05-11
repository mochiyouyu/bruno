# autoTest 转换后的 Bruno Collection

该目录是从 `F:\resource\mywork\pycharm\autoTest` 转换生成的 Bruno 集合，可在 Bruno Electron 客户端中直接打开、查看和调试请求。

## 转换内容

- 已转换结构化 YAML 接口：267 个。
- 已补充 Python demo 示例请求：5 个。
- 共生成请求文件：272 个。
- 接口按源项目模块拆分到 `user`、`cert`、`sdk`、`otp`、`pdf`、`stamper`、`windows`、`linux` 等目录。
- 原始内网地址、账号、密码、手机号、设备号、密钥、签名随机值等敏感字段已替换为 Bruno 变量或占位值，提交到代码仓库前不会携带真实环境信息。

## 使用方式

1. 启动 Bruno Electron 客户端。
2. 点击 `Open Collection`。
3. 选择目录：`F:\mywork\bruno-main\examples\autoTest-bruno-collection`。
4. 打开后先配置环境变量，再执行单个请求或在 Runner 中选择多个请求运行。

## 运行前需要配置

- `mauthBaseUrl`：MAuth 服务基础地址。
- `mauthManageBaseUrl`：MAuthManage 管理服务基础地址。
- `sdkBaseUrl`：SDK 服务基础地址。
- `password`、`newpassword`、`mobile`、`imei`、`pc_imei`、`publicKey`、`clientPublic`、`s_hash`、`s_random` 等变量需要按实际测试环境补充。
- `s_clienttime`、签名、证书、验证码、Cookie 等动态值没有自动生成，建议在 pre-request script 或 post-response script 中补齐。

## 场景测试建议

- 先从单个模块的小范围请求验证，例如 `user/newUser.bru`、`user/getUserInfo.bru`。
- 需要串联的请求，在上一个请求的 post-response script 中保存变量，例如 `bru.setVar('code', res.getBody().code)`。
- 下一个请求中可使用 `{{code}}` 或 `bru.getVar('code')` 引用变量。
- 完整流程建议在 Runner 中创建场景，按原 pytest 调用顺序添加请求并保存场景。

更多转换限制和后续处理建议见 `CONVERSION_NOTES.md`。
