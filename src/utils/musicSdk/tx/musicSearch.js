import { httpFetch } from '../../request'
import { formatPlayTime, sizeFormate } from '../../index'
import { formatSingerName } from '../utils'

export default {
  limit: 30,
  total: 0,
  page: 0,
  allPage: 1,
  successCode: 0,
  // musicSearch 函数负责发起 HTTP 请求
  musicSearch(str, page, limit, retryNum = 0) {
    if (retryNum > 5) return Promise.reject(new Error('搜索失败'))

    // 使用 httpFetch 发送 POST 请求
    const searchRequest = httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'post',
      headers: {
        // 新接口
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
        'Content-Type': 'application/json;charset=utf-8',
        Accept: 'application/json, text/plain, */*',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      body: {
        // comm 模块, "cv":"1859" 和 "uin":"0" 是免 cookie 的关键
        comm: {
          ct: '19',
          cv: '1859',
          uin: '0', // uin 为 0, 表示游客身份
        },
        req: {
          module: 'music.search.SearchCgiService',
          // 调用的方法改为 DoSearchForQQMusicDesktop
          method: 'DoSearchForQQMusicDesktop',
          // param 传入搜索参数
          param: {
            grp: 1,
            // 搜索关键词
            query: str,
            // 搜索类型: 0 为歌曲
            search_type: 0,
            // 每页返回的结果数量
            num_per_page: limit,
            // 页面序号
            page_num: page,
          },
        },
      },
    })

    // 处理请求的 Promise
    return searchRequest.promise.then(({ body }) => {
      console.log(body)
      // console.log(body)
      // 检查返回码，如果失败则重试
      if (body.code != this.successCode || body.req.code != this.successCode) return this.musicSearch(str, page, limit, ++retryNum)
      // 成功则返回 req.data, 里面包含了 body 和 meta
      return body.req.data
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
    return this.musicSearch(str, page, limit).then(({ body, meta }) => {
      // 旧接口的歌曲列表路径是 body.item_song
      // let list = this.handleResult(body.item_song)
      //
      // 新接口(DoSearchForQQMusicDesktop)的歌曲列表路径是 body.song.list
      let list = this.handleResult(body.song.list)
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
