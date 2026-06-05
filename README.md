# OhSocial

自媒体运营工具 —— AI 驱动的选题、创作、排期一站式解决方案。

## 产品简介

OhSocial 是一款桌面端自媒体运营工具，帮助创作者从「灵感驱动」升级为「体系化运营」。

**核心能力：**

- **选题中心** — AI 推荐选题、热度评分、选题池管理
- **内容工坊** — 富文本编辑器 + AI 辅助写作（续写/改写/润色）+ 视频脚本编辑
- **多平台改写** — 一次创作，AI 自动适配微信公众号、小红书、抖音、B站、今日头条
- **排期日历** — 日/周/月发布计划，发布提醒，周期模板
- **素材库** — 文案片段、参考链接、图片素材统一管理
- **工具中心** — 内置 Tools（web_search 等）+ Skills 技能包，AI 助手可联网调研并操作本地数据
- **素材库** — 文案片段、参考链接管理

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron |
| 构建工具 | electron-vite |
| UI 框架 | Vue 3 + TypeScript |
| 状态管理 | Pinia |
| 样式 | Tailwind CSS + DaisyUI |
| 富文本编辑 | TipTap |
| 数据库 | SQLite (better-sqlite3) |
| AI 调用 | axios (多模型适配器) |

## 文档

- [产品需求文档 (PRD)](docs/PRD.md)

## 开发

```bash
# 安装依赖（首次若 better-sqlite3 编译失败，可执行 postinstall 重建）
npm install
npm run postinstall

# 开发模式
npm run dev

# 构建
npm run build

# 打包 macOS
npm run pack:mac

# 打包 Windows
npm run pack:win
```

## macOS 安装说明

Release 包为 ad-hoc 签名（无 Apple 开发者证书），首次打开若提示「已损坏」：

1. 将 `OhSocial.app` 拖入「应用程序」文件夹
2. 在终端执行（替换为实际路径）：

```bash
xattr -cr /Applications/OhSocial.app
```

3. 或在「系统设置 → 隐私与安全性」中点击「仍要打开」

## 许可证

Private
