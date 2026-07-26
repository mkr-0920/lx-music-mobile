import searchSonglistState, { type Source, type ListInfoItem } from '@/store/search/songlist/state'
import searchSonglistActions, { type SearchResult } from '@/store/search/songlist/action'
import musicSdk from '@/utils/musicSdk'

export const setSource: typeof searchSonglistActions['setSource'] = (source) => {
  searchSonglistActions.setSource(source)
}
export const setSearchText: typeof searchSonglistActions['setSearchText'] = (text) => {
  searchSonglistActions.setSearchText(text)
}
const setListInfo: typeof searchSonglistActions.setListInfo = (result, page, text) => {
  return searchSonglistActions.setListInfo(result, page, text)
}

export const clearListInfo: typeof searchSonglistActions.clearListInfo = (source) => {
  searchSonglistActions.clearListInfo(source)
}

// 【核心修改一】：加入 type 参数，默认值是 'songlist' 以兼容老代码
export const search = async(text: string, page: number, sourceId: Source, type: 'songlist' | 'album' = 'songlist'): Promise<ListInfoItem[]> => {
  const listInfo = searchSonglistState.listInfos[sourceId]!

  // 【核心修改二】：把 type 拼进 cache_key，防止用户搜完歌单切到专辑时直接读了歌单的错误缓存！
  const key = `${page}__${sourceId}__${text}__${type}`

  // 【核心修改三】：动态确定底层 API 目标！如果是 album，就去调神仙接口！
  const targetApi = type === 'album' ? 'album' : 'songList'

  if (listInfo.key == key && listInfo.list.length) return listInfo.list
  if (sourceId == 'all') {
    listInfo.key = key
    let task = []
    for (const source of searchSonglistState.sources) {
      if (source == 'all' || (page > 1 && page > (searchSonglistState.maxPages[source]!))) continue

      // 容错处理：有些音源可能还没写 album.js，没有就跳过
      const apiModule = (musicSdk as any)[source]?.[targetApi]
      if (!apiModule) continue

      task.push(((apiModule.search(text, page, searchSonglistState.listInfos.all.limit) as Promise<SearchResult>) ?? Promise.reject(new Error('source not found: ' + source))).catch((error: any) => {
        console.log(error)
        return {
          list: [],
          total: 0,
          limit: searchSonglistState.listInfos.all.limit,
          source,
        }
      }))
    }
    return Promise.all(task).then((results: SearchResult[]) => {
      if (key != listInfo.key) return []
      setSearchText(text)
      setSource(sourceId)
      return setListInfo(results, page, text)
    })
  } else {
    if (listInfo?.key == key && listInfo?.list.length) return listInfo?.list
    listInfo.key = key

    // 针对单平台搜索的拦截
    const apiModule = (musicSdk as any)[sourceId]?.[targetApi]
    if (!apiModule) return Promise.reject(new Error(`API ${targetApi} not supported for source: ` + sourceId))

    return ((apiModule.search(text, page, listInfo.limit) as Promise<SearchResult>).then((data: SearchResult) => {
      if (key != listInfo.key) return []
      return setListInfo(data, page, text)
    }) ?? Promise.reject(new Error('source not found: ' + sourceId))).catch((err: any) => {
      if (listInfo.list.length && page == 1) clearListInfo(sourceId)
      throw err
    })
  }
}
