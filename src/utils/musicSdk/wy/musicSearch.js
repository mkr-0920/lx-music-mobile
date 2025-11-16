import { sizeFormate, formatPlayTime } from '../../index'
import { eapiRequest } from './utils/index'

export default {
  limit: 20,
  total: 0,
  page: 0,
  allPage: 1,
  musicSearch(str, page, limit) {
    const searchRequest = eapiRequest('/api/search/song/list/page', {
      keyword: str,
      scene: 'normal',
      limit: String(limit),
      offset: String(limit * (page - 1)),
      needCorrect: 'true',
      channel: 'typing',
      e_r: true,
    })
    // // 返回解密后的 body
    return searchRequest.promise.then(({ body }) => body)
  },

  getSinger(singers) {
    let arr = []
    singers.forEach(singer => {
      arr.push(singer.name)
    })
    return arr.join('、')
  },

  handleResult(rawList) {
    if (!rawList) return []
    return rawList.map(resource => {
      const item = resource.baseInfo?.simpleSongData
      if (!item) return null // 过滤掉 "用户"、"歌单" 等非歌曲资源
      const types = []
      const _types = {}
      let size

      // 按 l, m, h, sq, hr 的顺序添加音质
      if (item.l) {
        size = sizeFormate(item.l.size)
        types.push({ type: '128k', size })
        _types['128k'] = { size }
      }
      if (item.h) {
        size = sizeFormate(item.h.size)
        types.push({ type: '320k', size })
        _types['320k'] = { size }
      }
      if (item.sq) {
        size = sizeFormate(item.sq.size)
        types.push({ type: 'flac', size })
        _types.flac = { size }
      }
      if (item.hr) {
        size = sizeFormate(item.hr.size)
        types.push({ type: 'flac24bit', size })
        _types.flac24bit = { size }
      }

      // 检查新音质 (jymaster, sky, jyeffect)
      const maxBrLevel = item.privilege?.maxBrLevel
      if (maxBrLevel === 'jymaster') {
        console.log('添加jymaster音质')
        types.push({ type: 'master', size: null })
        _types.master = { size: null }
      } else if (maxBrLevel === 'sky') {
        _types.sky = { size: null }
      } else if (maxBrLevel === 'jyeffect') {
        _types.jyeffect = { size: null }
      }
      return {
        singer: this.getSinger(item.ar),
        name: item.name,
        albumName: item.al.name,
        albumId: item.al.id,
        source: 'wy',
        interval: formatPlayTime(item.dt / 1000), // 新接口时长是毫秒
        songmid: item.id,
        img: item.al.picUrl,
        lrc: null,
        types,
        _types,
        typeUrl: {},
        // 把 privilege 暴露出去, 供 music.js 判断
        privilege: item.privilege,
      }
    }).filter(Boolean) // 只过滤掉 "用户" 等非歌曲项
  },

  search(str, page = 1, limit, retryNum = 0) {
    if (++retryNum > 3) return Promise.reject(new Error('try max num'))
    if (limit == null) limit = this.limit
    // console.log(`[WY search] 正在尝试第 ${retryNum} 次搜索: "${str}"`)
    return this.musicSearch(str, page, limit).then(result => {
      //  console.log(`[WY search] 第 ${retryNum} 次尝试, 收到的 result:`, result)
      if (!result || result.code !== 200) {
        //  console.warn(`[WY search] 第 ${retryNum} 次尝试失败... (Code: ${result?.code})`)
        return this.search(str, page, limit, retryNum)
      }
      let list = this.handleResult(result.data?.resources || [])
      if (list == null) { // handleResult 不会返回 null, 但以防万一
        return this.search(str, page, limit, retryNum)
      }

      this.total = result.data?.totalCount || 0
      this.page = page
      this.allPage = Math.ceil(this.total / this.limit)

      return {
        list,
        allPage: this.allPage,
        limit: this.limit,
        total: this.total,
        source: 'wy',
      }
    })
  },
}
