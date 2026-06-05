import axios from 'axios'

export async function fetchUrlSummary(url: string): Promise<{ title: string; text: string; error?: string }> {
  try {
    const res = await axios.get(url, {
      timeout: 15_000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OhSocial/1.0)' },
      maxContentLength: 500_000
    })
    const html = String(res.data)
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = titleMatch?.[1]?.trim() ?? url
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000)
    return { title, text: text || '（未能提取正文）' }
  } catch (err) {
    return { title: url, text: '', error: err instanceof Error ? err.message : '抓取失败' }
  }
}
