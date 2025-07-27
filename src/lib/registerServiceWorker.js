import { register } from 'register-service-worker'
import { BASE_URL, isProduction } from '../consts'

if (isProduction) {
  register(`${BASE_URL}service-worker.js`, {
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
      window.umami?.track('service-worker-updated')
    },
    offline() {
      console.info('No internet connection found. App is running in offline mode.')
    },
    error(error) {
      console.error('Error during service worker registration:', error)
      window.umami?.track('service-worker-error', { error: error.message })
    },
  })
}
