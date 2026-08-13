import crabUrl from '../assets/draggable-material/crab.png'
import dvaMechUrl from '../assets/draggable-material/dva-mech.png'
import grapesUrl from '../assets/draggable-material/grapes.png'
import headphonesUrl from '../assets/draggable-material/headphones.png'
import hollowKnightUrl from '../assets/draggable-material/hollow-knight.png'
import luluUrl from '../assets/draggable-material/lulu.png'
import puddingUrl from '../assets/draggable-material/pudding-dog.png'
import raceCarUrl from '../assets/draggable-material/race-car.png'
import type { DecorKey, DraggableDecorationDefinition } from './types'

export const draggableDecorations: DraggableDecorationDefinition[] = [
  {
    id: 'lulu',
    ariaLabel: 'lulu',
    className: 'decor-lulu',
    image: luluUrl,
    introText: '你好',
    start: { x: 0.84, y: 0.7 },
    body: { shape: 'rectangle', widthScale: 0.62, heightScale: 0.72 },
  },
  {
    id: 'grapes',
    ariaLabel: '葡萄',
    className: 'decor-grapes',
    image: grapesUrl,
    introText: '最爱吃',
    start: { x: 0.72, y: 0.2 },
    body: { shape: 'circle', radiusScale: 0.42 },
  },
  {
    id: 'pudding',
    ariaLabel: '布丁狗',
    className: 'decor-pudding',
    image: puddingUrl,
    introText: '布丁狗最可爱',
    start: { x: 0.58, y: 0.78 },
    body: { shape: 'rectangle', widthScale: 0.74, heightScale: 0.68 },
  },
  {
    id: 'crab',
    ariaLabel: '螃蟹',
    className: 'decor-crab',
    image: crabUrl,
    introText: '陶攀是巨蟹座',
    start: { x: 0.22, y: 0.7 },
    body: { shape: 'rectangle', widthScale: 0.82, heightScale: 0.54 },
  },
  {
    id: 'headphones',
    ariaLabel: '耳机',
    className: 'decor-headphones',
    image: headphonesUrl,
    introText: '音乐纯粹，爱V绝对',
    start: { x: 0.35, y: 0.28 },
    body: { shape: 'rectangle', widthScale: 0.7, heightScale: 0.72 },
  },
  {
    id: 'raceCar',
    ariaLabel: '赛车',
    className: 'decor-race-car',
    image: raceCarUrl,
    introText: '陶攀小时候最想要的遥控赛车',
    start: { x: 0.48, y: 0.48 },
    body: { shape: 'rectangle', widthScale: 0.86, heightScale: 0.48 },
  },
  {
    id: 'hollowKnight',
    ariaLabel: '空洞骑士',
    className: 'decor-hollow-knight',
    image: hollowKnightUrl,
    introText: '我忘记了所有悲剧，所见皆是奇迹',
    start: { x: 0.16, y: 0.34 },
    body: { shape: 'rectangle', widthScale: 0.52, heightScale: 0.76 },
  },
  {
    id: 'dvaMech',
    ariaLabel: 'D.VA',
    className: 'decor-dva-mech',
    image: dvaMechUrl,
    introText: 'D.VA爱你哟',
    start: { x: 0.82, y: 0.42 },
    body: { shape: 'rectangle', widthScale: 0.82, heightScale: 0.66 },
  },
]

export function createDecorationStyles() {
  return Object.fromEntries(
    draggableDecorations.map((decoration) => [decoration.id, {}]),
  ) as Record<DecorKey, Record<string, string>>
}
