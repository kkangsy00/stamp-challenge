import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// 현재 로그인한 유저 id (로컬 세션 기반 — 네트워크 왕복 없음).
// getUser()는 매번 서버 토큰 검증을 하므로, id만 필요할 땐 getSession()을 쓴다.
export async function getCurrentUserId() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id || null
}
