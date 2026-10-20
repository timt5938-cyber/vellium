import { ArrowRight, HeartPulse, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import Brand from './components/Brand';
import './project-pages.css';

export default function ProjectGateway() {
  return <main className="project-gateway">
    <div className="project-gateway-image" aria-hidden="true"/>
    <div className="project-gateway-shade" aria-hidden="true"/>
    <div className="project-gateway-content">
      <Brand/>
      <span className="project-kicker">ПРОЕКТЫ SSSKKKIIIEEE</span>
      <h1>Выберите, с чего<br/><em>начать сегодня.</em></h1>
      <p className="project-lede">Два инструмента для повседневной жизни. Один спокойный и понятный интерфейс.</p>
      <div className="project-choices">
        <Link to="/vellium" className="project-choice">
          <span className="project-choice-icon"><HeartPulse size={26}/></span><span className="project-choice-number">01 / ПИТАНИЕ</span>
          <strong>VELLIUM</strong><span>Дневник питания, баланс дня и идеи для следующего приёма пищи.</span>
          <span className="project-choice-action">Открыть проект <ArrowRight size={18}/></span>
        </Link>
        <Link to="/tgclear" className="project-choice">
          <span className="project-choice-icon"><Send size={26}/></span><span className="project-choice-number">02 / TELEGRAM</span>
          <strong>TGclear</strong><span>Освободите подписки от заброшенных каналов, сохранив то, что важно.</span>
          <span className="project-choice-action">Открыть проект <ArrowRight size={18}/></span>
        </Link>
      </div>
      <small>Вы всегда можете вернуться к выбору через логотип в верхней части страниц.</small>
    </div>
  </main>;
}
