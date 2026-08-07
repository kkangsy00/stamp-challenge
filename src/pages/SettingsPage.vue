<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  listChallenges,
  createChallenge,
  updateChallenge,
  toggleActive as toggleActiveChallenge,
  removeChallenge,
} from '../api/challenges.js'
import {
  listStamps,
  stampPublicUrl,
  uploadStamp as uploadStampApi,
  replaceStampImage as replaceStampImageApi,
  softDeleteStamp,
  restoreStamp as restoreStampApi,
  hardDeleteStamp,
} from '../api/stamps.js'
import { loadChallenges } from '../composables/useChallenges.js'

const DEFAULT_ACCENT = '#1a3a5c'

const challenges = ref([])
const newTitle = ref('')
const newAccentColor = ref(DEFAULT_ACCENT)
const challengeLoading = ref(false)
const editingChallengeId = ref(null)
const editingTitle = ref('')
const editingAccentColor = ref(DEFAULT_ACCENT)
const renamingChallengeId = ref(null)
const challengeMessage = ref('')

const accentPalette = [
  "#ef476f",
  "#ffd166",
  "#83c5be",
  '#06d6a0',
  '#118ab2',
  DEFAULT_ACCENT,
]

const stamps = ref([])
const uploading = ref(false)
const replacingStampId = ref(null)
const permanentlyDeletingStampId = ref(null)
const newName = ref('')
const fileInput = ref(null)
const stampFileInputs = ref({})
const message = ref('')
const showDeletedStamps = ref(false)

const activeStamps = computed(() => stamps.value.filter(s => s.is_active))
const deletedStamps = computed(() => stamps.value.filter(s => !s.is_active))

// 설정 화면은 비활성 챌린지도 보여주므로 전체 목록을 가져온다.
async function fetchChallenges() {
  challenges.value = await listChallenges()
}

// 챌린지 변경 후 App 상단의 공유 목록(활성만)도 갱신한다.
async function refreshChallenges() {
  await fetchChallenges()
  await loadChallenges()
}

async function addChallenge() {
  if (!newTitle.value.trim()) return
  challengeLoading.value = true
  challengeMessage.value = ''

  await createChallenge({ title: newTitle.value.trim(), accent_color: newAccentColor.value })

  newTitle.value = ''
  newAccentColor.value = DEFAULT_ACCENT
  await refreshChallenges()
  challengeLoading.value = false
}

async function toggleActive(c) {
  await toggleActiveChallenge(c)
  await refreshChallenges()
}

function startEditingChallenge(challenge) {
  editingChallengeId.value = challenge.id
  editingTitle.value = challenge.title
  editingAccentColor.value = challenge.accent_color
  challengeMessage.value = ''
}

function cancelEditingChallenge() {
  editingChallengeId.value = null
  editingTitle.value = ''
  editingAccentColor.value = DEFAULT_ACCENT
}

async function saveChallenge(challenge) {
  const trimmedTitle = editingTitle.value.trim()
  const accentColor = editingAccentColor.value

  if (!trimmedTitle) {
    challengeMessage.value = '챌린지 이름을 입력해주세요.'
    return
  }

  if (trimmedTitle === challenge.title && accentColor === challenge.accent_color) {
    cancelEditingChallenge()
    return
  }

  renamingChallengeId.value = challenge.id
  challengeMessage.value = ''

  const { error } = await updateChallenge(challenge.id, {
    title: trimmedTitle,
    accent_color: accentColor,
  })

  if (error) {
    challengeMessage.value = '이름 수정 실패: ' + error.message
  } else {
    challengeMessage.value = '챌린지 이름을 수정했어요.'
    cancelEditingChallenge()
    await refreshChallenges()
  }

  renamingChallengeId.value = null
}

async function deleteChallenge(c) {
  if (!confirm(`"${c.title}" 챌린지를 정말 삭제할까요?`)) return
  await removeChallenge(c.id)
  await refreshChallenges()
}

async function fetchStamps() {
  stamps.value = await listStamps()
}

const stampUrl = stampPublicUrl

function setStampFileInputRef(stampId, el) {
  if (el) {
    stampFileInputs.value[stampId] = el
    return
  }

  delete stampFileInputs.value[stampId]
}

function openReplaceDialog(stampId) {
  stampFileInputs.value[stampId]?.click()
}

async function uploadStamp() {
  const file = fileInput.value?.files?.[0]
  if (!file || !newName.value.trim()) {
    message.value = '이름과 파일을 모두 입력해주세요'
    return
  }

  uploading.value = true
  message.value = ''

  const { error } = await uploadStampApi({ name: newName.value.trim(), file })

  if (error) {
    message.value = '업로드 실패: ' + error.message
  } else {
    newName.value = ''
    fileInput.value.value = ''
    await fetchStamps()
  }

  uploading.value = false
}

