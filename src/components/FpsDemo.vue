<template>
  <div class="fps-demo">
    FPS: {{ fps }}
  </div>
</template>

<script setup>
import { useFps } from '@vueuse/core'

const fps = useFps()
</script>

<style scoped>
.fps-demo {
  position: fixed;
  z-index: 99999;
  right: 0.2rem;
  top: 0.2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 0.1rem;
  font-size: 0.24rem;
  border-radius: 4PX;
}
</style>
