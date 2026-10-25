// 歌曲音乐百科（网易云歌曲百科）
// 两个接口均透传网易云原始响应。真实结构（2026-10 实测）：
// - info:  data.blocks[].bizCode='songDetailNewSongWiki' 的 rnData(JSON字符串或对象) 含
//          songName/albumName/artistName/coverImage + blocks[]{blockCode, blockInfo{blockName, desc?, wikiSubElementVos?}}
// - summary: data.blocks[]{code, uiElement.mainTitle.title, creatives[]{creativeType, mainTitle.title, resources[]}}
//   summary 的 SONG_PLAY_ABOUT_SONG_BASIC 与 info 内容重叠但较简略，作为 info 失败时的兜底。
import { eapiRequest } from './utils/index'

export default {
  successCode: 200,

  /**
   * 音乐百科简要信息（歌曲播放页 about 区块）
   * 原始端点 /api/song/play/about/block/page，走 eapiRequest 加密。
   */
  getWikiSummary(songId) {
    const req = eapiRequest('/api/song/play/about/block/page', {
      songId: String(songId),
      e_r: 'false',
    }, 'pc')
    return req.promise.then(({ body }) => body)
  },

  /**
   * 音乐百科主位构造信息（歌曲百科主位，内容最全）
   * 原始端点 /api/link/page/parent/relation/construct/info，eapi 加密。
   */
  getWikiInfo(songId) {
    const req = eapiRequest('/api/link/page/parent/relation/construct/info', {
      extJson: JSON.stringify({
        states: {
          playingResource: {
            current: String(songId),
            scene: 'songWiki',
          },
        },
      }),
      positionCode: 'songWikiMainPosition',
      e_r: 'false',
    }, 'pc')
    return req.promise.then(({ body }) => body)
  },

  /**
   * 拉取并归一化百科信息。info 为主体（内容全），summary 失败或为空不影响。
   * 返回统一结构：{ about, baseInfo, sections }，任一字段为 null/[] 表示无此数据。
   * - about: 创作信息正文（一段长文本）
   * - baseInfo: [{ label, value }] 基本信息（曲风/语种/发行时间/BPM...）
   * - sections: [{ title, content }] 其他区块（乐评等纯文本块）
   */
  async getWiki(songId) {
    let infoBody = null
    let summaryBody = null
    try {
      infoBody = await this.getWikiInfo(songId)
    } catch (err) {
      console.warn('[WY wiki] info 失败:', err?.message)
    }
    let result = this.normalizeInfo(infoBody)
    if (result.about || result.baseInfo.length) return result
    // info 无内容时兜底 summary
    try {
      summaryBody = await this.getWikiSummary(songId)
    } catch (err) {
      console.warn('[WY wiki] summary 失败:', err?.message)
    }
    return this.normalizeSummary(summaryBody)
  },

  // ---- 归一化层 ----

  /**
   * info 响应: data.blocks[].bizCode='songDetailNewSongWiki' → rnData
   */
  normalizeInfo(body) {
    const empty = { about: null, baseInfo: [], sections: [] }
    if (!body || body.code !== this.successCode) return empty
    const blocks = body.data?.blocks
    if (!Array.isArray(blocks)) return empty
    const wikiBlock = blocks.find(b => b?.bizCode === 'songDetailNewSongWiki')
    if (!wikiBlock) return empty
    let rn = wikiBlock.rnData
    if (typeof rn === 'string') {
      try { rn = JSON.parse(rn) } catch { return empty }
    }
    if (!rn || !Array.isArray(rn.blocks)) return empty

    const result = { about: null, baseInfo: [], sections: [] }
    for (const sub of rn.blocks) {
      const info = sub?.blockInfo
      if (!info || typeof info !== 'object') continue
      const name = info.blockName
      if (sub.blockCode === 'wikiSubBlockSongInfoVo') {
        // 创作信息正文
        if (typeof info.desc === 'string' && info.desc) result.about = info.desc
      } else if (sub.blockCode === 'wikiSubBlockBaseInfoVo') {
        // 基本信息: wikiSubElementVos[] { title, content } 或 { title, wikiSubMetaVos: [{text}] }
        for (const el of info.wikiSubElementVos ?? []) {
          if (!el?.title) continue
          let value = typeof el.content === 'string' ? el.content : null
          if (!value && Array.isArray(el.wikiSubMetaVos)) {
            value = el.wikiSubMetaVos.map(m => m?.text).filter(Boolean).join(' / ') || null
          }
          if (value) result.baseInfo.push({ label: el.title, value })
        }
      } else if (typeof info.desc === 'string' && info.desc && name) {
        // 其他含正文文本的区块（如乐评）
        result.sections.push({ title: name, content: info.desc })
      }
    }
    return result
  },

  /**
   * summary 响应(兜底): data.blocks[]，取 SONG_PLAY_ABOUT_SONG_BASIC 的 creatives
   * creative: { creativeType, mainTitle.title=标签名, resources[].uiElement.mainTitle.title=值 }
   */
  normalizeSummary(body) {
    const empty = { about: null, baseInfo: [], sections: [] }
    if (!body || body.code !== this.successCode) return empty
    const blocks = body.data?.blocks
    if (!Array.isArray(blocks)) return empty
    const basic = blocks.find(b => b?.code === 'SONG_PLAY_ABOUT_SONG_BASIC')
    if (!basic) return empty

    const result = { about: null, baseInfo: [], sections: [] }
    for (const creative of basic.creatives ?? []) {
      const label = creative?.mainTitle?.title ?? creative?.creativeType
      if (!label) continue
      const values = (creative.resources ?? [])
        .map(r => r?.uiElement?.mainTitle?.title)
        .filter(Boolean)
      if (!values.length) continue
      if (creative.creativeType === 'songComment') {
        result.sections.push({ title: label, content: values.join('\n') })
      } else {
        result.baseInfo.push({ label, value: values.join(' / ') })
      }
    }
    return result
  },
}
