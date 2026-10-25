import { isInitialized, initial as playerInitial, isEmpty, setPause, setPlay, setResource, setStop, initTrackInfo } from '@/plugins/player'
import {
  setStatusText,
} from '@/core/player/playStatus'
import playerState from '@/store/player/state'
import settingState from '@/store/setting/state'
import {
  getList,
  setPlayMusicInfo,
  setMusicInfo,
  setPlayListId,
  setPlaybackSource,
} from '@/core/player/playInfo'
import { getMusicUrl, getPicPath, getLyricInfo } from '@/core/music'
import { requestMsg } from '@/utils/message'
import { getRandom } from '@/utils/common'
import BackgroundTimer from 'react-native-background-timer'
import { checkIgnoringBatteryOptimization, checkNotificationPermission, debounceBackgroundTimer } from '@/utils/tools'
import { LIST_IDS, SPLIT_CHAR } from '@/config/constant'
import { addListMusics, removeListMusics } from '@/core/list'
import { addDislikeInfo } from '@/core/dislikeList'
import { state as dislikeState } from '@/store/dislikeList/state'
import {
  createPlayQueueItem,
  replacePlayQueue,
  setPlayQueueIndex,
} from './playQueue'

// import { checkMusicFileAvailable } from '@renderer/utils/music'

const createDelayNextTimeout = (delay: number) => {
  let timeout: number | null
  const clearDelayNextTimeout = () => {
    // console.log(this.timeout)
    if (timeout) {
      BackgroundTimer.clearTimeout(timeout)
      timeout = null
    }
  }

  const addDelayNextTimeout = () => {
    clearDelayNextTimeout()
    timeout = BackgroundTimer.setTimeout(() => {
      timeout = null
      if (global.lx.isPlayedStop) return
      console.log('delay next timeout timeout', delay)
      void playNext(true)
    }, delay)
  }

  return {
    clearDelayNextTimeout,
    addDelayNextTimeout,
  }
}
const { addDelayNextTimeout, clearDelayNextTimeout } = createDelayNextTimeout(5000)
const { addDelayNextTimeout: addLoadTimeout, clearDelayNextTimeout: clearLoadTimeout } = createDelayNextTimeout(100000)

const createGettingUrlId = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  const tInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo.meta.toggleMusicInfo : musicInfo.meta.toggleMusicInfo
  return `${musicInfo.id}_${tInfo?.id ?? ''}`
}
/**
 * 检查音乐信息是否已更改
 */
const diffCurrentMusicInfo = (curMusicInfo: LX.Music.MusicInfo | LX.Download.ListItem): boolean => {
  // return curMusicInfo !== playerState.playMusicInfo.musicInfo || playerState.isPlay
  return createGettingUrlId(curMusicInfo) != global.lx.gettingUrlId || curMusicInfo.id != playerState.playMusicInfo.musicInfo?.id || playerState.isPlay
}

let cancelDelayRetry: (() => void) | null = null
const delayRetry = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh = false): Promise<string | null> => {
  // if (cancelDelayRetry) cancelDelayRetry()
  return new Promise<string | null>((resolve, reject) => {
    const time = getRandom(2, 6)
    setStatusText(global.i18n.t('player__getting_url_delay_retry', { time }))
    const tiemout = setTimeout(() => {
      getMusicPlayUrl(musicInfo, isRefresh, true).then((result) => {
        cancelDelayRetry = null
        resolve(result)
      }).catch(async(err: any) => {
        cancelDelayRetry = null
        reject(err)
      })
    }, time * 1000)
    cancelDelayRetry = () => {
      clearTimeout(tiemout)
      cancelDelayRetry = null
      resolve(null)
    }
  })
}
const getMusicPlayUrl = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh = false, isRetryed = false): Promise<string | null> => {
  // this.musicInfo.url = await getMusicPlayUrl(targetSong, type)
  setStatusText(global.i18n.t('player__getting_url'))
  addLoadTimeout()

  // const type = getPlayType(settingState.setting['player.isPlayHighQuality'], musicInfo)
  let toggleMusicInfo = ('progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo).meta.toggleMusicInfo

  return (toggleMusicInfo ? getMusicUrl({
    musicInfo: toggleMusicInfo,
    isRefresh,
    allowToggleSource: false,
  }) : Promise.reject(new Error('not found'))).catch(async() => {
    const sourceMusicInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
    if (!diffCurrentMusicInfo(musicInfo)) setPlaybackSource(sourceMusicInfo.source)
    return getMusicUrl({
      musicInfo,
      isRefresh,
      onToggleSource(mInfo) {
        if (diffCurrentMusicInfo(musicInfo)) return
        if (mInfo) setPlaybackSource(mInfo.source)
        setStatusText(global.i18n.t('toggle_source_try'))
      },
    })
  }).then(url => {
    if (global.lx.isPlayedStop || diffCurrentMusicInfo(musicInfo)) return null

    return url
  }).catch(async err => {
    // console.log('err', err.message)
    if (global.lx.isPlayedStop ||
      diffCurrentMusicInfo(musicInfo) ||
      err.message == requestMsg.cancelRequest) return null

    if (err.message == requestMsg.tooManyRequests) return delayRetry(musicInfo, isRefresh)

    if (!isRetryed) return getMusicPlayUrl(musicInfo, isRefresh, true)

    throw err
  })
}

export const setMusicUrl = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh?: boolean) => {
  // addLoadTimeout()
  if (!diffCurrentMusicInfo(musicInfo)) return
  const sourceMusicInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  setPlaybackSource(sourceMusicInfo.meta.toggleMusicInfo?.source ?? sourceMusicInfo.source)
  if (cancelDelayRetry) cancelDelayRetry()
  global.lx.gettingUrlId = createGettingUrlId(musicInfo)
  void getMusicPlayUrl(musicInfo, isRefresh).then((url) => {
    if (!url) return
    setResource(musicInfo, url, playerState.progress.nowPlayTime)
  }).catch((err: any) => {
    console.log(err)
    setStatusText(err.message as string)
    global.app_event.error()
    addDelayNextTimeout()
  }).finally(() => {
    if (musicInfo === playerState.playMusicInfo.musicInfo) {
      global.lx.gettingUrlId = ''
      clearLoadTimeout()
    }
  })
}

