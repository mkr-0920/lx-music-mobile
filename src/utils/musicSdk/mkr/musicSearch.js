import { get } from './http'
// 导入 LX Music 的时长格式化工具
import { formatPlayTime } from '../../index'

/**
 * 将你的 API 返回的歌曲对象 转换为 LX Music 的标准格式
 * @param {object} apiSong 你 API 返回的单首歌曲对象
 * @returns {object} LX Music 标准歌曲对象
 */
const formatSongInfo = (apiSong) => {
  // 1. 使用你 API 提供的 'artist' 字段
  const artist = apiSong.artist || ''
  // 2. 从 'title' 中提取歌名 (移除歌手前缀)
  const name = apiSong.title || ''

  // 3. 构建 types 和 _types
  const types = []
  const _types = {}
  const size = apiSong.size
  switch (apiSong.quality) {
    case 'master':
      types.push({ type: 'master', size })
      _types.master = { size }
      break
    case 'flac':
      types.push({ type: 'flac', size })
      _types.flac = { size }
      break
    case '320k':
      types.push({ type: '320k', size })
      _types['320k'] = { size }
      break
    case '128k':
    default:
      types.push({ type: '128k', size })
      _types['128k'] = { size }
      break
  }

  // 4. 格式化时长
  const intervalMs = apiSong.duration_ms || 0
  const intervalInSeconds = intervalMs / 1000
  const intervalString = formatPlayTime(intervalInSeconds)

  // 5. 返回标准对象
  return {
    singer: artist,
    name,
    albumName: apiSong.album,
    albumId: null, // 你的 API 暂无
    source: 'mkr',
    interval: intervalString, // "mm:ss" 字符串
    songmid: apiSong.id, // 原始 ID
    img: null, // 播放时 getPic 会获取
    lrc: null,
    otherSource: null,
    types,
    _types,
    typeUrl: {},
  }
}

/**
 * 搜索功能
 */
const search = async(query, page = 1, limit = 30) => {
  // 1. 转换分页参数
  const offset = (page - 1) * limit

  // 2. 调用 API
  const params = {
    q: query,
    mode: 'any',
    limit,
    offset,
  }
  const responseData = await get('/local/search', params)

  // 3. 从 'responseData.songs' 获取列表
  const list = responseData.songs.map(formatSongInfo)

  // 4. 从 'responseData.total_count' 获取总数
  const total = responseData.total_count
  const allPage = Math.ceil(total / limit)

  // 5. 返回 LX Music 标准的"页面对象"
  return {
    list,
    allPage,
    limit,
    total,
    source: 'mkr',
  }
}

export default {
  search,
}
