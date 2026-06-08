/** 排版模板 — 编辑器预览 CSS + AI 生成指令 + 导出内联样式共用 */

export interface ContentLayoutTemplate {
  id: string
  name: string
  description: string
  /** 编辑器容器 class，用于套用预览皮肤 */
  cssClass: string
  /** 注入 AI system prompt 的排版规则 */
  aiFormatRules: string
  isDefault?: boolean
}

/** AI 生成时使用的语义 class，复制到公众号等平台时会转为 inline style */
export const OH_LAYOUT_CLASS = {
  h2: 'oh-h2',
  h3: 'oh-h3',
  quote: 'oh-quote',
  tip: 'oh-tip',
  intro: 'oh-intro',
  key: 'oh-key',
  highlight: 'oh-highlight',
  divider: 'oh-divider'
} as const

const CLASS_USAGE = `
排版 class 规范（必须在对应 HTML 元素上添加 class，便于编辑器预览与平台粘贴）：
- 小节标题：<h2 class="${OH_LAYOUT_CLASS.h2}">标题</h2>
- 子标题：<h3 class="${OH_LAYOUT_CLASS.h3}">标题</h3>
- 金句/引言：<blockquote class="${OH_LAYOUT_CLASS.quote}"><p>内容</p></blockquote>
- 提示/要点框：<blockquote class="${OH_LAYOUT_CLASS.tip}"><p>内容</p></blockquote>
- 开篇引导：<p class="${OH_LAYOUT_CLASS.intro}">内容</p>
- 关键词：<strong class="${OH_LAYOUT_CLASS.key}">词</strong>
- 高亮句：<mark class="${OH_LAYOUT_CLASS.highlight}">内容</mark>
- 章节分隔：<hr class="${OH_LAYOUT_CLASS.divider}" />
- 正文段落：<p>内容</p>（不加 class）
- 直接输出 HTML 正文，不要文章大标题、不要解释、不要 markdown 代码块`

export const CONTENT_LAYOUT_TEMPLATES: ContentLayoutTemplate[] = [
  {
    id: 'wechat-elegant',
    name: '公众号长文',
    description: '层次清晰、金句突出，适合微信公众号粘贴发布',
    cssClass: 'layout-wechat-elegant',
    isDefault: true,
    aiFormatRules: `${CLASS_USAGE}

公众号长文排版要求：
1. 开篇用 <p class="${OH_LAYOUT_CLASS.intro}">写 1-2 句引导语，吸引读者继续阅读
2. 每 3-5 段设置一个 <h2 class="${OH_LAYOUT_CLASS.h2}">小节标题
3. 段落短小（每段 2-4 句），适合手机阅读
4. 每节至少 1 处 <strong class="${OH_LAYOUT_CLASS.key}">关键词</strong> 或 <mark class="${OH_LAYOUT_CLASS.highlight}">高亮句</mark>
5. 精彩观点用 <blockquote class="${OH_LAYOUT_CLASS.quote}">包裹
6. 补充说明/行动建议用 <blockquote class="${OH_LAYOUT_CLASS.tip}">包裹
7. 大节之间用 <hr class="${OH_LAYOUT_CLASS.divider}" /> 分隔
8. 列举要点用 <ul><li>，步骤流程用 <ol><li>`
  },
  {
    id: 'xiaohongshu-bright',
    name: '小红书笔记',
    description: '短段落、重点高亮，适合小红书图文笔记',
    cssClass: 'layout-xiaohongshu-bright',
    aiFormatRules: `${CLASS_USAGE}

小红书笔记排版要求：
1. 不要使用 h2/h3 标题，用短 <p> 分段（每段 1-2 句话）
2. 开头第一段用 <p class="${OH_LAYOUT_CLASS.intro}">写 hook 句，可适度使用 emoji
3. 核心关键词用 <strong class="${OH_LAYOUT_CLASS.key}">包裹</strong>，重点句用 <mark class="${OH_LAYOUT_CLASS.highlight}">高亮</mark>
4. 干货要点用 <ul><li> 列表，每条简洁有力
5. 金句/总结用 <blockquote class="${OH_LAYOUT_CLASS.quote}"><p>内容</p></blockquote>
6. 段落之间留空行感，节奏轻快，全文 500-1000 字
7. 文末单独一段列出 3-5 个相关标签，格式：<p><strong class="${OH_LAYOUT_CLASS.key}">#标签名</strong></p>`
  },
  {
    id: 'knowledge-card',
    name: '知识卡片',
    description: '结构化干货，表格+步骤+提示框',
    cssClass: 'layout-knowledge-card',
    aiFormatRules: `${CLASS_USAGE}

知识卡片排版要求：
1. 开篇 <p class="${OH_LAYOUT_CLASS.intro}">用一句话概括全文价值
2. 用 <h2 class="${OH_LAYOUT_CLASS.h2}">划分 3-5 个知识模块
3. 每个模块下：先 <p> 解释，再 <ul> 或 <ol> 列要点
4. 有对比/参数时，使用 <table>（含 thead/tbody），表头用 <th>
5. 关键结论用 <blockquote class="${OH_LAYOUT_CLASS.quote}">框出
6. 实操技巧/注意事项用 <blockquote class="${OH_LAYOUT_CLASS.tip}">框出
7. 术语/数据用 <strong class="${OH_LAYOUT_CLASS.key}">标注</strong>
8. 模块间用 <hr class="${OH_LAYOUT_CLASS.divider}" /> 分隔`
  },
  {
    id: 'minimal',
    name: '极简黑白',
    description: '干净克制，少量装饰，通用平台适用',
    cssClass: 'layout-minimal',
    aiFormatRules: `${CLASS_USAGE}

极简排版要求：
1. 结构清晰但不花哨：适量 <h2 class="${OH_LAYOUT_CLASS.h2}"> + <p> 正文
2. 仅在最核心观点使用 <blockquote class="${OH_LAYOUT_CLASS.quote}">，不要过度装饰
3. 关键词偶尔用 <strong class="${OH_LAYOUT_CLASS.key}">标注</strong>，不要每段都加
4. 避免过多 hr、tip 框，保持留白与阅读节奏
5. 列表仅在真正需要列举时使用`
  }
]

export const DEFAULT_LAYOUT_TEMPLATE_ID = 'wechat-elegant'

export function getLayoutTemplate(id?: string | null): ContentLayoutTemplate {
  if (!id) {
    return CONTENT_LAYOUT_TEMPLATES.find(t => t.isDefault) ?? CONTENT_LAYOUT_TEMPLATES[0]
  }
  return CONTENT_LAYOUT_TEMPLATES.find(t => t.id === id) ?? CONTENT_LAYOUT_TEMPLATES[0]
}

export function listLayoutTemplates(): ContentLayoutTemplate[] {
  return CONTENT_LAYOUT_TEMPLATES
}
