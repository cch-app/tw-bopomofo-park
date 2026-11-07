'use strict';
/* ---------- curriculum: 37 zhuyin, each with a Taiwan teaching sound and an animal sticker ----------
   The second field is a sound-alike character, used only when the voice can't read the symbol itself
   (see sayOf in audio.js). Chosen for Taiwan classroom names: light or first tone, common characters.
   No good character exists for ㄝ and ㄥ, so those always send the symbol. ㄈ (佛) and ㄊ (特) carry
   the wrong tone; recorded clips in AUDIO fix that. */
// [symbol, sound used for speech, key word, zhuyin per character, sticker]
const SYM_ROWS = [
  ['ㄅ','玻','豹',['ㄅㄠˋ'],'🐆'], ['ㄆ','坡','螃蟹',['ㄆㄤˊ','ㄒㄧㄝˋ'],'🦀'], ['ㄇ','摸','馬',['ㄇㄚˇ'],'🐴'], ['ㄈ','佛','蜂',['ㄈㄥ'],'🐝'],
  ['ㄉ','的','袋鼠',['ㄉㄞˋ','ㄕㄨˇ'],'🦘'], ['ㄊ','特','兔子',['ㄊㄨˋ','˙ㄗ'],'🐰'], ['ㄋ','呢','牛',['ㄋㄧㄡˊ'],'🐮'], ['ㄌ','了','鹿',['ㄌㄨˋ'],'🦌'],
  ['ㄍ','哥','狗',['ㄍㄡˇ'],'🐶'], ['ㄎ','科','孔雀',['ㄎㄨㄥˇ','ㄑㄩㄝˋ'],'🦚'], ['ㄏ','喝','猴子',['ㄏㄡˊ','˙ㄗ'],'🐵'],
  ['ㄐ','基','雞',['ㄐㄧ'],'🐔'], ['ㄑ','欺','企鵝',['ㄑㄧˋ','ㄜˊ'],'🐧'], ['ㄒ','希','象',['ㄒㄧㄤˋ'],'🐘'],
  ['ㄓ','知','豬',['ㄓㄨ'],'🐷'], ['ㄔ','吃','蟲',['ㄔㄨㄥˊ'],'🐛'], ['ㄕ','詩','獅子',['ㄕ','˙ㄗ'],'🦁'], ['ㄖ','日','乳牛',['ㄖㄨˇ','ㄋㄧㄡˊ'],'🐄'],
  ['ㄗ','資','棕熊',['ㄗㄨㄥ','ㄒㄩㄥˊ'],'🐻'], ['ㄘ','疵','刺蝟',['ㄘˋ','ㄨㄟˋ'],'🦔'], ['ㄙ','思','松鼠',['ㄙㄨㄥ','ㄕㄨˇ'],'🐿️'],
  ['ㄧ','衣','鴨子',['ㄧㄚ','˙ㄗ'],'🦆'], ['ㄨ','烏','烏龜',['ㄨ','ㄍㄨㄟ'],'🐢'], ['ㄩ','迂','魚',['ㄩˊ'],'🐟'],
  ['ㄚ','阿','青蛙',['ㄑㄧㄥ','ㄨㄚ'],'🐸'], ['ㄛ','喔','蝸牛',['ㄨㄛ','ㄋㄧㄡˊ'],'🐌'], ['ㄜ','婀','天鵝',['ㄊㄧㄢ','ㄜˊ'],'🦢'], ['ㄝ','ㄝ','蝴蝶',['ㄏㄨˊ','ㄉㄧㄝˊ'],'🦋'],
  ['ㄞ','哀','海豚',['ㄏㄞˇ','ㄊㄨㄣˊ'],'🐬'], ['ㄟ','欸','北極熊',['ㄅㄟˇ','ㄐㄧˊ','ㄒㄩㄥˊ'],'🐻‍❄️'], ['ㄠ','凹','貓',['ㄇㄠ'],'🐱'], ['ㄡ','歐','貓頭鷹',['ㄇㄠ','ㄊㄡˊ','ㄧㄥ'],'🦉'],
  ['ㄢ','安','斑馬',['ㄅㄢ','ㄇㄚˇ'],'🦓'], ['ㄣ','恩','金魚',['ㄐㄧㄣ','ㄩˊ'],'🐠'], ['ㄤ','骯','羊',['ㄧㄤˊ'],'🐑'], ['ㄥ','ㄥ','鯨魚',['ㄐㄧㄥ','ㄩˊ'],'🐳'], ['ㄦ','兒','兔耳朵',['ㄊㄨˋ','ㄦˇ','˙ㄉㄨㄛ'],'🐇']
];
const SYMS = Object.fromEntries(SYM_ROWS.map(([s, snd, w, z, e]) => [s, {id:s, s, snd, w, z, e}]));
const TREATS = [
  {id:'t-boba', w:'珍珠奶茶', z:['ㄓㄣ','ㄓㄨ','ㄋㄞˇ','ㄔㄚˊ'], e:'🧋'}, {id:'t-ice', w:'剉冰', z:['ㄘㄨㄛˋ','ㄅㄧㄥ'], e:'🍧'},
  {id:'t-xlb', w:'小籠包', z:['ㄒㄧㄠˇ','ㄌㄨㄥˊ','ㄅㄠ'], e:'🥟'}, {id:'t-mango', w:'芒果', z:['ㄇㄤˊ','ㄍㄨㄛˇ'], e:'🥭'},
  {id:'t-tanghulu', w:'糖葫蘆', z:['ㄊㄤˊ','ㄏㄨˊ','ㄌㄨˊ'], e:'🍡'}, {id:'t-fantuan', w:'飯糰', z:['ㄈㄢˋ','ㄊㄨㄢˊ'], e:'🍙'},
  {id:'t-lolli', w:'棒棒糖', z:['ㄅㄤˋ','ㄅㄤˋ','ㄊㄤˊ'], e:'🍭'}, {id:'t-cake', w:'杯子蛋糕', z:['ㄅㄟ','˙ㄗ','ㄉㄢˋ','ㄍㄠ'], e:'🧁'}
];
const TREAT = Object.fromEntries(TREATS.map(t => [t.id, t]));
const LEVELS = [
  {kind:'sym', syms:'ㄅㄆㄇㄈ', sec:'聲母', c:'var(--mint)'}, {kind:'sym', syms:'ㄉㄊㄋㄌ', sec:'聲母', c:'var(--mint)'},
  {kind:'sym', syms:'ㄍㄎㄏ', sec:'聲母', c:'var(--mint)'}, {kind:'sym', syms:'ㄐㄑㄒ', sec:'聲母', c:'var(--mint)'},
  {kind:'sym', syms:'ㄓㄔㄕㄖ', sec:'聲母', c:'var(--mint)'}, {kind:'sym', syms:'ㄗㄘㄙ', sec:'聲母', c:'var(--mint)'},
  {kind:'sym', syms:'ㄧㄨㄩ', sec:'介音', c:'var(--sky)'},
  {kind:'sym', syms:'ㄚㄛㄜㄝ', sec:'韻母', c:'var(--peach)'}, {kind:'sym', syms:'ㄞㄟㄠㄡ', sec:'韻母', c:'var(--peach)'}, {kind:'sym', syms:'ㄢㄣㄤㄥㄦ', sec:'韻母', c:'var(--peach)'},
  {kind:'tone', sec:'聲調', c:'var(--lilac)', treats:2},
  {kind:'word', sec:'拼拼看', c:'var(--moon)', treats:3}
];
/* four seasons, three stops each: the background, the gate and the map signs follow the season of the child's next stop */
const SEASONS = [
  {id:'spring', name:'春天', place:'春天花園', e:'🌸', c:'#ff8fb3'},
  {id:'summer', name:'夏天', place:'夏天海邊', e:'🏖️', c:'#2fa6dc'},
  {id:'autumn', name:'秋天', place:'秋天森林', e:'🍁', c:'#e8813a'},
  {id:'winter', name:'冬天', place:'冬天雪地', e:'⛄', c:'#6c9cc8'}
];
const seasonOf = li => Math.min(3, Math.floor(li / 3));
const TONES = [{z:'ㄇㄚ', c:'媽', n:'一聲'}, {z:'ㄇㄚˊ', c:'麻', n:'二聲'}, {z:'ㄇㄚˇ', c:'馬', n:'三聲'}, {z:'ㄇㄚˋ', c:'罵', n:'四聲'}];
const WORDS = [
  {w:'魚', e:'🐟'}, {w:'花', e:'🌸'}, {w:'貓', e:'🐱'}, {w:'蘋果', e:'🍎'},
  {w:'月亮', e:'🌙'}, {w:'車', e:'🚗'}, {w:'西瓜', e:'🍉'}, {w:'雨', e:'🌧️'}
];
const zyOf = w => [...w].map(c => zhu(ZY[c], 'big')).join('');
const TOTAL = SYM_ROWS.length + TREATS.length;
const stickerOf = id => SYMS[id] || TREAT[id];

