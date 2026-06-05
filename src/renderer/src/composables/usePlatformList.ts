import { ref } from 'vue'
import type { PlatformOption } from '../../../shared/constants/platforms'
import type { PlatformAccount } from '../../../shared/types/platform-account'

const platforms = ref<PlatformOption[]>([])
const loaded = ref(false)

function toOptions(accounts: PlatformAccount[]): PlatformOption[] {
  return accounts.map(a => ({
    id: a.platform,
    name: a.displayName || a.platform
  }))
}

export function usePlatformList() {
  async function loadPlatforms(force = false) {
    if (loaded.value && !force) return platforms.value
    const accounts = (await window.ohsocial.invoke('account:list')) as PlatformAccount[]
    platforms.value = toOptions(accounts)
    loaded.value = true
    return platforms.value
  }

  function platformLabel(id: string): string {
    return platforms.value.find(p => p.id === id)?.name ?? id
  }

  function invalidatePlatforms() {
    loaded.value = false
  }

  return { platforms, loadPlatforms, platformLabel, invalidatePlatforms }
}
