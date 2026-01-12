<!-- src/pages/admin/GenerateStudents.vue -->
<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Создание учётных записей учеников</h1>
        <button @click="router.back()" class="btn btn-ghost btn-sm">← Назад</button>
      </div>

      <p class="text-gray-700">
        Укажите название класса и введите ФИО учеников — по одному на строку.
        Система создаст для каждого учётную запись с уникальным email и паролем.
      </p>

      <!-- Форма -->
      <div class="card bg-base-100 p-4 rounded-lg space-y-4">
        <!-- Класс -->
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

        <!-- Список учеников -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">ФИО учеников (по одному на строку)</span>
          </label>
          <textarea
              v-model="studentsInput"
              placeholder="Иванов Иван Иванович&#10;Петров Пётр Петрович&#10;Сидорова Анна Сергеевна"
              class="textarea textarea-bordered w-full h-40"
              :disabled="generating"
          ></textarea>
        </div>

        <button
            @click="generateStudents"
            :disabled="!canSubmit || generating"
            class="btn btn-primary w-full"
        >
          {{ generating ? 'Создание...' : 'Создать учётные записи' }}
        </button>
      </div>

      <!-- Результат -->
      <div v-if="generatedStudents.length" class="overflow-x-auto">
        <div class="flex justify-between items-center mb-2">
          <h2 class="font-bold text-lg">Созданные учётные записи</h2>
          <button
              @click="copyToClipboard"
              class="btn btn-sm btn-outline"
          >
            Копировать всё
          </button>
        </div>
        <table class="table table-zebra w-full">
          <thead>
          <tr>
            <th>ФИО</th>
            <th>Email (логин)</th>
            <th>Пароль</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(s, i) in generatedStudents" :key="i">
            <td>{{ s.full_name }}</td>
            <td class="font-mono text-sm">{{ s.email }}</td>
            <td class="font-mono text-sm">{{ s.password }}</td>
          </tr>
          </tbody>
        </table>
        <div class="alert alert-info mt-4 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>Пароли показываются один раз. Сохраните их!</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const router = useRouter()
const gradeInput = ref('')
const studentsInput = ref('')
const generating = ref(false)
const generatedStudents = ref([])

// Проверка: можно ли отправлять
const canSubmit = computed(() => {
  const grade = gradeInput.value.trim()
  const names = studentsInput.value
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
  return grade && names.length > 0
})

const generateStudents = async () => {
  if (!canSubmit.value) return

  const grade = gradeInput.value.trim()
  const fullNames = studentsInput.value
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)

  if (fullNames.length === 0) {
    alert('Введите хотя бы одного ученика')
    return
  }

  generating.value = true
  generatedStudents.value = []

  try {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    // Отправляем класс и список ФИО
    const res = await fetch(`${API_BASE_URL}/auth/generate-students`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ grade, students: fullNames })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.detail || 'Не удалось создать учётные записи')
      return
    }

    const data = await res.json()
    generatedStudents.value = data.students || []
  } catch (e) {
    console.error('Ошибка:', e)
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
</script>