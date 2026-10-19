import { Link } from 'react-router-dom';
import { ArrowRight, ChartNoAxesCombined, Database, Download, ScanLine, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';

export function OrientationSection() {
  return <section className="intelligence section-pad" id="intelligence"><div className="container intel-grid">
    <div className="orientation-preview" aria-label="Пример дневного баланса калорий и БЖУ">
      <div className="orientation-head"><span>VELLIUM / БАЛАНС ДНЯ</span><span>ПРИМЕР</span></div>
      <div className="orientation-energy"><span>Съедено сегодня</span><strong>1 098 <small>/ 2 710 ккал</small></strong><p>Осталось 1 612 ккал</p><div className="orientation-track"><i/></div></div>
      <div className="orientation-macros">{[['Белки','11 / 160 г','7%'],['Жиры','45 / 84 г','54%'],['Углеводы','158 / 329 г','48%']].map(([name,amount,width]) => <div key={name}><span>{name}<b>{amount}</b></span><i><em style={{width}}/></i></div>)}</div>
      <div className="orientation-insight"><Sparkles size={19}/><span><strong>Идея следующего блюда</strong><small>ИИ учитывает сохранённые приёмы пищи и остаток БЖУ. Порцию можно исправить.</small></span></div>
    </div>
    <div className="intel-copy"><div className="section-kicker">03 / ПЕРСОНАЛЬНЫЙ КОНТЕКСТ</div><h2>Не просто счётчик.<br/><span>Ваш ориентир.</span></h2><p>После каждого сохранённого блюда VELLIUM пересчитывает энергию и БЖУ за день. Фото, текст или код помогают оценить состав с ИИ; вы подтверждаете результат. Затем можно запросить идею следующего приёма по вашему балансу.</p><div className="mini-feature"><div><ChartNoAxesCombined size={21}/></div><span><strong>Все записи в одном расчёте</strong><small>Калории, белки, жиры и углеводы суммируются без догадок модели.</small></span></div><div className="mini-feature"><div><Sparkles size={21}/></div><span><strong>Рекомендация по запросу</strong><small>ИИ видит только записи выбранного дня, когда вы нажимаете «Подобрать».</small></span></div><Link to="/app" className="text-link">Посмотреть свой баланс <ArrowRight size={18}/></Link></div>
  </div></section>;
}

export interface FamilyExample { name: string; relation: string }

export function FamilySection({ people }: { people: FamilyExample[] }) {
  return <section className="family section-pad" id="family"><div className="container family-grid"><div className="family-copy"><div className="section-kicker">04 / БЛИЖЕ ДРУГ К ДРУГУ</div><h2>У каждого —<br/><span>свой баланс.</span></h2><p>Ведите отдельные профили взрослых членов семьи в своём аккаунте или пригласите взрослого по почте в его собственный. У каждого — свой дневник и ориентир.</p><div className="family-pills"><span><UsersRound size={17}/> Личные профили</span><span><ShieldCheck size={17}/> Раздельный доступ</span></div></div><div className="family-visual"><div className="family-glow"/><div className="family-panel"><div className="family-panel-head"><span>НАШ ДОМ</span><span>ПРИМЕР ИНТЕРФЕЙСА</span></div>{people.map((person, index) => <div className="family-person" key={person.name}><span className={`avatar avatar-${['one','two','three'][index]}`}>{person.name.slice(0,1)}</span><span><strong>{person.name}</strong><small>{person.relation} · личный баланс</small></span><span className="person-line"><b style={{width: `${[68,43,79][index]}%`}}/></span></div>)}</div></div></div></section>;
}

export function PrivacySection() {
  return <section className="privacy section-pad" id="privacy"><div className="container privacy-new-grid"><div><div className="section-kicker">05 / ПРОЗРАЧНО О ДАННЫХ</div><h2>Ваш дневник.<br/><span>Ваш контроль.</span></h2><p>Записи закрыты доступом к аккаунту. Вы можете скачать или удалить свои профили и приёмы пищи. Для работы сервиса мы используем инфраструктуру и обработчиков, перечисленных в политике.</p><Link className="text-link" to="/privacy">Как мы обрабатываем данные <ArrowRight size={18}/></Link></div><div className="privacy-facts"><div><ShieldCheck size={23}/><span><strong>Раздельный доступ</strong><small>Профили и записи доступны только авторизованным участникам с правами доступа.</small></span></div><div><Database size={23}/><span><strong>Хранение во Франкфурте</strong><small>Основные данные дневника находятся в проекте Supabase, регион Frankfurt.</small></span></div><div><ScanLine size={23}/><span><strong>ИИ только по вашему действию</strong><small>Фото, описание или голос передаются Gemini для распознавания; они не сохраняются как вложения дневника.</small></span></div><div><Download size={23}/><span><strong>Выгрузка и удаление</strong><small>PDF и Excel доступны в профиле; свои записи и профили можно удалить.</small></span></div></div></div></section>;
}
