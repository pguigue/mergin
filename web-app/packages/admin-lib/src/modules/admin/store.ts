// Copyright (C) Lutra Consulting Limited
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-MerginMaps-Commercial

import {
  errorUtils,
  htmlUtils,
  LoginPayload,
  PaginatedUsersParams,
  SortingOptions,
  useFormStore,
  useInstanceStore,
  useNotificationStore,
  UserResponse
} from '@mergin/lib'
import { defineStore, getActivePinia } from 'pinia'
import Cookies from 'universal-cookie'

import { AdminRoutes } from './routes'

import { AdminApi } from '@/modules/admin/adminApi'
import {
  LatestServerVersionResponse,
  PaginatedAdminProjectsParams,
  PaginatedAdminProjectsResponse,
  UpdateUserPayload,
  UsersResponse
} from '@/modules/admin/types'

export interface AdminState {
  loading: boolean
  users: {
    items: UserResponse[]
    count: number
  }
  projects: {
    items: PaginatedAdminProjectsResponse[]
    count: number
    loading: boolean
  }
  user?: UserResponse
  checkForUpdates?: boolean
  isServerConfigHidden: boolean
  latestServerVersion?: LatestServerVersionResponse
}

const cookies = new Cookies()
const COOKIES_HIDE_SERVER_CONFIGURED_BANNER = 'hideServerConfiguredBanner'

