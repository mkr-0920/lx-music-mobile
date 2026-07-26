import { memo, useCallback, useEffect, useMemo } from 'react'
import { Pressable, StyleSheet, TouchableOpacity, View, type GestureResponderEvent } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from 'react-native-draggable-flatlist'
import { Navigation } from 'react-native-navigation'

import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { MUSIC_TOGGLE_MODE, MUSIC_TOGGLE_MODE_LIST } from '@/config/constant'
import { updateSetting } from '@/core/common'
import { playQueueItem } from '@/core/player/player'
import { clearPendingPlayQueue, movePlayQueueItem, removePlayQueueItem } from '@/core/player/playQueue'
import { useI18n } from '@/lang'
import { setPlayQueueOverlayVisible } from '../utils'
import { usePlayQueue } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle, toast } from '@/utils/tools'
import { useHorizontalMode } from '@/utils/hooks'

const getMusicInfo = (item: LX.Player.PlayQueueItem) => 'progress' in item.musicInfo
  ? item.musicInfo.metadata.musicInfo
  : item.musicInfo

const QueueRow = memo(({ item, index, playIndex = index, isCurrent, isActive = false, drag, onRemove }: {
  item: LX.Player.PlayQueueItem
  index: number
  playIndex?: number
  isCurrent: boolean
  isActive?: boolean
  drag?: () => void
  onRemove?: () => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const musicInfo = getMusicInfo(item)
  const handlePress = () => {
    if (!isCurrent) void playQueueItem(playIndex)
  }
  const handleRemove = (event: GestureResponderEvent) => {
    event.stopPropagation()
    onRemove?.()
  }

  return (
    <TouchableOpacity
      style={{
        ...styles.row,
        backgroundColor: isCurrent || isActive ? theme['c-primary-light-100-alpha-100'] : undefined,
        opacity: isActive ? 0.85 : 1,
      }}
      activeOpacity={isCurrent ? 1 : 0.65}
      delayLongPress={220}
      disabled={isActive}
      onPress={handlePress}
      onLongPress={drag}
    >
      <View style={styles.position}>
        {isCurrent
          ? <Icon name="play" color={theme['c-button-font']} size={13} />
          : <Text size={11} color={theme['c-font-label']}>{index + 1}</Text>}
      </View>
      <View style={styles.musicInfo}>
        <Text numberOfLines={1} size={14} color={isCurrent ? theme['c-button-font'] : theme['c-font']}>
          {musicInfo.name}
        </Text>
        <Text numberOfLines={1} size={11} color={theme['c-font-label']} style={styles.singer}>
          {musicInfo.singer}
        </Text>
      </View>
      {item.origin != 'source'
        ? <View style={{ ...styles.badge, backgroundColor: theme['c-primary-light-100-alpha-100'] }}>
            <Text size={9} color={theme['c-font-label']}>
              {t(item.origin == 'play_next' ? 'player_queue_play_next' : 'player_queue_play_later')}
            </Text>
          </View>
        : null}
      {!isCurrent && onRemove
        ? <TouchableOpacity style={styles.removeBtn} activeOpacity={0.5} onPress={handleRemove}>
            <Icon name="close" color={theme['c-font-label']} size={11} />
          </TouchableOpacity>
        : null}
    </TouchableOpacity>
  )
})

const QueueModeBtn = () => {
  const mode = useSettingValue('player.togglePlayMethod')
  const theme = useTheme()
  const t = useI18n()
  const icon = useMemo(() => {
    switch (mode) {
      case MUSIC_TOGGLE_MODE.listLoop: return 'list-loop'
      case MUSIC_TOGGLE_MODE.random: return 'list-random'
      case MUSIC_TOGGLE_MODE.list: return 'list-order'
      case MUSIC_TOGGLE_MODE.singleLoop: return 'single-loop'
      default: return 'single'
    }
  }, [mode])
  const toggleMode = () => {
    let index = MUSIC_TOGGLE_MODE_LIST.indexOf(mode)
    if (++index >= MUSIC_TOGGLE_MODE_LIST.length) index = 0
    const newMode = MUSIC_TOGGLE_MODE_LIST[index]
    updateSetting({ 'player.togglePlayMethod': newMode })
    toast(t(newMode == MUSIC_TOGGLE_MODE.listLoop
      ? 'play_list_loop'
      : newMode == MUSIC_TOGGLE_MODE.random
        ? 'play_list_random'
        : newMode == MUSIC_TOGGLE_MODE.list
          ? 'play_list_order'
          : newMode == MUSIC_TOGGLE_MODE.singleLoop
            ? 'play_single_loop'
            : 'play_single'))
  }
  return (
    <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.5} onPress={toggleMode}>
      <Icon name={icon} color={theme['c-button-font']} size={19} />
    </TouchableOpacity>
  )
}

