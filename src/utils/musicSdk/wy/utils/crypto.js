import { btoa } from 'react-native-quick-base64'
import { aesEncryptSync, aesDecryptSync, rsaEncryptSync, AES_MODE, RSA_PADDING } from '@/utils/nativeModules/crypto'
import { toMD5 } from '../../utils'
const iv = btoa('0102030405060708')
const presetKey = btoa('0CoJUm6Qyw8W8jud')
const linuxapiKey = btoa('rFgB&h#%2?^eDg:Q')
// const base62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const publicKey = '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB\n-----END PUBLIC KEY-----'
const eapiKey = btoa('e82ckenh8dichen8') // 你的密钥 (已 b64)


const aesEncrypt = (b64, mode, key, iv) => {
  // console.log(b64, mode, key, iv)
  // const cipher = createCipheriv(mode, key, iv)
  // return Buffer.concat([cipher.update(buffer), cipher.final()])
  return aesEncryptSync(b64, key, iv, mode)
}

const aesDecrypt = (b64, mode, key, iv) => {
  // let decipher = createDecipheriv(mode, key, iv)
  // return Buffer.concat([decipher.update(b64), decipher.final()])
  return aesDecryptSync(b64, key, iv, mode)
}

const rsaEncrypt = (buffer, key) => {
  buffer = Buffer.concat([Buffer.alloc(128 - buffer.length), buffer])
  return Buffer.from(rsaEncryptSync(buffer.toString('base64'), key, RSA_PADDING.NoPadding), 'base64')
}

export const weapi = object => {
  const text = JSON.stringify(object)
  const secretKey = String(Math.random()).substring(2, 18)
  return {
    params: aesEncrypt(btoa(aesEncrypt(Buffer.from(text).toString('base64'), AES_MODE.CBC_128_PKCS7Padding, presetKey, iv)), AES_MODE.CBC_128_PKCS7Padding, btoa(secretKey), iv),
    encSecKey: rsaEncrypt(Buffer.from(secretKey).reverse(), publicKey).toString('hex'),
  }
}

export const linuxapi = object => {
  const text = JSON.stringify(object)
  return {
    eparams: Buffer.from(aesEncrypt(Buffer.from(text).toString('base64'), AES_MODE.ECB_128_NoPadding, linuxapiKey, ''), 'base64').toString('hex').toUpperCase(),
  }
}

export const eapi = (url, object) => {
  const text = typeof object === 'object' ? JSON.stringify(object) : object
  const message = `nobody${url}use${text}md5forencrypt`
  const digest = toMD5(message)
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`
  return {
    params: Buffer.from(aesEncrypt(Buffer.from(data).toString('base64'), AES_MODE.ECB_128_NoPadding, eapiKey, ''), 'base64').toString('hex').toUpperCase(),
  }
}
/**
 * 1. 接收 hex 字符串 (httpFetch 返回的 raw)
 * 2. 从 hex 转换为 Base64 (供 native 模块使用)
 * 3. 调用 native 模块的 aesDecrypt (使用 ECB 模式)
 * 4. 将解密后的 Base64 转回 utf8 字符串
 */
export const eapiDecrypt = (encryptedTextHex) => {
  try {
    if (!encryptedTextHex) {
      throw new Error('Received undefined or empty text to decrypt')
    }

    const encryptedBuffer = Buffer.from(encryptedTextHex, 'hex')
    const encryptedBase64 = encryptedBuffer.toString('base64')
    const decryptedBase64 = aesDecrypt(
      encryptedBase64,
      AES_MODE.ECB_128_NoPadding,
      eapiKey,
      '',
    )
    // console.log('decryptedBase64:', decryptedBase64)
    if (!decryptedBase64) {
      throw new Error('Native decryption returned empty string or null')
    }
    return decryptedBase64.toString('utf8')
  } catch (err) {
    console.error('[WY eapiDecrypt] 解密失败:', err)
    return '{"code": 500, "message": "Decryption failed"}'
  }
}
