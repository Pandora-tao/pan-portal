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

    // 先保持粘底状态，避免程序触发的 scroll 事件把自动跟随误判为
    // 用户主动向上滚动。流式内容使用 auto，保证每个增量落在真实底部；
    // 手动点击“回到底部”时仍可保留 smooth 动画。
    shouldAutoScroll.value = true
    if (behavior === 'auto') {
      container.scrollTop = container.scrollHeight
      return
    }
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    })
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
