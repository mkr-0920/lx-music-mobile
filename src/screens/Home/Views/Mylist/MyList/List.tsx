import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, TouchableOpacity, View, type FlatListProps, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { Icon } from '@/components/common/Icon'
import Loading from '@/components/common/Loading'
import Text from '@/components/common/Text'
import { setActiveList } from '@/core/list'
import {
  findWyRemoteDraft,
  getWyRemoteTargets,
  isWyRemoteDraft,
  isWyRemoteDraftDirty,
  type WyRemoteTarget,
} from '@/core/wyRemoteDraft'
import { LIST_SCROLL_POSITION_KEY } from '@/config/constant'
import { useActiveListId, useListFetching, useMyList } from '@/store/list/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { getListPosition, saveListPosition } from '@/utils/data'
import { scaleSizeH } from '@/utils/pixelRatio'
import { createStyle } from '@/utils/tools'
import { openWyRemoteTarget } from '../wyRemoteActions'
import { type Position } from './ListMenu'

const ITEM_HEIGHT = scaleSizeH(40)

type Row =
  | { type: 'header', id: string, name: string, remote?: boolean }
  | { type: 'local', id: string, item: LX.List.MyListInfo, index: number }
  | { type: 'remote', id: string, item: WyRemoteTarget }
  | { type: 'status', id: string, text: string, retry?: boolean }

type FlatListType = FlatListProps<Row>

const LocalListItem = memo(({ item, index, activeId, onPress, onShowMenu }: {
  item: LX.List.MyListInfo
  index: number
  activeId: string
  onPress: (item: LX.List.MyListInfo) => void
  onShowMenu: (item: LX.List.MyListInfo, index: number, position: Position) => void
}) => {
  const theme = useTheme()
  const moreButtonRef = useRef<TouchableOpacity>(null)
  const fetching = useListFetching(item.id)
  const active = activeId == item.id
  const handleShowMenu = () => {
    moreButtonRef.current?.measure((fx, fy, width, height, px, py) => {
      onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
    })
  }
  return (
    <View style={styles.listItem}>
      {active ? <Icon style={styles.listActiveIcon} name="chevron-right" size={12} color={theme['c-primary-font']} /> : null}
      {fetching ? <Loading color={active ? theme['c-primary-font'] : theme['c-font']} style={styles.loading} /> : null}
      <TouchableOpacity style={styles.listName} onPress={() => { onPress(item) }}>
        <Text numberOfLines={1} color={active ? theme['c-primary-font'] : theme['c-font']}>{item.name}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleShowMenu} ref={moreButtonRef} style={styles.listMoreBtn}>
        <Icon name="dots-vertical" color={theme['c-350']} size={12} />
      </TouchableOpacity>
    </View>
  )
})

const RemoteListItem = ({ item, activeId, dirty, opening, onPress, onShowMenu }: {
  item: WyRemoteTarget
  activeId: string
  dirty: boolean
  opening: boolean
  onPress: (item: WyRemoteTarget) => void
  onShowMenu: (item: WyRemoteTarget, dirty: boolean, position: Position) => void
}) => {
  const theme = useTheme()
  const moreButtonRef = useRef<TouchableOpacity>(null)
  const targetList = findWyRemoteDraft(item.remoteBoardId)
  const active = targetList?.id == activeId
  const handleShowMenu = () => {
    moreButtonRef.current?.measure((fx, fy, width, height, px, py) => {
      onShowMenu(item, dirty, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
    })
  }
  return (
    <View style={styles.listItem}>
      {active ? <Icon style={styles.listActiveIcon} name="chevron-right" size={12} color={theme['c-primary-font']} /> : null}
      {opening ? <Loading color={active ? theme['c-primary-font'] : theme['c-font']} style={styles.loading} /> : null}
      <TouchableOpacity style={styles.listName} disabled={opening} onPress={() => { onPress(item) }}>
        <View style={styles.remoteName}>
          <Text style={styles.remoteNameText} numberOfLines={1} color={active ? theme['c-primary-font'] : theme['c-font']}>{item.name}</Text>
          {dirty ? <View style={{ ...styles.dirtyDot, backgroundColor: theme['c-primary-font'] }} /> : null}
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleShowMenu} ref={moreButtonRef} style={styles.listMoreBtn}>
        <Icon name="dots-vertical" color={theme['c-350']} size={12} />
      </TouchableOpacity>
    </View>
  )
}

