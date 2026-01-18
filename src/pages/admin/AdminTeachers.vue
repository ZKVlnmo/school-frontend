<!-- src/pages/admin/AdminTeachers.vue -->
<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-4xl mx-auto">
      <!-- Верхняя панель -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Управление учителями</h1>
        <div class="flex flex-wrap gap-2">
          <button
              @click="showGenerateForm = !showGenerateForm"
              class="btn btn-primary btn-sm"
          >
            {{ showGenerateForm ? 'Скрыть форму' : 'Создать учеников' }}
          </button>
          <button
              v-if="!loading && teachers.length === 0"
              @click="loadTeachers"
              class="btn btn-outline btn-sm"
          >
            Загрузить учителей
          </button>
        </div>
      </div>

      <!-- Форма генерации учеников (оставлена для совместимости) -->
      <div v-if="showGenerateForm" class="mb-6 card bg-white rounded-lg shadow-md p-4">
        <h2 class="font-bold text-lg mb-3">Создать учётные записи для класса</h2>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Название класса (например, "7-ИТ", "10А")</span>
          </label>
          <input
              v-model="gradeInput"
              type="text"
              placeholder="7-ИТ"
              class="input input-bordered w-full"
              :disabled="generating"
          />
        </div>
        <button
            @click="generateStudents"
            :disabled="!gradeInput.trim() || generating"
            class="btn btn-primary mt-3 w-full sm:w-auto"
        >
          {{ generating ? 'Генерация...' : 'Создать учётные записи' }}
        </button>

        <div v-if="generatedStudents.length" class="mt-4 overflow-x-auto">
          <h3 class="font-bold text-md mb-2">Созданные учётные записи</h3>
          <table class="table table-zebra w-full text-sm">
            <thead>
            <tr>
              <th>ФИО</th>
              <th>Email</th>
              <th>Пароль</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(s, i) in generatedStudents" :key="i">
              <td>{{ s.full_name }}</td>
              <td class="font-mono">{{ s.email }}</td>
              <td class="font-mono">{{ s.password }}</td>
            </tr>
            </tbody>
          </table>
          <button @click="copyToClipboard" class="btn btn-sm btn-outline mt-2">
            Копировать всё
          </button>
        </div>
      </div>

      <!-- Список учителей -->
      <div v-if="loading" class="text-center py-8">
        <span class="loading loading-spinner"></span>
      </div>

      <div v-else-if="teachers.length > 0" class="bg-white rounded-lg shadow-md overflow-hidden">
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
      </div>

      <div v-else-if="!loading" class="text-center py-8 text-gray-500">
        Нажмите «Загрузить учителей», чтобы отобразить список.
      </div>

      <!-- Выбор учителя для анализа оценок -->
      <div class="mt-8 flex flex-wrap items-end gap-3">
        <div>
          <label class="label">
            <span class="label-text font-medium">Выберите учителя:</span>
          </label>
          <select
              v-model="selectedTeacherId"
              class="select select-bordered w-full min-w-[240px]"
          >
            <option value="">— Все учителя —</option>
            <option value="1">Здех Кирилл Вячеславович</option>
            <option value="2">Васильева Анна Витальевна</option>
          </select>
        </div>
        <button
            @click="onTeacherSelected"
            class="btn btn-outline"
            :disabled="!selectedTeacherId && coursesWithGrades.length > 0"
        >
          Применить
        </button>
      </div>

      <!-- Активность по курсам -->
      <div v-if="loadingGrades" class="mt-6 text-center py-4">
        <span class="loading loading-spinner"></span>
      </div>

      <div v-else-if="filteredAndSortedCourses.length > 0" class="mt-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Активность по курсам</h2>
        <div class="bg-white rounded-lg shadow-md overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-100">
            <tr>
              <th class="py-3 px-4 text-left">Предмет</th>
              <th class="py-3 px-4 text-left">Класс</th>
              <th class="py-3 px-4 text-left">Последняя оценка</th>
              <th class="py-3 px-4 text-center">Дней без оценок</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
            <tr v-for="(course, i) in filteredAndSortedCourses" :key="i">
              <td class="py-3 px-4">{{ course.course_title }}</td>
              <td class="py-3 px-4">{{ course.class_name || '—' }}</td>
              <td class="py-3 px-4">
                {{
                  new Date(course.last_grade_date).toLocaleDateString('ru-RU')
                }}
              </td>
              <td class="py-3 px-4 text-center">
                  <span
                      :class="{
                      'text-green-600 font-medium': course.days_since_last_grade <= 3,
                      'text-yellow-600 font-medium': course.days_since_last_grade > 3 && course.days_since_last_grade <= 7,
                      'text-red-600 font-medium': course.days_since_last_grade > 7
                    }"
                  >
                    {{ course.days_since_last_grade }} дн.
                  </span>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="!loadingGrades && coursesWithGrades.length === 0" class="mt-6 text-center text-gray-500">
        Нет данных по курсам.
      </div>

      <!-- 🔻 УПРАВЛЕНИЕ РЕАЛЬНЫМИ УЧЕНИКАМИ -->
      <div class="mt-10">
        <button
            @click="showStudentManager = !showStudentManager"
            class="btn btn-secondary"
        >
          {{ showStudentManager ? 'Скрыть управление учениками' : 'Управление учениками' }}
        </button>

        <div v-if="showStudentManager" class="mt-6 bg-white rounded-lg shadow-md p-4">
          <h2 class="text-xl font-bold text-gray-800 mb-4">Редактирование учеников</h2>

          <!-- Выбор класса -->
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">Выберите класс для редактирования:</span>
            </label>
            <select
                v-model="selectedGradeForEdit"
                @change="loadStudentsByGrade"
                class="select select-bordered w-full max-w-xs"
            >
              <option value="">— Выберите класс —</option>
              <option v-for="cls in knownGrades" :key="cls" :value="cls">{{ cls }}</option>
            </select>
          </div>

          <!-- Список учеников -->
          <div v-if="editingStudents.length > 0" class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
              <tr>
                <th>ФИО</th>
                <th>Класс</th>
                <th>Пароль</th>
                <th>Действия</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="student in editingStudents" :key="student.id">
                <td>
                  <input
                      v-model="student.full_name"
                      type="text"
                      class="input input-sm input-bordered w-full"
                      placeholder="ФИО"
                  />
                </td>
                <td>
                  <select
                      v-model="student.grade"
                      class="select select-sm select-bordered w-full"
                  >
                    <option v-for="cls in knownGrades" :key="cls" :value="cls">{{ cls }}</option>
                  </select>
                </td>
                <td>
                  <input
                      v-model="student.password"
                      type="text"
                      class="input input-sm input-bordered w-full"
                      placeholder="Новый пароль (опц.)"
                  />
                </td>
                <td class="flex gap-1">
                  <button
                      @click="saveStudent(student)"
                      :disabled="savingStudent === student.id"
                      class="btn btn-xs btn-primary"
                  >
                    {{ savingStudent === student.id ? '...' : 'Сохранить' }}
                  </button>
                  <button
                      @click="deleteStudent(student.id)"
                      :disabled="deletingStudent === student.id"
                      class="btn btn-xs btn-error"
                  >
                    {{ deletingStudent === student.id ? '...' : 'Удалить' }}
                  </button>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <div v-else-if="selectedGradeForEdit && !loadingStudents" class="text-center py-4 text-gray-500">
            В этом классе нет учеников.
          </div>

          <div v-if="loadingStudents" class="text-center py-4">
            <span class="loading loading-spinner"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// === Учителя ===
