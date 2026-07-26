import { useEffect, useMemo, useRef, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Navigation } from 'react-native-navigation'
import PageContent from '@/components/PageContent'
import StatusBar from '@/components/common/StatusBar'
import Text from '@/components/common/Text'
import Image from '@/components/common/Image'
import PlayerBar from '@/components/player/PlayerBar'
import List, { type ListType } from '@/screens/Home/Views/SongList/components/Songlist/List'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import music from '@/utils/musicSdk'
import { navigations } from '@/navigation'
import { type ListInfoItem } from '@/store/songlist/state'

interface ArtistInfo {
  id: string
  name: string
  img: string
}

interface AlbumInfo extends ListInfoItem {
  publishTimestamp: number
  type: 'album'
}

interface ArtistAlbumsResult {
  artist: { name?: string, picUrl?: string } | null
  list: AlbumInfo[]
  more: boolean
}

export default ({ componentId, artist: initialArtist }: { componentId: string, artist: ArtistInfo }) => {
  const [artist, setArtist] = useState(initialArtist)
  const [albums, setAlbums] = useState<AlbumInfo[]>([])
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [loading, setLoading] = useState(true)
  const listRef = useRef<ListType>(null)
  const theme = useTheme()
  const t = useI18n()

  const sortedAlbums = useMemo(() => [...albums].sort((a, b) => sort == 'oldest'
    ? a.publishTimestamp - b.publishTimestamp
    : b.publishTimestamp - a.publishTimestamp), [albums, sort])

  useEffect(() => {
    let canceled = false
    const load = async() => {
      try {
        let page = 1
        let more = true
        const resultList: AlbumInfo[] = []
        while (more) {
          const result = await (music as any).wy.artist.getAlbums(initialArtist.id, page) as ArtistAlbumsResult
          if (canceled) return
          if (page == 1 && result.artist) {
            setArtist(current => ({
              ...current,
              name: result.artist?.name ?? current.name,
              img: result.artist?.picUrl ?? current.img,
            }))
          }
          resultList.push(...result.list)
          setAlbums([...resultList])
          more = result.more
          page++
        }
      } finally {
        if (!canceled) setLoading(false)
      }
    }
    void load()
    return () => { canceled = true }
  }, [initialArtist])

  useEffect(() => {
    listRef.current?.setList(sortedAlbums)
    listRef.current?.setStatus(loading ? 'loading' : 'end')
  }, [loading, sortedAlbums])

  return <PageContent>
    <StatusBar />
    <View style={{ ...styles.header, borderBottomColor: theme['c-border-background'] }}>
      <TouchableOpacity onPress={() => { void Navigation.pop(componentId) }}><Text size={22}>{'<'}</Text></TouchableOpacity>
      <Image url={artist.img} style={styles.avatar} />
      <View style={styles.artistInfo}>
        <Text numberOfLines={1}>{artist.name}</Text>
        <Text size={12} color={theme['c-font-label']}>{loading ? t('artist_loading_albums', { count: albums.length }) : t('artist_album_count', { count: albums.length })}</Text>
      </View>
      <TouchableOpacity disabled={loading} onPress={() => { setSort(sort == 'newest' ? 'oldest' : 'newest') }}>
        <Text size={12} color={loading ? theme['c-font-label'] : theme['c-primary']}>{t(sort == 'newest' ? 'artist_sort_newest' : 'artist_sort_oldest')}</Text>
      </TouchableOpacity>
    </View>
    <List
      ref={listRef}
      onRefresh={() => {}}
      onLoadMore={() => {}}
      onOpenDetail={(item) => { navigations.pushSonglistDetailScreen(componentId, item) }}
    />
    <PlayerBar />
  </PageContent>
}

const styles = createStyle({
  header: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  artistInfo: { flex: 1, minWidth: 0, gap: 4 },
})
