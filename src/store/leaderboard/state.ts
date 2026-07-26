import music from '@/utils/musicSdk'

export declare type Source = LX.LeaderboardSource

export declare interface BoardItem {
  id: string
  name: string
  bangid: string
}
export declare interface Board {
  list: BoardItem[]
  source: Source
}
type Boards = Partial<Record<Source, Board>>

export declare interface ListDetailInfo {
  list: LX.Music.MusicInfoOnline[]
  total: number
  maxPage: number
  page: number
  source: Source | null
  limit: number
  key: string | null
  id: string
}

export interface InitState {
  sources: Source[]
  boards: Boards
  listDetailInfo: ListDetailInfo
}

const state: InitState = {
  sources: [],
  boards: {},
  listDetailInfo: {
    list: [],
    total: 0,
    page: 1,
    maxPage: 1,
    limit: 30,
    key: null,
    source: null,
    id: '',
  },
}

for (const source of music.sources) {
  if (source.id == 'mkr') continue
  if (!music[source.id as Source]?.leaderboard?.getBoards) continue
  state.sources.push(source.id as Source)
}


export default state
