export type SearchType = 'music' | 'album' | 'artist' | 'songlist'

export interface InitState {
  temp_source: 'wy'
  // temp_source: LX.OnlineSource
  searchType: SearchType
  searchText: string
  tipListInfo: {
    text: string
    source: 'wy'
    list: string[]
  }
  historyList: string[]
}

const state: InitState = {
  temp_source: 'wy',
  searchType: 'music',
  searchText: '',
  tipListInfo: {
    text: '',
    source: 'wy',
    list: [],
  },
  historyList: [],
}


export default state
