<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">
      {{ $t('psoXLFqv51j1SeKjTbnms') }}
      <div class="reset-color" @click="resetColor">
        <Icon name="del" scale="2" />
      </div>
    </h3>
    <div class="color-list">
      <div v-for="(c,i) in colors" :key="i" class="color-item" @click="saveActColor(c)">
        <div class="color-bg" :style="{ background: c.color, color: getNameColor(c.color) }">{{ c.color }}</div>
        <div class="color-name flex-c" :style="{ color: c.color }">
          <van-checkbox v-if="c.color == actColor" :value="true" checked-color="#00AA90" style="margin-right: 0.15rem" />
          <span>{{ c.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getContrastingTextColor, hexToRgb } from '@/utils'

const colors = [
  { name: 'Miku', color: '#39C5BB' },
  { name: 'Teto', color: '#D93A49' },
  { name: 'Luka', color: '#FAAFBE' },
  { name: 'Rin', color: '#FFA500' },
  { name: 'Len', color: '#FFE211' },
  { name: 'IA', color: '#D6758F' },
  { name: 'LuoTianyi', color: '#66CCFF' },
  { name: 'YuezhengLing', color: '#EE0000' },
  { name: 'Stardust', color: '#9999FF', cname: 'Stardust_Blue' },
  { name: 'Miku(Sekai)', color: '#33CCBB', cname: 'Miku_Sekai' },
  { name: 'Rin(Sekai)', color: '#FFCC11', cname: 'Rin_Sekai' },
  { name: 'Luka(Sekai)', color: '#FFBBCC', cname: 'Luka_Sekai' },
  { name: 'MEIKO(Sekai)', color: '#DD4444', cname: 'MEIKO_Sekai' },
  { name: 'KAITO(Sekai)', color: '#3366CC', cname: 'KAITO_Sekai' },

  { name: 'Ln', color: '#4455dd', cname: 'Leo_need' },
  { name: 'Ichika', color: '#33AAEE', cname: 'Ichika' },
  { name: 'Saki', color: '#ffdd44', cname: 'Saki' },
  { name: 'Honami', color: '#ee6666', cname: 'Honami' },
  { name: 'Shiho', color: '#bbdd22', cname: 'Shiho' },
  { name: 'MMJ', color: '#88dd44', cname: 'MMJ' },
  { name: 'Minori', color: '#ffccaa', cname: 'Minori' },
  { name: 'Haruka', color: '#99ccff', cname: 'Haruka' },
  { name: 'Airi', color: '#ffaacc', cname: 'Airi' },
  { name: 'Shizuku', color: '#99eedd', cname: 'Shizuku' },
  { name: 'VBS', color: '#ee1166', cname: 'VBS' },
  { name: 'Kohane', color: '#ff6699', cname: 'Kohane' },
  { name: 'An', color: '#00BBDD', cname: 'An' },
  { name: 'Akito', color: '#FF7722', cname: 'Akito' },
  { name: 'Toya', color: '#0077DD', cname: 'Toya' },
  { name: 'WS', color: '#ff9900', cname: 'WS' },
  { name: 'Emu', color: '#FF66BB', cname: 'Emu' },
  { name: 'Nene', color: '#33DD99', cname: 'Nene' },
  { name: 'Tsukasa', color: '#FFBB00', cname: 'Tsukasa' },
  { name: 'Kamishiro', color: '#BB88EE', cname: 'Kamishiro_Rui' },
  { name: '25時', color: '#884499', cname: '25_Nightcord' },
  { name: 'Kanade', color: '#BB6688', cname: 'Kanade' },
  { name: 'Mafuyu', color: '#8888cc', cname: 'Mafuyu' },
  { name: 'Ena', color: '#CCAA88', cname: 'Ena' },
  { name: 'Mizuki', color: '#DDAACC', cname: 'Mizuki' },

  { name: 'Amami', color: '#e22b30' },
  { name: 'Chihaya', color: '#2743d2' },
  { name: 'Miki', color: '#b4e04b' },
  { name: 'Yukiho', color: '#d3dde9' },
  { name: 'Yayoi', color: '#f39939' },
  { name: 'Iori', color: '#fd99e1' },

  { name: 'Uzuki', color: '#f67599' },
  { name: 'Shibuya', color: '#009bde' },
  { name: 'Mio', color: '#ffb81c' },
  { name: 'Miho', color: '#e13eaf' },
  { name: 'Kyoko', color: '#f9bccb' },
  { name: 'Miyu', color: '#01bfb2' },
  { name: 'Minami', color: '#6ec4e9' },
  { name: 'Fumika', color: '#606eb2' },
  { name: 'Kaede', color: '#47d7ac' },
  { name: 'Ranko', color: '#873399' },
  { name: 'Yukimi', color: '#171c8f' },
  { name: 'Aiko', color: '#cdea80' },
  { name: 'Yoshino', color: '#c4bcb7' },
  { name: 'Totokin', color: '#e9425c' },
  { name: 'Sanae', color: '#e24302' },

  { name: 'Mirai', color: '#ea5b76' },
  { name: 'Shizuka', color: '#6495cf' },
  { name: 'Tsubasa', color: '#fed552' },
  { name: 'Emily', color: '#554171' },
  { name: 'Kana', color: '#f5ad3b' },
  { name: 'Matsuri', color: '#5abfb7' },
  { name: 'Yuriko', color: '#c7b83c' },
  { name: 'Kitazawa', color: '#afa690' },
  { name: 'Tsumugi', color: '#ebe1ff' },
  { name: 'Momoko', color: '#efb864' },
  { name: 'Elena', color: '#9bce92' },
  { name: 'Anna', color: '#7e6ca8' },
  { name: 'Konomi', color: '#f1becb' },
  { name: 'Miya', color: '#d7a96b' },
  { name: 'Fuka', color: '#7278a8' },
  { name: 'Kaori', color: '#274079' },
  { name: 'Leon', color: '#512aa3' },
  { name: 'Shika', color: '#e6f9e5' },

  { name: 'Mano', color: '#ffbad6' },
  { name: 'Hiori', color: '#144384' },
  { name: 'Meguru', color: '#fed552' },
  { name: 'Kogane', color: '#f84cad' },
  { name: 'Mamimi', color: '#a846fb' },
  { name: 'Kiriko', color: '#d9f2ff' },
  { name: 'Chiyoko', color: '#f93b90' },
  { name: 'Rinze', color: '#97cbef' },
  { name: 'Natsuha', color: '#90E667' },
  { name: 'Amana', color: '#f54275' },
  { name: 'Tenka', color: '#e75bec' },
  { name: 'Chiyuki', color: '#fbfafa' },
  { name: 'Fuyuko', color: '#5ce626' },
  { name: 'Madoka', color: '#be1e3e' },
  { name: 'Hinana', color: '#ffc639' },
  { name: 'Nichika', color: '#a6ceb6' },
  { name: 'Hana', color: '#E0B5D3' },
  { name: 'Ikuta', color: '#EAD7A4' },

  { name: 'Hanami', color: '#ff4f63' },
  { name: 'Temari', color: '#26b4eb' },
  { name: 'Kotone', color: '#ffd200' },
  { name: 'Rinami', color: '#fd7ec2' },
  { name: 'Ume', color: '#f74b2a' },
  { name: 'Lilja', color: '#d2e3e4' },

  { name: 'Poppin\'Party', color: '#FF3377', cname: 'Popipa' },
  { name: 'Kasumi', color: '#FF5522' },
  { name: 'Tae', color: '#0077DD' },
  { name: 'Rimi', color: '#FF55BB' },
  { name: 'Saaya', color: '#FFCC11' },
  { name: 'Arisa', color: '#AA66DD' },
  { name: 'Roselia', color: '#3344AA' },
  { name: 'Yukina', color: '#881188' },
  { name: 'Sayo', color: '#00AABB' },
  { name: 'Lisa', color: '#DD2200' },
  { name: 'Ako', color: '#DD0088' },
  { name: 'Rinko', color: '#BBBBBB' },
  { name: 'Afterglow', color: '#E53344' },
  { name: 'Ran', color: '#EE0022' },
  { name: 'Moka', color: '#00CCAA' },
  { name: 'Himari', color: '#FF9999' },
  { name: 'Tomoe', color: '#BB0033' },
  { name: 'Tsugumi', color: '#FFEE88' },
  { name: 'Pastel*Palettes', color: '#33DDAA', cname: 'PasPale' },
  { name: 'Aya', color: '#FF88BB' },
  { name: 'Hina', color: '#55DDEE' },
  { name: 'Chisato', color: '#FFEEAA' },
  { name: 'Maya', color: '#99DD88' },
  { name: 'Eve', color: '#DDBBFF' },
  { name: 'Hello, Happy World!', color: '#FFC02A', cname: 'HHW' },
  { name: 'Kokoro', color: '#FFEE22' },
  { name: 'Kaoru', color: '#AA33CC' },
  { name: 'Hagumi', color: '#FF9922' },
  { name: 'Kanon', color: '#44DDFF' },
  { name: 'Misaki', color: '#006599' },
  { name: 'Michelle', color: '#DD33CC', cname: 'Michelle' },
  { name: 'RAISE A SUILEN', color: '#33CCCC', cname: 'RAS' },
  { name: 'RAISE A SUILEN', color: '#8844DD', cname: 'RAS_Alt' },
  { name: 'LAYER', color: '#CC0000' },
  { name: 'LOCK', color: '#AAEE22' },
  { name: 'MASKING', color: '#EEBB44' },
  { name: 'PAREO', color: '#FF99BB' },
  { name: 'CHU²', color: '#00BBFF', cname: 'CHU2' },
  { name: 'Morfonica', color: '#33AAFF' },
  { name: 'Mashiro', color: '#6677CC' },
  { name: 'Touko', color: '#EE6666' },
  { name: 'Nanami', color: '#EE7744' },
  { name: 'Tsukushi', color: '#EE7788' },
  { name: 'Rui', color: '#669988' },
  { name: 'BanG Dream!', color: '#E5004F', cname: 'BanG_Dream' },
  { name: 'MyGO!!!!!', color: '#3388BB', cname: 'MyGO' },
  { name: 'Tomori', color: '#77BBDD' },
  { name: 'Anon', color: '#FF8899' },
  { name: 'Rāna', color: '#77DD77', cname: 'Rana' },
  { name: 'Soyo', color: '#FFDD88' },
  { name: 'Taki', color: '#7777AA' },
  { name: 'Ave Mujica', color: '#881144', cname: 'Ave_Mujica' },
  { name: 'Doloris', color: '#BB9854', cname: 'Doloris' },
  { name: 'Mortis', color: '#799978', cname: 'Mortis' },
  { name: 'Timoris', color: '#345566', cname: 'Timoris' },
  { name: 'Amoris', color: '#AB4378', cname: 'Amoris' },
  { name: 'Oblivionis', color: '#7899CC', cname: 'Oblivionis' },
  {
    name: '撫子',
    color: '#DC9FB4',
    cname: 'NADESHIKO',
  },
  {
    name: '紅梅',
    color: '#E16B8C',
    cname: 'KOHBAI',
  },
  {
    name: '蘇芳',
    color: '#8E354A',
    cname: 'SUOH',
  },
  {
    name: '退紅',
    color: '#F8C3CD',
    cname: 'TAIKOH',
  },
  {
    name: '一斥染',
    color: '#F4A7B9',
    cname: 'IKKONZOME',
  },
  {
    name: '桑染',
    color: '#64363C',
    cname: 'KUWAZOME',
  },
  {
    name: '桃',
    color: '#F596AA',
    cname: 'MOMO',
  },
  {
    name: '苺',
    color: '#B5495B',
    cname: 'ICHIGO',
  },
  {
    name: '薄紅',
    color: '#E87A90',
    cname: 'USUBENI',
  },
  {
    name: '今様',
    color: '#D05A6E',
    cname: 'IMAYOH',
  },
  {
    name: '中紅',
    color: '#DB4D6D',
    cname: 'NAKABENI',
  },
  {
    name: '桜',
    color: '#FEDFE1',
    cname: 'SAKURA',
  },
  {
    name: '梅鼠',
    color: '#9E7A7A',
    cname: 'UMENEZUMI',
  },
  {
    name: '韓紅花',
    color: '#D0104C',
    cname: 'KARAKURENAI',
  },
  {
    name: '燕脂',
    color: '#9F353A',
    cname: 'ENJI',
  },
  {
    name: '紅',
    color: '#CB1B45',
    cname: 'KURENAI',
  },
  {
    name: '鴇',
    color: '#EEA9A9',
    cname: 'TOKI',
  },
  {
    name: '長春',
    color: '#BF6766',
    cname: 'CYOHSYUN',
  },
  {
    name: '深緋',
    color: '#86473F',
    cname: 'KOKIAKE',
  },
  {
    name: '桜鼠',
    color: '#B19693',
    cname: 'SAKURANEZUMI',
  },
  {
    name: '甚三紅',
    color: '#EB7A77',
    cname: 'JINZAMOMI',
  },
  {
    name: '小豆',
    color: '#954A45',
    cname: 'AZUKI',
  },
  {
    name: '蘇芳香',
    color: '#A96360',
    cname: 'SUOHKOH',
  },
  {
    name: '赤紅',
    color: '#CB4042',
    cname: 'AKABENI',
  },
  {
    name: '真朱',
    color: '#AB3B3A',
    cname: 'SHINSYU',
  },
  {
    name: '灰桜',
    color: '#D7C4BB',
    cname: 'HAIZAKURA',
  },
  {
    name: '栗梅',
    color: '#904840',
    cname: 'KURIUME',
  },
  {
    name: '海老茶',
    color: '#734338',
    cname: 'EBICHA',
  },
  {
    name: '銀朱',
    color: '#C73E3A',
    cname: 'GINSYU',
  },
  {
    name: '黒鳶',
    color: '#554236',
    cname: 'KUROTOBI',
  },
  {
    name: '紅鳶',
    color: '#994639',
    cname: 'BENITOBI',
  },
  {
    name: '曙',
    color: '#F19483',
    cname: 'AKEBONO',
  },
  {
    name: '紅樺',
    color: '#B54434',
    cname: 'BENIKABA',
  },
  {
    name: '水がき',
    color: '#B9887D',
    cname: 'MIZUGAKI',
  },
  {
    name: '珊瑚朱',
    color: '#F17C67',
    cname: 'SANGOSYU',
  },
  {
    name: '紅檜皮',
    color: '#884C3A',
    cname: 'BENIHIWADA',
  },
  {
    name: '猩猩緋',
    color: '#E83015',
    cname: 'SYOJYOHI',
  },
  {
    name: '鉛丹',
    color: '#D75455',
    cname: 'ENTAN',
  },
  {
    name: '芝翫茶',
    color: '#B55D4C',
    cname: 'SHIKANCHA',
  },
  {
    name: '檜皮',
    color: '#854836',
    cname: 'HIWADA',
  },
  {
    name: '柿渋',
    color: '#A35E47',
    cname: 'KAKISHIBU',
  },
  {
    name: '緋',
    color: '#CC543A',
    cname: 'AKE',
  },
  {
    name: '鳶',
    color: '#724832',
    cname: 'TOBI',
  },
  {
    name: '紅緋',
    color: '#F75C2F',
    cname: 'BENIHI',
  },
  {
    name: '栗皮茶',
    color: '#6A4028',
    cname: 'KURIKAWACHA',
  },
  {
    name: '弁柄',
    color: '#9A5034',
    cname: 'BENGARA',
  },
  {
    name: '照柿',
    color: '#C46243',
    cname: 'TERIGAKI',
  },
  {
    name: '江戸茶',
    color: '#AF5F3C',
    cname: 'EDOCHA',
  },
  {
    name: '洗朱',
    color: '#FB966E',
    cname: 'ARAISYU',
  },
  {
    name: '百塩茶',
    color: '#724938',
    cname: 'MOMOSHIOCHA',
  },
  {
    name: '唐茶',
    color: '#B47157',
    cname: 'KARACHA',
  },
  {
    name: 'ときがら茶',
    color: '#DB8E71',
    cname: 'TOKIGARACHA',
  },
  {
    name: '黄丹',
    color: '#F05E1C',
    cname: 'OHNI',
  },
  {
    name: '纁',
    color: '#ED784A',
    cname: 'SOHI',
  },
  {
    name: '遠州茶',
    color: '#CA7853',
    cname: 'ENSYUCHA',
  },
  {
    name: '樺茶',
    color: '#B35C37',
    cname: 'KABACHA',
  },
  {
    name: '焦茶',
    color: '#563F2E',
    cname: 'KOGECHA',
  },
  {
    name: '赤香',
    color: '#E3916E',
    cname: 'AKAKOH',
  },
  {
    name: '雀茶',
    color: '#8F5A3C',
    cname: 'SUZUMECHA',
  },
  {
    name: '宍',
    color: '#F0A986',
    cname: 'SHISHI',
  },
  {
    name: '宗伝唐茶',
    color: '#A0674B',
    cname: 'SODENKARACHA',
  },
  {
    name: '樺',
    color: '#C1693C',
    cname: 'KABA',
  },
  {
    name: '深支子',
    color: '#FB9966',
    cname: 'KOKIKUCHINASHI',
  },
  {
    name: '胡桃',
    color: '#947A6D',
    cname: 'KURUMI',
  },
  {
    name: '代赭',
    color: '#A36336',
    cname: 'TAISYA',
  },
  {
    name: '洗柿',
    color: '#E79460',
    cname: 'ARAIGAKI',
  },
  {
    name: '黄櫨染',
    color: '#7D532C',
    cname: 'KOHROZEN',
  },
  {
    name: '赤朽葉',
    color: '#C78550',
    cname: 'AKAKUCHIBA',
  },
  {
    name: '礪茶',
    color: '#985F2A',
    cname: 'TONOCHA',
  },
  {
    name: '赤白橡',
    color: '#E1A679',
    cname: 'AKASHIROTSURUBAMI',
  },
  {
    name: '煎茶',
    color: '#855B32',
    cname: 'SENCHA',
  },
  {
    name: '萱草',
    color: '#FC9F4D',
    cname: 'KANZO',
  },
  {
    name: '洒落柿',
    color: '#FFBA84',
    cname: 'SHAREGAKI',
  },
  {
    name: '紅鬱金',
    color: '#E98B2A',
    cname: 'BENIUKON',
  },
  {
    name: '梅染',
    color: '#E9A368',
    cname: 'UMEZOME',
  },
  {
    name: '枇杷茶',
    color: '#B17844',
    cname: 'BIWACHA',
  },
  {
    name: '丁子茶',
    color: '#96632E',
    cname: 'CHOJICHA',
  },
  {
    name: '憲法染',
    color: '#43341B',
    cname: 'KENPOHZOME',
  },
  {
    name: '琥珀',
    color: '#CA7A2C',
    cname: 'KOHAKU',
  },
  {
    name: '薄柿',
    color: '#ECB88A',
    cname: 'USUGAKI',
  },
  {
    name: '伽羅',
    color: '#78552B',
    cname: 'KYARA',
  },
  {
    name: '丁子染',
    color: '#B07736',
    cname: 'CHOJIZOME',
  },
  {
    name: '柴染',
    color: '#967249',
    cname: 'FUSHIZOME',
  },
  {
    name: '朽葉',
    color: '#E2943B',
    cname: 'KUCHIBA',
  },
  {
    name: '金茶',
    color: '#C7802D',
    cname: 'KINCHA',
  },
  {
    name: '狐',
    color: '#9B6E23',
    cname: 'KITSUNE',
  },
  {
    name: '煤竹',
    color: '#6E552F',
    cname: 'SUSUTAKE',
  },
  {
    name: '薄香',
    color: '#EBB471',
    cname: 'USUKOH',
  },
  {
    name: '砥粉',
    color: '#D7B98E',
    cname: 'TONOKO',
  },
  {
    name: '銀煤竹',
    color: '#82663A',
    cname: 'GINSUSUTAKE',
  },
  {
    name: '黄土',
    color: '#B68E55',
    cname: 'OHDO',
  },
  {
    name: '白茶',
    color: '#BC9F77',
    cname: 'SHIRACHA',
  },
  {
    name: '媚茶',
    color: '#876633',
    cname: 'KOBICHA',
  },
  {
    name: '黄唐茶',
    color: '#C18A26',
    cname: 'KIGARACHA',
  },
  {
    name: '山吹',
    color: '#FFB11B',
    cname: 'YAMABUKI',
  },
  {
    name: '山吹茶',
    color: '#D19826',
    cname: 'YAMABUKICHA',
  },
  {
    name: '櫨染',
    color: '#DDA52D',
    cname: 'HAJIZOME',
  },
  {
    name: '桑茶',
    color: '#C99833',
    cname: 'KUWACHA',
  },
  {
    name: '玉子',
    color: '#F9BF45',
    cname: 'TAMAGO',
  },
  {
    name: '白橡',
    color: '#DCB879',
    cname: 'SHIROTSURUBAMI',
  },
  {
    name: '黄橡',
    color: '#BA9132',
    cname: 'KITSURUBAMI',
  },
  {
    name: '玉蜀黍',
    color: '#E8B647',
    cname: 'TAMAMOROKOSHI',
  },
  {
    name: '花葉',
    color: '#F7C242',
    cname: 'HANABA',
  },
  {
    name: '生壁',
    color: '#7D6C46',
    cname: 'NAMAKABE',
  },
  {
    name: '鳥の子',
    color: '#DAC9A6',
    cname: 'TORINOKO',
  },
  {
    name: '浅黄',
    color: '#FAD689',
    cname: 'USUKI',
  },
  {
    name: '黄朽葉',
    color: '#D9AB42',
    cname: 'KIKUCHIBA',
  },
  {
    name: '梔子',
    color: '#F6C555',
    cname: 'KUCHINASHI',
  },
  {
    name: '籐黄',
    color: '#FFC408',
    cname: 'TOHOH',
  },
  {
    name: '鬱金',
    color: '#EFBB24',
    cname: 'UKON',
  },
  {
    name: '芥子',
    color: '#CAAD5F',
    cname: 'KARASHI',
  },
  {
    name: '肥後煤竹',
    color: '#8D742A',
    cname: 'HIGOSUSUTAKE',
  },
  {
    name: '利休白茶',
    color: '#B4A582',
    cname: 'RIKYUSHIRACHA',
  },
  {
    name: '灰汁',
    color: '#877F6C',
    cname: 'AKU',
  },
  {
    name: '利休茶',
    color: '#897D55',
    cname: 'RIKYUCHA',
  },
  {
    name: '路考茶',
    color: '#74673E',
    cname: 'ROKOHCHA',
  },
  {
    name: '菜種油',
    color: '#A28C37',
    cname: 'NATANEYU',
  },
  {
    name: '鶯茶',
    color: '#6C6024',
    cname: 'UGUISUCHA',
  },
  {
    name: '黄海松茶',
    color: '#867835',
    cname: 'KIMIRUCHA',
  },
  {
    name: '海松茶',
    color: '#62592C',
    cname: 'MIRUCHA',
  },
  {
    name: '刈安',
    color: '#E9CD4C',
    cname: 'KARIYASU',
  },
  {
    name: '菜の花',
    color: '#F7D94C',
    cname: 'NANOHANA',
  },
  {
    name: '黄蘗',
    color: '#FBE251',
    cname: 'KIHADA',
  },
  {
    name: '蒸栗',
    color: '#D9CD90',
    cname: 'MUSHIKURI',
  },
  {
    name: '青朽葉',
    color: '#ADA142',
    cname: 'AOKUCHIBA',
  },
  {
    name: '女郎花',
    color: '#DDD23B',
    cname: 'OMINAESHI',
  },
  {
    name: '鶸茶',
    color: '#A5A051',
    cname: 'HIWACHA',
  },
  {
    name: '鶸',
    color: '#BEC23F',
    cname: 'HIWA',
  },
  {
    name: '鶯',
    color: '#6C6A2D',
    cname: 'UGUISU',
  },
  {
    name: '柳茶',
    color: '#939650',
    cname: 'YANAGICHA',
  },
  {
    name: '苔',
    color: '#838A2D',
    cname: 'KOKE',
  },
  {
    name: '麹塵',
    color: '#B1B479',
    cname: 'KIKUJIN',
  },
  {
    name: '璃寛茶',
    color: '#616138',
    cname: 'RIKANCHA',
  },
  {
    name: '藍媚茶',
    color: '#4B4E2A',
    cname: 'AIKOBICHA',
  },
  {
    name: '海松',
    color: '#5B622E',
    cname: 'MIRU',
  },
  {
    name: '千歳茶',
    color: '#4D5139',
    cname: 'SENSAICHA',
  },
  {
    name: '梅幸茶',
    color: '#89916B',
    cname: 'BAIKOCHA',
  },
  {
    name: '鶸萌黄',
    color: '#90B44B',
    cname: 'HIWAMOEGI',
  },
  {
    name: '柳染',
    color: '#91AD70',
    cname: 'YANAGIZOME',
  },
  {
    name: '裏柳',
    color: '#B5CAA0',
    cname: 'URAYANAGI',
  },
  {
    name: '岩井茶',
    color: '#646A58',
    cname: 'IWAICHA',
  },
  {
    name: '萌黄',
    color: '#7BA23F',
    cname: 'MOEGI',
  },
  {
    name: '苗',
    color: '#86C166',
    cname: 'NAE',
  },
  {
    name: '柳煤竹',
    color: '#4A593D',
    cname: 'YANAGISUSUTAKE',
  },
  {
    name: '松葉',
    color: '#42602D',
    cname: 'MATSUBA',
  },
  {
    name: '青丹',
    color: '#516E41',
    cname: 'AONI',
  },
  {
    name: '薄青',
    color: '#91B493',
    cname: 'USUAO',
  },
  {
    name: '柳鼠',
    color: '#808F7C',
    cname: 'YANAGINEZUMI',
  },
  {
    name: '常磐',
    color: '#1B813E',
    cname: 'TOKIWA',
  },
  {
    name: '若竹',
    color: '#5DAC81',
    cname: 'WAKATAKE',
  },
  {
    name: '千歳緑',
    color: '#36563C',
    cname: 'CHITOSEMIDORI',
  },
  {
    name: '緑',
    color: '#227D51',
    cname: 'MIDORI',
  },
  {
    name: '白緑',
    color: '#A8D8B9',
    cname: 'BYAKUROKU',
  },
  {
    name: '老竹',
    color: '#6A8372',
    cname: 'OITAKE',
  },
  {
    name: '木賊',
    color: '#2D6D4B',
    cname: 'TOKUSA',
  },
  {
    name: '御納戸茶',
    color: '#465D4C',
    cname: 'ONANDOCHA',
  },
  {
    name: '緑青',
    color: '#24936E',
    cname: 'ROKUSYOH',
  },
  {
    name: '錆青磁',
    color: '#86A697',
    cname: 'SABISEIJI',
  },
  {
    name: '青竹',
    color: '#00896C',
    cname: 'AOTAKE',
  },
  {
    name: 'ビロード',
    color: '#096148',
    cname: 'VELUDO',
  },
  {
    name: '虫襖',
    color: '#20604F',
    cname: 'MUSHIAO',
  },
  {
    name: '藍海松茶',
    color: '#0F4C3A',
    cname: 'AIMIRUCHA',
  },
  {
    name: '沈香茶',
    color: '#4F726C',
    cname: 'TONOCHA2',
  },
  {
    name: '青緑',
    color: '#00AA90',
    cname: 'AOMIDORI',
  },
  {
    name: '青磁',
    color: '#69B0AC',
    cname: 'SEIJI',
  },
  {
    name: '鉄',
    color: '#26453D',
    cname: 'TETSU',
  },
  {
    name: '水浅葱',
    color: '#66BAB7',
    cname: 'MIZUASAGI',
  },
  {
    name: '青碧',
    color: '#268785',
    cname: 'SEIHEKI',
  },
  {
    name: '錆鉄御納戸',
    color: '#405B55',
    cname: 'SABITETSUONANDO',
  },
  {
    name: '高麗納戸',
    color: '#305A56',
    cname: 'KORAINANDO',
  },
  {
    name: '白群',
    color: '#78C2C4',
    cname: 'BYAKUGUN',
  },
  {
    name: '御召茶',
    color: '#376B6D',
    cname: 'OMESHICHA',
  },
  {
    name: '瓶覗',
    color: '#A5DEE4',
    cname: 'KAMENOZOKI',
  },
  {
    name: '深川鼠',
    color: '#77969A',
    cname: 'FUKAGAWANEZUMI',
  },
  {
    name: '錆浅葱',
    color: '#6699A1',
    cname: 'SABIASAGI',
  },
  {
    name: '水',
    color: '#81C7D4',
    cname: 'MIZU',
  },
  {
    name: '浅葱',
    color: '#33A6B8',
    cname: 'ASAGI',
  },
  {
    name: '御納戸',
    color: '#0C4842',
    cname: 'ONANDO',
  },
  {
    name: '藍',
    color: '#0D5661',
    cname: 'AI',
  },
  {
    name: '新橋',
    color: '#0089A7',
    cname: 'SHINBASHI',
  },
  {
    name: '錆御納戸',
    color: '#336774',
    cname: 'SABIONANDO',
  },
  {
    name: '鉄御納戸',
    color: '#255359',
    cname: 'TETSUONANDO',
  },
  {
    name: '花浅葱',
    color: '#1E88A8',
    cname: 'HANAASAGI',
  },
  {
    name: '藍鼠',
    color: '#566C73',
    cname: 'AINEZUMI',
  },
  {
    name: '舛花',
    color: '#577C8A',
    cname: 'MASUHANA',
  },
  {
    name: '空',
    color: '#58B2DC',
    cname: 'SORA',
  },
  {
    name: '熨斗目花',
    color: '#2B5F75',
    cname: 'NOSHIMEHANA',
  },
  {
    name: '千草',
    color: '#3A8FB7',
    cname: 'CHIGUSA',
  },
  {
    name: '御召御納戸',
    color: '#2E5C6E',
    cname: 'OMESHIONANDO',
  },
  {
    name: '縹',
    color: '#006284',
    cname: 'HANADA',
  },
  {
    name: '勿忘草',
    color: '#7DB9DE',
    cname: 'WASURENAGUSA',
  },
  {
    name: '群青',
    color: '#51A8DD',
    cname: 'GUNJYO',
  },
  {
    name: '露草',
    color: '#2EA9DF',
    cname: 'TSUYUKUSA',
  },
  {
    name: '黒橡',
    color: '#0B1013',
    cname: 'KUROTSURUBAMI',
  },
  {
    name: '紺',
    color: '#0F2540',
    cname: 'KON',
  },
  {
    name: '褐',
    color: '#08192D',
    cname: 'KACHI',
  },
  {
    name: '瑠璃',
    color: '#005CAF',
    cname: 'RURI',
  },
  {
    name: '瑠璃紺',
    color: '#0B346E',
    cname: 'RURIKON',
  },
  {
    name: '紅碧',
    color: '#7B90D2',
    cname: 'BENIMIDORI',
  },
  {
    name: '藤鼠',
    color: '#6E75A4',
    cname: 'FUJINEZUMI',
  },
  {
    name: '鉄紺',
    color: '#261E47',
    cname: 'TETSUKON',
  },
  {
    name: '紺青',
    color: '#113285',
    cname: 'KONJYO',
  },
  {
    name: '紅掛花',
    color: '#4E4F97',
    cname: 'BENIKAKEHANA',
  },
  {
    name: '紺桔梗',
    color: '#211E55',
    cname: 'KONKIKYO',
  },
  {
    name: '藤',
    color: '#8B81C3',
    cname: 'FUJI',
  },
  {
    name: '二藍',
    color: '#70649A',
    cname: 'FUTAAI',
  },
  {
    name: '楝',
    color: '#9B90C2',
    cname: 'OUCHI',
  },
  {
    name: '藤紫',
    color: '#8A6BBE',
    cname: 'FUJIMURASAKI',
  },
  {
    name: '桔梗',
    color: '#6A4C9C',
    cname: 'KIKYO',
  },
  {
    name: '紫苑',
    color: '#8F77B5',
    cname: 'SHION',
  },
  {
    name: '滅紫',
    color: '#533D5B',
    cname: 'MESSHI',
  },
  {
    name: '薄',
    color: '#B28FCE',
    cname: 'USU',
  },
  {
    name: '半',
    color: '#986DB2',
    cname: 'HASHITA',
  },
  {
    name: '江戸紫',
    color: '#77428D',
    cname: 'EDOMURASAKI',
  },
  {
    name: '紫紺',
    color: '#3C2F41',
    cname: 'SHIKON',
  },
  {
    name: '深紫',
    color: '#4A225D',
    cname: 'KOKIMURASAKI',
  },
  {
    name: '菫',
    color: '#66327C',
    cname: 'SUMIRE',
  },
  {
    name: '紫',
    color: '#592C63',
    cname: 'MURASAKI',
  },
  {
    name: '菖蒲',
    color: '#6F3381',
    cname: 'AYAME',
  },
  {
    name: '藤煤竹',
    color: '#574C57',
    cname: 'FUJISUSUTAKE',
  },
  {
    name: '紅藤',
    color: '#B481BB',
    cname: 'BENIFUJI',
  },
  {
    name: '黒紅',
    color: '#3F2B36',
    cname: 'KUROBENI',
  },
  {
    name: '茄子紺',
    color: '#572A3F',
    cname: 'NASUKON',
  },
  {
    name: '葡萄鼠',
    color: '#5E3D50',
    cname: 'BUDOHNEZUMI',
  },
  {
    name: '鳩羽鼠',
    color: '#72636E',
    cname: 'HATOBANEZUMI',
  },
  {
    name: '杜若',
    color: '#622954',
    cname: 'KAKITSUBATA',
  },
  {
    name: '蒲葡',
    color: '#6D2E5B',
    cname: 'EBIZOME',
  },
  {
    name: '牡丹',
    color: '#C1328E',
    cname: 'BOTAN',
  },
  {
    name: '梅紫',
    color: '#A8497A',
    cname: 'UMEMURASAKI',
  },
  {
    name: '似紫',
    color: '#562E37',
    cname: 'NISEMURASAKI',
  },
  {
    name: '躑躅',
    color: '#E03C8A',
    cname: 'TSUTSUJI',
  },
  {
    name: '紫鳶',
    color: '#60373E',
    cname: 'MURASAKITOBI',
  },
  {
    name: '白練',
    color: '#FCFAF2',
    cname: 'SHIRONERI',
  },
  {
    name: '胡粉',
    color: '#FFFFFB',
    cname: 'GOFUN',
  },
  {
    name: '白鼠',
    color: '#BDC0BA',
    cname: 'SHIRONEZUMI',
  },
  {
    name: '銀鼠',
    color: '#91989F',
    cname: 'GINNEZUMI',
  },
  {
    name: '鉛',
    color: '#787878',
    cname: 'NAMARI',
  },
  {
    name: '灰',
    color: '#828282',
    cname: 'HAI',
  },
  {
    name: '素鼠',
    color: '#787D7B',
    cname: 'SUNEZUMI',
  },
  {
    name: '利休鼠',
    color: '#707C74',
    cname: 'RIKYUNEZUMI',
  },
  {
    name: '鈍',
    color: '#656765',
    cname: 'NIBI',
  },
  {
    name: '青鈍',
    color: '#535953',
    cname: 'AONIBI',
  },
  {
    name: '溝鼠',
    color: '#4F4F48',
    cname: 'DOBUNEZUMI',
  },
  {
    name: '紅消鼠',
    color: '#52433D',
    cname: 'BENIKESHINEZUMI',
  },
  {
    name: '藍墨茶',
    color: '#373C38',
    cname: 'AISUMICHA',
  },
  {
    name: '檳榔子染',
    color: '#3A3226',
    cname: 'BINROJIZOME',
  },
  {
    name: '消炭',
    color: '#434343',
    cname: 'KESHIZUMI',
  },
  {
    name: '墨',
    color: '#1C1C1C',
    cname: 'SUMI',
  },
  {
    name: '黒',
    color: '#080808',
    cname: 'KURO',
  },
  {
    name: '呂',
    color: '#0C0C0C',
    cname: 'RO',
  },
]

export default {
  name: 'SettingAccentColor',
  components: {
  },
  data() {
    return {
      colors,
      actColor: localStorage.PXV_ACT_COLOR,
    }
  },
  head() {
    return { title: this.$t('psoXLFqv51j1SeKjTbnms') }
  },
  methods: {
    saveActColor(c) {
      window.umami?.track('set_act_color', { name: c.name })
      const theme = c.cname || c.name
      const doc = document.documentElement
      doc.classList.remove('t_' + localStorage.PXV_THEME)
      doc.classList.add('custom_theme', 't_' + theme)
      doc.style.setProperty('--accent-color', c.color)
      this.actColor = c.color
      localStorage.PXV_THEME = theme
      localStorage.PXV_ACT_COLOR = c.color
    },
    resetColor() {
      this.actColor = null
      const doc = document.documentElement
      doc.classList.remove('custom_theme')
      doc.classList.remove('t_' + localStorage.PXV_THEME)
      doc.style.removeProperty('--accent-color')
      localStorage.removeItem('PXV_THEME')
      localStorage.removeItem('PXV_ACT_COLOR')
    },
    getNameColor(hex) {
      return getContrastingTextColor(hexToRgb(hex))
    },
  },
}
</script>

<style lang="stylus" scoped>
.reset-color
  position fixed
  top 0.5rem
  right 20px
  cursor pointer
  ::v-deep .svg-icon
    font-size 0.6rem !important

.color-list
  display flex
  gap 0.2rem
  flex-wrap wrap
  padding 20px
  .color-item
    flex: 0 0 31.8%;
    max-width: 31.8%;
    font-size 0.3rem
    border-radius 0.15rem
    cursor pointer
  .color-bg
    display flex
    justify-content center
    align-items center
    width 100%
    height 1.1rem
    color #fff
    border-radius 0.15rem
  .color-name
    margin-top 10px
    text-align center

</style>
