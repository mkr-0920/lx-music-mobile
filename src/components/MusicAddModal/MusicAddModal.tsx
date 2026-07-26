import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import { toast } from '@/utils/tools'
import Title from './Title'
import List from './List'
import { useI18n } from '@/lang'
import { addListMusics, moveListMusics } from '@/core/list'
import settingState from '@/store/setting/state'
import { resolveWyRemoteTarget, type WyRemoteTarget } from '@/core/wyRemoteDraft'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfo | null
  listId: string
  isMove: boolean
  // single: boolean
}
const initSelectInfo = {}

export interface MusicAddModalProps {
  onAdded?: () => void
  // onRename: (listInfo: LX.List.UserListInfo) => void
  // onImport: (listInfo: LX.List.MyListInfo, index: number) => void
  // onExport: (listInfo: LX.List.MyListInfo, index: number) => void
  // onSync: (listInfo: LX.List.UserListInfo) => void
  // onRemove: (listInfo: LX.List.UserListInfo) => void
}
export interface MusicAddModalType {
  show: (info: SelectInfo) => void
}

export default forwardRef<MusicAddModalType, MusicAddModalProps>(({ onAdded }, ref) => {
  const t = useI18n()
  const dialogRef = useRef<DialogType>(null)
  const [selectInfo, setSelectInfo] = useState<SelectInfo>(initSelectInfo as SelectInfo)

  useImperativeHandle(ref, () => ({
    show(selectInfo) {
      setSelectInfo(selectInfo)

      requestAnimationFrame(() => {
        dialogRef.current?.setVisible(true)
      })
    },
  }))

  const handleHide = () => {
    requestAnimationFrame(() => {
      setSelectInfo({ ...selectInfo, musicInfo: null })
    })
  }

  const handleSelect = async(listInfo: LX.List.MyListInfo | WyRemoteTarget) => {
    dialogRef.current?.setVisible(false)
    try {
      let targetId = listInfo.id
      const remoteTarget = listInfo as WyRemoteTarget
      if (remoteTarget.remoteBoardId) targetId = (await resolveWyRemoteTarget(remoteTarget)).id
      if (selectInfo.isMove) {
        await moveListMusics(selectInfo.listId, targetId, [selectInfo.musicInfo!], settingState.setting['list.addMusicLocationType'])
        toast(t('list_edit_action_tip_move_success'))
      } else {
        await addListMusics(targetId, [selectInfo.musicInfo!], settingState.setting['list.addMusicLocationType'])
        toast(t('list_edit_action_tip_add_success'))
      }
      onAdded?.()
    } catch {
      toast(t(selectInfo.isMove ? 'list_edit_action_tip_move_failed' : 'list_edit_action_tip_add_failed'))
    }
  }

  return (
    <Dialog ref={dialogRef} onHide={handleHide}>
      {
        selectInfo.musicInfo
          ? (<>
              <Title musicInfo={selectInfo.musicInfo} isMove={selectInfo.isMove} />
              <List musicInfo={selectInfo.musicInfo} onPress={handleSelect} />
            </>)
          : null
      }
    </Dialog>
  )
})

