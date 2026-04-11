export interface CountryFlag {
  code: string;      // 'JP'
  flag: string;      // '🇯🇵'
  nameJa: string;    // '日本'
  nameEn: string;    // 'Japan'
}

export const COUNTRY_FLAGS: CountryFlag[] = [
  { code: 'JP', flag: '🇯🇵', nameJa: '日本', nameEn: 'Japan' },
  { code: 'US', flag: '🇺🇸', nameJa: 'アメリカ', nameEn: 'United States' },
  { code: 'GB', flag: '🇬🇧', nameJa: 'イギリス', nameEn: 'United Kingdom' },
  { code: 'KR', flag: '🇰🇷', nameJa: '韓国', nameEn: 'South Korea' },
  { code: 'CN', flag: '🇨🇳', nameJa: '中国', nameEn: 'China' },
  { code: 'TW', flag: '🇹🇼', nameJa: '台湾', nameEn: 'Taiwan' },
  { code: 'DE', flag: '🇩🇪', nameJa: 'ドイツ', nameEn: 'Germany' },
  { code: 'FR', flag: '🇫🇷', nameJa: 'フランス', nameEn: 'France' },
  { code: 'IT', flag: '🇮🇹', nameJa: 'イタリア', nameEn: 'Italy' },
  { code: 'ES', flag: '🇪🇸', nameJa: 'スペイン', nameEn: 'Spain' },
  { code: 'PT', flag: '🇵🇹', nameJa: 'ポルトガル', nameEn: 'Portugal' },
  { code: 'BR', flag: '🇧🇷', nameJa: 'ブラジル', nameEn: 'Brazil' },
  { code: 'MX', flag: '🇲🇽', nameJa: 'メキシコ', nameEn: 'Mexico' },
  { code: 'AR', flag: '🇦🇷', nameJa: 'アルゼンチン', nameEn: 'Argentina' },
  { code: 'CA', flag: '🇨🇦', nameJa: 'カナダ', nameEn: 'Canada' },
  { code: 'AU', flag: '🇦🇺', nameJa: 'オーストラリア', nameEn: 'Australia' },
  { code: 'NZ', flag: '🇳🇿', nameJa: 'ニュージーランド', nameEn: 'New Zealand' },
  { code: 'RU', flag: '🇷🇺', nameJa: 'ロシア', nameEn: 'Russia' },
  { code: 'IN', flag: '🇮🇳', nameJa: 'インド', nameEn: 'India' },
  { code: 'TH', flag: '🇹🇭', nameJa: 'タイ', nameEn: 'Thailand' },
  { code: 'VN', flag: '🇻🇳', nameJa: 'ベトナム', nameEn: 'Vietnam' },
  { code: 'PH', flag: '🇵🇭', nameJa: 'フィリピン', nameEn: 'Philippines' },
  { code: 'ID', flag: '🇮🇩', nameJa: 'インドネシア', nameEn: 'Indonesia' },
  { code: 'MY', flag: '🇲🇾', nameJa: 'マレーシア', nameEn: 'Malaysia' },
  { code: 'SG', flag: '🇸🇬', nameJa: 'シンガポール', nameEn: 'Singapore' },
  { code: 'TR', flag: '🇹🇷', nameJa: 'トルコ', nameEn: 'Turkey' },
  { code: 'SA', flag: '🇸🇦', nameJa: 'サウジアラビア', nameEn: 'Saudi Arabia' },
  { code: 'AE', flag: '🇦🇪', nameJa: 'アラブ首長国連邦', nameEn: 'United Arab Emirates' },
  { code: 'EG', flag: '🇪🇬', nameJa: 'エジプト', nameEn: 'Egypt' },
  { code: 'ZA', flag: '🇿🇦', nameJa: '南アフリカ', nameEn: 'South Africa' },
  { code: 'NG', flag: '🇳🇬', nameJa: 'ナイジェリア', nameEn: 'Nigeria' },
  { code: 'KE', flag: '🇰🇪', nameJa: 'ケニア', nameEn: 'Kenya' },
  { code: 'SE', flag: '🇸🇪', nameJa: 'スウェーデン', nameEn: 'Sweden' },
  { code: 'NO', flag: '🇳🇴', nameJa: 'ノルウェー', nameEn: 'Norway' },
  { code: 'FI', flag: '🇫🇮', nameJa: 'フィンランド', nameEn: 'Finland' },
  { code: 'DK', flag: '🇩🇰', nameJa: 'デンマーク', nameEn: 'Denmark' },
  { code: 'NL', flag: '🇳🇱', nameJa: 'オランダ', nameEn: 'Netherlands' },
  { code: 'BE', flag: '🇧🇪', nameJa: 'ベルギー', nameEn: 'Belgium' },
  { code: 'CH', flag: '🇨🇭', nameJa: 'スイス', nameEn: 'Switzerland' },
  { code: 'AT', flag: '🇦🇹', nameJa: 'オーストリア', nameEn: 'Austria' },
  { code: 'PL', flag: '🇵🇱', nameJa: 'ポーランド', nameEn: 'Poland' },
  { code: 'CZ', flag: '🇨🇿', nameJa: 'チェコ', nameEn: 'Czech Republic' },
  { code: 'GR', flag: '🇬🇷', nameJa: 'ギリシャ', nameEn: 'Greece' },
  { code: 'IL', flag: '🇮🇱', nameJa: 'イスラエル', nameEn: 'Israel' },
  { code: 'PK', flag: '🇵🇰', nameJa: 'パキスタン', nameEn: 'Pakistan' },
  { code: 'BD', flag: '🇧🇩', nameJa: 'バングラデシュ', nameEn: 'Bangladesh' },
  { code: 'CL', flag: '🇨🇱', nameJa: 'チリ', nameEn: 'Chile' },
  { code: 'CO', flag: '🇨🇴', nameJa: 'コロンビア', nameEn: 'Colombia' },
  { code: 'PE', flag: '🇵🇪', nameJa: 'ペルー', nameEn: 'Peru' },
  { code: 'UA', flag: '🇺🇦', nameJa: 'ウクライナ', nameEn: 'Ukraine' },
];

/** Convert an ISO 3166-1 alpha-2 country code to its flag emoji */
export function codeToFlag(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

/** Find a CountryFlag entry by code, or return undefined */
export function findByCode(code: string): CountryFlag | undefined {
  return COUNTRY_FLAGS.find((f) => f.code === code.toUpperCase());
}
