// [文件: src/screens/Home/Views/Setting/settings/Basic/index.tsx]

import { memo } from 'react'

import Theme from '../Theme'
import Section from '../../components/Section'
import Source from './Source'
import SourceName from './SourceName'
import Language from './Language'
import FontSize from './FontSize'
import ShareType from './ShareType'
import IsStartupAutoPlay from './IsStartupAutoPlay'
import IsStartupPushPlayDetailScreen from './IsStartupPushPlayDetailScreen'
import IsAutoHidePlayBar from './IsAutoHidePlayBar'
import IsHomePageScroll from './IsHomePageScroll'
import IsUseSystemFileSelector from './IsUseSystemFileSelector'
import IsAlwaysKeepStatusbarHeight from './IsAlwaysKeepStatusbarHeight'
import IsShowBackBtn from './IsShowBackBtn'
import IsShowExitBtn from './IsShowExitBtn'
import DrawerLayoutPosition from './DrawerLayoutPosition'
import { useI18n } from '@/lang/i18n'
import InputItem from '../../components/InputItem'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'

export default memo(() => {
  const t = useI18n()

  // 获取当前设置值
  const wyUserId = useSettingValue('common.wyUserId')
  const wyCookie = useSettingValue('common.wyCookie')

  // 定义更新函数
  const setWyUserId = (text: string) => {
    updateSetting({ 'common.wyUserId': text })
  }
  const setWyCookie = (text: string) => {
    updateSetting({ 'common.wyCookie': text })
  }

  return (
    <Section title={t('setting_basic')}>
      <IsStartupAutoPlay />
      <IsStartupPushPlayDetailScreen />
      <IsShowBackBtn />
      <IsShowExitBtn />
      <IsAutoHidePlayBar />
      <IsHomePageScroll />
      <IsUseSystemFileSelector />
      <IsAlwaysKeepStatusbarHeight />
      <Theme />
      <DrawerLayoutPosition />
      <Language />
      <FontSize />
      <ShareType />
      <Source />
      <InputItem
        value={wyUserId}
        label="网易云用户ID"
        placeholder="UID (选填)"
        onChanged={setWyUserId}
      />
      <InputItem
        value={wyCookie}
        label="网易云 Cookie"
        placeholder="Cookies (必填，用于日推/私人FM)"
        onChanged={setWyCookie}
      />

      <SourceName />
    </Section>
  )
})
