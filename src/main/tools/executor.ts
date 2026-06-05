import { topicDAO } from '../db/dao/topic-dao'
import { contentDAO } from '../db/dao/content-dao'
import { materialDAO } from '../db/dao/material-dao'
import { personaDAO } from '../db/dao/persona-dao'
import { webSearch } from '../services/web-search'
import { fetchUrlSummary } from '../services/fetch-url'

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'search_topics': {
      const q = String(args.query ?? '')
      const all = topicDAO.list()
      if (!q) return all.slice(0, 10)
      return all.filter(t =>
        t.title.includes(q) || t.description.includes(q) || t.notes.includes(q)
      ).slice(0, 10)
    }
    case 'search_contents': {
      const q = String(args.query ?? '')
      const all = contentDAO.list()
      if (!q) return all.slice(0, 10).map(c => ({ id: c.id, title: c.title, platform: c.platform, status: c.status }))
      return all
        .filter(c => c.title.includes(q) || c.body.includes(q))
        .slice(0, 10)
        .map(c => ({ id: c.id, title: c.title, platform: c.platform, status: c.status }))
    }
    case 'search_materials': {
      const q = String(args.query ?? '').trim()
      if (!q) return materialDAO.list().slice(0, 10)
      return materialDAO.search(q)
    }
    case 'get_persona':
      return personaDAO.get()
    case 'create_topic': {
      const title = String(args.title ?? '')
      if (!title) return { error: '缺少 title' }
      return topicDAO.create({
        title,
        description: String(args.description ?? ''),
        status: 'idea',
        source: 'ai_recommend'
      })
    }
    case 'save_material': {
      return materialDAO.create({
        type: (args.type as 'text_snippet' | 'link') ?? 'text_snippet',
        title: String(args.title ?? '参考资料'),
        content: String(args.content ?? ''),
        url: args.url ? String(args.url) : undefined,
        description: String(args.description ?? '')
      })
    }
    case 'web_search': {
      const query = String(args.query ?? '')
      if (!query) return { error: '缺少 query' }
      return webSearch(query, Number(args.max_results ?? 5))
    }
    case 'fetch_url': {
      const url = String(args.url ?? '')
      if (!url) return { error: '缺少 url' }
      return fetchUrlSummary(url)
    }
    case 'analyze_url': {
      const url = String(args.url ?? '')
      if (!url) return { error: '缺少 url' }
      const fetched = await fetchUrlSummary(url)
      return materialDAO.create({
        type: 'link',
        title: fetched.title,
        url,
        content: fetched.text,
        description: fetched.error ?? ''
      })
    }
    case 'batch_create_topics': {
      const titles = args.titles as string[] | undefined
      if (!Array.isArray(titles) || !titles.length) return { error: '缺少 titles 数组' }
      return titles.slice(0, 20).map(title =>
        topicDAO.create({ title: String(title), status: 'idea', source: 'ai_recommend' })
      )
    }
    default:
      return { error: `未知工具: ${name}` }
  }
}

export const TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'search_topics',
      description: '搜索本地选题池',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: '关键词' } },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_contents',
      description: '搜索本地内容库',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: '关键词' } },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_persona',
      description: '获取创作者个人定位配置',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_topic',
      description: '创建一条选题到选题池',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'save_material',
      description: '保存文案片段或参考链接到素材库',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          url: { type: 'string' },
          type: { type: 'string', enum: ['text_snippet', 'link'] }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_materials',
      description: '搜索本地素材库',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: '联网搜索（需配置 Serper API Key）',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          max_results: { type: 'number' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: '抓取网页正文摘要',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string' } },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_url',
      description: '分析 URL 并保存为素材库链接',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string' } },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'batch_create_topics',
      description: '批量创建选题',
      parameters: {
        type: 'object',
        properties: {
          titles: { type: 'array', items: { type: 'string' } }
        },
        required: ['titles']
      }
    }
  }
]
