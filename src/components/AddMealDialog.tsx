import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, Mic, PenLine, ScanLine, Square, Type, X } from 'lucide-react';
import { mealLabels, nutritionForGrams } from '../lib/nutrition';
import type { Meal, MealType, Nutrition } from '../lib/nutrition';
import { recognizeAudio, recognizePhoto, recognizeText } from '../services/recognition';
import type { RecognitionResult } from '../services/recognition';
import { lookupProduct, scanBarcodes } from '../services/products';
import type { Product } from '../services/products';

type Mode = 'manual' | 'photo' | 'text' | 'voice' | 'scan' | 'review' | 'plate-review';
type FoodDraft = { name: string; grams: string; kcal: string; protein: string; fat: string; carbs: string; type: MealType };
const emptyFood: FoodDraft = { name: '', grams: '150', kcal: '', protein: '', fat: '', carbs: '', type: 'lunch' };
const round = (value: number) => String(Math.round(value * 10) / 10);

export default function AddMealDialog({ date, onClose, onSave, onSaveMany }: {
  date: string;
  onClose: () => void;
  onSave: (meal: Meal) => Promise<void>;
  onSaveMany: (meals: Meal[]) => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>('manual');
  const [food, setFood] = useState<FoodDraft>(emptyFood);
  const [file, setFile] = useState<File | null>(null);
  const [plateFile, setPlateFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [barcode, setBarcode] = useState('');
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [catalogProduct, setCatalogProduct] = useState<Product | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const stopTimer = useRef<number | null>(null);
  const [estimate, setEstimate] = useState<RecognitionResult | null>(null);
  const [plateItems, setPlateItems] = useState<FoodDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    if (stopTimer.current) window.clearTimeout(stopTimer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function startRecording() {
    setError('');
    setAudio(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error('Браузер не поддерживает запись. Используйте текстовый ввод.');
      }
      const captured = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = captured;
      const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error('Этот формат записи не поддерживается. Используйте текстовый ввод.');
      const media = new MediaRecorder(captured, { mimeType: mime });
      recorder.current = media;
      const chunks: BlobPart[] = [];
      media.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      media.onstop = () => {
        if (stopTimer.current) window.clearTimeout(stopTimer.current);
        captured.getTracks().forEach((track) => track.stop());
        const result = new Blob(chunks, { type: mime });
        setAudio(result.size >= 100 ? result : null);
        setRecording(false);
      };
      media.start(1000);
      setRecording(true);
      stopTimer.current = window.setTimeout(() => media.state === 'recording' && media.stop(), 30_000);
    } catch (cause) {
      stream.current?.getTracks().forEach((track) => track.stop());
      setError(cause instanceof Error ? cause.message : 'Не удалось включить микрофон.');
    }
  }

  async function runRecognition(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'photo' && !file) throw new Error('Сначала выберите фото.');
      if (mode === 'text' && description.trim().length < 3) throw new Error('Опишите, что вы съели.');
      if (mode === 'voice' && !audio) throw new Error('Сначала запишите описание еды.');
      const result = mode === 'photo' ? await recognizePhoto(file!)
        : mode === 'voice' ? await recognizeAudio(audio!)
          : await recognizeText(description.trim());
      const grams = result.items.reduce((total, item) => total + item.grams, 0);
      if (!grams || grams > 3000) throw new Error('Проверьте размер порции вручную.');
      const total = (key: keyof Nutrition) => result.items.reduce((sum, item) => sum + item[key], 0);
      setFood({
        ...food,
        name: result.items.map((item) => item.name).join(' + ').slice(0, 160),
        grams: round(grams),
        kcal: round(total('kcal') * 100 / grams),
        protein: round(total('protein') * 100 / grams),
        fat: round(total('fat') * 100 / grams),
        carbs: round(total('carbs') * 100 / grams),
      });
      setEstimate(result);
      setCatalogProduct(null);
      setMode('review');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось распознать еду.');
    } finally {
      setBusy(false);
    }
  }

  async function scanFiles(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setError('');
    try {
      let codes = [...scannedCodes];
      const failures: string[] = [];
      for (const file of files) {
        try {
          const found = await scanBarcodes(file);
          if (!found.length) throw new Error('Код не найден');
          const next = [...new Set([...codes, ...found])];
          if (new Set([...next, barcode.trim()].filter(Boolean)).size > 8) {
            throw new Error('Можно добавить до 8 разных кодов за раз.');
          }
          codes = next;
        } catch (cause) {
          failures.push(cause instanceof Error ? cause.message : 'Код не прочитан');
        }
      }
      setScannedCodes(codes);
      if (failures.length) setError(`Не удалось прочитать ${failures.length} фото: ${failures[0]}. Уже считанные коды сохранены.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось прочитать один из кодов.');
    } finally {
      setBusy(false);
    }
  }

  async function runCombinedRecognition(codesOnly = false) {
    setBusy(true);
    setError('');
    try {
      const details = codesOnly ? '' : description.trim();
      const photo = codesOnly ? null : plateFile;
      const codes = [...new Set([...scannedCodes, barcode.trim()].filter(Boolean))];
      if (codes.length > 8) throw new Error('Можно добавить до 8 разных кодов за раз.');
      if (!photo && !codes.length && details.length < 3) {
        throw new Error('Добавьте фото блюда, код продукта или описание еды.');
      }
      const products = await Promise.all(codes.map((code) => lookupProduct(code)));
      const productHint = products.map((product, index) =>
        `${index + 1}. ${product.name.slice(0, 70)}; на 100 г: ${product.kcal} ккал, Б ${product.protein} г, Ж ${product.fat} г, У ${product.carbs} г.`
      ).join(' | ');
      const result = photo
        ? await recognizePhoto(photo, details, productHint)
        : details.length >= 3
          ? await recognizeText(details, productHint)
          : { items: products.map((product) => ({ name: product.name, grams: 100, kcal: product.kcal,
            protein: product.protein, fat: product.fat, carbs: product.carbs,
            confidence: 1, assumptions: 'Порцию 100 г измените по фактическому весу.' })),
            note: 'Данные каталога сверьте с этикеткой.' };
      if (!result.items.length) throw new Error('Еда не найдена. Уточните описание или проверьте фото.');
      const gramsTotal = result.items.reduce((sum, item) => sum + item.grams, 0);
      if (!gramsTotal || gramsTotal > 3000) throw new Error('Проверьте размер порции вручную.');
      const items = result.items.map((item) => ({
        name: item.name.slice(0, 160), grams: round(item.grams),
        kcal: item.grams > 0 ? round(item.kcal * 100 / item.grams) : '',
        protein: item.grams > 0 ? round(item.protein * 100 / item.grams) : '',
        fat: item.grams > 0 ? round(item.fat * 100 / item.grams) : '',
        carbs: item.grams > 0 ? round(item.carbs * 100 / item.grams) : '',
        type: food.type,
      }));
      setPlateItems(items);
      setEstimate(result);
      setCatalogProducts(products);
      setMode('plate-review');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось распознать тарелку.');
    } finally {
      setBusy(false);
    }
  }

  async function savePlate(event: React.FormEvent) {
    event.preventDefault();
    const gramsTotal = plateItems.reduce((sum, item) => sum + Number(item.grams), 0);
    if (!plateItems.length || !Number.isFinite(gramsTotal) || gramsTotal > 3000) {
      setError('Проверьте список продуктов и общий вес порции до 3000 г.'); return;
    }
    const eatenAt = new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
    const meals: Meal[] = [];
    for (const item of plateItems) {
      const grams = Number(item.grams);
      const per100 = { kcal: Number(item.kcal), protein: Number(item.protein), fat: Number(item.fat), carbs: Number(item.carbs) };
      if (!item.name.trim() || !Number.isFinite(grams) || grams <= 0 ||
        Object.values(per100).some((value) => !Number.isFinite(value) || value < 0 || value > 1000) ||
        per100.protein + per100.fat + per100.carbs > 110) {
        setError('Проверьте название, вес и БЖУ каждого продукта.'); return;
      }
      meals.push({ id: crypto.randomUUID(), name: item.name.trim(), grams, type: item.type,
        eatenAt, ...nutritionForGrams(per100, grams) });
    }
    setBusy(true);
    setError('');
    try { await onSaveMany(meals); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось сохранить продукты.'); }
    finally { setBusy(false); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const grams = Number(food.grams);
    const per100: Nutrition = {
      kcal: Number(food.kcal), protein: Number(food.protein),
      fat: Number(food.fat), carbs: Number(food.carbs),
    };
    if (!food.name.trim() || !Number.isFinite(grams) || grams <= 0 || grams > 3000 ||
      Object.values(per100).some((n) => !Number.isFinite(n) || n < 0 || n > 1000)) {
      setError('Проверьте название, порцию и значения на 100 г.');
      return;
    }
    const macroKcal = per100.protein * 4 + per100.fat * 9 + per100.carbs * 4;
    if (per100.protein + per100.fat + per100.carbs > 110 ||
      (per100.kcal > 0 && Math.abs(per100.kcal - macroKcal) > Math.max(100, per100.kcal * .55))) {
      setError('Калории и БЖУ сильно расходятся. Проверьте значения на 100 г.');
      return;
    }
    const meal: Meal = {
      id: crypto.randomUUID(), name: food.name.trim(), grams, type: food.type,
      eatenAt: new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`).toISOString(),
      ...nutritionForGrams(per100, grams),
    };
    setBusy(true);
    setError('');
    try {
      await onSave(meal);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить запись.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="meal-modal" role="dialog" aria-modal="true" aria-labelledby="add-title">
      <div className="modal-head"><div><span className="section-kicker">НОВАЯ ЗАПИСЬ</span><h2 id="add-title">Добавить еду</h2></div><button aria-label="Закрыть" onClick={onClose}><X size={22}/></button></div>
      {mode !== 'review' && mode !== 'plate-review' && <div className="entry-modes" role="tablist" aria-label="Способ добавления">
        <button type="button" role="tab" disabled={recording} aria-selected={mode === 'manual'} className={mode === 'manual' ? 'active' : ''} onClick={() => { setMode('manual'); setError(''); }}><PenLine size={16}/> Вручную</button>
        <button type="button" role="tab" disabled={recording} aria-selected={mode === 'photo'} className={mode === 'photo' ? 'active' : ''} onClick={() => { setMode('photo'); setError(''); }}><Camera size={16}/> Фото</button>
        <button type="button" role="tab" disabled={recording} aria-selected={mode === 'text'} className={mode === 'text' ? 'active' : ''} onClick={() => { setMode('text'); setError(''); }}><Type size={16}/> Текст</button>
        <button type="button" role="tab" aria-selected={mode === 'voice'} className={mode === 'voice' ? 'active' : ''} onClick={() => { setMode('voice'); setError(''); }}><Mic size={16}/> Голос</button>
        <button type="button" role="tab" disabled={recording} aria-selected={mode === 'scan'} className={mode === 'scan' ? 'active' : ''} onClick={() => { setMode('scan'); setError(''); }}><ScanLine size={16}/> Вместе</button>
      </div>}

      {mode === 'scan' && <form className="recognition-form" onSubmit={(event) => { event.preventDefault(); void runCombinedRecognition(); }}>
        <div className="scan-choice"><strong>Фото, код и описание</strong><p>Можно использовать всё вместе или только нужные способы. Подробности помогут точнее определить блюдо.</p></div>
        <label>Фото блюда или тарелки<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={(event) => setPlateFile(event.target.files?.[0] ?? null)}/></label>
        <label>Фото кодов с упаковок<input type="file" accept="image/*" capture="environment" multiple disabled={busy} onChange={(event) => { const files = [...(event.currentTarget.files ?? [])]; event.currentTarget.value = ''; void scanFiles(files); }}/></label>
        {scannedCodes.length > 0 && <div className="scanned-codes" aria-label="Считанные коды"><strong>Считано кодов: {scannedCodes.length}</strong>{scannedCodes.map((code) => <div key={code}><span>{code}</span><button type="button" disabled={busy} aria-label={`Убрать код ${code}`} onClick={() => setScannedCodes((old) => old.filter((item) => item !== code))}><X size={16}/></button></div>)}</div>}
        <label>Код с упаковки <small>необязательно</small><input value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Например, 3017620422003" maxLength={80}/></label>
        <label>Описание блюда — допишите и исправьте детали<textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="Например: гречка 150 г, курица без кожи, две ложки соуса"/></label>
        <p className="form-help">Код ищем в Open Food Facts; данные каталога проверьте по этикетке. Фото и текст отправляются в Gemini и не сохраняются в дневнике.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary modal-submit" type="submit" disabled={busy}>{busy ? 'Распознаём…' : 'Распознать по всем данным'} <ArrowRight size={18}/></button>
        <button className="scan-only-button" type="button" disabled={busy || (!barcode.trim() && !scannedCodes.length)} onClick={() => void runCombinedRecognition(true)}>Найти продукты только по кодам</button>
      </form>}

      {mode === 'plate-review' && <form onSubmit={savePlate} className="plate-review">
        <div className="recognition-review"><strong>Проверьте состав тарелки и порции</strong><p>По одному снимку вес определяется приблизительно. Исправьте значения или уберите лишнее.</p>{estimate?.note && <small>{estimate.note}</small>}</div>
        {catalogProducts.length > 0 && <div className="catalog-sources"><strong>Источники данных с упаковок</strong>{catalogProducts.map((product) => <a key={product.barcode} href={product.source_url} target="_blank" rel="noreferrer">{product.name} ↗</a>)}</div>}
        <label>Уточните описание и повторите распознавание<textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="Допишите ингредиенты, способ приготовления и порцию"/></label>
        <button className="scan-only-button" type="button" disabled={busy} onClick={() => void runCombinedRecognition()}>Распознать ещё раз с уточнением</button>
        <label>Приём пищи<select value={food.type} onChange={(event) => { const type = event.target.value as MealType; setFood({ ...food, type }); setPlateItems((items) => items.map((item) => ({ ...item, type }))); }}>{Object.entries(mealLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        {plateItems.map((item, index) => <div className="plate-item" key={index}>
          <div className="plate-item-head"><strong>Продукт {index + 1}</strong><button type="button" aria-label={`Убрать ${item.name}`} onClick={() => setPlateItems((items) => items.filter((_, i) => i !== index))}><X size={17}/> Убрать</button></div>
          <label>Название<input required maxLength={160} value={item.name} onChange={(event) => setPlateItems((items) => items.map((old, i) => i === index ? { ...old, name: event.target.value } : old))}/></label>
          <div className="form-grid"><label>Порция, г<input type="number" required min="1" max="3000" step=".1" value={item.grams} onChange={(event) => setPlateItems((items) => items.map((old, i) => i === index ? { ...old, grams: event.target.value } : old))}/></label><span className="plate-kcal">≈ {Math.round(Number(item.kcal) * Number(item.grams) / 100)} ккал</span></div>
          <details><summary>Пищевая ценность на 100 г</summary><div className="form-grid">{(['kcal', 'protein', 'fat', 'carbs'] as const).map((key) => <label key={key}>{({ kcal: 'Ккал', protein: 'Белки, г', fat: 'Жиры, г', carbs: 'Углеводы, г' })[key]}<input type="number" required min="0" max="1000" step=".1" value={item[key]} onChange={(event) => setPlateItems((items) => items.map((old, i) => i === index ? { ...old, [key]: event.target.value } : old))}/></label>)}</div></details>
          {estimate?.items[index]?.assumptions && <small>{estimate.items[index].assumptions}</small>}
        </div>)}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="button button-primary modal-submit" disabled={busy || !plateItems.length}>{busy ? 'Сохраняем…' : `Подтвердить и сохранить ${plateItems.length} продукта`}</button>
      </form>}

      {(mode === 'photo' || mode === 'text' || mode === 'voice') && <form onSubmit={runRecognition} className="recognition-form">
        {mode === 'photo'
          ? <label>Снимок блюда<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => setFile(event.target.files?.[0] ?? null)}/></label>
          : mode === 'text'
            ? <label>Что вы съели<textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="Например: два яйца, тост с маслом и кофе"/></label>
            : <div className="voice-controls"><p>Коротко расскажите, что и сколько съели. Запись длится до 30 секунд.</p><button type="button" onClick={() => recording ? recorder.current?.stop() : void startRecording()}>{recording ? <><Square size={16}/> Остановить</> : <><Mic size={16}/> Начать запись</>}</button>{audio && <small>Запись готова · {Math.ceil(audio.size / 1024)} КБ</small>}</div>}
        <p className="form-help">Распознавание приблизительное. Фото и голос не сохраняются в дневнике; они отправляются на обработку в Gemini. Ответ проверьте перед записью.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary modal-submit" type="submit" disabled={busy || recording}>{busy ? 'Распознаём…' : 'Распознать'} <ArrowRight size={18}/></button>
      </form>}

      {(mode === 'manual' || mode === 'review') && <form onSubmit={save}>
        {mode === 'review' && <div className="recognition-review"><strong>{catalogProduct ? 'Данные Open Food Facts проверьте по этикетке. Укажите свою порцию.' : 'Расчёт по фото, тексту или голосу приблизительный. Проверь размер порции.'}</strong>{estimate && <p>{estimate.items.map((item) => `${item.name}: около ${round(item.grams)} г`).join(' · ')}</p>}{estimate?.note && <small>{estimate.note}</small>}{catalogProduct && <a href={catalogProduct.source_url} target="_blank" rel="noreferrer">Источник: Open Food Facts ↗</a>}</div>}
        <label>Название блюда или продукта<input autoFocus required maxLength={160} value={food.name} onChange={(event) => setFood({ ...food, name: event.target.value })} placeholder="Например, гречка с курицей"/></label>
        <div className="form-grid">
          <label>Приём пищи<select value={food.type} onChange={(event) => setFood({ ...food, type: event.target.value as MealType })}>{Object.entries(mealLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Порция, г<input type="number" required min="1" max="3000" step=".1" value={food.grams} onChange={(event) => setFood({ ...food, grams: event.target.value })}/></label>
        </div>
        <div className="form-divider">ПИЩЕВАЯ ЦЕННОСТЬ НА 100 Г</div>
        <div className="form-grid">
          {(['kcal', 'protein', 'fat', 'carbs'] as const).map((key) =>
            <label key={key}>{({ kcal: 'Ккал', protein: 'Белки, г', fat: 'Жиры, г', carbs: 'Углеводы, г' })[key]}<input type="number" required min="0" max="1000" step=".1" value={food[key]} onChange={(event) => setFood({ ...food, [key]: event.target.value })}/></label>)}
        </div>
        <p className="form-help">Значения с этикетки надёжнее оценки по фото. При необходимости исправьте их и размер порции.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="button button-primary modal-submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Подтвердить и сохранить'} <ArrowRight size={18}/></button>
      </form>}
    </div>
  </div>;
}
