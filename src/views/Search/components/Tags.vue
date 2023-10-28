<template>
  <div style="position: relative;">
    <masonry class="tags" v-bind="$store.getters.wfProps" gutter="8px">
      <div
        v-for="(tag, index) in tags"
        :key="index"
        class="tag"
        :style="{ backgroundImage: `linear-gradient(45deg, ${randColor()} 0%, ${randColor()} 100%)` }"
        @click.stop="search(tag.name)"
      >
        <img :src="tag.pic" alt @contextmenu="preventContext">
        <div v-longpress="ev => toArtwork(ev, tag.pic)" class="meta" @contextmenu="preventContext">
          <div class="content">
            <div v-if="tag.name" class="name" :class="[getLength(tag.name)]">#{{ tag.name }}</div>
            <div v-if="tag.tname" class="tname" :class="[getLength(tag.tname)]">{{ tag.tname }}</div>
          </div>
        </div>
      </div>
    </masonry>
    <van-loading v-if="loading" class="loading" size="60px" />
  </div>
</template>

<script>
import api from '@/api'
import { Dialog } from 'vant'

export default {
  components: {
  },
  data() {
    return {
      loading: false,
      tags: [],
    }
  },
  mounted() {
    this.getTags()
  },
  methods: {
    search(keywords) {
      this.$emit('search', keywords)
    },
    async getTags() {
      this.loading = true
      const res = await api.getTags()
      if (res.status === 0) {
        this.tags = res.data
      } else {
        this.$toast({
          message: res.msg,
        })
        this.error = true
      }
      this.loading = false
    },
    preventContext(event) {
      event.preventDefault()
      return false
    },
    async toArtwork(ev, pic) {
      ev.preventDefault()
      const id = pic.match(/.*\/(\d+)_p0_.*/)?.[1]
      if (!id) return
      const res = await Dialog.confirm({
        title: this.$t('p56suIhQbLp-UUYtYjQoa'),
        message: id,
        lockScroll: false,
        closeOnPopstate: true,
        cancelButtonText: this.$t('common.cancel'),
        confirmButtonText: this.$t('common.confirm'),
      }).catch(() => 'cancel')
      if (res != 'confirm') return
      await this.$nextTick()
      this.$router.push(`/artworks/${id}`)
    },
    getLength(val) {
      if (val.length >= 10) {
        return 's'
      }
      if (val.length >= 4) {
        return 'm'
      }
      return 'l'
    },
    randColor() {
      const characters = ['a', 'b', 'c', 'd', 'e', 'f', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      const randomColorArray = []
      for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length)
        randomColorArray.push(characters[randomIndex])
      }
      return `#${randomColorArray.join('')}`
    },
  },
}
</script>

<style lang="stylus" scoped>
.loading
  position absolute
  top 300px
  left 50%
  transform translateX(-50%)

.tags {
  // display: flex;
  // flex-direction: column;

  .tag {
    position: relative;
    width: 100%;
    margin-bottom: 10px;
    padding-bottom: 100%;
    border-radius: 8px;

    img {
      position: absolute;
      top: 0;
      left: 0;
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 8px;
      object-fit: cover;
    }

    .meta {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      text-align: center;
      color: #fff;
      background-image: linear-gradient(0deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0) 60%);
      border-radius: 8px;

      .content {
        position: absolute;
        bottom: 10%;
        width: 100%;
        text-shadow: 0.05333rem 0.05333rem 0.05333rem #000;

        .name {
          font-size: 36px;
          margin: 10px 0;
        }

        .tname {
          font-size: 28px;
          margin: 10px 0;
        }

        .l {
          font-size: 30px;
        }

        .m {
          font-size: 26px;
        }

        .s {
          font-size: 24px;
        }
      }
    }
  }

  .top {
    .tag {
      height: 600px;
      width: 100%;
    }
  }

  .bottom {
    display: flex;

    .row {
      .tag {
        width: 33.33%;
      }
    }
  }
}
</style>
