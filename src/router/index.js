// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

// Страницы общего назначения
import Register from '@/pages/Register.vue'
import Login from '@/pages/LoginView.vue'

// Страницы учителя
import TeacherSelectGrade from '@/pages/teacher/SelectGrade.vue'
import TeacherClassView from '@/pages/teacher/TeacherClassView.vue'

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
    path: '/teacher/class/:grade',
    component: TeacherClassView,
    meta: { requiresAuth: true, requiresRole: 'teacher' }
  },

  // Ученик
  {
    path: '/student/tasks',
    component: StudentTasks,
    meta: { requiresAuth: true, requiresRole: 'student' }
  },

  // Редирект по умолчанию — в зависимости от роли
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

// Глобальный навигационный гард
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('access_token')
  const userRole = localStorage.getItem('user_role')

  if (to.meta.requiresAuth) {
    if (!token) {
      next('/login')
    } else if (to.meta.requiresRole) {
      if (userRole === to.meta.requiresRole) {
        next()
      } else {
        // Если роль не совпадает — перенаправляем на подходящую главную
        if (userRole === 'teacher') {
          next('/teacher/select-grade')
        } else if (userRole === 'student') {
          next('/student/tasks')
        } else {
          next('/login')
        }
      }
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router