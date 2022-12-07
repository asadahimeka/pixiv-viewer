<template>
</template>

<script>
import { Popup } from "vant";
export default {
  props: {
    date: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      show: false
    };
  },
  methods: {
    showPopup() {
      this.show = true;
    }
  },
  computed: {
    dateNum() {
      return this.date.date();
    }
  },
  components: {
    [Popup.name]: Popup
  }
};
</script>

<style lang="stylus" scoped>
.calendar {
  position: relative;
  width: 60px;
  height: 60px;
  background: url('~@/assets/images/calendar.png') center no-repeat;
  background-size: 100%;
  transform: translateY(-4px);

  .date {
    position: absolute;
    top: 24px;
    left: 54%;
    transform: translateX(-50%);
    color: #555;
    font-family: Dosis;
    font-size: 26px;
    font-weight: 600;
    letter-spacing: 4px;
  }
}
</style>