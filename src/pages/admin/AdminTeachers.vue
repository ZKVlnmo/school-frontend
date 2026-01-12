<!-- src/pages/admin/AdminTeachers.vue -->
<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-4xl mx-auto">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Управление учителями</h1>

        <!-- Кнопка для раскрытия формы генерации -->
        <button
            @click="showGenerateForm = !showGenerateForm"
            class="btn btn-primary btn-sm"
        >
          {{ showGenerateForm ? 'Скрыть форму' : 'Создать учеников' }}
        </button>
      </div>

      <!-- Форма генерации (встроенная) -->
      <div v-if="showGenerateForm" class="mb-6 card bg-white rounded-lg shadow-md p-4">
        <h2 class="font-bold text-lg mb-3">Создать учётные записи для класса</h2>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Название класса (например, "7-ИТ", "10А")</span>
          </label>
          <input
              v-model="gradeInput"
              type="text"
              placeholder="7-ИТ"
              class="input input-bordered w-full"
              :disabled="generating"
          />
        </div>
        <button
            @click="generateStudents"
            :disabled="!gradeInput.trim() || generating"
            class="btn btn-primary mt-3 w-full sm:w-auto"
        >
          {{ generating ? 'Генерация...' : 'Создать учётные записи' }}
        </button>

        <!-- Результат -->
        <div v-if="generatedStudents.length" class="mt-4 overflow-x-auto">
          <h3 class="font-bold text-md mb-2">Созданные учётные записи</h3>
          <table class="table table-zebra w-full text-sm">
            <thead>
            <tr>
              <th>ФИО</th>
              <th>Email</th>
              <th>Пароль</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(s, i) in generatedStudents" :key="i">
              <td>{{ s.full_name }}</td>
              <td class="font-mono">{{ s.email }}</td>
              <td class="font-mono">{{ s.password }}</td>
            </tr>
            </tbody>
          </table>
          <button
              @click="copyToClipboard"
              class="btn btn-sm btn-outline mt-2"
          >
            Копировать всё
          </button>
        </div>
      </div>

      <!-- Список учителей -->
      <div v-if="loading" class="text-center py-8">
        <span class="loading loading-spinner"></span>
      </div>

      <div v-else class="bg-white rounded-lg shadow-md overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-100">
          <tr>
            <th class="py-3 px-4 text-left">Учитель</th>
            <th class="py-3 px-4 text-left">Email</th>
            <th class="py-3 px-4 text-center">Подтверждён</th>
            <th class="py-3 px-4 text-center">Действия</th>
          </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
          <tr v-for="teacher in teachers" :key="teacher.id">
            <td class="py-3 px-4">{{ teacher.full_name }}</td>
            <td class="py-3 px-4 text-gray-600">{{ teacher.email }}</td>
            <td class="py-3 px-4 text-center">
              <div v-if="teacher.is_verified" class="text-green-600 font-medium">✅ Да</div>
              <div v-else class="text-red-600 font-medium">❌ Нет</div>
            </td>
            <td class="py-3 px-4 text-center">
              <button
                  v-if="!teacher.is_verified"
                  @click="approveTeacher(teacher.id)"
                  class="btn btn-sm btn-success"
                  :disabled="approving.has(teacher.id)"
              >
                {{ approving.has(teacher.id) ? 'Подтверждение...' : 'Подтвердить' }}
              </button>
              <span v-else class="text-green-600">Подтверждён</span>
            </td>
          </tr>
          </tbody>
        </table>

        <div v-if="teachers.length === 0" class="text-center py-8 text-gray-500">
          Нет учителей для подтверждения
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const teachers = ref([])
const loading = ref(false)
const approving = ref(new Set())
const router = useRouter()

// === Для генерации учеников ===
const showGenerateForm = ref(false)
const gradeInput = ref('')
const generating = ref(false)
const generatedStudents = ref([])

const getAccessToken = () => localStorage.getItem('access_token')

const loadTeachers = async () => {
  const token = getAccessToken()
  if (!token) {
    router.push('/login')
    return
  }

  loading.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/admin/teachers`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      teachers.value = await res.json()
    } else {
      const errorData = await res.json().catch(() => ({}))
      alert(errorData.detail || 'Не удалось загрузить список учителей')
    }
  } catch (e) {
    console.error(e)
    alert('Ошибка подключения к серверу')
  } finally {
    loading.value = false
  }
}

const approveTeacher = async (teacherId) => {
  if (approving.value.has(teacherId)) return

  approving.value.add(teacherId)
  try {
    const token = getAccessToken()
    const res = await fetch(`${API_BASE_URL}/admin/teachers/${teacherId}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (res.ok) {
      const updatedTeacher = await res.json()
      const teacher = teachers.value.find(t => t.id === teacherId)
      if (teacher) {
        Object.assign(teacher, updatedTeacher)
      }
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.detail || 'Не удалось подтвердить учителя')
    }
  } catch (e) {
    console.error(e)
    alert('Ошибка при подтверждении учителя')
  } finally {
    approving.value.delete(teacherId)
  }
}

// === Генерация учеников ===
const generateStudents = async () => {
  const grade = gradeInput.value.trim()
  if (!grade) {
    alert('Укажите название класса')
    return
  }

  generating.value = true
  generatedStudents.value = []

  try {
    const token = getAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    const res = await fetch(`${API_BASE_URL}/auth/generate-students`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ grade })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.detail || 'Не удалось создать учётные записи')
      return
    }

    const data = await res.json()
    generatedStudents.value = data.students || []
  } catch (e) {
    console.error('Ошибка генерации:', e)
    alert('Ошибка сети или сервера')
  } finally {
    generating.value = false
  }
}

const copyToClipboard = () => {
  if (!generatedStudents.value.length) return

  const text = generatedStudents.value
      .map(s => `${s.full_name}\t${s.email}\t${s.password}`)
      .join('\n')

  navigator.clipboard.writeText(text).then(() => {
    alert('✅ Данные скопированы!')
  }).catch(() => {
    alert('Не удалось скопировать. Попробуйте вручную.')
  })
}

onMounted(() => {
  loadTeachers()
})
</script>