export const useAdminStore = defineStore('adminModule', {
  state: (): AdminState => ({
    loading: false,
    users: {
      items: [],
      count: 0
    },
    projects: {
      items: [],
      count: 0,
      loading: false
    },
    user: null,
    checkForUpdates: undefined,
    isServerConfigHidden: false,
    latestServerVersion: undefined
  }),
  getters: {
    displayUpdateAvailable: (state) => {
      if (!state.checkForUpdates) {
        return false
      }

      const instanceStore = useInstanceStore()
      const config = instanceStore.configData

      if (!state.latestServerVersion || !config) {
        return false
      }

      const { major, minor, fix } = state.latestServerVersion

      if (
        (config.major || config.major === 0) &&
        (config.minor || config.minor === 0)
      ) {
        if (major > config.major) {
          return true
        } else if (major === config.major) {
          if (minor > config.minor) {
            return true
          } else if (minor === config.minor) {
            if (fix > config.fix) {
              return true
            }
          }
        }
      }

      return false
    }
  },
  actions: {
    setLoading(value) {
      this.loading = value
    },
    setUsers(data: UsersResponse) {
      this.users = data
    },
    setCheckForUpdates(value) {
      this.checkForUpdates = value
    },
    setIsServerConfigHidden(value: boolean) {
      this.isServerConfigHidden = value
    },

    async fetchUsers(payload: { params: PaginatedUsersParams }) {
      const notificationStore = useNotificationStore()

      this.setLoading(true)
      try {
        const response = await AdminApi.fetchUsers(payload.params)
        this.setUsers(response.data)
      } catch (e) {
        notificationStore.error({ text: errorUtils.getErrorMessage(e) })
      } finally {
        this.setLoading(false)
      }
    },
    async fetchUserByName(payload) {
      const notificationStore = useNotificationStore()

      htmlUtils.waitCursor(true)
      try {
        const response = await AdminApi.fetchUserByName(payload.username)
        this.user = response.data
      } catch (e) {
        await notificationStore.error({ text: 'Failed to fetch user profile' })
      } finally {
        htmlUtils.waitCursor(false)
      }
    },

    async deleteUser(payload) {
      const notificationStore = useNotificationStore()

      htmlUtils.waitCursor(true)
      try {
        await AdminApi.deleteUser(payload.username)
        await getActivePinia().router.push({ name: AdminRoutes.ACCOUNTS })
      } catch (err) {
        await notificationStore.error({
          text: errorUtils.getErrorMessage(err, 'Unable to close account')
        })
      } finally {
        htmlUtils.waitCursor(false)
      }
    },

    async updateUser(payload: UpdateUserPayload) {
      const notificationStore = useNotificationStore()

      htmlUtils.waitCursor(true)
      try {
        const response = await AdminApi.updateUser(
          payload.username,
          payload.data
        )
        if (this.user?.id === response.data?.id) {
          // update stored user detail data
          this.user = response.data
        }
      } catch (err) {
        await notificationStore.error({
          text: errorUtils.getErrorMessage(
            err,
            'Unable to permanently remove account'
          )
        })
      } finally {
        htmlUtils.waitCursor(false)
      }
    },

    async adminLogin(payload: LoginPayload) {
      const instanceStore = useInstanceStore()
      const formStore = useFormStore()

      try {
        await AdminApi.login(payload.data)
        await instanceStore.initApp()
      } catch (error) {
        await formStore.handleError({
          componentId: payload.componentId,
          error,
          generalMessage: 'Failed to login'
        })
      }
    },

    async getLatestServerVersion() {
      const notificationStore = useNotificationStore()
      try {
        const response = await AdminApi.getLatestServerVersion()
        this.latestServerVersion = response.data
      } catch (e) {
        notificationStore.error({ text: errorUtils.getErrorMessage(e) })
      }
    },

    async checkVersions() {
      try {
        await this.getCheckUpdateFromCookies()
        if (!this.checkForUpdates) return

        await this.getLatestServerVersion()
      } catch (e) {
        console.error(e)
      }
    },

    async getCheckUpdateFromCookies() {
      const currentCheckForUpdatesCookie = cookies.get('checkUpdates')
      await this.setCheckUpdatesToCookies({
        value:
          currentCheckForUpdatesCookie === undefined
            ? true
            : currentCheckForUpdatesCookie === 'true'
      })
    },

    async setCheckUpdatesToCookies(payload) {
      const expires = new Date()
      // cookies expire in one year
      expires.setFullYear(expires.getFullYear() + 1)
      cookies.set('checkUpdates', payload.value, { expires })
      this.setCheckForUpdates(payload.value)
    },

    async getServerConfiguredCookies() {
      const currentHideServerConfiguredBannerCookie = cookies.get(
        COOKIES_HIDE_SERVER_CONFIGURED_BANNER
      )
      if (currentHideServerConfiguredBannerCookie === 'true') {
        this.setIsServerConfigHidden(true)
      }
    },

    async setServerConfiguredCookies() {
      cookies.set(COOKIES_HIDE_SERVER_CONFIGURED_BANNER, true)
      this.setIsServerConfigHidden(true)
    },

    async removeServerConfiguredCookies() {
      cookies.remove(COOKIES_HIDE_SERVER_CONFIGURED_BANNER)
    },

    async getProjects(payload: {
      params: SortingOptions & Pick<PaginatedAdminProjectsParams, 'like'>
    }) {
      const notificationStore = useNotificationStore()

      try {
        this.projects.loading = true
        const params: PaginatedAdminProjectsParams = {
          page: payload.params.page,
          per_page: payload.params.itemsPerPage,
          order_params: `${payload.params.sortBy[0]} ${
            payload.params.sortDesc[0] ? 'DESC' : 'ASC'
          }`
        }
        if (payload.params.like) {
          params.like = payload.params.like.trim()
        }

        const response = await AdminApi.getProjects(params)
        this.projects.items = response.data.items
        this.projects.count = response.data.count
      } catch (e) {
        notificationStore.error({
          text: 'Failed to fetch projects'
        })
      } finally {
        this.projects.loading = false
      }
    },

    async restoreProject(payload: { projectId: string }) {
      const notificationStore = useNotificationStore()

      try {
        this.projects.loading = true
        await AdminApi.restoreProject(payload.projectId)
      } catch (e) {
        notificationStore.error({
          text: 'Failed to restore project'
        })
      } finally {
        this.projects.loading = false
      }
    },

    async deleteProject(payload: { projectId: string }) {
      const notificationStore = useNotificationStore()

      try {
        await AdminApi.deleteProject(payload.projectId)
        await getActivePinia().router.push({ name: AdminRoutes.PROJECTS })
        notificationStore.show({
          text: 'Project removed successfully'
        })
      } catch (e) {
        notificationStore.error({
          text: 'Unable to remove project'
        })
      }
    }
  }
})
