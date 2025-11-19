import { httpFetch } from '../../../request'
import { eapi, eapiDecrypt } from './crypto'
// 导入 Cookie 管理器
import CookieManager from '@react-native-cookies/cookies'

// --- 1. 定义 PC 端的配置 ---
const pcConfig = {
  baseUrl: 'https://interfacepc.music.163.com',
  domain: '.music.163.com', // Cookie 作用域
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/3.1.21.204647',
    'mconfig-info': '{"IuRPVVmc3WWul9fT":{"version":870400,"appver":"3.1.21.204647"}}',
  },
  cookieString: 'appver=3.1.21.204647; os=pc; MUSIC_A=00D6281D066387AE193463B7115E072AB6E462629CE54284A50413D90265FCF611E4DB5CDC0B4EF0CF1C4131DA9DAAF101F4501C822187A17DCA34CF41DDE88F963B37458990D59C16F308B9113B492A02C0744B09710170D423C19D441FC5D2B19B6C1602CAC8B19B36C4B6EA21C01DA8197551C1E6A7F51E273108B8CC3A7330C7163C970D865AF5DEB0CA6497F968F11120DF2D792201A3653B405C71F005A896732A7BF78851C225C1C9DE247A085ACDE82D067AEAF7C0BB66BF43C90FF1E615CF87B89E10D80CFA3D505A2B62465A3E13101539F07E82FA4428059E1EEC9F330E2A90E7CE862A1B44821B927789E708CF39EDD1E6503456FBDC72EFDD4CE0A246A6A9282BBA4A07866521291C1391DDC1A9EBA30643717D3BFF7C5CF0632898FD192520BCCBA8F5B2E560C15FF9B00F833B2A9A4DE025C33379B4F914E18361F2CC12CE7B2F9DA00F58AC2F5CF5319F6548EEA10871C0435351C2EF0CE3D4D0B2D28D557EEB249F49CF90789F69EDD13542711915C3A945BF0BE31D35E340079C5E67CF319ADE51175A67A2774D4D745CAB03C206437B27E5E49643F01FEA3E797575AFAC3E40B8ECCD50C50F94F35089FC669620163CEF176F0554D25A0386AFB3FC3A7AB59EB2925B9DFB118C41I00D323188A51048F4439DF6C712CDD7873C4A2DBAC7095648142F111291FA7DF601FA0BBE8C3F58B23A8E4AB8A215684531DFDF099DAAC4480810792A73A628B189998C00D38230F3D4994242D106CF',
}

// --- 2. 定义 Mobile 端的配置 ---
const mobileConfig = {
  baseUrl: 'https://interface3.music.163.com',
  domain: '.music.163.com', // Cookie 作用域
  headers: {
    'User-Agent': 'NeteaseMusic/9.1.92.241106104852(9001092);Dalvik/2.1.0 (Linux; U; Android 12; Redmi K1000 Pro Build/SKQ1.211006.001)',
  },
  cookieString: 'MUSIC_A=00F96BA6871CBB6EE070E0390DC26CD5E4575D83DA12DA9CFE1B735EB3F3EB6D93B80180E09C8474D19044CF09BCF0D5BF03989D8F253209A6EA7020B9A8958C1E930D48D7E379B72541201ED6914C038413C305F959A27CBFCB8FB043A33750419BA22FA4FEDE1D7071A8DF92D86DF4ED72761DF90B807F11E5193EA90F377DAF1AE084389023BBB20F850FB84754B08812F3215E35AF937939826B150219BBE726695E4C119E933AE765C72126C5065BDAF1E7DAEC10D6B23D68CC1885E904BECC52783D147DE82953E26592017D9EBCAB2FD7E60D329E59F565B30B9D0FCAE96EE95095C36076E00E22AEAF09E5A9EE17C2264B6E2006899BCFBA83CF9B887F94B0C2F2072A21E5C8915F88DDD1BC49FF684D73A0C6B22492744A9B1AF2F04190C2B32E51CDA650D3970937B4952570E5FBD6046B284149F007D39B9856208CE71A300D48F11583A27F27FBD2AFADB55A1573B55EFAE2D5BE34C874C07DA45B3B1A2651B88306D05EECDCA4AF9899BAF4DF5B1DA3F6FABA7443A02DE9F0F3100D82CCEB6EC261DEDEB5C46BB9BDC449954CEEBACB82CC85E6694DF5C131F5B65A72EA8F396766549B7F8CD699038847E3CE3AE96F04655C805986EB7A8EDA87D3611E12D8C7E97A2BE98A70595961BD0685E24D6C8CF3D4D2396E83E813A0DA447FA67112A8E6894C99533C9F036C1A7C8EE7B71CE4891E7D07214384273122',
}


/**
* 这是一个辅助函数，用于在发起请求前
* 手动将 Cookie 注入到 Cookie Jar 中
* 它现在接收 'config' 对象中的参数
*/
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
      domain, // 使用传入的 domain
      path: '/',
    })
  })

  await Promise.all(promises)
}


export const eapiRequest = (url, data, clientType = 'pc') => {
  // --- 根据 clientType 选择配置 ---
  const config = clientType === 'mobile' ? mobileConfig : pcConfig

  const fullEapiUrl = `${config.baseUrl}${url.replace('/api/', '/eapi/')}`
  const headers = config.headers
  const encryptedForm = eapi(url, data)

  // promise 链现在使用动态的 'config'
  const requestObj = {
    promise: setWyCookies(config.baseUrl, config.cookieString, config.domain)
      .then(() => {
        // 使用动态的 'config' 发起请求
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
        console.error(`[WY eapiRequest ${clientType}] httpFetch 或 Cookie/解密 失败:`, err)
        throw err
      }),
    cancelHttp: () => {
      console.warn('eapiRequest.cancelHttp() is not supported in this mode')
    },
  }

  return requestObj
}