// 恢复上次播放的状态
const handleRestorePlay = async(restorePlayInfo: LX.Player.SavedPlayInfo) => {
  const musicInfo = playerState.playMusicInfo.musicInfo
  if (!musicInfo) return

  setTimeout(() => {
    global.app_event.setProgress(settingState.setting['player.isSavePlayTime'] ? restorePlayInfo.time : 0, restorePlayInfo.maxTime)
  })

  const playMusicInfo = playerState.playMusicInfo

  void initTrackInfo(musicInfo, playerState.musicInfo)

  void getPicPath({ musicInfo, listId: playMusicInfo.listId }).then((url: string) => {
    if (
      musicInfo.id != playMusicInfo.musicInfo?.id ||
      playerState.musicInfo.pic == url ||
      playerState.loadErrorPicUrl == url
    ) return
    setMusicInfo({ pic: url })
    global.app_event.picUpdated()
  })

  void getLyricInfo({ musicInfo }).then((lyricInfo) => {
    if (musicInfo.id != playMusicInfo.musicInfo?.id) return
    setMusicInfo({
      lrc: lyricInfo.lyric,
      tlrc: lyricInfo.tlyric,
      lxlrc: lyricInfo.lxlyric,
      rlrc: lyricInfo.rlyric,
      rawlrc: lyricInfo.rawlrcInfo.lyric,
    })
    global.app_event.lyricUpdated()
  }).catch((err) => {
    console.log(err)
    if (musicInfo.id != playMusicInfo.musicInfo?.id) return
    setStatusText(global.i18n.t('lyric__load_error'))
  })
}


const debouncePlay = debounceBackgroundTimer((musicInfo: LX.Player.PlayMusic) => {
  setMusicUrl(musicInfo)

  void getPicPath({ musicInfo, listId: playerState.playMusicInfo.listId }).then((url: string) => {
    if (
      musicInfo.id != playerState.playMusicInfo.musicInfo?.id ||
      playerState.musicInfo.pic == url ||
      playerState.loadErrorPicUrl == url) return
    setMusicInfo({ pic: url })
    global.app_event.picUpdated()
  })

  void getLyricInfo({ musicInfo }).then((lyricInfo) => {
    if (musicInfo.id != playerState.playMusicInfo.musicInfo?.id) return
    setMusicInfo({
      lrc: lyricInfo.lyric,
      tlrc: lyricInfo.tlyric,
      lxlrc: lyricInfo.lxlyric,
      rlrc: lyricInfo.rlyric,
      rawlrc: lyricInfo.rawlrcInfo.lyric,
    })
    global.app_event.lyricUpdated()
  }).catch((err) => {
    console.log(err)
    if (musicInfo.id != playerState.playMusicInfo.musicInfo?.id) return
    setStatusText(global.i18n.t('lyric__load_error'))
  })
}, 200)

