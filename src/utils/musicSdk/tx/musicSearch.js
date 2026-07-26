import { httpFetch } from '../../request'
import { formatPlayTime, sizeFormate } from '../../index'
import { formatSingerName } from '../utils'

const NETWORK_RETRY_LIMIT = 5
const NETWORK_RETRY_DELAY = 500

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export default {
  limit: 30,
  total: 0,
  page: 0,
  allPage: 1,
  successCode: 0,
  // musicSearch 函数负责发起 HTTP 请求
  musicSearch(str, page, limit, retryNum = 0, mode = 'desktop', desktopReqCode = null) {
    if (retryNum > NETWORK_RETRY_LIMIT) return Promise.reject(new Error('QQ音乐搜索网络请求失败'))

    const isLite = mode == 'lite'

    // 使用 httpFetch 发送 POST 请求
    const searchRequest = httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'post',
      headers: {
        'User-Agent': isLite
          ? 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
        'Content-Type': 'application/json;charset=utf-8',
        Accept: 'application/json, text/plain, */*',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      body: {
        comm: isLite
          ? {
              ct: 11,
              cv: '1003006',
              v: '1003006',
              os_ver: '12',
              phonetype: '0',
              devicelevel: '31',
              tmeAppID: 'qqmusiclight',
              nettype: 'NETWORK_WIFI',
            }
          : {
              ct: '19',
              cv: '1859',
              uin: '0',
            },
        req: {
          module: 'music.search.SearchCgiService',
          method: isLite ? 'DoSearchForQQMusicLite' : 'DoSearchForQQMusicDesktop',
          param: {
            grp: 1,
            query: str,
            search_type: 0,
            num_per_page: limit,
            page_num: page,
            ...(isLite ? { nqc_flag: 0 } : {}),
          },
        },
      },
    })

    // 处理请求的 Promise
    return searchRequest.promise.then(({ body }) => {
      console.log('[tx search response]', {
        mode,
        code: body?.code,
        reqCode: body?.req?.code,
        message: body?.req?.message ?? body?.message,
        songCount: isLite
          ? body?.req?.data?.body?.item_song?.length
          : body?.req?.data?.body?.song?.list?.length,
      })

      const outerCode = body?.code
      const reqCode = body?.req?.code
      if (outerCode == this.successCode && reqCode == this.successCode) {
        const data = body.req.data
        return {
          list: isLite ? data.body.item_song : data.body.song.list,
          meta: data.meta,
        }
      }

      if (!isLite && reqCode == 2001) {
        return this.musicSearch(str, page, limit, 0, 'lite', reqCode)
      }

      const codes = isLite
        ? `Desktop req.code=${desktopReqCode ?? 'unknown'}, Lite req.code=${reqCode ?? 'unknown'}`
        : `code=${outerCode ?? 'unknown'}, req.code=${reqCode ?? 'unknown'}`
      const error = new Error(`QQ音乐搜索失败: ${codes}`)
      error.isBusinessError = true
      throw error
    }).catch(async(err) => {
      if (err.isBusinessError || err.isSearchTerminalError) throw err
      if (retryNum >= NETWORK_RETRY_LIMIT) {
        const error = new Error(`QQ音乐搜索网络请求失败: ${err.message}`)
        error.isSearchTerminalError = true
        throw error
      }
      await delay(NETWORK_RETRY_DELAY * (retryNum + 1))
      return this.musicSearch(str, page, limit, retryNum + 1, mode, desktopReqCode)
    })
  },
  // handleResult 函数负责格式化原始数据
  handleResult(rawList) {
    // console.log(rawList)
    const list = []
    rawList.forEach(item => {
      // 过滤掉没有 media_mid 的无效歌曲
      if (!item.file?.media_mid) return

      // 处理音质、文件大小的逻辑
      let types = []
      let _types = {}
      const file = item.file
      if (file.size_128mp3 != 0) {
        let size = sizeFormate(file.size_128mp3)
        types.push({ type: '128k', size })
        _types['128k'] = {
          size,
        }
      }
      if (file.size_320mp3 !== 0) {
        let size = sizeFormate(file.size_320mp3)
        types.push({ type: '320k', size })
        _types['320k'] = {
          size,
        }
      }
      if (file.size_flac !== 0) {
        let size = sizeFormate(file.size_flac)
        types.push({ type: 'flac', size })
        _types.flac = {
          size,
        }
      }
      if (file.size_hires !== 0) {
        let size = sizeFormate(file.size_hires)
        types.push({ type: 'flac24bit', size })
        _types.flac24bit = {
          size,
        }
      }
      if (file.size_new && file.size_new[0] !== 0) {
        let size = sizeFormate(file.size_new[0])
        types.push({ type: 'master', size })
        _types.master = {
          size,
        }
      }
      // 处理专辑、歌手名的逻辑不变
      let albumId = ''
      let albumName = ''
      if (item.album) {
        albumName = item.album.name
        albumId = item.album.mid
      }

      // 组装成标准音乐对象, 逻辑不变
      list.push({
        singer: formatSingerName(item.singer, 'name'),
        name: item.name + (item.title_extra ?? ''),
        albumName,
        albumId,
        source: 'tx',
        interval: formatPlayTime(item.interval),
        songId: item.id,
        albumMid: item.album?.mid ?? '',
        strMediaMid: item.file.media_mid,
        songmid: item.mid,
        img: (albumId === '' || albumId === '空')
          ? item.singer?.length ? `https://y.gtimg.cn/music/photo_new/T001R500x500M000${item.singer[0].mid}.jpg` : ''
          : `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albumId}.jpg`,
        types,
        _types,
        typeUrl: {},
      })
    })
    // console.log(list)
    return list
  },
  // search 是最终导出的搜索方法
  search(str, page = 1, limit) {
    if (limit == null) limit = this.limit
    // 调用 musicSearch 获取数据
    return this.musicSearch(str, page, limit).then(({ list: rawList, meta }) => {
      const list = this.handleResult(rawList)
      // 处理分页和总数
      this.total = meta.estimate_sum
      this.page = page
      this.allPage = Math.ceil(this.total / limit)

      return Promise.resolve({
        list,
        allPage: this.allPage,
        limit,
        total: this.total,
        source: 'tx',
      })
    })
  },
}
