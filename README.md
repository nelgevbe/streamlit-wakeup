# 🛠️ Uptime Kuma 联动 GitHub Actions 配置指南

通过 Webhook 结合 GitHub API，实现服务监控告警自动触发 GitHub Actions 工作流（例如：**Streamlit 自动唤醒**）。

---

## 📡 通知设置 (Uptime Kuma)

请在 Uptime Kuma 后台新建通知，类型选择 **Webhook**，并参考以下参数填写：

### 1. 接口地址 (Post URL)

将 `[OWNER]` 和 `[REPO]` 替换为你的 GitHub 用户名和仓库名：

> `https://api.github.com/repos/[OWNER]/[REPO]/dispatches`

### 2. 请求体 (Body)

**Content-Type**: `自定义内容`

```json
{
  "event_type": "streamlit_wakeup",
  "client_payload": {
    "status": "{{ status }}",
    "msg": "{{ msg }}"
  }
}
```

### 2. 请求头 (Headers)

`TOKEN 权限`：生成 GitHub PAT (Personal Access Token) 时，请确保勾选了 repo 权限。

```json
{
  "Authorization": "token ghp_您的个人访问令牌",
  "Accept": "application/vnd.github.v3+json",
  "User-Agent": "Uptime-Kuma"
}
```

## ⚙️ GitHub Actions 接收端配置

在你的仓库 .github/workflows/ 目录下创建 wakeup.yml，并确保 types 与 Webhook 中的 event_type 保持一致

```
name: Remote Streamlit Wakeup

on:
  repository_dispatch:
    types: [streamlit_wakeup]

jobs:
  execute:
    runs-on: ubuntu-latest
    if: |
      github.event_name == 'workflow_dispatch' ||
      (github.event_name == 'repository_dispatch' &&
      (github.event.client_payload.status == '0' || github.event.client_payload.status == 0))
    steps:
      - name: Wake up App
        run: |
          echo "Waking up app..."
          # 在此处添加唤醒应用的脚本或命令
```
