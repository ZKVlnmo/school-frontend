// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

// Страницы общего назначения
import Register from '@/pages/Register.vue'
import Login from '@/pages/LoginView.vue'
import AccountNotVerified from '@/pages/auth/AccountNotVerified.vue'

// Страницы администратора
import AdminTeachers from '@/pages/admin/AdminTeachers.vue'
import GenerateStudents from '@/pages/admin/GenerateStudents.vue' // ← ДОБАВЛЕНО

// Страницы учителя
import TeacherSelectGrade from '@/pages/teacher/SelectGrade.vue'
import TeacherTasks from '@/pages/teacher/TeacherTasks.vue'
import TeacherAttendance from '@/pages/teacher/TeacherAttendance.vue'
import TeacherGradesTable from '@/pages/teacher/GradesTable.vue'
import StudentProfile from '@/pages/teacher/StudentProfile.vue'

// Страницы ученика
import StudentTasks from '@//pages/student/StudentTasks.vue'

const routes = [
  { path: '/register', component: Register },
  { path: '/login', component: Login },
  { path: '/account-not-verified', component: AccountNotVerified },

  // Администратор
  {
    path: '/admin/teachers',
    component: AdminTeachers,
    meta: { requiresAuth: true, requiresRole: 'admin' }
  },
  {
    path: '/admin/generate-students',
    component: GenerateStudents,
    meta: { requiresAuth: true, requiresRole: 'admin' }
  },

  // Учитель
  {
    path: '/teacher/select-grade',
    component: TeacherSelectGrade,
    meta: { requiresAuth: true, requiresRole: 'teacher' }
  },
  {
    path: '/teacher/tasks',
    redirect: '/teacher/select-grade'
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
  {
    path: '/student/grades',
    redirect: (to) => {
      const grade = localStorage.getItem('user_grade')
      const id = localStorage.getItem('user_id')
      if (grade && id) {
        return `/teacher/class/${encodeURIComponent(grade)}/student/${id}`
      }
      return '/student/tasks'
    }
  },

  // Редирект по умолчанию
  {
    path: '/',
    redirect: (to) => {
      const role = localStorage.getItem('user_role')
      if (role === 'admin') {
        return '/admin/teachers'
      } else if (role === 'teacher') {
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
  const userIsVerified = localStorage.getItem('user_is_verified') === 'true'

  if (to.meta.requiresAuth) {
    if (!token) {
      next('/login')
    } else if (to.meta.requiresRole) {
      // Маршрут требует конкретной роли
      if (userRole === to.meta.requiresRole) {
        // ✅ Подтверждение требуется ТОЛЬКО для учителей
        if (userRole === 'teacher' && !userIsVerified) {
          next('/account-not-verified')
        } else {
          next()
        }
      } else {
        // Принудительная проверка роли через /me
        fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
              if (res.ok) return res.json()
              throw new Error('invalid token')
            })
            .then(user => {
              localStorage.setItem('user_role', user.role)
              localStorage.setItem('user_id', user.id.toString())
              localStorage.setItem('user_grade', user.grade || '')
              localStorage.setItem('user_is_verified', user.is_verified.toString())

              // ✅ Подтверждение только для учителей
              if (user.role === 'teacher' && !user.is_verified) {
                next('/account-not-verified')
              } else if (user.role === 'admin') {
                next('/admin/teachers')
              } else if (user.role === 'teacher') {
                next('/teacher/select-grade')
              } else if (user.role === 'student') {
                next('/student/tasks')
              } else {
                next('/login')
              }
            })
            .catch(() => {
              localStorage.removeItem('access_token')
              next('/login')
            })
      }
    } else {
      // Маршрут требует авторизации, но НЕ требует роли (например, StudentProfile)
      // ✅ Ученики и админы могут заходить; учителя — только если подтверждены
      if (userRole === 'teacher' && !userIsVerified) {
        next('/account-not-verified')
      } else {
        next()
      }
    }
  } else {
    next()
  }
})

export default router