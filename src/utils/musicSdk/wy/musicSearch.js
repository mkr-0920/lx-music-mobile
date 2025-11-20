import { eapiRequest } from './utils/index'
import { handleResult } from './utils/parser'

export default {
  limit: 20,
  total: 0,
  page: 0,
  allPage: 1,
  handleResult,
  musicSearch(str, page, limit) {
    const searchRequest = eapiRequest('/api/search/song/list/page', {
      keyword: str,
      scene: 'normal',
      limit: String(limit),
      offset: String(limit * (page - 1)),
      needCorrect: 'true',
      channel: 'typing',
      e_r: true,
    }, 'pc')
    // // 返回解密后的 body
    return searchRequest.promise.then(({ body }) => body)
  },

  search(str, page = 1, limit, retryNum = 0) {
    if (++retryNum > 3) return Promise.reject(new Error('try max num'))
    if (limit == null) limit = this.limit
    // console.log(`[WY search] 正在尝试第 ${retryNum} 次搜索: "${str}"`)
    return this.musicSearch(str, page, limit).then(result => {
      //  console.log(`[WY search] 第 ${retryNum} 次尝试, 收到的 result:`, result)
      if (!result || result.code !== 200) {
        //  console.warn(`[WY search] 第 ${retryNum} 次尝试失败... (Code: ${result?.code})`)
        return this.search(str, page, limit, retryNum)
      }
      let list = this.handleResult(result.data?.resources || [])
      if (list == null) { // handleResult 不会返回 null, 但以防万一
        return this.search(str, page, limit, retryNum)
      }

      this.total = result.data?.totalCount || 0
      this.page = page
      this.allPage = Math.ceil(this.total / this.limit)

      return {
        list,
        allPage: this.allPage,
        limit: this.limit,
        total: this.total,
        source: 'wy',
      }
    })
  },
}
