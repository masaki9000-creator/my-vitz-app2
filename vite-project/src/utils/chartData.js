// Math helper: find x offset (p in [-1, 1]) such that left spherical cap area = targetRatio
export const getCutoffP = (targetRatio) => {
  if (targetRatio <= 0) return -1;
  if (targetRatio >= 1) return 1;
  let low = -1, high = 1, mid;
  for (let i = 0; i < 20; i++) {
    mid = (low + high) / 2;
    const currentRatio = (Math.asin(mid) + mid * Math.sqrt(1 - mid * mid) + Math.PI / 2) / Math.PI;
    if (currentRatio < targetRatio) low = mid; else high = mid;
  }
  return mid;
};

export const overseasData = {
  '武田薬品工業': 0.909,
  'アステラス製薬': 0.86,
  '大塚HD': 0.70,
  '第一三共': 0.69,
  '中外製薬': 0.604
};

export const companyShortNames = {
  'アステラス製薬': 'Astellas',
  '武田薬品工業': 'Takeda',
  '大塚HD': 'Otsuka',
  '第一三共': 'Daiichi Sankyo',
  '中外製薬': 'Chugai'
};

export const oncologyData = {
  '武田薬品工業': 0.11,
  'アステラス製薬': 0.57,
  '大塚HD': 0.10,
  '第一三共': 0.49,
  '中外製薬': 0.27
};

export const rdData = {
  '武田薬品工業': 0.159,
  'アステラス製薬': 0.171,
  '大塚HD': 0.135,
  '第一三共': 0.229,
  '中外製薬': 0.155
};

export const TOP5 = ['武田薬品工業', '大塚HD', 'アステラス製薬', '第一三共', '中外製薬'];

export const companyEnglishNames = {
  '武田薬品工業': 'Takeda Pharmaceutical',
  '大塚HD': 'Otsuka Holdings',
  'アステラス製薬': 'Astellas Pharma',
  '第一三共': 'Daiichi Sankyo',
  '中外製薬': 'Chugai Pharmaceutical',
  'エーザイ': 'Eisai',
  '協和キリン': 'Kyowa Kirin',
  '小野薬品工業': 'Ono Pharmaceutical',
  '三菱ケミカルG(医薬品)': 'Mitsubishi Chemical Group',
  '塩野義製薬': 'Shionogi',
  '住友ファーマ': 'Sumitomo Pharma',
  '参天製薬': 'Santen Pharmaceutical',
  '東和薬品': 'Towa Pharmaceutical',
  '旭化成(医薬・医療)': 'Asahi Kasei',
  '明治HD(医薬品)': 'Meiji Holdings',
  'サワイグループHD': 'Sawai Group Holdings',
  'ツムラ': 'Tsumura',
  '日本新薬': 'Nippon Shinyaku',
  '久光製薬': 'Hisamitsu Pharmaceutical',
  '帝人(ヘルスケア)': 'Teijin',
  '杏林製薬': 'Kyorin Pharmaceutical',
  '持田製薬': 'Mochida Pharmaceutical',
  '日本たばこ産業(医薬)': 'Japan Tobacco',
  '科研製薬': 'Kaken Pharmaceutical',
  'キッセイ薬品工業': 'Kissei Pharmaceutical',
  'ゼリア新薬工業': 'Zeria Pharmaceutical',
  '日本化薬(ライフサイエンス)': 'Nippon Kayaku',
  'あすか製薬HD': 'Aska Pharmaceutical Holdings',
  '扶桑薬品工業': 'Fuso Pharmaceutical Industries',
  '鳥居薬品': 'Torii Pharmaceutical',
  'アルフレッサHD(医薬品等製造)': 'Alfresa Holdings',
  'スズケン(ヘルスケア製品開発)': 'Suzuken',
  'ペプチドリーム': 'PeptiDream',
  '富士製薬工業': 'Fuji Pharma',
  '日本調剤(医薬品製造販売)': 'Nihon Chouzai',
  '生化学工業': 'Seikagaku Corporation',
  'JCRファーマ': 'JCR Pharmaceuticals',
  'ネクセラファーマ': 'Nxera Pharma',
  '東邦HD(医薬品製造販売)': 'Toho Holdings'
};
