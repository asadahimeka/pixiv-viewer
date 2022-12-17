<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">作品显示设置</h3>
    <van-cell center title="R-18 作品显示" label="包含裸露内容或性描写">
      <template #right-icon>
        <van-switch active-color="#fb7299" :value="currentSETTING.r18" @input="onR18Change($event, 1)" size="24" />
      </template>
    </van-cell>
    <van-cell center title="R-18G 作品显示" label="包含血腥或恶心内容">
      <template #right-icon>
        <van-switch active-color="#ff3f3f" :value="currentSETTING.r18g" @input="onR18Change($event, 2)" size="24" />
      </template>
    </van-cell>
    <van-cell center title="AI 生成作品显示" label="展示图片列表里的 AI 生成作品">
      <template #right-icon>
        <van-switch active-color="#536cb8" :value="currentSETTING.showAi" @input="onAIChange($event)" size="24" />
      </template>
    </van-cell>
  </div>
</template>

<script>
import { Cell, CellGroup, Switch, Button, Dialog, ActionSheet } from "vant";
import { mapState, mapActions } from "vuex";

export default {
  name: "SettingContentsDisplay",
  data() {
    return {
      currentSETTING: {
        r18: false,
        r18g: false,
        showAi: false
      },
    };
  },
  computed: {
    ...mapState(["SETTING"]),
  },
  methods: {
    saveSwitchValues() {
      this.$nextTick(() => {
        this.saveSETTING(JSON.parse(JSON.stringify(this.currentSETTING)));
      })
    },
    onAIChange(checked) {
      this.$set(this.currentSETTING, 'showAi', checked)
      this.saveSwitchValues()
      window.umami?.(`set_ai_switch_${checked}`)
    },
    onR18Change(checked, type) {
      let name;
      if (type === 1) name = "R-18";
      if (type === 2) name = "R-18G";

      if (checked) {
        Dialog.confirm({
          message: `确定要开启${name}作品显示吗？请确保您的年龄已满18岁，且未违反当地法律法规所规定的内容`,
          confirmButtonColor: "black",
          cancelButtonColor: "#1989fa",
          closeOnPopstate: true
        })
          .then(() => {
            if (type === 1) {
              this.currentSETTING.r18 = checked;
              window.umami?.(`set_r18_switch_${checked}`)
            }
            if (type === 2) {
              this.currentSETTING.r18g = checked;
              setTimeout(() => {
                Dialog.alert({
                  message: `请注意，开启${name}开关可能会对您的身心健康造成不可逆的影响，如若感到不适，请立即关闭应用并寻求医学帮助`
                });
              }, 200);
              window.umami?.(`set_r18g_switch_${checked}`)
            }
            this.saveSwitchValues()
          })
          .catch(() => {
            console.log("操作取消");
          });
      } else {
        if (type === 1) this.currentSETTING.r18 = checked;
        if (type === 2) this.currentSETTING.r18g = checked;
        this.saveSwitchValues()
      }
    },
    ...mapActions(["saveSETTING"])
  },
  mounted() {
    this.currentSETTING = JSON.parse(JSON.stringify(this.SETTING));
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
