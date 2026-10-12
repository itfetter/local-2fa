# AGENTS.md — 开发与 AI 协作规范

本文件适用于整个 `itfetter/local-2fa` 仓库。开始工作时先阅读本文件、PROJECT_HANDOFF.md、FEATURE_MAP.md 和 README.md，再阅读目标代码。用户当前明确指令优先；不得将文档中的待办当作已授权的扩展开发。

## 项目是什么与业务目标

独立实现的浏览器本地 TOTP 验证器，参考 2fa.fun 核心用途。帮助用户在网页中管理多个已有 TOTP 账号、生成并复制 6 位验证码，可选加密保存。核心承诺：密钥及验证码不发送到服务器；默认不持久保存；已有博客仓库不属于本项目修改范围。

## 技术栈

原生 HTML、CSS、JavaScript ES modules；Web Crypto（HMAC-SHA1、PBKDF2-SHA256、AES-GCM）；localStorage 只存加密保险箱。Node.js 24 内置 node:test，GitHub Actions + GitHub Pages 静态发布。无后端、无数据库、无 npm 运行依赖。

## 项目结构与地图

| 路径 | 职责 |
| --- | --- |
| index.html | 语义结构、表单、静态安全策略 CSP、模块入口 |
| style.css | 中文页面、账号卡片、响应式与焦点样式 |
| app.js | 账号内存、事件、验证码刷新、复制、保险箱界面 |
| core.js | Base32 校验、URI 解析、TOTP 与加解密 |
| tests/core.test.js | RFC 向量、时间边界、解析和加密测试 |
| package.json | ES module 声明、npm test 命令、版本 |
| .github/workflows/pages.yml | 测试、静态打包、Pages 发布 |
| FEATURE_MAP.md | 按功能定位代码、数据及测试 |
| PROJECT_HANDOFF.md | 当前状态、变更、问题和后续交接 |
| README.md | 用户与开发者快速上手及长期规划 |
| REFERENCE_ANALYSIS.md | 原站观察和独立实现边界 |
| LICENSE | MIT 许可证 |

## 核心数据模型

- 内存 Account：`{id: UUID, name: string, secret: normalized Base32}`。id 不持久作为稳定身份，解锁时重新生成；name 默认“未命名账号”；同一密钥不重复添加。
- normalizeSecret 返回 `{secret, bytes: Uint8Array}`；secret 去空格、转大写、去填充。
- 本地 Vault v1：`{version:1, salt:base64, iv:base64, ciphertext:base64}`。存储键 `local-2fa.vault.v1`，ciphertext 内是账号数组 JSON；不存密码、派生密钥或明文账号。
- UI 状态：accounts、generation（阻止旧异步任务更新已重置页面）、busy（序列化保险箱操作）。
- TOTP 固定 SHA1 / 6 位 / 30 秒。totp 的 digits=8 仅用于标准向量验证，不是当前 UI 功能。

## 修改范围与稳定边界

可按需求修改 UI、样式、提示、文档及对应测试。通常可修改 app.js 的交互，但必须保持生命周期和隐私约束。

core.js 算法、加密参数、Vault 格式、存储键、index.html CSP、发布权限及工作流路径属于高影响区域：必要时才改，说明兼容性和原因，增加有效验证。不要顺手放宽 CSP、引入 CDN、加入统计、添加联网同步或明文存储。不要修改其他仓库、用户级 Pages、博客域名或权限。不要删除许可证或覆盖用户新增内容。

## API 设计规则

没有 HTTP API；core.js 的导出函数是项目内部接口。保持参数含义、错误行为及数据格式明确；禁止将密钥放到 URL、日志、异常报告、网络请求、图片地址或第三方服务。新增算法/URI 参数必须显式校验，不能静默按默认值计算错误结果。不要用自制加密代替 Web Crypto。

## 数据库与存储规则

没有数据库，不建立服务端账户表。持久保存必须由用户点击触发，保存前加密成功；密码输入在操作完成后清空。改动 Vault 格式须定义 version、旧数据兼容/迁移及失败处理；不得静默覆盖不可解密数据。移除内存账号不会自动改写已保存副本，提示必须与行为一致。写入失败应保留内存账号。

## 前端规则

用户内容使用 textContent 与 DOM 构造，禁止拼接到 innerHTML。保持 label、键盘可操作、焦点样式、状态播报及窄屏布局。密钥输入默认隐藏；避免在结果卡片显示明文。异步渲染须防止锁定/删除后的旧任务回写。复制时生成当前时段验证码；处理 Clipboard 拒绝、存储不可用和 Web Crypto 不可用。时间源为设备系统时间，不增加联网校时请求。

## 部署规则

仅部署 `itfetter/local-2fa`。main 推送触发工作流；npm test 成功后仅打包 index.html、style.css、app.js、core.js 到 public。新增运行资源必须同步更新打包列表。Settings → Pages 的 Source 使用 GitHub Actions；不要把推送成功或测试通过写成部署成功。成功以 deploy-pages 结果及实际网页验证为准。资源路径保持相对路径，兼容 `/local-2fa/`。Pages 同域项目不具有 origin 隔离。

## 测试规则

算法、解析、加密及生命周期改动运行 `npm test` 并补针对实际风险的测试，不写仅重复实现的测试。必须保留 RFC 6238 向量、30 秒边界、错误密码、篡改拒绝。UI 变更按 FEATURE_MAP 手工检查多账号、刷新、复制、锁定、解锁、窄屏和网络行为。测试只用公开合成密钥；禁止真实密钥进入测试、日志或截图。纯文档改动检查路径、链接、状态和源码一致性即可，不为文档新增测试。

## 命名规范

变量/函数 camelCase，常量含义明确；JS/CSS 文件使用小写命名，文档保留当前大写文件名。CSS class 和 HTML id 使用 kebab-case。UI 与维护文档默认中文；代码标识符英文。版本号以 package.json 为准；功能状态以交接文档为准，不在多处手动维护冲突版本。

## AI 修改前后必须遵守

修改前：确认仓库和分支，查看工作区变更；阅读四份文档和相关源文件；按 FEATURE_MAP 判断关联文件；不得覆盖他人未提交改动，不将历史状态当当前部署证据。

修改中：在授权范围内完成工作；避免无关重构；保留隐私和兼容性；不用真实账号数据。必要的新依赖说明目的，不默认添加构建系统。

修改后：检查差异与源码路径；完成必要验证；更新 PROJECT_HANDOFF 的时间、变更文件、原因、测试及部署状态；功能定位变化更新 FEATURE_MAP；使用/部署流程变化更新 README；开发规则变化更新 AGENTS。提交说明描述具体问题与结果。发布后核实工作流和实际功能；没有核实时明确标记待验证。

## 开发人员工作规范

采用可审查的小范围提交，提交前检查秘密与无关文件；不提交保险箱、密码、node_modules 或运行日志。沟通完成情况、证据、阻塞与下一步。每次有意义修改都向 PROJECT_HANDOFF 追加记录，不伪造中间历史或成功结果。破坏数据格式、删除数据或扩大网络功能前明确分析影响。已授权的常规工作可直接推进；缺少权限或信息时完成能独立完成的部分并具体说明阻塞。
