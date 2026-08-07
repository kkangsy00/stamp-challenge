import { ref, computed } from 'vue'
import { listActiveChallenges } from '../api/challenges.js'

// 모듈 싱글톤: 활성 챌린지 목록 + 현재 선택을 앱 전체가 공유한다.
const challenges = ref([])
const selectedChallengeId = ref('')
const loaded = ref(false)
let inFlight = null

export function useChallenges() {
  return {
    challenges,
    selectedChallengeId,
    currentChallenge: computed(
      () => challenges.value.find(c => c.id === selectedChallengeId.value) || null
    ),
    loadChallenges,
    ensureSelected,
    select,
  }
}

export async function loadChallenges() {
  // 동시 호출(App + 페이지)이 중복 요청하지 않도록 진행 중 promise를 공유.
  if (inFlight) return inFlight
  inFlight = (async () => {
    challenges.value = await listActiveChallenges()
    loaded.value = true
    if (!selectedChallengeId.value && challenges.value.length > 0) {
      selectedChallengeId.value = challenges.value[0].id
    }
    return challenges.value
  })()
  try {
    return await inFlight
  } finally {
    inFlight = null
  }
}

export async function ensureSelected() {
  if (selectedChallengeId.value) return selectedChallengeId.value
  if (!loaded.value) await loadChallenges()
  return selectedChallengeId.value || ''
}

export function select(id) {
  selectedChallengeId.value = id ? String(id) : ''
}