async function deleteStamp(s) {
  if (!confirm(`"${s.name}" 도장을 삭제할까요? 기존 기록 이미지는 그대로 유지돼요.`)) return

  const { error } = await softDeleteStamp(s.id)
  if (error) {
    message.value = '도장 삭제 실패: ' + error.message
    return
  }

  await fetchStamps()
}

async function restoreStamp(s) {
  const { error } = await restoreStampApi(s.id)
  if (error) {
    message.value = '도장 복원 실패: ' + error.message
    return
  }

  await fetchStamps()
}

async function permanentlyDeleteStamp(s) {
  if (s.is_active) return

  const confirmed = confirm(
    `"${s.name}" 도장을 영구 삭제할까요?\n\n이 작업은 되돌릴 수 없고, 이 도장을 사용한 기존 기록의 이미지도 모두 제거됩니다.`
  )

  if (!confirmed) return

  permanentlyDeletingStampId.value = s.id
  message.value = ''

  const { error } = await hardDeleteStamp(s)
  if (error) {
    message.value = '도장 영구 삭제 실패: ' + error.message
  } else {
    await fetchStamps()
  }

  permanentlyDeletingStampId.value = null
}

async function replaceStampImage(s, event) {
  const file = event.target?.files?.[0]
  if (!file) return

  replacingStampId.value = s.id
  message.value = ''

  const { error } = await replaceStampImageApi(s, file)
  if (error) {
    message.value = '이미지 변경 실패: ' + error.message
  } else {
    await fetchStamps()
  }

  replacingStampId.value = null
  event.target.value = ''
}

onMounted(async () => {
  await fetchChallenges()
  await fetchStamps()
})
</script>

