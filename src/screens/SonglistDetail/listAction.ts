import { createList, setTempList } from '@/core/list'
import { playList } from '@/core/player/player'
// 👇 改用带分发器的 core 方法 👇
import { getListDetailWithAlbum, getListDetailAllWithAlbum } from '@/core/songlist'
import { LIST_IDS } from '@/config/constant'
import listState from '@/store/list/state'
import syncSourceList from '@/core/syncSourceList'
import { confirmDialog, toMD5, toast } from '@/utils/tools'
import { type Source } from '@/store/songlist/state'

const getListId = (id: string, source: LX.OnlineSource) => `${source}__${id}`

// 👇 增加 type 参数，默认 songlist 👇
export const handlePlay = async(id: string, source: Source, list?: LX.Music.MusicInfoOnline[], index = 0, type: 'songlist' | 'album' = 'songlist') => {
  const listId = getListId(id, source)
  let isPlayingList = false

  if (!list?.length) list = (await getListDetailWithAlbum(id, source, 1, type)).list
  if (list?.length) {
    await setTempList(listId, [...list])
    void playList(LIST_IDS.TEMP, index)
    isPlayingList = true
  }

  const fullList = await getListDetailAllWithAlbum(source, id, type)
  if (!fullList.length) return
  if (isPlayingList) {
    if (listState.tempListMeta.id == listId) {
      await setTempList(listId, [...fullList])
    }
  } else {
    await setTempList(listId, [...fullList])
    void playList(LIST_IDS.TEMP, index)
  }
}

// 👇 增加 type 参数 👇
export const handleCollect = async(id: string, source: Source, name: string, type: 'songlist' | 'album' = 'songlist') => {
  const listId = getListId(id, source)

  const targetList = listState.userList.find(l => l.sourceListId == listId)
  if (targetList) {
    const confirm = await confirmDialog({
      message: global.i18n.t('duplicate_list_tip', { name: targetList.name }),
      cancelButtonText: global.i18n.t('list_import_part_button_cancel'),
      confirmButtonText: global.i18n.t('confirm_button_text'),
    })
    if (!confirm) return
    void syncSourceList(targetList)
    return
  }

  const list = await getListDetailAllWithAlbum(source, id, type)
  await createList({
    name,
    id: `${source}_${toMD5(listId)}`,
    list,
    source,
    sourceListId: id,
  })
  toast(global.i18n.t('collect_success'))
}