// 处理音乐播放
const handlePlay = async() => {
  if (!isInitialized()) {
    await checkNotificationPermission()
    void checkIgnoringBatteryOptimization()
    await playerInitial({
      volume: settingState.setting['player.volume'],
      playRate: settingState.setting['player.playbackRate'],
      cacheSize: settingState.setting['player.cacheSize'] ? parseInt(settingState.setting['player.cacheSize']) : 0,
      isHandleAudioFocus: settingState.setting['player.isHandleAudioFocus'],
      isEnableAudioOffload: settingState.setting['player.isEnableAudioOffload'],
    })
  }

  global.lx.isPlayedStop &&= false
  resetRandomNextMusicInfo()

  if (global.lx.restorePlayInfo) {
    void handleRestorePlay(global.lx.restorePlayInfo)
    global.lx.restorePlayInfo = null
    return
  }

  const playMusicInfo = playerState.playMusicInfo
  const musicInfo = playMusicInfo.musicInfo

  if (!musicInfo) return

  await setStop()
  global.app_event.pause()

  clearDelayNextTimeout()
  clearLoadTimeout()
  debouncePlay(musicInfo)
}

/**
 * 播放列表内歌曲
 * @param listId 列表id
 * @param id 歌曲id
 */
export const playListById = async(listId: string, id: string) => {
  const index = getList(listId).findIndex(m => m.id == id)
  if (index < 0) return
  await playList(listId, index)
}

/**
 * 播放列表内歌曲
 * @param listId 列表id
 * @param index 播放的歌曲位置
 */
export const playList = async(listId: string, index: number) => {
  const list = getList(listId)
  if (!list[index]) return
  setPlayListId(listId)

  let queue = list.map((musicInfo, sourceIndex) => createPlayQueueItem({
    musicInfo,
    listId,
    sourceIndex,
  })).filter(item => item.sourceIndex == index || isQueueMusicPlayable(item.musicInfo))
  let queueIndex = queue.findIndex(item => item.sourceIndex == index)
  if (settingState.setting['player.togglePlayMethod'] == 'random') {
    const [current] = queue.splice(queueIndex, 1)
    if (!current) return
    shuffleQueue(queue)
    queue.unshift(current)
    queueIndex = 0
  }
  replacePlayQueue(queue, queueIndex)
  setPlayMusicInfo(listId, queue[queueIndex].musicInfo)
  await handlePlay()
}

const handleToggleStop = async() => {
  await stop()
  setTimeout(() => {
    setPlayMusicInfo(null, null)
  })
}


export const resetRandomNextMusicInfo = () => {}

const shuffleQueue = (list: LX.Player.PlayQueueItem[]) => {
  for (let index = list.length - 1; index > 0; index--) {
    const targetIndex = getRandom(0, index + 1)
    const item = list[index]
    list[index] = list[targetIndex]
    list[targetIndex] = item
  }
}

const isQueueMusicPlayable = (musicInfo: LX.Player.PlayMusic) => {
  if ('progress' in musicInfo) return musicInfo.isComplate
  const dislikeInfo = dislikeState.dislikeInfo
  const name = musicInfo.name?.replaceAll(SPLIT_CHAR.DISLIKE_NAME, SPLIT_CHAR.DISLIKE_NAME_ALIAS).toLocaleLowerCase().trim() ?? ''
  const singer = musicInfo.singer?.replaceAll(SPLIT_CHAR.DISLIKE_NAME, SPLIT_CHAR.DISLIKE_NAME_ALIAS).toLocaleLowerCase().trim() ?? ''
  return !dislikeInfo.musicNames.has(name) &&
    !dislikeInfo.singerNames.has(singer) &&
    !dislikeInfo.names.has(`${name}${SPLIT_CHAR.DISLIKE_NAME}${singer}`)
}

const getQueueLoopIndex = () => {
  const index = playerState.playQueue.findIndex(item => item.origin == 'source')
  return index < 0 ? 0 : index
}

const resetLoopQueue = (isRandom: boolean) => {
  const queue = playerState.playQueue.filter(item => item.origin == 'source')
  if (isRandom) {
    shuffleQueue(queue)
  } else {
    queue.sort((a, b) => (a.sourceIndex ?? 0) - (b.sourceIndex ?? 0))
  }
  replacePlayQueue(queue, queue.length ? 0 : -1)
  return queue.length ? 0 : -1
}

export const applyPlayQueueMode = () => {
  const currentIndex = playerState.playQueueIndex
  if (currentIndex < 0 || currentIndex >= playerState.playQueue.length - 1) return
  const queue = [...playerState.playQueue]
  const indexes: number[] = []
  const sourceItems: LX.Player.PlayQueueItem[] = []
  for (let index = currentIndex + 1; index < queue.length; index++) {
    const item = queue[index]
    if (item.origin != 'source') continue
    indexes.push(index)
    sourceItems.push(item)
  }
  if (settingState.setting['player.togglePlayMethod'] == 'random') {
    shuffleQueue(sourceItems)
  } else {
    sourceItems.sort((a, b) => (a.sourceIndex ?? 0) - (b.sourceIndex ?? 0))
  }
  indexes.forEach((index, itemIndex) => {
    queue[index] = sourceItems[itemIndex]
  })
  replacePlayQueue(queue, currentIndex)
}

