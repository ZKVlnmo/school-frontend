<!-- src/pages/teacher/SelectGrade.vue -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const selectedGrade = ref(null)
const error = ref('')
const router = useRouter()

// Все классы: 5–11, включая 5-1..6-4 и профильные 7–11
const profiles = [
  { name: "5 класс", suffix: "5", years: [1, 2, 3] },
  { name: "6 класс", suffix: "6", years: [1, 2, 3, 4] },
  { name: "Биологическое", suffix: "БИО", years: [7, 8, 9, 10, 11] },
  { name: "Лингвистическое", suffix: "ЛИН", years: [7, 8, 9, 10, 11] },
  { name: "Математическое", suffix: "МАТ", years: [7, 8, 9, 10, 11] },
  { name: "Информационные технологии", suffix: "ИТ", years: [7, 8, 9, 10, 11] },
  { name: "Инженерное", suffix: "ИНЖ", years: [7, 8, 9, 10, 11] }
]

// Иконки для профилей
const getIcon = (suffix) => {
  const icons = {
    "5": "🧒",
    "6": "🧒",
    "БИО": "🧬",
    "ЛИН": "🗣️",
    "МАТ": "🧮",
    "ИТ": "💻",
    "ИНЖ": "⚙️"
  }
  return icons[suffix] || "📚"
}

const handleNavigate = (page) => {
  if (!selectedGrade.value) {
    error.value = 'Сначала выберите класс'
    return
  }
  if (page === 'tasks') {
    router.push(`/teacher/class/${selectedGrade.value}/tasks`)
  } else if (page === 'attendance') {
    router.push(`/teacher/class/${selectedGrade.value}/attendance`)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Выбор класса</h1>
        <p class="text-gray-600 mt-2">Выберите класс для работы с заданиями или посещаемостью</p>
      </div>

      <div class="bg-white rounded-xl shadow-md p-5 border border-gray-200">
        <div class="space-y-5">
          <div v-for="profile in profiles" :key="profile.suffix">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-lg">{{ getIcon(profile.suffix) }}</span>
              <h2 class="text-lg font-medium text-gray-800">{{ profile.name }}</h2>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                  v-for="num in profile.years"
                  :key="`${num}-${profile.suffix}`"
                  @click="selectedGrade = profile.suffix === '5' || profile.suffix === '6'
                          ? `${profile.suffix}-${num}`
                          : `${num}-${profile.suffix}`"
                  class="px-4 py-2.5 rounded-lg border font-medium transition-all duration-200 text-sm min-w-[70px]"
                  :class="{
                  'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105':
                    selectedGrade === (profile.suffix === '5' || profile.suffix === '6'
                      ? `${profile.suffix}-${num}`
                      : `${num}-${profile.suffix}`),
                  'border-gray-300 hover:bg-gray-100 text-gray-700':
                    selectedGrade !== (profile.suffix === '5' || profile.suffix === '6'
                      ? `${profile.suffix}-${num}`
                      : `${num}-${profile.suffix}`)
                }"
              >
                {{
                  profile.suffix === '5' || profile.suffix === '6'
                      ? `${profile.suffix}-${num}`
                      : `${num}-${profile.suffix}`
                }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Действия -->
      <div v-if="selectedGrade" class="mt-8 bg-white rounded-xl shadow-md p-5 border border-gray-200">
        <div class="text-center mb-4">
          <p class="text-gray-700">
            Выбран класс: <span class="font-bold text-blue-700">{{ selectedGrade }}</span>
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button
              @click="handleNavigate('tasks')"
              class="btn btn-primary flex items-center justify-center gap-2 px-6 py-3 min-w-[160px]"
          >
            📚 Задания
          </button>
          <button
              @click="handleNavigate('attendance')"
              class="btn btn-secondary flex items-center justify-center gap-2 px-6 py-3 min-w-[160px]"
          >
            📊 Посещаемость
          </button>
        </div>
      </div>

      <p v-if="error" class="text-center mt-4 text-red-500 font-medium">
        {{ error }}
      </p>
    </div>
  </div>
</template>

<style scoped>
button {
  user-select: none;
}
</style>