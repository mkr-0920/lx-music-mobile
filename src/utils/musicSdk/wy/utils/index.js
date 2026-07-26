// [文件: src/utils/musicSdk/wy/utils/index.js]

import { httpFetch } from '../../../request'
import { eapi, eapiDecrypt } from './crypto'
import CookieManager from '@react-native-cookies/cookies'

const pcConfig = {
  baseUrl: 'https://interfacepc.music.163.com',
  domain: '.music.163.com',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/3.1.21.204647',
    'mconfig-info': '{"IuRPVVmc3WWul9fT":{"version":870400,"appver":"3.1.21.204647"}}',
  },
  // 保留默认 Cookie 作为 fallback
  cookieString: 'appver=3.1.21.204647; os=pc; MUSIC_A=00D6281D066387AE193463B7115E072AB6E462629CE54284A50413D90265FCF611E4DB5CDC0B4EF0CF1C4131DA9DAAF101F4501C822187A17DCA34CF41DDE88F963B37458990D59C16F308B9113B492A02C0744B09710170D423C19D441FC5D2B19B6C1602CAC8B19B36C4B6EA21C01DA8197551C1E6A7F51E273108B8CC3A7330C7163C970D865AF5DEB0CA6497F968F11120DF2D792201A3653B405C71F005A896732A7BF78851C225C1C9DE247A085ACDE82D067AEAF7C0BB66BF43C90FF1E615CF87B89E10D80CFA3D505A2B62465A3E13101539F07E82FA4428059E1EEC9F330E2A90E7CE862A1B44821B927789E708CF39EDD1E6503456FBDC72EFDD4CE0A246A6A9282BBA4A07866521291C1391DDC1A9EBA30643717D3BFF7C5CF0632898FD192520BCCBA8F5B2E560C15FF9B00F833B2A9A4DE025C33379B4F914E18361F2CC12CE7B2F9DA00F58AC2F5CF5319F6548EEA10871C0435351C2EF0CE3D4D0B2D28D557EEB249F49CF90789F69EDD13542711915C3A945BF0BE31D35E340079C5E67CF319ADE51175A67A2774D4D745CAB03C206437B27E5E49643F01FEA3E797575AFAC3E40B8ECCD50C50F94F35089FC669620163CEF176F0554D25A0386AFB3FC3A7AB59EB2925B9DFB118C41I00D323188A51048F4439DF6C712CDD7873C4A2DBAC7095648142F111291FA7DF601FA0BBE8C3F58B23A8E4AB8A215684531DFDF099DAAC4480810792A73A628B189998C00D38230F3D4994242D106CF',
}

const mobileConfig = {
  baseUrl: 'https://interface3.music.163.com',
  domain: '.music.163.com',
  headers: {
    'User-Agent': 'NeteaseMusic/9.4.70.260310173524(9004070);Dalvik/2.1.0 (Linux; U; Android 15; Mi 1000 Pro Build/SKQ1.211006.001)',
  },
  // 保留默认 Cookie 作为 fallback
  cookieString: 'EVNSM=1.0.0; NMCID=hkumvg.1774926022513.01.4; versioncode=9004085; buildver=260324204021; resolution=2356x1080; ntes_kaola_ad=1; mobilename=RedmiPro; __csrf=beebb40103c69dd3ec3222d2c866bc25; brand=Redmi; osver=12; os=android; channel=xiaomi; MUSIC_A=009D8BF2D1AEAB157B21987FC1986E0E8FCD8E1362E664E4D7DDDE78E50F709C75763C4BA8122020A9A2E40472C2E9DA9A31B9AFF81B34A6E8BC422AA25E123D46898E294B96AEA9AE26977759209B41555B280C0D7CA91CD987114138B287FD414574E18BFB212CFC6963E8A25D431135263C9141C7702725712349039808535BA54387A2F874CD82D0421C22394A2B0542DF8E097CC3030B495735F731C73DB0F1668CBE339156B80B0AAD723BCBF13D3D65CC9122CB7749C8AF7F30DC6C807504C1228ED5AD03074E9AF9132E374937111A65E1D4F4C3FD45FBED41F972A52AE747EC57A6F38DF29C398FD8796A092595F7BFDA4E96F6C91C1FBBF107D968187FC0880A68298EF571936F77604EBC68E0B307A878B04D296B4BA3E6621369EDB4C68B28D02B3DEF9D1C829A504276AC90B0F928BF1AF255DBFBF8BC4528390C6E692D61987A437A323BB2C33CFB64E4A8A037BA77487AD364FBFDA3BF3EE2C362CA2B85CFFCDF8A8FC7176A866DA0673B6BE665371795FA693C6ADFB10E018F3BB68630D63D5C4F59B00705439C1508C4E98426BDA77DADBF68E717FC1F0C33E2AB8F8A6A75166B9BDBB1CC1F512E19DEE47FC4CC1762B885C88FB8B4103267210DC6AA38955E1B82E06921E00A9BA3D825974D32647AAF27DE08303ABBD1D7E98BFC05279F1D1977425FB73FA4C1E1B2F339A13734FCAC10EC184FE686F00D; screenType=other; deviceId=CTRjOjYzOjcxOmM0OjY3OjRiCTU2MzE4Y2VlNmY3YmYzMjgJMGU3NTFmZGY3YTc5NTA1Yw%3D%3D; appver=9.4.85; NMDI=Q1NKTQkBDAA5WsL3b3gFxOBZrWdUAAAAyos%2BaJ7l%2BoAen2zBCPZ67UI3Zax4tvJmWc3x%2Fcel9Z6BHmN9UxBQqHxpx%2BqySQWbbMs5MaK%2F%2F1MuGD58Rbcp%2BlRK21TsafhDqh9GPUtI2r%2FGDpIr; NMTID=00OT2vlabPL6qIdfUiDgxTCprdeiEMAAAGdQdXI_Q; packageType=release; minors_mode_age_range=0',
}

