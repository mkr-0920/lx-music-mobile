import { get } from './http'
import { apis } from '../api-source'

const PLAY_INFO_CACHE_TTL = 30_000
const playInfoCache = new Map()

/**
 * 获取歌曲元数据详情。仅用于封面、歌词、歌曲信息等非播放链接数据。
 */
export const getPlayInfo = async(songmid) => {
  if (!songmid) return Promise.reject(new Error('歌曲 ID 无效'))

  const now = Date.now()
  const cache = playInfoCache.get(songmid)
  if (cache && now - cache.time < PLAY_INFO_CACHE_TTL) return cache.promise

  const promise = get('/local/play_info/' + songmid).catch(err => {
    playInfoCache.delete(songmid)
    throw err
  })
  playInfoCache.set(songmid, {
    time: now,
    promise,
  })
  return promise
}

/**
 * 获取播放链接
 * 播放链接必须由用户导入的外部脚本提供，源码侧只保留元数据获取能力。
 */
export const getMusicUrl = (songInfo, type) => {
  try {
    const api = apis('mkr')
    if (!api?.getMusicUrl) throw new Error('当前自定义源不支持 mkr 播放链接获取')
    return api.getMusicUrl(songInfo, type)
  } catch (err) {
    return {
      promise: Promise.reject(err),
      cancelHttp: () => {},
    }
  }
}

/**
 * 获取歌曲封面链接
 * @param {object} songInfo 包含 songmid 的歌曲信息对象
 * @returns {Promise<string | null>} 一个 Promise，解析为封面 URL 字符串，如果找不到则为 null
 */
export const getPic = (songInfo) => {
  // 直接返回 getPlayInfo 启动的 Promise 链
  return getPlayInfo(songInfo.songmid).then(playInfo => {
    if (!playInfo || !playInfo.cover_url) {
      return null // Promise 将解析为 null
    }
    return playInfo.cover_url // Promise 将解析为封面 URL
  })
}

/**
 * 获取歌曲详情
 */
export const getMusicInfo = (songInfo) => {
  const promise = getPlayInfo(songInfo.songmid).then(playInfo => {
    return {
      ...songInfo,
      name: playInfo.title ? playInfo.title.split(' - ').slice(1).join(' - ').trim() : songInfo.name,
      singer: playInfo.artist || songInfo.singer,
      albumName: playInfo.album || songInfo.albumName,
      img: playInfo.cover_url || songInfo.img,
    }
  })
  return { promise, cancelHttp: () => {} }
}