export const getNextPlayMusicInfo = async(): Promise<LX.Player.PlayMusicInfo | null> => {
  const queue = playerState.playQueue
  const currentIndex = playerState.playQueueIndex
  if (!queue.length) return null
  if (currentIndex < 0) return queue[0]
  if (settingState.setting['player.togglePlayMethod'] == 'singleLoop') return queue[currentIndex]
  if (currentIndex < queue.length - 1) return queue[currentIndex + 1]
  if (settingState.setting['player.togglePlayMethod'] == 'listLoop' || settingState.setting['player.togglePlayMethod'] == 'random') {
    return queue[getQueueLoopIndex()] ?? null
  }
  return null
}

export const playQueueItem = async(index: number) => {
  const item = playerState.playQueue[index]
  if (!item) return
  setPlayQueueIndex(index)
  setPlayMusicInfo(item.listId, item.musicInfo, item.isTempPlay)
  await handlePlay()
}

/**
 * 下一曲
 * @param isAutoToggle 是否自动切换
 */
export const playNext = async(isAutoToggle = false): Promise<void> => {
  const queue = playerState.playQueue
  if (!queue.length) return handleToggleStop()
  if (playerState.playQueueIndex < 0) return playQueueItem(0)
  if (isAutoToggle && settingState.setting['player.togglePlayMethod'] == 'singleLoop') {
    return playQueueItem(playerState.playQueueIndex)
  }

  let nextIndex = playerState.playQueueIndex + 1
  if (nextIndex >= queue.length) {
    if (isAutoToggle && (settingState.setting['player.togglePlayMethod'] == 'list' || settingState.setting['player.togglePlayMethod'] == 'none')) return
    const mode = settingState.setting['player.togglePlayMethod']
    nextIndex = mode == 'listLoop' || mode == 'random'
      ? resetLoopQueue(mode == 'random')
      : getQueueLoopIndex()
  }
  if (nextIndex < 0) return handleToggleStop()
  await playQueueItem(nextIndex)
}

/**
 * 上一曲
 */
export const playPrev = async(isAutoToggle = false): Promise<void> => {
  const queue = playerState.playQueue
  if (!queue.length) return handleToggleStop()
  if (playerState.playQueueIndex < 0) return playQueueItem(0)

  let prevIndex = playerState.playQueueIndex - 1
  if (prevIndex < 0) {
    if (isAutoToggle && (settingState.setting['player.togglePlayMethod'] == 'list' || settingState.setting['player.togglePlayMethod'] == 'none')) return
    prevIndex = queue.length - 1
  }
  await playQueueItem(prevIndex)
}

/**
 * 恢复播放
 */
export const play = () => {
  if (playerState.playMusicInfo.musicInfo == null) return
  if (isEmpty()) {
    if (createGettingUrlId(playerState.playMusicInfo.musicInfo) != global.lx.gettingUrlId) setMusicUrl(playerState.playMusicInfo.musicInfo)
    return
  }
  void setPlay()
}

/**
 * 暂停播放
 */
export const pause = async() => {
  await setPause()
}

/**
 * 停止播放
 */
export const stop = async() => {
  await setStop()
  setTimeout(() => {
    global.app_event.stop()
  })
}

/**
 * 播放、暂停播放切换
 */
export const togglePlay = () => {
  global.lx.isPlayedStop &&= false
  if (playerState.isPlay) {
    void pause()
  } else {
    play()
  }
}

/**
 * 收藏当前播放的歌曲
 */
export const collectMusic = () => {
  if (!playerState.playMusicInfo.musicInfo) return
  void addListMusics(LIST_IDS.LOVE, [
    'progress' in playerState.playMusicInfo.musicInfo
      ? playerState.playMusicInfo.musicInfo.metadata.musicInfo
      : playerState.playMusicInfo.musicInfo,
  ], settingState.setting['list.addMusicLocationType'])
}

/**
 * 取消收藏当前播放的歌曲
 */
export const uncollectMusic = () => {
  if (!playerState.playMusicInfo.musicInfo) return
  void removeListMusics(LIST_IDS.LOVE, [
    'progress' in playerState.playMusicInfo.musicInfo
      ? playerState.playMusicInfo.musicInfo.metadata.musicInfo.id
      : playerState.playMusicInfo.musicInfo.id,
  ])
}

/**
 * 不喜欢当前播放的歌曲
 */
export const dislikeMusic = async() => {
  if (!playerState.playMusicInfo.musicInfo) return
  const minfo = 'progress' in playerState.playMusicInfo.musicInfo ? playerState.playMusicInfo.musicInfo.metadata.musicInfo : playerState.playMusicInfo.musicInfo
  await addDislikeInfo([{ name: minfo.name, singer: minfo.singer }])
  await playNext(true)
}
