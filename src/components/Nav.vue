<template>
  <div class="nav-container" :class="{ showNav: showNav }">
    <ul class="nav-bar">
      <li @click="navigateTo('Home')">
        <Icon class="icon home" name="home" index="Home" :currentIndex="$route.name" />
        <span>首页</span>
      </li>
      <li @click="navigateTo('Search')">
        <Icon class="icon" :class="{active:$route.name.startsWith('Search')}" name="search" index="Search" :currentIndex="$route.name" />
        <span>搜索</span>
      </li>
      <li @click="navigateTo('Rank', {type: 'daily'})">
        <Icon class="icon" name="rank" index="Rank" :currentIndex="$route.name" />
        <span>排行榜</span>
      </li>
      <li @click="navigateTo('Setting')">
        <Icon class="icon" name="setting" index="Setting" :currentIndex="$route.name" />
        <span>设置</span>
      </li>
    </ul>
  </div>
</template>

<script>
function throttleScroll(el, downFn, upFn) {
  let position = el.scrollTop
  let ticking = false
  return function (arg) {
    if (ticking) return
    ticking = true
    window.requestAnimationFrame(() => {
      const scroll = el.scrollTop
      scroll > position ? downFn(scroll, arg) : upFn?.(scroll, arg)
      position = scroll
      ticking = false
    })
  }
}

export default {
  data() {
    return {
      showNav: true,
      scrollFn: () => {}
    };
  },
  methods: {
    navigateTo(name, params) {
      if (this.$route.name === name) {
        document.querySelector('.app-main')?.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        this.$router.push({ name, params });
      }
    },
  },
  mounted() {
    console.log(this.$route);
    const el = document.querySelector('.app-main')
    if (el) {
      this.scrollFn = throttleScroll(el, scroll => {
        if (scroll > 160) this.showNav = false
      }, () => {
        this.showNav = true
      })
      el.addEventListener('scroll', this.scrollFn)
    }
  },
  destroyed() {
    document.querySelector('.app-main')?.removeEventListener('scroll', this.scrollFn)
  }
};
</script>

<style lang="stylus" scoped>
.nav-container {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100px;
  // height: calc(100px + env(safe-area-inset-bottom));
  z-index: 10;

  opacity: 0;
  transform: translateY(100%);
  transition: 0.2s;

  &.showNav {
    opacity: 1;
    transform: translateY(0);
  }

  .nav-bar {
    display: flex;
    justify-content: space-between;
    background: #fff;
    /* border-radius: .7rem .7rem 0 0; */
    box-shadow: 0px 0px 20px #dedede;
    width: 100%;
    max-width: 750px;
    height: 100%;
    margin: 0 auto;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    // backdrop-filter: blur(6px);
    backdrop-filter: saturate(200%) blur(6px);
    background: rgba(255, 255, 255, 0.8);

    li {
      position: relative;
      color: #777;
      font-size: 22px;
      cursor: pointer;
      width: 20%;
      vertical-align: middle;
      text-align: center;
      margin: 0 10px;

      .icon {
        display: block;
        font-size: 58px;
        margin: 0 auto;
        margin-top: 0.1rem;
        color: #fffdf7;

        &.active {
          color: #F2C358;
        }
      }
    }
  }
}
</style>
