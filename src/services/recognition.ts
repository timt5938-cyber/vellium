import { supabase } from './supabase';

export interface FoodEstimate {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  confidence: number;
  assumptions: string;
}

export interface RecognitionResult {
  items: FoodEstimate[];
  note: string;
}

async function compressPhoto(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Выберите JPEG, PNG или WebP.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    if (!canvas.width || !canvas.height || canvas.width * canvas.height > 16_000_000) {
      throw new Error('Слишком большое изображение.');
    }
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Браузер не смог обработать фото.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', .82));
    if (!blob || blob.size > 5_000_000) throw new Error('Не удалось сжать фото до 5 МБ.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function callApi(path: string, body: BodyInit, contentType?: string): Promise<RecognitionResult> {
  if (!supabase) throw new Error('Supabase не настроен.');
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('Войдите в аккаунт.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        ...(contentType ? { 'Content-Type': contentType } : {}),
      },
      body,
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.detail || 'Распознавание недоступно. Попробуйте ручной ввод.');
    if (!Array.isArray(result?.items)) throw new Error('Сервис вернул неполный результат.');
    return result as RecognitionResult;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Распознавание заняло слишком много времени. Попробуйте ещё раз.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function recognizePhoto(file: File, description = '', productHint = '') {
  const body = new FormData();
  body.append('file', await compressPhoto(file), 'meal.jpg');
  if (description) body.append('description', description.slice(0, 500));
  if (productHint) body.append('product_hint', productHint.slice(0, 1200));
  return callApi('/api/recognize/photo', body);
}

export async function recognizeText(text: string, productHint = '') {
  return callApi('/api/recognize/text', JSON.stringify({ text, product_hint: productHint.slice(0, 1200) }), 'application/json');
}

export async function recognizeAudio(audio: Blob) {
  if (audio.size > 5_000_000) throw new Error('Запись больше 5 МБ. Запишите короткое описание.');
  const body = new FormData();
  body.append('file', audio, audio.type.includes('mp4') ? 'meal.m4a' : 'meal.webm');
  return callApi('/api/recognize/audio', body);
}
