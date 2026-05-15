export type DecorKey =
  | 'lulu'
  | 'grapes'
  | 'pudding'
  | 'crab'
  | 'headphones'
  | 'raceCar'
  | 'hollowKnight'
  | 'dvaMech'

export interface DraggableDecorationDefinition {
  id: DecorKey
  ariaLabel: string
  className: string
  image: string
  introText: string
  start: {
    x: number
    y: number
  }
  body:
    | {
        shape: 'circle'
        radiusScale: number
      }
    | {
        shape: 'rectangle'
        widthScale: number
        heightScale: number
      }
}
