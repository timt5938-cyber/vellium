import { useState } from 'react';
import { supabase } from '../services/supabase';

export default function AccountSettings({ email }: { email: string }) {
  const [nextEmail, setNextEmail] = useState(email);
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function updateEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || nextEmail.trim().toLowerCase() === email.toLowerCase()) return;
    setBusy(true); setNotice('');
    const result = await supabase.auth.updateUser({ email: nextEmail.trim() });
    setBusy(false);
    setNotice(result.error?.message ?? 'Подтвердите новый адрес по письму. До подтверждения входите с прежней почтой.');
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || password.length < 8) return;
    setBusy(true); setNotice('');
    const result = await supabase.auth.updateUser({ password });
    setBusy(false); setPassword('');
    setNotice(result.error?.message ?? 'Пароль обновлён.');
  }

  return <section className="account-settings"><span className="card-overline">ДОСТУП К АККАУНТУ</span><h3>Почта и пароль</h3>
    <p>Эти настройки доступны каждому взрослому в его собственном аккаунте.</p>
    <form onSubmit={(event) => void updateEmail(event)}><label>Электронная почта<input type="email" required autoComplete="email" value={nextEmail} onChange={(event) => setNextEmail(event.target.value)}/></label><button type="submit" disabled={busy || nextEmail.trim().toLowerCase() === email.toLowerCase()}>Изменить почту</button></form>
    <form onSubmit={(event) => void updatePassword(event)}><label>Новый пароль<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Не менее 8 символов"/></label><button type="submit" disabled={busy || password.length < 8}>Обновить пароль</button></form>
    {notice && <p role="status">{notice}</p>}
  </section>;
}
