export default {
  install(Vue) {
    const PRESS_TIMEOUT = 800

    Vue.directive('longpress', {
      bind: function (el, { value }, vNode) {
        if (typeof value !== 'function') {
          // console.warn(`Expect a function, got ${value}`)
          return
        }

        let pressTimer = null
        let startX = 0
        let startY = 0
        const disX = 10
        const disY = 10

        const start = e => {
          if (e.type === 'click' && e.button !== 0) {
            return
          }

          if (pressTimer === null) {
            pressTimer = setTimeout(() => value(e), PRESS_TIMEOUT)
          }
        }

        const cancel = () => {
          if (pressTimer !== null) {
            clearTimeout(pressTimer)
            pressTimer = null
          }
        }

        el.addEventListener('mousedown', start)
        el.addEventListener('touchstart', event => {
          const touch = event.changedTouches[0]
          startX = touch.clientX
          startY = touch.clientY
          start(event)
        })

        el.addEventListener('touchmove', event => {
          const touch = event.changedTouches[0]
          const diffX = Math.abs(touch.clientX - startX)
          const diffY = Math.abs(touch.clientY - startY)
          if ((disX > 0 && diffX > disX) || (disY > 0 && diffY > disY)) {
            cancel()
          }
        }, false)

        el.addEventListener('click', cancel)
        el.addEventListener('mouseout', cancel)
        el.addEventListener('touchend', cancel)
        el.addEventListener('touchcancel', cancel)
      },
    })
  },
}
