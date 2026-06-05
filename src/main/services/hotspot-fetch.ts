import axios from 'axios'
import { hotspotDAO } from '../db/dao/hotspot-dao'

interface HotItem {
  title: string
  url?: string
  heatScore?: number
}

async function fetchWeiboHot(): Promise<HotItem[]> {
  try {
    const res = await axios.get('https://tenapi.cn/v2/weibohot', { timeout: 10_000 })
    const list = res.data?.data ?? res.data?.list ?? []
    if (!Array.isArray(list)) return []
    return list.slice(0, 20).map((item: { title?: string; name?: string; hot?: number; url?: string }) => ({
      title: item.title ?? item.name ?? '',
      heatScore: typeof item.hot === 'number' ? item.hot : undefined,
      url: item.url
    })).filter(i => i.title)
  } catch {
    return []
  }
}

async function fetchBaiduHot(): Promise<HotItem[]> {
  try {
    const res = await axios.get('https://tenapi.cn/v2/baiduhot', { timeout: 10_000 })
    const list = res.data?.data ?? []
    if (!Array.isArray(list)) return []
    return list.slice(0, 20).map((item: { name?: string; title?: string; hot?: string }) => ({
      title: item.name ?? item.title ?? '',
      heatScore: item.hot ? parseInt(String(item.hot).replace(/\D/g, ''), 10) || undefined : undefined
    })).filter(i => i.title)
  } catch {
    return []
  }
}

export async function refreshHotspots(source: 'weibo' | 'baidu' | 'all' = 'all') {
  const items: HotItem[] = []
  if (source === 'weibo' || source === 'all') {
    const weibo = await fetchWeiboHot()
    if (weibo.length) {
      hotspotDAO.clearBySource('weibo_api')
      hotspotDAO.bulkInsert(weibo, 'weibo_api')
      items.push(...weibo)
    }
  }
  if (source === 'baidu' || source === 'all') {
    const baidu = await fetchBaiduHot()
    if (baidu.length) {
      hotspotDAO.clearBySource('baidu_api')
      hotspotDAO.bulkInsert(baidu, 'baidu_api')
      items.push(...baidu)
    }
  }
  return hotspotDAO.list(50)
}
