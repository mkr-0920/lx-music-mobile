import { getPlayInfo } from './musicInfo' // <--- 修改导入

/**
 * 获取歌词
 */
export default (songInfo) => {
  // 使用从 musicInfo.js 导入的 getPlayInfo
  const promise = getPlayInfo(songInfo.songmid).then(playInfo => { // <--- 修改调用
    if (!playInfo || !playInfo.lyrics) {
      console.warn('[MyMusic] getLyric 警告: API 响应中没有找到 "lyrics" 字段', playInfo)
      return {
        lyric: '[00:00.00] 暂无歌词',
        tlyric: '',
      }
    }

    return {
      lyric: playInfo.lyrics,
      tlyric: playInfo.tlyrics || '',
    }
  })

  return {
    promise,
    cancelHttp: () => {},
  }
}
