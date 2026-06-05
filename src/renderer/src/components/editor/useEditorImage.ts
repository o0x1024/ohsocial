import { ref } from 'vue'
import type { Material } from '../../../../shared/types/material'

export async function resolveImageSrc(material: Material): Promise<string | null> {
  const path = material.url || material.content
  if (!path) return null
  if (path.startsWith('data:') || path.startsWith('http')) return path
  const r = (await window.ohsocial.invoke('media:file-to-data-url', path)) as {
    success: boolean
    dataUrl?: string
  }
  return r.success && r.dataUrl ? r.dataUrl : null
}

export async function pickLocalImageDataUrl(): Promise<string | null> {
  const r = (await window.ohsocial.invoke('material:pick-image')) as {
    success: boolean
    material?: Material
  }
  if (!r.success || !r.material) return null
  return resolveImageSrc(r.material)
}

export async function loadImageMaterials(): Promise<Material[]> {
  const all = (await window.ohsocial.invoke('material:list', 'image')) as Material[]
  return all.filter(m => m.type === 'image')
}

export function useEditorImageInsert() {
  const pickerOpen = ref(false)

  async function insertFromFile(editor: { chain: () => { focus: () => { setImage: (a: { src: string }) => { run: () => boolean } } } } | undefined) {
    const src = await pickLocalImageDataUrl()
    if (src && editor) {
      editor.chain().focus().setImage({ src }).run()
    }
  }

  return { pickerOpen, insertFromFile }
}
