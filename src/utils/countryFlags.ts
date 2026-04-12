export interface CountryFlag {
  code: string;      // 'JP'
  flag: string;      // '🇯🇵'
  nameJa: string;    // '日本'
  nameEn: string;    // 'Japan'
}

/** Convert an ISO 3166-1 alpha-2 country code to its flag emoji */
export function codeToFlag(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

/* ─── All countries grouped by region ─── */

// East Asia
const EAST_ASIA: CountryFlag[] = [
  { code: 'JP', flag: codeToFlag('JP'), nameJa: '日本', nameEn: 'Japan' },
  { code: 'CN', flag: codeToFlag('CN'), nameJa: '中国', nameEn: 'China' },
  { code: 'KR', flag: codeToFlag('KR'), nameJa: '韓国', nameEn: 'South Korea' },
  { code: 'KP', flag: codeToFlag('KP'), nameJa: '北朝鮮', nameEn: 'North Korea' },
  { code: 'MN', flag: codeToFlag('MN'), nameJa: 'モンゴル', nameEn: 'Mongolia' },
  { code: 'TW', flag: codeToFlag('TW'), nameJa: '台湾', nameEn: 'Taiwan' },
  { code: 'HK', flag: codeToFlag('HK'), nameJa: '香港', nameEn: 'Hong Kong' },
  { code: 'MO', flag: codeToFlag('MO'), nameJa: 'マカオ', nameEn: 'Macau' },
];

// Southeast Asia
const SOUTHEAST_ASIA: CountryFlag[] = [
  { code: 'TH', flag: codeToFlag('TH'), nameJa: 'タイ', nameEn: 'Thailand' },
  { code: 'VN', flag: codeToFlag('VN'), nameJa: 'ベトナム', nameEn: 'Vietnam' },
  { code: 'PH', flag: codeToFlag('PH'), nameJa: 'フィリピン', nameEn: 'Philippines' },
  { code: 'ID', flag: codeToFlag('ID'), nameJa: 'インドネシア', nameEn: 'Indonesia' },
  { code: 'MY', flag: codeToFlag('MY'), nameJa: 'マレーシア', nameEn: 'Malaysia' },
  { code: 'SG', flag: codeToFlag('SG'), nameJa: 'シンガポール', nameEn: 'Singapore' },
  { code: 'MM', flag: codeToFlag('MM'), nameJa: 'ミャンマー', nameEn: 'Myanmar' },
  { code: 'KH', flag: codeToFlag('KH'), nameJa: 'カンボジア', nameEn: 'Cambodia' },
  { code: 'LA', flag: codeToFlag('LA'), nameJa: 'ラオス', nameEn: 'Laos' },
  { code: 'BN', flag: codeToFlag('BN'), nameJa: 'ブルネイ', nameEn: 'Brunei' },
  { code: 'TL', flag: codeToFlag('TL'), nameJa: '東ティモール', nameEn: 'Timor-Leste' },
];

// South Asia
const SOUTH_ASIA: CountryFlag[] = [
  { code: 'IN', flag: codeToFlag('IN'), nameJa: 'インド', nameEn: 'India' },
  { code: 'PK', flag: codeToFlag('PK'), nameJa: 'パキスタン', nameEn: 'Pakistan' },
  { code: 'BD', flag: codeToFlag('BD'), nameJa: 'バングラデシュ', nameEn: 'Bangladesh' },
  { code: 'LK', flag: codeToFlag('LK'), nameJa: 'スリランカ', nameEn: 'Sri Lanka' },
  { code: 'NP', flag: codeToFlag('NP'), nameJa: 'ネパール', nameEn: 'Nepal' },
  { code: 'BT', flag: codeToFlag('BT'), nameJa: 'ブータン', nameEn: 'Bhutan' },
  { code: 'MV', flag: codeToFlag('MV'), nameJa: 'モルディブ', nameEn: 'Maldives' },
  { code: 'AF', flag: codeToFlag('AF'), nameJa: 'アフガニスタン', nameEn: 'Afghanistan' },
];

// Central Asia
const CENTRAL_ASIA: CountryFlag[] = [
  { code: 'KZ', flag: codeToFlag('KZ'), nameJa: 'カザフスタン', nameEn: 'Kazakhstan' },
  { code: 'UZ', flag: codeToFlag('UZ'), nameJa: 'ウズベキスタン', nameEn: 'Uzbekistan' },
  { code: 'TM', flag: codeToFlag('TM'), nameJa: 'トルクメニスタン', nameEn: 'Turkmenistan' },
  { code: 'KG', flag: codeToFlag('KG'), nameJa: 'キルギス', nameEn: 'Kyrgyzstan' },
  { code: 'TJ', flag: codeToFlag('TJ'), nameJa: 'タジキスタン', nameEn: 'Tajikistan' },
];

// Middle East / West Asia
const MIDDLE_EAST: CountryFlag[] = [
  { code: 'TR', flag: codeToFlag('TR'), nameJa: 'トルコ', nameEn: 'Turkey' },
  { code: 'SA', flag: codeToFlag('SA'), nameJa: 'サウジアラビア', nameEn: 'Saudi Arabia' },
  { code: 'AE', flag: codeToFlag('AE'), nameJa: 'アラブ首長国連邦', nameEn: 'United Arab Emirates' },
  { code: 'IL', flag: codeToFlag('IL'), nameJa: 'イスラエル', nameEn: 'Israel' },
  { code: 'IR', flag: codeToFlag('IR'), nameJa: 'イラン', nameEn: 'Iran' },
  { code: 'IQ', flag: codeToFlag('IQ'), nameJa: 'イラク', nameEn: 'Iraq' },
  { code: 'SY', flag: codeToFlag('SY'), nameJa: 'シリア', nameEn: 'Syria' },
  { code: 'JO', flag: codeToFlag('JO'), nameJa: 'ヨルダン', nameEn: 'Jordan' },
  { code: 'LB', flag: codeToFlag('LB'), nameJa: 'レバノン', nameEn: 'Lebanon' },
  { code: 'KW', flag: codeToFlag('KW'), nameJa: 'クウェート', nameEn: 'Kuwait' },
  { code: 'QA', flag: codeToFlag('QA'), nameJa: 'カタール', nameEn: 'Qatar' },
  { code: 'BH', flag: codeToFlag('BH'), nameJa: 'バーレーン', nameEn: 'Bahrain' },
  { code: 'OM', flag: codeToFlag('OM'), nameJa: 'オマーン', nameEn: 'Oman' },
  { code: 'YE', flag: codeToFlag('YE'), nameJa: 'イエメン', nameEn: 'Yemen' },
  { code: 'PS', flag: codeToFlag('PS'), nameJa: 'パレスチナ', nameEn: 'Palestine' },
  { code: 'CY', flag: codeToFlag('CY'), nameJa: 'キプロス', nameEn: 'Cyprus' },
  { code: 'GE', flag: codeToFlag('GE'), nameJa: 'ジョージア', nameEn: 'Georgia' },
  { code: 'AM', flag: codeToFlag('AM'), nameJa: 'アルメニア', nameEn: 'Armenia' },
  { code: 'AZ', flag: codeToFlag('AZ'), nameJa: 'アゼルバイジャン', nameEn: 'Azerbaijan' },
];

// Western Europe
const WESTERN_EUROPE: CountryFlag[] = [
  { code: 'GB', flag: codeToFlag('GB'), nameJa: 'イギリス', nameEn: 'United Kingdom' },
  { code: 'FR', flag: codeToFlag('FR'), nameJa: 'フランス', nameEn: 'France' },
  { code: 'DE', flag: codeToFlag('DE'), nameJa: 'ドイツ', nameEn: 'Germany' },
  { code: 'IT', flag: codeToFlag('IT'), nameJa: 'イタリア', nameEn: 'Italy' },
  { code: 'ES', flag: codeToFlag('ES'), nameJa: 'スペイン', nameEn: 'Spain' },
  { code: 'PT', flag: codeToFlag('PT'), nameJa: 'ポルトガル', nameEn: 'Portugal' },
  { code: 'NL', flag: codeToFlag('NL'), nameJa: 'オランダ', nameEn: 'Netherlands' },
  { code: 'BE', flag: codeToFlag('BE'), nameJa: 'ベルギー', nameEn: 'Belgium' },
  { code: 'CH', flag: codeToFlag('CH'), nameJa: 'スイス', nameEn: 'Switzerland' },
  { code: 'AT', flag: codeToFlag('AT'), nameJa: 'オーストリア', nameEn: 'Austria' },
  { code: 'IE', flag: codeToFlag('IE'), nameJa: 'アイルランド', nameEn: 'Ireland' },
  { code: 'LU', flag: codeToFlag('LU'), nameJa: 'ルクセンブルク', nameEn: 'Luxembourg' },
  { code: 'MC', flag: codeToFlag('MC'), nameJa: 'モナコ', nameEn: 'Monaco' },
  { code: 'LI', flag: codeToFlag('LI'), nameJa: 'リヒテンシュタイン', nameEn: 'Liechtenstein' },
  { code: 'AD', flag: codeToFlag('AD'), nameJa: 'アンドラ', nameEn: 'Andorra' },
  { code: 'SM', flag: codeToFlag('SM'), nameJa: 'サンマリノ', nameEn: 'San Marino' },
  { code: 'VA', flag: codeToFlag('VA'), nameJa: 'バチカン', nameEn: 'Vatican City' },
  { code: 'MT', flag: codeToFlag('MT'), nameJa: 'マルタ', nameEn: 'Malta' },
];

// Northern Europe
const NORTHERN_EUROPE: CountryFlag[] = [
  { code: 'SE', flag: codeToFlag('SE'), nameJa: 'スウェーデン', nameEn: 'Sweden' },
  { code: 'NO', flag: codeToFlag('NO'), nameJa: 'ノルウェー', nameEn: 'Norway' },
  { code: 'FI', flag: codeToFlag('FI'), nameJa: 'フィンランド', nameEn: 'Finland' },
  { code: 'DK', flag: codeToFlag('DK'), nameJa: 'デンマーク', nameEn: 'Denmark' },
  { code: 'IS', flag: codeToFlag('IS'), nameJa: 'アイスランド', nameEn: 'Iceland' },
  { code: 'EE', flag: codeToFlag('EE'), nameJa: 'エストニア', nameEn: 'Estonia' },
  { code: 'LV', flag: codeToFlag('LV'), nameJa: 'ラトビア', nameEn: 'Latvia' },
  { code: 'LT', flag: codeToFlag('LT'), nameJa: 'リトアニア', nameEn: 'Lithuania' },
];

// Eastern Europe
const EASTERN_EUROPE: CountryFlag[] = [
  { code: 'RU', flag: codeToFlag('RU'), nameJa: 'ロシア', nameEn: 'Russia' },
  { code: 'UA', flag: codeToFlag('UA'), nameJa: 'ウクライナ', nameEn: 'Ukraine' },
  { code: 'PL', flag: codeToFlag('PL'), nameJa: 'ポーランド', nameEn: 'Poland' },
  { code: 'CZ', flag: codeToFlag('CZ'), nameJa: 'チェコ', nameEn: 'Czech Republic' },
  { code: 'SK', flag: codeToFlag('SK'), nameJa: 'スロバキア', nameEn: 'Slovakia' },
  { code: 'HU', flag: codeToFlag('HU'), nameJa: 'ハンガリー', nameEn: 'Hungary' },
  { code: 'RO', flag: codeToFlag('RO'), nameJa: 'ルーマニア', nameEn: 'Romania' },
  { code: 'BG', flag: codeToFlag('BG'), nameJa: 'ブルガリア', nameEn: 'Bulgaria' },
  { code: 'BY', flag: codeToFlag('BY'), nameJa: 'ベラルーシ', nameEn: 'Belarus' },
  { code: 'MD', flag: codeToFlag('MD'), nameJa: 'モルドバ', nameEn: 'Moldova' },
  { code: 'GR', flag: codeToFlag('GR'), nameJa: 'ギリシャ', nameEn: 'Greece' },
  { code: 'HR', flag: codeToFlag('HR'), nameJa: 'クロアチア', nameEn: 'Croatia' },
  { code: 'RS', flag: codeToFlag('RS'), nameJa: 'セルビア', nameEn: 'Serbia' },
  { code: 'BA', flag: codeToFlag('BA'), nameJa: 'ボスニア・ヘルツェゴビナ', nameEn: 'Bosnia and Herzegovina' },
  { code: 'ME', flag: codeToFlag('ME'), nameJa: 'モンテネグロ', nameEn: 'Montenegro' },
  { code: 'MK', flag: codeToFlag('MK'), nameJa: '北マケドニア', nameEn: 'North Macedonia' },
  { code: 'AL', flag: codeToFlag('AL'), nameJa: 'アルバニア', nameEn: 'Albania' },
  { code: 'SI', flag: codeToFlag('SI'), nameJa: 'スロベニア', nameEn: 'Slovenia' },
  { code: 'XK', flag: codeToFlag('XK'), nameJa: 'コソボ', nameEn: 'Kosovo' },
];

// North America
const NORTH_AMERICA: CountryFlag[] = [
  { code: 'US', flag: codeToFlag('US'), nameJa: 'アメリカ', nameEn: 'United States' },
  { code: 'CA', flag: codeToFlag('CA'), nameJa: 'カナダ', nameEn: 'Canada' },
  { code: 'MX', flag: codeToFlag('MX'), nameJa: 'メキシコ', nameEn: 'Mexico' },
  { code: 'GT', flag: codeToFlag('GT'), nameJa: 'グアテマラ', nameEn: 'Guatemala' },
  { code: 'BZ', flag: codeToFlag('BZ'), nameJa: 'ベリーズ', nameEn: 'Belize' },
  { code: 'HN', flag: codeToFlag('HN'), nameJa: 'ホンジュラス', nameEn: 'Honduras' },
  { code: 'SV', flag: codeToFlag('SV'), nameJa: 'エルサルバドル', nameEn: 'El Salvador' },
  { code: 'NI', flag: codeToFlag('NI'), nameJa: 'ニカラグア', nameEn: 'Nicaragua' },
  { code: 'CR', flag: codeToFlag('CR'), nameJa: 'コスタリカ', nameEn: 'Costa Rica' },
  { code: 'PA', flag: codeToFlag('PA'), nameJa: 'パナマ', nameEn: 'Panama' },
];

// Caribbean
const CARIBBEAN: CountryFlag[] = [
  { code: 'CU', flag: codeToFlag('CU'), nameJa: 'キューバ', nameEn: 'Cuba' },
  { code: 'JM', flag: codeToFlag('JM'), nameJa: 'ジャマイカ', nameEn: 'Jamaica' },
  { code: 'HT', flag: codeToFlag('HT'), nameJa: 'ハイチ', nameEn: 'Haiti' },
  { code: 'DO', flag: codeToFlag('DO'), nameJa: 'ドミニカ共和国', nameEn: 'Dominican Republic' },
  { code: 'TT', flag: codeToFlag('TT'), nameJa: 'トリニダード・トバゴ', nameEn: 'Trinidad and Tobago' },
  { code: 'BB', flag: codeToFlag('BB'), nameJa: 'バルバドス', nameEn: 'Barbados' },
  { code: 'BS', flag: codeToFlag('BS'), nameJa: 'バハマ', nameEn: 'Bahamas' },
  { code: 'AG', flag: codeToFlag('AG'), nameJa: 'アンティグア・バーブーダ', nameEn: 'Antigua and Barbuda' },
  { code: 'DM', flag: codeToFlag('DM'), nameJa: 'ドミニカ国', nameEn: 'Dominica' },
  { code: 'GD', flag: codeToFlag('GD'), nameJa: 'グレナダ', nameEn: 'Grenada' },
  { code: 'KN', flag: codeToFlag('KN'), nameJa: 'セントクリストファー・ネイビス', nameEn: 'Saint Kitts and Nevis' },
  { code: 'LC', flag: codeToFlag('LC'), nameJa: 'セントルシア', nameEn: 'Saint Lucia' },
  { code: 'VC', flag: codeToFlag('VC'), nameJa: 'セントビンセント・グレナディーン', nameEn: 'Saint Vincent and the Grenadines' },
];

// South America
const SOUTH_AMERICA: CountryFlag[] = [
  { code: 'BR', flag: codeToFlag('BR'), nameJa: 'ブラジル', nameEn: 'Brazil' },
  { code: 'AR', flag: codeToFlag('AR'), nameJa: 'アルゼンチン', nameEn: 'Argentina' },
  { code: 'CL', flag: codeToFlag('CL'), nameJa: 'チリ', nameEn: 'Chile' },
  { code: 'CO', flag: codeToFlag('CO'), nameJa: 'コロンビア', nameEn: 'Colombia' },
  { code: 'PE', flag: codeToFlag('PE'), nameJa: 'ペルー', nameEn: 'Peru' },
  { code: 'VE', flag: codeToFlag('VE'), nameJa: 'ベネズエラ', nameEn: 'Venezuela' },
  { code: 'EC', flag: codeToFlag('EC'), nameJa: 'エクアドル', nameEn: 'Ecuador' },
  { code: 'BO', flag: codeToFlag('BO'), nameJa: 'ボリビア', nameEn: 'Bolivia' },
  { code: 'PY', flag: codeToFlag('PY'), nameJa: 'パラグアイ', nameEn: 'Paraguay' },
  { code: 'UY', flag: codeToFlag('UY'), nameJa: 'ウルグアイ', nameEn: 'Uruguay' },
  { code: 'GY', flag: codeToFlag('GY'), nameJa: 'ガイアナ', nameEn: 'Guyana' },
  { code: 'SR', flag: codeToFlag('SR'), nameJa: 'スリナム', nameEn: 'Suriname' },
];

// North Africa
const NORTH_AFRICA: CountryFlag[] = [
  { code: 'EG', flag: codeToFlag('EG'), nameJa: 'エジプト', nameEn: 'Egypt' },
  { code: 'LY', flag: codeToFlag('LY'), nameJa: 'リビア', nameEn: 'Libya' },
  { code: 'TN', flag: codeToFlag('TN'), nameJa: 'チュニジア', nameEn: 'Tunisia' },
  { code: 'DZ', flag: codeToFlag('DZ'), nameJa: 'アルジェリア', nameEn: 'Algeria' },
  { code: 'MA', flag: codeToFlag('MA'), nameJa: 'モロッコ', nameEn: 'Morocco' },
  { code: 'SD', flag: codeToFlag('SD'), nameJa: 'スーダン', nameEn: 'Sudan' },
  { code: 'MR', flag: codeToFlag('MR'), nameJa: 'モーリタニア', nameEn: 'Mauritania' },
];

// West Africa
const WEST_AFRICA: CountryFlag[] = [
  { code: 'NG', flag: codeToFlag('NG'), nameJa: 'ナイジェリア', nameEn: 'Nigeria' },
  { code: 'GH', flag: codeToFlag('GH'), nameJa: 'ガーナ', nameEn: 'Ghana' },
  { code: 'SN', flag: codeToFlag('SN'), nameJa: 'セネガル', nameEn: 'Senegal' },
  { code: 'CI', flag: codeToFlag('CI'), nameJa: 'コートジボワール', nameEn: 'Ivory Coast' },
  { code: 'ML', flag: codeToFlag('ML'), nameJa: 'マリ', nameEn: 'Mali' },
  { code: 'BF', flag: codeToFlag('BF'), nameJa: 'ブルキナファソ', nameEn: 'Burkina Faso' },
  { code: 'NE', flag: codeToFlag('NE'), nameJa: 'ニジェール', nameEn: 'Niger' },
  { code: 'GN', flag: codeToFlag('GN'), nameJa: 'ギニア', nameEn: 'Guinea' },
  { code: 'GW', flag: codeToFlag('GW'), nameJa: 'ギニアビサウ', nameEn: 'Guinea-Bissau' },
  { code: 'SL', flag: codeToFlag('SL'), nameJa: 'シエラレオネ', nameEn: 'Sierra Leone' },
  { code: 'LR', flag: codeToFlag('LR'), nameJa: 'リベリア', nameEn: 'Liberia' },
  { code: 'TG', flag: codeToFlag('TG'), nameJa: 'トーゴ', nameEn: 'Togo' },
  { code: 'BJ', flag: codeToFlag('BJ'), nameJa: 'ベナン', nameEn: 'Benin' },
  { code: 'CV', flag: codeToFlag('CV'), nameJa: 'カーボベルデ', nameEn: 'Cape Verde' },
  { code: 'GM', flag: codeToFlag('GM'), nameJa: 'ガンビア', nameEn: 'Gambia' },
];

// Central Africa
const CENTRAL_AFRICA: CountryFlag[] = [
  { code: 'CD', flag: codeToFlag('CD'), nameJa: 'コンゴ民主共和国', nameEn: 'DR Congo' },
  { code: 'CG', flag: codeToFlag('CG'), nameJa: 'コンゴ共和国', nameEn: 'Republic of the Congo' },
  { code: 'CM', flag: codeToFlag('CM'), nameJa: 'カメルーン', nameEn: 'Cameroon' },
  { code: 'GA', flag: codeToFlag('GA'), nameJa: 'ガボン', nameEn: 'Gabon' },
  { code: 'GQ', flag: codeToFlag('GQ'), nameJa: '赤道ギニア', nameEn: 'Equatorial Guinea' },
  { code: 'CF', flag: codeToFlag('CF'), nameJa: '中央アフリカ', nameEn: 'Central African Republic' },
  { code: 'TD', flag: codeToFlag('TD'), nameJa: 'チャド', nameEn: 'Chad' },
  { code: 'ST', flag: codeToFlag('ST'), nameJa: 'サントメ・プリンシペ', nameEn: 'Sao Tome and Principe' },
];

// East Africa
const EAST_AFRICA: CountryFlag[] = [
  { code: 'KE', flag: codeToFlag('KE'), nameJa: 'ケニア', nameEn: 'Kenya' },
  { code: 'ET', flag: codeToFlag('ET'), nameJa: 'エチオピア', nameEn: 'Ethiopia' },
  { code: 'TZ', flag: codeToFlag('TZ'), nameJa: 'タンザニア', nameEn: 'Tanzania' },
  { code: 'UG', flag: codeToFlag('UG'), nameJa: 'ウガンダ', nameEn: 'Uganda' },
  { code: 'RW', flag: codeToFlag('RW'), nameJa: 'ルワンダ', nameEn: 'Rwanda' },
  { code: 'BI', flag: codeToFlag('BI'), nameJa: 'ブルンジ', nameEn: 'Burundi' },
  { code: 'SO', flag: codeToFlag('SO'), nameJa: 'ソマリア', nameEn: 'Somalia' },
  { code: 'DJ', flag: codeToFlag('DJ'), nameJa: 'ジブチ', nameEn: 'Djibouti' },
  { code: 'ER', flag: codeToFlag('ER'), nameJa: 'エリトリア', nameEn: 'Eritrea' },
  { code: 'SS', flag: codeToFlag('SS'), nameJa: '南スーダン', nameEn: 'South Sudan' },
  { code: 'MG', flag: codeToFlag('MG'), nameJa: 'マダガスカル', nameEn: 'Madagascar' },
  { code: 'MU', flag: codeToFlag('MU'), nameJa: 'モーリシャス', nameEn: 'Mauritius' },
  { code: 'SC', flag: codeToFlag('SC'), nameJa: 'セーシェル', nameEn: 'Seychelles' },
  { code: 'KM', flag: codeToFlag('KM'), nameJa: 'コモロ', nameEn: 'Comoros' },
];

// Southern Africa
const SOUTHERN_AFRICA: CountryFlag[] = [
  { code: 'ZA', flag: codeToFlag('ZA'), nameJa: '南アフリカ', nameEn: 'South Africa' },
  { code: 'AO', flag: codeToFlag('AO'), nameJa: 'アンゴラ', nameEn: 'Angola' },
  { code: 'MZ', flag: codeToFlag('MZ'), nameJa: 'モザンビーク', nameEn: 'Mozambique' },
  { code: 'ZM', flag: codeToFlag('ZM'), nameJa: 'ザンビア', nameEn: 'Zambia' },
  { code: 'ZW', flag: codeToFlag('ZW'), nameJa: 'ジンバブエ', nameEn: 'Zimbabwe' },
  { code: 'MW', flag: codeToFlag('MW'), nameJa: 'マラウイ', nameEn: 'Malawi' },
  { code: 'BW', flag: codeToFlag('BW'), nameJa: 'ボツワナ', nameEn: 'Botswana' },
  { code: 'NA', flag: codeToFlag('NA'), nameJa: 'ナミビア', nameEn: 'Namibia' },
  { code: 'SZ', flag: codeToFlag('SZ'), nameJa: 'エスワティニ', nameEn: 'Eswatini' },
  { code: 'LS', flag: codeToFlag('LS'), nameJa: 'レソト', nameEn: 'Lesotho' },
];

// Oceania
const OCEANIA: CountryFlag[] = [
  { code: 'AU', flag: codeToFlag('AU'), nameJa: 'オーストラリア', nameEn: 'Australia' },
  { code: 'NZ', flag: codeToFlag('NZ'), nameJa: 'ニュージーランド', nameEn: 'New Zealand' },
  { code: 'PG', flag: codeToFlag('PG'), nameJa: 'パプアニューギニア', nameEn: 'Papua New Guinea' },
  { code: 'FJ', flag: codeToFlag('FJ'), nameJa: 'フィジー', nameEn: 'Fiji' },
  { code: 'SB', flag: codeToFlag('SB'), nameJa: 'ソロモン諸島', nameEn: 'Solomon Islands' },
  { code: 'VU', flag: codeToFlag('VU'), nameJa: 'バヌアツ', nameEn: 'Vanuatu' },
  { code: 'WS', flag: codeToFlag('WS'), nameJa: 'サモア', nameEn: 'Samoa' },
  { code: 'KI', flag: codeToFlag('KI'), nameJa: 'キリバス', nameEn: 'Kiribati' },
  { code: 'TO', flag: codeToFlag('TO'), nameJa: 'トンガ', nameEn: 'Tonga' },
  { code: 'FM', flag: codeToFlag('FM'), nameJa: 'ミクロネシア', nameEn: 'Micronesia' },
  { code: 'MH', flag: codeToFlag('MH'), nameJa: 'マーシャル諸島', nameEn: 'Marshall Islands' },
  { code: 'PW', flag: codeToFlag('PW'), nameJa: 'パラオ', nameEn: 'Palau' },
  { code: 'NR', flag: codeToFlag('NR'), nameJa: 'ナウル', nameEn: 'Nauru' },
  { code: 'TV', flag: codeToFlag('TV'), nameJa: 'ツバル', nameEn: 'Tuvalu' },
];

/** All countries, grouped by region, Japan first */
export const COUNTRY_FLAGS: CountryFlag[] = [
  ...EAST_ASIA,
  ...SOUTHEAST_ASIA,
  ...SOUTH_ASIA,
  ...CENTRAL_ASIA,
  ...MIDDLE_EAST,
  ...WESTERN_EUROPE,
  ...NORTHERN_EUROPE,
  ...EASTERN_EUROPE,
  ...NORTH_AMERICA,
  ...CARIBBEAN,
  ...SOUTH_AMERICA,
  ...NORTH_AFRICA,
  ...WEST_AFRICA,
  ...CENTRAL_AFRICA,
  ...EAST_AFRICA,
  ...SOUTHERN_AFRICA,
  ...OCEANIA,
];

/** Find a CountryFlag entry by code, or return undefined */
export function findByCode(code: string): CountryFlag | undefined {
  return COUNTRY_FLAGS.find((f) => f.code === code.toUpperCase());
}
