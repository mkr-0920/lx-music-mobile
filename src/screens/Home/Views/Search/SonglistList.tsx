import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import { search } from '@/core/search/songlist'
import Songlist, { type SonglistProps, type SonglistType } from '@/screens/Home/Views/SongList/components/Songlist'
import searchSonglistState, { type Source } from '@/store/search/songlist/state'

export interface MusicListType {
  // 【新增 type 参数透传】
  loadList: (text: string, source: Source, type?: 'songlist' | 'album') => void
}

export default forwardRef<MusicListType, {}>((props, ref) => {
  const listRef = useRef<SonglistType>(null)
  // 【修改：记录当前的 type】
  const searchInfoRef = useRef<{ text: string, source: Source, type: 'songlist' | 'album' }>({ text: '', source: 'kw', type: 'songlist' })
  const isUnmountedRef = useRef(false)

  const setIdleOrEnd = (page: number) => {
    const maxPage = searchSonglistState.maxPages[searchSonglistState.source] ?? 0
    listRef.current?.setStatus(maxPage > 0 && maxPage <= page ? 'end' : 'idle')
  }

  useImperativeHandle(ref, () => ({
    async loadList(text, source, type = 'songlist') {
      listRef.current?.setList([], source == 'all')

      // 避免重复请求的判断里，加上 type 判断
      if (searchSonglistState.searchText == text && searchSonglistState.source == source && searchInfoRef.current.type == type && searchSonglistState.listInfos[searchSonglistState.source]!.list.length) {
        requestAnimationFrame(() => {
          listRef.current?.setList(searchSonglistState.listInfos[searchSonglistState.source]!.list, source == 'all')
        })
      } else {
        listRef.current?.setStatus('loading')
        const page = 1
        searchInfoRef.current.text = text
        searchInfoRef.current.source = source
        searchInfoRef.current.type = type // 存起来，给翻页用

        // 【核心：发请求时带上 type！】
        return search(text, page, source, type).then((list) => {
          if (isUnmountedRef.current) return
          requestAnimationFrame(() => {
            listRef.current?.setList(list, source == 'all')
            setIdleOrEnd(page)
          })
        }).catch(() => {
          listRef.current?.setStatus('error')
        })
      }
    },
  }), [])

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  const handleRefresh: SonglistProps['onRefresh'] = () => {
    const page = 1
    listRef.current?.setStatus('refreshing')
    // 【修改：带上存好的 type】
    search(searchInfoRef.current.text, page, searchInfoRef.current.source, searchInfoRef.current.type).then((list) => {
      if (isUnmountedRef.current) return
      listRef.current?.setList(list, searchInfoRef.current.source == 'all')
      setIdleOrEnd(page)
    }).catch(() => {
      listRef.current?.setStatus('error')
    })
  }
  const handleLoadMore: SonglistProps['onLoadMore'] = () => {
    listRef.current?.setStatus('loading')
    const info = searchSonglistState.listInfos[searchInfoRef.current.source]!
    const page = info.list.length ? info.page + 1 : 1
    // 【修改：带上存好的 type】
    search(searchInfoRef.current.text, page, searchInfoRef.current.source, searchInfoRef.current.type).then((list) => {
      if (isUnmountedRef.current) return
      listRef.current?.setList(list, searchInfoRef.current.source == 'all')
      setIdleOrEnd(page)
    }).catch(() => {
      listRef.current?.setStatus('error')
    })
  }

  return <Songlist
    ref={listRef}
    onRefresh={handleRefresh}
    onLoadMore={handleLoadMore}
  />
})