const teachers = ref([])
const loading = ref(false)
const approving = ref(new Set())
const router = useRouter()

// === Генерация учеников (оставлена) ===
const showGenerateForm = ref(false)
const gradeInput = ref('')
const generating = ref(false)
const generatedStudents = ref([])

// === Анализ курсов ===
const coursesWithGrades = ref([])
const loadingGrades = ref(false)
const selectedTeacherId = ref('')

const filteredAndSortedCourses = computed(() => {
  return coursesWithGrades.value
      .filter(course => course.last_grade_date !== null)
      .sort((a, b) => b.days_since_last_grade - a.days_since_last_grade)
})

// === 🔻 Управление учениками ===
const showStudentManager = ref(false)
const selectedGradeForEdit = ref('')
const editingStudents = ref([])
const loadingStudents = ref(false)
const savingStudent = ref(null)
const deletingStudent = ref(null)

// 🔥 Полный список классов, включая РОНТЕД
const knownGrades = ref([
  // Академические
  '5-1', '5-2', '5-3',
  '6-1', '6-2', '6-3', '6-4',
  // Профильные
  '7-БИО', '8-БИО', '9-БИО', '10-БИО', '11-БИО',
  '7-ЛИН', '8-ЛИН', '9-ЛИН', '10-ЛИН', '11-ЛИН',
  '7-МАТ', '8-МАТ', '9-МАТ', '10-МАТ', '11-МАТ',
  '7-ИТ', '8-ИТ', '9-ИТ', '10-ИТ', '11-ИТ',
  '7-ИНЖ', '8-ИНЖ', '9-ИНЖ', '10-ИНЖ', '11-ИНЖ',
  // 🔥 РОНТЕД — просто цифры
  '5', '6', '7', '8', '9', '10', '11'
])

