import axios from 'axios'
import { appPreferenceDAO } from '../db/dao/app-preference-dao'

export interface SearchResult {
  title: string
  snippet: string
  link: string
}

export async function webSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  const apiKey = appPreferenceDAO.get('serper_api_key')
  if (!apiKey) {
    return [{ title: '未配置搜索 API', snippet: '请在设置 → 助手能力 中配置 Serper API Key', link: '' }]
  }
  try {
    const res = await axios.post(
      'https://google.serper.dev/search',
      { q: query, num: maxResults },
      {
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        timeout: 15_000
      }
    )
    const organic = res.data.organic ?? []
    return organic.slice(0, maxResults).map((item: { title?: string; snippet?: string; link?: string }) => ({
      title: item.title ?? '',
      snippet: item.snippet ?? '',
      link: item.link ?? ''
    }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : '搜索失败'
    return [{ title: '搜索出错', snippet: msg, link: '' }]
  }
}
