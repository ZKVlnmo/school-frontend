<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-5xl mx-auto">
      <!-- Заголовок -->
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">Выбор класса</h1>
        <p class="text-gray-600 mt-2 max-w-2xl mx-auto">
          Выберите класс, с которым вы будете работать.
        </p>
      </div>

      <!-- Панель действий (всегда видна) -->
      <div
          class="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-all duration-200"
          :class="{ 'opacity-50 pointer-events-none': !selectedGrade }"
      >
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p class="text-gray-700 font-medium text-center sm:text-left">
            <span v-if="selectedGrade">Выбран класс:</span>
            <span v-else>Выберите класс, чтобы продолжить</span>
            <span v-if="selectedGrade" class="ml-1 font-bold text-blue-700">{{ selectedGrade }}</span>
          </p>
          <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
                @click="handleNavigate('tasks')"
                class="btn btn-primary w-full sm:w-auto"
                :disabled="!selectedGrade"
            >
              Задания
            </button>
            <button
                @click="handleNavigate('attendance')"
                class="btn btn-outline btn-secondary w-full sm:w-auto"
                :disabled="!selectedGrade"
            >
              Посещаемость
            </button>
          </div>
        </div>
      </div>

      <!-- Сетка классов -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
            v-for="profile in profiles"
            :key="profile.suffix"
            class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all duration-150 hover:shadow-md"
        >
          <h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span
                class="w-7 h-7 rounded-md flex items-center justify-center text-sm font-medium"
                :class="getBadgeClass(profile.suffix)"
            >
              {{ getInitial(profile.name) }}
            </span>
            {{ profile.name }}
          </h2>

          <div class="flex flex-wrap gap-2">
            <button
                v-for="num in profile.years"
                :key="`${num}-${profile.suffix}`"
                @click="selectedGrade = formatGrade(profile.suffix, num)"
                class="px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors duration-150 min-w-[64px] text-center"
                :class="{
                'bg-blue-600 text-white border-blue-600 shadow-sm': selectedGrade === formatGrade(profile.suffix, num),
                'border-gray-300 text-gray-700 hover:bg-gray-50': selectedGrade !== formatGrade(profile.suffix, num)
              }"
            >
              {{ formatGrade(profile.suffix, num) }}
            </button>
          </div>
        </div>
      </div>

      <!-- Ошибка -->
      <p v-if="error" class="text-center mt-6 text-red-600 font-medium">
        {{ error }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const selectedGrade = ref(null)
const error = ref('')
const router = useRouter()

const profiles = [
  { name: "5 класс", suffix: "5", years: [1, 2, 3] },
  { name: "6 класс", suffix: "6", years: [1, 2, 3, 4] },
  { name: "Биологическое", suffix: "БИО", years: [7, 8, 9, 10, 11] },
  { name: "Лингвистическое", suffix: "ЛИН", years: [7, 8, 9, 10, 11] },
  { name: "Математическое", suffix: "МАТ", years: [7, 8, 9, 10, 11] },
  { name: "Информационные технологии", suffix: "ИТ", years: [7, 8, 9, 10, 11] },
  { name: "Инженерное", suffix: "ИНЖ", years: [7, 8, 9, 10, 11] }
]

const getInitial = (name) => name.charAt(0).toUpperCase()

const formatGrade = (suffix, num) => {
  return suffix === '5' || suffix === '6' ? `${suffix}-${num}` : `${num}-${suffix}`
}

const getBadgeClass = (suffix) => {
  const colors = {
    '5': 'bg-blue-100 text-blue-800',
    '6': 'bg-indigo-100 text-indigo-800',
    'БИО': 'bg-emerald-100 text-emerald-800',
    'ЛИН': 'bg-amber-100 text-amber-800',
    'МАТ': 'bg-rose-100 text-rose-800',
    'ИТ': 'bg-cyan-100 text-cyan-800',
    'ИНЖ': 'bg-violet-100 text-violet-800'
  }
  return colors[suffix] || 'bg-gray-100 text-gray-800'
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