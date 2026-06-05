/** 平台修饰键标签（Mac / Windows） */
export function modKeyLabel(): string {
  return navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl+'
}

export function shortcut(label: string): string {
  const isMac = navigator.platform.toLowerCase().includes('mac')
  return label
    .replace(/Mod\+/g, isMac ? '⌘' : 'Ctrl+')
    .replace(/Shift\+/g, '⇧')
    .replace(/Alt\+/g, isMac ? '⌥' : 'Alt+')
}
