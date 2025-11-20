// [文件: src/renderer/utils/musicSdk/mkr/leaderboard.js]
// 导入所有依赖
import { eapiRequest } from '../wy/utils/index'
import { get } from './http'
import { handleResult } from '../wy/utils/parser'

const userList = {
  1480211124: 'Halowuu',
  3891360967: '六月彡的雨',
  // ... 你可以添加任意多个
}

// 导出 leaderboard 对象
export default {
  /**
   * getBoards (获取风格标签)
   */
  getBoards: async() => {
    const data_tags = await get('/netease/style_tags')
    const list = []
    // console.log('获取标签：', data_tags)
    data_tags.categorys.forEach(category => {
      // 从外层 category 对象获取 ID
      const currentCategoryId = category.categoryId
      console.log('currentcategoryId: ', currentCategoryId)

      // 如果这个大类没有ID (值为 undefined, null, 0, 等)
      // 就跳过它，以及它下面的所有 tag
      if (!currentCategoryId) {
        console.warn('Skipping category with no ID:', category.categoryName)
        return // 跳过这个 category，继续下一个
      }
      category.tagVOList.forEach(tag => {
        list.push({ // 注意id第二部分与bangid保持一致
          id: `wy_daily__${tag.tagId}_${currentCategoryId}`,
          name: tag.tagName,
          bangid: `${tag.tagId}_${currentCategoryId}`,
        })
      })
    })
    Object.entries(userList).forEach(([uid, username]) => {
      // 例如: uid = '1480211124', username = '默认排行'
      // 插入“所有听歌排行” (type=0)
      list.unshift({
        id: `wy_daily__history_${uid}_0`,
        name: `${username}-所有时间`,
        bangid: `history_${uid}_0`,
      })
      // 插入“本周听歌排行” (type=1)
      list.unshift({
        id: `wy_daily__history_${uid}_1`,
        name: `${username}-最近一周`,
        bangid: `history_${uid}_1`,
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
    //  "每日推荐" 逻辑
    if (bangid === 'daily_recommend') {
      const data = await get('/netease/daily_recommend')
      const rawList = data || []
      // console.log('rawList: ', rawList)
      const list = handleResult(rawList)
      const total = list.length
      return {
        list,
        allPage: 1,
        limit: total,
        total,
        source: 'wy',
      }
    }
    // "听歌排行" 逻辑
    if (bangid.startsWith('history_')) {
      // bangid 现在的格式是 "history_1480211124_1"
      const parts = bangid.split('_') // ["history", "1480211124", "1"]

      if (parts.length !== 3) {
        // console.error('getList (history) 解析 bangid 失败:', bangid)
        return { list: [], total: 0, allPage: 1, limit: 0, source: 'wy' }
      }

      // 动态解析出 uid 和 type
      const uid = parts[1]
      const type = parts[2]

      // 使用 eapiRequest 发送动态参数
      const historyRequest = eapiRequest('/api/v1/play/record', {
        uid: String(uid),
        type: String(type),
        header: '{}',
        e_r: true,
      }, 'mobile')
      return historyRequest.promise.then(({ body }) => {
        const dataList = (type === '1') ? body.weekData : body.allData
        const rawList = dataList ? dataList.map(item => item.song) : []
        const list = handleResult(rawList)
        const total = list.length
        return {
          list,
          allPage: 1,
          limit: total,
          total,
          source: 'wy',
        }
      })
    }
    const [tagId, categoryId] = bangid.split('_')
    const data_songs = await get('/netease/style_recommend', { tag_id: parseInt(tagId), category_id: parseInt(categoryId) })
    const list = handleResult(data_songs?.dailySongs || [])
    // console.log('获取风格推荐歌单：', data_songs)
    const total = list.length
    return {
      list,
      allPage: 1,
      limit: total,
      total,
      source: 'wy',
    }
  },
}
