import { BUILTIN_PLATFORMS, type BuiltinPlatformId } from '../../shared/constants/platforms'
import { platformAccountDAO } from '../db/dao/platform-account-dao'

export const PLATFORM_ADAPT_RULES: Record<BuiltinPlatformId, string> = {
  wechat: `微信公众号长图文：
- 保留长文结构与深度
- 加强开头引导与结尾互动（点赞、在看、转发）
- 优化标题吸引力
- 段落清晰，适合手机阅读

排版要求：
- 段落短小（每段 2-3 句），段间留空行
- 使用 <h2> 做小节分隔，每 3-4 段一个
- 金句/核心观点用 <blockquote> 突出
- 关键词/数据用 <strong> 强调
- 列举要点用 <ul><li> 结构
- 结尾互动引导单独用 <p><strong> 包裹`,

  xiaohongshu: `小红书图文笔记：
- 压缩至 500-1000 字
- 口语化，适当使用 emoji
- 文末推荐 3-5 个相关标签
- 生成一句封面文案/标题 hook

排版要求：
- 超短段落（每段 1-2 句话），节奏轻快
- 多用 <strong> 标注重点和关键词
- 要点用 <ul><li> 呈现，简洁有力
- 每个要点/段落可以 emoji 开头
- 不要使用 <h2> 标题（小红书无标题层级）
- 标签用 <p><strong>#标签</strong></p> 格式`,

  douyin: `抖音短视频口播脚本：
- 提炼核心观点，60 秒以内口播
- 开头 3 秒必须有强 hook
- 分短句，节奏快
- 输出纯口播文案，标注时长建议

排版要求：
- 每句话单独一个 <p> 标签
- Hook 句用 <p><strong> 包裹
- 用 <hr> 分隔「开场/正文/结尾」
- 时间标注用 <blockquote>（如 "0-3s hook"）`,

  bilibili: `B站视频文案：
- 保留知识深度
- 适合带字幕的视频文案结构
- 增加互动引导（一键三连）
- 可分「开头 hook / 正文 / 结尾引导」

排版要求：
- 用 <h2> 标注段落主题（开头/正文段落/结尾）
- 保持适中段落长度（3-5 句/段）
- 关键论点用 <strong> 高亮
- 数据/案例用 <blockquote> 突出
- 要点总结用 <ol><li> 有序列表`,

  toutiao: `今日头条短资讯：
- 800-1500 字短资讯体
- 标题强吸睛，开头 3 行决定推荐
- 段落短、信息密度高
- 可选附 200-300 字微头条版摘要

排版要求：
- 极短段落（每段 1-3 句），利于信息流阅读
- 用 <h2> 设 2-3 个小节标题增加扫读性
- 数据/事实用 <strong> 强调
- 核心结论用 <blockquote> 框出
- 结尾可附 <hr> + 微头条摘要版`
}

const GENERIC_ADAPT_RULES = `通用自媒体内容改写：
- 保留核心观点与信息密度
- 优化段落结构，适合移动端阅读
- 加强开头吸引力与结尾互动引导
- 使用 <p>、<h2>、<strong>、<blockquote>、<ul>/<ol> 等 HTML 标签排版`

export function platformName(id: string): string {
  const account = platformAccountDAO.getByPlatform(id)
  if (account?.displayName) return account.displayName
  return BUILTIN_PLATFORMS.find(p => p.id === id)?.name ?? id
}

export function getPlatformAdaptRules(platformId: string): string {
  return PLATFORM_ADAPT_RULES[platformId as BuiltinPlatformId] ?? GENERIC_ADAPT_RULES
}
