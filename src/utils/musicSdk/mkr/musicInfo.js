import { get } from './http'

/**
 * 【核心】获取播放详情 (复用函数)
 * 这个函数保持 'async' 因为它只在内部被调用
 */
export const getPlayInfo = async(songmid) => {
  if (!songmid) return Promise.reject(new Error('歌曲 ID 无效'))

  console.log('[MyMusic] 正在为 songmid: ' + songmid + ' 调用 /play_info')
  const promise = get('/local/play_info/' + songmid)

  promise.then(
    (data) => {
      console.log('[MyMusic] /local/play_info/' + songmid + ' 成功返回:', data)
    },
    (err) => {
      console.error('[MyMusic] /local/play_info/' + songmid + ' 失败:', err)
    },
  )
  return promise
}

/**
 * 获取播放链接
 */
export const getMusicUrl = (songInfo, type) => {
  const promise = getPlayInfo(songInfo.songmid).then(playInfo => {
    if (!playInfo || !playInfo.url) {
      console.error('[MyMusic] getMusicUrl 失败: API 响应中没有找到 "url" 字段', playInfo)
      throw new Error('获取播放链接失败: 缺少 url 字段')
    }

    console.log('[MyMusic] getMusicUrl 成功，播放链接: ' + playInfo.url)
    const quality = playInfo.quality ?? '128k'
    return {
      url: playInfo.url,
      type: quality,
    }
  })
  return {
    promise,
    cancelHttp: () => {},
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
      console.warn('[MyMusic] getPic 警告: API 响应中没有找到 "cover_url" 字段', playInfo)
      return null // Promise 将解析为 null
    }
    console.log('[MyMusic] 获取封面成功')
    return playInfo.cover_url // Promise 将解析为封面 URL
  })
}

/**
 * 获取歌曲详情
 */
export const getMusicInfo = (songInfo) => {
  const promise = getPlayInfo(songInfo.songmid).then(playInfo => {
    console.log('[MyMusic] 获取歌曲详情成功')
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
