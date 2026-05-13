import confetti, { type Options } from 'canvas-confetti'

export const usePrizeCelebration = () => {
  const launchPrizeCelebration = () => {
    const base: Options = {
      spread: 70,
      startVelocity: 34,
      ticks: 90,
      gravity: 0.9,
      scalar: 0.92,
      colors: ['#b8402f', '#e6b44d', '#2e7c55', '#f7f1da', '#7cae6a'],
    }

    confetti({
      ...base,
      particleCount: 70,
      origin: { x: 0.28, y: 0.38 },
      angle: 58,
    })

    confetti({
      ...base,
      particleCount: 70,
      origin: { x: 0.72, y: 0.38 },
      angle: 122,
    })
  }

  return {
    launchPrizeCelebration,
  }
}
