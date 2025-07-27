const fontFallback = '-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Source Han Sans SC, Source Han Sans CN, Microsoft YaHei, Helvetica Neue, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol'
const defPageFontModel = {
  show: false,
  actions: [
    { name: '默认', _value: '' },
    { name: '霞鹜文楷 Screen', _value: 'LXGW WenKai Screen' },
    { name: '霞鹜臻楷', _value: 'LXGW ZhenKai' },
    { name: '霞鹜晰黑 MN', _value: 'LXGW XiHei MN' },
    { name: '霞鹜漫黑', _value: 'LXGW Marker Gothic' },
    { name: '霞鹜铭心宋', _value: 'LXGW Heart Serif' },
    { name: '霞鹜975朦胧黑体', _value: 'LXGW 975 HazyGo SC 500W' },
    { name: '975 圆体', _value: '975Maru SC' },
    { name: '悠哉字体', _value: 'Yozai' },
    { name: '更纱黑体 Mono SC', _value: 'Sarasa Mono SC' },
    { name: '更纱黑体 UI SC', _value: 'Sarasa UI SC' },
    { name: 'HarmonyOS_Regular', _value: 'HarmonyOS_Regular' },
    { name: 'Maple Mono NF-CN', _value: 'Maple Mono NF CN' },
    { name: '小合简化体 Sans', _value: 'Xiaohe Simplify Sans VF' },
    { name: '小合简化体 Serif', _value: 'Xiaohe Simplify Serif VF' },
    { name: '月星楷', _value: 'Moon Stars Kai' },
    { name: '月星楷 HW', _value: 'Moon Stars Kai HW' },
    { name: '秋水書体 Bright', _value: 'QiushuiShotai Bright' },
    { name: '屏显臻宋', _value: 'Clear Han Serif' },
    { name: '京華老宋体', _value: 'KingHwa_OldSong' },
    { name: '朱雀仿宋', _value: '"Zhuque Fangsong (technical preview)"' },
    { name: '匯文仿宋', _value: 'Huiwen-Fangsong' },
    { name: '匯文正楷', _value: 'Huiwen-ZhengKai' },
    { name: '匯文明朝體', _value: 'Huiwen-mincho' },
    { name: '江城律动宋', _value: 'JiangChengLvDongSong' },
    { name: '江城圆体', _value: 'JiangChengYuanTi' },
    { name: '寒蝉正楷体', _value: 'ChillKai' },
    { name: '寒蝉全圆体', _value: 'undefined' },
    { name: '寒蝉半圆体', _value: '寒蝉半圆体' },
    { name: '寒蝉圆黑体', _value: 'Chill Round Gothic' },
    { name: '寒蝉团圆体 Sans', _value: '寒蝉团圆体 Sans' },
    { name: '寒蝉高黑体 Medium', _value: 'Chill G Sans Medium' },
    { name: '寒蝉点阵体 16px', _value: '"寒蝉点阵体 16px"' },
    { name: 'DYming 澹雅明体 C', _value: 'DYmingC' },
    { name: '曉聲通秋茄體', _value: 'ToneOZ-Tsuipita-TC' },
    { name: '极影毁片辉宋', _value: '极影毁片辉宋 Bold' },
    { name: '极影毁片文宋', _value: '极影毁片文宋 Medium' },
    { name: '韩契在民体', _value: '"Hangeuljaemin4.0"' },
    { name: '汇迹正楷', _value: 'CooperZhengKai' },
    { name: '尚古圆体', _value: 'Shanggu Round' },
  ],
}

