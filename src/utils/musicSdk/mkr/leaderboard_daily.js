// [文件: src/utils/musicSdk/mkr/leaderboard_daily.js]

import { eapiRequest } from '../wy/utils/index'
import { handleResult } from '../wy/utils/parser'
import settingState from '@/store/setting/state'
import { toast } from '@/utils/tools'

const API_URLS = {
  STYLE_TAGS: '/api/homepage/daily/song/config/get',
  STYLE_TAGS_SAVE: '/api/homepage/daily/song/tag/save',
  STYLE_PLAYLIST: '/api/homepage/category/daily/song/list',
  DAILY_RECOMMEND_BATCH: '/api/batch',
}

const getRequestOptions = (forceOs = null) => {
  let wyCookie = settingState.setting['common.wyCookie']
  if (!wyCookie) {
    toast('请先在设置中填写网易云 Cookie')
    return 'mobile'
  }

  if (forceOs) {
    if (/os=[^;]+/.test(wyCookie)) {
      wyCookie = wyCookie.replace(/os=[^;]+/, `os=${forceOs}`)
    } else {
      wyCookie += `; os=${forceOs}`
    }
    if (!/appver=[^;]+/.test(wyCookie)) {
      wyCookie += '; appver=9.9.9'
    } else {
      // 2. 如果没有，追加它
      wyCookie += '; appver=9.9.9'
    }
  }

  return {
    mobile: true,
    headers: {
      Cookie: wyCookie,
    },
  }
}

export default {
  /**
   * getBoards (获取风格标签)
   */
  getBoards: async() => {
    const request = eapiRequest(
      API_URLS.STYLE_TAGS,
      {
        header: '{}',
        e_r: true,
      },
      getRequestOptions(),
    )

    const { body } = await request.promise
    const list = []
    const data = body.data || {}
    const categorys = data.categorys || []

    categorys.forEach(category => {
      const currentCategoryId = category.categoryId
      if (!currentCategoryId) return

      category.tagVOList.forEach(tag => {
        list.push({
          id: `wy_daily__${tag.tagId}_${currentCategoryId}`,
          name: tag.tagName,
          bangid: `${tag.tagId}_${currentCategoryId}`,
        })
      })
    })

    list.unshift({
      id: 'wy_daily__daily_recommend',
      name: '每日推荐',
      bangid: 'daily_recommend',
    })

    return {
      list,
      source: 'wy_daily',
    }
  },

  /**
   * getList (获取风格歌曲)
   */
  getList: async(bangid, page) => {
    const options = getRequestOptions()

    // --- 每日推荐 ---
    if (bangid === 'daily_recommend') {
      const request = eapiRequest(
        API_URLS.DAILY_RECOMMEND_BATCH,
        {
          '/api/v3/discovery/recommend/songs': '{"ispush":"false"}',
          '/api/discovery/recommend/songs/history/recent': '',
          header: '{}',
          e_r: true,
        },
        options,
      )

      const { body } = await request.promise
      const recommendData = body['/api/v3/discovery/recommend/songs']
      const rawList = recommendData?.data?.dailySongs || []

      const list = handleResult(rawList)
      return {
        list,
        allPage: 1,
        limit: list.length,
        total: list.length,
        source: 'wy',
      }
    }

    // --- 风格日推 ---
    const parts = bangid.split('_')
    if (parts.length !== 2) return { list: [], total: 0, source: 'wy' }

    const [tagId, categoryId] = parts

    // 保存偏好
    const saveRequest = eapiRequest(
      API_URLS.STYLE_TAGS_SAVE,
      {
        tags: JSON.stringify({
          tagIds: [parseInt(tagId)],
          categoryId: parseInt(categoryId),
        }),
        header: '{}',
        e_r: true,
      },
      options,
    )
    await saveRequest.promise

    // 获取列表
    const listRequest = eapiRequest(
      API_URLS.STYLE_PLAYLIST,
      {
        header: '{}',
        e_r: true,
      },
      options,
    )

    const { body } = await listRequest.promise
    const rawList = body.data?.dailySongs || []

    const list = handleResult(rawList)
    return {
      list,
      allPage: 1,
      limit: list.length,
      total: list.length,
      source: 'wy',
    }
  },
}
