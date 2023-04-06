// Copyright (C) Lutra Consulting Limited
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-MerginMaps-Commercial

import {
  FileBrowserView,
  FileDetailView,
  FileVersionDetailView,
  ProjectVersionsView,
  VersionDetailView,
  merginUtils
} from '@mergin/lib'
import { RouteConfig } from 'vue-router'
import { Store } from 'vuex'

import AccountsView from '@/modules/admin/views/AccountsView.vue'
import ProfileView from '@/modules/admin/views/ProfileView.vue'
import SettingsView from '@/modules/admin/views/SettingsView.vue'
import ProjectSettingsView from '@/modules/project/views/ProjectSettingsView.vue'
import ProjectsView from '@/modules/project/views/ProjectsView.vue'
import ProjectView from '@/modules/project/views/ProjectView.vue'
import LoginView from '@/modules/user/views/LoginView.vue'

export default (rootStore: Store<any>): RouteConfig[] => [
  {
    beforeEnter: (to, from, next) => {
      if (rootStore.getters['userModule/isSuperUser']) {
        next('/dashboard')
      } else {
        next()
      }
    },
    path: '/login/:reset?',
    name: 'login',
    component: LoginView,
    props: true,
    meta: { public: true }
  },
  {
    path: '/',
    name: 'admin',
    alias: '/dashboard',
    beforeEnter: (to, from, next) => {
      next('/accounts')
    },
    props: {
      default: true
    }
  },
  {
    path: '/accounts',
    name: 'accounts',
    component: AccountsView,
    props: true
  },
  {
    path: '/user/:username',
    name: 'profile',
    component: ProfileView,
    props: true,
    beforeEnter: (to, from, next) => {
      rootStore.commit('adminModule/userAdminProfile', null)
      rootStore
        .dispatch('adminModule/fetchUserProfileByName', {
          username: to.params.username
        })
        .then(() => next())
        .catch((e) => {
          next(Error(merginUtils.parseError(e, 'Failed to fetch user profile')))
        })
    }
  },
  {
    path: '/projects',
    name: 'projects',
    component: ProjectsView,
    props: true,
    children: [
      {
        path: ':namespace',
        name: 'namespace-projects',
        component: ProjectsView,
        props: true
      }
    ]
  },
  {
    path: '/projects/:namespace/:projectName',
    name: 'project',
    component: ProjectView,
    props(route) {
      return {
        namespace: route.params.namespace,
        projectName: route.params.projectName,
        asAdmin: true
      }
    },
    redirect: { name: 'project-tree' },
    children: [
      {
        path: 'blob/:location*',
        name: 'blob',
        component: FileDetailView,
        props(route) {
          return {
            asAdmin: true,
            namespace: route.params.namespace,
            projectName: route.params.projectName,
            location: route.params.location
          }
        }
      },
      {
        path: 'tree/:location*',
        name: 'project-tree',
        component: FileBrowserView,
        props(route) {
          return {
            asAdmin: true,
            namespace: route.params.namespace,
            projectName: route.params.projectName,
            location: route.params.location
          }
        }
      },
      {
        path: 'settings',
        name: 'project-settings',
        component: ProjectSettingsView,
        props(route) {
          return {
            asAdmin: true,
            namespace: route.params.namespace,
            projectName: route.params.projectName
          }
        }
      },
      {
        path: 'history',
        name: 'project-versions',
        component: ProjectVersionsView,
        props(route) {
          return {
            asAdmin: true,
            namespace: route.params.namespace,
            projectName: route.params.projectName
          }
        }
      },
      {
        path: 'history/:version_id',
        name: 'project-versions-detail',
        component: VersionDetailView,
        props(route) {
          return {
            asAdmin: true,
            namespace: route.params.namespace,
            projectName: route.params.projectName,
            version_id: route.params.version_id
          }
        }
      },
      {
        path: 'history/:version_id/:path',
        name: 'file-version-detail',
        component: FileVersionDetailView,
        props(route) {
          return {
            asAdmin: true,
            namespace: route.params.namespace,
            projectName: route.params.projectName,
            version_id: route.params.version_id,
            path: route.params.path
          }
        }
      }
    ]
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    props: true
  }
]
