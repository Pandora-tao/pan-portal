import { nextTick, type Ref, ref } from 'vue'

const NEAR_BOTTOM_THRESHOLD = 120

export function useAutoScroll(containerRef: Ref<HTMLElement | null>) {
  const shouldAutoScroll = ref(true)

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

    shouldAutoScroll.value = true
  }

  function isNearBottom(): boolean {
    const container = containerRef.value
    if (!container) {
      return true
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    return distanceFromBottom < NEAR_BOTTOM_THRESHOLD
  }

  function handleScroll() {
    shouldAutoScroll.value = isNearBottom()
  }

  async function autoScrollToBottom(behavior: ScrollBehavior = 'smooth') {
    if (!shouldAutoScroll.value) {
      return
    }
    await scrollToBottom(behavior)
  }

  return {
    scrollToBottom,
    autoScrollToBottom,
    handleScroll,
    isNearBottom,
    shouldAutoScroll,
  }
}
