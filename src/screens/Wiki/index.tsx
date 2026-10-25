import { memo, useEffect, useState, useCallback } from 'react'
import { View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'

import Header from './components/Header'
import PageContent from '@/components/PageContent'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { createStyle, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { COMPONENT_IDS } from '@/config/constant'
import { setComponentId } from '@/core/common'
import playerState from '@/store/player/state'
import { getSongWiki, clearSongWikiCache, type WikiData } from '@/core/songWiki'
import { BorderWidths } from '@/theme'

// 从 playMusicInfo 取出当前播放的 musicInfo（与 Comment 屏同一模式）
const getMusicInfo = (musicInfo: LX.Player.PlayMusic | null) => {
  if (!musicInfo) return null
  return 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
}

type Status = 'loading' | 'success' | 'error' | 'empty'

export default memo(({ componentId }: {
  componentId: string
}) => {
  const [musicInfo, setMusicInfo] = useState<LX.Music.MusicInfo | null>(getMusicInfo(playerState.playMusicInfo.musicInfo))
  const [wiki, setWiki] = useState<WikiData | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const t = useI18n()
  const theme = useTheme()

  useEffect(() => {
    setComponentId(COMPONENT_IDS.wiki, componentId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const songId = musicInfo?.meta?.songId != null ? String(musicInfo.meta.songId) : ''
  const isWy = (musicInfo as { source?: string } | null)?.source === 'wy'

  const fetchWiki = useCallback(async(id: string, useCache: boolean) => {
    setStatus('loading')
    setErrorMsg('')
    try {
      if (!useCache) clearSongWikiCache(id)
      const data = await getSongWiki(id)
      setWiki(data)
      if (!data.about && data.baseInfo.length === 0 && data.sections.length === 0) {
        setStatus('empty')
      } else {
        setStatus('success')
      }
    } catch (err) {
      console.error('[Wiki] 拉取失败:', err)
      setErrorMsg((err as Error)?.message || 'unknown')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (isWy && songId) {
      void fetchWiki(songId, true)
    } else {
      setStatus('empty')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId, isWy])

  const retry = useCallback(() => {
    if (isWy && songId) void fetchWiki(songId, false)
  }, [fetchWiki, isWy, songId])

  const refresh = useCallback(() => {
    if (isWy && songId) {
      toast(t('wiki_refreshing'))
      void fetchWiki(songId, false)
    }
  }, [fetchWiki, isWy, songId, t])

  const isEmpty = status == 'empty' || (wiki != null && !wiki.about && wiki.baseInfo.length === 0 && wiki.sections.length === 0)

  return (
    <PageContent>
      {musicInfo == null ? null : (
        <>
          <Header musicInfo={musicInfo} />
          {!isWy ? (
            <View style={styles.center}>
              <Text>{t('wiki_not_support')}</Text>
            </View>
          ) : status === 'loading' ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme['c-primary']} />
              <Text style={styles.loadingText}>{t('wiki_loading')}</Text>
            </View>
          ) : status === 'error' ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{t('wiki_error', { msg: errorMsg })}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={retry}>
                <Text color={theme['c-primary-font-active']}>{t('wiki_retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : isEmpty ? (
            <View style={styles.center}>
              <Text>{t('wiki_empty')}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={retry}>
                <Text color={theme['c-primary-font-active']}>{t('wiki_retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {/* 右上角刷新 */}
              <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
                <Icon name="available_updates" size={18} color={theme['c-600']} />
              </TouchableOpacity>

              {wiki?.about ? (
                <View style={styles.sectionBox}>
                  <Text size={15} color={theme['c-primary-font-active']} style={styles.sectionTitle}>{t('wiki_about')}</Text>
                  <Text style={styles.aboutText}>{wiki.about}</Text>
                </View>
              ) : null}

              {wiki && wiki.baseInfo.length > 0 ? (
                <View style={styles.sectionBox}>
                  <Text size={15} color={theme['c-primary-font-active']} style={styles.sectionTitle}>{t('wiki_base_info')}</Text>
                  {wiki.baseInfo.map((item, i) => (
                    <View key={i} style={styles.baseInfoRow}>
                      {item.label ? <Text color={theme['c-font-label']} style={styles.baseInfoLabel}>{item.label}</Text> : null}
                      <Text style={styles.baseInfoValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {wiki?.sections.map((section, i) => (
                <View key={i} style={styles.sectionBox}>
                  <Text size={15} color={theme['c-primary-font-active']} style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.aboutText}>{section.content}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </PageContent>
  )
})

const styles = createStyle({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 12,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: BorderWidths.normal,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  refreshBtn: {
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 1,
    padding: 8,
  },
  sectionBox: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  aboutText: {
    lineHeight: 22,
  },
  baseInfoRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    flexWrap: 'wrap',
  },
  baseInfoLabel: {
    width: 80,
  },
  baseInfoValue: {
    flex: 1,
  },
})
