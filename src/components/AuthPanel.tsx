import { useState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function AuthPanel({ redirectTo = '/app' }: { redirectTo?: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [crossBorderConsent, setCrossBorderConsent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    if (mode === 'signup' && (!acceptedTerms || !crossBorderConsent)) {
      setNotice('Для регистрации подтвердите условия и передачу данных за пределы РФ.');
      return;
    }
    setBusy(true);
    setNotice('');
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email: email.trim(), password, options: {
        emailRedirectTo: window.location.origin + redirectTo,
        data: { legal_version: '2026-10-20', legal_accepted_at: new Date().toISOString(), cross_border_consent_at: new Date().toISOString() },
      } })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      setNotice(result.error.message);
    } else if (mode === 'signup' && !result.data.session) {
      setNotice('Проверьте почту и подтвердите адрес, затем войдите.');
    }
  }

  return <div className="auth-screen">
    <header className="auth-header"><Link to="/" className="app-brand"><span className="app-brand-mark">V</span><span>VELLIUM<span className="brand-dot">.</span></span></Link><Link to="/">На сайт →</Link></header>
    <main className="auth-card">
      <div className="auth-icon"><LockKeyhole size={24}/></div>
      <span className="section-kicker">ЛИЧНОЕ ПРОСТРАНСТВО</span>
      <h1>{mode === 'login' ? 'С возвращением.' : 'Начните свой путь.'}</h1>
      <p>Профиль и дневник хранятся в вашем аккаунте VELLIUM в Supabase, регион Франкфурт.</p>
      <form onSubmit={submit}>
        <label>Электронная почта<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label>
        <label>Пароль<input type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Не менее 8 символов"/></label>
        {mode === 'signup' && <div className="auth-consents">
          <label className="auth-check"><input type="checkbox" required checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)}/><span>Я ознакомился(лась) и принимаю <Link to="/terms" target="_blank" rel="noopener noreferrer">Пользовательское соглашение</Link> и <Link to="/privacy" target="_blank" rel="noopener noreferrer">Политику конфиденциальности</Link>.</span></label>
          <label className="auth-check"><input type="checkbox" required checked={crossBorderConsent} onChange={(event) => setCrossBorderConsent(event.target.checked)}/><span>Я согласен(на) на передачу данных для работы сервиса в Германию (Supabase) и поставщикам функций, указанным в <Link to="/privacy" target="_blank" rel="noopener noreferrer">Политике</Link>. Понимаю, что основная база находится во Франкфурте.</span></label>
          <p>Это согласие не заменяет требований российского закона о локализации данных. ИИ не является медицинской консультацией.</p>
        </div>}
        {notice && <p className="form-error" role="status">{notice}</p>}
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'} <ArrowRight size={18}/></button>
      </form>
      <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setNotice(''); }}>
        {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
      </button>
    </main>
  </div>;
}
