import playerActions from '@/store/player/action'
import playerState from '@/store/player/state'
import { getListMusics } from '@/utils/listManage'

export const createPlayQueueItem = playerActions.createPlayQueueItem

export const replacePlayQueue = (list: LX.Player.PlayQueueItem[], index: number) => {
  playerActions.replacePlayQueue(list, index)
}

export const setPlayQueueIndex = (index: number) => {
  playerActions.setPlayQueueIndex(index)
}

export const movePlayQueueItem = (oldIndex: number, newIndex: number) => {
  playerActions.movePlayQueueItem(oldIndex, newIndex)
}

export const removePlayQueueItem = (index: number) => {
  playerActions.removePlayQueueItem(index)
}

export const clearPendingPlayQueue = () => {
  playerActions.clearPendingPlayQueue()
}

export const getPlayQueueInfo = (): LX.Player.PlayQueueInfo => ({
  list: playerState.playQueue,
  index: playerState.playQueueIndex,
})

export const restoreSavedPlayQueue = async(savedQueue: LX.Player.SavedPlayQueue) => {
  const list: LX.Player.PlayQueueItem[] = []
  let currentIndex = -1
  for (let index = 0; index < savedQueue.items.length; index++) {
    const item = savedQueue.items[index]
    let musicInfo: LX.Player.PlayMusic | undefined
    let sourceIndex = item.sourceIndex
    if (item.origin == 'source') {
      if (item.listId) {
        const sourceList = await getListMusics(item.listId)
        sourceIndex = sourceList.findIndex(music => music.id == item.musicId)
        musicInfo = sourceIndex < 0 ? undefined : sourceList[sourceIndex]
      }
    } else {
      musicInfo = item.musicInfo
    }
    if (!musicInfo) continue
    list.push(createPlayQueueItem({
      musicInfo,
      listId: item.listId,
      isTempPlay: item.origin != 'source',
      origin: item.origin,
      sourceIndex,
    }))
    if (index == savedQueue.index) currentIndex = list.length - 1
  }
  if (currentIndex < 0 || !list[currentIndex]) return null
  return {
    list,
    index: currentIndex,
    playerListId: savedQueue.playerListId,
  }
}