/* Taiwanese-style lines: friendly sentence-final particles kids hear at home and school */
const LINES = {
  gate:'歡迎光臨！點一下大門喔！', select:'選一個好朋友吧！', go:'就是你啦！', map:'今天要學什麼呢？',
  hear:'聽聽看，是哪一個注音？', tmeet:'注音有四個聲調，唸唸看！', thear:'聽聽看，是第幾聲？', word:'拼拼看，點對的圖片喔！',
  again:'沒關係，再試一次看看！', back:'回地圖', replay:'再玩一次', erase:'擦掉',
  gotNew:'拿到新貼紙了！', review:'複習完成，好棒喔！', book:'我的貼紙本', teaser:'完成注音，就能去筆畫森林喔！',
  animals:'注音動物', treats:'台灣點心',
  trace:s => `跟著寫寫看「${s}」喔！`, iam:n => `嗨！我是${n}唷！`, grow:n => `哇！${n}長大了耶！`
};
LINES.locked = '先完成前面的喔！';
LINES.clear = '過關了！';
LINES.season = n => `${n}來了耶！快去玩吧！`;
const YAY = ['好棒喔！', '你好厲害喔！', '讚啦！', '超棒的耶！'];
const yay = () => YAY[Math.floor(Math.random()*YAY.length)];

/* Recorded voice lines can replace speech later: map a line or sound to an audio file published with the page, e.g. AUDIO['玻'] = 'audio/bo.mp3'. */
const AUDIO = {};

