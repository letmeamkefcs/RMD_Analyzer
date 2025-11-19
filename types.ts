export interface ColorCategory {
  name: string;
  id: string;
  color: string; // CSS color for display
  count: number;
  percentage: number;
}

export interface AnalysisResult {
  totalPixels: number;
  processedPixels: number; // Pixels inside the boundary (excluding background/border)
  excludedPixels: number;
  categories: ColorCategory[];
  width: number;
  height: number;
}

export interface AnalysisConfig {
  backgroundHex: string;
  strictColors: Record<string, string>; // hex -> name
}
