export function getReportCopy(locale: string) {
  if (locale === 'ar') {
    return {
      range: (from: string, to: string) => `التقارير محسوبة حسب توقيت بغداد من ${from} إلى ${to}`,
      costOfGoods: 'تكلفة البضاعة المباعة',
      grossProfit: 'إجمالي الربح',
      averageOrder: 'متوسط قيمة الطلب',
      cash: 'نقداً',
      card: 'بطاقة',
      mobileWallet: 'محفظة إلكترونية',
      productRevenue: 'إيراد المنتج',
      unitsSold: (count: string) => `${count} وحدة`,
      closed: 'مغلق',
    }
  }

  return {
    range: (from: string, to: string) => `Reports use Baghdad time from ${from} to ${to}`,
    costOfGoods: 'Cost of goods sold',
    grossProfit: 'Gross profit',
    averageOrder: 'Average order value',
    cash: 'Cash',
    card: 'Card',
    mobileWallet: 'Mobile wallet',
    productRevenue: 'Product revenue',
    unitsSold: (count: string) => `${count} units`,
    closed: 'Closed',
  }
}
