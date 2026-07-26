import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import Menu, { type Menus, type MenuType, type Position } from '@/components/common/Menu'
import { useI18n } from '@/lang'
import { scaleSizeW } from '@/utils/pixelRatio'
import { type WyRemoteTarget } from '@/core/wyRemoteDraft'

interface SelectInfo {
  item: WyRemoteTarget
  dirty: boolean
}

export interface WyRemoteMenuType {
  show: (selectInfo: SelectInfo, position: Position) => void
}

export interface WyRemoteMenuProps {
  onPlay: (item: WyRemoteTarget) => void
  onRefresh: (item: WyRemoteTarget) => void
  onDiscard: (item: WyRemoteTarget) => void
  onSync: (item: WyRemoteTarget) => void
  onSaveAsLocal: (item: WyRemoteTarget) => void
}

export default forwardRef<WyRemoteMenuType, WyRemoteMenuProps>((props, ref) => {
  const t = useI18n()
  const menuRef = useRef<MenuType>(null)
  const selectInfoRef = useRef<SelectInfo>()
  const [menus, setMenus] = useState<Menus>([])
  const [visible, setVisible] = useState(false)

  useImperativeHandle(ref, () => ({
    show(selectInfo, position) {
      selectInfoRef.current = selectInfo
      setMenus([
        { action: 'play', label: t('play') },
        { action: 'refresh', disabled: selectInfo.dirty, label: t('my_list__wy_refresh_current') },
        { action: 'discard', disabled: !selectInfo.dirty, label: t('my_list__wy_discard_changes') },
        { action: 'sync', disabled: !selectInfo.dirty, label: t('list_sync_to_cloud') },
        { action: 'save_as_local', label: t('my_list__wy_save_as_local') },
      ])
      if (visible) menuRef.current?.show(position)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          menuRef.current?.show(position)
        })
      }
    },
  }))

  const handlePress = ({ action }: typeof menus[number]) => {
    const item = selectInfoRef.current?.item
    if (!item) return
    switch (action) {
      case 'play': props.onPlay(item); break
      case 'refresh': props.onRefresh(item); break
      case 'discard': props.onDiscard(item); break
      case 'sync': props.onSync(item); break
      case 'save_as_local': props.onSaveAsLocal(item); break
    }
  }

  return visible
    ? <Menu ref={menuRef} menus={menus} onPress={handlePress} width={scaleSizeW(150)} />
    : null
})

export type { Position }
