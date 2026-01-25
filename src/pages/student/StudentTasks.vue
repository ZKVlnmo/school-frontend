<!-- src/pages/student/StudentTasks.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// === Проверяем роль при монтировании ===
const router = useRouter()
const getAccessToken = () => localStorage.getItem('access_token')

// ✅ Универсальный fetch с обработкой 401
const apiFetch = async (url, options = {}) => {
  const token = getAccessToken()
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }

  const response = await fetch(url, { ...options, headers })

  // 🔒 Обработка 401: выход и редирект
  if (response.status === 401) {
    localStorage.clear()
    router.push('/login')
    throw new Error('Unauthorized')
  }

  return response
}

// ✅ Функция выхода из аккаунта
const logout = () => {
  localStorage.clear()
  router.push('/login')
}

// Редирект для учителей и админов
onMounted(() => {
  const userRole = localStorage.getItem('user_role')
  const studentId = localStorage.getItem('user_id')
  const studentGrade = localStorage.getItem('user_grade')

  // Если это НЕ ученик — перенаправляем
  if (userRole !== 'student') {
    if (userRole === 'teacher' && studentId && studentGrade) {
      router.push(`/teacher/class/${encodeURIComponent(studentGrade)}/student/${studentId}`)
    } else if (userRole === 'admin') {
      router.push('/admin/teachers')
    } else {
      router.push('/login')
    }
    return
  }

  // Только ученики доходят сюда — загружаем их задания
  loadAllTasks().catch(err => {
    console.error('Критическая ошибка при загрузке:', err)
    loading.value = false
    loadingChecked.value = false
  })
})

// === ДАННЫЕ ТОЛЬКО ДЛЯ УЧЕНИКОВ ===
const tasks = ref([])
const loading = ref(true)
const submitting = ref(new Set())

const checkedTasks = ref([])
const checkedPagination = ref({ page: 1, size: 5, total: 0, pages: 1 })
const loadingChecked = ref(false)

const isResponseModalOpen = ref(false)
const selectedTaskForResponse = ref(null)
const responseComment = ref('')
const responseFiles = ref([])

const isCheckedModalOpen = ref(false)
const selectedCheckedTask = ref(null)

// ✅ Проверка, можно ли открыть модалку
const canRespond = (status) => {
  return ['assigned', 'rejected'].includes(status)
}

// 💡 Функция для подсчёта времени до дедлайна
const getTimeLeft = (dueDate) => {
  if (!dueDate) return null
  const now = new Date()
  const due = new Date(dueDate)
  const diffMs = due - now

  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, overdue: true }

  const diffSec = Math.floor(diffMs / 1000)
  const days = Math.floor(diffSec / 86400)
  const hours = Math.floor((diffSec % 86400) / 3600)
  const minutes = Math.floor((diffSec % 3600) / 60)

  return { days, hours, minutes, overdue: false }
}

const loadAllTasks = async () => {
  loading.value = true
  loadingChecked.value = true

  try {
    const res = await apiFetch(`${API_BASE_URL}/students/tasks/new?page=1&size=100`)

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
    }
  } catch (e) {
    console.error('Ошибка загрузки заданий:', e)
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
    case 'illness': return 'Долг из-за болезни'
    case 'not_submitted': return 'Долг'
    default: return 'Задание'
  }
}

const getReasonColor = (reason) => {
  switch (reason) {
    case 'homework':
      return 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30'
    case 'illness':
      return 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
    case 'not_submitted':
      return 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/30'
    default:
      return 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
  }
}

const getReasonBadge = (reason) => {
  switch (reason) {
    case 'homework': return 'badge-success'
    case 'illness': return 'badge-info'
    case 'not_submitted': return 'badge-error'
    default: return 'badge-neutral'
  }
}

