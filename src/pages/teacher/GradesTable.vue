<!-- src/pages/teacher/GradesTable.vue -->
<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const route = useRoute()
const router = useRouter()

const grade = route.params.grade
const students = ref([])
const tasks = ref([])
const cells = ref({})
const isLoading = ref(false)
const selectedSubject = ref('')

const getAccessToken = () => localStorage.getItem('access_token')

// === Модальное окно ===
const selectedSubmission = ref(null)
const isModalOpen = ref(false)

const openModal = async (taskId, studentId) => {
  const token = getAccessToken()
  if (!token) return router.push('/login')

  try {
    // НОВЫЙ ЭНДПОИНТ
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
    console.error('Ошибка открытия модалки:', e)
    alert(e.message || 'Не удалось загрузить задание')
  }
}

const loadGradesData = async () => {
  const token = getAccessToken()
  if (!token) return router.push('/login')
  isLoading.value = true
  try {
    const url = new URL(`${API_BASE_URL}/tasks/grades/${encodeURIComponent(grade)}`)
    if (selectedSubject.value && selectedSubject.value !== 'Все предметы') {
      url.searchParams.set('subject', selectedSubject.value)
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.ok) {
      const data = await res.json()
      students.value = data.students || []
      tasks.value = data.tasks || []
      cells.value = data.cells || {}
    } else {
      alert('Ошибка загрузки журнала')
    }
  } catch (e) {
    console.error('Ошибка:', e)
    alert('Не удалось подключиться к серверу')
  } finally {
    isLoading.value = false
  }
}

const uniqueSubjects = computed(() => {
  const subjects = new Set(tasks.value.map(t => t.subject).filter(Boolean))
  return ['Все предметы', ...Array.from(subjects).sort()]
})

const getCell = (taskId, studentId) => {
  return cells.value[`${taskId}-${studentId}`] || { status: 'not_assigned', grade: null }
}

const getStatusText = (status) => {
  switch (status) {
    case 'accepted': return 'Оценено'
    case 'submitted': return 'Прислано, не оценено'
    case 'assigned': return 'Задано, не прислано'
    case 'not_assigned': return 'Не задано'
    default: return '—'
  }
}

watch(() => route.params.grade, () => loadGradesData())
watch(selectedSubject, () => loadGradesData())

onMounted(() => {
  if (grade) loadGradesData()
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
          </div>

          <div class="mt-5 text-right">
            <button @click="isModalOpen = false" class="btn btn-primary">Закрыть</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Основной контент -->
    <div class="max-w-7xl mx-auto">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Журнал оценок: <span class="text-blue-600">{{ grade }}</span></h1>
        <button @click="router.back()" class="btn btn-ghost btn-sm">← Назад</button>
      </div>

      <!-- Фильтр -->
      <div class="mb-5 flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium text-gray-700">Фильтр по предмету:</span>
        <select v-model="selectedSubject" class="select select-bordered text-sm">
          <option v-for="subj in uniqueSubjects" :key="subj" :value="subj">
            {{ subj }}
          </option>
        </select>
      </div>

      <!-- Таблица -->
      <div v-if="!isLoading && (tasks.length > 0 && students.length > 0)" class="rounded-lg border border-gray-300 overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-100 text-gray-700">
            <tr>
              <th class="sticky left-0 z-10 bg-gray-100 border-r border-gray-300 py-3 px-3 text-left font-semibold">
                Ученик
              </th>
              <th
                  v-for="task in tasks"
                  :key="task.id"
                  class="text-center py-2 px-2 min-w-[100px] border-l border-gray-300"
              >
                <div class="font-semibold text-xs text-gray-800 truncate">{{ task.title }}</div>
                <div class="text-[10px] text-gray-500 mt-1 truncate">{{ task.subject }}</div>
                <div class="text-[10px] text-gray-500">
                  {{ new Date(task.due_date).toLocaleDateString('ru-RU') }}
                </div>
              </th>
            </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
            <tr v-for="student in students" :key="student.id" class="hover:bg-gray-50">
              <!-- ✅ КЛИК ПО ИМЕНИ → ПРОФИЛЬ УЧЕНИКА -->
              <td
                  class="sticky left-0 z-10 bg-white border-r border-gray-300 font-medium py-2 px-3 cursor-pointer"
                  @click="router.push(`/teacher/class/${grade}/student/${student.id}`)"
              >
                {{ student.full_name }}
              </td>
              <td
                  v-for="task in tasks"
                  :key="`${student.id}-${task.id}`"
                  class="border-l border-gray-300 p-0 text-center"
              >
                <div
                    v-if="getCell(task.id, student.id).status !== 'not_assigned'"
                    @click="openModal(task.id, student.id)"
                    class="w-8 h-8 flex items-center justify-center cursor-pointer rounded text-white text-sm font-bold transition-all hover:shadow-md hover:scale-105"
                    :class="{
                      'bg-gray-400': getCell(task.id, student.id).status === 'submitted',
                      'bg-green-500': getCell(task.id, student.id).grade === 5,
                      'bg-orange-500': getCell(task.id, student.id).grade === 4,
                      'bg-yellow-400': getCell(task.id, student.id).grade === 3,
                      'bg-red-500': getCell(task.id, student.id).grade === 2 || getCell(task.id, student.id).status === 'assigned'
                    }"
                    :title="getStatusText(getCell(task.id, student.id).status)"
                >
                  {{ getCell(task.id, student.id).grade || '' }}
                </div>
                <div v-else class="w-8 h-8 flex items-center justify-center">
                  <span class="text-red-500 text-xs">—</span>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Состояния -->
      <div v-if="isLoading" class="text-center py-12">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="tasks.length === 0 || students.length === 0" class="text-center py-12 text-gray-500">
        Нет данных для отображения
      </div>

      <!-- Легенда -->
      <div class="mt-6 text-sm text-gray-600">
        <strong>Легенда:</strong>
        <span class="ml-4">🟢 5</span>
        <span class="ml-4">🟠 4</span>
        <span class="ml-4">🟡 3</span>
        <span class="ml-4">🔴 2 или задано, не прислано</span>
        <span class="ml-4">⚪ прислано</span>
        <span class="ml-4">— не задано</span>
      </div>
    </div>
  </div>
</template>