export default ({ onShowMenu, onShowRemoteMenu }: {
  onShowMenu: (info: { listInfo: LX.List.MyListInfo, index: number }, position: Position) => void
  onShowRemoteMenu: (item: WyRemoteTarget, dirty: boolean, position: Position) => void
}) => {
  const theme = useTheme()
  const flatListRef = useRef<FlatList<Row>>(null)
  const allList = useMyList()
  const activeListId = useActiveListId()
  const wyUserId = useSettingValue('common.wyUserId')
  const [wyLists, setWyLists] = useState<WyRemoteTarget[]>([])
  const [wyStatus, setWyStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [dirtyStatus, setDirtyStatus] = useState<Record<string, boolean>>({})
  const [openingId, setOpeningId] = useState('')

  const updateDirtyStatus = useCallback(async(items: WyRemoteTarget[]) => {
    const entries = await Promise.all(items.map(async item => [
      item.remoteBoardId,
      await isWyRemoteDraftDirty(item.remoteBoardId).catch(() => false),
    ] as const))
    setDirtyStatus(Object.fromEntries(entries))
  }, [])

  const loadWyLists = useCallback(async(isRefresh = false) => {
    if (!wyUserId.trim()) {
      setWyLists([])
      setWyStatus('idle')
      return
    }
    setWyStatus('loading')
    try {
      const lists = await getWyRemoteTargets(isRefresh)
      setWyLists(lists)
      setWyStatus('loaded')
      await updateDirtyStatus(lists)
    } catch (error) {
      console.error('[WY Remote List] Failed to load playlists:', error)
      setWyLists([])
      setWyStatus('error')
    }
  }, [updateDirtyStatus, wyUserId])

  useEffect(() => {
    void loadWyLists(true)
  }, [loadWyLists])

  useEffect(() => {
    const handleListUpdate = (ids: string[]) => {
      const targets = wyLists.filter(item => {
        const draft = findWyRemoteDraft(item.remoteBoardId)
        return draft && ids.includes(draft.id)
      })
      if (!targets.length) return
      void Promise.all(targets.map(async item => [
        item.remoteBoardId,
        await isWyRemoteDraftDirty(item.remoteBoardId).catch(() => false),
      ] as const)).then(entries => {
        setDirtyStatus(status => ({ ...status, ...Object.fromEntries(entries) }))
      })
    }
    global.app_event.on('myListMusicUpdate', handleListUpdate)
    return () => {
      global.app_event.off('myListMusicUpdate', handleListUpdate)
    }
  }, [wyLists])

  const localLists = useMemo(() => allList.filter(item => !isWyRemoteDraft(item)), [allList])
  const rows = useMemo<Row[]>(() => {
    const data: Row[] = [
      { type: 'header', id: 'lx_local_header', name: global.i18n.t('my_list__local_group') },
      ...localLists.map((item, index) => ({ type: 'local' as const, id: `local_${item.id}`, item, index })),
      { type: 'header', id: 'wy_remote_header', name: global.i18n.t('my_list__wy_group'), remote: true },
    ]
    if (!wyUserId.trim()) data.push({ type: 'status', id: 'wy_not_configured', text: global.i18n.t('my_list__wy_not_configured') })
    else if (wyStatus == 'loading') data.push({ type: 'status', id: 'wy_loading', text: global.i18n.t('loading') })
    else if (wyStatus == 'error') data.push({ type: 'status', id: 'wy_error', text: global.i18n.t('my_list__wy_load_failed'), retry: true })
    else data.push(...wyLists.map(item => ({ type: 'remote' as const, id: `remote_${item.remoteBoardId}`, item })))
    return data
  }, [localLists, wyLists, wyStatus, wyUserId])

  const handleToggleLocal = (item: LX.List.MyListInfo) => {
    global.app_event.changeLoveListVisible(false)
    requestAnimationFrame(() => {
      setActiveList(item.id)
    })
  }

  const handleRemotePress = async(item: WyRemoteTarget) => {
    if (openingId) return
    setOpeningId(item.remoteBoardId)
    try {
      await openWyRemoteTarget(item)
    } finally {
      setOpeningId('')
    }
  }

  const renderItem: FlatListType['renderItem'] = ({ item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={{ ...styles.groupHeader, borderBottomColor: theme['c-border-background'] }}>
            <Text size={13} color={theme['c-500']}>{item.name}</Text>
            {item.remote && wyUserId.trim()
              ? <TouchableOpacity style={styles.refreshBtn} onPress={() => { void loadWyLists(true) }}><Text size={20} color={theme['c-button-font']}>↻</Text></TouchableOpacity>
              : null}
          </View>
        )
      case 'local':
        return <LocalListItem item={item.item} index={item.index} activeId={activeListId} onPress={handleToggleLocal} onShowMenu={(listInfo, index, position) => { onShowMenu({ listInfo, index }, position) }} />
      case 'remote':
        return <RemoteListItem item={item.item} activeId={activeListId} dirty={!!dirtyStatus[item.item.remoteBoardId]} opening={openingId == item.item.remoteBoardId} onPress={item => { void handleRemotePress(item) }} onShowMenu={onShowRemoteMenu} />
      case 'status':
        return <TouchableOpacity disabled={!item.retry} style={styles.statusRow} onPress={() => { void loadWyLists(true) }}><Text size={13} color={theme['c-500']}>{item.text}</Text></TouchableOpacity>
    }
  }

  useEffect(() => {
    void getListPosition(LIST_SCROLL_POSITION_KEY).then(offset => flatListRef.current?.scrollToOffset({ offset, animated: false }))
  }, [])

  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    void saveListPosition(LIST_SCROLL_POSITION_KEY, nativeEvent.contentOffset.y)
  }

  return <FlatList
    ref={flatListRef}
    onScroll={handleScroll}
    style={styles.container}
    data={rows}
    renderItem={renderItem}
    keyExtractor={item => item.id}
    getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
    maxToRenderPerBatch={12}
    windowSize={9}
    removeClippedSubviews
    initialNumToRender={20}
  />
}

const styles = createStyle({
  container: { flexShrink: 1, flexGrow: 0 },
  groupHeader: {
    height: ITEM_HEIGHT,
    paddingLeft: 12,
    paddingRight: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
  },
  refreshBtn: { width: 36, height: '100%', alignItems: 'center', justifyContent: 'center' },
  statusRow: { height: ITEM_HEIGHT, paddingLeft: 17, justifyContent: 'center' },
  listItem: { height: ITEM_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingRight: 5, paddingLeft: 5 },
  listActiveIcon: { marginLeft: 3, textAlign: 'center' },
  loading: { marginLeft: 5 },
  listName: { height: '100%', justifyContent: 'center', flexGrow: 1, flexShrink: 1, paddingLeft: 5 },
  listMoreBtn: { height: '100%', width: 36, justifyContent: 'center', alignItems: 'center' },
  remoteName: { flexDirection: 'row', alignItems: 'center' },
  remoteNameText: { flexShrink: 1 },
  dirtyDot: { width: 7, height: 7, borderRadius: 4, marginLeft: 7 },
})
