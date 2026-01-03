<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const route = useRoute()
const router = useRouter()

// === Список заданий ===
const tasks = ref([])
const pagination = ref({ total: 0, page: 1, size: 5, pages: 1 })
const loadingTasks = ref(false)
const taskScope = ref('mine')

// === Форма ===
const newTask = ref({
  id: null,
  title: '',
  description: '',
  subject: '',
  reason: 'homework',
  due_date: null
})
const selectedStudents = ref(new Set())
const students = ref([])
const subjects = ref(['Математика', 'Русский язык', 'Физика', 'Химия', 'История', 'Литература'])
const newFiles = ref([]) // ← новые файлы (выбранные в input)
const taskFiles = ref([]) // ← уже загруженные файлы задания
const error = ref('')
const isLoading = ref(false)

// === Присланные задания ===
const submissions = ref([])
const loadingSubmissions = ref(false)
const submissionScope = ref('current')
const processing = ref(new Set())

// === Проверенные задания ===
const acceptedTasks = ref([])
const acceptedPagination = ref({ page: 1, size: 5, total: 0, pages: 1 })
const loadingAccepted = ref(false)

// === Модальное окно ===
const selectedSubmission = ref(null)
const modalComment = ref('')
const modalGrade = ref(5)
const isModalOpen = ref(false)
const isSaving = ref(false)

const getAccessToken = () => localStorage.getItem('access_token')

