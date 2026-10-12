# 2fa.fun 参考站分析

分析日期：2026-10-12。读取公开 index.html 和 static/js/get-2fa-otp.js，未输入真实密钥。这里只描述所观察文件；未完成所有依赖、登录模块或服务端的全面审计。

## HTML / CSS

页面包含品牌导航、工具菜单、2FA 输入区、结果列表和说明。支持多行密钥以及 UID|密码|2FA|邮箱|邮箱密码格式。HTML 内包含中英文文案字典及内联样式，使用浅色渐变、半透明卡片、侧栏等；外部加载 Tailwind CDN、Font Awesome，以及本地 app.min.css、custom-style.css 等样式。还加载 Google Analytics。

## JavaScript

页面加载 vendors、axios、clipboard、moment、buffer、otplib、auth.js 等资源。核心 get-2fa-otp.js 的 getOtp() 直接调用 window.otplib.authenticator.generate(secret)。getSecrets() 按换行拆分，去空格后按 | 拆分，尝试第三列及首列作为密钥，通过 otplib.decode 判断可用性。结果按密钥去重，显示六位 OTP、剩余时间和明文密钥。每秒重新渲染，倒计时取 step 与当前秒数取余；复制使用 navigator.clipboard.writeText。

该核心文件中未观察到把密钥发送至服务端的调用，但不能据此保证整站及其第三方脚本永不读取/传输数据。它直接使用 HTML 模板插入结果，新项目改用 textContent 和 DOM 构造。

## TOTP

标准算法：Base32 解码密钥 → floor(Unix 秒数 / 30) → 8 字节大端计数器 → HMAC-SHA1 → 根据末字节低 4 位动态截断 → 清除符号位 → 对 10^6 取余 → 左侧补零。

https://www.rfc-editor.org/rfc/rfc6238

算法不要求向 Google 请求验证码。双方拥有相同密钥和准确时间，就能独立计算相同结果。刷新频率是 30 秒而不是数分钟。

## 独立实现范围

保留输入、生成、自动更新、复制功能，增加多账号和可选加密保存。只支持 SHA1 / 6 位 / 30 秒配置并明确拒绝不兼容 URI。没有复制原站 HTML/CSS/JS、导航工具、品牌或统计模块；不接受带登录密码的批量账户行，避免不必要地收集密码。
