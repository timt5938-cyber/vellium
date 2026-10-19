import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown, ArrowRight, Camera, Check, ChevronRight,
  Menu, ScanLine, UtensilsCrossed, X,
} from 'lucide-react';
import Brand from './components/Brand';
import LandingShowcase from './components/LandingShowcase';
import { FamilySection, OrientationSection, PrivacySection } from './components/LandingSections';

const demo = {
  photo: { label: 'Фото блюда', icon: Camera, title: 'Сначала увидеть. Затем уточнить.', description: 'Снимок помогает начать запись. Вы проверяете состав, вес и КБЖУ перед сохранением.', tag: 'Оценка блюда по фото доступна' },
  scan: { label: 'Сканер', icon: ScanLine, title: 'Продукт — по одному скану.', description: 'Штрихкод помогает найти карточку товара. Данные с этикетки можно проверить и поправить.', tag: 'Поиск по штрихкоду доступен' },
  diary: { label: 'Дневник', icon: UtensilsCrossed, title: 'Учет, который не мешает жить.', description: 'Добавьте блюдо вручную и сразу увидьте, сколько энергии и БЖУ осталось на день.', tag: 'Дневник уже доступен' },
};

type DemoKey = keyof typeof demo;

const familyExamples = [
  [{ name: 'Анна', relation: 'Жена' }, { name: 'Илья', relation: 'Сын · 19 лет' }, { name: 'Елена', relation: 'Мама' }],
  [{ name: 'Максим', relation: 'Муж' }, { name: 'Вера', relation: 'Дочь · 21 год' }, { name: 'Наталья', relation: 'Мама' }],
  [{ name: 'Мария', relation: 'Жена' }, { name: 'Даниил', relation: 'Сын · 22 года' }, { name: 'Алексей', relation: 'Папа' }],
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDemo, setActiveDemo] = useState<DemoKey>('diary');
  const [familyExample] = useState(() => familyExamples[Math.floor(Math.random() * familyExamples.length)]);
  const active = demo[activeDemo];

  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sections = document.querySelectorAll('.landing .section-pad, .landing .final-cta');
    sections.forEach((section) => section.classList.add('reveal-section'));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

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
              <div className="hero-note"><span className="note-icon"><Check size={14}/></span> Дневник, распознавание еды и личные профили семьи уже доступны.</div>
            </div>
            <Link to="/app" className="hero-floating" aria-label="Открыть дневник VELLIUM">
              <div className="floating-top"><span>ВАШ ДЕНЬ · ПРИМЕР</span><span className="floating-status"><span/> в балансе</span></div>
              <div className="floating-main"><div><span className="floating-label">Осталось на сегодня</span><strong>840 <small>ккал</small></strong></div><div className="floating-ring"><span>64%</span></div></div>
              <div className="floating-bars"><div><span>Белки</span><i><b style={{width:'68%'}} /></i></div><div><span>Жиры</span><i><b style={{width:'52%'}} /></i></div><div><span>Углеводы</span><i><b style={{width:'73%'}} /></i></div></div>
            </Link>
          </div>
          <div className="hero-bottom"><div className="container"><span>ПИТАНИЕ БЕЗ ДОГАДОК</span><span className="hero-scroll">ЛИСТАЙТЕ НИЖЕ <ArrowDown size={14}/></span></div></div>
        </section>

        <section className="intro section-pad" id="approach">
          <div className="container intro-grid">
            <div><div className="section-kicker">01 / НОВЫЙ ВЗГЛЯД</div><h2>Данные, которые<br/><span>помогают вам.</span></h2></div>
            <div className="intro-right"><p className="large-copy">Не стремиться к идеальному дню. Замечать закономерности и принимать решения, которые подходят именно вам.</p><p>VELLIUM собирает приёмы пищи в понятную картину дня. Вы видите энергию и БЖУ без перегруженных таблиц, а записи всегда можете скорректировать.</p><a className="text-link" href="#features">Посмотреть возможности <ArrowRight size={18}/></a></div>
          </div>
          <div className="container principle-row"><Link to="/app" className="principle-link"><span>01</span><strong>Записывайте удобно</strong><p>Начните с простого ручного ввода.</p></Link><Link to="/app" className="principle-link"><span>02</span><strong>Видьте баланс</strong><p>Понятные ориентиры на каждый день.</p></Link><Link to="/app" className="principle-link"><span>03</span><strong>Выбирайте осознанно</strong><p>Идеи для следующего приёма пищи.</p></Link></div>
        </section>

        <section className="feature-showcase section-pad" id="features">
          <div className="container feature-layout">
            <div className="feature-copy"><div className="section-kicker">02 / ОТ ЗАПИСИ К ПОНИМАНИЮ</div><h2>Меньше действий.<br/><span>Больше ясности.</span></h2><p>Каждая запись — часть общей картины. Добавляйте еду вручную, по фото или штрихкоду и проверяйте показатели перед сохранением.</p><div className="feature-tabs" role="tablist" aria-label="Способы добавления еды">{(Object.keys(demo) as DemoKey[]).map((key) => { const Icon = demo[key].icon; return <button type="button" role="tab" aria-selected={activeDemo===key} className={activeDemo===key?'feature-tab active':'feature-tab'} key={key} onClick={() => setActiveDemo(key)}><Icon size={19}/>{demo[key].label}<ChevronRight size={17}/></button>; })}</div></div>
            <div className="demo-stage"><div className="demo-orbit orbit-one"/><div className="demo-orbit orbit-two"/><div className="demo-card showcase-card"><div className="demo-topline"><span><span className="demo-top-dot"/> VELLIUM / ВОЗМОЖНОСТИ</span><span>0{(Object.keys(demo) as DemoKey[]).indexOf(activeDemo)+1} / 03</span></div><LandingShowcase mode={activeDemo}/><div className="demo-content"><span className="demo-tag">{active.tag}</span><h3>{active.title}</h3><p>{active.description}</p><Link to="/app" className="text-link">Открыть дневник <ArrowRight size={17}/></Link></div></div></div>
          </div>
        </section>

        <OrientationSection/>

        <FamilySection people={familyExample}/>

        <PrivacySection/>

        <section className="final-cta"><div className="container final-inner"><div><div className="section-kicker">ВАШ ДЕНЬ НАЧИНАЕТСЯ ЗДЕСЬ</div><h2>Хорошие решения<br/>рождаются из <em>ясности.</em></h2><p>Начните записывать питание и посмотрите, как складывается ваш день.</p></div><Link className="button button-primary" to="/app">Открыть дневник <ArrowRight size={19}/></Link></div></section>
      </main>
      <footer className="site-footer"><div className="container footer-top"><Brand compact/><p>Питание в вашем ритме.</p><a href="#top">Наверх ↑</a></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} VELLIUM · Сделано by ssskkkiiieee</span><Link to="/privacy">Политика конфиденциальности</Link><Link to="/terms">Пользовательское соглашение</Link><span>Примеры на странице иллюстративны.</span></div></footer>
    </div>
  );
}
