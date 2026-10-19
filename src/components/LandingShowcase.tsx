import { Camera, Check, ScanLine, Sparkles } from 'lucide-react';

export type ShowcaseMode = 'photo' | 'scan' | 'diary';

export default function LandingShowcase({ mode }: { mode: ShowcaseMode }) {
  if (mode === 'photo') return <div className="showcase-photo" role="img" aria-label="Блюдо на столе и экран VELLIUM с оценкой его калорийности">
    <span className="showcase-live"><Camera size={14}/> ФОТО БЛЮДА · ПРИМЕР</span>
    <div className="showcase-phone"><div className="phone-camera"/><div className="phone-screen"><span className="phone-brand">VELLIUM<span>.</span></span><div className="phone-image"/><div className="phone-result"><span><Sparkles size={13}/> РАСПОЗНАНО</span><strong>Лосось с картофелем</strong><p>Порция ~ 380 г</p><b>520 <small>ккал</small></b><div>Б 35 г <i/> Ж 18 г <i/> У 48 г</div></div></div></div>
    <span className="showcase-disclaimer">Оценка ИИ · состав и вес можно исправить</span>
  </div>;
  if (mode === 'scan') return <div className="showcase-scanner" role="img" aria-label="Демонстрация сканера кода продукта с рамкой, линией сканирования и карточкой результата">
    <div className="scan-top"><ScanLine size={19}/> НАВЕДИТЕ КАМЕРУ НА КОД <span>LIVE PREVIEW</span></div>
    <div className="scan-view"><div className="scan-frame"><i/><i/><i/><i/><div className="scan-barcode"><span>||| || ||| | || |||</span><small>4 601234 567890</small></div><div className="scan-beam"/></div></div>
    <div className="scan-found"><span className="scan-check"><Check size={18}/></span><div><small>ПРОДУКТ НАЙДЕН · ПРИМЕР</small><strong>Греческий йогурт</strong><span>100 г · 118 ккал · Б 10 · Ж 6 · У 4</span></div></div>
    <div className="scan-bottom"><span>Штрихкод</span><span>Data Matrix</span><span>Ручной ввод</span></div>
  </div>;
  return <div className="showcase-diary" role="img" aria-label="Демонстрация дневника с дневным ориентиром, калориями и БЖУ">
    <div className="diary-mini-head"><span>СЕГОДНЯ · ПРИМЕР</span><strong>Ваш баланс</strong></div>
    <div className="diary-mini-energy"><div><small>СЪЕДЕНО ЗА ДЕНЬ</small><strong>1 098 <em>/ 2 710 ккал</em></strong><span>Осталось 1 612 ккал</span></div><div className="diary-mini-ring">41%</div></div>
    <div className="diary-mini-macros">{[['Белки','11 / 160 г','7%'],['Жиры','45 / 84 г','54%'],['Углеводы','158 / 329 г','48%']].map(([name,value,width]) => <div key={name}><span>{name}<b>{value}</b></span><i><em style={{width}}/></i></div>)}</div>
    <div className="diary-mini-next"><Sparkles size={18}/><span>Следующий приём — по вашему балансу</span></div>
  </div>;
}