<template>
  <div class="settings-wrap">
    <section>
      <h3 class="section-title">Challenges</h3>
      <form @submit.prevent="addChallenge" class="add-form">
        <input v-model="newTitle" placeholder="새 챌린지 이름" :disabled="challengeLoading" />
        <div class="palette-list">
          <button
            v-for="color in accentPalette"
            :key="`new-${color}`"
            type="button"
            class="palette-chip"
            :class="{ selected: newAccentColor === color }"
            :style="{ background: color }"
            @click="newAccentColor = color"
            :aria-label="`테마 ${color}`"
          />
        </div>
        <button type="submit" :disabled="challengeLoading">추가</button>
      </form>

      <p v-if="challengeMessage" class="msg challenge-msg">{{ challengeMessage }}</p>

      <div v-if="challenges.length === 0" class="empty">아직 챌린지가 없습니다.</div>
      <div
        v-for="c in challenges"
        :key="c.id"
        class="challenge-card"
        :class="{ inactive: !c.is_active, editing: editingChallengeId === c.id }"
      >
        <div class="card-info">
          <template v-if="editingChallengeId === c.id">
            <input
              v-model="editingTitle"
              class="edit-input"
              :disabled="renamingChallengeId === c.id"
              @keyup.enter="saveChallenge(c)"
              @keyup.esc="cancelEditingChallenge"
            />
            <div class="palette-list palette-list-inline">
              <button
                v-for="color in accentPalette"
                :key="`${c.id}-${color}`"
                type="button"
                class="palette-chip"
                :class="{ selected: editingAccentColor === color }"
                :style="{ background: color }"
                @click="editingAccentColor = color"
                :disabled="renamingChallengeId === c.id"
                :aria-label="`테마 ${color}`"
              />
            </div>
          </template>
          <template v-else>
            <span class="accent-dot" :style="{ background: c.accent_color }" />
            <span class="card-title">{{ c.title }}</span>
          </template>
          <span v-if="!c.is_active" class="card-badge archived">보관</span>
        </div>
        <div class="card-actions">
          <template v-if="editingChallengeId === c.id">
            <button
              @click="saveChallenge(c)"
              class="btn-sm btn-primary"
              :disabled="renamingChallengeId === c.id"
            >
              {{ renamingChallengeId === c.id ? '저장 중...' : '저장' }}
            </button>
            <button
              @click="cancelEditingChallenge"
              class="btn-sm"
              :disabled="renamingChallengeId === c.id"
            >
              취소
            </button>
          </template>
          <template v-else>
            <button
              class="icon-btn"
              title="수정"
              aria-label="수정"
              :disabled="renamingChallengeId === c.id"
              @click="startEditingChallenge(c)"
            >
              <FontAwesomeIcon icon="pen" />
            </button>
            <button
              class="icon-btn"
              :title="c.is_active ? '보관' : '복원'"
              :aria-label="c.is_active ? '보관' : '복원'"
              @click="toggleActive(c)"
            >
              <FontAwesomeIcon :icon="c.is_active ? 'box-archive' : 'rotate-left'" />
            </button>
            <button
              class="icon-btn icon-btn-danger"
              title="삭제"
              aria-label="삭제"
              @click="deleteChallenge(c)"
            >
              <FontAwesomeIcon icon="trash" />
            </button>
          </template>
        </div>
      </div>
    </section>

    <section>
      <h3 class="section-title">Stamps</h3>
      <div class="upload-form">
        <input v-model="newName" placeholder="도장 이름" :disabled="uploading" />
        <input type="file" ref="fileInput" accept="image/*" :disabled="uploading" />
        <button @click="uploadStamp" :disabled="uploading">
          {{ uploading ? '업로드 중...' : '업로드' }}
        </button>
      </div>
      <p v-if="message" class="msg">{{ message }}</p>

      <div v-if="activeStamps.length === 0" class="empty">아직 등록된 도장이 없습니다.</div>
      <div v-else class="stamp-list">
        <div
          v-for="s in activeStamps"
          :key="s.id"
          class="stamp-card"
          :class="{ busy: replacingStampId === s.id }"
        >
          <img :src="stampUrl(s.image_path)" />
          <span class="stamp-name">{{ s.name }}</span>
          <div class="stamp-actions">
            <input
              :ref="el => setStampFileInputRef(s.id, el)"
              type="file"
              class="sr-only"
              accept="image/*"
              :disabled="replacingStampId === s.id"
              @change="replaceStampImage(s, $event)"
            />
            <button
              class="icon-btn"
              :title="replacingStampId === s.id ? '변경 중...' : '이미지 변경'"
              aria-label="이미지 변경"
              :disabled="replacingStampId === s.id"
              @click="openReplaceDialog(s.id)"
            >
              <FontAwesomeIcon icon="pen" />
            </button>
            <button
              class="icon-btn icon-btn-danger"
              title="삭제"
              aria-label="삭제"
              :disabled="replacingStampId === s.id"
              @click="deleteStamp(s)"
            >
              <FontAwesomeIcon icon="trash" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="deletedStamps.length > 0" class="deleted-section">
        <button class="deleted-toggle" @click="showDeletedStamps = !showDeletedStamps">
          <span class="toggle-caret" :class="{ open: showDeletedStamps }">▸</span>
          Deleted ({{ deletedStamps.length }})
        </button>

        <div v-if="showDeletedStamps" class="stamp-list deleted-list">
          <div v-for="s in deletedStamps" :key="s.id" class="stamp-card inactive">
            <img :src="stampUrl(s.image_path)" />
            <span class="stamp-name">{{ s.name }}</span>
            <div class="stamp-actions">
              <button
                @click="restoreStamp(s)"
                class="btn-sm"
                :disabled="permanentlyDeletingStampId === s.id"
              >
                복원
              </button>
              <button
                @click="permanentlyDeleteStamp(s)"
                class="btn-permanent-delete"
                :disabled="permanentlyDeletingStampId === s.id"
              >
                {{ permanentlyDeletingStampId === s.id ? '삭제 중...' : '영구삭제' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-wrap { display: grid; gap: var(--space-8); }
.add-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.add-form input {
  flex: 1 1 200px;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--ink);
}
.add-form input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
/* 팔레트 칩도 이 폼 안의 button 이므로 제출 버튼만 골라 잡는다. */
.add-form button[type="submit"] {
  padding: var(--space-2) var(--space-5);
  background: var(--accent);
  color: var(--surface);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 600;
  transition: background 0.15s;
}
.add-form button[type="submit"]:hover { background: var(--accent-dark); }
/* 같은 줄의 입력칸에 밀리면 칩이 가로로 눌려 원이 찌그러진다. */
.palette-list {
  display: flex;
  flex-wrap: wrap;
  flex-shrink: 0;
  gap: var(--space-2);
}
.palette-list-inline {
  margin-top: var(--space-2);
}
/* 안쪽 실선은 밝은 색에서만 가장자리로 보이고 어두운 색에선 묻힌다. */
.palette-chip {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  border-radius: var(--radius-full);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.palette-chip:hover:not(:disabled) {
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12), 0 0 0 2px var(--surface), 0 0 0 3px var(--line);
}
.palette-chip.selected {
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12), 0 0 0 2px var(--surface), 0 0 0 3px var(--ink);
}
.palette-chip:disabled { cursor: not-allowed; opacity: 0.5; }
.empty { color: var(--ink-4); text-align: center; padding: var(--space-6) 0; font-size: var(--text-sm); }
/* 구분선을 두면 제목 선과 섞여 줄무늬가 된다. 여백과 hover 로만 나눈다. */
.challenge-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-1);
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}
.challenge-card.inactive { opacity: 0.5; }
.card-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}
.accent-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}
.card-title { font-weight: 600; font-size: var(--text-base); color: var(--ink); }
.edit-input {
  flex: 1 1 220px;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--ink);
  background: var(--surface);
}
.edit-input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.card-badge { font-size: var(--text-xs); font-weight: 600; padding: var(--space-05) var(--space-2); border-radius: var(--radius-full); letter-spacing: 0.04em; }
.card-badge.archived { background: var(--line-3); color: var(--ink-3); }
.card-actions { display: flex; gap: var(--space-2); flex-shrink: 0; }
.btn-sm {
  font-size: var(--text-xs);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-sm:hover { background: var(--surface-3); color: var(--ink); }
.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--surface);
}
.btn-primary:hover { background: var(--accent-dark); color: var(--surface); }
.btn-permanent-delete {
  font-size: var(--text-xs);
  padding: var(--space-1) var(--space-3);
  border: 1.5px solid var(--danger);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--danger);
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}
.btn-permanent-delete:hover:not(:disabled) {
  border-color: var(--danger-dark);
  color: var(--danger-dark);
  background: var(--danger-bg);
}
.btn-permanent-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.upload-form {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.upload-form input:first-child {
  flex: 1;
  min-width: 120px;
  height: 38px;
  padding: 0 var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--ink);
}
.upload-form input:first-child:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.upload-form input[type="file"] {
  height: 38px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--ink-2);
  font-size: var(--text-sm);
  padding: 0;
}
.upload-form input[type="file"]::file-selector-button {
  height: 100%;
  padding: 0 var(--space-3);
  border: none;
  border-right: 1px solid var(--line);
  background: var(--surface-3);
  color: var(--ink);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
}
.upload-form button {
  padding: var(--space-2) var(--space-5);
  background: var(--accent);
  color: var(--surface);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 600;
  transition: background 0.15s;
}
.upload-form button:hover:not(:disabled) { background: var(--accent-dark); }
.upload-form button:disabled { opacity: 0.5; cursor: not-allowed; }
.msg { font-size: var(--text-sm); color: var(--accent); margin-bottom: var(--space-3); font-weight: 500; }
.challenge-msg { margin-top: -2px; }
/* 행 간격은 타일 안쪽 여백이 이미 벌려주므로 열 간격보다 좁게 둔다. */
.stamp-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: var(--space-1) var(--space-3);
}
.stamp-card {
  text-align: center;
  background: transparent;
  border: 1px dashed transparent;
  border-radius: var(--radius-sm);
  padding: var(--space-1);
  transition: background 0.15s;
}
.stamp-card:hover { background: var(--surface-2); }
.stamp-card.inactive {
  border-color: var(--line);
}
.stamp-card.inactive img { filter: grayscale(1); opacity: 0.55; }
.stamp-card.inactive .stamp-name { color: var(--ink-3); }
.stamp-card img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}
.stamp-name {
  display: block;
  font-size: var(--text-xs);
  margin: 0 0 var(--space-05);
  color: var(--ink);
  font-weight: 500;
}
.deleted-section { margin-top: var(--space-4); }
.deleted-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  border: none;
  background: none;
  color: var(--ink-3);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
}
.deleted-toggle:hover { color: var(--ink); }
.toggle-caret {
  display: inline-block;
  font-size: var(--text-2xs);
  transition: transform 0.15s;
}
.toggle-caret.open { transform: rotate(90deg); }
/* '복원 + 영구삭제' 두 버튼이 한 줄에 들어가야 해서 활성 그리드보다 칸을 넓게 잡는다. */
.deleted-list {
  margin-top: var(--space-3);
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}
.stamp-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
}
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink-4);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: color 0.15s;
}
.icon-btn:hover:not(:disabled) { color: var(--ink); }
.icon-btn-danger:hover:not(:disabled) { color: var(--danger); }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.stamp-actions,
.card-actions { opacity: 0; transition: opacity 0.15s; }
.stamp-card:hover .stamp-actions,
.stamp-card.busy .stamp-actions,
.stamp-actions:focus-within,
.challenge-card:hover .card-actions,
.challenge-card.editing .card-actions,
.card-actions:focus-within { opacity: 1; }
.challenge-card:hover { background: var(--surface-2); }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
