<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const error = ref('')

const router = useRouter()
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Вспомогательная функция для расшифровки JWT (только payload)
function parseJwt(token) {
  try {
    const payload = token.split('.')[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch (e) {
    console.error('Не удалось расшифровать JWT:', e)
    return null
  }
}

const handleSubmit = async () => {
  error.value = ''
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Ошибка входа:', response.status, data)
      error.value = data.detail || 'Неверный email или пароль'
      return
    }

    const { access_token } = data
    const payload = parseJwt(access_token)

    if (!payload || !payload.role) {
      error.value = 'Неверный формат токена'
      return
    }

    // Сохраняем данные
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('user_role', payload.role)
    localStorage.setItem('user_email', payload.sub)

    // Перенаправляем в зависимости от роли
    // Перенаправляем в зависимости от роли
    if (payload.role === 'teacher') {
      router.push('/teacher/select-grade')
    } else if (payload.role === 'student') {
      router.push('/student/tasks') // ✅ Исправлено
    } else {
      router.push('/')
    }
  } catch (err) {
    console.error('Сетевая ошибка:', err)
    error.value = 'Нет соединения с сервером'
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-100 p-4">
    <div class="w-full max-w-md card bg-base-200 shadow-xl">
      <div class="card-body">
        <h1 class="text-2xl font-bold text-center text-base-content">Вход</h1>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div>
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input
                v-model="email"
                type="email"
                required
                placeholder="you@example.com"
                class="input input-bordered w-full"
            />
          </div>

          <div>
            <label class="label">
              <span class="label-text">Пароль</span>
            </label>
            <input
                v-model="password"
                type="password"
                required
                placeholder="••••••••"
                class="input input-bordered w-full"
            />
          </div>

          <p v-if="error" class="text-error text-sm text-center">{{ error }}</p>

          <button type="submit" class="btn btn-primary w-full">
            Войти
          </button>
        </form>

        <p class="text-center text-sm mt-4">
          Нет аккаунта?
          <router-link to="/register" class="link link-primary">Зарегистрироваться</router-link>
        </p>
      </div>
    </div>
  </div>
</template>