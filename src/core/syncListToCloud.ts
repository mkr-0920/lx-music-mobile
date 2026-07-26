import { eapiRequest } from '@/utils/musicSdk/wy/utils/index'
import { getListMusics } from '@/core/list'
import { toast } from '@/utils/tools'
import settingState from '@/store/setting/state'

interface EapiResponse {
  body: {
    code: number
    message?: string
    msg?: string
    playlist?: {
      trackIds: Array<{ id: number | string }>
    }
  }
}

const parsePlaylistId = (input: string): string => {
  if (!input) return ''
  const match = input.match(/[?&]id=(\d+)/)
  return match?.[1] ?? input
}

const getRequestOptions = () => ({
  mobile: true,
  headers: {
    Cookie: settingState.setting['common.wyCookie'],
  },
})

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
  if (body.code !== 200) throw new Error(body.message ?? body.msg ?? `获取远端歌单失败 (Code: ${body.code})`)
  return new Set((body.playlist?.trackIds ?? []).map(item => String(item.id)))
}

const manipulateTracks = async(op: 'add' | 'del' | 'update', playlistId: string, songIds: string[]) => {
  const trackIds = op == 'update' ? `[${songIds.join(',')}]` : JSON.stringify(songIds)
  const request = eapiRequest(
    '/api/playlist/manipulate/tracks',
    {
      pid: playlistId,
      trackIds,
      op,
      header: '{}',
      e_r: true,
    },
    getRequestOptions(),
  ) as any
  const { body } = await request.promise as EapiResponse
  if (body.code !== 200 && body.code !== 502) throw new Error(body.message ?? body.msg ?? `操作 ${op} 失败`)
}

export default async(listInfo: LX.List.UserListInfo): Promise<boolean> => {
  if (!listInfo.sourceListId || listInfo.source !== 'wy') {
    toast('此列表未绑定网易云歌单 ID，无法同步')
    return false
  }
  if (!settingState.setting['common.wyCookie']) {
    toast('请先在设置-基本设置中填写网易云 Cookie')
    return false
  }
  const playlistId = parsePlaylistId(listInfo.sourceListId)
  if (!/^\d+$/.test(playlistId)) {
    toast('无效的网易云歌单 ID')
    return false
  }

  try {
    const localMusics = await getListMusics(listInfo.id)
    const unsupportedMusics = localMusics.filter(musicInfo => musicInfo.source !== 'wy')
    if (unsupportedMusics.length) {
      toast(`有 ${unsupportedMusics.length} 首歌曲不是网易云来源，请先换源后再同步`)
      return false
    }
    const targetSongIds = localMusics.map(musicInfo => String(musicInfo.id).replace(/^wy_/, ''))
    if (targetSongIds.some(id => !/^\d+$/.test(id))) {
      toast('部分歌曲缺少有效的网易云歌曲 ID，请先换源后再同步')
      return false
    }

    toast(`开始同步：${listInfo.name}`)
    const currentSongIds = await getRemotePlaylistTracks(playlistId)
    const targetSongIdSet = new Set(targetSongIds)
    const toAdd = targetSongIds.filter(id => !currentSongIds.has(id))
    const toDel = Array.from(currentSongIds).filter(id => !targetSongIdSet.has(id))

    if (toDel.length) await manipulateTracks('del', playlistId, toDel)
    if (toAdd.length) await manipulateTracks('add', playlistId, toAdd)
    if (targetSongIds.length) await manipulateTracks('update', playlistId, targetSongIds)

    toast('同步至网易云成功！')
    return true
  } catch (error: any) {
    console.error('[Sync] Failed to sync NetEase playlist:', error)
    toast(`同步失败：${error.message ?? '未知错误'}`)
    return false
  }
}
