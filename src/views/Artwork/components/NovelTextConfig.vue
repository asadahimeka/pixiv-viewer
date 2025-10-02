<template>
  <van-action-sheet v-model="showSettings" class="setting-actions" :title="$t('novel.settings.title')" :overlay="false">
    <div class="configs">
      <div class="conf-fcont">
        <div class="conf-fitem">
          <div class="conf-title">{{ $t('novel.settings.text.size') }}</div>
          <div class="conf-inp">
            <van-slider v-model="novelTextConfig.size" :min="12" :max="36" class="conf-slider" @change="onSizeChange">
              <template #button>
                <div class="van-slider__button">{{ novelTextConfig.size }}</div>
              </template>
            </van-slider>
          </div>
        </div>
        <div class="conf-fitem" style="flex: 0.3;text-align: center;">
          <div class="conf-title">{{ $t('BL3mClhoBiB1ETwTnJpqV') }}</div>
          <div class="conf-inp" style="padding-right: 0.26667rem;">
            <van-switch v-model="novelTextConfig.indent" size="18" />
          </div>
        </div>
      </div>
      <div class="conf-fcont">
        <div class="conf-fitem">
          <div class="conf-title">{{ $t('novel.settings.text.font') }}</div>
          <div class="conf-inp">
            <van-radio-group v-model="novelTextConfig.font" direction="horizontal">
              <van-radio name="sans-serif" style="font-family: sans-serif;">{{ $t('novel.settings.text.sans') }}</van-radio>
              <van-radio name="serif" style="font-family: serif;">{{ $t('novel.settings.text.serif') }}</van-radio>
              <van-radio name="inherit">{{ $t('ZfJcs8gi6ptsljzInCNpH') }}</van-radio>
            </van-radio-group>
          </div>
        </div>
        <div class="conf-fitem">
          <div class="conf-title">{{ $t('novel.settings.text.direction') }}</div>
          <div class="conf-inp">
            <van-radio-group v-model="novelTextConfig.direction" direction="horizontal">
              <van-radio name="h">{{ $t('novel.settings.text.direct_h') }}</van-radio>
              <van-radio name="v">{{ $t('novel.settings.text.direct_v') }}</van-radio>
              <van-radio name="hc">{{ $t('novel.settings.text.direct_hc') }}</van-radio>
            </van-radio-group>
          </div>
        </div>
      </div>
      <div class="conf-fcont novel-wrap-setting">
        <div class="conf-fitem">
          <div class="conf-title">{{ $t('novel.settings.text.height') }}</div>
          <div class="conf-inp">
            <van-slider v-model="novelTextConfig.height" :min="1" :max="5" :step="0.1" class="conf-slider" @change="onSizeChange">
              <template #button>
                <div class="van-slider__button">{{ novelTextConfig.height }}</div>
              </template>
            </van-slider>
          </div>
        </div>
        <div class="conf-fitem">
          <div class="conf-title">{{ $t('novel.settings.text.weight') }}</div>
          <div class="conf-inp">
            <van-slider v-model="novelTextConfig.weight" :min="100" :max="900" :step="100" class="conf-slider" @change="onSizeChange">
              <template #button>
                <div class="van-slider__button">{{ novelTextConfig.weight }}</div>
              </template>
            </van-slider>
          </div>
        </div>
      </div>
      <div class="conf-fcont novel-wrap-setting">
        <div class="conf-fitem">
          <div class="conf-title">{{ $t('zlMUy5svAesJpHhvWRc6C') }}</div>
          <div class="conf-inp">
            <div class="conf-colors">
              <div
                v-for="c in textColorPresets"
                :key="c[0]"
                class="conf-color"
                :class="{act:novelTextConfig.bg==c[0]}"
                :style="{background:c[0]}"
                @click="novelTextConfig.bg=c[0];novelTextConfig.color=c[1]"
              ></div>
            </div>
          </div>
        </div>
        <div class="conf-fitem">
          <div class="conf-fcont">
            <div class="conf-fitem">
              <div class="conf-title">{{ $t('novel.settings.text.color') }}</div>
              <div class="conf-inp">
                <input v-model="novelTextConfig.color" type="color">
              </div>
            </div>
            <div class="conf-fitem">
              <div class="conf-title">{{ $t('novel.settings.text.bg') }}</div>
              <div class="conf-inp">
                <input v-model="novelTextConfig.bg" type="color">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </van-action-sheet>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Toast } from 'vant'
import { i18n } from '@/i18n'
import { LocalStorage } from '@/utils/storage'
import { novelTextConfig } from '@/store'

const showSettings = ref(false)
const textColorPresets = ref([
  ['#ffffff', '#1f1f1f'],
  ['#fafafa', '#1f1f1f'],
  ['#1f1f1f', '#b7b7b7'],
  ['#e6f1fa', '#1f1f1f'],
  ['#fff8eb', '#1f1f1f'],
])

watch(
  () => novelTextConfig,
  val => {
    LocalStorage.set('PXV_TEXT_CONFIG', val)
  },
  { deep: true }
)

function onSizeChange(value) {
  Toast(i18n.t('tips.current_value') + value)
}

function open() {
  showSettings.value = true
}

function toggle() {
  showSettings.value = !showSettings.value
}

defineExpose({
  open,
  toggle,
})
</script>

<style lang="stylus" scoped>
.setting-actions
  max-width 10rem
  // height 8rem
  max-height 80vh
  overflow-y auto
  left unset
  right 0
  background: hsla(0, 0%, 100%, .9);
  backdrop-filter: blur(.05333rem);
  box-shadow 0px 0px 8px 2px #ccc;
  .configs
    padding 0px 50px 80px
  .conf-fcont
    display flex
    align-items center
  .conf-fitem
    width 50%
    flex 1
  .conf-title
    margin 20px 0 30px
    padding: 20px 16px 0 16px;
    color: #777
    font-size: 15PX;
    font-weight bold
  .conf-inp
    padding-left 20px
  .conf-colors
    display flex
    align-items center
    flex-wrap wrap
    gap 10px
  .conf-color
    width 36px
    height 36px
    border-radius 50%
    border 2PX solid rgba(0, 0, 0, 0.08)
    &:hover,&.act
      border-color var(--accent-color, #0096fa)
  .novel-wrap-setting
    @media screen and (max-width: 600px)
      flex-wrap wrap
      > .conf-fitem
        width 100%
        flex unset
      .conf-colors
        gap 0.5rem
      .conf-color
        width 0.8rem
        height 0.8rem
  .conf-slider
    margin-top 40px
    height: 4PX
    ::v-deep .van-slider__button
      display flex
      justify-content center
      align-items center
      width: auto
      height: auto
      min-width 0.32rem
      min-height 0.3rem
      padding: 0.1rem 0.15rem
      border-radius: 0.2rem
      font-family Bahnschrift, Dosis, Arial, Helvetica, sans-serif
      font-size: 13.5PX
      font-weight bold
      line-height 1.2
</style>
