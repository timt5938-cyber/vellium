import { supabase } from './supabase';

export interface Product {
  barcode: string;
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  source_url: string;
}

type DetectorType = {
  new(options: { formats: string[] }): { detect(image: ImageBitmap): Promise<{ rawValue: string }[]> };
  getSupportedFormats(): Promise<string[]>;
};

export async function scanBarcodes(file: File): Promise<string[]> {
  const Detector = (window as unknown as { BarcodeDetector?: DetectorType }).BarcodeDetector;
  if (!Detector) throw new Error('В этом браузере сканирование недоступно. Введите цифры с упаковки.');
  if (file.size > 10_000_000) throw new Error('Выберите фото упаковки до 10 МБ.');
  const supported = await Detector.getSupportedFormats();
  const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'data_matrix']
    .filter((format) => supported.includes(format));
  if (!formats.length) throw new Error('Браузер не распознаёт товарные штрихкоды. Введите код вручную.');
  const image = await createImageBitmap(file);
  try {
    if (image.width * image.height > 16_000_000) throw new Error('Слишком большое фото упаковки.');
    const found = await new Detector({ formats }).detect(image);
    if (!found.length) throw new Error('Код на фото не найден. Попробуйте приблизить его или введите вручную.');
    return [...new Set(found.map((item) => item.rawValue.trim()).filter(Boolean))].slice(0, 8);
  } finally {
    image.close();
  }
}

export async function lookupProduct(barcode: string): Promise<Product> {
  if (!supabase) throw new Error('Supabase не настроен.');
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('Войдите в аккаунт.');
  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/products/${encodeURIComponent(barcode.trim())}`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.detail || 'Не удалось найти продукт. Введите данные вручную.');
  return result as Product;
}