const fontCssMap = {
  'LXGW WenKai Screen': 'https://lib.baomitu.com/lxgw-wenkai-screen-webfont/1.7.0/style.min.css',
  'HarmonyOS_Regular': 'https://s1.hdslb.com/bfs/static/jinkela/long/font/regular.css',
  'Maple Mono NF CN': 'https://static.zeoseven.com/zsft/442/main/result.css',
  'KingHwa_OldSong': 'https://static.zeoseven.com/zsft/309/main/result.css',
  'JiangChengLvDongSong': 'https://static.zeoseven.com/zsft/147/main/result.css',
  'Huiwen-mincho': 'https://static.zeoseven.com/zsft/256/main/result.css',
  'Huiwen-ZhengKai': 'https://static.zeoseven.com/zsft/438/main/result.css',
  '"Zhuque Fangsong (technical preview)"': 'https://static.zeoseven.com/zsft/7/main/result.css',
  'DYmingC': 'https://static.zeoseven.com/zsft/172/main/result.css',
  'JiangChengYuanTi': 'https://static.zeoseven.com/zsft/59/main/result.css',
  'LXGW ZhenKai': 'https://static.zeoseven.com/zsft/2/main/result.css',
  'LXGW XiHei MN': 'https://static.zeoseven.com/zsft/227/main/result.css',
  'LXGW Marker Gothic': 'https://static.zeoseven.com/zsft/134/main/result.css',
  'LXGW Heart Serif': 'https://static.zeoseven.com/zsft/24/main/result.css',
  'LXGW 975 HazyGo SC 500W': 'https://static.zeoseven.com/zsft/144/main/result.css',
  '975Maru SC': 'https://static.zeoseven.com/zsft/184/main/result.css',
  'Yozai': 'https://static.zeoseven.com/zsft/192/main/result.css',
  'QiushuiShotai Bright': 'https://static.zeoseven.com/zsft/245/main/result.css',
  'ChillKai': 'https://static.zeoseven.com/zsft/5/main/result.css',
  'undefined': 'https://static.zeoseven.com/zsft/3/main/result.css',
  'Huiwen-Fangsong': 'https://static.zeoseven.com/zsft/440/main/result.css',
  '寒蝉半圆体': 'https://static.zeoseven.com/zsft/243/main/result.css',
  'Chill Round Gothic': 'https://static.zeoseven.com/zsft/83/main/result.css',
  '寒蝉团圆体 Sans': 'https://static.zeoseven.com/zsft/70/main/result.css',
  'Chill G Sans Medium': 'https://static.zeoseven.com/zsft/300/main/result.css',
  '"寒蝉点阵体 16px"': 'https://static.zeoseven.com/zsft/359/main/result.css',
  'Sarasa Mono SC': 'https://static.zeoseven.com/zsft/159/main/result.css',
  'Sarasa UI SC': 'https://static.zeoseven.com/zsft/214/main/result.css',
  'ToneOZ-Tsuipita-TC': 'https://static.zeoseven.com/zsft/53/main/result.css',
  'Xiaohe Simplify Sans VF': 'https://static.zeoseven.com/zsft/484/main/result.css',
  'Xiaohe Simplify Serif VF': 'https://static.zeoseven.com/zsft/485/main/result.css',
  'Clear Han Serif': 'https://static.zeoseven.com/zsft/79/main/result.css',
  'Moon Stars Kai': 'https://static.zeoseven.com/zsft/273/main/result.css',
  'Moon Stars Kai HW': 'https://static.zeoseven.com/zsft/275/main/result.css',
  '极影毁片辉宋 Bold': 'https://static.zeoseven.com/zsft/183/main/result.css',
  '极影毁片文宋 Medium': 'https://chinese-fonts-cdn.netlify.app/packages/jyhpws/dist/极影毁片文宋/result.css',
  '"Hangeuljaemin4.0"': 'https://chinese-fonts-cdn.netlify.app/packages/hqzmt/dist/Hangeuljaemin4-Regular/result.css',
  'CooperZhengKai': 'https://static.zeoseven.com/zsft/482/main/result.css',
  'Shanggu Round': 'https://static.zeoseven.com/zsft/516/main/result.css',
}

async function getLocalFontList() {
  try {
    if (typeof window.queryLocalFonts != 'function') return []
    const availableFonts = await window.queryLocalFonts()
    return availableFonts
      .filter(e => e.style == 'Regular')
      .map(e => ({ name: e.fullName, _value: e.family }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (err) {
    return []
  }
}

export async function getPageFontModel() {
  const localFontList = await getLocalFontList()
  return {
    ...defPageFontModel,
    actions: defPageFontModel.actions.concat(localFontList),
  }
}

export function loadCustomFont(pageFont) {
  if (!pageFont) return
  document.documentElement.style.setProperty('--font-family', `${pageFont}, ${fontFallback}`)
  const cssLink = fontCssMap[pageFont]
  if (!cssLink) return
  document.head.insertAdjacentHTML('beforeend', `<link href="${cssLink}" rel="stylesheet">`)
}
