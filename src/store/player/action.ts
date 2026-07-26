import { formatPlayTime2 } from '@/utils'
import state from './state'

type PlayerMusicInfoKeys = keyof LX.Player.MusicInfo
const musicInfoKeys: PlayerMusicInfoKeys[] = Object.keys(state.musicInfo) as PlayerMusicInfoKeys[]
let queueId = 0

const emitPlayQueueChanged = () => {
  global.state_event.playQueueChanged({
    list: [...state.playQueue],
    index: state.playQueueIndex,
  })
}

const createPlayQueueItem = ({ musicInfo, listId, isTempPlay = false, origin = 'source', sourceIndex }: {
  musicInfo: LX.Player.PlayMusic
  listId: string | null
  isTempPlay?: boolean
  origin?: LX.Player.PlayQueueItemOrigin
  sourceIndex?: number
}): LX.Player.PlayQueueItem => ({
  queueId: `queue_${Date.now()}_${queueId++}`,
  musicInfo,
  listId,
  isTempPlay,
  origin,
  sourceIndex,
})

const getDefaultPlaybackSource = (musicInfo: LX.Player.PlayMusic | null) => {
  if (!musicInfo) return null
  const sourceMusicInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  return sourceMusicInfo.meta.toggleMusicInfo?.source ?? sourceMusicInfo.source
}

export default {
  createPlayQueueItem,
  updatePlayIndex(playIndex: number, playerPlayIndex: number) {
    state.playInfo.playIndex = playIndex
    state.playInfo.playerPlayIndex = playerPlayIndex

    global.state_event.playInfoChanged({ ...state.playInfo })
  },
  setPlayListId(playerListId: string | null) {
    state.playInfo.playerListId = playerListId

    global.state_event.playInfoChanged({ ...state.playInfo })
  },
  setPlayMusicInfo(listId: string | null, musicInfo: LX.Download.ListItem | LX.Music.MusicInfo | null, isTempPlay: boolean = false) {
    state.playMusicInfo = { listId, musicInfo, isTempPlay }
    state.playbackSource = getDefaultPlaybackSource(musicInfo)

    global.state_event.playMusicInfoChanged(state.playMusicInfo)
    global.state_event.playbackSourceChanged(state.playbackSource)
  },
  setPlaybackSource(source: LX.Source | null) {
    if (state.playbackSource == source) return
    state.playbackSource = source
    global.state_event.playbackSourceChanged(source)
  },
  setMusicInfo(_musicInfo: Partial<LX.Player.MusicInfo>) {
    for (const key of musicInfoKeys) {
      const val = _musicInfo[key]
      if (val !== undefined) {
        // @ts-expect-error
        state.musicInfo[key] = val
      }
    }

    global.state_event.playerMusicInfoChanged({ ...state.musicInfo })
  },
  setIsPlay(isPlay: boolean) {
    state.isPlay = isPlay

    global.state_event.playStateChanged(isPlay)
  },
  setStatusText(statusText: string) {
    state.statusText = statusText
    global.state_event.playStateTextChanged(statusText)
  },
  setNowPlayTime(time: number) {
    state.progress.nowPlayTime = time
    state.progress.nowPlayTimeStr = formatPlayTime2(time)
    state.progress.progress = state.progress.maxPlayTime ? time / state.progress.maxPlayTime : 0

    global.state_event.playProgressChanged({ ...state.progress })
  },
  setMaxplayTime(time: number) {
    state.progress.maxPlayTime = time
    state.progress.maxPlayTimeStr = formatPlayTime2(time)
    state.progress.progress = time ? state.progress.nowPlayTime / time : 0

    global.state_event.playProgressChanged({ ...state.progress })
  },
  setProgress(currentTime: number, totalTime: number) {
    state.progress.nowPlayTime = currentTime
    state.progress.nowPlayTimeStr = formatPlayTime2(currentTime)
    state.progress.maxPlayTime = totalTime
    state.progress.maxPlayTimeStr = formatPlayTime2(totalTime)
    state.progress.progress = totalTime ? state.progress.nowPlayTime / currentTime : 0

    global.state_event.playProgressChanged({ ...state.progress })
  },
  addPlayedList(info: LX.Player.PlayMusicInfo) {
    if (state.playedList.some(m => m.musicInfo.id == info.musicInfo.id)) return
    state.playedList.push(info)

    global.state_event.playPlayedListChanged({ ...state.playedList })
  },
  removePlayedList(index: number) {
    state.playedList.splice(index, 1)

    global.state_event.playPlayedListChanged({ ...state.playedList })
  },
  clearPlayedList() {
    state.playedList = []

    global.state_event.playPlayedListChanged({ ...state.playedList })
  },
  replacePlayQueue(list: LX.Player.PlayQueueItem[], index: number) {
    state.playQueue = [...list]
    state.playQueueIndex = Math.min(Math.max(index, -1), state.playQueue.length - 1)
    emitPlayQueueChanged()
  },
  setPlayQueueIndex(index: number) {
    state.playQueueIndex = index
    emitPlayQueueChanged()
  },
  movePlayQueueItem(oldIndex: number, newIndex: number) {
    if (oldIndex <= state.playQueueIndex || newIndex <= state.playQueueIndex) return
    const list = [...state.playQueue]
    const [item] = list.splice(oldIndex, 1)
    if (!item) return
    list.splice(newIndex, 0, item)
    state.playQueue = list
    emitPlayQueueChanged()
  },
  removePlayQueueItem(index: number) {
    if (index <= state.playQueueIndex) return
    state.playQueue = state.playQueue.filter((_, itemIndex) => itemIndex != index)
    emitPlayQueueChanged()
  },
  clearPendingPlayQueue() {
    const currentItem = state.playQueue[state.playQueueIndex]
    state.playQueue = currentItem ? [currentItem] : []
    state.playQueueIndex = currentItem ? 0 : -1
    emitPlayQueueChanged()
  },
  addTempPlayList(list: LX.Player.TempPlayListItem[]) {
    const topList = list.filter(item => item.isTop).map(({ musicInfo, listId }) => createPlayQueueItem({
      musicInfo,
      listId,
      isTempPlay: true,
      origin: 'play_next',
    }))
    const bottomList = list.filter(item => !item.isTop).map(({ musicInfo, listId }) => createPlayQueueItem({
      musicInfo,
      listId,
      isTempPlay: true,
      origin: 'play_later',
    }))
    const queue = [...state.playQueue]
    if (topList.length) queue.splice(state.playQueueIndex + 1, 0, ...topList)
    if (bottomList.length) {
      let insertIndex = state.playQueueIndex + 1
      while (insertIndex < queue.length && queue[insertIndex].origin != 'source') insertIndex++
      queue.splice(insertIndex, 0, ...bottomList)
    }
    state.playQueue = queue
    emitPlayQueueChanged()
  },
  removeTempPlayList(index: number) {
    state.tempPlayList.splice(index, 1)

    global.state_event.playTempPlayListChanged({ ...state.tempPlayList })
  },
  clearTempPlayeList() {
    state.tempPlayList = []

    global.state_event.playTempPlayListChanged({ ...state.tempPlayList })
  },
  setLoadErrorPicUrl(url: string) {
    state.loadErrorPicUrl = url
  },
  setLastLyric(lrc?: string) {
    state.lastLyric = lrc
  },
}
