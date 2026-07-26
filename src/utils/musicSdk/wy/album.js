import { generateCacheKey } from './utils/crypto'
import musicDetailApi from './musicDetail'
// 详情神仙接口依然需要咱们前面改好的底层强力 eapiRequest
import { oldEapiRequest, eapiRequest } from './utils/index'

export default {
  successCode: 200,

  /**
   * 1. 搜索专辑列表
   */
  search(text, page, limit = 20) {
    return oldEapiRequest('/api/cloudsearch/pc', {
      s: text,
      type: 10,
      limit,
      total: true,
      offset: limit * (page - 1),
    }).promise.then(({ body }) => {
      if (body.code != this.successCode) throw new Error('search failed')
      return {
        // 取出 albums 数组并洗数据
        list: this.filterList(body.result.albums || []),
        limit,
        total: body.result.albumCount || 0,
        source: 'wy',
      }
    })
  },

  filterList(rawData) {
    return rawData.map(item => ({
      id: String(item.id),
      name: item.name || '',
      singer: item.artist ? item.artist.name : '',
      author: item.artist ? item.artist.name : '',
      publishTime: item.publishTime ? this.dateFormat(item.publishTime) : '',
      img: item.picUrl ? `${item.picUrl}?param=300y300` : '',
      desc: item.description || '',
      size: item.size || 0,
      company: item.company || '',
      source: 'wy',
      type: 'album',
    }))
  },

  dateFormat(time) {
    const date = new Date(time)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  },

  /**
   * 2. 获取专辑详情及完整歌曲列表
   */
  async getAlbumDetail(id) {
    const paramsForCacheKey = { id: String(id), e_r: 'false' }
    const cacheKey = generateCacheKey(paramsForCacheKey)

    const detailRequest = eapiRequest('/api/album/v3/detail', {
      id: String(id),
      e_r: 'false',
      cache_key: cacheKey,
      header: '{}',
    }, 'mobile')

    const { body } = await detailRequest.promise

    if (body.code !== 200) throw new Error('获取网易云专辑详情失败')

    const songIds = (body.songs || []).map(song => song.id)

    let list = []
    if (songIds.length > 0) {
      const detailResult = await musicDetailApi.getList(songIds)
      list = detailResult.list
    }

    let publishTime = ''
    if (body.album && body.album.publishTime) {
      publishTime = this.dateFormat(body.album.publishTime)
    }

    return {
      list,
      source: 'wy',
      info: {
        name: body.album?.name || '',
        singer: body.album?.artist?.name || '',
        img: body.album?.picUrl || '',
        desc: body.album?.description || '暂无专辑简介',
        publishTime,
        company: body.album?.company || '',
        play_count: '',
      },
    }
  },
}
