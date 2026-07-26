import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { TouchableOpacity } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { BorderWidths } from '@/theme'
import { useTheme } from '@/store/theme/hook'
import { useActiveListId, useListFetching } from '@/store/list/hook'
import listState from '@/store/list/state'
import { createStyle } from '@/utils/tools'
import { getListPrevSelectId } from '@/utils/data'
import { setActiveList } from '@/core/list'
import Text from '@/components/common/Text'
import { LIST_IDS } from '@/config/constant'
import Loading from '@/components/common/Loading'
import { useSettingValue } from '@/store/setting/hook'
import { getWyRemoteDraftByListId, isWyRemoteDraftDirty, type WyRemoteTarget } from '@/core/wyRemoteDraft'
import WyRemoteMenu, { type WyRemoteMenuType } from '../WyRemoteMenu'
import {
  playWyRemoteTarget,
  refreshWyRemoteTarget,
  saveWyRemoteTargetAsLocal,
  syncWyRemoteTarget,
} from '../wyRemoteActions'

export interface ActiveListProps {
  onShowSearchBar: () => void
  onScrollToTop: () => void
}
export interface ActiveListType {
  setVisibleBar: (visible: boolean) => void
}

export default forwardRef<ActiveListType, ActiveListProps>(({ onShowSearchBar, onScrollToTop }, ref) => {
  const theme = useTheme()
  const currentListId = useActiveListId()
  const fetching = useListFetching(currentListId)
  const langId = useSettingValue('common.langId')
  const moreButtonRef = useRef<TouchableOpacity>(null)
  const wyRemoteMenuRef = useRef<WyRemoteMenuType>(null)
  const [remoteDirty, setRemoteDirty] = useState(false)
  const remoteTarget = useMemo<WyRemoteTarget | null>(() => {
    const draft = getWyRemoteDraftByListId(currentListId)
    if (!draft?.sourceListId) return null
    return {
      ...draft,
      remoteBoardId: `mkr__${draft.sourceListId}`,
      remoteName: draft.name,
    }
  }, [currentListId])
  const currentListName = useMemo(() => {
    switch (currentListId) {
      case LIST_IDS.TEMP:
        return global.i18n.t('list_name_temp')
      case LIST_IDS.DEFAULT:
        return global.i18n.t('list_name_default')
      case LIST_IDS.LOVE:
        return global.i18n.t('list_name_love')
      default:
        return listState.allList.find(l => l.id === currentListId)?.name ?? ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentListId, langId])
  const [visibleBar, setVisibleBar] = useState(true)

  useImperativeHandle(ref, () => ({
    setVisibleBar(visible) {
      setVisibleBar(visible)
    },
  }))

  const showList = () => {
    global.app_event.changeLoveListVisible(true)
  }

  useEffect(() => {
    void getListPrevSelectId().then((id) => {
      setActiveList(id)
    })
  }, [])

  useEffect(() => {
    if (!remoteTarget) {
      setRemoteDirty(false)
      return
    }
    const updateDirty = () => {
      void isWyRemoteDraftDirty(remoteTarget.remoteBoardId).then(setRemoteDirty).catch(() => { setRemoteDirty(false) })
    }
    const handleListUpdate = (ids: string[]) => {
      if (ids.includes(remoteTarget.id)) updateDirty()
    }
    updateDirty()
    global.app_event.on('myListMusicUpdate', handleListUpdate)
    return () => {
      global.app_event.off('myListMusicUpdate', handleListUpdate)
    }
  }, [remoteTarget])

  const showRemoteMenu = () => {
    if (!remoteTarget) return
    moreButtonRef.current?.measure((fx, fy, width, height, px, py) => {
      wyRemoteMenuRef.current?.show({ item: remoteTarget, dirty: remoteDirty }, {
        x: Math.ceil(px),
        y: Math.ceil(py),
        w: Math.ceil(width),
        h: Math.ceil(height),
      })
    })
  }

  return (
    <>
      <TouchableOpacity onPress={showList} onLongPress={onScrollToTop} style={{ ...styles.currentList, opacity: visibleBar ? 1 : 0, borderBottomColor: theme['c-border-background'] }}>
        <Icon style={styles.currentListIcon} color={theme['c-button-font']} name="chevron-right" size={12} />
        { fetching ? <Loading color={theme['c-button-font']} style={styles.loading} /> : null }
        <Text style={styles.currentListText} numberOfLines={1} color={theme['c-button-font']}>{currentListName}</Text>
        {remoteDirty ? <TouchableOpacity style={styles.dirtyStatus} onPress={showRemoteMenu}><Text size={12} color={theme['c-primary-font']}>{global.i18n.t('my_list__wy_unsynced')}</Text></TouchableOpacity> : null}
        <TouchableOpacity style={styles.currentListBtns} onPress={onShowSearchBar}>
          <Icon color={theme['c-button-font']} name="search-2" />
        </TouchableOpacity>
        {remoteTarget
          ? <TouchableOpacity ref={moreButtonRef} style={styles.currentListBtns} onPress={showRemoteMenu}><Icon color={theme['c-button-font']} name="dots-vertical" /></TouchableOpacity>
          : null}
      </TouchableOpacity>
      <WyRemoteMenu
        ref={wyRemoteMenuRef}
        onPlay={item => { void playWyRemoteTarget(item) }}
        onRefresh={item => { void refreshWyRemoteTarget(item) }}
        onDiscard={item => { void refreshWyRemoteTarget(item, true) }}
        onSync={item => { void syncWyRemoteTarget(item) }}
        onSaveAsLocal={item => { void saveWyRemoteTargetAsLocal(item) }}
      />
    </>
  )
})


const styles = createStyle({
  currentList: {
    flexDirection: 'row',
    paddingRight: 2,
    height: 36,
    alignItems: 'center',
    borderBottomWidth: BorderWidths.normal,
    // backgroundColor: 'rgba(0,0,0,0.2)',
  },
  currentListIcon: {
    paddingLeft: 15,
    paddingRight: 10,
    // paddingTop: 10,
    // paddingBottom: 0,
  },
  currentListText: {
    flex: 1,
    // minWidth: 70,
    // paddingLeft: 10,
    paddingRight: 10,
    // paddingTop: 10,
    // paddingBottom: 10,
  },
  loading: {
    marginRight: 5,
  },
  currentListBtns: {
    width: 46,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    // backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dirtyStatus: {
    height: '100%',
    justifyContent: 'center',
    paddingLeft: 5,
    paddingRight: 5,
  },
})
