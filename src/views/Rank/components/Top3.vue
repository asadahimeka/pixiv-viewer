<template>
  <div class="top3">
    <div class="box l">
      <ImageCard mode="meta" :artwork="artList[0]" @click-card="toArtwork($event)" />
    </div>
    <div class="box r">
      <div class="box t">
        <ImageCard mode="meta" :artwork="artList[1]" @click-card="toArtwork($event)" />
      </div>
      <div class="box b">
        <ImageCard mode="meta" :artwork="artList[2]" @click-card="toArtwork($event)" />
      </div>
    </div>
  </div>
</template>

<script>
import ImageCard from "@/components/ImageCard";
export default {
  props: {
    artList: {
      type: Array,
      required: true
    }
  },
  data() {
    return {};
  },
  methods: {
    toArtwork(id) {
      this.$router.push({
        name: "Artwork",
        params: { id, list: this.artList }
      });
    }
  },
  components: {
    ImageCard
  }
};
</script>

<style lang="stylus" scoped>
.top3 {
  position: relative;
  display: flex;
  margin: 16px;

  .box {
    border-radius: 24px;
    overflow: hidden;
    box-sizing: border-box;

    .image-card {
      height: 100% !important;

      ::v-deep .meta {
        .content {
          .title {
            font-size: 24px;
          }

          .avatar {
            width: 32px;
            height: 32px;
          }

          .author {
            font-size: 20px;
          }
        }
      }
    }
  }

  .l {
    width: 66%;
    height: 480px;
    margin-right: 8px;
  }

  .r {
    display: flex;
    flex-direction: column;
    width: 33%;
    height: 480px;
    margin-left: 8px;

    .t {
      height: 50%;
      margin-bottom: 8px;
    }

    .b {
      height: 50%;
      margin-top: 8px;
    }
  }
}
</style>