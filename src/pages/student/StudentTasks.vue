<!-- src/pages/student/StudentTasks.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// === ДАННЫЕ ТЕКУЩЕГО УЧЕНИКА ===
const studentId = localStorage.getItem('user_id')
const studentGrade = localStorage.getItem('user_grade')

// 🔍 Отладка: проверим, есть ли user_id и user_grade
console.log('🔍 localStorage user_id:', studentId)
console.log('🔍 localStorage user_grade:', studentGrade)

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

const router = useRouter()
const getAccessToken = () => localStorage.getItem('access_token')

// 💡 Функция для подсчёта времени до дедлайна
const getTimeLeft = (dueDate) => {
  if (!dueDate) {
    console.warn('⚠️ getTimeLeft вызван с dueDate =', dueDate)
    return null
  }
  const now = new Date()
  const due = new Date(dueDate)
  if (isNaN(due.getTime())) {
    console.error('❌ Некорректная дата:', dueDate)
    return null
  }
  const diffMs = due - now

  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, overdue: true }

  const diffSec = Math.floor(diffMs / 1000)
  const days = Math.floor(diffSec / 86400)
  const hours = Math.floor((diffSec % 86400) / 3600)
  const minutes = Math.floor((diffSec % 3600) / 60)

  return { days, hours, minutes, overdue: false }
}

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
    case 'homework': return 'border-green-500 bg-green-50'
    case 'illness': return 'border-blue-500 bg-blue-50'
    case 'not_submitted': return 'border-red-500 bg-red-50'
    default: return 'border-gray-300 bg-gray-50'
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
      return { text: 'На проверке', class: 'bg-gray-200 text-gray-700' }
    case 'rejected':
      return { text: 'На доработку', class: 'bg-error text-white' }
    case 'assigned':
      return { text: 'Не отправлено', class: 'bg-warning text-white' }
    default:
      return { text: '—', class: 'bg-gray-200 text-gray-700' }
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

const openCheckedModal = (task) => {
  selectedCheckedTask.value = task
  isCheckedModalOpen.value = true
}

const downloadStudentFile = async (filename) => {
  if (!selectedCheckedTask.value) return
  const token = getAccessToken()
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
  loadAllTasks().catch(err => {
    console.error('Критическая ошибка при загрузке:', err)
    loading.value = false
    loadingChecked.value = false
  })
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <!-- Модальные окна (оставлены без изменений) -->
    <!-- ... (остальной код модалок без изменений) ... -->

    <!-- Основной контент -->
    <div class="max-w-4xl mx-auto">
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <h1 class="text-3xl font-bold text-gray-800">Мои задания</h1>
        <!-- ✅ ССЫЛКА НА СТРАНИЦУ ПРОФИЛЯ УЧЕНИКА -->
        <router-link
            v-if="studentId && studentGrade"
            :to="`/teacher/class/${encodeURIComponent(studentGrade)}/student/${studentId}`"
            class="btn btn-outline btn-sm"
        >
          📊 Мой журнал оценок
        </router-link>
        <div v-else class="text-sm text-red-600">
          ❌ user_id или user_grade отсутствуют в localStorage
        </div>
      </div>

      <div v-if="loading" class="text-center py-12">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else>
        <div v-if="tasks.length > 0" class="mb-10">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Текущие задания</h2>
          <div class="space-y-4">
            <div
                v-for="task in tasks"
                :key="task.id"
                :class="[
                'rounded-xl border-l-4 p-4 transition-all duration-200',
                getReasonColor(task.reason),
                (task.status === 'assigned' || task.status === 'rejected')
                ? 'hover:shadow-md cursor-pointer'
                : 'opacity-80'
                ]"
                @click="(task.status === 'assigned' || task.status === 'rejected') && openResponseModal(task)"
            >
              <div class="flex flex-wrap justify-between items-start gap-2 mb-2">
                <h3 class="font-bold text-lg text-gray-800">{{ task.title }}</h3>
                <span :class="['text-xs px-2 py-1 rounded-full font-medium', getReasonBadge(task.reason)]">
                  {{ getReasonLabel(task.reason) }}
                </span>
              </div>

              <div class="text-gray-600 text-sm mb-2">
                {{ task.subject }} • {{ task.teacher_name }}
              </div>

              <!-- ✅ ТАЙМЕР ДО ДЕДЛАЙНА -->
              <div v-if="task.due_date" class="text-sm mb-2">
                <span class="font-medium">📅 Сдать до:</span>
                <span :class="isOverdue(task.due_date) ? 'text-red-600 font-bold' : 'text-gray-700'">
                  {{ formatDate(task.due_date) }}
                </span>
                <span v-if="isOverdue(task.due_date)" class="ml-1 text-red-600">⚠️</span>
                <!-- 💡 Безопасный вывод времени до дедлайна -->
                <span v-else class="ml-2 text-gray-600">
                  (
                  <span v-if="task.due_date && getTimeLeft(task.due_date)">
                    {{ getTimeLeft(task.due_date).days }}д {{ getTimeLeft(task.due_date).hours }}ч
                  </span>
                  <span v-else>ошибка в дате</span>
                  )
                </span>
              </div>

              <p class="text-gray-800 mb-3 line-clamp-2">{{ task.description }}</p>

              <!-- СТАТУС -->
              <div class="flex items-center justify-between">
                <span :class="[
                  'text-xs px-2 py-1 rounded font-medium',
                  getStatusInfo(task.status).class
                ]">
                  {{ getStatusInfo(task.status).text }}
                </span>

                <!-- Комментарий учителя (только при rejected, укороченный) -->
                <div v-if="task.status === 'rejected' && task.teacher_comment" class="text-xs text-error ml-2 line-clamp-1">
                  📝 {{ task.teacher_comment }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="checkedTasks.length > 0">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Проверенные задания</h2>
          <div class="space-y-3">
            <div
                v-for="task in getPaginatedChecked"
                :key="task.id"
                @click="openCheckedModal(task)"
                class="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition"
            >
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-bold text-gray-800">{{ task.title }}</div>
                  <div class="text-sm text-gray-600">{{ task.subject }}</div>
                </div>
                <span :class="[
                  'px-3 py-1 rounded-full text-sm font-bold',
                  task.teacher_grade === 2 ? 'bg-red-100 text-red-800' :
                  task.teacher_grade === 3 ? 'bg-orange-100 text-orange-800' :
                  task.teacher_grade === 4 ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
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

        <div v-if="tasks.length === 0 && checkedTasks.length === 0" class="text-center py-12 text-gray-500">
          У вас нет заданий
        </div>
      </div>
    </div>
  </div>
</template>