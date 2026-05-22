import { nextTick, type Ref } from 'vue'

export function useAutoScroll(containerRef: Ref<HTMLElement | null>) {
  async function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    await nextTick()

    const container = containerRef.value
    if (!container) {
      return
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    })
  }

  return {
    scrollToBottom,
  }
}
