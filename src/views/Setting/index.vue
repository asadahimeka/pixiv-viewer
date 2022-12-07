<template>
  <div class="setting">
    <h2 class="app-title">
      <img width="40" height="40" src="/app-icon.png" alt="">
      <span>Pixiv Viewer</span>
      <sup style="margin-left: 5px;font-size: 0.3rem;">Kai</sup>
    </h2>
    <van-cell size="large" center title="关于" icon="star-o" is-link to='/setting/about' />
    <van-cell size="large" center title="清除缓存" icon="delete-o" is-link to='/setting/clearcache' />
    <van-cell size="large" center title="作品显示设置" icon="eye-o" is-link to='/setting/contents-display' />
    <van-cell size="large" center title="历史记录" icon="underway-o" is-link to='/setting/history' />
    <van-cell size="large" center title="其他设置" icon="setting-o" is-link to='/setting/others' />
    <van-cell size="large" center title="用户脚本推荐" icon="label-o" is-link to='/setting/userscripts' />
    <van-cell size="large" center title="网站推荐" icon="bookmark-o" is-link to='/setting/links' />
  </div>
</template>

<script>
import { Cell, CellGroup } from "vant";

export default {
  name: "Setting",
  data() {
    return {

    };
  },
  components: {
    [Cell.name]: Cell,
    [CellGroup.name]: CellGroup
  }
};
</script>

<style lang="stylus" scoped>
.setting
  max-width 750px
  margin 0 auto 160px

  ::v-deep .van-cell__left-icon
    margin-right 0.4rem
    font-size 24px
    transform: translateY(1px);

.app-title
  display flex
  justify-content center
  align-items center
  margin 40px 0 50px
  font-size 40px
  text-align center

  img
    margin-right 20px

</style>
