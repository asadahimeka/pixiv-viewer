<template>
  <van-action-sheet
    v-model="pageFont.show"
    style="font-family: Arial, Helvetica, sans-serif"
    :cancel-text="$t('common.cancel')"
    :description="$t('SLO07VkQh2wjFJJ1MLvUl')"
    close-on-click-action
  >
    <div class="font-sel-div">
      <div
        v-for="(f, i) in pageFont.actions"
        :key="i + f._value"
        class="font-sel-item"
        :class="{ act: f._value == currentFont }"
        :title="f.name"
        :style="`font-family: '${f._value}', sans-serif`"
        @click="onChange(f._value)"
      >
        <img v-if="f.preview" class="font-sel-item-preview" :src="`/img/font_preview/${f.name}.svg`" :alt="f.name">
        <span v-else>{{ f.name }}</span>
        <van-icon v-if="f._value == currentFont" class="font-sel-item-checked" name="checked" />
      </div>
    </div>
  </van-action-sheet>
</template>

<script>
import { getPageFontActions, loadCustomFont } from '@/utils/font'

export default {
  props: {
    currentFont: { type: String, default: '' },
    dontSetDocProp: { type: Boolean, default: false },
  },
  data() {
    return {
      pageFont: {
        show: false,
        actions: [],
      },
    }
  },
  methods: {
    async open() {
      const actions = await getPageFontActions()
      this.pageFont = { show: true, actions }
    },
    onChange(font) {
      this.$emit('change', font)
      loadCustomFont(font, this.dontSetDocProp)
    },
  },
}
</script>

<style lang="stylus" scoped>
.font-sel
  &-div
    display flex
    justify-content center
    align-items center
    flex-wrap wrap
    padding 0.3rem
  &-item
    position relative
    width: 33%;
    padding: 0.45rem 0.1rem;
    font-size: 0.3rem;
    text-align: center;
    border: 1PX solid transparent;
    border-radius: 8PX;
    cursor: pointer;
    box-sizing: border-box;
    &:hover
      border-color #ccc
    &.act
      border-color var(--accent-color, #ccc)
    &-checked
      position absolute
      top -0.1rem
      right -0.1rem
      font-size 0.4rem
      color var(--accent-color, #41b541)
    &-preview
      display inline-block
      width 80%
      height 22PX
      margin 0 auto
    @media screen and (max-width: 600px)
      width: 100%
      padding: 0.4rem 0
      font-size: 0.39rem
</style>
<style lang="stylus">
.dark .font-sel-div
  background: #9b9b9b
  color: #111
</style>
