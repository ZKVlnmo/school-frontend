<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// Все задания
const tasks = ref([])
const loading = ref(true)
const submitting = ref(new Set())

// Проверенные — с пагинацией
const checkedTasks = ref([])
const checkedPagination = ref({ page: 1, size: 5, total: 0, pages: 1 })
const loadingChecked = ref(false)

// Модалки
const isResponseModalOpen = ref(false)
const selectedTaskForResponse = ref(null)
const responseComment = ref('')
const responseFiles = ref([])

const isCheckedModalOpen = ref(false)
const selectedCheckedTask = ref(null)

const router = useRouter()
const getAccessToken = () => localStorage.getItem('access_token')

const loadAllTasks = async () => {
  const token = getAccessToken()
  if (!token) return router.push('/login')

  loading.value = true
  loadingChecked.value = true

  try {
    const res = await fetch(`${API_BASE_URL}/students/tasks?page=1&size=100`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.ok) {
      const data = await res.json()
      const allTasks = data.items || []

      tasks.value = allTasks.filter(t => t.status !== 'accepted')
      const accepted = allTasks.filter(t => t.status === 'accepted')
      checkedTasks.value = accepted
      checkedPagination.value = {
        page: 1,
        size: 5,
        total: accepted.length,
        pages: Math.max(1, Math.ceil(accepted.length / 5))
      }
    } else {
      tasks.value = []
      checkedTasks.value = []
      checkedPagination.value = { page: 1, size: 5, total: 0, pages: 1 }
    }
  } catch (e) {
    tasks.value = []
    checkedTasks.value = []
    checkedPagination.value = { page: 1, size: 5, total: 0, pages: 1 }
  } finally {
    loading.value = false
    loadingChecked.value = false
  }
}

const getPaginatedChecked = computed(() => {
  const start = (checkedPagination.value.page - 1) * checkedPagination.value.size
  return checkedTasks.value.slice(start, start + checkedPagination.value.size)
})

const goToCheckedPage = (page) => {
  if (page >= 1 && page <= checkedPagination.value.pages) {
    checkedPagination.value.page = page
  }
}

const getReasonLabel = (reason) => {
  switch (reason) {
    case 'homework': return 'Домашнее задание'
    case 'illness': return 'Не сдано из-за болезни'
    case 'not_submitted': return 'Не сдано'
    default: return 'Задание'
  }
}

const getGradeRowColor = (grade) => {
  switch (grade) {
    case 2: return 'bg-red-100 border-l-red-500'
    case 3: return 'bg-orange-100 border-l-orange-500'
    case 4: return 'bg-yellow-100 border-l-yellow-500'
    case 5: return 'bg-green-100 border-l-green-500'
    default: return 'bg-gray-100'
  }
}

// === Форматирование даты ===
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// === Открыть задание для ответа ===
const openResponseModal = (task) => {
  selectedTaskForResponse.value = { ...task }
  responseComment.value = task.comment || ''
  responseFiles.value = []
  isResponseModalOpen.value = true
}

