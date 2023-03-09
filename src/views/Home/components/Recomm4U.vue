<template>
  <div>
    <van-cell class="cell" :border="false" style="margin-bottom: 0;">
      <template #title>
        <Icon class="icon" name="rec_heart" />
        <span class="title">{{ $t('sp.recomm_4u') }}</span>
      </template>
    </van-cell>
    <van-tabs v-model="activeTab" sticky animated swipeable color="#F2C358">
      <van-tab :title="$t('common.illust')" name="illusts">
        <DiscoveryIllusts />
      </van-tab>
      <van-tab :title="$t('common.user')" name="users">
        <DiscoveryUsers />
      </van-tab>
    </van-tabs>
  </div>
</template>

<script>
import DiscoveryIllusts from './DiscoveryIllusts.vue'
import DiscoveryUsers from './DiscoveryUsers.vue'

export default {
  components: {
    DiscoveryUsers,
    DiscoveryIllusts,
  },
  data() {
    return {
      activeTab: 'illust',
    }
  },
}
</script>
