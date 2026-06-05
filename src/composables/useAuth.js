import { ref, computed } from 'vue'
import { supabase } from '../api/client.js'

// 모듈 싱글톤: 앱 전체가 같은 세션 상태를 공유한다.
const session = ref(null)
const ready = ref(false)
let initialized = false

export function useAuth() {
  // 최초 1회만 세션을 읽고 변경 구독을 건다.
  if (!initialized) {
    initialized = true
    supabase.auth.getSession().then(({ data }) => {
      session.value = data.session
      ready.value = true
    })
    supabase.auth.onAuthStateChange((_event, s) => {
      session.value = s
    })
  }

  return {
    session,
    ready,
    isLoggedIn: computed(() => !!session.value),
    logout: () => supabase.auth.signOut(),
  }
}

// 라우터 가드용. 캐시된 세션이 있으면 그대로, 없으면 로컬 스토리지에서 한 번 확인.
// (로그인 직후 onAuthStateChange 가 아직 반영 안 된 순간에도 안전하도록.)
export async function ensureSession() {
  if (ready.value && session.value) return session.value
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  ready.value = true
  return session.value
}