// === Отправить из модалки ===
const submitFromModal = async () => {
  if (!selectedTaskForResponse.value) return
  const hasComment = responseComment.value.trim()
  const hasFiles = responseFiles.value.length > 0
  if (!hasComment && !hasFiles) {
    alert('Добавьте комментарий или прикрепите файл.')
    return
  }
  if (!confirm('Отправить задание на проверку?')) return

  const formData = new FormData()
  if (hasComment) formData.append('comment', responseComment.value)
  for (const file of responseFiles.value) {
    formData.append('files', file)
  }

  const taskId = selectedTaskForResponse.value.id
  submitting.value.add(taskId)

  try {
    const token = getAccessToken()
    const res = await fetch(`${API_BASE_URL}/students/tasks/${taskId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })

    if (res.ok) {
      isResponseModalOpen.value = false
      loadAllTasks()
    } else {
      const error = await res.json().catch(() => ({}))
      alert(error.detail || 'Ошибка при отправке')
    }
  } catch (e) {
    alert('Не удалось отправить задание')
  } finally {
    submitting.value.delete(taskId)
  }
}

const onModalFileChange = (e) => {
  responseFiles.value = Array.from(e.target.files)
}

const removeModalFile = (index) => {
  responseFiles.value.splice(index, 1)
}

// === Просмотр проверенного ===
const openCheckedModal = (task) => {
  selectedCheckedTask.value = task
  isCheckedModalOpen.value = true
}

const downloadStudentFile = async (filename) => {
  if (!selectedCheckedTask.value) return
  const token = getAccessToken()
  if (!token) return router.push('/login')
  try {
    const response = await fetch(
        `${API_BASE_URL}/tasks/submissions/${selectedCheckedTask.value.id}/files/${encodeURIComponent(filename)}`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!response.ok) throw new Error('Файл не найден')
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    alert('Ошибка загрузки файла')
  }
}

onMounted(() => {
  loadAllTasks()
})
</script>

<template>
  <div class="min-h-screen bg-base-100 p-4">
    <!-- Модальное окно: ответ на задание -->
    <div v-if="isResponseModalOpen" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div class="bg-base-100 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <h2 class="text-2xl font-bold">{{ selectedTaskForResponse?.title }}</h2>
            <button @click="isResponseModalOpen = false" class="btn btn-ghost btn-sm">×</button>
          </div>

          <div class="space-y-5">
            <div class="prose max-w-none">
              <p class="text-sm opacity-80 mb-2">
                {{ selectedTaskForResponse?.subject }} • {{ selectedTaskForResponse?.teacher_name }}
              </p>
              <p class="text-lg">{{ selectedTaskForResponse?.description }}</p>
            </div>

            <!-- Файлы от учителя -->
            <div v-if="selectedTaskForResponse?.files?.length" class="pt-2">
              <label class="block text-sm font-semibold mb-2">Файлы от учителя:</label>
              <div class="flex flex-wrap gap-2">
                <a
                    v-for="(f, i) in selectedTaskForResponse.files"
                    :key="i"
                    :href="`${API_BASE_URL}/tasks/${selectedTaskForResponse.id}/files/${encodeURIComponent(f)}`"
                    target="_blank"
                    class="badge badge-neutral"
                >
                  📎 {{ f }}
                </a>
              </div>
            </div>

            <!-- Комментарий ученика -->
            <div>
              <label class="block text-sm font-semibold mb-2">Ваш ответ:</label>
              <textarea
                  v-model="responseComment"
                  placeholder="Напишите подробный ответ..."
                  class="textarea textarea-bordered w-full"
                  rows="6"
              ></textarea>
            </div>

            <!-- Загрузка файлов -->
            <div>
              <label class="block text-sm font-semibold mb-2">Прикрепить файлы (необязательно):</label>
              <input
                  type="file"
                  multiple
                  @change="onModalFileChange"
                  class="file-input file-input-bordered w-full"
              />
              <div v-if="responseFiles.length" class="mt-2 space-y-1">
                <div v-for="(f, i) in responseFiles" :key="i" class="flex items-center gap-2 text-sm">
                  {{ f.name }}
                  <button @click="removeModalFile(i)" class="btn btn-xs btn-circle">✕</button>
                </div>
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button @click="isResponseModalOpen = false" class="btn btn-ghost flex-1">Отмена</button>
              <button
                  @click="submitFromModal"
                  :disabled="submitting.has(selectedTaskForResponse?.id)"
                  class="btn btn-primary flex-1"
              >
                {{ submitting.has(selectedTaskForResponse?.id) ? 'Отправка...' : 'Отправить на проверку' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно: просмотр проверенного -->
    <div v-if="isCheckedModalOpen && selectedCheckedTask" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-base-100 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <h2 class="text-xl font-bold">{{ selectedCheckedTask.title }}</h2>
            <button @click="isCheckedModalOpen = false" class="btn btn-ghost btn-sm">×</button>
          </div>
          <div class="space-y-4">
            <div>
              <p class="text-sm opacity-80">{{ selectedCheckedTask.subject }} • {{ selectedCheckedTask.teacher_name }}</p>
              <p class="mt-2">{{ selectedCheckedTask.description }}</p>
            </div>
            <div v-if="selectedCheckedTask.comment">
              <label class="block text-sm font-semibold">Ваш ответ:</label>
              <div class="p-3 bg-base-200 rounded mt-1">{{ selectedCheckedTask.comment }}</div>
            </div>
            <div v-if="selectedCheckedTask.student_files?.length">
              <label class="block text-sm font-semibold">Ваши файлы:</label>
              <div class="flex flex-wrap gap-2 mt-1">
                <a
                    v-for="(f, i) in selectedCheckedTask.student_files"
                    :key="i"
                    @click.prevent="downloadStudentFile(f)"
                    class="text-xs badge badge-primary cursor-pointer"
                >
                  📎 {{ f }}
                </a>
              </div>
            </div>
            <div v-if="selectedCheckedTask.files?.length">
              <label class="block text-sm font-semibold">Файлы от учителя:</label>
              <div class="flex flex-wrap gap-2 mt-1">
                <a
                    v-for="(f, i) in selectedCheckedTask.files"
                    :key="i"
                    :href="`${API_BASE_URL}/tasks/${selectedCheckedTask.id}/files/${encodeURIComponent(f)}`"
                    target="_blank"
                    class="text-xs link"
                >
                  📎 {{ f }}
                </a>
              </div>
            </div>
            <div v-if="selectedCheckedTask.teacher_comment">
              <label class="block text-sm font-semibold">Комментарий учителя:</label>
              <div class="p-3 bg-error text-white rounded mt-1">
                {{ selectedCheckedTask.teacher_comment }}
              </div>
            </div>
            <div class="pt-4">
              <span :class="['badge',
                selectedCheckedTask.teacher_grade === 2 ? 'badge-error' :
                selectedCheckedTask.teacher_grade === 3 ? 'badge-warning' :
                selectedCheckedTask.teacher_grade === 4 ? 'badge-info' :
                'badge-success'
              ]">
                Оценка: {{ selectedCheckedTask.teacher_grade }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Основной контент -->
    <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">Мои задания</h1>

      <div v-if="loading" class="text-center py-8">
        <span class="loading loading-spinner"></span>
      </div>

      <div v-else>
        <!-- Текущие задания -->
        <div v-if="tasks.length > 0">
          <h2 class="text-lg font-semibold mb-3">Текущие задания</h2>
          <div class="grid grid-cols-1 gap-4">
            <div
                v-for="task in tasks"
                :key="task.id"
                class="card bg-base-200 shadow-lg overflow-hidden cursor-pointer hover:bg-base-300 transition"
                @click="openResponseModal(task)"
            >
              <div class="p-4">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-bold text-lg truncate">{{ task.title }}</h3>
                  <div class="text-xs opacity-75">
                    {{ getReasonLabel(task.reason) }}
                  </div>
                </div>
                <p class="text-sm opacity-90">{{ task.subject }} • {{ task.teacher_name }}</p>

                <!-- ✅ ДЕДЛАЙН ОТОБРАЖАЕТСЯ ЗДЕСЬ -->
                <p v-if="task.due_date" class="text-sm opacity-80 mt-1">
                  📅 Сдать до: {{ formatDate(task.due_date) }}
                </p>

                <p class="line-clamp-2 mt-2 text-sm">{{ task.description }}</p>

                <!-- Предпросмотр файлов учителя -->
                <div v-if="task.files?.length" class="mt-2 text-xs opacity-75">
                  📎 Файлы: {{ task.files.length }} шт.
                </div>

                <!-- Статус -->
                <div v-if="task.is_submitted" class="mt-2 flex gap-2">
                  <span v-if="task.status === 'submitted'" class="badge badge-info text-xs">На проверке</span>
                  <span v-else-if="task.status === 'rejected'" class="badge badge-error text-xs">На доработку</span>
                </div>

                <!-- Комментарий учителя (если задание отклонено) -->
                <div v-if="task.teacher_comment" class="mt-2 p-2 bg-error bg-opacity-20 text-error rounded text-sm">
                  📝 {{ task.teacher_comment }}
                </div>
              </div>
              <div class="p-3 bg-base-100 border-t text-center text-sm text-primary">
                → Открыть для ответа
              </div>
            </div>
          </div>
        </div>

        <!-- Проверенные задания -->
        <div v-if="checkedTasks.length > 0" class="mt-8">
          <h2 class="text-lg font-semibold mb-3">Проверенные задания</h2>
          <div class="space-y-3">
            <div
                v-for="task in getPaginatedChecked"
                :key="task.id"
                @click="openCheckedModal(task)"
                :class="['p-4 border-l-4 rounded cursor-pointer hover:bg-base-200 transition', getGradeRowColor(task.teacher_grade)]"
            >
              <div class="font-medium">{{ task.title }}</div>
              <div class="text-sm opacity-80">{{ task.subject }} • Оценка: {{ task.teacher_grade }}</div>
            </div>
          </div>

          <div v-if="checkedPagination.pages > 1" class="mt-4 flex justify-center gap-1">
            <button
                v-for="p in checkedPagination.pages"
                :key="p"
                @click="goToCheckedPage(p)"
                class="btn btn-xs"
                :class="{ 'btn-primary': p === checkedPagination.page, 'btn-ghost': p !== checkedPagination.page }"
            >
              {{ p }}
            </button>
          </div>
        </div>

        <div v-if="tasks.length === 0 && checkedTasks.length === 0" class="text-center py-8 text-gray-500">
          Нет заданий
        </div>
      </div>
    </div>
  </div>
</template>