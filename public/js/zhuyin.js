'use strict';
/* ---------- zhuyin (Taiwan Ministry of Education readings) ---------- */
const ZY = Object.fromEntries(('歡ㄏㄨㄢ 迎ㄧㄥˊ 點ㄉㄧㄢˇ 一ㄧˊ 下ㄒㄧㄚˋ 月ㄩㄝˋ 亮ㄌㄧㄤˋ 門ㄇㄣˊ 選ㄒㄩㄢˇ 個ㄍㄜˋ 好ㄏㄠˇ 朋ㄆㄥˊ 友ㄧㄡˇ 就ㄐㄧㄡˋ 是ㄕˋ 你ㄋㄧˇ 去ㄑㄩˋ 哪ㄋㄚˇ 裡ㄌㄧˇ 玩ㄨㄢˊ 聽ㄊㄧㄥ 看ㄎㄢˋ 圖ㄊㄨˊ 片ㄆㄧㄢˋ 棒ㄅㄤˋ 再ㄗㄞˋ 試ㄕˋ 跟ㄍㄣ 著˙ㄓㄜ 光ㄍㄨㄤ 寫ㄒㄧㄝˇ 人ㄖㄣˊ 了˙ㄌㄜ 燈ㄉㄥ 籠ㄌㄨㄥˊ 還ㄏㄞˊ 要ㄧㄠˋ 更ㄍㄥˋ 多ㄉㄨㄛ 喔ㄛ 注ㄓㄨˋ 音ㄧㄣ 花ㄏㄨㄚ 園ㄩㄢˊ 筆ㄅㄧˇ 畫ㄏㄨㄚˋ 森ㄙㄣ 林ㄌㄧㄣˊ 字ㄗˋ 市ㄕˋ 集ㄐㄧˊ 故ㄍㄨˋ 事ㄕˋ 書ㄕㄨ 館ㄍㄨㄢˇ 部ㄅㄨˋ 首ㄕㄡˇ 山ㄕㄢ 島ㄉㄠˇ 快ㄎㄨㄞˋ 開ㄎㄞ 先ㄒㄧㄢ 吧˙ㄅㄚ 我ㄨㄛˇ 豆ㄉㄡˋ 波ㄅㄛ 小ㄒㄧㄠˇ 橘ㄐㄩˊ 泡ㄆㄠˋ 星ㄒㄧㄥ 魚ㄩˊ 貓ㄇㄠ 蘋ㄆㄧㄥˊ 果ㄍㄨㄛˇ 長ㄓㄤˇ 大ㄉㄚˋ 回ㄏㄨㄟˊ 地ㄉㄧˋ 新ㄒㄧㄣ 貼ㄊㄧㄝ 紙ㄓˇ 車ㄔㄜ 西ㄒㄧ 瓜ㄍㄨㄚ 雨ㄩˇ 寶ㄅㄠˇ 探ㄊㄢˋ 險ㄒㄧㄢˇ 家ㄐㄧㄚ 勇ㄩㄥˇ 敢ㄍㄢˇ 次ㄘˋ 樂ㄌㄜˋ 臨ㄌㄧㄣˊ 今ㄐㄧㄣ 天ㄊㄧㄢ 呢˙ㄋㄜ 對ㄉㄨㄟˋ 厲ㄌㄧˋ 害ㄏㄞˋ 讚ㄗㄢˋ 沒ㄇㄟˊ 關ㄍㄨㄢ 係˙ㄒㄧ 慢ㄇㄢˋ 哇ㄨㄚ 加ㄐㄧㄚ 油ㄧㄡˊ 等ㄉㄥˇ 嗨ㄏㄞ 唷ㄧㄛ 耶˙ㄧㄝ 啦˙ㄌㄚ 超ㄔㄠ 的˙ㄉㄜ 這ㄓㄜˋ 學ㄒㄩㄝˊ 什ㄕㄣˊ 麼˙ㄇㄜ 完ㄨㄢˊ 成ㄔㄥˊ 能ㄋㄥˊ 拿ㄋㄚˊ 到ㄉㄠˋ 本ㄅㄣˇ 台ㄊㄞˊ 灣ㄨㄢ 心ㄒㄧㄣ 四ㄙˋ 唸ㄋㄧㄢˋ 有ㄧㄡˇ 調ㄉㄧㄠˋ 聲ㄕㄥ 第ㄉㄧˋ 幾ㄐㄧˇ 母ㄇㄨˇ 介ㄐㄧㄝˋ 韻ㄩㄣˋ 拼ㄆㄧㄣ 博ㄅㄛˊ 士ㄕˋ 動ㄉㄨㄥˋ 物ㄨˋ 擦ㄘㄚ 掉ㄉㄧㄠˋ 複ㄈㄨˋ 習ㄒㄧˊ 媽ㄇㄚ 麻ㄇㄚˊ 馬ㄇㄚˇ 罵ㄇㄚˋ 也ㄧㄝˇ 想ㄒㄧㄤˇ 收ㄕㄡ 都ㄉㄡ 齊ㄑㄧˊ 嘍˙ㄌㄡ 前ㄑㄧㄢˊ 面ㄇㄧㄢˋ 季ㄐㄧˋ 春ㄔㄨㄣ 夏ㄒㄧㄚˋ 秋ㄑㄧㄡ 冬ㄉㄨㄥ 海ㄏㄞˇ 邊ㄅㄧㄢ 雪ㄒㄩㄝˇ 來ㄌㄞˊ 起ㄑㄧˇ 過ㄍㄨㄛˋ')
  .split(' ').map(s => [s[0], s.slice(1)]));
/* Taiwan textbook layout: zhuyin runs in a vertical column to the right of each character, tone mark beside it, neutral-tone dot on top */
function zhu(z, cls=''){
  let body = z, light = false, tone = '';
  if (body.startsWith('˙')) { light = true; body = body.slice(1); }
  if (/[ˊˇˋ]$/.test(body)) { tone = body.slice(-1); body = body.slice(0, -1); }
  return `<span class="zh ${cls}" aria-hidden="true">${light ? '<span class="zl">˙</span>' : ''}${[...body].map(c => `<span>${c}</span>`).join('')}${tone ? `<span class="zt">${tone}</span>` : ''}</span>`;
}
const cz = (c, z) => z ? `<span class="zc">${c}${zhu(z)}</span>` : c;
const rb = s => [...s].map(c => cz(c, ZY[c])).join('');
const rbw = (w, z) => [...w].map((c, i) => cz(c, z[i])).join('');

