import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

const blockZoom = (event: Event) => {
  event.preventDefault()
}

const blockMultiTouch = (event: TouchEvent) => {
  if (event.touches.length > 1) {
    event.preventDefault()
  }
}

const syncAppHeight = () => {
  const height = window.visualViewport?.height ?? window.innerHeight
  document.documentElement.style.setProperty('--app-height', `${height}px`)
}

syncAppHeight()
window.addEventListener('resize', syncAppHeight)
window.visualViewport?.addEventListener('resize', syncAppHeight)

document.addEventListener('gesturestart', blockZoom, { passive: false })
document.addEventListener('gesturechange', blockZoom, { passive: false })
document.addEventListener('gestureend', blockZoom, { passive: false })
document.addEventListener('touchmove', blockMultiTouch, { passive: false })

createApp(App).mount('#app')
