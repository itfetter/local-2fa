# Local 2FA

独立实现的浏览器本地 TOTP 身份验证器。参考 2fa.fun 的核心交互，不复制其源码、商标或第三方资源。默认 SHA1、6 位、30 秒，兼容此配置的 Google Authenticator 密钥。

## 功能

- Base32 密钥（支持空格、小写）或 otpauth://totp URI。
- 多账号添加、去重、移除，验证码分组显示与复制。
- 每秒重新计算时间，每 30 秒更新验证码；从后台恢复时立即更新。
- 默认只保存在内存，刷新/关闭即丢失。
- 可选加密本地保存：PBKDF2-SHA256（600,000 次迭代，随机 16 字节盐）派生 AES-256-GCM 密钥；每次保存使用随机 12 字节 IV。
- 密码至少 12 字符；密码不持久保存，锁定清除内存账号。修改账号后必须再次加密保存。
- 无后端、无 CDN、无统计、无第三方运行依赖。CSP 的 connect-src 'none' 禁止 fetch/XHR/WebSocket 网络连接；form-action 'none' 禁止表单提交。

## 使用

在账号的安全设置中取得 TOTP 设置密钥（不是正在显示的六位验证码），填写名称和密钥后添加。必须保持设备时钟准确；不用把真实密钥提交到 GitHub、截图、聊天或 URL。此工具不替代短信验证、Google 提示或安全密钥。

本地运行（需要 Python 3）：

```sh
python3 -m http.server 8080
```

访问 http://localhost:8080。必须用 HTTPS 或 localhost；不要直接双击 HTML（ES modules 和 Web Crypto 可能受浏览器限制）。所有资源加载完毕后计算无需网络，但此版本不提供 Service Worker 离线重开保证。

保险箱只属于当前浏览器、当前网站来源。换浏览器/域名无法自动迁移；清理网站数据会删除副本。密码无法找回，请保留服务商恢复码。锁定前保存修改；解锁会替换内存账号。锁定不会清除系统剪贴板，也不保证 JavaScript 运行时立即擦除物理内存。

## 获取源码

```sh
git clone https://github.com/itfetter/local-2fa.git
cd local-2fa
```

运行页面不需要安装 Node 或 npm 依赖；本地静态预览使用上述 Python 命令。开发测试需要 Node.js 24。

## GitHub Pages

新建独立仓库 `itfetter/local-2fa`，上传此目录内容至 `main`，保留隐藏的 `.github` 目录。在 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。运行 `Test and deploy GitHub Pages` 工作流。它先测试再发布，发布文件仅包含 index.html、style.css、app.js、core.js。

项目页面预期位于 `https://itfetter.github.io/local-2fa/`，以 Actions 返回的实际地址为准。如果个人 Pages 有自定义域名，项目页面可能继承该域名；不要修改博客仓库或用户级 Pages 配置。

备选：Deploy from a branch，main / (root)。若选择此方式，需同时停用 Actions 部署工作流，避免两套发布流程冲突；默认推荐 GitHub Actions。

## 验证

Node.js 24，无需 npm install：

```sh
npm test
```

覆盖 RFC 6238 六组 SHA1 标准向量（8 位及其 6 位输出）、30 秒边界、Base32 检查、URI 参数拒绝、加密往返、随机盐/IV、错误密码与密文篡改拒绝。

浏览器手工验收使用**公开测试密钥** `GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ`：

1. 添加两个账号，观察六位验证码及 30 秒倒计时，等待边界确认自动更新。
2. 点击复制，确认剪贴板内容为六位无空格数字。
3. 保存保险箱，检查 localStorage 只有 salt、iv、ciphertext 等加密字段；刷新后没有账号。
4. 错误密码解锁应失败，正确密码恢复账号；删除账号后重新保存并验证。
5. 锁定应清空卡片；检查开发者工具 Network，除首次静态资源外无验证码请求。断网后保持页面打开，仍能更新。
6. 窄屏检查布局和键盘操作。真实账号密钥不要用于截图或自动化测试。

当前 5 项核心测试已在本地及 GitHub Actions 中通过。首次发布因 Pages 未开启而停在配置步骤，尚未验证正式访问地址和浏览器交互。最新交接状态见 PROJECT_HANDOFF.md。

## 项目文档

| 文档 | 读者与内容 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | 开发者/AI：目标、技术栈、数据模型、修改边界、开发与部署规范 |
| [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) | 接手维护者：进度、每次变更、验证、部署状态、问题与下一步 |
| [FEATURE_MAP.md](FEATURE_MAP.md) | 开发者：按功能定位源码、内部接口、存储和测试 |
| [README.md](README.md) | 用户/开发者：使用、运行、部署和规划 |

## 文件

- index.html / style.css：独立响应式中文界面。
- app.js：账号生命周期、DOM 安全渲染、复制与保险箱 UI。
- core.js：Base32、TOTP、Web Crypto 加密。
- tests/core.test.js：标准向量和加密测试。
- .github/workflows/pages.yml：测试及静态发布。
- REFERENCE_ANALYSIS.md：原站架构和算法分析。

## 安全边界

密钥始终在浏览器内计算；服务器只提供静态文件。GitHub Pages 会收到正常页面/资源访问请求，但应用不发送密钥或验证码。加密副本无法防御恶意扩展、设备恶意软件或被篡改的页面 JavaScript；保险箱解锁时密钥存在内存中。更改部署代码可能改变这些保证，应保护 GitHub 账号和部署权限。不要将密码和验证器同时保存在不可信环境。

GitHub Pages 项目路径不构成独立来源：如果最终与博客同域，其他同源 JavaScript 理论上可读取加密副本。要求更强隔离时应使用独立域名；本项目不会调整你的博客。

## 长期规划

以下为候选方向，尚未实现，也不代表实施承诺：

- 首先完成 Pages 发布与浏览器实际验收，稳定当前核心体验。
- 加密备份导出/导入，让用户主动迁移浏览器数据。
- 账号搜索、重命名和排序，提高多账号管理效率。
- 按实际需要增加二维码导入及更多 TOTP 参数，配套标准测试。
- 评估离线重开能力和独立域名隔离；继续坚持密钥本地计算。

## License

本项目独立源码使用 MIT 许可证。参考站源码未纳入项目。
