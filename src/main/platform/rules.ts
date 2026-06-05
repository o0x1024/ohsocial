import { PLATFORMS, type PlatformId } from '../../shared/constants/platforms'

export const PLATFORM_ADAPT_RULES: Record<PlatformId, string> = {
  wechat: `微信公众号长图文：
- 保留长文结构与深度
- 加强开头引导与结尾互动（点赞、在看、转发）
- 优化标题吸引力
- 段落清晰，适合手机阅读`,

  xiaohongshu: `小红书图文笔记：
- 压缩至 500-1000 字
- 口语化，适当使用 emoji
- 文末推荐 3-5 个相关标签
- 生成一句封面文案/标题 hook`,

  douyin: `抖音短视频口播脚本：
- 提炼核心观点，60 秒以内口播
- 开头 3 秒必须有强 hook
- 分短句，节奏快
- 输出纯口播文案，标注时长建议`,

  bilibili: `B站视频文案：
- 保留知识深度
- 适合带字幕的视频文案结构
- 增加互动引导（一键三连）
- 可分「开头 hook / 正文 / 结尾引导」`,

  toutiao: `今日头条短资讯：
- 800-1500 字短资讯体
- 标题强吸睛，开头 3 行决定推荐
- 段落短、信息密度高
- 可选附 200-300 字微头条版摘要`
}

export function platformName(id: string): string {
  return PLATFORMS.find(p => p.id === id)?.name ?? id
}