const getStatusInfo = (status) => {
  switch (status) {
    case 'submitted':
      return { text: 'На проверке', class: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200' }
    case 'rejected':
      return { text: 'На доработку', class: 'bg-error text-white' }
    case 'assigned':
      return { text: 'Не отправлено', class: 'bg-warning text-white' }
    default:
      return { text: '—', class: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200' }
  }
}

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

const isOverdue = (dueDate) => {
  return dueDate && new Date(dueDate) < new Date()
}

const openResponseModal = (task) => {
  selectedTaskForResponse.value = { ...task }
  responseComment.value = task.comment || ''
  responseFiles.value = []
  isResponseModalOpen.value = true
}

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
    const res = await apiFetch(`${API_BASE_URL}/students/tasks/${taskId}/submit`, {
      method: 'POST',
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
    // Ошибки 401 уже обрабатываются в apiFetch
    if (e.message !== 'Unauthorized') {
      alert('Не удалось отправить задание')
    }
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

const openCheckedModal = (task) => {
  selectedCheckedTask.value = task
  isCheckedModalOpen.value = true
}

const downloadStudentFile = async (filename) => {
  if (!selectedCheckedTask.value) return

  try {
    const response = await apiFetch(
        `${API_BASE_URL}/tasks/submissions/${selectedCheckedTask.value.id}/files/${encodeURIComponent(filename)}`
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
    if (e.message !== 'Unauthorized') {
      alert('Ошибка загрузки файла')
    }
  }
}
</script>

<template>
  <!-- Общий контейнер с поддержкой тёмной темы -->
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 text-gray-800 dark:text-gray-200">
    <!-- Модальное окно: ответ -->
    <div v-if="isResponseModalOpen" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto text-gray-800 dark:text-gray-200">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <h2 class="text-2xl font-bold">{{ selectedTaskForResponse?.title }}</h2>
            <button @click="isResponseModalOpen = false" class="btn btn-ghost btn-sm">×</button>
          </div>
          <div class="space-y-5">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {{ selectedTaskForResponse?.subject }} • {{ selectedTaskForResponse?.teacher_name }}
              </p>
              <!-- ✅ ИСПРАВЛЕНО: сохранение переносов и пробелов -->
              <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 whitespace-pre-wrap break-words">
                {{ selectedTaskForResponse?.description }}
              </div>
            </div>

            <div v-if="selectedTaskForResponse?.files?.length" class="pt-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Файлы от учителя:</label>
              <div class="flex flex-wrap gap-2">
                <a
                    v-for="(f, i) in selectedTaskForResponse.files"
                    :key="i"
                    :href="`${API_BASE_URL}/tasks/${selectedTaskForResponse.id}/files/${encodeURIComponent(f)}`"
                    target="_blank"
                    class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  📎 {{ f }}
                </a>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ваш ответ:</label>
              <textarea
                  v-model="responseComment"
                  placeholder="Напишите подробный ответ..."
                  class="textarea textarea-bordered w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  rows="5"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Прикрепить файлы (необязательно):</label>
              <input
                  type="file"
                  multiple
                  @change="onModalFileChange"
                  class="file-input file-input-bordered w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
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
                {{ submitting.has(selectedTaskForResponse?.id) ? 'Отправка...' : 'Отправить' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно: проверенные -->
    <div v-if="isCheckedModalOpen && selectedCheckedTask" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-gray-800 dark:text-gray-200">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <h2 class="text-xl font-bold">{{ selectedCheckedTask.title }}</h2>
            <button @click="isCheckedModalOpen = false" class="btn btn-ghost btn-sm">×</button>
          </div>
          <div class="space-y-4">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ selectedCheckedTask.subject }} • {{ selectedCheckedTask.teacher_name }}</p>
              <!-- ✅ ИСПРАВЛЕНО: сохранение форматирования -->
              <p class="mt-2 whitespace-pre-wrap break-words">{{ selectedCheckedTask.description }}</p>
            </div>
            <div v-if="selectedCheckedTask.comment">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Ваш ответ:</label>
              <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded mt-1 whitespace-pre-wrap break-words">
                {{ selectedCheckedTask.comment }}
              </div>
            </div>
            <div v-if="selectedCheckedTask.student_files?.length">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Ваши файлы:</label>
              <div class="flex flex-wrap gap-2 mt-1">
                <a
                    v-for="(f, i) in selectedCheckedTask.student_files"
                    :key="i"
                    @click.prevent="downloadStudentFile(f)"
                    class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded cursor-pointer"
                >
                  📎 {{ f }}
                </a>
              </div>
            </div>
            <div v-if="selectedCheckedTask.files?.length">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Файлы от учителя:</label>
              <div class="flex flex-wrap gap-2 mt-1">
                <a
                    v-for="(f, i) in selectedCheckedTask.files"
                    :key="i"
                    :href="`${API_BASE_URL}/tasks/${selectedCheckedTask.id}/files/${encodeURIComponent(f)}`"
                    target="_blank"
                    class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded"
                >
                  📎 {{ f }}
                </a>
              </div>
            </div>
            <div v-if="selectedCheckedTask.teacher_comment" class="max-h-32 overflow-y-auto">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Комментарий учителя:</label>
              <div class="p-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded mt-1 whitespace-pre-wrap break-words">
                {{ selectedCheckedTask.teacher_comment }}
              </div>
            </div>
            <div class="pt-2">
              <span :class="[
                'px-3 py-1 rounded-full text-sm font-bold',
                selectedCheckedTask.teacher_grade === 2 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' :
                selectedCheckedTask.teacher_grade === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200' :
                selectedCheckedTask.teacher_grade === 4 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' :
                'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
              ]">
                Оценка: {{ selectedCheckedTask.teacher_grade }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Основной контент (только для учеников) -->
    <div class="max-w-4xl mx-auto">
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <h1 class="text-3xl font-bold">Мои задания</h1>
        <div class="flex gap-2">
          <router-link
              to="/student/grades"
              class="btn btn-outline btn-sm"
          >
            Мой аккаунт
          </router-link>
          <button
              @click="logout"
              class="btn btn-ghost btn-sm text-error"
          >
            Выйти
          </button>
        </div>
      </div>

      <div v-if="loading" class="text-center py-12">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else>
        <div v-if="tasks.length > 0" class="mb-10">
          <h2 class="text-xl font-semibold mb-4">Текущие задания</h2>
          <div class="space-y-4">
            <div
                v-for="task in tasks"
                :key="task.id"
                :class="[
                'rounded-xl border-l-4 p-4 transition-all duration-200',
                getReasonColor(task.reason),
                canRespond(task.status) ? 'hover:shadow-md cursor-pointer' : 'opacity-80'
                ]"
                @click="canRespond(task.status) ? openResponseModal(task) : null"
            >
              <div class="flex flex-wrap justify-between items-start gap-2 mb-2">
                <h3 class="font-bold text-lg">{{ task.title }}</h3>
                <span :class="['text-xs px-2 py-1 rounded-full font-medium', getReasonBadge(task.reason)]">
                  {{ getReasonLabel(task.reason) }}
                </span>
              </div>

              <div class="text-gray-600 dark:text-gray-400 text-sm mb-2">
                {{ task.subject }} • {{ task.teacher_name }}
              </div>

              <div v-if="task.due_date" class="text-sm mb-2">
                <span class="font-medium">📅 Сдать до:</span>
                <span :class="isOverdue(task.due_date) ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-700 dark:text-gray-300'">
                  {{ formatDate(task.due_date) }}
                </span>
                <span v-if="isOverdue(task.due_date)" class="ml-1 text-red-600 dark:text-red-400">⚠️</span>
                <span v-else class="ml-2 text-gray-600 dark:text-gray-400">
                  ({{ getTimeLeft(task.due_date).days }}д {{ getTimeLeft(task.due_date).hours }}ч)
                </span>
              </div>

              <!-- ✅ line-clamp-2 остаётся — это нормально для списка -->
              <p class="text-gray-800 dark:text-gray-200 mb-3 line-clamp-2">{{ task.description }}</p>

              <div class="flex items-center justify-between">
                <span :class="[
                  'text-xs px-2 py-1 rounded font-medium',
                  getStatusInfo(task.status).class
                ]">
                  {{ getStatusInfo(task.status).text }}
                </span>

                <div v-if="task.status === 'rejected' && task.teacher_comment" class="text-xs text-error ml-2 line-clamp-1">
                  📝 {{ task.teacher_comment }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="checkedTasks.length > 0">
          <h2 class="text-xl font-semibold mb-4">Проверенные задания</h2>
          <div class="space-y-3">
            <div
                v-for="task in getPaginatedChecked"
                :key="task.id"
                @click="openCheckedModal(task)"
                class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition"
            >
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-bold">{{ task.title }}</div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">{{ task.subject }}</div>
                </div>
                <span :class="[
                  'px-3 py-1 rounded-full text-sm font-bold',
                  task.teacher_grade === 2 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' :
                  task.teacher_grade === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200' :
                  task.teacher_grade === 4 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' :
                  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                ]">
                  {{ task.teacher_grade }}
                </span>
              </div>
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

        <div v-if="tasks.length === 0 && checkedTasks.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
          У вас нет заданий
        </div>
      </div>
    </div>
  </div>
</template>