const setWyCookies = async(url, cookieString, domain) => {
  const cookies = cookieString.split('; ')
  const promises = cookies.map(cookie => {
    const parts = cookie.split('=')
    const name = parts.shift()
    const value = parts.join('=')
    if (!name || !value) return Promise.resolve()

    return CookieManager.set(url, {
      name,
      value,
      domain,
      path: '/',
    })
  })

  await Promise.all(promises)
}

/**
 * 移动端 EAPI 请求函数 (支持动态 Cookie, 防报错重构版)
 * @param {string} url - 接口路径
 * @param {object} data - 请求参数
 * @param {string|object} options - 'pc' | 'mobile' 或 { mobile: boolean, headers: object }
 */
export const eapiRequest = (url, data, options = 'pc') => {
  let clientType = 'pc'
  let customHeaders = {}

  if (typeof options === 'string') {
    clientType = options
  } else if (typeof options === 'object' && options !== null) {
    clientType = options.mobile ? 'mobile' : 'pc'
    customHeaders = options.headers || {}
  }

  const config = clientType === 'mobile' ? mobileConfig : pcConfig
  const fullEapiUrl = `${config.baseUrl}${url.replace('/api/', '/eapi/')}`
  const cookieToUse = customHeaders.Cookie || config.cookieString

  const headers = {
    ...config.headers,
    ...customHeaders,
  }

  // 强制添加明文要求
  data.e_r = 'false'

  const encryptedForm = eapi(url, data)

  console.log(`[WY eapiRequest Mobile] 🚀 请求 -> ${fullEapiUrl}`, data)

  const requestObj = {
    promise: setWyCookies(config.baseUrl, cookieToUse, config.domain)
      .then(() => {
        return httpFetch(fullEapiUrl, {
          method: 'post',
          headers,
          form: encryptedForm,
          binary: true,
          credentials: 'include',
        })
      })
      .then(innerRequestObj => {
        return innerRequestObj.promise.then(({ body }) => {
          let finalJson
          let rawText = ''

          if (body) {
            // RN 端 body 可能是 Buffer 也可能是 base64，先转成基础字符串
            const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body)
            const bodyStr = bodyBuffer.toString('utf8').trim()

            // 👇 打印原始探测片段，截取前 50 个字符防刷屏
            console.log(`[WY eapiRequest] 📦 原始响应头 (${fullEapiUrl}):`, bodyStr.substring(0, 50))
            if (bodyStr.startsWith('{') || bodyStr.startsWith('[')) {
              try {
                finalJson = JSON.parse(bodyStr)
                rawText = bodyStr
              } catch (e) {
                console.error('[WY eapiRequest] 明文 JSON 解析失败:', e)
                finalJson = { code: 501, message: 'JSON Parse failed' }
              }
            } else {
              // 走兜底解密：此时原始数据是密文，需要转 hex 给解密函数
              const encryptedTextHex = bodyBuffer.toString('hex')
              const decryptedText = eapiDecrypt(encryptedTextHex)
              rawText = decryptedText
              try {
                finalJson = JSON.parse(decryptedText)
              } catch (e) {
                console.error('[WY eapiRequest] EAPI 解密或 JSON 解析失败:', e)
                finalJson = { code: 501, message: 'Decrypt failed' }
              }
            }
          } else {
            finalJson = { code: 500, message: 'Empty response body' }
          }

          return { body: finalJson, raw: rawText }
        })
      })
      .catch(err => {
        console.error(`[WY eapiRequest Mobile] 💥 请求失败 <- ${fullEapiUrl}`, err)
        throw err
      }),
    cancelHttp: () => {
      console.warn('eapiRequest.cancelHttp() is not supported in this mode')
    },
  }

  return requestObj
}

export const oldEapiRequest = (url, data) => {
  return httpFetch('http://interface.music.163.com/eapi/batch', {
    method: 'post',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
      origin: 'https://music.163.com',
    },
    form: eapi(url, data),
  })
}
