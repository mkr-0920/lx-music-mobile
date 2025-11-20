import { useMemo, useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import Menu, { type Menus, type MenuType, type Position } from '@/components/common/Menu'

export interface SelectInfo {
  listId: string
  name: string
  index: number
}
const initSelectInfo = {}

export interface ListMenuProps {
  onPlay: (selectInfo: SelectInfo) => void
  onCollect: (selectInfo: SelectInfo) => void
  onRefresh: (selectInfo: SelectInfo) => void
  onHideMenu: () => void
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position: Position) => void
}

export type {
  Position,
}

export default forwardRef<ListMenuType, ListMenuProps>((props, ref) => {
  const t = useI18n()
  const [visible, setVisible] = useState(false)
  const [currentListId, setCurrentListId] = useState('')
  const menuRef = useRef<MenuType>(null)
  const selectInfoRef = useRef<SelectInfo>(initSelectInfo as SelectInfo)

  useImperativeHandle(ref, () => ({
    show(selectInfo, position) {
      selectInfoRef.current = selectInfo
      setCurrentListId(selectInfo.listId)
      if (visible) menuRef.current?.show(position)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          menuRef.current?.show(position)
        })
      }
    },
  }))

  const menus = useMemo(() => {
    const list = [
      { action: 'play', label: t('play') },
      { action: 'collect', label: t('collect') },
    ]
    // 如果是私人FM (wy_fm 开头)，添加“换一批”按钮
    if (currentListId.startsWith('wy_fm')) {
      list.push({ action: 'refresh', label: t('refresh') }) // 建议后续加入 i18n: t('refresh')
    }
    return list as Menus
  }, [t, currentListId])

  const handleMenuPress = ({ action }: typeof menus[number]) => {
    const selectInfo = selectInfoRef.current
    switch (action) {
      case 'play':
        props.onPlay(selectInfo)
        break
      case 'collect':
        props.onCollect(selectInfo)
        break
      case 'refresh':
        props.onRefresh(selectInfo)
        break
      default:
        break
    }
  }

  return (
    visible
      ? <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} onHide={props.onHideMenu} />
      : null
  )
})

