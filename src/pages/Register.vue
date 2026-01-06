<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const full_name = ref('')
const role = ref('student')
const step = ref('direction') // 'direction' → 'grade'
const selectedDirection = ref('academy') // 'academy', 'БИО', 'ЛИН', ...
const selectedGrade = ref(null)

const error = ref('')
const router = useRouter()
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Сброс при смене роли
watch(role, (newRole) => {
  if (newRole === 'teacher') {
    step.value = 'direction'
    selectedGrade.value = null
  } else {
    step.value = 'direction'
    selectedDirection.value = 'academy'
    selectedGrade.value = null
  }
})

// Направления
const directions = [
  { id: 'academy', name: 'Академические (5–6)' },
  { id: 'БИО', name: 'Биологическое' },
  { id: 'ЛИН', name: 'Лингвистическое' },
  { id: 'МАТ', name: 'Математическое' },
  { id: 'ИТ', name: 'Информационные технологии' },
  { id: 'ИНЖ', name: 'Инженерное' }
]

// Получить классы по направлению
const getGradesByDirection = (dir) => {
  if (dir === 'academy') {
    return ['5-1', '5-2', '5-3', '6-1', '6-2', '6-3', '6-4']
  } else {
    return [7, 8, 9, 10, 11].map(year => `${year}-${dir}`)
  }
}

const nextStep = () => {
  if (step.value === 'direction') {
    if (!selectedDirection.value) {
      error.value = 'Выберите направление'
      return
    }
    step.value = 'grade'
    selectedGrade.value = getGradesByDirection(selectedDirection.value)[0]
  }
}

const prevStep = () => {
  step.value = 'direction'
  selectedGrade.value = null
}

const handleSubmit = async () => {
  error.value = ''
  if (role.value === 'student' && !selectedGrade.value) {
    error.value = 'Выберите класс'
    return
  }

  try {
    const payload = {
      email: email.value,
      password: password.value,
      full_name: full_name.value,
      role: role.value
    }

    if (role.value === 'student') {
      payload.grade = selectedGrade.value
    }

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    if (!response.ok) {
      error.value = data.detail || 'Ошибка регистрации'
      return
    }

    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('user_role', role.value)
    router.push('/')
  } catch (err) {
    error.value = 'Нет соединения с сервером'
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-100 p-4">
    <div class="w-full max-w-md card bg-base-200 shadow-xl">
      <div class="card-body">
        <h1 class="text-2xl font-bold text-center">Регистрация</h1>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Имя, email, пароль — всегда видны -->
          <div>
            <label class="label"><span class="label-text">Полное имя</span></label>
            <input v-model="full_name" type="text" required placeholder="Иван Иванов" class="input input-bordered w-full" />
          </div>
          <div>
            <label class="label"><span class="label-text">Email</span></label>
            <input v-model="email" type="email" required placeholder="you@example.com" class="input input-bordered w-full" />
          </div>
          <div>
            <label class="label"><span class="label-text">Пароль</span></label>
            <input v-model="password" type="password" required minlength="6" placeholder="••••••••" class="input input-bordered w-full" />
          </div>

          <!-- Роль -->
          <div>
            <label class="label"><span class="label-text">Роль</span></label>
            <div class="flex space-x-4">
              <label class="flex items-center cursor-pointer">
                <input v-model="role" type="radio" value="student" class="radio radio-primary" />
                <span class="ml-2">Ученик</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input v-model="role" type="radio" value="teacher" class="radio radio-primary" />
                <span class="ml-2">Преподаватель</span>
              </label>
            </div>
          </div>

          <!-- Выбор класса (только для ученика) -->
          <div v-if="role === 'student'">
            <!-- Шаг 1: Выбор направления -->
            <div v-if="step === 'direction'">
              <label class="label"><span class="label-text">Выберите направление</span></label>
              <div class="grid grid-cols-1 gap-2">
                <button
                    v-for="dir in directions"
                    :key="dir.id"
                    type="button"
                    @click="selectedDirection = dir.id"
                    class="text-left p-3 rounded border transition"
                    :class="{
                    'bg-primary text-primary-content border-primary': selectedDirection === dir.id,
                    'border-base-300 hover:bg-base-300': selectedDirection !== dir.id
                  }"
                >
                  {{ dir.name }}
                </button>
              </div>
              <button
                  type="button"
                  @click="nextStep"
                  :disabled="!selectedDirection"
                  class="btn btn-primary w-full mt-4"
              >
                Далее →
              </button>
            </div>

            <!-- Шаг 2: Выбор класса -->
            <div v-else-if="step === 'grade'">
              <div class="flex items-center mb-3">
                <button type="button" @click="prevStep" class="btn btn-ghost btn-sm">×</button>
                <span class="text-sm font-medium ml-2">
                  {{ directions.find(d => d.id === selectedDirection)?.name }}
                </span>
              </div>
              <label class="label"><span class="label-text">Выберите класс</span></label>
              <div class="grid grid-cols-4 gap-2">
                <button
                    v-for="grade in getGradesByDirection(selectedDirection)"
                    :key="grade"
                    type="button"
                    @click="selectedGrade = grade"
                    class="text-sm py-2 rounded border transition"
                    :class="{
                    'bg-primary text-primary-content border-primary': selectedGrade === grade,
                    'border-base-300 hover:bg-base-300': selectedGrade !== grade
                  }"
                >
                  {{ grade }}
                </button>
              </div>
            </div>
          </div>

          <p v-if="error" class="text-error text-sm text-center">{{ error }}</p>

          <!-- Кнопка отправки (показывается только на шаге grade или для учителя) -->
          <button
              v-if="role === 'teacher' || step === 'grade'"
              type="submit"
              class="btn btn-primary w-full"
          >
            Зарегистрироваться
          </button>
        </form>

        <p class="text-center text-sm mt-4">
          Уже есть аккаунт?
          <router-link to="/login" class="link link-primary">Войти</router-link>
        </p>
      </div>
    </div>
  </div>
</template>