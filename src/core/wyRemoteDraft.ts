import { createList, createUserList, getListMusics, overwriteListMusics, updateUserList } from '@/core/list'
import { getBoardsList, getListDetailAll as getBoardListAll } from '@/core/leaderboard'
import syncListToCloud from '@/core/syncListToCloud'
import listState from '@/store/list/state'
import settingState from '@/store/setting/state'
import { getData, saveData } from '@/plugins/storage'
import { storageDataPrefix } from '@/config/constant'
import { toMD5 } from '@/utils/tools'

type SnapshotMap = Record<string, string>

export interface WyRemoteTarget extends LX.List.UserListInfo {
  remoteBoardId: string
  remoteName: string
}

let snapshots: SnapshotMap | null = null

const getSnapshots = async(): Promise<SnapshotMap> => {
  if (snapshots) return snapshots
  // eslint-disable-next-line require-atomic-updates
  snapshots = await getData<SnapshotMap>(storageDataPrefix.wyRemoteDraftSnapshots) ?? {}
  return snapshots
}

const saveSnapshots = async() => {
  await saveData(storageDataPrefix.wyRemoteDraftSnapshots, await getSnapshots())
}

const setSnapshot = async(remoteId: string, hash: string) => {
  const value = await getSnapshots()
  value[remoteId] = hash
  await saveSnapshots()
}

export const getWyRemoteId = (boardId: string) => boardId.replace(/^mkr__/, '')

export const getWyDraftId = (boardId: string) => `wy_remote_${toMD5(getWyRemoteId(boardId))}`

export const isWyRemoteDraft = (listInfo: LX.List.MyListInfo) => listInfo.id.startsWith('wy_remote_')

export const findWyRemoteDraft = (boardId: string) => {
  const id = getWyDraftId(boardId)
  return listState.userList.find(list => list.id == id) ?? null
}

export const getWyRemoteDraftByListId = (listId: string) => {
  if (!listId.startsWith('wy_remote_')) return null
  return listState.userList.find(list => list.id == listId && list.source == 'wy' && !!list.sourceListId) ?? null
}

export const getWyRemoteTargets = async(isRefresh = false): Promise<WyRemoteTarget[]> => {
  if (!settingState.setting['common.wyUserId'].trim()) return []
  const list = await getBoardsList('mkr', isRefresh)
  return list.map(item => {
    const targetList = findWyRemoteDraft(item.id)
    return {
      id: targetList?.id ?? `wy_remote_target_${getWyRemoteId(item.id)}`,
      name: item.name,
      source: 'wy',
      sourceListId: getWyRemoteId(item.id),
      locationUpdateTime: null,
      remoteBoardId: item.id,
      remoteName: item.name,
    }
  })
}

export const resolveWyRemoteTarget = async(target: WyRemoteTarget) => {
  return ensureWyRemoteDraft(target.remoteBoardId, target.remoteName)
}

export const getWyDraftHash = (list: LX.Music.MusicInfo[]) => toMD5(list.map(musicInfo => musicInfo.id).join('\n'))

export const markWyRemoteDraftSynced = async(boardId: string, listId: string) => {
  const list = await getListMusics(listId)
  await setSnapshot(getWyRemoteId(boardId), getWyDraftHash(list))
  global.app_event.myListMusicUpdate([listId])
}

export const isWyRemoteDraftDirty = async(boardId: string) => {
  const targetList = findWyRemoteDraft(boardId)
  if (!targetList) return false
  const list = await getListMusics(targetList.id)
  const hash = getWyDraftHash(list)
  const remoteId = getWyRemoteId(boardId)
  const snapshot = (await getSnapshots())[remoteId]
  if (snapshot == null) {
    const remoteList = await getBoardListAll(boardId, true)
    const remoteHash = getWyDraftHash(remoteList)
    await setSnapshot(remoteId, remoteHash)
    return remoteHash != hash
  }
  return snapshot != hash
}

export const ensureWyRemoteDraft = async(boardId: string, name: string) => {
  const remoteId = getWyRemoteId(boardId)
  let targetList = findWyRemoteDraft(boardId)
  if (targetList) {
    if (targetList.name != name || targetList.source != 'wy' || targetList.sourceListId != remoteId) {
      await updateUserList([{ ...targetList, name, source: 'wy', sourceListId: remoteId }])
      targetList = findWyRemoteDraft(boardId) ?? targetList
    }
    if ((await getSnapshots())[remoteId] == null) await isWyRemoteDraftDirty(boardId)
    return targetList
  }

  const list = await getBoardListAll(boardId, true)
  const id = getWyDraftId(boardId)
  await createUserList(listState.userList.length, [{
    id,
    name,
    source: 'wy',
    sourceListId: remoteId,
    locationUpdateTime: null,
  }])
  await overwriteListMusics(id, list)
  targetList = findWyRemoteDraft(boardId)
  if (!targetList) throw new Error('Failed to create NetEase playlist draft')
  await setSnapshot(remoteId, getWyDraftHash(list))
  global.app_event.myListMusicUpdate([targetList.id])
  return targetList
}

export const refreshWyRemoteDraft = async(boardId: string, name: string) => {
  const remoteId = getWyRemoteId(boardId)
  const list = await getBoardListAll(boardId, true)
  let targetList = findWyRemoteDraft(boardId)
  if (!targetList) {
    const id = getWyDraftId(boardId)
    await createUserList(listState.userList.length, [{
      id,
      name,
      source: 'wy',
      sourceListId: remoteId,
      locationUpdateTime: null,
    }])
    targetList = findWyRemoteDraft(boardId)
    if (!targetList) throw new Error('Failed to create NetEase playlist draft')
  } else if (targetList.name != name || targetList.source != 'wy' || targetList.sourceListId != remoteId) {
    await updateUserList([{ ...targetList, name, source: 'wy', sourceListId: remoteId }])
    targetList = findWyRemoteDraft(boardId) ?? targetList
  }
  await overwriteListMusics(targetList.id, list)
  await setSnapshot(remoteId, getWyDraftHash(list))
  global.app_event.myListMusicUpdate([targetList.id])
  return targetList
}

export const syncWyRemoteDraft = async(boardId: string) => {
  const targetList = findWyRemoteDraft(boardId)
  if (!targetList) return false
  const success = await syncListToCloud(targetList)
  if (success) await markWyRemoteDraftSynced(boardId, targetList.id)
  return success
}

export const saveWyRemoteDraftAsLocal = async(boardId: string, name: string) => {
  const targetList = findWyRemoteDraft(boardId)
  if (!targetList) return
  const list = await getListMusics(targetList.id)
  await createList({ name, list })
}
