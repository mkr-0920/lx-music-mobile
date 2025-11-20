// [文件: src/renderer/utils/musicSdk/mkr/leaderboard_user.js]

import { httpFetch } from '../../request'
// 导入 linuxapi 加密函数
import { linuxapi } from '../wy/utils/crypto'
import { eapiRequest } from '../wy/utils/index'
import { formatPlayTime, sizeFormate, formatPlayCount } from '../../index'
import musicDetailApi from '../wy/musicDetail'
import { formatSingerName } from '../utils'

// --- 辅助函数: 解析 linuxapi 返回的 tracks ---
const filterListDetail = ({ playlist: { tracks }, privileges }) => {
  const list = []
  if (!tracks || !privileges) return list

  tracks.forEach((item, index) => {
    const types = []
    const _types = {}
    let size
    let privilege = privileges[index]
    if (privilege && privilege.id !== item.id) {
      privilege = privileges.find(p => p.id === item.id)
    }
    if (!privilege) return

    // 解析音质 (参考 songList.js 逻辑)
    if (privilege.maxBrLevel == 'hires') {
      size = item.hr ? sizeFormate(item.hr.size) : null
      types.push({ type: 'flac24bit', size })
      _types.flac24bit = { size }
    }
    switch (privilege.maxbr) {
      case 999000:
        size = item.sq ? sizeFormate(item.sq.size) : null
        types.push({ type: 'flac', size })
        _types.flac = { size }
        // fallthrough
      case 320000:
        size = item.h ? sizeFormate(item.h.size) : null
        types.push({ type: '320k', size })
        _types['320k'] = { size }
        // fallthrough
      case 192000:
      case 128000:
        size = item.l ? sizeFormate(item.l.size) : null
        types.push({ type: '128k', size })
        _types['128k'] = { size }
    }
    types.reverse()

    const songInfo = {
      source: 'wy',
      interval: formatPlayTime(item.dt / 1000),
      songmid: item.id,
      img: item.al?.picUrl,
      lrc: null,
      otherSource: null,
      types,
      _types,
      typeUrl: {},
      privilege,
    }

    if (item.pc) {
      songInfo.singer = item.pc.ar ?? ''
      songInfo.name = item.pc.sn ?? ''
      songInfo.albumName = item.pc.alb ?? ''
      songInfo.albumId = item.al?.id
    } else {
      songInfo.singer = formatSingerName(item.ar, 'name')
      songInfo.name = item.name ?? ''
      songInfo.albumName = item.al?.name
      songInfo.albumId = item.al?.id
    }

    list.push(songInfo)
  })
  return list
}

export default {
  /**
   * 获取用户歌单列表
   */
  getBoards: async(uid = '3891360967') => {
    const requestObj = eapiRequest(
      '/api/user/playlist/',
      {
        offset: '0',
        limit: '1000',
        uid: String(uid),
        e_r: true,
      },
      'mobile',
    )

    return requestObj.promise.then(({ body }) => {
      const list = []
      if (body.code === 200 && body.playlist) {
        body.playlist.forEach(item => {
          list.push({
            id: `mkr__${item.id}`,
            name: item.name,
            bangid: String(item.id),
          })
        })
      }
      return {
        list,
        source: 'mkr',
      }
    })
  },

  /**
   * 获取歌单内歌曲详情
   * 使用 linuxapi + httpFetch
   * 逻辑：获取全量 ID -> 批量获取详情 -> 一次性返回
   */
  getList: async(bangid, page) => {
    // 使用 linuxapi 请求 /api/v3/playlist/detail
    const requestObj = httpFetch('https://music.163.com/api/linux/forward', {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        Cookie: 'MUSIC_U=', // linuxapi 似乎对 cookie 要求不高，或者使用默认
      },
      form: linuxapi({
        method: 'POST',
        url: 'https://music.163.com/api/v3/playlist/detail',
        params: {
          id: bangid,
          n: 100000, // 尝试获取所有 ID
          s: 8,
        },
      }),
    })

    const { body } = await requestObj.promise
    if (!body || body.code !== 200) {
      throw new Error('Failed to load playlist')
    }

    // 拿到所有 trackIds
    const trackIds = body.playlist.trackIds || []
    let list = []

    // 情况 A: API 直接返回了完整的 tracks 数据
    if (body.playlist.tracks && body.playlist.tracks.length === trackIds.length) {
      list = filterListDetail(body)
    } else {
      const allIds = trackIds.map(t => t.id)

      // 【关键】内部循环：分批获取所有歌曲详情
      const BATCH_SIZE = 500
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const chunkIds = allIds.slice(i, i + BATCH_SIZE)
        if (chunkIds.length > 0) {
          try {
            const detailResult = await musicDetailApi.getList(chunkIds)
            list.push(...detailResult.list)
          } catch (e) {
            console.error('[WY User] Batch fetch error:', e)
          }
        }
      }
    }

    // 返回单页长列表
    return {
      list,
      total: list.length,
      limit: list.length + 1, // 确保不显示分页器
      page: 1,
      source: 'wy',
      info: {
        play_count: formatPlayCount(body.playlist.playCount),
        name: body.playlist.name,
        img: body.playlist.coverImgUrl,
        desc: body.playlist.description,
        author: body.playlist.creator?.nickname,
      },
    }
  },
}
