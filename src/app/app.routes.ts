import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { LearningPathsPage } from './pages/course-builder/learning-paths/learning-paths';
import { CourseManagerPage } from './pages/course-builder/course-manager/course-manager';
import { LessonEditorPage } from './pages/course-builder/lesson-editor/lesson-editor';

export const routes: Routes = [
  // ── Auth (lazy) ──────────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
    pathMatch: 'full'
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.Register)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/reset-password/reset-password').then(m => m.ResetPassword)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPassword),
  },

  // ── Student pages (lazy) ─────────────────────────────────
  {
    path: 'learning-path/:id',
    loadComponent: () => import('./shared/layouts/employee-layout/employee-layout.component').then(m => m.EmployeeLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/learning-path-details/learning-path-details').then(m => m.LearningPathDetails),
        canActivate: [roleGuard],
        data: { roles: ['EMPLOYEE', 'SUPERADMIN', 'HR', 'MANAGER'] }
      }
    ]
  },
  {
    path: 'course/:id',
    loadComponent: () => import('./shared/layouts/employee-layout/employee-layout.component').then(m => m.EmployeeLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/course-details/course-details').then(m => m.CourseDetails),
        canActivate: [roleGuard],
        data: { roles: ['SUPERADMIN', 'HR', 'MANAGER'] }
      }
    ]
  },
  {
    path: 'lesson/:id',
    loadComponent: () => import('./shared/layouts/employee-layout/employee-layout.component').then(m => m.EmployeeLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/lesson-viewer/lesson-viewer.component').then(m => m.LessonViewerComponent),
        canActivate: [roleGuard],
        data: { roles: ['EMPLOYEE', 'SUPERADMIN', 'HR', 'MANAGER'] }
      }
    ]
  },

  // ── Admin / HR Layout ────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('./shared/layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'learning-paths',
        component: LearningPathsPage
      },
      {
        path: 'learning-paths/:learningPathId',
        component: CourseManagerPage
      },
      {
        path: 'lessons/:lessonId/edit',
        loadComponent: () => import('./pages/course-builder/lesson-editor/lesson-editor').then(m => m.LessonEditorPage)
      },
      {
        path: 'hr/dashboard',
        loadComponent: () => import('./pages/hr-dashboard/hr-dashboard').then(m => m.HrDashboard),
        canActivate: [roleGuard],
        data: { roles: ['SUPERADMIN', 'HR', 'MANAGER'] }
      },
      {
        path: 'hr/create-user',
        loadComponent: () => import('./pages/hr-create-user/hr-create-user').then(m => m.HrCreateUser),
        canActivate: [roleGuard],
        data: { roles: ['SUPERADMIN', 'HR', 'MANAGER'] }
      },
      {
        path: 'hr/assign-path',
        loadComponent: () => import('./pages/hr-assign-path/hr-assign-path').then(m => m.HrAssignPath),
        canActivate: [roleGuard],
        data: { roles: ['SUPERADMIN', 'HR', 'MANAGER'] }
      },
      {
        path: 'hr/assign-course',
        loadComponent: () => import('./pages/hr-assign-course/hr-assign-course').then(m => m.HrAssignCourse),
        canActivate: [roleGuard],
        data: { roles: ['SUPERADMIN', 'HR', 'MANAGER'] }
      },
      {
        path: 'hr/team-progress',
        loadComponent: () => import('./pages/hr-team-progress/hr-team-progress').then(m => m.HrTeamProgress),
        canActivate: [roleGuard],
        data: { roles: ['SUPERADMIN', 'HR', 'MANAGER'] }
      },
      {
        path: 'user-settings',
        loadComponent: () => import('./pages/user-settings/user-settings.component').then(m => m.UserSettingsComponent),
        canActivate: [authGuard, roleGuard],
        data: { roles: ['SUPERADMIN', 'HR', 'MANAGER'] }
      }
    ]
  },

  // ── Employee ─────────────────────────────────────────────
  {
    path: 'employee',
    loadComponent: () => import('./shared/layouts/employee-layout/employee-layout.component').then(m => m.EmployeeLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/employee-dashboard/employee-dashboard').then(m => m.EmployeeDashboard),
        canActivate: [roleGuard],
        data: { roles: ['EMPLOYEE', 'SUPERADMIN', 'HR'] }
      },
      {
        path: 'user-settings',
        loadComponent: () => import('./pages/user-settings/user-settings.component').then(m => m.UserSettingsComponent),
        canActivate: [roleGuard],
        data: { roles: ['EMPLOYEE', 'SUPERADMIN', 'HR'] }
      }
    ]
  },
];
