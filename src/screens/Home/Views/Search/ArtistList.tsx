import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { FlatList, TouchableOpacity, View } from 'react-native'
import Text from '@/components/common/Text'
import Image from '@/components/common/Image'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import music from '@/utils/musicSdk'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'

interface ArtistInfo {
  id: string
  name: string
  alias: string[]
  img: string
  albumCount: number
}

export interface ArtistListType {
  loadList: (text: string) => void
}

export default forwardRef<ArtistListType>((props, ref) => {
  const [list, setList] = useState<ArtistInfo[]>([])
  const [status, setStatus] = useState<'loading' | 'idle' | 'end' | 'error'>('idle')
  const infoRef = useRef({ text: '', page: 1, total: 0 })
  const requestKeyRef = useRef('')
  const theme = useTheme()
  const t = useI18n()

  const load = async(text: string, page: number) => {
    const key = `${text}__${page}`
    requestKeyRef.current = key
    setStatus('loading')
    try {
      const result = await (music as any).wy.artist.search(text, page)
      if (requestKeyRef.current != key) return
      infoRef.current = { text, page, total: result.total }
      setList(current => page == 1 ? result.list : [...current, ...result.list])
      setStatus(page * result.limit >= result.total ? 'end' : 'idle')
    } catch {
      if (requestKeyRef.current == key) setStatus('error')
    }
  }

  useImperativeHandle(ref, () => ({
    loadList(text) {
      setList([])
      if (!text) return
      void load(text, 1)
    },
  }))

  const loadMore = () => {
    if (status != 'idle') return
    void load(infoRef.current.text, infoRef.current.page + 1)
  }

  const renderItem = ({ item }: { item: ArtistInfo }) => (
    <TouchableOpacity
      style={{ ...styles.item, borderBottomColor: theme['c-border-background'] }}
      onPress={() => { navigations.pushArtistDetailScreen(commonState.componentIds.home!, item) }}
    >
      <Image url={item.img} style={styles.avatar} />
      <View style={styles.info}>
        <Text numberOfLines={1}>{item.name}</Text>
        {item.alias.length ? <Text numberOfLines={1} size={12} color={theme['c-font-label']}>{item.alias.join(' / ')}</Text> : null}
        <Text size={12} color={theme['c-font-label']}>{t('artist_album_count', { count: item.albumCount })}</Text>
      </View>
    </TouchableOpacity>
  )

  return <FlatList
    data={list}
    renderItem={renderItem}
    keyExtractor={item => item.id}
    onEndReached={loadMore}
    onEndReachedThreshold={0.5}
    ListFooterComponent={status == 'loading' || status == 'error'
      ? <Text style={styles.footer} color={theme['c-font-label']}>{t(status == 'loading' ? 'list_loading' : 'list_error')}</Text>
      : null}
  />
})

const styles = createStyle({
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  info: { flex: 1, minWidth: 0, marginLeft: 12, gap: 3 },
  footer: { textAlign: 'center', padding: 12 },
})