const getAccessToken = () => localStorage.getItem('access_token')

// Загрузка учеников по классу
const loadStudentsByGrade = async () => {
  const token = getAccessToken()
  if (!token || !selectedGradeForEdit.value) {
    editingStudents.value = []
    return
  }

  loadingStudents.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/admin/students?grade=${encodeURIComponent(selectedGradeForEdit.value)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      const students = await res.json()
      // Добавляем пустое поле password для UI
      editingStudents.value = students.map(s => ({ ...s, password: '' }))
    } else {
      editingStudents.value = []
      alert('Не удалось загрузить учеников')
    }
  } catch (e) {
    console.error(e)
    editingStudents.value = []
    alert('Ошибка сети')
  } finally {
    loadingStudents.value = false
  }
}

// Сохранение изменений ученика
const saveStudent = async (student) => {
  const token = getAccessToken()
  if (!token) return

  savingStudent.value = student.id
  try {
    const payload = {
      full_name: student.full_name.trim(),
      grade: student.grade
    }
    if (student.password?.trim()) {
      payload.password = student.password.trim()
    }

    const res = await fetch(`${API_BASE_URL}/admin/students/${student.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      alert('✅ Ученик обновлён')
      // Очищаем пароль в UI
      student.password = ''
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.detail || 'Ошибка при сохранении')
    }
  } catch (e) {
    console.error(e)
    alert('Ошибка сети')
  } finally {
    savingStudent.value = null
  }
}

// Удаление ученика
const deleteStudent = async (studentId) => {
  if (!confirm('Удалить ученика? Это действие нельзя отменить.')) return

  const token = getAccessToken()
  if (!token) return

  deletingStudent.value = studentId
  try {
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.ok) {
      editingStudents.value = editingStudents.value.filter(s => s.id !== studentId)
      alert('✅ Ученик удалён')
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.detail || 'Ошибка при удалении')
    }
  } catch (e) {
    console.error(e)
    alert('Ошибка сети')
  } finally {
    deletingStudent.value = null
  }
}

// === Остальные функции (без изменений) ===
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
      const updatedTeacher = await res.json()
      const teacher = teachers.value.find(t => t.id === teacherId)
      if (teacher) Object.assign(teacher, updatedTeacher)
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

const generateStudents = async () => {
  const grade = gradeInput.value.trim()
  if (!grade) {
    alert('Укажите название класса')
    return
  }
  generating.value = true
  generatedStudents.value = []
  try {
    const token = getAccessToken()
    if (!token) {
      router.push('/login')
      return
    }
    const res = await fetch(`${API_BASE_URL}/auth/generate-students`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ grade })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.detail || 'Не удалось создать учётные записи')
      return
    }
    const data = await res.json()
    generatedStudents.value = data.students || []
  } catch (e) {
    console.error('Ошибка генерации:', e)
    alert('Ошибка сети или сервера')
  } finally {
    generating.value = false
  }
}

const copyToClipboard = () => {
  if (!generatedStudents.value.length) return
  const text = generatedStudents.value
      .map(s => `${s.full_name}\t${s.email}\t${s.password}`)
      .join('\n')
  navigator.clipboard.writeText(text).then(() => {
    alert('✅ Данные скопированы!')
  }).catch(() => {
    alert('Не удалось скопировать. Попробуйте вручную.')
  })
}

const loadLastGradeInfo = async (teacherId = null) => {
  const token = getAccessToken()
  if (!token) return

  loadingGrades.value = true
  try {
    const url = new URL(`${API_BASE_URL}/admin/courses-with-last-grade`)
    if (teacherId) {
      url.searchParams.set('teacher_id', teacherId)
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.ok) {
      coursesWithGrades.value = await res.json()
    } else {
      console.error('Ошибка загрузки курсов')
      coursesWithGrades.value = []
    }
  } catch (e) {
    console.error('Сетевая ошибка:', e)
    coursesWithGrades.value = []
  } finally {
    loadingGrades.value = false
  }
}

const onTeacherSelected = () => {
  const id = selectedTeacherId.value || null
  loadLastGradeInfo(id)
}

onMounted(() => {
  // loadLastGradeInfo(null)
})
</script>