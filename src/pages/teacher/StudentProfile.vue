<!-- src/pages/teacher/StudentProfile.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const route = useRoute()
const router = useRouter()

const student = ref(null)
const subjects = ref({})
const isLoading = ref(false)
const isModalOpen = ref(false)
const selectedSubmission = ref(null)

const getAccessToken = () => localStorage.getItem('access_token')

const loadStudentData = async () => {
  const token = getAccessToken()
  if (!token) return router.push('/login')

  isLoading.value = true
  try {
    const res = await fetch(
        `${API_BASE_URL}/tasks/students/${route.params.studentId}/grades`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.ok) {
      const data = await res.json()
      student.value = data.student
      subjects.value = data.subjects
    } else {
      alert('Не удалось загрузить данные ученика')
    }
  } catch (e) {
    console.error('Ошибка:', e)
    alert('Ошибка подключения к серверу')
  } finally {
    isLoading.value = false
  }
}

const openSubmissionModal = async (taskId, studentId, grade) => {
  const token = getAccessToken()
  if (!token) return router.push('/login')

  try {
    const url = new URL(`${API_BASE_URL}/tasks/submission/detail`)
    url.searchParams.set('task_id', taskId)
    url.searchParams.set('student_id', studentId)
    url.searchParams.set('grade', grade)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Работа не найдена')
    }

    selectedSubmission.value = await res.json()
    isModalOpen.value = true
  } catch (e) {
    console.error('Ошибка:', e)
    alert(e.message || 'Не удалось загрузить задание')
  }
}

// Все задания для заголовков
const allTasks = computed(() => {
  const tasks = []
  for (const subject in subjects.value) {
    tasks.push(...subjects.value[subject])
  }
  return tasks.sort((a, b) => new Date(b.due_date) - new Date(a.due_date))
})

// 🔴 КРАСНЫЙ КВАДРАТ, КАК В GradesTable.vue
const getCellClass = (task) => {
  if (task.status === 'accepted') {
    switch (task.grade) {
      case 5: return 'bg-green-500 text-white'
      case 4: return 'bg-orange-500 text-white'
      case 3: return 'bg-yellow-400 text-black'
      case 2: return 'bg-red-500 text-white'
    }
  }
  if (task.status === 'submitted') {
    return 'bg-gray-400 text-white' // прислано, не оценено
  }
  if (task.status === 'assigned') {
    return 'bg-red-500 text-white' // ⬅️ ЗАДАНО, НЕ ПРИСЛАНО — КРАСНЫЙ
  }
  return 'bg-transparent'
}

const getStatusText = (status) => {
  switch (status) {
    case 'accepted': return 'Оценено'
    case 'submitted': return 'Прислано'
    case 'assigned': return 'Задано, не прислано'
    default: return '—'
  }
}

onMounted(() => {
  loadStudentData()
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
    <div class="max-w-6xl mx-auto mb-6">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-800">
          Ученик: <span class="text-blue-600">{{ student?.full_name }}</span>
        </h1>
        <button @click="router.back()" class="btn btn-ghost btn-sm">← Назад</button>
      </div>
      <p class="text-gray-600">Класс: {{ student?.grade }}</p>
    </div>

    <!-- Загрузка -->
    <div v-if="isLoading" class="text-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Таблица -->
    <div v-else-if="Object.keys(subjects).length > 0" class="max-w-6xl mx-auto overflow-x-auto">
      <div class="min-w-full" style="min-width: 800px;">
        <table class="table w-full border-separate" style="border-spacing: 0;">
          <thead class="bg-gray-100">
          <tr>
            <th class="sticky left-0 z-10 bg-gray-100 border-r border-gray-300 py-3 px-3 text-left font-semibold min-w-[180px]">
              Предмет
            </th>
            <!-- ✅ Для каждого предмета — свои столбцы, нумерованные от 1 -->
            <th
                v-for="(task, index) in allTasks"
                :key="task.task_id"
                class="text-center py-2 px-2 min-w-[80px] border-l border-gray-300"
            >
              {{ index + 1 }}
            </th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(taskList, subject) in subjects" :key="subject" class="hover:bg-gray-50">
            <td class="sticky left-0 z-10 bg-white border-r border-gray-300 font-medium py-2 px-3 min-w-[180px]">
              {{ subject }}
            </td>
            <!-- ✅ Показываем только те задания, которые относятся к этому предмету -->
            <td
                v-for="(task, taskIndex) in taskList"
                :key="task.task_id"
                class="border-l border-gray-300 p-0 text-center"
            >
              <div
                  @click="openSubmissionModal(task.task_id, student.id, student.grade)"
                  class="w-8 h-8 flex items-center justify-center cursor-pointer rounded text-sm font-bold transition-all hover:shadow-md hover:scale-105"
                  :class="getCellClass(task)"
                  :title="getStatusText(task.status)"
              >
                {{ task.status === 'accepted' ? task.grade : '' }}
              </div>
            </td>
            <!-- ✅ Заполняем пустые ячейки до конца строки -->
            <td
                v-for="i in allTasks.length - taskList.length"
                :key="'empty-' + i"
                class="border-l border-gray-300 p-0 text-center"
            >
              <div class="w-8 h-8"></div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="max-w-6xl mx-auto text-center py-8 text-gray-500">
      Нет заданий
    </div>

    <!-- Легенда -->
    <div class="max-w-6xl mx-auto mt-6 p-4 bg-gray-100 rounded-lg">
      <h3 class="font-bold mb-2">Легенда:</h3>
      <div class="grid grid-cols-2 gap-2">
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
          <div class="w-6 h-6 bg-gray-400 rounded text-white text-center text-xs">—</div>
          <span>Прислано, не оценено</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-red-500 rounded text-white text-center">•</div>
          <span>Задано, не прислано</span>
        </div>
      </div>
    </div>
  </div>
</template>