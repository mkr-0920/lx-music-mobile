import Btn from './Btn'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { usePlayMusicInfo } from '@/store/player/hook'

// 音乐百科入口：仅网易云歌曲(source === 'wy')显示
export default () => {
  const playMusicInfo = usePlayMusicInfo()
  const musicInfo = playMusicInfo.musicInfo
  const source = (musicInfo as { source?: string } | null)?.source
  if (source !== 'wy') return null

  const handleShowWikiScreen = () => {
    navigations.pushWikiScreen(commonState.componentIds.playDetail!)
  }

  return <Btn icon="album" onPress={handleShowWikiScreen} />
}
