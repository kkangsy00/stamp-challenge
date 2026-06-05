import { supabase, getCurrentUserId } from './client.js'

// 화면에서 실제로 쓰는 컬럼만. (예전 CalendarView의 stamps(...) 조인은 미사용이라 제거)
const COLUMNS = 'id, achieved_on, stamp_snapshot_path, note'

// 특정 챌린지의 기록 목록. fromDate 가 있으면 그 날짜 이후만.
export async function listRecordsByChallenge(challengeId, { fromDate, ascending = false } = {}) {
  let query = supabase
    .from('challenge_records')
    .select(COLUMNS)
    .eq('challenge_id', challengeId)

  if (fromDate) query = query.gte('achieved_on', fromDate)

  const { data } = await query.order('achieved_on', { ascending })
  return data || []
}

export async function countRecords(challengeId) {
  const { count } = await supabase
    .from('challenge_records')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challengeId)
  return count || 0
}

export async function listRecordsPaged(challengeId, from, to) {
  const { data } = await supabase
    .from('challenge_records')
    .select(COLUMNS)
    .eq('challenge_id', challengeId)
    .range(from, to)
    .order('achieved_on', { ascending: true })
  return data || []
}

// 달성 기록. (challenge_id, achieved_on) UNIQUE 제약 기반 upsert —
// 같은 날짜에 이미 기록이 있으면 덮어쓴다(원자적, 왕복 1회). { error } 반환.
export async function achieve({ challengeId, achieved_on, stamp, mode, note }) {
  const user_id = await getCurrentUserId()
  const { error } = await supabase
    .from('challenge_records')
    .upsert(
      {
        user_id,
        challenge_id: challengeId,
        achieved_on,
        stamp_id: stamp?.id ?? null,
        stamp_snapshot_path: stamp?.image_path ?? null,
        selection_mode: mode,
        note: note?.trim() || null,
      },
      { onConflict: 'challenge_id,achieved_on' }
    )
  return { error }
}

export async function removeRecord(id) {
  return supabase.from('challenge_records').delete().eq('id', id)
}
