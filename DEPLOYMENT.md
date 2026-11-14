# GitHub 网页发布

仓库：<https://github.com/qiuxicqu/hanzi>

预期公开地址：<https://qiuxicqu.github.io/hanzi/>。只有 GitHub Pages 部署成功后，该地址才会提供本项目网页。

## 发布方式

推送 main 分支会运行 `.github/workflows/pages.yml`：先执行测试，再将 `public/` 上传 GitHub Pages。初次发布如因 Pages 尚未启用而失败，需在仓库 Settings → Pages → Build and deployment 中选择 GitHub Actions，再重跑工作流。

公开站点只包含静态资源，不会上传 `.env`、`data/`、学习记录或服务密钥。中文自由朗读通过浏览器语音功能运行。未配置后端时仍可打开网站和使用自由朗读；课程、习题、批改、记忆更新和计划会明确提示服务未连接，不会伪造模型结果。

## 完整教学功能

GitHub Pages 不执行 Node.js。完整功能需要单独托管 `server.mjs`，密钥保存在托管平台的服务器环境变量中，并配置持久存储、允许的前端来源、HTTPS 会话及公开服务的访问限制。

后端部署成功后，才将其 HTTPS 服务根地址填写到 `public/deployment-config.js` 的 `API_BASE_URL`。该文件只保存公开服务地址，禁止放入密钥。当前后端仍采用本机访问限制，不能仅填一个地址就直接对外开放。

GitHub Secrets 可以供部署工作流使用，但无法让公开静态网页安全读取服务器密钥。不得把密钥写入前端、仓库、工作流日志或构建产物。
