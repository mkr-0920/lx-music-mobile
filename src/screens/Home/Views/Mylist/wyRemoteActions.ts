import { playList } from '@/core/player/player'
import { setActiveList } from '@/core/list'
import {
  ensureWyRemoteDraft,
  refreshWyRemoteDraft,
  saveWyRemoteDraftAsLocal,
  syncWyRemoteDraft,
  type WyRemoteTarget,
} from '@/core/wyRemoteDraft'
import { confirmDialog, toast } from '@/utils/tools'

const handleError = (error: unknown) => {
  console.error('[WY Remote List] Operation failed:', error)
  toast(global.i18n.t('my_list__wy_operation_failed'))
}

export const openWyRemoteTarget = async(item: WyRemoteTarget) => {
  try {
    const targetList = await ensureWyRemoteDraft(item.remoteBoardId, item.remoteName)
    setActiveList(targetList.id)
    global.app_event.changeLoveListVisible(false)
    return targetList
  } catch (error) {
    handleError(error)
    return null
  }
}

export const playWyRemoteTarget = async(item: WyRemoteTarget) => {
  try {
    const targetList = await ensureWyRemoteDraft(item.remoteBoardId, item.remoteName)
    void playList(targetList.id, 0)
  } catch (error) {
    handleError(error)
  }
}

export const refreshWyRemoteTarget = async(item: WyRemoteTarget, discardChanges = false) => {
  if (discardChanges) {
    const confirm = await confirmDialog({
      message: global.i18n.t('my_list__wy_discard_confirm', { name: item.name }),
      confirmButtonText: global.i18n.t('confirm_button_text'),
    })
    if (!confirm) return
  }
  try {
    const targetList = await refreshWyRemoteDraft(item.remoteBoardId, item.remoteName)
    setActiveList(targetList.id)
    global.app_event.changeLoveListVisible(false)
  } catch (error) {
    handleError(error)
  }
}

export const syncWyRemoteTarget = async(item: WyRemoteTarget) => {
  const confirm = await confirmDialog({
    message: global.i18n.t('my_list__wy_sync_to_cloud_confirm', { name: item.name }),
    confirmButtonText: global.i18n.t('confirm_button_text'),
  })
  if (!confirm) return
  await syncWyRemoteDraft(item.remoteBoardId)
}

export const saveWyRemoteTargetAsLocal = async(item: WyRemoteTarget) => {
  try {
    await ensureWyRemoteDraft(item.remoteBoardId, item.remoteName)
    await saveWyRemoteDraftAsLocal(item.remoteBoardId, global.i18n.t('my_list__wy_local_copy_name', { name: item.name }))
    toast(global.i18n.t('collect_success'))
  } catch (error) {
    handleError(error)
  }
}
