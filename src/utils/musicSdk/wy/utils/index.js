import { httpFetch } from '../../../request'
import { eapi, eapiDecrypt } from './crypto'
// 导入 Cookie 管理器
import CookieManager from '@react-native-cookies/cookies'

const wyDomain = 'https://interfacepc.music.163.com'

// 这是PC端的 Cookie 字符串，我们必须在这里解析它
const pcCookieString = 'appver=3.1.21.204647; os=pc; MUSIC_A=00D6281D066387AE193463B7115E072AB6E462629CE54284A50413D90265FCF611E4DB5CDC0B4EF0CF1C4131DA9DAAF101F4501C822187A17DCA34CF41DDE88F963B37458990D59C16F308B9113B492A02C0744B09710170D423C19D441FC5D2B19B6C1602CAC8B19B36C4B6EA21C01DA8197551C1E6A7F51E273108B8CC3A7330C7163C970D865AF5DEB0CA6497F968F11120DF2D792201A3653B405C71F005A896732A7BF78851C225C1C9DE247A085ACDE82D067AEAF7C0BB66BF43C90FF1E615CF87B89E10D80CFA3D505A2B62465A3E13101539F07E82FA4428059E1EEC9F330E2A90E7CE862A1B44821B927789E708CF39EDD1E6503456FBDC72EFDD4CE0A246A6A9282BBA4A07866521291C1391DDC1A9EBA30643717D3BFF7C5CF0632898FD192520BCCBA8F5B2E560C15FF9B00F833B2A9A4DE025C33379B4F914E18361F2CC12CE7B2F9DA00F58AC2F5CF5319F6548EEA10871C0435351C2EF0CE3D4D0B2D28D557EEB249F49CF90789F69EDD13542711915C3A945BF0BE31D35E340079C5E67CF319ADE51175A67A2774D4D745CAB03C206437B2E5E49643F01FEA3E797575AFAC3E40B8ECCD50C50F94F35089FC669620163CEF176F0554D25A0386AFB3FC3A7AB59EB2925B9DFB118C41I00D323188A51048F4439DF6C712CDD7873C4A2DBAC7095648142F111291FA7DF601FA0BBE8C3F58B23A8E4AB8A215684531DFDF099DAAC4480810792A73A628B189998C00D38230F3D4994242D106CF'

/**
 * 这是一个辅助函数，用于在发起请求前
 * 手动将 Cookie 注入到 Cookie Jar 中
 */
const setWyCookies = async(url) => {
  const cookies = pcCookieString.split('; ')
  // 为【每一块】Cookie 调用 CookieManager.set()
  const promises = cookies.map(cookie => {
    const parts = cookie.split('=')
    const name = parts.shift()
    const value = parts.join('=')
    if (!name || !value) return Promise.resolve()

    // 'set' 必须接收一个对象 (Map)，
    // 这就是修复 'String cannot be cast' 错误的方法
    return CookieManager.set(url, {
      name,
      value,
      domain: '.music.163.com', // 必须指定 domain
      path: '/', // 必须指定 path
    })
  })

  await Promise.all(promises)
}


export const eapiRequest = (url, data) => {
  const fullEapiUrl = `${wyDomain}${url.replace('/api/', '/eapi/')}`

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/3.1.21.204647',
    'mconfig-info': '{"IuRPVVmc3WWul9fT":{"version":870400,"appver":"3.1.21.204647"}}',
  }
  const encryptedForm = eapi(url, data)

  // 调用 setWyCookies()
  const requestObj = {
    // promise 链现在始于 setWyCookies
    promise: setWyCookies(wyDomain).then(() => {
      // Cookie 注入成功后, 才真正发起 httpFetch
      // 并设置 'credentials: include'
      return httpFetch(fullEapiUrl, {
        method: 'post',
        headers,
        form: encryptedForm,
        binary: true,
        credentials: 'include', // <-- 告诉 fetch 使用 Cookie Jar
      })
    })
    // httpFetch 返回的是 { promise, cancelHttp }
    //    我们需要从那个对象中解出真正的 promise
      .then(innerRequestObj => {
        return innerRequestObj.promise.then(({ body }) => {
          const encryptedTextHex = body ? body.toString('hex') : undefined
          const decryptedText = eapiDecrypt(encryptedTextHex)
          console.log('[WY eapiRequest] 解密后的文本:', decryptedText)
          let decryptedJson
          try {
            decryptedJson = JSON.parse(decryptedText)
            console.log('[WY eapiRequest] 解密并解析JSON成功:', decryptedJson)
          } catch (e) {
            console.error('[WY eapiRequest] JSON 解析失败:', e)
            decryptedJson = { code: 501, message: 'JSON Parse failed' }
          }
          return { body: decryptedJson, raw: decryptedText }
        })
      })
      .catch(err => {
        console.error('[WY eapiRequest] httpFetch 或 Cookie/解密 失败:', err)
        throw err
      }),
    cancelHttp: () => {
      // 取消逻辑目前无法简单实现，因为 httpFetch
      // 在 Promise 链内部被调用。
      // 这是一个为了让 Cookie 工作而付出的代价。
      console.warn('eapiRequest.cancelHttp() is not supported in this mode')
    },
  }

  return requestObj
}
