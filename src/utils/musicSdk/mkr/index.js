import musicSearch from './musicSearch'
import getLyric from './lyric'
import { getMusicUrl, getPic, getMusicInfo } from './musicInfo'
import leaderboard from './leaderboard'

// --- 为未实现的功能添加“桩” ---

const hotSearch = {
  getList: () => Promise.resolve({
    list: [],
    source: 'mkr',
  }),
}
const songList = {
  getTags: () => Promise.resolve({
    list: [],
    source: 'mkr',
  }),
  getList: (tagId, page) => Promise.resolve({
    list: [],
    allPage: 1,
    limit: 30,
    total: 0,
    source: 'mkr',
  }),
  getListDetail: (id) => Promise.resolve({
    list: [],
    source: 'mkr',
  }),
  search: (text, page, limit = 30) => Promise.resolve({
    list: [],
    allPage: 1,
    limit,
    total: 0,
    source: 'mkr',
  }),
  sortList: [],
}
const tipSearch = () => Promise.resolve({
  list: [],
  source: 'mkr',
})

// --- 组装并导出 "mkr" 源 ---
const mkr = {
  musicSearch,
  getLyric,
  getMusicUrl,
  getPic,
  getMusicInfo,

  // --- 添加的“桩” ---
  hotSearch,
  leaderboard,
  songList,
  tipSearch,
}

export default mkr
