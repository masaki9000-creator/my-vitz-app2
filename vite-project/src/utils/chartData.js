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
