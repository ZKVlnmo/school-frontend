<!-- src/pages/teacher/ClassGradesTable.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const route = useRoute()
const router = useRouter()
const grade = route.params.grade

if (!grade) {
  router.push('/teacher/select-grade')
}

// ✅ Универсальный fetch с обработкой 401
const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('access_token')
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    localStorage.clear()
    router.push('/login')
    throw new Error('Unauthorized')
  }

  return response
}

const students = ref([])
const tasks = ref([])
const cells = ref({})
const isLoading = ref(false)
const isModalOpen = ref(false)
const selectedSubmission = ref(null)

const loadGradesTable = async () => {
  isLoading.value = true
  try {
    const res = await apiFetch(`${API_BASE_URL}/tasks/grades/${encodeURIComponent(grade)}`)
    if (res.ok) {
      const data = await res.json()
      students.value = data.students || []
      tasks.value = data.tasks || []
      cells.value = data.cells || {}
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.detail || 'Не удалось загрузить журнал')
    }
  } catch (e) {
    if (e.message !== 'Unauthorized') {
      console.error('Ошибка:', e)
      alert('Ошибка подключения')
    }
  } finally {
    isLoading.value = false
  }
}

const getCell = (taskId, studentId) => {
  return cells.value[`${taskId}-${studentId}`] || { status: 'not_assigned' }
}

const getCellClass = (cell) => {
  if (cell.status === 'accepted') {
    switch (cell.grade) {
      case 5: return 'bg-green-500 text-white'
      case 4: return 'bg-orange-500 text-white'
      case 3: return 'bg-yellow-400 text-black'
      case 2: return 'bg-red-500 text-white'
      default: return 'bg-gray-300'
    }
  }
  if (cell.status === 'submitted') return 'bg-blue-200 text-gray-800'
  if (cell.status === 'assigned') return 'bg-red-100 text-gray-700'
  return 'bg-gray-100'
}

const openSubmissionDetail = async (taskId, studentId) => {
  try {
    const url = new URL(`${API_BASE_URL}/tasks/submission/detail`)
    url.searchParams.set('task_id', taskId)
    url.searchParams.set('student_id', studentId)
    url.searchParams.set('grade', grade)

    const res = await apiFetch(url.toString())
    if (!res.ok) throw new Error('Работа не найдена')

    selectedSubmission.value = await res.json()
    isModalOpen.value = true
  } catch (e) {
    if (e.message !== 'Unauthorized') {
      alert(e.message || 'Не удалось загрузить задание')
    }
  }
}

