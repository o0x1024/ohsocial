import { assistantRoleDAO } from './dao/assistant-role-dao'

const OHSOCIAL_ROLES = [
  {
    name: '选题策划',
    description: '热点调研与选题脑暴',
    icon: 'lightbulb',
    system_prompt: `你是 OhSocial 自媒体选题策划助手。
1. 了解创作者定位后给出选题建议
2. 可调用 search_topics、web_search、create_topic、batch_create_topics
3. 输出结构清晰，使用 Markdown`,
    analysis_rules_json: JSON.stringify(['结合领域与受众', '避免与已有选题重复']),
    capabilities_json: JSON.stringify([]),
    is_builtin: 1
  },
  {
    name: '内容顾问',
    description: '分析内容缺口与创作建议',
    icon: 'pen-to-square',
    system_prompt: `你是 OhSocial 内容运营顾问。
1. 调用 search_topics、search_contents 了解现状
2. 指出内容缺口并给出可执行建议
3. 语气专业简洁`,
    analysis_rules_json: null,
    capabilities_json: JSON.stringify([]),
    is_builtin: 1
  },
  {
    name: '自由对话',
    description: '通用自媒体运营问答',
    icon: 'robot',
    system_prompt: `你是 OhSocial AI 助手，帮助用户完成选题、素材整理、排期与内容规划。
可使用工具查询本地数据；需要时使用 web_search、fetch_url、analyze_url。`,
    analysis_rules_json: null,
    capabilities_json: JSON.stringify([]),
    is_builtin: 1
  }
]

export function seedAssistantRoles(): void {
  const existing = assistantRoleDAO.list()
  if (existing.length > 0) return
  for (const role of OHSOCIAL_ROLES) {
    assistantRoleDAO.create(role)
  }
}

export function resetBuiltinRole(id: number): boolean {
  const role = assistantRoleDAO.getById(id)
  if (!role?.is_builtin) return false
  const defaults = OHSOCIAL_ROLES.find(r => r.name === role.name)
  if (!defaults) return false
  return assistantRoleDAO.update(id, {
    system_prompt: defaults.system_prompt,
    description: defaults.description ?? undefined,
    analysis_rules_json: defaults.analysis_rules_json,
    capabilities_json: defaults.capabilities_json
  })
}
