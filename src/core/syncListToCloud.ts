// [文件: src/core/syncListToCloud.ts]

import { eapiRequest } from '@/utils/musicSdk/wy/utils/index'
import { getListMusics } from '@/core/list'
import { toast } from '@/utils/tools'
import settingState from '@/store/setting/state'

/**
 * 定义接口返回结构
 */
interface EapiResponse {
  body: {
    code: number
    message?: string
    msg?: string
    playlist?: {
      trackIds: Array<{ id: number | string }>
    }
    [key: string]: any
  }
}

/**
 * 辅助函数：解析歌单 ID
 */
const parsePlaylistId = (input: string): string => {
  if (!input) return ''
  const match = input.match(/[?&]id=(\d+)/)
  if (match) {
    return match[1]
  }
  return input
}

/**
 * 构造带有 Cookie 的请求选项
 */
const getRequestOptions = () => {
  const wyCookie = settingState.setting['common.wyCookie']
  if (!wyCookie) return 'mobile'
  return {
    mobile: true,
    headers: {
      Cookie: wyCookie,
    },
  }
}

/**
 * 获取网易云歌单详情
 */
const getRemotePlaylistTracks = async(playlistId: string): Promise<Set<string>> => {
  const request = eapiRequest(
    '/api/v6/playlist/detail',
    {
      id: playlistId,
      n: '100000',
      s: '0',
      header: '{}',
      e_r: true,
    },
    getRequestOptions(),
  ) as any

  const { body } = await request.promise as EapiResponse

  if (body.code !== 200) {
    throw new Error(`${body.message ?? body.msg ?? `获取远程歌单失败 (Code: ${body.code})`}`)
  }

  const trackIds = body.playlist?.trackIds ?? []
  return new Set(trackIds.map((t: { id: number | string }) => String(t.id)))
}

/**
 * 操作歌单
 */
const manipulateTracks = async(op: 'add' | 'del' | 'update', playlistId: string, songIds: string[]) => {
  let trackIdsStr = ''
  if (op === 'update') {
    trackIdsStr = `[${songIds.join(',')}]`
  } else {
    trackIdsStr = JSON.stringify(songIds)
  }

  const request = eapiRequest(
    '/api/playlist/manipulate/tracks',
    {
      pid: playlistId,
      trackIds: trackIdsStr,
      op,
      header: '{}',
      e_r: true,
    },
    getRequestOptions(),
  ) as any

  const { body } = await request.promise as EapiResponse

  if (body.code !== 200 && body.code !== 502) {
    throw new Error(`${body.message ?? body.msg ?? `操作 ${op} 失败`}`)
  }
  return body
}

/**
 * 同步本地列表到网易云 (主入口)
 */
export default async(listInfo: LX.List.UserListInfo) => {
  if (!listInfo.sourceListId || listInfo.source !== 'wy') {
    toast('此列表未绑定网易云歌单ID，无法同步')
    return
  }

  const wyCookie = settingState.setting['common.wyCookie']
  if (!wyCookie) {
    toast('请先在设置-基本设置中填写网易云 Cookie')
    return
  }

  const playlistId = parsePlaylistId(listInfo.sourceListId)
  if (!playlistId) {
    toast('无效的歌单 ID')
    return
  }

  toast(`开始同步: ${listInfo.name}`)
  console.log(`[Sync] 开始同步列表 "${listInfo.name}" (ID: ${playlistId}) ...`)

  try {
    const localMusics = await getListMusics(listInfo.id)
    const targetSongIds: string[] = []

    localMusics.forEach(m => {
      if (m.source === 'wy' && m.id) {
        const rawId = String(m.id).replace(/^wy_/, '')
        if (/^\d+$/.test(rawId)) {
          targetSongIds.push(rawId)
        }
      }
    })

    const currentSongIdSet = await getRemotePlaylistTracks(playlistId)
    const targetSongIdSet = new Set(targetSongIds)

    const toAdd = targetSongIds.filter(id => !currentSongIdSet.has(id))
    const toDel = Array.from(currentSongIdSet).filter(id => !targetSongIdSet.has(id))

    console.log(`[Sync] 差异计算: 新增 ${toAdd.length} 首, 删除 ${toDel.length} 首`)

    if (toDel.length > 0) {
      console.log(`[Sync] 正在删除 ${toDel.length} 首歌曲...`)
      await manipulateTracks('del', playlistId, toDel)
    }

    if (toAdd.length > 0) {
      console.log(`[Sync] 正在添加 ${toAdd.length} 首歌曲...`)
      await manipulateTracks('add', playlistId, toAdd)
    }

    if (targetSongIds.length > 0) {
      console.log('[Sync] 正在更新歌单顺序...')
      await manipulateTracks('update', playlistId, targetSongIds)
    }

    console.log('[Sync] 同步完成')
    toast('同步至网易云成功！')
  } catch (err: any) {
    console.error('[Sync] 同步失败:', err)
    const errMsg = err.message ?? '未知错误'
    toast(`同步失败: ${errMsg}`)
  }
}