onMounted(() => {
  loadGradesTable()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <!-- Модальное окно -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="p-5">
          <div class="flex justify-between items-start mb-4">
            <h2 class="text-xl font-bold text-gray-800">Задание: {{ selectedSubmission?.task_title }}</h2>
            <button @click="isModalOpen = false" class="btn btn-ghost btn-sm">×</button>
          </div>
          <div class="mb-4 p-3 bg-blue-50 rounded-lg">
            <div class="font-semibold text-gray-800">{{ selectedSubmission?.student_name }} • {{ selectedSubmission?.grade }}</div>
            <div v-if="selectedSubmission?.teacher_grade" class="text-green-600 font-medium mt-1">
              Оценка: {{ selectedSubmission.teacher_grade }}
            </div>
          </div>
          <div class="space-y-3">
            <div>
              <div class="text-sm font-medium text-gray-700 mb-1">Предмет</div>
              <div class="p-2 bg-gray-100 rounded font-medium">{{ selectedSubmission?.subject }}</div>
            </div>
            <div>
              <div class="text-sm font-medium text-gray-700 mb-1">Описание задания</div>
              <div class="p-3 bg-gray-100 rounded border whitespace-pre-wrap break-words text-gray-800">
                {{ selectedSubmission?.description }}
              </div>
            </div>
            <div v-if="selectedSubmission?.student_comment">
              <div class="text-sm font-medium text-gray-700 mb-1">💬 Комментарий ученика</div>
              <div class="p-3 bg-gray-100 rounded border whitespace-pre-wrap break-words text-gray-800">
                {{ selectedSubmission.student_comment }}
              </div>
            </div>
            <div v-if="selectedSubmission?.teacher_comment">
              <div class="text-sm font-medium text-gray-700 mb-1 text-green-700">✅ Комментарий учителя</div>
              <div class="p-3 bg-green-50 rounded border border-green-200 whitespace-pre-wrap break-words text-gray-800">
                {{ selectedSubmission.teacher_comment }}
              </div>
            </div>
            <div v-if="selectedSubmission?.ai_analysis">
              <div class="text-sm font-medium text-gray-700 mb-1 text-blue-700">🤖 Анализ ИИ</div>
              <div class="p-3 bg-blue-50 rounded border border-blue-200 whitespace-pre-wrap break-words text-gray-800">
                {{ selectedSubmission.ai_analysis }}
              </div>
            </div>
            <div v-if="selectedSubmission?.due_date">
              <div class="text-sm font-medium text-gray-700 mb-1">📅 Дедлайн</div>
              <div class="p-2 bg-gray-100 rounded">
                {{ new Date(selectedSubmission.due_date).toLocaleDateString('ru-RU') }}
              </div>
            </div>
          </div>
          <div class="mt-5 text-right">
            <button @click="isModalOpen = false" class="btn btn-primary">Закрыть</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Заголовок -->
    <div class="max-w-7xl mx-auto mb-6">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-800">Журнал класса: <span class="text-blue-600">{{ grade }}</span></h1>
        <button @click="router.back()" class="btn btn-ghost btn-sm">← Назад</button>
      </div>
    </div>

    <!-- Загрузка -->
    <div v-if="isLoading" class="text-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Таблица -->
    <div v-else-if="students.length > 0 && tasks.length > 0" class="max-w-7xl mx-auto overflow-x-auto">
      <div class="min-w-full" style="min-width: 1000px;">
        <table class="table w-full border-separate" style="border-spacing: 0;">
          <thead class="bg-gray-100">
          <tr>
            <th class="sticky left-0 z-10 bg-gray-100 border-r border-gray-300 py-3 px-3 text-left font-semibold min-w-[180px]">
              Ученик
            </th>
            <th
                v-for="task in tasks"
                :key="task.id"
                class="text-center py-2 px-2 min-w-[100px] border-l border-gray-300"
                :title="`${task.subject}: ${task.title}`"
            >
              <div class="text-xs font-bold truncate">{{ task.subject }}</div>
              <div class="text-xs mt-1 truncate">{{ task.title }}</div>
            </th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="student in students" :key="student.id" class="hover:bg-gray-50">
            <td class="sticky left-0 z-10 bg-white border-r border-gray-300 font-medium py-2 px-3 min-w-[180px]">
              {{ student.full_name }}
            </td>
            <td
                v-for="task in tasks"
                :key="`${student.id}-${task.id}`"
                class="border-l border-gray-300 p-0 text-center"
            >
              <div
                  @click="openSubmissionDetail(task.id, student.id)"
                  class="w-8 h-8 flex items-center justify-center cursor-pointer rounded text-sm font-bold transition hover:shadow"
                  :class="getCellClass(getCell(task.id, student.id))"
              >
                {{ getCell(task.id, student.id).grade || '' }}
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="max-w-7xl mx-auto text-center py-8 text-gray-500">
      Нет данных
    </div>

    <!-- Легенда -->
    <div class="max-w-7xl mx-auto mt-6 p-4 bg-gray-100 rounded-lg">
      <h3 class="font-bold mb-2">Легенда:</h3>
      <div class="flex flex-wrap gap-4 text-sm">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-green-500 rounded text-white text-center text-xs">5</div>
          <span>Оценка 5</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-orange-500 rounded text-white text-center text-xs">4</div>
          <span>Оценка 4</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-yellow-400 rounded text-black text-center text-xs">3</div>
          <span>Оценка 3</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-red-500 rounded text-white text-center text-xs">2</div>
          <span>Оценка 2</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-blue-200 rounded text-gray-800 text-center text-xs">—</div>
          <span>Прислано</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-red-100 rounded text-gray-700 text-center text-xs">•</div>
          <span>Задано</span>
        </div>
      </div>
    </div>
  </div>
</template>