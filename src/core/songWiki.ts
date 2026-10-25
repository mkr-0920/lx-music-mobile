// 歌曲音乐百科状态管理
// 按 songId 缓存(LRU 上限 20)，暴露 getSongWiki 给 Wiki 屏拉取。
// 仅对 source === 'wy' 的歌曲生效；当前播放歌曲的判断由调用方（Wiki 屏）传入。
import musicSdk from '@/utils/musicSdk'

export interface WikiData {
  // 创作信息正文
  about: string | null
  // 基本信息 [{ label: 曲风/语种/发行时间..., value }]
  baseInfo: Array<{ label: string, value: string }>
  // 其他文本区块 [{ title: 乐评..., content }]
  sections: Array<{ title: string, content: string }>
}

const CACHE_LIMIT = 20
const cache = new Map<string, WikiData>()

/**
 * 拉取并归一化百科信息（带缓存）。调用方负责 loading/error 态与 wy 源判断。
 */
export const getSongWiki = async(songId: string): Promise<WikiData> => {
  const key = String(songId)
  const cached = cache.get(key)
  if (cached) return cached

  const wy = musicSdk.wy
  if (!wy?.wiki) throw new Error('wiki 模块未就绪')

  const data = await wy.wiki.getWiki(songId)
  // LRU：超限删除最早的
  if (cache.size >= CACHE_LIMIT) {
    const firstKey = cache.keys().next().value
    if (firstKey != null) cache.delete(firstKey)
  }
  cache.set(key, data)
  return data
}

/** 清除指定歌曲的百科缓存（重试时用） */
export const clearSongWikiCache = (songId?: string) => {
  if (songId == null) cache.clear()
  else cache.delete(String(songId))
}
