import { ref } from 'vue'
import type { WritingStyle } from '../../../shared/types/writing-style'

const styles = ref<WritingStyle[]>([])
const loaded = ref(false)

export function useWritingStyles() {
  async function loadWritingStyles(force = false) {
    if (loaded.value && !force) return styles.value
    styles.value = (await window.ohsocial.invoke('writing-style:list')) as WritingStyle[]
    loaded.value = true
    return styles.value
  }

  function invalidateWritingStyles() {
    loaded.value = false
  }

  return { styles, loadWritingStyles, invalidateWritingStyles }
}
