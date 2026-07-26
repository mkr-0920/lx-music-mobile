import { eapiRequest } from '../utils/index'
import { handleResult } from '../utils/parser'
import { getRequestOptions } from './utils'

export default {
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
    const collectedList = []
    const maxRetry = 10

    const requestData = {
      mode,
      entranceType: 'main_bottom_tab',
      limit: '3',
      openAidj: 'false',
      header: '{}',
      e_r: true,
    }
    if (subMode) requestData.subMode = subMode

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
