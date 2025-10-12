export const fontFallback = '-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Source Han Sans SC, Source Han Sans CN, Microsoft YaHei, Helvetica Neue, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol'

const defPageFontActions = [
  { name: '默认', _value: '' },
  { name: '霞鹜文楷 Screen', _value: 'LXGW WenKai Screen', css: 'https://lib.baomitu.com/lxgw-wenkai-screen-webfont/1.7.0/style.min.css', preview: true },
  { name: '霞鹜文楷 Mono', _value: 'LXGW WenKai Mono', css: 'https://fontsapi.zeoseven.com/293/main/result.css', preview: true },
  { name: '霞鹜臻楷', _value: 'LXGW ZhenKai GB', css: 'https://fontsapi.zeoseven.com/2/main/result.css', preview: true },
  { name: '霞鹜晰黑 CL', _value: 'LXGW XiHei CL', css: 'https://fontsapi.zeoseven.com/226/main/result.css', preview: true },
  { name: '霞鹜漫黑', _value: 'LXGW Marker Gothic', css: 'https://fontsapi.zeoseven.com/134/main/result.css', preview: true },
  { name: '霞鹜铭心宋', _value: 'LXGW Heart Serif', css: 'https://fontsapi.zeoseven.com/24/main/result.css', preview: true },
  { name: '霞鹜 975 朦胧黑体', _value: 'LXGW 975 HazyGo SC 500W', css: 'https://fontsapi.zeoseven.com/144/main/result.css', preview: true },
  { name: '975 圆体', _value: '975Maru SC', css: 'https://fontsapi.zeoseven.com/184/main/result.css', preview: true },
  { name: '悠哉字体', _value: 'Yozai', css: 'https://fontsapi.zeoseven.com/192/main/result.css', preview: true },
  { name: '更纱黑体 Mono SC', _value: 'Sarasa Mono SC', css: 'https://fontsapi.zeoseven.com/159/main/result.css', preview: true },
  { name: '更纱黑体 UI SC', _value: 'Sarasa UI SC', css: 'https://fontsapi.zeoseven.com/214/main/result.css', preview: true },
  { name: 'HarmonyOS', _value: 'HarmonyOS_Regular', css: 'https://s1.hdslb.com/bfs/static/jinkela/long/font/regular.css' },
  { name: 'Maple Mono NF-CN', _value: 'Maple Mono NF CN', css: 'https://fontsapi.zeoseven.com/442/main/result.css', preview: true },
  { name: '小合简化体 Sans', _value: 'Xiaohe Simplify Sans VF', css: 'https://fontsapi.zeoseven.com/484/main/result.css' },
  { name: '小合简化体 Serif', _value: 'Xiaohe Simplify Serif VF', css: 'https://fontsapi.zeoseven.com/485/main/result.css' },
  { name: '月星楷', _value: 'Moon Stars Kai', css: 'https://fontsapi.zeoseven.com/273/main/result.css', preview: true },
  { name: '月星楷 HW', _value: 'Moon Stars Kai HW', css: 'https://fontsapi.zeoseven.com/274/main/result.css', preview: true },
  { name: '秋水書体 Bright', _value: 'QiushuiShotai Bright', css: 'https://fontsapi.zeoseven.com/245/main/result.css', preview: true },
  { name: '屏显臻宋', _value: 'Clear Han Serif', css: 'https://fontsapi.zeoseven.com/79/main/result.css', preview: true },
  { name: '京華老宋体', _value: 'KingHwaOldSong', css: 'https://fontsapi.zeoseven.com/309/main/result.css', preview: true },
  { name: '朱雀仿宋', _value: 'Zhuque Fangsong (technical preview)', css: 'https://fontsapi.zeoseven.com/7/main/result.css', preview: true },
  { name: '匯文仿宋', _value: 'Huiwen-Fangsong', css: 'https://fontsapi.zeoseven.com/440/main/result.css', preview: true },
  { name: '匯文正楷', _value: 'Huiwen-ZhengKai', css: 'https://fontsapi.zeoseven.com/438/main/result.css', preview: true },
  { name: '匯文明朝體', _value: 'Huiwen-mincho', css: 'https://fontsapi.zeoseven.com/256/main/result.css', preview: true },
  { name: '江城律动宋', _value: 'JiangChengLvDongSong', css: 'https://fontsapi.zeoseven.com/147/main/result.css', preview: true },
  { name: '江城圆体', _value: 'JiangChengYuanTi', css: 'https://fontsapi.zeoseven.com/59/main/result.css', preview: true },
  { name: '寒蝉正楷体', _value: 'ChillKai', css: 'https://fontsapi.zeoseven.com/5/main/result.css', preview: true },
  { name: '寒蝉全圆体', _value: '寒蝉全圆体', css: 'https://fontsapi.zeoseven.com/3/main/result.css', preview: true },
  { name: '寒蝉半圆体', _value: '寒蝉半圆体', css: 'https://fontsapi.zeoseven.com/243/main/result.css', preview: true },
  { name: '寒蝉圆黑体', _value: 'Chill Round Gothic', css: 'https://fontsapi.zeoseven.com/83/main/result.css', preview: true },
  { name: '寒蝉团圆体 Sans', _value: '寒蝉团圆体 Sans', css: 'https://fontsapi.zeoseven.com/70/main/result.css', preview: true },
  { name: '寒蝉高黑体 Medium', _value: 'Chill G Sans Medium', css: 'https://fontsapi.zeoseven.com/300/main/result.css', preview: true },
  { name: '寒蝉点阵体 16px', _value: '寒蝉点阵体 16px', css: 'https://fontsapi.zeoseven.com/359/main/result.css', preview: true },
  { name: '寒蝉德黑体', _value: 'ChillDINGothic', css: 'https://fontsapi.zeoseven.com/642/main/result.css', preview: true },
  { name: 'DYming 澹雅明体 A', _value: 'DYmingA', css: 'https://fontsapi.zeoseven.com/35/main/result.css', preview: true },
  { name: 'DYming 澹雅明体 B', _value: 'DYmingB', css: 'https://fontsapi.zeoseven.com/171/main/result.css', preview: true },
  { name: 'DYming 澹雅明体 C', _value: 'DYmingC', css: 'https://fontsapi.zeoseven.com/172/main/result.css', preview: true },
  { name: '曉聲通秋茄體', _value: 'ToneOZ-Tsuipita-TC', css: 'https://fontsapi.zeoseven.com/53/main/result.css', preview: true },
  { name: '极影毁片辉宋', _value: '极影毁片辉宋 Bold', css: 'https://fontsapi.zeoseven.com/183/main/result.css', preview: true },
  { name: '极影毁片文宋', _value: '极影毁片文宋 Medium', css: 'https://chinese-fonts-cdn.netlify.app/packages/jyhpws/dist/极影毁片文宋/result.css' },
  { name: '韩契在民体', _value: 'Hangeuljaemin4.0', css: 'https://fontsapi.zeoseven.com/796/main/result.css', preview: true },
  { name: '汇迹正楷', _value: 'CooperZhengKai', css: 'https://fontsapi.zeoseven.com/482/main/result.css', preview: true },
  { name: '尚古圆体', _value: 'Shanggu Round', css: 'https://fontsapi.zeoseven.com/516/main/result.css', preview: true },
  { name: '典迹题幕', _value: 'MonuTitl Cond', css: 'https://fontsapi.zeoseven.com/635/main/result.css', preview: true },
  { name: '萌神明朝体', _value: 'Mengshen-Regular', css: 'https://fontsapi.zeoseven.com/201/main/result.css', preview: true },
  { name: '猫啃硬笔楷书', _value: 'MaokenYingBiKaiShuJ', css: 'https://fontsapi.zeoseven.com/629/main/result.css', preview: true },
  { name: '未来荧黑', _value: 'Glow Sans SC', css: 'https://fontsapi.zeoseven.com/537/main/result.css', preview: true },
  { name: '未来圆 SC', _value: '未来圆SC', css: 'https://fontsapi.zeoseven.com/181/main/result.css', preview: true },
  { name: '得意黑', _value: 'Smiley Sans Oblique', css: 'https://fontsapi.zeoseven.com/92/main/result.css', preview: true },
  { name: '澳声通拼音文楷', _value: 'ToneOZ-Pinyin-WenKai-Regular', css: 'https://fontsapi.zeoseven.com/600/main/result.css', preview: true },
  { name: '文泉驿微米黑', _value: 'WenQuanYi Micro Hei', css: 'https://fontsapi.zeoseven.com/25/main/result.css', preview: true },
  { name: '文泉驿等宽正黑', _value: 'WenQuanYi Zen Hei Mono', css: 'https://fontsapi.zeoseven.com/374/main/result.css', preview: true },
  { name: '香萃等粗宋', _value: 'XiangcuiDengcusong', css: 'https://fontsapi.zeoseven.com/646/main/result.css', preview: true },
  { name: '昭源黑體', _value: 'Chiron Hei HK VF', css: 'https://fontsapi.zeoseven.com/547/main/result.css', preview: false },
  { name: '昭源環方', _value: 'Chiron GoRound TC VF', css: 'https://fontsapi.zeoseven.com/545/main/result.css', preview: false },
  { name: '昭源宋體', _value: 'Chiron Sung HK VF', css: 'https://fontsapi.zeoseven.com/546/main/result.css', preview: false },
  { name: '初夏明朝体', _value: 'Early Summer Serif VF', css: 'https://fontsapi.zeoseven.com/272/main/result.css', preview: true },
  { name: '花仿宋', _value: 'FlowerFangSong', css: 'https://fontsapi.zeoseven.com/12/main/result.css', preview: true },
  { name: '花园明朝 A', _value: 'HanaMinA', css: 'https://fontsapi.zeoseven.com/452/main/result.css', preview: true },
  { name: '致一圆体', _value: '致一圓體_傳承形', css: 'https://fontsapi.zeoseven.com/835/main/result.css', preview: true },
  { name: '致一黑体', _value: '致一黑體_傳承形', css: 'https://fontsapi.zeoseven.com/834/main/result.css', preview: true },
  { name: '致一宋体', _value: '致一宋體', css: 'https://fontsapi.zeoseven.com/522/main/result.css', preview: true },
  { name: '舟方日明体', _value: 'Sthginkra', css: 'https://fontsapi.zeoseven.com/633/main/result.css', preview: true },
  { name: '舟游黑', _value: 'ArknightSans', css: 'https://fontsapi.zeoseven.com/115/main/result.css', preview: true },
]

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

export async function getPageFontActions() {
  const localFontList = await getLocalFontList()
  return defPageFontActions.concat(localFontList)
}

export function loadCustomFont(pageFont, dontSetProp = false) {
  if (!pageFont) return
  if (!dontSetProp) document.documentElement.style.setProperty('--font-family', `'${pageFont}', ${fontFallback}`)
  const cssLink = defPageFontActions.find(e => e._value == pageFont)?.css
  if (!cssLink) return
  if (document.querySelector(`link[href="${cssLink}"]`)) return
  document.head.insertAdjacentHTML('beforeend', `<link href="${cssLink}" rel="stylesheet">`)
}
