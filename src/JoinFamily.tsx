import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, UsersRound } from 'lucide-react';
import AuthPanel from './components/AuthPanel';
import Brand from './components/Brand';
import { supabase } from './services/supabase';

export default function JoinFamily() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    let active = true;
    void supabase.auth.getUser().then(({ data }) => { if (active) { setUser(data.user); setReady(true); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { setUser(session?.user ?? null); setReady(true); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function accept() {
    if (!supabase || !token) return;
    setBusy(true); setError('');
    const result = await supabase.rpc('redeem_family_invite', { p_invite_id: token });
    setBusy(false);
    if (result.error) setError(result.error.message);
    else navigate('/app', { replace: true });
  }

  if (!ready) return <div className="auth-screen"><p>Проверяем приглашение…</p></div>;
  if (!user) return <AuthPanel redirectTo={`/join/${token ?? ''}`}/>;
  return <div className="auth-screen"><header className="auth-header"><Brand/><Link to="/">На сайт →</Link></header>
    <main className="auth-card"><div className="auth-icon"><UsersRound size={24}/></div>
      <span className="section-kicker">ПРИГЛАШЕНИЕ В СЕМЬЮ</span><h1>Ваш личный профиль.</h1>
      <p>Вы вошли как {user.email}. После принятия приглашения вам откроются связанные с вами профиль и записи питания. Ссылка действует 7 дней и используется один раз.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={busy || !token} onClick={() => void accept()}>{busy ? 'Подключаем…' : 'Принять приглашение'} <ArrowRight size={18}/></button>
    </main>
  </div>;
}
