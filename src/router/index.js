// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

// Страницы общего назначения
import Register from '@/pages/Register.vue'
import Login from '@/pages/LoginView.vue'

// Страницы учителя
import TeacherSelectGrade from '@/pages/teacher/SelectGrade.vue'
import TeacherTasks from '@/pages/teacher/TeacherTasks.vue'
import TeacherAttendance from '@/pages/teacher/TeacherAttendance.vue'
import TeacherGradesTable from '@/pages/teacher/GradesTable.vue'
import StudentProfile from '@/pages/teacher/StudentProfile.vue' // ← профиль ученика

// Страницы ученика
import StudentTasks from '@/pages/student/StudentTasks.vue'

const routes = [
  { path: '/register', component: Register },
  { path: '/login', component: Login },

  // Учитель
  {
    path: '/teacher/select-grade',
    component: TeacherSelectGrade,
    meta: { requiresAuth: true, requiresRole: 'teacher' }
  },
  {
    path: '/teacher/class/:grade/tasks',
    component: TeacherTasks,
    meta: { requiresAuth: true, requiresRole: 'teacher' }
  },
  {
    path: '/teacher/class/:grade/attendance',
    component: TeacherAttendance,
    meta: { requiresAuth: true, requiresRole: 'teacher' }
  },
  {
    path: '/teacher/class/:grade/grades',
    component: TeacherGradesTable,
    meta: { requiresAuth: true, requiresRole: 'teacher' }
  },
  {
    path: '/teacher/class/:grade/student/:studentId',
    component: StudentProfile,
    meta: { requiresAuth: true }
  },

  // Ученик
  {
    path: '/student/tasks',
    component: StudentTasks,
    meta: { requiresAuth: true, requiresRole: 'student' }
  },

  // Редирект по умолчанию
  {
    path: '/',
    redirect: (to) => {
      const role = localStorage.getItem('user_role')
      if (role === 'teacher') {
        return '/teacher/select-grade'
      } else if (role === 'student') {
        return '/student/tasks'
      } else {
        return '/login'
      }
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Гард авторизации
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('access_token')
  const userRole = localStorage.getItem('user_role')
  const userId = localStorage.getItem('user_id')

  if (to.meta.requiresAuth) {
    if (!token) {
      next('/login')
    } else if (to.meta.requiresRole) {
      // Старая логика: строгая роль (для других страниц)
      if (userRole === to.meta.requiresRole) {
        next()
      } else {
        // Редирект по роли
        if (userRole === 'teacher') {
          next('/teacher/select-grade')
        } else if (userRole === 'student') {
          next('/student/tasks')
        } else {
          next('/login')
        }
      }
    } else if (
        to.path.startsWith('/teacher/class/') &&
        to.path.includes('/student/')
    ) {
      // Особая логика для StudentProfile
      const studentIdFromRoute = to.params.studentId

      if (userRole === 'teacher') {
        // Учитель может смотреть любого ученика
        next()
      } else if (userRole === 'student') {
        // Ученик может смотреть ТОЛЬКО СЕБЯ
        if (String(userId) === String(studentIdFromRoute)) {
          next()
        } else {
          // Пытается посмотреть чужой профиль → запрет
          next('/student/tasks')
        }
      } else {
        next('/login')
      }
    } else {
      // Остальные защищённые маршруты без requiresRole — разрешаем
      next()
    }
  } else {
    next()
  }
})

export default router