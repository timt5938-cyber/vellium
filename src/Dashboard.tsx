import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpenText, CalendarDays, FileSpreadsheet, FileText, LogOut, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react';
import { ageOnDate, calculateTargets, mealLabels, totals } from './lib/nutrition';
import type { Meal, Profile } from './lib/nutrition';
import AuthPanel from './components/AuthPanel';
import AddMealDialog from './components/AddMealDialog';
import EditMealDialog from './components/EditMealDialog';
import NextMealRecommendation from './components/NextMealRecommendation';
import Brand from './components/Brand';
import NutritionTrends from './components/NutritionTrends';
import { useCloudDiary } from './hooks/useCloudDiary';
import { supabase } from './services/supabase';
import { exportExcel, exportPdf } from './services/exportDiary';

type Tab = 'today' | 'history' | 'profile';
const emptyProfile: Profile = { name: '', sex: 'female', birthDate: '', heightCm: 165, weightKg: 65, activity: 'light', goal: 'maintain' };

function todayKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function Ring({ value, size = 194 }: { value: number; size?: number }) {
  const progress = Math.min(100, Math.max(0, value));
  return <div className="calorie-ring" style={{ width: size, height: size, background: `conic-gradient(var(--copper) ${progress}%, var(--surface-3) ${progress}% 100%)` }}><div /></div>;
}

