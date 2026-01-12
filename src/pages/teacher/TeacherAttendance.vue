<!-- src/pages/teacher/TeacherAttendance.vue -->
<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const route = useRoute()
const router = useRouter()
const grade = route.params.grade

// ✅ Универсальный fetch с обработкой 401
const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('access_token')
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    localStorage.clear()
    router.push('/login')
    throw new Error('Unauthorized')
  }

  return response
}

const students = ref([])
const attendanceRecords = ref([])
const daysInQuarter = ref([])
const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

// Учебный год 2025–2026
const QUARTER_RANGES = {
  1: { start: '2025-09-01', end: '2025-10-31' },
  2: { start: '2025-11-10', end: '2025-12-25' },
  3: { start: '2026-01-12', end: '2026-03-28' },
  4: { start: '2026-04-06', end: '2026-05-26' }
}

const quarterNames = {
  1: '1 четверть',
  2: '2 четверть',
  3: '3 четверть',
  4: '4 четверть'
}

const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function determineCurrentQuarter() {
  const now = new Date()
  for (let q = 1; q <= 4; q++) {
    const start = new Date(QUARTER_RANGES[q].start)
    const end = new Date(QUARTER_RANGES[q].end)
    if (now >= start && now <= end) {
      return q
    }
  }
  return 4
}

const activeQuarter = ref(determineCurrentQuarter())

function generateSchoolDays(quarter) {
  const { start, end } = QUARTER_RANGES[quarter] || QUARTER_RANGES[1]
  const startDate = new Date(start)
  const endDate = new Date(end)
  const days = []
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek !== 0) { // не воскресенье
      days.push(new Date(currentDate))
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  return days.map(d => d.toISOString().split('T')[0])
}

const loadStudents = async () => {
  try {
    const res = await apiFetch(`${API_BASE_URL}/students/${grade}`)
    if (res.ok) students.value = await res.json()
  } catch (e) {
    if (e.message !== 'Unauthorized') {
      console.error('Ошибка загрузки учеников:', e)
    }
  }
}

const loadAttendance = async () => {
  try {
    const res = await apiFetch(`${API_BASE_URL}/attendance/${grade}/quarter/${activeQuarter.value}`)
    if (res.ok) attendanceRecords.value = await res.json()
  } catch (e) {
    if (e.message !== 'Unauthorized') {
      console.error('Ошибка загрузки посещаемости:', e)
    }
  }
}

const getStatus = (studentId, date) => {
  const record = attendanceRecords.value.find(r => r.student_id === studentId && r.date === date)
  return record ? record.status : null
}

const getNextStatus = (current) => {
  const cycle = [null, 'absent_excused', 'absent_unexcused', 'late', 'present']
  const idx = cycle.indexOf(current)
  return cycle[(idx + 1) % cycle.length]
}

const getCellClass = (status) => {
  const classes = {
    'present': 'bg-green-200',
    'late': 'bg-yellow-200',
    'absent_excused': 'bg-blue-200',
    'absent_unexcused': 'bg-red-200'
  }
  return classes[status] || 'bg-gray-100'
}

const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