export default ({ componentId }: { componentId: string }) => {
  const theme = useTheme()
  const t = useI18n()
  const isHorizontal = useHorizontalMode()
  const queueInfo = usePlayQueue()
  const playMode = useSettingValue('player.togglePlayMethod')
  const currentItem = queueInfo.index >= 0 ? queueInfo.list[queueInfo.index] : null
  const pendingStart = Math.max(queueInfo.index + 1, 0)
  const pendingList = useMemo(() => queueInfo.list.slice(pendingStart), [pendingStart, queueInfo.list])
  const loopList = useMemo(() => {
    if (playMode != MUSIC_TOGGLE_MODE.listLoop) return []
    return queueInfo.list.slice(0, Math.max(queueInfo.index, 0)).filter(item => item.origin == 'source')
  }, [playMode, queueInfo.index, queueInfo.list])

  const close = useCallback(() => {
    void Navigation.dismissOverlay(componentId)
  }, [componentId])

  useEffect(() => {
    return () => {
      setPlayQueueOverlayVisible(false)
    }
  }, [])

  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<LX.Player.PlayQueueItem>) => {
    const relativeIndex = getIndex() ?? 0
    const index = pendingStart + relativeIndex
    return (
      <ScaleDecorator activeScale={1.02}>
        <QueueRow
          item={item}
          index={index}
          isCurrent={false}
          isActive={isActive}
          drag={drag}
          onRemove={() => { removePlayQueueItem(index) }}
        />
      </ScaleDecorator>
    )
  }, [pendingStart])

  const handleDragEnd = useCallback(({ from, to }: { from: number, to: number }) => {
    movePlayQueueItem(pendingStart + from, pendingStart + to)
  }, [pendingStart])

  return (
    <GestureHandlerRootView style={styles.root}>
      <Pressable style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.28)' }} onPress={close} />
      <View style={isHorizontal
        ? { ...styles.panelHorizontal, backgroundColor: theme['c-content-background'] }
        : { ...styles.panelVertical, backgroundColor: theme['c-content-background'] }}>
        <View style={{ ...styles.header, borderBottomColor: theme['c-border-background'] }}>
          <View style={styles.headerTitle}>
            <Text size={17}>{t('player_queue_title')}</Text>
            <Text size={11} color={theme['c-font-label']} style={styles.headerCount}>
              {t('player_queue_count', { count: pendingList.length + loopList.length + (currentItem ? 1 : 0) })}
            </Text>
          </View>
          <QueueModeBtn />
          <TouchableOpacity
            style={styles.clearBtn}
            activeOpacity={0.5}
            disabled={!pendingList.length && !loopList.length}
            onPress={clearPendingPlayQueue}
          >
            <Text size={12} color={pendingList.length || loopList.length ? theme['c-button-font'] : theme['c-font-label']}>
              {t('player_queue_clear')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.5} onPress={close}>
            <Icon name="close" color={theme['c-font-label']} size={13} />
          </TouchableOpacity>
        </View>

        {currentItem
          ? <>
              <Text size={11} color={theme['c-font-label']} style={styles.sectionTitle}>{t('player_queue_now')}</Text>
              <QueueRow item={currentItem} index={queueInfo.index} isCurrent />
            </>
          : null}

        <Text size={11} color={theme['c-font-label']} style={styles.sectionTitle}>{t('player_queue_up_next')}</Text>
        <DraggableFlatList
          containerStyle={styles.list}
          style={styles.list}
          data={pendingList}
          renderItem={renderItem}
          keyExtractor={item => item.queueId}
          activationDistance={4}
          autoscrollThreshold={70}
          autoscrollSpeed={120}
          onDragEnd={handleDragEnd}
          ListFooterComponent={loopList.length
            ? <>
                {loopList.map((item, index) => (
                  <QueueRow
                    key={item.queueId}
                    item={item}
                    index={pendingStart + pendingList.length + index}
                    playIndex={queueInfo.list.indexOf(item)}
                    isCurrent={false}
                  />
                ))}
              </>
            : null}
          ListEmptyComponent={
            loopList.length
              ? null
              : <View style={styles.empty}>
                  <Text size={13} color={theme['c-font-label']}>{t('player_queue_empty')}</Text>
                </View>
          }
        />
      </View>
    </GestureHandlerRootView>
  )
}

const styles = createStyle({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  panelVertical: {
    width: '100%',
    height: '72%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    elevation: 16,
    overflow: 'hidden',
  },
  panelHorizontal: {
    width: '48%',
    maxWidth: 520,
    height: '100%',
    elevation: 16,
    overflow: 'hidden',
  },
  header: {
    height: 62,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
  },
  headerCount: {
    marginTop: 3,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    height: 42,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 5,
  },
  list: {
    flex: 1,
  },
  row: {
    minHeight: 56,
    paddingLeft: 10,
    paddingRight: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  position: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicInfo: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  singer: {
    marginTop: 3,
  },
  badge: {
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  removeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingTop: 45,
    alignItems: 'center',
  },
})
