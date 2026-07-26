import playerState from '@/store/player/state'
import { savePlayQueue } from '@/utils/data'
import { debounceBackgroundTimer } from '@/utils/tools'

const saveQueue = debounceBackgroundTimer((queueInfo: LX.Player.PlayQueueInfo) => {
  if (!queueInfo.list.length || queueInfo.index < 0) {
    void savePlayQueue(null)
    return
  }
  void savePlayQueue({
    playerListId: playerState.playInfo.playerListId,
    index: queueInfo.index,
    items: queueInfo.list.map(item => ({
      origin: item.origin,
      listId: item.listId,
      musicId: item.musicInfo.id,
      sourceIndex: item.sourceIndex,
      musicInfo: item.origin == 'source' ? undefined : item.musicInfo,
    })),
  })
}, 300)

export default () => {
  global.state_event.on('playQueueChanged', saveQueue)
}
