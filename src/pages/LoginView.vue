<!-- src/pages/auth/Login.vue -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="w-full max-w-md bg-white rounded-xl shadow-md p-6 space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-800">Вход в систему</h1>
        <p class="text-gray-600 mt-2">Введите email и пароль</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
              v-model="form.email"
              type="email"
              required
              class="input input-bordered w-full"
              placeholder="user@example.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
          <input
              v-model="form.password"
              type="password"
              required
              class="input input-bordered w-full"
              placeholder="••••••••"
          />
        </div>

        <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>

        <button
            type="submit"
            :disabled="loading"
            class="btn btn-primary w-full"
        >
          {{ loading ? 'Вход...' : 'Войти' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const form = ref({
  email: '',
  password: ''
})

const error = ref('')
const loading = ref(false)
const router = useRouter()

const handleLogin = async () => {
  error.value = ''
  loading.value = true

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: form.value.email,
        password: form.value.password
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка при входе')
    }

    // ✅ Сохраняем токен
    localStorage.setItem('access_token', data.access_token)

    // ✅ Сохраняем данные пользователя — КЛЮЧЕВОЙ МОМЕНТ!
    if (data.user) {
      localStorage.setItem('user_id', data.user.id.toString())
      localStorage.setItem('user_grade', data.user.grade || '') // у учителя может не быть grade
    }

    // Перенаправление по ролям
    if (data.user?.role === 'teacher') {
      router.push('/teacher/tasks')
    } else if (data.user?.role === 'student') {
      router.push('/student/tasks')
    } else {
      router.push('/')
    }
  } catch (err) {
    error.value = err.message || 'Не удалось войти'
    console.error('Ошибка входа:', err)
  } finally {
    loading.value = false
  }
}
</script>