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
  sheetWidth: number;
  sheetHeight: number;
  labelWidth: number;
  labelHeight: number;
  columns: number;
  rows: number;
  marginTop: number;
  marginLeft: number;
  gapX: number;
  gapY: number;
}

export interface LabelSize {
  id: string;
  name: string;
  description: string;
  paperType: "A4" | "Letter" | "Thermal" | "Roll";
  labelsPerSheet: number;
  labelSize: string;
  recommended: boolean;
  useCase: string;
}

export interface GenerateLabelsRequest {
  products: LabelProduct[];
  labelConfig: LabelConfig;
  paperSize: string;
}
