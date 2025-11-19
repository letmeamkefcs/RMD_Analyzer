import { AnalysisResult, ColorCategory } from '../types';

// Helper to parse hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// RGB to HSV conversion
// H: 0-360, S: 0-1, V: 0-1
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, v };
}

export const analyzeImagePixelData = (
  imageData: ImageData
): AnalysisResult => {
  const { width, height, data } = imageData;
  const totalPixels = width * height;
  let excludedPixels = 0;

  // Counters
  let countWarm = 0; // Red, Orange, Yellow
  let countDarkGreen = 0; // #009245
  let countBlue = 0; // #0000ff
  let countNeonGreen = 0; // #00ff00
  let countGrey = 0; // #4d4d4d
  let countOther = 0;

  // Specific Color Targets (pre-calculated for performance)
  // Using exact integer matching as requested ("không xấp xỉ")
  // #009245 -> R:0, G:146, B:69
  // #0000ff -> R:0, G:0, B:255
  // #00ff00 -> R:0, G:255, B:0
  // #4d4d4d -> R:77, G:77, B:77

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Alpha data[i+3] is ignored assuming opaque image, or we can skip transparent
    if (data[i+3] < 255) {
       // If it's transparent, treat as background/excluded
       excludedPixels++;
       continue;
    }

    // 1. Exclusion Logic
    // Condition A: Background #FF00FF (Magenta) -> R:255, G:0, B:255
    const isMagenta = r === 255 && g === 0 && b === 255;
    
    // Condition B: "Purple/Pink borders" -> r > 150 & b > 150 & g < 60
    const isBorder = r > 150 && b > 150 && g < 60;

    if (isMagenta || isBorder) {
      excludedPixels++;
      continue;
    }

    // 2. Categorization Logic
    
    // Check Strict Colors first (fastest)
    // Dark Green #009245 (0, 146, 69)
    if (r === 0 && g === 146 && b === 69) {
      countDarkGreen++;
      continue;
    }
    // Blue #0000ff (0, 0, 255)
    if (r === 0 && g === 0 && b === 255) {
      countBlue++;
      continue;
    }
    // Neon Green #00ff00 (0, 255, 0)
    if (r === 0 && g === 255 && b === 0) {
      countNeonGreen++;
      continue;
    }
    // Grey #4d4d4d (77, 77, 77)
    if (r === 77 && g === 77 && b === 77) {
      countGrey++;
      continue;
    }

    // Check Warm Colors (HSV Thresholds)
    // Hue: 0 -> 75, S >= 0.55, V >= 0.35
    const { h, s, v } = rgbToHsv(r, g, b);
    
    // Hue wraps around 360, but here we are looking for 0-75 specifically for Red->Orange->Yellow
    // Note: Red is typically around 0 or 360. The prompt says 0->75.
    if (h >= 0 && h <= 75 && s >= 0.55 && v >= 0.35) {
      countWarm++;
      continue;
    }

    // If none match
    countOther++;
  }

  const processedPixels = totalPixels - excludedPixels;
  
  // Avoid division by zero
  const safeTotal = processedPixels === 0 ? 1 : processedPixels;

  const categories: ColorCategory[] = [
    {
      id: 'warm',
      name: 'Warm (Red/Orange/Yellow)',
      color: '#ed1c24', // Representative color
      count: countWarm,
      percentage: (countWarm / safeTotal) * 100
    },
    {
      id: 'dark_green',
      name: 'Dark Green (#009245)',
      color: '#009245',
      count: countDarkGreen,
      percentage: (countDarkGreen / safeTotal) * 100
    },
    {
      id: 'blue',
      name: 'Blue (#0000ff)',
      color: '#0000ff',
      count: countBlue,
      percentage: (countBlue / safeTotal) * 100
    },
    {
      id: 'neon_green',
      name: 'Neon Green (#00ff00)',
      color: '#00ff00',
      count: countNeonGreen,
      percentage: (countNeonGreen / safeTotal) * 100
    },
    {
      id: 'grey',
      name: 'Grey (#4d4d4d)',
      color: '#4d4d4d',
      count: countGrey,
      percentage: (countGrey / safeTotal) * 100
    },
    {
      id: 'other',
      name: 'Other / Unclassified',
      color: '#9CA3AF',
      count: countOther,
      percentage: (countOther / safeTotal) * 100
    }
  ];

  return {
    totalPixels,
    processedPixels,
    excludedPixels,
    categories,
    width,
    height
  };
};
