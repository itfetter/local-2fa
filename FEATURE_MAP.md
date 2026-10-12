# FEATURE_MAP.md — 按功能定位源码

本地图描述当前实现。不存在后端 API 或数据库；下表“接口/数据”指浏览器内部函数及 localStorage。修改功能时同时检查相应 UI、数据生命周期、安全策略和发布资源。

| 功能 | 源码定位 | 接口 / 数据 | 测试与关联修改 |
| --- | --- | --- | --- |
| 添加/命名账号 | index.html 的 add/name/secret；app.js 的 add.onsubmit | core.js parseAccount；内存 Account | URI、Base32 测试；检查重复密钥、清空输入、错误提示 |
| Base32 归一化 | core.js normalizeSecret | 返回 secret 和 bytes；严格字母、长度与尾部检查 | tests/core.test.js strict Base32；改动同步输入说明 |
| otpauth URI | core.js parseAccount | 仅 totp + SHA1 + digits=6 + period=30 | URI 测试；拒绝 HOTP/其他配置，检查名称解码 |
| 生成验证码 | core.js totp | Base32→8 字节计数器→HMAC-SHA1→动态截断→模 10^6 | RFC 六组向量、6 位输出、30 秒边界 |
| 自动更新/倒计时 | app.js tick/setInterval/pageshow/visibilitychange；index.html timer/progress | Date.now；generation 防止过期回写 | 核心边界测试；手工跨 30 秒、切后台恢复、删除/锁定检查 |
| 多账号列表/移除 | app.js render 和 remove.onclick；style.css account 系列 | accounts 数组；仅移除内存 | 手工多账号、去重、移除后再保存并解锁 |
| 复制 | app.js copy.onclick；index.html status | 当次 totp；navigator.clipboard | 手工检查六位无空格、拒绝权限、临近边界复制 |
| 密钥与密码输入 | index.html secret/password；app.js 各操作后清空 | 不持久化密码；密钥默认 password 输入 | 手工添加后清空；加解密操作完成后密码清空 |
| 加密保存 | app.js save.onclick/operation；core.js encryptVault/derive | PBKDF2-SHA256 600000；AES-256-GCM；Vault v1 | 加密往返、随机 salt/IV、短密码拒绝；存储失败检查 |
| 解锁 | app.js unlock.onclick；core.js decryptVault | 本地密文→Account 数组；重建 UUID | 错误密码、篡改拒绝；刷新后解锁、替换内存确认 |
| 锁定 | app.js lock.onclick/render | 清空 accounts 与输入，generation 增加 | 手工锁定后无卡片、异步无回写；剪贴板不会自动清除 |
| 删除副本 | app.js erase.onclick/vaultState | 删除 local-2fa.vault.v1；保留当前内存 | 手工确认、删除后刷新，保留恢复方式 |
| 存储状态/错误 | app.js vaultState/message/operation | localStorage 不可用、busy 按钮状态 | 手工禁用存储、解锁失败后仍可操作 |
| 禁止联网/安全渲染 | index.html CSP/referrer；app.js DOM 构造 | connect-src none；form-action none；无网络 API | 检查运行代码无 fetch/XHR/外链；Network 实际验收 |
| 响应式/可访问性 | style.css media 查询/focus；index.html label/status/progress | 760px 断点、aria-live、语义表单 | 手工窄屏、键盘、状态提示、长账号名 |
| Pages 部署 | .github/workflows/pages.yml；package.json | main→测试→public 四个资源→deploy-pages | Actions 结果；新增资源同步 cp 列表；实际网页验收 |

## 代码查找入口

```sh
rg -n 'export|normalizeSecret|totp|parseAccount|derive|encryptVault|decryptVault' core.js
rg -n 'render|tick|onclick|onsubmit|storageKey|generation|operation' app.js
rg -n 'CSP|Content-Security-Policy|id=|script' index.html
rg -n 'media|focus|account|layout' style.css
rg -n 'test\(' tests/core.test.js
```

## 常见改动的关联文件

- 新增账号字段：core.js 解析与 Vault 往返、app.js 录入/显示、index.html、测试、README 和数据模型说明一起检查；旧 Vault 是否可解锁。
- 改算法/周期：core.js、app.js 倒计时、HTML 提示、RFC/边界测试、README 和兼容范围一起改；当前未实现此扩展。
- 新增静态资源：使用相对路径，同时更新工作流打包列表和 CSP 的必要规则；不得顺手允许外部脚本。
- 改存储：检查 version、旧副本、写入失败、用户确认、锁定状态和安全说明。
- 仅样式/文案：检查实际交互含义、响应式和可访问性；不改算法或加密参数。
