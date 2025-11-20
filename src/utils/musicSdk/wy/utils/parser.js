// [文件: src/renderer/utils/musicSdk/wy/utils/parser.js]

import { sizeFormate, formatPlayTime } from '../../../index'

/**
 * 统一处理歌手字段
 * 兼容 ar (Search/Daily) 和 artists (FM)
 */
export const getSinger = (singers) => {
  if (!singers || !Array.isArray(singers)) return ''
  const arr = []
  singers.forEach(singer => {
    arr.push(singer.name)
  })
  return arr.join('、')
}

/**
 * 核心：通用歌曲解析函数
 * 能够自动识别并适配 Search, Daily, FM 等不同接口的 JSON 结构
 */
export const handleResult = (rawList) => {
  if (!rawList) return []

  return rawList.map(rawItem => {
    // 【结构适配】 处理 Search 接口特殊的嵌套结构
    // Search 接口返回的是 { baseInfo: { simpleSongData: { ... } } }
    // Daily/FM 接口直接返回 { ... }
    const item = rawItem.baseInfo?.simpleSongData || rawItem

    // 过滤无效项 (Search 接口可能会返回非歌曲类型的资源)
    // 这里的判断标准是：必须有 id 和 name
    if (!item || !item.id || !item.name) return null

    // 【版权检查】 (可选，根据需求决定是否开启)
    // if (item.privilege?.pl === 0 && item.fee !== 0) return null

    const types = []
    const _types = {}

    // 【音质适配】 兼容 x (Search/Daily) 和 xMusic (FM)
    const l = item.l || item.lMusic
    const m = item.m || item.mMusic
    const h = item.h || item.hMusic
    const sq = item.sq || item.sqMusic
    const hr = item.hr || item.hrMusic

    if (l) {
      const size = sizeFormate(l.size)
      types.push({ type: '128k', size })
      _types['128k'] = { size }
    }
    if (m) {
      const size = sizeFormate(m.size)
      types.push({ type: '192k', size })
      _types['192k'] = { size }
    }
    if (h) {
      const size = sizeFormate(h.size)
      types.push({ type: '320k', size })
      _types['320k'] = { size }
    }

    // 无损/高解析 (结合 privilege 和 sq/hr 对象)
    const maxBrLevel = item.privilege?.maxBrLevel
    const playMaxBrLevel = item.privilege?.playMaxBrLevel
    const plLevel = item.privilege?.plLevel
    const dlLevel = item.privilege?.dlLevel

    if (sq || maxBrLevel === 'lossless' || playMaxBrLevel === 'lossless' || plLevel === 'lossless' || dlLevel === 'lossless') {
      const size = sq ? sizeFormate(sq.size) : null
      types.push({ type: 'flac', size })
      _types.flac = { size }
    }

    if (hr || maxBrLevel === 'hires' || playMaxBrLevel === 'hires' || plLevel === 'hires' || dlLevel === 'hires') {
      const size = hr ? sizeFormate(hr.size) : null
      types.push({ type: 'flac24bit', size })
      _types.flac24bit = { size }
    }

    // 新音质标签
    if (maxBrLevel === 'jymaster' || playMaxBrLevel === 'jymaster' || plLevel === 'jymaster' || dlLevel === 'jymaster') {
      // console.log('添加jymaster音质')
      types.push({ type: 'master', size: null })
      _types.master = { size: null }
    } else if (maxBrLevel === 'sky') _types.sky = { size: null }
    else if (maxBrLevel === 'jyeffect') _types.jyeffect = { size: null }

    // 【基本信息适配】
    // 歌手: ar vs artists
    const artists = item.ar || item.artists || []
    // 专辑: al vs album
    const album = item.al || item.album || {}
    // 时长: dt vs duration
    const duration = item.dt || item.duration || 0

    return {
      singer: getSinger(artists),
      name: item.name,
      albumName: album.name,
      albumId: album.id,
      source: 'wy', // 必须是 wy
      interval: formatPlayTime(duration / 1000),
      songmid: item.id,
      img: album.picUrl,
      lrc: null,
      types,
      _types,
      typeUrl: {},
      privilege: item.privilege,
    }
  }).filter(Boolean)
}
