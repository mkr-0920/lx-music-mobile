import { memo, useMemo } from 'react'
import { View } from 'react-native'

import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { usePlaybackSource, usePlayMusicInfo } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

const getSourceLabel = (source: LX.Source) => source == 'local' ? 'LOCAL' : source.toUpperCase()

export default memo(({ fontSize = 9 }: { fontSize?: number }) => {
  const playMusicInfo = usePlayMusicInfo()
  const playbackSource = usePlaybackSource()
  const sourceNameType = useSettingValue('common.sourceNameType')
  const theme = useTheme()
  const t = useI18n()

  const info = useMemo(() => {
    const musicInfo = playMusicInfo.musicInfo
    if (!musicInfo) return null
    const sourceMusicInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
    const origin = sourceMusicInfo.source
    const actual = playbackSource ?? sourceMusicInfo.meta.toggleMusicInfo?.source ?? origin
    const getSourceName = (source: LX.Source) => source == 'local'
      ? t('player_source_local')
      : t(`source_${sourceNameType}_${source}`)
    return {
      label: origin == actual
        ? getSourceLabel(actual)
        : `${getSourceLabel(origin)} \u2192 ${getSourceLabel(actual)}`,
      accessibilityLabel: origin == actual
        ? t('player_source_tip', { source: getSourceName(origin) })
        : t('player_source_toggled_tip', {
          origin: getSourceName(origin),
          actual: getSourceName(actual),
        }),
    }
  }, [playMusicInfo.musicInfo, playbackSource, sourceNameType, t])

  if (!info) return null
  return (
    <View
      accessible
      accessibilityLabel={info.accessibilityLabel}
      pointerEvents="none"
      style={{ ...styles.badge, backgroundColor: theme['c-primary-light-100-alpha-100'] }}
    >
      <Text
        numberOfLines={1}
        size={fontSize}
        color={theme['c-button-font']}
        style={styles.text}
      >
        {info.label}
      </Text>
    </View>
  )
})

const styles = createStyle({
  badge: {
    height: 16,
    marginLeft: 5,
    paddingHorizontal: 5,
    borderRadius: 3,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
})
