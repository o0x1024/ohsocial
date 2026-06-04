# OhSocial

自媒体运营工具 —— AI 驱动的选题、创作、排期一站式解决方案。

## 产品简介

OhSocial 是一款桌面端自媒体运营工具，帮助创作者从「灵感驱动」升级为「体系化运营」。

**核心能力：**

- **选题中心** — AI 推荐选题、热度评分、选题池管理
- **内容工坊** — 富文本编辑器 + AI 辅助写作（续写/改写/润色）+ 视频脚本编辑
- **多平台改写** — 一次创作，AI 自动适配微信公众号、小红书、抖音、B站
- **排期日历** — 日/周/月发布计划，发布提醒，周期模板
- **素材库** — 文案片段、参考链接、图片素材统一管理

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
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 打包 macOS
npm run pack:mac

# 打包 Windows
npm run pack:win
```

## 许可证

Private
