<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Управление учителями</h1>

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
      const updatedTeacher = await res.json() // ← Получаем обновлённого учителя
      const teacher = teachers.value.find(t => t.id === teacherId)
      if (teacher) {
        Object.assign(teacher, updatedTeacher) // ← Обновляем все поля
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

onMounted(() => {
  loadTeachers()
})
</script>