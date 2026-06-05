/** 将平台显示名转为唯一 id（英文/数字/中文/下划线） */
export function slugifyPlatformName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return `platform_${Date.now()}`
  const slug = trimmed
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
  return slug || `platform_${Date.now()}`
}