function Macro({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return <div className="macro"><div className="macro-label"><span><i style={{ background: color }}/>{label}</span><strong>{Math.round(value)} <small>/ {target} г</small></strong></div><div className="macro-track"><span style={{ width: `${Math.min(100, target ? value / target * 100 : 0)}%`, background: color }}/></div></div>;
}

export default function Dashboard() {
  const cloud = useCloudDiary();
  const { data } = cloud;
  const [tab, setTab] = useState<Tab>('today');
  const [date, setDate] = useState(todayKey);
  const [showAdd, setShowAdd] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [profileDraft, setProfileDraft] = useState<Profile>(emptyProfile);
  const [profileError, setProfileError] = useState('');
  const [addChoice, setAddChoice] = useState(false);
  const [adultMethod, setAdultMethod] = useState<'account' | 'email' | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [profileNotice, setProfileNotice] = useState('');

  useEffect(() => { if (data.profile) setProfileDraft(data.profile); }, [data.profile]);
  useEffect(() => {
    if (!showAdd && !editingMeal && !addChoice) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [showAdd, editingMeal, addChoice]);
  const dayMeals = useMemo(() => data.meals.filter((m) => todayKey(new Date(m.eatenAt)) === date).sort((a,b) => b.eatenAt.localeCompare(a.eatenAt)), [data.meals, date]);
  const sum = useMemo(() => totals(dayMeals), [dayMeals]);
  const targets = data.profile ? calculateTargets(data.profile) : null;
  const left = targets ? Math.max(0, targets.kcal - sum.kcal) : 0;
  const displayDate = new Date(`${date}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    const age = ageOnDate(profileDraft.birthDate);
    if (!profileDraft.name.trim()) return setProfileError('Укажите имя.');
    if (age < 18) return setProfileError('Автоматический расчёт доступен только с 18 лет.');
    if (!calculateTargets(profileDraft)) return setProfileError('Проверьте дату рождения, рост и вес.');
    if (profileDraft.manualTarget !== undefined && (profileDraft.manualTarget < 1000 || profileDraft.manualTarget > 6000)) return setProfileError('Укажите ручной ориентир от 1000 до 6000 ккал.');
    try {
      const id = await cloud.saveProfile({ ...profileDraft, name: profileDraft.name.trim() });
      if (adultMethod === 'email') {
        if (!inviteEmail.trim()) throw new Error('Укажите электронную почту взрослого.');
        await cloud.inviteAdult(id, inviteEmail);
        setProfileNotice(`Приглашение отправлено на ${inviteEmail.trim().toLowerCase()}. Взрослый получит доступ после входа по ссылке.`);
      } else { setProfileNotice(''); }
      setAdultMethod(null); setInviteEmail(''); setProfileError(''); setTab('today');
    } catch (error) { setProfileError(error instanceof Error ? error.message : 'Не удалось сохранить профиль.'); }
  }

  async function exportData(format: 'pdf' | 'excel') {
    setExporting(format); cloud.setError('');
    try {
      if (format === 'pdf') await exportPdf(cloud.profiles, cloud.allMeals);
      else await exportExcel(cloud.profiles, cloud.allMeals);
    } catch (error) { cloud.setError(error instanceof Error ? error.message : 'Не удалось скачать дневник.'); }
    finally { setExporting(null); }
  }

  async function clearData() {
    if (!window.confirm('Удалить все профили семьи и записи из облака? Восстановить их будет нельзя.')) return;
    try {
      await cloud.clearData();
      setProfileDraft(emptyProfile);
      setTab('profile');
    } catch (error) { cloud.setError(error instanceof Error ? error.message : 'Не удалось удалить данные.'); }
  }

  if (!cloud.configured) return <div className="auth-screen"><main className="auth-card"><h1>Нужна настройка Supabase</h1><p>Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local.</p><Link className="button button-primary" to="/">На сайт</Link></main></div>;
  if (!cloud.authReady || (cloud.user && !cloud.loaded)) return <div className="auth-screen"><main className="auth-card"><p>Загружаем ваш дневник…</p></main></div>;
  if (!cloud.user) return <AuthPanel />;

  const profileReady = Boolean(data.profile && targets);
  return <div className="app-shell">
    <aside className="app-sidebar"><Brand compact/><div className="side-caption">ВАШЕ ПРОСТРАНСТВО</div><nav aria-label="Навигация дневника"><button className={tab==='today'?'side-link selected':'side-link'} onClick={() => setTab('today')}><BookOpenText size={19}/> Сегодня</button><button className={tab==='history'?'side-link selected':'side-link'} onClick={() => setTab('history')}><CalendarDays size={19}/> История</button><button className={tab==='profile'?'side-link selected':'side-link'} onClick={() => setTab('profile')}><Settings2 size={19}/> Профиль и данные</button></nav><div className="sidebar-bottom"><span>Облачный дневник</span><p>Профиль и записи хранятся в Supabase, Франкфурт.</p><Link to="/"><ArrowLeft size={16}/> На сайт</Link></div></aside>
    <div className="app-main"><header className="app-topbar"><Link className="app-mobile-brand" to="/">VELLIUM<span>.</span></Link><span>ПИТАНИЕ В ВАШЕМ РИТМЕ</span><button className="app-signout" aria-label="Выйти" title="Выйти" onClick={() => void supabase?.auth.signOut()}><LogOut size={18}/></button><div className="app-profile-pill">{data.profile?.name?.slice(0,1).toUpperCase() || 'V'}</div></header><main className="app-content">{cloud.error && <p className="form-error" role="alert">{cloud.error}</p>}
      <div className="family-switcher" aria-label="Профили семьи">
        <span>ПРОФИЛИ СЕМЬИ</span>
        {cloud.profiles.map(({ id, profile }) => <button key={id} className={cloud.profileId === id ? 'active' : ''} aria-pressed={cloud.profileId === id} onClick={() => { cloud.selectProfile(id); setAdultMethod(null); setInviteEmail(''); }}>{profile.name}</button>)}
        <button className="family-add" onClick={() => setAddChoice(true)}><Plus size={14}/> Добавить взрослого</button>
      </div>
      {profileNotice && <p className="family-notice" role="status">{profileNotice}</p>}
      {!profileReady && tab !== 'profile' ? <div className="welcome-panel"><div className="section-kicker">ДОБРО ПОЖАЛОВАТЬ</div><h1>Начнём с вашего<br/><em>ориентира.</em></h1><p>Заполните профиль, чтобы увидеть дневной баланс. Профиль будет сохранён в вашем аккаунте VELLIUM.</p><button className="button button-primary" onClick={() => setTab('profile')}>Настроить профиль <ArrowRight size={18}/></button></div> : null}

      {tab === 'today' && profileReady && targets && <><div className="app-heading"><div><div className="section-kicker">ВАШ ДНЕВНИК</div><h1>{date===todayKey()?'Сегодня':displayDate}, {data.profile!.name}.</h1><p>Каждый приём пищи — часть общей картины.</p></div><button className="button button-primary" onClick={() => setShowAdd(true)}><Plus size={19}/> Добавить еду</button></div><div className="date-controls"><button aria-label="Предыдущий день" onClick={() => setDate(todayKey(new Date(new Date(`${date}T12:00:00`).getTime()-86400000)))}>←</button><span>{displayDate}</span><button aria-label="Следующий день" disabled={date>=todayKey()} onClick={() => setDate(todayKey(new Date(new Date(`${date}T12:00:00`).getTime()+86400000)))}>→</button><button className="date-today" onClick={() => setDate(todayKey())}>Сегодня</button></div>
      <div className="summary-grid"><div className="calorie-card"><div><span className="card-overline">ЭНЕРГИЯ ЗА ДЕНЬ</span><h2>{sum.kcal.toLocaleString('ru-RU')} <small>/ {targets.kcal.toLocaleString('ru-RU')} ккал</small></h2><p>{sum.kcal>targets.kcal?`Выше ориентира на ${sum.kcal-targets.kcal} ккал`:`Осталось ${left} ккал до ориентира`}</p><button className="card-action" onClick={() => setTab('history')}>Посмотреть историю <ArrowRight size={15}/></button></div><div className="ring-wrap"><Ring value={sum.kcal / targets.kcal * 100}/><div className="ring-center"><strong>{Math.round(sum.kcal / targets.kcal * 100)}%</strong><span>от ориентира</span></div></div></div><div className="macro-card"><span className="card-overline">БАЛАНС БЖУ</span><h3>Питание в деталях</h3><Macro label="Белки" value={sum.protein} target={targets.protein} color="#B9C69D"/><Macro label="Жиры" value={sum.fat} target={targets.fat} color="#C59A71"/><Macro label="Углеводы" value={sum.carbs} target={targets.carbs} color="#D9BE9F"/><small>Ориентиры по формуле приблизительны и не являются медицинской рекомендацией.</small><button className="card-action" onClick={() => setTab('profile')}>Изменить ориентир <ArrowRight size={15}/></button></div></div>
      <div className="app-lower"><section className="meal-list-card"><div className="card-heading"><div><span className="card-overline">ЗАПИСИ ДНЯ</span><h3>Приёмы пищи</h3></div><span className="item-count">{dayMeals.length}</span></div>{dayMeals.length ? <div className="meal-list">{dayMeals.map((meal) => <div className="meal-row" key={meal.id}><div className="meal-icon"><BookOpenText size={20}/></div><div className="meal-details"><strong>{meal.name}</strong><span>{mealLabels[meal.type]} · {meal.grams} г · {new Date(meal.eatenAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span></div><div className="meal-kcal"><strong>{meal.kcal}</strong><span>ккал</span></div><button className="meal-edit" aria-label={`Изменить ${meal.name}`} title="Изменить запись" onClick={() => setEditingMeal(meal)}><Pencil size={17}/></button><button className="meal-remove" aria-label={`Удалить ${meal.name}`} title="Удалить запись" onClick={() => void cloud.removeMeal(meal.id).catch((error) => cloud.setError(error instanceof Error ? error.message : 'Не удалось удалить запись.'))}><X size={17}/></button></div>)}</div> : <div className="empty-meals"><UtensilsIllustration/><h4>Пока здесь тихо</h4><p>Добавьте первый приём пищи, чтобы увидеть баланс дня.</p><button className="text-link" onClick={() => setShowAdd(true)}>Добавить еду <ArrowRight size={17}/></button></div>}</section><NextMealRecommendation target={targets} meals={dayMeals}/></div></>}

      {tab === 'history' && <><div className="app-heading"><div><div className="section-kicker">ВАША ИСТОРИЯ</div><h1>Дни в деталях.</h1><p>Краткий обзор последних записей из вашего аккаунта.</p></div></div><NutritionTrends meals={data.meals} targets={targets}/><div className="history-list">{Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);const key=todayKey(d);const entries=data.meals.filter((m)=>todayKey(new Date(m.eatenAt))===key);const day=totals(entries);return <button key={key} className="history-row" onClick={()=>{setDate(key);setTab('today')}}><span>{d.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})}</span><span>{entries.length} {entries.length===1?'запись':'записей'}</span><strong>{day.kcal} ккал <ArrowRight size={16}/></strong></button>})}</div></>}

      {tab === 'profile' && <><div className="app-heading"><div><div className="section-kicker">ЛИЧНЫЕ НАСТРОЙКИ</div><h1>Ваш ориентир.</h1><p>Расчёт можно изменить в любой момент. Данные хранятся в вашем аккаунте VELLIUM.</p></div></div><div className="profile-layout"><form className="profile-form" onSubmit={saveProfile}>{adultMethod === 'email' && <div className="invite-field"><strong>Приглашение взрослого</strong><p>Создадим семейный профиль и отправим ссылку для входа в отдельный аккаунт. Взрослый увидит только свой профиль и записи.</p><label>Электронная почта взрослого<input required type="email" autoComplete="off" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="adult@example.com"/></label></div>}<div className="form-grid"><label>Ваше имя<input required value={profileDraft.name} onChange={(e)=>setProfileDraft({...profileDraft,name:e.target.value})} placeholder="Как к вам обращаться"/></label><label>Дата рождения<input required type="date" max={todayKey()} value={profileDraft.birthDate} onChange={(e)=>setProfileDraft({...profileDraft,birthDate:e.target.value})}/></label><label>Пол для формулы<select value={profileDraft.sex} onChange={(e)=>setProfileDraft({...profileDraft,sex:e.target.value as Profile['sex']})}><option value="female">Женский</option><option value="male">Мужской</option></select></label><label>Рост, см<input required type="number" min="100" max="250" value={profileDraft.heightCm} onChange={(e)=>setProfileDraft({...profileDraft,heightCm:Number(e.target.value)})}/></label><label>Вес, кг<input required type="number" min="25" max="350" step="0.1" value={profileDraft.weightKg} onChange={(e)=>setProfileDraft({...profileDraft,weightKg:Number(e.target.value)})}/></label><label>Активность<select value={profileDraft.activity} onChange={(e)=>setProfileDraft({...profileDraft,activity:e.target.value as Profile['activity']})}><option value="sedentary">Малоподвижная</option><option value="light">Лёгкая</option><option value="moderate">Умеренная</option><option value="high">Высокая</option></select></label><label>Цель<select value={profileDraft.goal} onChange={(e)=>setProfileDraft({...profileDraft,goal:e.target.value as Profile['goal']})}><option value="maintain">Поддерживать вес</option><option value="lose">Плавно снижать вес</option><option value="gain">Набирать вес</option></select></label><label>Свой ориентир, ккал <small>необязательно</small><input type="number" min="1000" max="6000" value={profileDraft.manualTarget ?? ''} onChange={(e)=>setProfileDraft({...profileDraft,manualTarget:e.target.value?Number(e.target.value):undefined})} placeholder="Рассчитать автоматически"/></label></div><p className="form-help">Формула Миффлина — Сан Жеора даёт примерный ориентир для взрослых. При беременности, кормлении, заболеваниях и специальных пищевых потребностях используйте ориентир, согласованный со специалистом.</p>{profileError && <p className="form-error" role="alert">{profileError}</p>}<button className="button button-primary" type="submit">{adultMethod === 'email' ? 'Сохранить и отправить приглашение' : 'Сохранить профиль'} <ArrowRight size={18}/></button></form><aside className="data-panel"><span className="card-overline">КОНТРОЛЬ ДАННЫХ</span><h3>Всё в ваших руках.</h3><p>Профиль и записи сохраняются в Supabase (Франкфурт) и доступны после входа в аккаунт.</p><p>Скачайте понятный отчёт по всем доступным вам профилям и записям.</p><button disabled={Boolean(exporting)} onClick={() => void exportData('pdf')}><FileText size={18}/> {exporting === 'pdf' ? 'Готовим PDF…' : 'Скачать красивый PDF'}</button><button disabled={Boolean(exporting)} onClick={() => void exportData('excel')}><FileSpreadsheet size={18}/> {exporting === 'excel' ? 'Готовим Excel…' : 'Скачать Excel со всеми данными'}</button>{cloud.profiles.some((item) => item.ownerUserId === cloud.user?.id) && <button className="danger-action" onClick={clearData}><Trash2 size={18}/> Удалить свои профили и записи</button>}</aside></div></>}
    </main><nav className="bottom-nav" aria-label="Мобильная навигация"><button className={tab==='today'?'active':''} onClick={()=>setTab('today')}><BookOpenText size={21}/>Сегодня</button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}><CalendarDays size={21}/>История</button><button className={tab==='profile'?'active':''} onClick={()=>setTab('profile')}><Settings2 size={21}/>Профиль</button></nav></div>

    {addChoice && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddChoice(false); }}><div className="adult-choice" role="dialog" aria-modal="true" aria-labelledby="adult-choice-title"><div className="modal-head"><div><span className="section-kicker">ПРОФИЛИ СЕМЬИ</span><h2 id="adult-choice-title">Добавить взрослого</h2></div><button aria-label="Закрыть" onClick={() => setAddChoice(false)}><X size={22}/></button></div><p>Выберите, как взрослый будет пользоваться дневником.</p><button className="adult-choice-option" onClick={() => { cloud.newProfile(); setProfileDraft(emptyProfile); setAdultMethod('account'); setInviteEmail(''); setProfileError(''); setAddChoice(false); setTab('profile'); }}><strong>Профиль в моём аккаунте</strong><span>Вы ведёте его дневник и переключаете профили здесь.</span><ArrowRight size={18}/></button><button className="adult-choice-option" onClick={() => { cloud.newProfile(); setProfileDraft(emptyProfile); setAdultMethod('email'); setInviteEmail(''); setProfileError(''); setAddChoice(false); setTab('profile'); }}><strong>Пригласить по почте</strong><span>Взрослый войдёт в отдельный аккаунт и увидит свой профиль.</span><ArrowRight size={18}/></button></div></div>}
    {showAdd && <AddMealDialog date={date} onClose={() => setShowAdd(false)} onSave={cloud.addMeal} onSaveMany={cloud.addMeals}/> }
    {editingMeal && <EditMealDialog meal={editingMeal} onClose={() => setEditingMeal(null)} onSave={cloud.updateMeal}/> }
  </div>;
}

function UtensilsIllustration() { return <div className="empty-icon"><BookOpenText size={25} strokeWidth={1.3}/></div>; }
