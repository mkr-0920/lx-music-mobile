import { httpFetch } from '../../request'
import { BASE_URL, API_KEY } from './config'

const handleResponse = (resp) => {
  const body = resp.body
  if (!body || typeof body != 'object') throw new Error('mkr API 响应格式无效')
  if (body.code !== 200) throw new Error(body.message || 'mkr API 请求失败')
  if (body.data == null) throw new Error('mkr API 响应缺少 data')
  return body.data
}

/**
 * 发起 GET 请求
 * @param {string} path API 路径 (例如 /search)
 * @param {object} params URL 查询参数
 * @returns {Promise<any>} JSON 响应体
 */
export const get = (path, params = {}) => {
  const baseUrl = BASE_URL + path
  const queryString = new URLSearchParams(params).toString()
  const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl

  const options = {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
    },
  }

  const requestObj = httpFetch(finalUrl, options)
  return requestObj.promise.then(handleResponse)
}

export const post = (path, data = {}) => {
  const options = {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    // request.js 会自动 stringify 它 (因为 json: true)
    body: data,
  }
  const requestObj = httpFetch(BASE_URL + path, options)

  return requestObj.promise.then(handleResponse)
}
