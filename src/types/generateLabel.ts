export interface LabelProduct {
  productId: string;
  productPriceId: string;
  quantity: number;
}

export interface LabelConfig {
  showProductName: boolean;
  showPrice: boolean;
  showPromotionalPrice: boolean;
  showBusinessName: boolean;
  showBrand: boolean;
  productNameSize: number;
  priceSize: number;
  promotionalPriceSize: number;
  businessNameSize: number;
  brandSize: number;
}

export interface PaperConfig {
  labelsPerSheet: number;
  sheetWidth: number;  // بالـ mm
  sheetHeight: number; // بالـ mm
  labelWidth: number;  // بالـ mm
  labelHeight: number; // بالـ mm
  columns: number;
  rows: number;
  marginTop: number;
  marginLeft: number;
  gapX: number;
  gapY: number;
}

export interface GenerateLabelsRequest {
  products: LabelProduct[];
  labelConfig: LabelConfig;
  paperSize: string; // مثل "20_per_sheet_8.5x11"
}