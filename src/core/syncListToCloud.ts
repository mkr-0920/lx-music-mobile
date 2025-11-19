import { post } from '@/utils/musicSdk/mkr/http'
import { getListMusics } from '@/core/list'

/**
 * 同步本地列表到你的外部服务器
 * (由 useMenu.js 调用)
 */
export default async(listInfo: LX.List.UserListInfo) => {
  // 1. 检查 ID
  if (!listInfo.sourceListId || listInfo.source !== 'wy') {
    console.error('[SyncToCloud] 此列表未绑定网易云歌单ID')
    return
  }

  // 2. 获取本地列表的所有歌曲
  // (getListMusics 是从 @renderer/store/list/listManage 导入的)
  const localSongs = await getListMusics(listInfo.id)
  console.log(`[SyncToCloud] 正在同步列表 "${listInfo.name}" (${listInfo.sourceListId})`)
  try {
    // 3.1 准备要发送的 data (body)
    const syncData = {
      listId: listInfo.sourceListId, // (e.g. "12345678")
      songs: localSongs.map(s => ({
        songmid: s.id,
        name: s.name,
        singer: s.singer,
        source: s.source,
      })),
    }

    // 3.2 调用 mypost(path, data)
    // (mypost 内部会处理 code: 200 检查, 失败会抛出错误)
    const resultData = await post('/netease/sync', syncData)

    // 4. 处理响应 (如果 await 没抛错, 就是成功)
    console.log(`[SyncToCloud] 同步成功: ${listInfo.name}`, resultData)
  } catch (err: any) {
    // 5. 捕获 mypost 抛出的错误
    console.error(`[SyncToCloud] 同步失败: ${err.message}`)
  }
}
