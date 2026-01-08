<!-- src/pages/auth/AccountNotVerified.vue -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="w-full max-w-md bg-white rounded-xl shadow-md p-8 text-center">
      <div class="text-6xl mb-6">⚠️</div>
      <h1 class="text-2xl font-bold text-red-600 mb-4">Аккаунт не подтверждён</h1>
      <p class="text-gray-700 mb-6">
        Ваш аккаунт ожидает подтверждения администратором.
        Пожалуйста, свяжитесь с администрацией школы.
      </p>
      <button
          @click="logout"
          class="btn btn-outline btn-error"
      >
        Выйти
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const logout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('user_id')
  localStorage.removeItem('user_grade')
  localStorage.removeItem('user_role')
  localStorage.removeItem('user_name')
  router.push('/login')
}
</script>