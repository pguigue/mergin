<!--
Copyright (C) Lutra Consulting Limited

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-MerginMaps-Commercial
-->

<template>
  <page-view
    v-if="loggedUser.username === name"
    :style="`padding-left: ${
      drawer ? 260 : 20
    }px; overflow-y: auto; padding-right:20px; margin-right: 0px;`"
  >
    <router-view></router-view>
  </page-view>
</template>

<script>
import { mapState } from 'vuex'

import PageView from '@/modules/layout/components/PageView'

export default {
  name: 'RootView',
  components: {
    PageView
  },
  computed: {
    ...mapState('layoutModule', ['drawer']),
    ...mapState('userModule', ['loggedUser']),
    name() {
      return this.$route.params.name
    }
  }
}
</script>
