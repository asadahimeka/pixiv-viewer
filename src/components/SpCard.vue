<template>
  <div class="image-card">
    <img v-lazy="artwork.thumbnail" :alt="artwork.title" class="image">
    <div class="meta">
      <div class="content">
        <h2 class="title" :title="artwork.title">{{ artwork.title }}</h2>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  components: {

  },
  props: {
    artwork: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {}
  },
  methods: {

  },
}
</script>

<style lang="stylus" scoped>
.image-card {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 390px;
  margin-bottom: 10px;
  overflow: hidden;
  background: #fafafa;
  border-radius: 20px;

  .image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;

    &[lazy="loading"] {
      width: 100px;
      height: 100px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }

  .meta {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

    &::before {
      position: absolute;
      content: '';
      bottom: 0;
      width: 100%;
      height: 50%;
      background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0%, rgba(255, 255, 255, 0) 100%);
    }

    .content {
      position: absolute;
      bottom: 0;
      width: 100%;
      padding: 18px 14px;
      box-sizing: border-box;
      color: #fff;

      .title {
        font-size: 24px;
        margin: 10px 0;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
      }
    }
  }
}
</style>
