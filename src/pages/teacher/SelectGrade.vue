<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const selectedGrade = ref(null)
const error = ref('')
const router = useRouter()

const handleSelectGrade = () => {
  if (!selectedGrade.value) {
    error.value = 'Пожалуйста, выберите класс'
    return
  }
  // Перенаправляем на страницу управления выбранным классом
  router.push(`/teacher/class/${selectedGrade.value}`)
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-100 p-4">
    <div class="w-full max-w-md card bg-base-200 shadow-xl">
      <div class="card-body">
        <h1 class="text-2xl font-bold text-center text-base-content">
          Выберите класс для работы
        </h1>

        <div class="space-y-4 mt-6">
          <div
              v-for="grade in [7, 8, 9, 10, 11]"
              :key="grade"
              class="flex items-center justify-between p-4 rounded-lg cursor-pointer border border-base-300 hover:bg-base-300 transition"
              :class="{ 'bg-primary text-primary-content': selectedGrade === grade }"
              @click="selectedGrade = grade"
          >
            <span class="text-lg font-medium">{{ grade }} класс</span>
            <div
                v-if="selectedGrade === grade"
                class="w-5 h-5 rounded-full bg-white flex items-center justify-center"
            >
              <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 text-primary"
                  viewBox="0 0 20 20"
                  fill="currentColor"
              >
                <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        <p v-if="error" class="text-error text-sm text-center mt-2">{{ error }}</p>

        <button
            @click="handleSelectGrade"
            class="btn btn-primary w-full mt-6"
            :disabled="!selectedGrade"
        >
          Продолжить
        </button>
      </div>
    </div>
  </div>
</template>