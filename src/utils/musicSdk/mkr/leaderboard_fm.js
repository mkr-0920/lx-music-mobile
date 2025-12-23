// [文件: src/utils/musicSdk/mkr/leaderboard_fm.js]

import { eapiRequest } from '../wy/utils/index'
import { handleResult } from '../wy/utils/parser'
import settingState from '@/store/setting/state'
import { toast } from '@/utils/tools'

// 构造请求选项 (支持强制指定 OS)
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
      // 如果没有，追加它
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
   * 获取 FM 模式列表
   */
  getBoards: async() => {
    const extJson = JSON.stringify({
      clientLibraAbTest: { 'fm-style-reopen': 't3', fmNameTest0422: 'c' },
      isHomePageNewFramework: true,
      userSetFMMode: true,
      enableAutoPlay: true,
    })

    const request = eapiRequest(
      '/api/link/position/show/resource',
      {
        positionCode: 'FMTopModeDialog',
        extJson,
        header: '{}',
        e_r: true,
      },
      // 强制伪装 Android
      getRequestOptions('android'),
    )

    const { body } = await request.promise
    const dslData = body?.data?.crossPlatformResource?.dslData || {}
    const list = []

    if (dslData.recommendModeList) {
      dslData.recommendModeList.forEach(mode => {
        list.push({
          id: `wy_fm__${mode.code}`,
          name: mode.title,
          bangid: mode.code,
        })
      })
    }

    if (dslData.currentSceneList) {
      dslData.currentSceneList.forEach(scene => {
        list.push({
          id: `wy_fm__scene_${scene.code}`,
          name: scene.title,
          bangid: `SCENE_RCMD@${scene.code}`,
        })
      })
    }

    return {
      list,
      source: 'wy_fm',
    }
  },

  /**
   * 获取歌曲列表
   */
  getList: async(bangid, page) => {
    const options = getRequestOptions('android')
    if (!options.headers?.Cookie) {
      throw new Error('请先在设置中填写网易云 Cookie')
    }

    let mode = bangid
    let subMode = null

    if (bangid.includes('@')) {
      const parts = bangid.split('@')
      mode = parts[0]
      subMode = parts[1]
    } else if (bangid.startsWith('wy_fm__')) {
      mode = bangid.replace('wy_fm__', '')
    }

    const targetTotal = 30
    let collectedList = []
    const maxRetry = 10

    const requestData = {
      mode,
      entranceType: 'main_bottom_tab',
      limit: '3',
      openAidj: 'false',
      header: '{}',
      e_r: true,
    }
    if (subMode) {
      requestData.subMode = subMode
    }

    for (let i = 0; i < maxRetry; i++) {
      if (collectedList.length >= targetTotal) break

      try {
        const response = await eapiRequest(
          '/api/v1/radio/get',
          requestData,
          options,
        ).promise

        const rawData = response.body?.data
        if (!rawData || rawData.length === 0) break

        const currentBatch = handleResult(rawData)
        currentBatch.forEach(song => {
          const exists = collectedList.some(s => s.songmid === song.songmid)
          if (!exists) collectedList.push(song)
        })

        // 稍微等待，防止请求过快
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (err) {
        console.error('[WY FM] 获取部分歌曲失败:', err)
        if (collectedList.length > 0) break
      }
    }

    return {
      list: collectedList,
      allPage: 1,
      limit: collectedList.length,
      total: collectedList.length,
      source: 'wy',
    }
  },
}
