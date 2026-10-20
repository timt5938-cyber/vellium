import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, ArrowRight, Check, Download, ExternalLink, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Brand from './components/Brand';
import AuthPanel from './components/AuthPanel';
import { supabase } from './services/supabase';
import './project-pages.css';

const repo = 'https://github.com/timt5938-cyber/TGclear';

export default function TGclear() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [toolOpen, setToolOpen] = useState(false);
  const [acceptedRemote, setAcceptedRemote] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!toolOpen || !session?.access_token) return;
    const deliver = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== 'tgclear-ready') return;
      frame.current.contentWindow?.postMessage({ type: 'tgclear-session', token: session.access_token }, window.location.origin);
    };
    window.addEventListener('message', deliver);
    return () => window.removeEventListener('message', deliver);
  }, [toolOpen, session?.access_token]);

  if (toolOpen && loading) return <div className="tg-loading">Подключаем TGclear…</div>;
  if (toolOpen && !session) return <AuthPanel redirectTo="/tgclear"/>;
  if (toolOpen) return <div className="tg-tool-shell"><div className="tg-tool-bar"><button onClick={() => setToolOpen(false)} type="button"><ArrowLeft size={17}/> К описанию проекта</button><span>TGclear / РАБОЧЕЕ ПРОСТРАНСТВО</span></div><iframe ref={frame} title="TGclear — очистка Telegram" src="/tgclear/tool" onLoad={() => {
    if (session?.access_token) frame.current?.contentWindow?.postMessage({ type: 'tgclear-session', token: session.access_token }, window.location.origin);
  }}/></div>;

  return <div className="tg-landing">
    <header className="tg-topbar"><Brand/><Link to="/">Все проекты <ArrowRight size={17}/></Link></header>
    <main>
      <section className="tg-hero"><div className="tg-container tg-hero-grid"><div>
        <span className="project-kicker">02 / ПОРЯДОК В TELEGRAM</span>
        <h1>Меньше шума.<br/><em>Больше вашего.</em></h1>
        <p>Посмотрите, какие каналы вы давно не читали. Защитите важное, проверьте кандидатов и подтвердите выход только из выбранных чатов.</p>
        <label className="tg-consent"><input type="checkbox" checked={acceptedRemote} onChange={(event) => setAcceptedRemote(event.target.checked)}/><span>Я понимаю, что веб-версия передаёт данные Telegram на сервер для работы TGclear; я прочитал(а) <Link to="/privacy">раздел о TGclear в политике</Link>. Локальный запуск доступен ниже.</span></label>
        <div className="tg-actions"><button type="button" className="tg-primary" disabled={!acceptedRemote} onClick={() => setToolOpen(true)}>Открыть TGclear <ArrowRight size={18}/></button><a href={repo} target="_blank" rel="noopener noreferrer">Исходный код <ExternalLink size={16}/></a></div>
        <p className="tg-hero-note"><ShieldCheck size={17}/> Личные диалоги и боты исключены из очистки. Перед выходом создаётся резервная копия.</p>
      </div><div className="tg-visual" aria-label="Схематичный предварительный просмотр TGclear"><div className="tg-visual-top"><span className="tg-visual-brand">V&nbsp; TGclear</span><span>ОБЗОР</span></div><div className="tg-visual-title">Всё важное — на месте.</div><div className="tg-visual-metrics"><div><strong>42</strong><span>Канала найдено</span></div><div><strong>12</strong><span>Можно проверить</span></div></div><div className="tg-visual-row"><span className="tg-visual-dot"/>Новости проекта <small>Защищён</small></div><div className="tg-visual-row"><span className="tg-visual-dot amber"/>Старый канал <small>Кандидат</small></div><div className="tg-visual-row"><span className="tg-visual-dot"/>Семейная группа <small>Защищена</small></div></div></div></section>

      <section className="tg-section" id="how-to-connect"><div className="tg-container"><span className="project-kicker">ПЕРЕД ПЕРВЫМ ВХОДОМ</span><h2>Подключение за четыре шага.</h2><p className="tg-section-intro">Для работы TGclear нужны ваши ключи Telegram API. Получите их на официальном портале, затем войдите в интерфейсе TGclear.</p><div className="tg-steps">
        <article><div className="tg-step-visual"><span className="tg-browser-dots">● ● ●</span><div className="tg-mock-url">my.telegram.org</div><div className="tg-mock-heading">Telegram<br/>authorization</div><div className="tg-mock-field">+7 9XX XXX XX XX</div></div><span className="tg-step-no">01</span><h3>Откройте портал</h3><p>Перейдите на <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer">my.telegram.org</a>, укажите свой номер телефона и подтвердите вход кодом из Telegram.</p></article>
        <article><div className="tg-step-visual"><span className="tg-browser-dots">● ● ●</span><div className="tg-mock-url">my.telegram.org/apps</div><div className="tg-mock-heading">API development tools</div><div className="tg-mock-choice"><Check size={17}/> Создать приложение</div></div><span className="tg-step-no">02</span><h3>Создайте приложение</h3><p>Выберите «API development tools». Заполните App title и Short name латинскими буквами и нажмите Create application.</p></article>
        <article><div className="tg-step-visual"><span className="tg-browser-dots">● ● ●</span><div className="tg-mock-url">App configuration</div><div className="tg-mock-field">api_id <span>12345678</span></div><div className="tg-mock-field">api_hash <span>••••••••••••</span></div></div><span className="tg-step-no">03</span><h3>Скопируйте ключи</h3><p>Перенесите api_id и api_hash в TGclear. Не публикуйте api_hash и не отправляйте его другим людям.</p></article>
        <article><div className="tg-step-visual"><KeyRound size={42}/><div className="tg-mock-heading">Вход в TGclear</div><div className="tg-mock-field">Номер · код · 2FA</div></div><span className="tg-step-no">04</span><h3>Войдите в Telegram</h3><p>Введите номер, одноразовый код из Telegram и пароль 2FA, если он включён. После подключения начните сканирование.</p></article>
      </div></div></section>

      <section className="tg-section tg-trust"><div className="tg-container tg-trust-grid"><div><span className="project-kicker">ВЫБОР ЗА ВАМИ</span><h2>Понятно, где проходят данные.</h2></div><div><p><LockKeyhole size={20}/> Веб-версия обрабатывает запросы на нашем сервере. Ваш номер, ключи Telegram API, одноразовый код и пароль 2FA передаются серверу для входа; сессия Telegram и резервные копии хранятся отдельно для каждого аккаунта VELLIUM.</p><p>В веб-версии настройки с номером и ключами API, история, список исключений, сессия Telegram и резервные копии зашифрованы на диске алгоритмом AES-256-GCM. Ключ хранится на сервере: это защита файлов при хранении, а не сквозное шифрование от оператора сервиса. Код входа и пароль 2FA используются при авторизации и не сохраняются в этих файлах.</p><p>Если вы не хотите передавать эти данные на наш сервер, <a href={repo} target="_blank" rel="noopener noreferrer">скачайте TGclear с GitHub</a> и запустите его локально на своём компьютере. Исходный код и инструкция доступны всем.</p><a className="tg-repo" href={repo} target="_blank" rel="noopener noreferrer"><Download size={18}/> Скачать и запустить локально <ExternalLink size={15}/></a></div></div></section>
    </main><footer className="tg-footer"><span>Сделано by ssskkkiiieee</span><a href={repo} target="_blank" rel="noopener noreferrer">GitHub: TGclear</a><Link to="/privacy">Политика конфиденциальности</Link></footer>
  </div>;
}
