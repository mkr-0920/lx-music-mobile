import { eapiRequest } from '../utils/index'
import { handleResult } from '../utils/parser'
import { getRequestOptions } from './utils'

const API_URLS = {
  STYLE_TAGS: '/api/homepage/daily/song/config/get',
  STYLE_TAGS_SAVE: '/api/homepage/daily/song/tag/save',
  STYLE_PLAYLIST: '/api/homepage/category/daily/song/list',
  DAILY_RECOMMEND_BATCH: '/api/batch',
}

export default {
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

  getList: async(bangid, page) => {
    const options = getRequestOptions()

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

    const parts = bangid.split('_')
    if (parts.length !== 2) return { list: [], total: 0, source: 'wy' }

    const [tagId, categoryId] = parts

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
