// [文件: src/renderer/utils/musicSdk/mkr/leaderboard_fm.js]

import { get } from './http'
import { handleResult } from '../wy/utils/parser'

export default {
  /**
   * 获取 FM 模式列表 (左侧菜单)
   */
  getBoards: async() => {
    // 调用你的后端获取模式
    const response = await get('/netease/radio/modes')
    console.log('getBoards: ', response)
    // 解析 response
    // 结构: { code: 200, data: { recommendModeList: [], currentSceneList: [] } }

    const list = []

    // 基础模式 (DEFAULT, FAMILIAR, EXPLORE)
    if (response.recommendModeList) {
      response.recommendModeList.forEach(mode => {
        list.push({
          id: `wy_fm__${mode.code}`,
          name: mode.title,
          bangid: mode.code,
        })
      })
    }

    // 场景模式 (SCENE_RCMD)
    if (response.currentSceneList) {
      response.currentSceneList.forEach(scene => {
        list.push({
          id: `wy_fm__scene_${scene.code}`,
          name: scene.title,
          // 使用特殊分隔符组合 mode 和 sub_mode
          bangid: `scene_${scene.code}`,
        })
      })
    }

    return {
      list,
      source: 'wy_fm',
    }
  },

  /**
   * 目标：凑够 30 首歌再返回
   */
  getList: async(bangid, page) => {
    // 解析参数
    let mode = bangid
    let subMode = null

    if (bangid.includes('_')) {
      const parts = bangid.split('_')
      mode = parts[0] // SCENE_RCMD
      subMode = parts[1] // e.g. NIGHT_EMO
    }

    // 准备循环
    const targetTotal = 30 // 目标: 一次拿 30 首
    let collectedList = [] // 蓄水池
    const maxRetry = 10 // 防止死循环 (最多请求 10 次接口)

    const params = {
      mode,
      limit: 3, // 官方限制只能传 3
    }
    if (subMode) {
      params.sub_mode = subMode
    }

    // 开始串行循环 (Serial Loop)
    for (let i = 0; i < maxRetry; i++) {
      // 如果已经凑够了，停止循环
      if (collectedList.length >= targetTotal) break

      try {
        const response = await get('/netease/radio', params)

        // 3.检查数据
        if (!response || response.length === 0) {
          console.log('[WY FM] 接口没数据了，停止获取')
          break
        }

        // 3.解析当前批次 (3首)
        const currentBatch = handleResult(response)

        // 3.加入蓄水池 (简单的去重，防止网易云发疯返回重复的)
        currentBatch.forEach(song => {
          const exists = collectedList.some(s => s.songmid === song.songmid)
          if (!exists) {
            collectedList.push(song)
          }
        })

        // 稍微停顿一下，避免请求过于密集
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (err) {
        console.error('[WY FM] 获取部分歌曲失败:', err)
        // 如果出错但手里已经有歌了，就别崩，直接返回现有的
        if (collectedList.length > 0) break
        throw err // 如果一首都还没有，那只能报错了
      }
    }

    // 返回结果 (伪装成只有 1 页)
    return {
      list: collectedList,
      allPage: 1,
      limit: collectedList.length,
      total: collectedList.length,
      source: 'wy',
    }
  },
}
