import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown, ArrowRight, Camera, ChartNoAxesCombined, Check, ChevronRight,
  LockKeyhole, Menu, ScanLine, Sparkles, UsersRound, UtensilsCrossed, X,
} from 'lucide-react';

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand ${compact ? 'brand-compact' : ''}`} to="/" aria-label="VELLIUM — на главную">
      <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 42 42" fill="none"><path d="M5 6.5h8L21 29l8-22.5h8L24.7 36h-7.4L5 6.5Z" fill="currentColor"/><path d="M16 6.5 21 20l5-13.5" stroke="#11100f" strokeWidth="2"/></svg></span>
      <span className="brand-word">VELLIUM<span className="brand-dot">.</span></span>
    </Link>
  );
}

const demo = {
  photo: { label: 'Фото блюда', icon: Camera, title: 'Сначала увидеть. Затем уточнить.', description: 'Снимок помогает начать запись. Вы проверяете состав, вес и КБЖУ перед сохранением.', tag: 'Распознавание по фото — в разработке' },
  scan: { label: 'Сканер', icon: ScanLine, title: 'Продукт — по одному скану.', description: 'Штрихкод помогает найти карточку товара. Данные с этикетки можно проверить и поправить.', tag: 'Сканер — в разработке' },
  diary: { label: 'Дневник', icon: UtensilsCrossed, title: 'Учет, который не мешает жить.', description: 'Добавьте блюдо вручную и сразу увидьте, сколько энергии и БЖУ осталось на день.', tag: 'Дневник уже доступен' },
};

type DemoKey = keyof typeof demo;

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDemo, setActiveDemo] = useState<DemoKey>('diary');
  const active = demo[activeDemo];
  const ActiveIcon = active.icon;

  return (
    <div className="landing" id="top">
      <header className="site-header">
        <div className="container nav-wrap">
          <Brand />
          <nav className={`site-nav ${menuOpen ? 'site-nav-open' : ''}`} aria-label="Главная навигация">
            <a href="#approach" onClick={() => setMenuOpen(false)}>Подход</a>
            <a href="#features" onClick={() => setMenuOpen(false)}>Возможности</a>
            <a href="#family" onClick={() => setMenuOpen(false)}>Для семьи</a>
            <a href="#privacy" onClick={() => setMenuOpen(false)}>Приватность</a>
            <Link className="mobile-nav-cta" to="/app">Открыть дневник <ArrowRight size={16}/></Link>
          </nav>
          <Link className="nav-cta" to="/app">Открыть дневник <ArrowRight size={16}/></Link>
          <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={24}/> : <Menu size={24}/>}</button>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-image" aria-hidden="true" />
          <div className="hero-shade" aria-hidden="true" />
          <div className="container hero-inner">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> ИНТЕЛЛЕКТ В КАЖДОМ ПРИЁМЕ ПИЩИ</div>
              <h1 id="hero-title">Понимай своё питание.<br/><em>Живи в балансе.</em></h1>
              <p>VELLIUM помогает видеть картину целиком: записывать еду, понимать дневной баланс и выбирать следующий приём пищи с опорой на ваши цели.</p>
              <div className="hero-actions"><Link className="button button-primary" to="/app">Открыть дневник <ArrowRight size={19}/></Link><a className="button button-ghost" href="#approach">Узнать больше <ArrowDown size={18}/></a></div>
              <div className="hero-note"><span className="note-icon"><Check size={14}/></span> Уже можно вести дневник вручную. Остальные функции добавляются поэтапно.</div>
            </div>
            <div className="hero-floating" aria-label="Пример интерфейса VELLIUM">
              <div className="floating-top"><span>ВАШ ДЕНЬ · ПРИМЕР</span><span className="floating-status"><span/> в балансе</span></div>
              <div className="floating-main"><div><span className="floating-label">Осталось на сегодня</span><strong>840 <small>ккал</small></strong></div><div className="floating-ring"><span>64%</span></div></div>
              <div className="floating-bars"><div><span>Белки</span><i><b style={{width:'68%'}} /></i></div><div><span>Жиры</span><i><b style={{width:'52%'}} /></i></div><div><span>Углеводы</span><i><b style={{width:'73%'}} /></i></div></div>
            </div>
          </div>
          <div className="hero-bottom"><div className="container"><span>ПИТАНИЕ БЕЗ ДОГАДОК</span><span className="hero-scroll">ЛИСТАЙТЕ НИЖЕ <ArrowDown size={14}/></span></div></div>
        </section>

        <section className="intro section-pad" id="approach">
          <div className="container intro-grid">
            <div><div className="section-kicker">01 / НОВЫЙ ВЗГЛЯД</div><h2>Данные, которые<br/><span>помогают вам.</span></h2></div>
            <div className="intro-right"><p className="large-copy">Не стремиться к идеальному дню. Замечать закономерности и принимать решения, которые подходят именно вам.</p><p>VELLIUM собирает приёмы пищи в понятную картину дня. Вы видите энергию и БЖУ без перегруженных таблиц, а записи всегда можете скорректировать.</p><a className="text-link" href="#features">Посмотреть возможности <ArrowRight size={18}/></a></div>
          </div>
          <div className="container principle-row"><div><span>01</span><strong>Записывайте удобно</strong><p>Начните с простого ручного ввода.</p></div><div><span>02</span><strong>Видьте баланс</strong><p>Понятные ориентиры на каждый день.</p></div><div><span>03</span><strong>Выбирайте осознанно</strong><p>Идеи для следующего приёма пищи.</p></div></div>
        </section>

        <section className="feature-showcase section-pad" id="features">
          <div className="container feature-layout">
            <div className="feature-copy"><div className="section-kicker">02 / ОТ ЗАПИСИ К ПОНИМАНИЮ</div><h2>Меньше действий.<br/><span>Больше ясности.</span></h2><p>Каждая запись — часть общей картины. Начните с дневника; распознавание по фото и сканер дополнят его на следующих этапах.</p><div className="feature-tabs" role="tablist" aria-label="Способы добавления еды">{(Object.keys(demo) as DemoKey[]).map((key) => { const Icon = demo[key].icon; return <button type="button" role="tab" aria-selected={activeDemo===key} className={activeDemo===key?'feature-tab active':'feature-tab'} key={key} onClick={() => setActiveDemo(key)}><Icon size={19}/>{demo[key].label}<ChevronRight size={17}/></button>; })}</div></div>
            <div className="demo-stage"><div className="demo-orbit orbit-one"/><div className="demo-orbit orbit-two"/><div className="demo-card"><div className="demo-topline"><span><span className="demo-top-dot"/> VELLIUM / ВОЗМОЖНОСТИ</span><span>0{(Object.keys(demo) as DemoKey[]).indexOf(activeDemo)+1} / 03</span></div><div className="demo-visual"><div className="demo-icon"><ActiveIcon size={36} strokeWidth={1.3}/></div><div className="demo-arc"/><div className="demo-lines"><span/><span/><span/></div></div><div className="demo-content"><span className="demo-tag">{active.tag}</span><h3>{active.title}</h3><p>{active.description}</p>{activeDemo==='diary' && <Link to="/app" className="text-link">Попробовать дневник <ArrowRight size={17}/></Link>}</div></div></div>
          </div>
        </section>

        <section className="intelligence section-pad" id="intelligence"><div className="container intel-grid"><div className="intel-visual"><div className="insight-card"><span className="tiny-label">ПОДСКАЗКА · ПРИМЕР</span><div className="insight-icon"><Sparkles size={22}/></div><h3>Что подойдёт дальше?</h3><p>Сегодня до ориентира по белку осталось больше, чем по жирам. На ужин можно рассмотреть блюдо с рыбой и овощами.</p><div className="insight-divider"/><div className="insight-metrics"><span>Основано на балансе дня</span><span>↗</span></div></div><div className="insight-decoration">V</div></div><div className="intel-copy"><div className="section-kicker">03 / ПЕРСОНАЛЬНЫЙ КОНТЕКСТ</div><h2>Не просто счётчик.<br/><span>Ваш ориентир.</span></h2><p>После каждого приёма пищи баланс обновляется. VELLIUM может предложить идею следующего блюда с учётом оставшейся энергии и БЖУ. Вы всегда видите, на чём основана подсказка.</p><div className="mini-feature"><div><ChartNoAxesCombined size={21}/></div><span><strong>Больше контекста</strong><small>День, цели и уже записанные блюда — в одном месте.</small></span></div><div className="mini-feature"><div><Sparkles size={21}/></div><span><strong>Последнее слово за вами</strong><small>Любую порцию и показатель можно изменить.</small></span></div></div></div></section>

        <section className="family section-pad" id="family"><div className="container family-grid"><div className="family-copy"><div className="section-kicker">04 / БЛИЖЕ ДРУГ К ДРУГУ</div><h2>У каждого —<br/><span>свой баланс.</span></h2><p>VELLIUM задуман для семьи: у каждого человека свои записи и ориентиры, а общий обзор помогает планировать питание вместе. Семейные профили появятся после запуска персонального дневника.</p><div className="family-pills"><span><UsersRound size={17}/> Личные профили</span><span><LockKeyhole size={17}/> Контроль доступа</span></div></div><div className="family-visual"><div className="family-glow"/><div className="family-panel"><div className="family-panel-head"><span>НАШ ДОМ</span><span>ПРИМЕР ИНТЕРФЕЙСА</span></div><div className="family-person"><span className="avatar avatar-one">А</span><span><strong>Анна</strong><small>Личный баланс питания</small></span><span className="person-line"><b style={{width:'68%'}}/></span></div><div className="family-person"><span className="avatar avatar-two">М</span><span><strong>Марк</strong><small>Личный баланс питания</small></span><span className="person-line"><b style={{width:'43%'}}/></span></div><div className="family-person"><span className="avatar avatar-three">Е</span><span><strong>Елена</strong><small>Личный баланс питания</small></span><span className="person-line"><b style={{width:'79%'}}/></span></div></div></div></div></section>

        <section className="privacy section-pad" id="privacy"><div className="container privacy-grid"><div className="privacy-seal"><div className="seal-outer"><div className="seal-inner"><LockKeyhole size={42} strokeWidth={1.2}/></div></div><span>ВАШИ ДАННЫЕ · ВАШ ВЫБОР</span></div><div><div className="section-kicker">05 / ДОВЕРИЕ ПО УМОЛЧАНИЮ</div><h2>Личное остаётся<br/><span>личным.</span></h2><p>Питание — чувствительная тема. Поэтому в проекте заложены отдельные профили, управляемая видимость для семьи и возможность удаления данных. Личный дневник защищён доступом к аккаунту; семейные права будут проверяться отдельно перед запуском этой функции.</p><Link className="text-link" to="/app">Открыть личный дневник <ArrowRight size={18}/></Link></div></div></section>

        <section className="final-cta"><div className="container final-inner"><div><div className="section-kicker">ВАШ ДЕНЬ НАЧИНАЕТСЯ ЗДЕСЬ</div><h2>Хорошие решения<br/>рождаются из <em>ясности.</em></h2><p>Начните записывать питание и посмотрите, как складывается ваш день.</p></div><Link className="button button-primary" to="/app">Открыть дневник <ArrowRight size={19}/></Link></div></section>
      </main>
      <footer className="site-footer"><div className="container footer-top"><Brand compact/><p>Intelligence in Every Meal.</p><a href="#top">Наверх ↑</a></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} VELLIUM</span><span>Сделано для более осознанного питания.</span><span>Данные примеров на странице иллюстративны.</span></div></footer>
    </div>
  );
}
