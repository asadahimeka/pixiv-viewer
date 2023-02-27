import { register } from 'register-service-worker'
import { Notify } from 'vant'

const notify = message => Notify({
  message,
  color: '#fff',
  background: '#f1c25f',
  duration: 1500,
})

if (process.env.NODE_ENV === 'production') {
  register(`${process.env.BASE_URL}service-worker.js`, {
    ready() {
      console.info(
        'App is being served from cache by a service worker.\n' +
        'For more details, visit https://goo.gl/AFskqB'
      )
    },
    registered() {
      console.info('Service worker has been registered.')
    },
    cached() {
      console.info('Content has been cached for offline use.')
    },
    updatefound() {
      console.info('New content is downloading.')
    },
    updated() {
      console.info('New content is available; please refresh.')
      notify('新内容下载完毕，请刷新页面')
    },
    offline() {
      console.info('No internet connection found. App is running in offline mode.')
      notify('无网络链接，页面处于离线模式')
    },
    error(error) {
      console.error('Error during service worker registration:', error)
    },
  })
}
