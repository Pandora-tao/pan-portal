import { shallowRef } from 'vue'

export function useAbortController() {
  const controller = shallowRef<AbortController | null>(null)

  function create(): AbortSignal {
    abort()
    const ac = new AbortController()
    controller.value = ac
    return ac.signal
  }

  function abort() {
    if (controller.value) {
      controller.value.abort()
      controller.value = null
    }
  }

  function isAborted(): boolean {
    return controller.value?.signal.aborted ?? false
  }

  return { create, abort, isAborted }
}
