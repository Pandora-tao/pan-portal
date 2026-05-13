export interface QuizOption {
  label: string
  text: string
}

export interface Quiz {
  id: string
  question: string
  answer: string
  options: QuizOption[]
}

export interface TextPrize {
  type: 'text'
  name: string
}

export interface RedPacketPrize {
  type: 'red-packet'
  name: string
  min: number
  max: number
}

export type Prize = TextPrize | RedPacketPrize

export interface ZongziItem {
  id: number
  label: string
  rotate: number
}

export const title = '陶攀的端午节赠礼'

export const basicQuizzes: Quiz[] = [
  {
    id: 'mbti',
    question: '陶攀的 MBTI 是？',
    answer: 'A',
    options: [
      { label: 'A', text: 'INFP' },
      { label: 'B', text: 'INTP' },
      { label: 'C', text: 'ENFP' },
      { label: 'D', text: 'INFJ' },
    ],
  },
  {
    id: 'zodiac',
    question: '陶攀的星座？',
    answer: 'C',
    options: [
      { label: 'A', text: '天蝎座' },
      { label: 'B', text: '水瓶座' },
      { label: 'C', text: '巨蟹座' },
      { label: 'D', text: '处女座' },
    ],
  },
  {
    id: 'height',
    question: '陶攀的身高？',
    answer: 'B',
    options: [
      { label: 'A', text: '178' },
      { label: 'B', text: '179' },
      { label: 'C', text: '180' },
      { label: 'D', text: '190' },
    ],
  },
  {
    id: 'fruit',
    question: '陶攀最喜欢的水果？',
    answer: 'D',
    options: [
      { label: 'A', text: '西瓜' },
      { label: 'B', text: '菠萝' },
      { label: 'C', text: '桃子' },
      { label: 'D', text: '葡萄' },
    ],
  },
  {
    id: 'singer',
    question: '陶攀最喜欢的歌手？',
    answer: 'B',
    options: [
      { label: 'A', text: '周杰伦' },
      { label: 'B', text: '许嵩' },
      { label: 'C', text: '林俊杰' },
      { label: 'D', text: '薛之谦' },
    ],
  },
]

export const advancedQuizzes: Quiz[] = [
  {
    id: 'movie-type',
    question: '陶攀最喜欢下面哪种电影类型？',
    answer: 'D',
    options: [
      { label: 'A', text: '喜剧片' },
      { label: 'B', text: '动作片' },
      { label: 'C', text: '科幻片' },
      { label: 'D', text: '悬疑片' },
    ],
  },
  {
    id: 'novel',
    question: '陶攀最喜欢下面哪本小说？',
    answer: 'B',
    options: [
      { label: 'A', text: '龙族' },
      { label: 'B', text: '三体' },
      { label: 'C', text: '雪中悍刀行' },
      { label: 'D', text: '全职高手' },
    ],
  },
  {
    id: 'sport',
    question: '陶攀最喜欢下面哪种运动？',
    answer: 'C',
    options: [
      { label: 'A', text: '跑步' },
      { label: 'B', text: '骑行' },
      { label: 'C', text: '爬山' },
      { label: 'D', text: '游泳' },
    ],
  },
  {
    id: 'gpu',
    question: '陶攀的显卡型号是？',
    answer: 'A',
    options: [
      { label: 'A', text: '4080s' },
      { label: 'B', text: '4070ti' },
      { label: 'C', text: '5060' },
      { label: 'D', text: '5070ti' },
    ],
  },
]

export const prizePool: Prize[] = [
  {
    type: 'text',
    name: '一杯奶茶',
  },
  {
    type: 'red-packet',
    name: '一个红包',
    min: 2,
    max: 15,
  },
  {
    type: 'text',
    name: '陶攀的一个真心话',
  },
  {
    type: 'text',
    name: '陶攀自罚三杯',
  },
  {
    type: 'text',
    name: '任意点一首歌陶攀来唱',
  },
  {
    type: 'text',
    name: '敬请期待',
  },
]

const rotations = [-8, 5, -4, 7, 0, -7, 4, -5, 8]

export const zongziItems: ZongziItem[] = Array.from({ length: 9 }, (_, index) => ({
  id: index,
  label: `幸运粽子 ${index + 1}`,
  rotate: rotations[index] ?? 0,
}))