const resetForm = () => {
  newTask.value = { id: null, title: '', description: '', subject: '', reason: 'homework', due_date: null }
  selectedStudents.value = new Set()
  newFiles.value = []
  taskFiles.value = []
  error.value = ''
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

const getReasonLabel = (reason) => {
  switch (reason) {
    case 'homework': return 'Домашнее задание'
    case 'illness': return 'Долг из-за болезни'
    case 'not_submitted': return 'Долг'
    default: return 'Задание'
  }
}

const loadStudents = async (grade) => {
  if (!grade) return
  const token = getAccessToken()
  if (!token) return router.push('/login')
  try {
    const res = await fetch(`${API_BASE_URL}/students/grade/${encodeURIComponent(grade)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    students.value = res.ok ? await res.json() : []
  } catch {
    students.value = []
  }
}

const loadTasks = async (grade, page = 1) => {
  if (!grade) return
  const token = getAccessToken()
  if (!token) return router.push('/login')
  loadingTasks.value = true
  try {
    const url = new URL(`${API_BASE_URL}/tasks/by-grade/${encodeURIComponent(grade)}`)
    url.searchParams.set('scope', taskScope.value)
    url.searchParams.set('page', page)
    url.searchParams.set('size', pagination.value.size)

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const data = await res.json()
      tasks.value = data.items
      pagination.value = {
        total: data.total,
        page: data.page,
        size: data.size,
        pages: data.pages
      }
    }
  } catch {
    tasks.value = []
  } finally {
    loadingTasks.value = false
  }
}

const loadSubmissions = async () => {
  const token = getAccessToken()
  if (!token) return

  loadingSubmissions.value = true
  try {
    const url = new URL(`${API_BASE_URL}/tasks/submissions`)
    if (submissionScope.value === 'current' && route.params.grade) {
      url.searchParams.set('grade', route.params.grade)
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.ok) {
      submissions.value = await res.json()
    } else {
      submissions.value = []
    }
  } catch {
    submissions.value = []
  } finally {
    loadingSubmissions.value = false
  }
}

const loadAcceptedTasks = async (page = 1) => {
  const token = getAccessToken()
  if (!token) return router.push('/login')

  loadingAccepted.value = true
  try {
    const url = new URL(`${API_BASE_URL}/tasks/submissions/accepted`)
    if (route.params.grade) {
      url.searchParams.set('grade', route.params.grade)
    }
    url.searchParams.set('page', page)
    url.searchParams.set('size', acceptedPagination.value.size)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.ok) {
      const data = await res.json()
      acceptedTasks.value = data.items || []
      acceptedPagination.value = {
        page: data.page || 1,
        size: data.size || 5,
        total: data.total || 0,
        pages: data.pages || 1
      }
    } else {
      acceptedTasks.value = []
      acceptedPagination.value = { page: 1, size: 5, total: 0, pages: 1 }
    }
  } catch {
    acceptedTasks.value = []
    acceptedPagination.value = { page: 1, size: 5, total: 0, pages: 1 }
  } finally {
    loadingAccepted.value = false
  }
}

const goToAcceptedPage = (page) => {
  if (page >= 1 && page <= acceptedPagination.value.pages) {
    loadAcceptedTasks(page)
  }
}

const editTask = async (task) => {
  newTask.value = {
    id: task.id,
    title: task.title,
    description: task.description,
    subject: task.subject,
    reason: task.reason,
    due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : null
  }
  selectedStudents.value = new Set(task.student_ids || [])
  newFiles.value = []
  taskFiles.value = task.files || [] // ← загружаем существующие файлы
}

const deleteTaskFile = async (filename) => {
  if (!newTask.value.id) return
  const token = getAccessToken()
  if (!token) return router.push('/login')

  if (!confirm('Удалить файл?')) return

  try {
    const res = await fetch(
        `${API_BASE_URL}/tasks/${newTask.value.id}/files/${encodeURIComponent(filename)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
    )
    if (res.ok) {
      taskFiles.value = taskFiles.value.filter(f => f !== filename)
    } else {
      alert('Не удалось удалить файл')
    }
  } catch {
    alert('Ошибка сети')
  }
}

const saveTask = async () => {
  const grade = route.params.grade
  if (!newTask.value.title?.trim()) return error.value = 'Укажите название'
  if (!newTask.value.description?.trim()) return error.value = 'Описание обязательно'
  if (!newTask.value.subject) return error.value = 'Выберите предмет'
  if (selectedStudents.value.size === 0) return error.value = 'Выберите учеников'

  const token = getAccessToken()
  if (!token) return router.push('/login')

  isLoading.value = true
  error.value = ''

  try {
    const payload = {
      title: newTask.value.title,
      description: newTask.value.description,
      subject: newTask.value.subject,
      reason: newTask.value.reason,
      due_date: newTask.value.due_date,
      student_ids: Array.from(selectedStudents.value),
      ...(newTask.value.id ? {} : { grade })
    }

    const url = newTask.value.id
        ? `${API_BASE_URL}/tasks/${newTask.value.id}`
        : `${API_BASE_URL}/tasks/`

    const method = newTask.value.id ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) throw new Error('Ошибка сохранения задания')
    const task = await res.json()

    // Загрузка новых файлов (если есть)
    if (newFiles.value.length > 0) {
      const formData = new FormData()
      for (const file of newFiles.value) {
        formData.append('files', file)
      }

      const uploadRes = await fetch(`${API_BASE_URL}/tasks/${task.id}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })

      if (!uploadRes.ok) throw new Error('Ошибка загрузки файлов')
      // Обновляем список файлов после загрузки
      const updatedTask = await fetch(`${API_BASE_URL}/tasks/by-grade/${grade}?scope=mine&page=1&size=10`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json())
      const updated = updatedTask.items.find(t => t.id === task.id)
      taskFiles.value = updated?.files || []
    }

    resetForm()
    await loadTasks(grade, pagination.value.page)
  } catch (err) {
    error.value = err.message || 'Не удалось сохранить'
  } finally {
    isLoading.value = false
  }
}

const goToPage = (page) => {
  if (page >= 1 && page <= pagination.value.pages) {
    loadTasks(route.params.grade, page)
  }
}

const openSubmission = (sub) => {
  selectedSubmission.value = sub
  modalComment.value = ''
  modalGrade.value = 5
  isModalOpen.value = true
}

const openAcceptedTask = (task) => {
  selectedSubmission.value = task
  isModalOpen.value = true
}

const acceptSubmission = async () => {
  if (!selectedSubmission.value) return

  const token = getAccessToken()
  if (!token) return router.push('/login')

  isSaving.value = true
  try {
    const formData = new FormData()
    formData.append('grade', modalGrade.value)
    if (modalComment.value.trim()) {
      formData.append('comment', modalComment.value)
    }

    const res = await fetch(`${API_BASE_URL}/tasks/submissions/${selectedSubmission.value.id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })

    if (res.ok) {
      isModalOpen.value = false
      await loadSubmissions()
      await loadAcceptedTasks()
      await loadTasks(route.params.grade, pagination.value.page)
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.detail || 'Ошибка при принятии задания')
    }
  } catch (e) {
    alert('Ошибка сети')
  } finally {
    isSaving.value = false
  }
}

const rejectSubmission = async (submissionId) => {
  const comment = modalComment.value.trim()
  if (!comment) {
    alert('Пожалуйста, напишите комментарий для ученика')
    return
  }

  const token = getAccessToken()
  if (!token) return router.push('/login')

  processing.value.add(submissionId)
  try {
    const formData = new FormData()
    formData.append('comment', comment)

    const res = await fetch(`${API_BASE_URL}/tasks/submissions/${submissionId}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })

    if (res.ok) {
      isModalOpen.value = false
      await loadSubmissions()
      await loadTasks(route.params.grade, pagination.value.page)
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.detail || 'Ошибка при отправке на доработку')
    }
  } catch (e) {
    alert('Ошибка сети')
  } finally {
    processing.value.delete(submissionId)
  }
}

const downloadStudentFile = async (filename) => {
  if (!selectedSubmission.value) return

  const token = getAccessToken()
  if (!token) return router.push('/login')

  try {
    const response = await fetch(
        `${API_BASE_URL}/tasks/submissions/${selectedSubmission.value.id}/files/${encodeURIComponent(filename)}`,
        { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!response.ok) throw new Error('Файл не найден')

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => window.URL.revokeObjectURL(url), 60000)
  } catch (e) {
    alert('Ошибка открытия файла')
  }
}

const toggleStudent = (id) => {
  const s = selectedStudents.value
  s.has(id) ? s.delete(id) : s.add(id)
  selectedStudents.value = new Set(s)
}

const onFileChange = (e) => {
  newFiles.value = Array.from(e.target.files)
}

const removeNewFile = (i) => {
  newFiles.value.splice(i, 1)
}

watch(taskScope, () => loadTasks(route.params.grade, 1))
watch(submissionScope, () => loadSubmissions())
watch(() => route.params.grade, (grade) => {
  if (grade) {
    resetForm()
    loadStudents(grade)
    loadTasks(grade, 1)
    loadSubmissions()
    loadAcceptedTasks()
  }
})

onMounted(() => {
  const grade = route.params.grade
  if (grade) {
    loadStudents(grade)
    loadTasks(grade, 1)
    loadSubmissions()
    loadAcceptedTasks()
  }
})
</script>

<template>
  <div class="min-h-screen bg-base-100 p-4">
    <!-- Модальное окно (без изменений) -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-base-100 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <h2 class="text-xl font-bold">Проверка задания</h2>
            <button @click="isModalOpen = false" class="btn btn-ghost btn-sm">×</button>
          </div>

          <div class="space-y-4">
            <div class="p-4 bg-base-200 rounded-lg">
              <h3 class="font-bold text-lg">{{ selectedSubmission?.task_title }}</h3>
              <p class="text-sm opacity-80">{{ selectedSubmission?.student_name }} • {{ selectedSubmission?.grade }}</p>
            </div>

            <div>
              <label class="block text-sm font-semibold mb-2">Комментарий ученика:</label>
              <div class="p-3 bg-base-200 rounded border">
                {{ selectedSubmission?.student_comment || '—' }}
              </div>
            </div>

            <div v-if="selectedSubmission?.student_files?.length">
              <label class="block text-sm font-semibold mb-2">Файлы ученика:</label>
              <div class="flex flex-wrap gap-2">
                <a
                    v-for="(file, idx) in selectedSubmission.student_files"
                    :key="idx"
                    @click.prevent="downloadStudentFile(file)"
                    class="badge badge-primary cursor-pointer"
                >
                  📎 {{ file }}
                </a>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold mb-2">Оценка:</label>
              <select v-model="modalGrade" class="select select-bordered w-full">
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-semibold mb-2">Ваш комментарий:</label>
              <textarea
                  v-model="modalComment"
                  placeholder="Оставьте комментарий для ученика..."
                  class="textarea textarea-bordered w-full"
                  rows="3"
              ></textarea>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                  v-if="!selectedSubmission?.status || selectedSubmission.status !== 'accepted'"
                  @click="rejectSubmission(selectedSubmission.id)"
                  :disabled="isSaving"
                  class="btn btn-error flex-1"
              >
                {{ isSaving ? 'Отправка...' : 'На доработку' }}
              </button>
              <button
                  v-if="!selectedSubmission?.status || selectedSubmission.status !== 'accepted'"
                  @click="acceptSubmission"
                  :disabled="isSaving"
                  class="btn btn-success flex-1"
              >
                {{ isSaving ? 'Сохранение...' : 'Принять' }}
              </button>
              <button
                  v-else
                  @click="isModalOpen = false"
                  class="btn btn-secondary flex-1"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
      <!-- Левая панель: задания -->
      <div class="w-full lg:w-80 flex-shrink-0">
        <div class="card bg-base-200 shadow-xl sticky top-4">
          <div class="card-body p-4">
            <h2 class="text-lg font-bold mb-2">Задания: {{ route.params.grade || '—' }}</h2>

            <div class="flex gap-2 mb-3">
              <button
                  @click="taskScope = 'mine'"
                  class="btn btn-xs flex-1"
                  :class="{ 'btn-primary': taskScope === 'mine', 'btn-ghost': taskScope !== 'mine' }"
              >
                Мои
              </button>
              <button
                  @click="taskScope = 'all'"
                  class="btn btn-xs flex-1"
                  :class="{ 'btn-primary': taskScope === 'all', 'btn-ghost': taskScope !== 'all' }"
              >
                Все
              </button>
            </div>

            <div v-if="loadingTasks" class="text-center py-4">
              <span class="loading loading-spinner loading-sm"></span>
            </div>
            <div v-else-if="tasks.length === 0" class="text-center py-4 text-sm opacity-75">
              Нет заданий
            </div>
            <div v-else class="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              <div
                  v-for="task in tasks"
                  :key="task.id"
                  class="p-3 rounded-lg cursor-pointer transition hover:bg-base-300"
                  :class="{ 'bg-primary text-primary-content': newTask.id === task.id }"
                  @click="editTask(task)"
              >
                <div class="font-medium truncate">{{ task.title }}</div>
                <div class="text-xs opacity-90 mt-1">{{ formatDate(task.due_date) }}</div>
                <div v-if="taskScope === 'all'" class="text-xs opacity-75 mt-1">{{ task.teacher_name }}</div>
              </div>
            </div>

            <div v-if="pagination.pages > 1" class="mt-4 flex justify-center gap-1">
              <button
                  v-for="p in pagination.pages"
                  :key="p"
                  @click="goToPage(p)"
                  class="btn btn-xs"
                  :class="{ 'btn-primary': p === pagination.page, 'btn-ghost': p !== pagination.page }"
              >
                {{ p }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Центральная панель: форма -->
      <div class="flex-1">
        <div class="mb-6">
          <button @click="router.back()" class="btn btn-ghost btn-sm mb-2">← Назад</button>
          <h1 class="text-2xl font-bold">
            {{ newTask.id ? 'Редактировать' : 'Новое задание' }}
          </h1>
        </div>

        <div class="card bg-base-200 shadow-xl">
          <div class="card-body">
            <div class="space-y-4">
              <input v-model="newTask.title" type="text" placeholder="Название *" class="input input-bordered w-full" />
              <textarea v-model="newTask.description" placeholder="Описание *" class="textarea textarea-bordered w-full" rows="3"></textarea>

              <select v-model="newTask.subject" class="select select-bordered w-full">
                <option value="" disabled>Предмет *</option>
                <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
              </select>

              <input v-model="newTask.due_date" type="datetime-local" class="input input-bordered w-full" />

              <div class="flex flex-wrap gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="newTask.reason" type="radio" value="homework" class="radio radio-primary" />
                  <span>Домашнее задание</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="newTask.reason" type="radio" value="illness" class="radio radio-primary" />
                  <span>Долг из-за болезни</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="newTask.reason" type="radio" value="not_submitted" class="radio radio-primary" />
                  <span>Долг</span>
                </label>
              </div>

              <!-- Новые файлы -->
              <div>
                <input type="file" multiple @change="onFileChange" class="file-input file-input-bordered w-full" />
                <div v-if="newFiles.length" class="mt-2 space-y-1">
                  <div v-for="(f, i) in newFiles" :key="i" class="text-sm flex items-center gap-2">
                    {{ f.name }}
                    <button @click="removeNewFile(i)" class="btn btn-xs btn-circle">✕</button>
                  </div>
                </div>
              </div>

              <!-- Уже загруженные файлы -->
              <div v-if="taskFiles.length">
                <label class="block text-sm font-semibold mb-2">Загруженные файлы:</label>
                <div class="flex flex-wrap gap-2">
                  <div v-for="(file, idx) in taskFiles" :key="idx" class="badge badge-neutral flex items-center gap-1">
                    📎 {{ file }}
                    <button @click="deleteTaskFile(file)" class="btn btn-xs btn-circle">✕</button>
                  </div>
                </div>
              </div>

              <p v-if="error" class="text-error text-sm text-center">{{ error }}</p>

              <div class="flex gap-2">
                <button @click="saveTask" :disabled="isLoading" class="btn btn-primary flex-1">
                  {{ isLoading ? 'Сохранение...' : (newTask.id ? 'Сохранить' : 'Создать') }}
                </button>
                <button @click="resetForm" class="btn btn-ghost">Отмена</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Ученики -->
        <div class="card bg-base-200 shadow-xl mt-6">
          <div class="card-body">
            <h2 class="text-xl font-semibold mb-4">Ученики</h2>
            <div v-if="students.length === 0" class="text-center py-4">Нет учеников</div>
            <div v-else class="space-y-3 max-h-96 overflow-y-auto">
              <div
                  v-for="s in students"
                  :key="s.id"
                  @click="toggleStudent(s.id)"
                  class="flex justify-between items-center p-3 border rounded cursor-pointer hover:bg-base-300"
              >
                <div>
                  <div>{{ s.full_name }}</div>
                  <div class="text-sm opacity-75">{{ s.email }}</div>
                </div>
                <div class="w-5 h-5 rounded-full border flex items-center justify-center" :class="selectedStudents.has(s.id) ? 'bg-primary border-primary' : 'border-base-content'">
                  <svg v-if="selectedStudents.has(s.id)" class="w-3 h-3 text-white" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Правая панель -->
      <div class="w-full lg:w-80 flex-shrink-0 mt-6 lg:mt-0">
        <!-- Присланные задания -->
        <div class="card bg-base-200 shadow-xl sticky top-4 mb-6">
          <div class="card-body p-4">
            <h2 class="text-lg font-bold mb-3">Присланные задания</h2>

            <div class="flex gap-2 mb-4">
              <button
                  @click="submissionScope = 'current'"
                  class="btn btn-xs flex-1"
                  :class="{ 'btn-primary': submissionScope === 'current', 'btn-ghost': submissionScope !== 'current' }"
              >
                Этот класс
              </button>
              <button
                  @click="submissionScope = 'all'"
                  class="btn btn-xs flex-1"
                  :class="{ 'btn-primary': submissionScope === 'all', 'btn-ghost': submissionScope !== 'all' }"
              >
                Все
              </button>
            </div>

            <div v-if="loadingSubmissions" class="text-center py-2">
              <span class="loading loading-spinner loading-xs"></span>
            </div>
            <div v-else-if="submissions.length === 0" class="text-center py-2 text-sm opacity-75">
              Нет присланных работ
            </div>
            <div v-else class="space-y-2 max-h-[60vh] overflow-y-auto">
              <div
                  v-for="sub in submissions"
                  :key="sub.id"
                  class="p-3 rounded border border-base-300 bg-base-100 cursor-pointer hover:bg-base-300"
                  @click="openSubmission(sub)"
              >
                <div class="font-medium text-sm truncate">{{ sub.task_title }}</div>
                <div class="text-xs opacity-80 mt-1">{{ sub.student_name }}</div>
                <div class="text-xs opacity-80 mt-1">{{ sub.grade }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ПРОВЕРЕННЫЕ задания -->
        <div class="card bg-base-200 shadow-xl">
          <div class="card-body p-4">
            <h2 class="text-lg font-bold mb-3">Проверенные задания</h2>

            <div v-if="loadingAccepted" class="text-center py-2">
              <span class="loading loading-spinner loading-xs"></span>
            </div>
            <div v-else-if="acceptedTasks.length === 0" class="text-center py-2 text-sm opacity-75">
              Нет проверенных работ
            </div>
            <div v-else class="space-y-2 max-h-[60vh] overflow-y-auto">
              <div
                  v-for="task in acceptedTasks"
                  :key="task.id"
                  class="p-3 rounded border border-base-300 bg-base-100 cursor-pointer hover:bg-base-300"
                  @click="openAcceptedTask(task)"
              >
                <div class="font-medium text-sm truncate">{{ task.task_title }}</div>
                <div class="text-xs opacity-80 mt-1">{{ task.student_name }}</div>
                <div class="text-xs opacity-80 mt-1">{{ task.grade }} • Оценка: {{ task.teacher_grade }}</div>
              </div>
            </div>

            <div v-if="acceptedPagination.pages > 1" class="mt-3 flex justify-center gap-1">
              <button
                  v-for="p in acceptedPagination.pages"
                  :key="p"
                  @click="goToAcceptedPage(p)"
                  class="btn btn-xs"
                  :class="{ 'btn-primary': p === acceptedPagination.page, 'btn-ghost': p !== acceptedPagination.page }"
              >
                {{ p }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>