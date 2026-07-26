import { getPlayInfo, getPlayQueue } from '@/utils/data'
import { getListMusics } from '@/core/list'
import { playList, play, playQueueItem } from '@/core/player/player'
import { replacePlayQueue, restoreSavedPlayQueue } from '@/core/player/playQueue'
import { setPlayListId } from '@/core/player/playInfo'


export default async(setting: LX.AppSetting) => {
  const [info, savedQueue] = await Promise.all([getPlayInfo(), getPlayQueue()])
  global.lx.restorePlayInfo = null
  if (savedQueue) {
    const restoredQueue = await restoreSavedPlayQueue(savedQueue)
    if (restoredQueue) {
      const currentItem = restoredQueue.list[restoredQueue.index]
      const restoreInfo = info && currentItem.origin == 'source' &&
        currentItem.listId == info.listId && currentItem.sourceIndex == info.index
        ? info
        : null
      global.lx.restorePlayInfo = restoreInfo ?? {
        time: 0,
        maxTime: 0,
        listId: currentItem.listId ?? '',
        index: currentItem.sourceIndex ?? -1,
      }
      setPlayListId(restoredQueue.playerListId)
      replacePlayQueue(restoredQueue.list, restoredQueue.index)
      await playQueueItem(restoredQueue.index)
      if (setting['player.startupAutoPlay']) setTimeout(play)
      return
    }
  }
  if (!info?.listId || info.index < 0) return

  const list = await getListMusics(info.listId)
  if (!list[info.index]) return
  global.lx.restorePlayInfo = info

  await playList(info.listId, info.index)

  if (setting['player.startupAutoPlay']) setTimeout(play)


  // if (!info.list || !info.list[info.index]) {
  //   const info2 = { ...info }
  //   if (info2.list) {
  //     info2.music = info2.list[info2.index]?.name
  //     info2.list = info2.list.length
  //   }
  //   toast('恢复播放数据失败，请去错误日志查看', 'long')
  //   log.warn('Restore Play Info failed: ', JSON.stringify(info2, null, 2))

  //   return
  // }

  // let setting = store.getState().common.setting
  // global.restorePlayInfo = {
  //   info,
  //   startupAutoPlay: setting.startupAutoPlay,
  // }

  // store.dispatch(playerAction.setList({
  //   list: {
  //     list: info.list,
  //     id: info.listId,
  //   },
  //   index: info.index,
  // }))
}