const toggleStatus = async (studentId, date) => {
  const current = getStatus(studentId, date)
  const nextStatus = getNextStatus(current)
  const payload = {
    student_id: studentId,
    date: date,
    quarter: activeQuarter.value,
    grade: grade,
    status: nextStatus
  }
  try {
    const res = await apiFetch(`${API_BASE_URL}/attendance/${grade}/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (res.ok) {
      const updated = await res.json()
      const idx = attendanceRecords.value.findIndex(r => r.student_id === studentId && r.date === date)
      if (idx !== -1) {
        attendanceRecords.value[idx] = updated
      } else {
        attendanceRecords.value.push(updated)
      }
    }
  } catch (e) {
    if (e.message !== 'Unauthorized') {
      console.error('Ошибка сохранения:', e)
    }
  }
}

const markAllPresentOnDate = async (targetDate) => {
  const updates = []

  for (const student of students.value) {
    const currentStatus = getStatus(student.id, targetDate)
    if (currentStatus === null) {
      updates.push({
        student_id: student.id,
        date: targetDate,
        quarter: activeQuarter.value,
        grade: grade,
        status: 'present'
      })
    }
  }

  if (updates.length === 0) return

  try {
    await Promise.all(
        updates.map(payload =>
            apiFetch(`${API_BASE_URL}/attendance/${grade}/record`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
        )
    )
    for (const update of updates) {
      attendanceRecords.value.push(update)
    }
  } catch (e) {
    if (e.message !== 'Unauthorized') {
      console.error('Ошибка массовой отметки:', e)
    }
  }
}

// === Аналитика (только до сегодня) ===
const daysUpToToday = computed(() => {
  return daysInQuarter.value.filter(day => day <= today)
})

const studentStats = computed(() => {
  return students.value.map(student => {
    let present = 0, late = 0, absentExcused = 0, absentUnexcused = 0
    daysUpToToday.value.forEach(day => {
      const status = getStatus(student.id, day)
      if (status === 'present') present++
      else if (status === 'late') late++
      else if (status === 'absent_excused') absentExcused++
      else if (status === 'absent_unexcused') absentUnexcused++
    })
    const total = daysUpToToday.value.length
    const rate = total ? Math.round((present + late) / total * 100) : 0
    const hasRisk = rate < 80 || absentUnexcused >= 3
    return {
      id: student.id,
      name: student.full_name,
      rate,
      present,
      late,
      absentExcused,
      absentUnexcused,
      hasRisk
    }
  })
})

// === Данные для графика ===
const dailyPresence = computed(() => {
  return daysUpToToday.value.map(day => {
    let presentCount = 0
    students.value.forEach(student => {
      const status = getStatus(student.id, day)
      if (status === 'present' || status === 'late') presentCount++
    })
    return {
      date: day,
      present: presentCount,
      total: students.value.length
    }
  })
})

// === Средние пропуски по дням недели ===
const weeklyAbsenceAvg = computed(() => {
  const dayGroups = Array(7).fill().map(() => ({ totalAbsences: 0, count: 0 }))

  daysUpToToday.value.forEach(day => {
    const dayOfWeek = new Date(day).getDay()
    let absentCount = 0
    students.value.forEach(student => {
      const status = getStatus(student.id, day)
      if (status === 'absent_excused' || status === 'absent_unexcused') {
        absentCount++
      }
    })
    dayGroups[dayOfWeek].totalAbsences += absentCount
    dayGroups[dayOfWeek].count++
  })

  return dayGroups.map((group, index) => {
    const avg = group.count ? (group.totalAbsences / group.count).toFixed(1) : 0
    return {
      dayIndex: index,
      dayName: dayNames[index],
      avgAbsences: parseFloat(avg)
    }
  }).filter(item => item.dayIndex !== 0) // исключаем воскресенье
})

// === График Chart.js ===
const attendanceChart = ref(null)
let chartInstance = null

const initAttendanceChart = () => {
  if (!attendanceChart.value || !dailyPresence.value.length) return

  const ctx = attendanceChart.value.getContext('2d')
  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dailyPresence.value.map(item => formatDate(item.date)),
      datasets: [{
        label: 'Присутствующие',
        data: dailyPresence.value.map(item => item.present),
        backgroundColor: '#10b981',
        borderColor: '#059669',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const item = dailyPresence.value[context.dataIndex]
              return `Присутствовали: ${item.present} из ${item.total}`
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { ticks: { maxRotation: 45, minRotation: 45 } }
      }
    }
  })
}

// === Прокрутка ===
const scrollToToday = () => {
  if (!daysInQuarter.value.includes(today)) return
  nextTick(() => {
    const cell = document.querySelector(`[data-date="${today}"]`)
    if (cell) {
      cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      cell.classList.add('ring-2', 'ring-blue-500')
    }
  })
}

// === Watch и onMounted ===
watch(activeQuarter, (newQuarter) => {
  daysInQuarter.value = generateSchoolDays(newQuarter)
  loadAttendance().finally(scrollToToday)
})

watch(() => dailyPresence.value, initAttendanceChart)

onMounted(() => {
  daysInQuarter.value = generateSchoolDays(activeQuarter.value)
  loadStudents()
  loadAttendance().finally(scrollToToday)
})
</script>

<template>
  <div class="p-4 max-w-7xl mx-auto">
    <!-- Заголовок -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Посещаемость: {{ grade }}</h1>
    </div>

    <!-- Переключение четвертей -->
    <div class="flex space-x-2 mt-3 overflow-x-auto pb-1">
      <button
          v-for="q in [1, 2, 3, 4]"
          :key="q"
          @click="activeQuarter = q"
          class="px-4 py-2 rounded-lg font-medium whitespace-nowrap"
          :class="{
          'bg-blue-600 text-white': activeQuarter === q,
          'bg-gray-200 text-gray-700 hover:bg-gray-300': activeQuarter !== q
        }"
      >
        {{ quarterNames[q] }}
      </button>
    </div>

    <!-- Основная таблица -->
    <div class="overflow-x-auto rounded-lg border border-gray-200 mt-4">
      <table class="min-w-full bg-white">
        <thead>
        <tr class="bg-gray-50 text-left">
          <!-- Закреплённый заголовок -->
          <th class="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-gray-50 z-10">Ученик</th>
          <th
              v-for="day in daysInQuarter"
              :key="day"
              class="py-2 px-2 text-center text-sm font-medium text-gray-600 border-l border-gray-100"
              :class="{ 'bg-blue-50': day === today }"
          >
            <div class="flex flex-col items-center">
              <span>{{ formatDate(day) }}</span>
              <span v-if="day === today" class="text-xs text-blue-600">(сегодня)</span>
              <button
                  @click="markAllPresentOnDate(day)"
                  class="mt-1 text-xs text-green-600 hover:text-green-800 underline"
              >
                Отметить всех
              </button>
            </div>
          </th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="student in students" :key="student.id" class="border-t border-gray-100">
          <!-- Закреплённая ячейка с именем -->
          <td class="py-3 px-4 font-medium text-gray-800 sticky left-0 bg-white z-10">
            {{ student.full_name }}
          </td>
          <td
              v-for="day in daysInQuarter"
              :key="`${student.id}-${day}`"
              @click="toggleStatus(student.id, day)"
              class="py-2 px-3 text-center border-l border-gray-100 cursor-pointer transition-colors"
              :class="[
                getCellClass(getStatus(student.id, day)),
                { 'ring-2 ring-blue-500': day === today }
              ]"
              :data-date="day"
          >
            <div class="w-6 h-6 rounded-sm mx-auto"></div>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- Легенда -->
    <div class="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 class="font-medium text-gray-800 mb-2">Легенда:</h3>
      <div class="flex flex-wrap gap-4 text-sm">
        <div class="flex items-center">
          <div class="w-4 h-4 bg-green-200 rounded-sm mr-2"></div>
          <span>Присутствовал</span>
        </div>
        <div class="flex items-center">
          <div class="w-4 h-4 bg-red-200 rounded-sm mr-2"></div>
          <span>Прогул</span>
        </div>
        <div class="flex items-center">
          <div class="w-4 h-4 bg-blue-200 rounded-sm mr-2"></div>
          <span>Болезнь</span>
        </div>
        <div class="flex items-center">
          <div class="w-4 h-4 bg-yellow-200 rounded-sm mr-2"></div>
          <span>Опоздание</span>
        </div>
        <div class="flex items-center">
          <div class="w-4 h-4 bg-gray-100 rounded-sm mr-2"></div>
          <span>Не отмечено</span>
        </div>
      </div>
    </div>

    <!-- АНАЛИТИКА -->
    <div class="mt-12 space-y-12">
      <!-- Сводная таблица по ученикам -->
      <section>
        <h2 class="text-xl font-semibold text-gray-800 mb-4">📊 Статистика по ученикам (до {{ formatDate(today) }})</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead class="bg-gray-50">
            <tr>
              <th class="py-2 px-4 text-left">Ученик</th>
              <th class="py-2 px-4 text-center">Посещаемость</th>
              <th class="py-2 px-4 text-center">Опоздания</th>
              <th class="py-2 px-4 text-center">Болезни</th>
              <th class="py-2 px-4 text-center">Прогулы</th>
              <th class="py-2 px-4 text-center">Риск</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="stat in studentStats" :key="stat.id" :class="{ 'bg-red-50': stat.hasRisk }">
              <td class="py-2 px-4">{{ stat.name }}</td>
              <td class="py-2 px-4 text-center font-medium">{{ stat.rate }}%</td>
              <td class="py-2 px-4 text-center">{{ stat.late }}</td>
              <td class="py-2 px-4 text-center">{{ stat.absentExcused }}</td>
              <td class="py-2 px-4 text-center">{{ stat.absentUnexcused }}</td>
              <td class="py-2 px-4 text-center">
                <span v-if="stat.hasRisk" class="text-red-600 font-bold">⚠️</span>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- График: Присутствие по дням -->
      <section>
        <h2 class="text-xl font-semibold text-gray-800 mb-4">📈 Присутствие по дням (до {{ formatDate(today) }})</h2>
        <div v-if="dailyPresence.length === 0" class="bg-white p-4 rounded-lg border border-gray-200 text-center text-gray-500">
          Нет данных для отображения
        </div>
        <div v-else class="bg-white p-4 rounded-lg border border-gray-200 h-64">
          <canvas ref="attendanceChart"></canvas>
        </div>
      </section>

      <!-- Средние пропуски по дням недели -->
      <section>
        <h2 class="text-xl font-semibold text-gray-800 mb-4">📆 Среднее число пропусков по дням недели</h2>
        <div class="bg-white p-4 rounded-lg border border-gray-200">
          <div class="grid grid-cols-6 gap-4 text-center">
            <div v-for="item in weeklyAbsenceAvg" :key="item.dayIndex">
              <div class="font-medium">{{ item.dayName }}</div>
              <div class="text-2xl font-bold text-red-600 mt-1">{{ item.avgAbsences }}</div>
              <div class="text-xs text-gray-500">пропусков</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Обеспечиваем корректное наложение sticky-ячеек */
th.sticky,
td.sticky {
  position: sticky;
  left: 0;
}
</style>