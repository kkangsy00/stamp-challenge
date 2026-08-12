import { supabase, getCurrentUserId } from './client.js'

// 화면에서 실제로 쓰는 컬럼만. (정렬 기준인 created_at 은 선택하지 않아도 된다.)
const COLUMNS = 'id, title, is_active, accent_color'

// 읽기는 RLS가 본인 행만 반환하므로 user_id 필터를 수동으로 붙이지 않는다.
export async function listChallenges({ activeOnly = false } = {}) {
  let query = supabase.from('challenges').select(COLUMNS)

  if (activeOnly) query = query.eq('is_active', true)

  const { data } = await query.order('created_at', { ascending: false })
  return data || []
}

export async function createChallenge({ title, accent_color }) {
  const user_id = await getCurrentUserId()
  return supabase.from('challenges').insert({ user_id, title, accent_color })
}

export async function updateChallenge(id, patch) {
  return supabase.from('challenges').update(patch).eq('id', id)
}

export async function toggleActive(challenge) {
  return updateChallenge(challenge.id, { is_active: !challenge.is_active })
}

export async function removeChallenge(id) {
  return supabase.from('challenges').delete().eq('id', id)
}
