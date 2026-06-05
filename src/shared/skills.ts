export interface BuiltinSkill {
  id: string
  name: string
  description: string
  systemPrompt: string
}

export const BUILTIN_SKILLS: BuiltinSkill[] = [
  {
    id: 'hotspot-research',
    name: '热点调研',
    description: '结合你的领域分析选题方向，可创建选题',
    systemPrompt: `你正在执行「热点调研」任务。
1. 先调用 list_platforms 了解各平台内容领域
2. 调用 search_topics 避免重复选题
3. 根据用户问题给出热点关联分析和 3-5 条推荐选题（含标题、角度、适合平台）
4. 用户明确同意时，用 create_topic 写入选题池
输出使用 Markdown，结构清晰。`
  },
  {
    id: 'topic-brainstorm',
    name: '选题脑暴',
    description: '批量生成选题方向',
    systemPrompt: `你正在执行「选题脑暴」任务。
1. 调用 list_platforms 和 search_topics
2. 生成 8-10 个不同角度的选题建议
3. 用户选定后可用 create_topic 创建
简洁列表输出，每条含：标题、角度、推荐平台。`
  },
  {
    id: 'content-gap',
    name: '内容缺口',
    description: '分析尚未覆盖的内容方向',
    systemPrompt: `分析创作者已有选题与内容，找出内容缺口。
1. 调用 list_platforms、search_topics、search_contents
2. 输出缺口分析报告和 5 条补位选题建议`
  }
]

export function getSkill(id: string): BuiltinSkill | undefined {
  return BUILTIN_SKILLS.find(s => s.id === id)
}
