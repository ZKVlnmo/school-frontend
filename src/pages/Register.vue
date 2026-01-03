<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const full_name = ref('')
const role = ref('student')
const grade = ref(7) // значение по умолчанию — 7 класс
const error = ref('')

const router = useRouter()
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Сбрасываем grade при смене роли на "teacher"
watch(role, (newRole) => {
  if (newRole === 'teacher') {
    grade.value = null
  } else {
    grade.value = 7
  }
})

const handleSubmit = async () => {
  error.value = ''

  // Валидация на фронтенде: если студент — класс обязателен
  if (role.value === 'student' && (!grade.value || grade.value < 7 || grade.value > 11)) {
    error.value = 'Выберите корректный класс (7–11)'
    return
  }

  try {
    const payload = {
      email: email.value,
      password: password.value,
      full_name: full_name.value,
      role: role.value,
    }

    // Добавляем grade только для ученика
    if (role.value === 'student') {
      payload.grade = Number(grade.value)
    }
    else {
      payload.grade = 0
    }

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Ошибка регистрации:', response.status, data)
      error.value = data.detail || 'Неизвестная ошибка регистрации'
      return
    }

    localStorage.setItem('access_token', data.access_token)
    router.push('/') // или '/dashboard'
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
        <h1 class="text-2xl font-bold text-center text-base-content">Регистрация</h1>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Полное имя -->
          <div>
            <label class="label">
              <span class="label-text">Полное имя</span>
            </label>
            <input
                v-model="full_name"
                type="text"
                required
                placeholder="Иван Иванов"
                class="input input-bordered w-full"
            />
          </div>

          <!-- Email -->
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

          <!-- Пароль -->
          <div>
            <label class="label">
              <span class="label-text">Пароль</span>
            </label>
            <input
                v-model="password"
                type="password"
                required
                minlength="6"
                placeholder="••••••••"
                class="input input-bordered w-full"
            />
          </div>

          <!-- Роль -->
          <div>
            <label class="label">
              <span class="label-text">Роль</span>
            </label>
            <div class="flex space-x-6">
              <div class="flex items-center">
                <input
                    id="role-student"
                    v-model="role"
                    type="radio"
                    value="student"
                    class="radio radio-primary"
                />
                <label for="role-student" class="ml-2 label-text">Ученик</label>
              </div>
              <div class="flex items-center">
                <input
                    id="role-teacher"
                    v-model="role"
                    type="radio"
                    value="teacher"
                    class="radio radio-primary"
                />
                <label for="role-teacher" class="ml-2 label-text">Преподаватель</label>
              </div>
            </div>
          </div>

          <!-- Выбор класса (только для ученика) -->
          <div v-if="role === 'student'">
            <label class="label">
              <span class="label-text">Класс</span>
            </label>
            <select
                v-model.number="grade"
                class="select select-bordered w-full"
                required
            >
              <option value="7">7 класс</option>
              <option value="8">8 класс</option>
              <option value="9">9 класс</option>
              <option value="10">10 класс</option>
              <option value="11">11 класс</option>
            </select>
          </div>

          <!-- Ошибка -->
          <p v-if="error" class="text-error text-sm text-center">{{ error }}</p>

          <!-- Кнопка -->
          <button type="submit" class="btn btn-primary w-full">
            Зарегистрироваться
          </button>
        </form>

        <!-- Ссылка на вход -->
        <p class="text-center text-sm mt-4">
          Уже есть аккаунт?
          <router-link to="/login" class="link link-primary">Войти</router-link>
        </p>
      </div>
    </div>
  </div>
</template>