<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">清除缓存</h3>
    <van-cell center title="持久化缓存">
      <template #label>
        <span>{{ size.db[1] }} 条记录 ~ {{ size.db[0] | bytes }}</span>
      </template>
      <template #right-icon>
        <van-button type="info" size="small" @click="clearCache('db')">
          <span class="umami--click--clear_db_cache">清理</span>
        </van-button>
      </template>
    </van-cell>
    <van-cell center title="配置项缓存">
      <template #label>
        <span>{{ size.local[1] }} 条记录 ~ {{ size.local[0] | bytes }}</span>
      </template>
      <template #right-icon>
        <van-button size="small" @click="clearCache('local')" color="linear-gradient(to right, #ff6034, #ee0a24)">
          <span class="umami--click--clear_local_cache">清理</span>
        </van-button>
      </template>
    </van-cell>
    <van-cell center title="运行时缓存">
      <template #label>
        <span>{{ size.session[1] }} 条记录 ~ {{ size.session[0] | bytes }}</span>
      </template>
      <template #right-icon>
        <van-button type="primary" size="small" @click="clearCache('session')">
          <span class="umami--click--clear_session_cache">清理</span>
        </van-button>
      </template>
    </van-cell>
  </div>
</template>

<script>
import { Cell, CellGroup, Switch, Button, Dialog, ActionSheet } from "vant";
import { LocalStorage, SessionStorage } from "@/utils/storage";
import localDb from "@/utils/localDb"

export default {
  name: "SettingClearCache",
  data() {
    return {
      size: {
        db: [0, 0],
        local: [0, 0],
        session: [0, 0]
      }
    };
  },
  methods: {
    async calcCacheSize() {
      this.size.local = [LocalStorage.size, localStorage.length]
      this.size.session = [SessionStorage.size, sessionStorage.length]
      this.size.db = [
        (await navigator.storage.estimate()).usage,
        await localDb.length()
      ]
    },
    clearCache(type) {
      let showName;
      switch (type) {
        case "db":
          showName = "持久化缓存";
          break;

        case "local":
          showName = "配置项缓存";
          break;

        case "session":
          showName = "运行时缓存";
          break;

        default:
          break;
      }
      Dialog.confirm({
        message: `确定要清理${showName}吗？${type == 'db' ? '清理后将重新从网络加载相关内容' : ''}`,
        confirmButtonColor: "black",
        cancelButtonColor: "#1989fa",
        closeOnPopstate: true
      }).then(async () => {
        if (type === 'db') await localDb.clear()
        if (type === "local") LocalStorage.clear();
        if (type === "session") SessionStorage.clear();

        this.calcCacheSize();
        this.$toast.success("清理完成");
      });
    },
  },
  filters: {
    bytes(bytes) {
      bytes = Number(bytes);
      if (!bytes) return "0 B";

      const k = 1024;
      const dm = 1;
      const sizes = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];

      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    }
  },
  activated() {
    this.calcCacheSize();
  },
  components: {
    [Cell.name]: Cell,
    [CellGroup.name]: CellGroup,
    [Button.name]: Button,
    [Switch.name]: Switch,
    [ActionSheet.name]: ActionSheet
  }
};
</script>

<style lang="stylus" scoped>

</style>
