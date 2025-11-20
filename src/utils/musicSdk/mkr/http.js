import { httpFetch } from '../../request'
import { BASE_URL, API_KEY } from './config'

/**
 * 发起 GET 请求
 * @param {string} path API 路径 (例如 /search)
 * @param {object} params URL 查询参数
 * @returns {Promise<any>} JSON 响应体
 */
export const get = (path, params = {}) => {
  // 注意url.search有bug，不要使用
  // 1. 先构建基础 URL
  const baseUrl = BASE_URL + path

  // 2. 将 params 对象转换为查询字符串
  const queryString = new URLSearchParams(params).toString()
  // 3. 手动将它们拼接为最终的 URL
  //    (确保总有一个 '?'，即使 queryString 为空)
  const finalUrl = baseUrl + '?' + queryString

  const options = {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
    },
  }

  // console.log('finalUrl', finalUrl)
  // console.log('params', params)

  // 4. 将拼接好的 *字符串* 传递给 httpFetch
  const requestObj = httpFetch(finalUrl, options)

  // 我们返回这个 promise
  return requestObj.promise.then(resp => {
    // request.js (50行) 已经帮我们 JSON.parse(resp.body) 了
    // 我们只需要检查 API 业务代码
    if (resp.body.code !== 200) {
      // API 逻辑失败 (例如 code: 404)
      throw new Error(resp.body.message || 'API 请求失败')
    } else {
      // API 成功, 返回 data 字段
      return resp.body.data
    }
  }).catch(err => {
    // httpFetch 内部的 catch (116行) 会处理 ETIMEDOUT 等
    // 如果 .promise reject, 我们也将其抛出
    return Promise.reject(err)
  })
}

export const post = (path, data = {}) => {
  const url = new URL(BASE_URL + path)

  const options = {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    // request.js 会自动 stringify 它 (因为 json: true)
    body: data,
  }
  const requestObj = httpFetch(url.toString(), options)

  return requestObj.promise.then(resp => {
    // 假设 request.js 已经 JSON.parse(resp.body)
    if (resp.body.code !== 200) {
      throw new Error(resp.body.message || 'API 请求失败')
    } else {
      // API 成功, 返回 data 字段
      return resp.body.data
    }
  }).catch(err => {
    // httpFetch 内部的 catch 会处理 ETIMEDOUT 等
    return Promise.reject(err)
  })
}
