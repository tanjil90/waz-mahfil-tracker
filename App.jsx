import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const bn = n => Number(n || 0).toLocaleString('bn-BD')
const money = n => `৳ ${bn(n)}`
const today = new Date().toISOString().slice(0,10)

function ConfigNotice() {
  return <main className="wrap"><header className="hero"><p>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p><h1>তাফসিরুল কোরআন মাহফিল ২০২৬</h1></header>
    <section className="panel"><h2>Supabase সংযোগ সেটআপ বাকি</h2><p>প্রজেক্টের মূল ফোল্ডারে <code>.env</code> নামে ফাইল তৈরি করে Supabase Project URL এবং anon key বসান। বিস্তারিত README.md ফাইলে আছে।</p></section></main>
}

export default function App() {
  const [path, setPath] = useState(location.pathname)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [donations, setDonations] = useState([])
  const [expenses, setExpenses] = useState([])
  const [methods, setMethods] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('donations')
  const [donor, setDonor] = useState({ donor_name:'', village:'', amount:'', paid_amount:'', payment_method:'নগদ', donation_date:today })
  const [expense, setExpense] = useState({ title:'', amount:'', expense_date:today })

  useEffect(() => {
    const onPop = () => setPath(location.pathname)
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])
  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({data}) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])
  const admin = path.startsWith('/admin')

  async function loadPublic() {
    if (!supabase) return
    const {data, error} = await supabase.from('public_summary').select('*').single()
    if (error) setError(error.message); else setSummary(data)
    setLoading(false)
  }
  async function loadAdmin() {
    if (!supabase || !session) return
    setBusy(true); setError('')
    const [d,e,m] = await Promise.all([
      supabase.from('donations').select('*').order('donation_date',{ascending:false}),
      supabase.from('expenses').select('*').order('expense_date',{ascending:false}),
      supabase.from('payment_methods').select('*').order('name')
    ])
    if (d.error || e.error || m.error) setError(d.error?.message || e.error?.message || m.error?.message)
    setDonations(d.data || []); setExpenses(e.data || []); setMethods(m.data || [])
    setBusy(false)
  }
  useEffect(() => { loadPublic() }, [path])
  useEffect(() => { if (admin && session) loadAdmin() }, [admin, session])

  async function login(e) {
    e.preventDefault(); setError('')
    const fd = new FormData(e.currentTarget)
    const {error} = await supabase.auth.signInWithPassword({email:fd.get('email'), password:fd.get('password')})
    if (error) setError(error.message)
  }
  async function logout() { await supabase.auth.signOut(); history.pushState({},'', '/'); setPath('/') }
  async function addDonation(e) {
    e.preventDefault(); setError('')
    const amount = Number(donor.amount), paid = Number(donor.paid_amount)
    if (!donor.donor_name.trim() || amount <= 0 || paid < 0 || paid > amount) return setError('নাম ও সঠিক টাকার পরিমাণ দিন।')
    const {error} = await supabase.from('donations').insert({...donor, amount, paid_amount:paid, due_amount:amount-paid})
    if (error) setError(error.message); else { setDonor({...donor, donor_name:'', village:'', amount:'', paid_amount:''}); loadAdmin(); loadPublic() }
  }
  async function addExpense(e) {
    e.preventDefault(); setError('')
    if (!expense.title.trim() || Number(expense.amount) <= 0) return setError('খরচের বিবরণ ও সঠিক পরিমাণ দিন।')
    const {error} = await supabase.from('expenses').insert({...expense, amount:Number(expense.amount)})
    if (error) setError(error.message); else { setExpense({...expense,title:'',amount:''}); loadAdmin(); loadPublic() }
  }
  async function removeRow(table, id) {
    if (!confirm('আপনি কি নিশ্চিতভাবে মুছতে চান?')) return
    const {error} = await supabase.from(table).delete().eq('id',id)
    if (error) setError(error.message); else { loadAdmin(); loadPublic() }
  }
  async function exportPdf() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.setFont('helvetica')
    doc.text('Waz Mahfil 2026 - Financial Summary', 14, 18)
    doc.text(`Collected: BDT ${summary?.total_collected || 0}`,14,32)
    doc.text(`Expenses: BDT ${summary?.total_expense || 0}`,14,42)
    doc.text(`Cash balance: BDT ${summary?.cash_balance || 0}`,14,52)
    doc.save('mahfil-summary.pdf')
  }

  if (!supabase) return <ConfigNotice />
  if (!admin) return <main className="wrap">
    <header className="hero"><p>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p><h1>তাফসিরুল কোরআন মাহফিল ২০২৬</h1><h3>ভূইয়ম পূর্বপাড়া যুব সংঘের উদ্যোগে</h3><p>১৯ নভেম্বর বৃহস্পতিবার ও ২০ নভেম্বর শুক্রবার</p><p>মসজিদ প্রাঙ্গণ · বাদ মাগরিব</p></header>
    <section className="stats">
      <article><span>মোট অনুদান</span><strong>{loading ? '…' : money(summary?.total_collected)}</strong></article>
      <article><span>মোট খরচ</span><strong>{loading ? '…' : money(summary?.total_expense)}</strong></article>
      <article><span>অবশিষ্ট নগদ</span><strong>{loading ? '…' : money(summary?.cash_balance)}</strong></article>
    </section>
    <p className="updated">সর্বশেষ আপডেট: {summary?.updated_at ? new Date(summary.updated_at).toLocaleString('bn-BD') : '—'}</p>
    <footer><a href="/admin" onClick={e=>{e.preventDefault();history.pushState({},'','/admin');setPath('/admin')}}>অ্যাডমিন লগইন</a></footer>
    {error && <p className="error">{error}</p>}
  </main>

  return <main className="wrap admin">
    <header className="top"><div><small>ভূইয়ম পূর্বপাড়া যুব সংঘ</small><h1>মাহফিল হিসাব ব্যবস্থাপনা</h1></div><button className="secondary" onClick={logout}>লগআউট</button></header>
    {!session ? <section className="panel narrow"><h2>অ্যাডমিন লগইন</h2><form onSubmit={login}><label>ইমেইল<input name="email" type="email" required /></label><label>পাসওয়ার্ড<input name="password" type="password" required /></label><button>লগইন</button></form>{error&&<p className="error">{error}</p>}</section> :
    <>
      <section className="stats"><article><span>মোট অনুদান</span><strong>{money(summary?.total_collected)}</strong></article><article><span>মোট খরচ</span><strong>{money(summary?.total_expense)}</strong></article><article><span>অবশিষ্ট নগদ</span><strong>{money(summary?.cash_balance)}</strong></article></section>
      <div className="tabs"><button className={tab==='donations'?'active':''} onClick={()=>setTab('donations')}>অনুদান</button><button className={tab==='expenses'?'active':''} onClick={()=>setTab('expenses')}>খরচ</button></div>
      {tab==='donations' ? <><section className="panel"><h2>নতুন অনুদান যোগ করুন</h2><form onSubmit={addDonation} className="formgrid">
        <label>দাতার নাম<input value={donor.donor_name} onChange={e=>setDonor({...donor,donor_name:e.target.value})} required /></label>
        <label>গ্রাম/ঠিকানা<input value={donor.village} onChange={e=>setDonor({...donor,village:e.target.value})} /></label>
        <label>মোট প্রতিশ্রুতি (৳)<input type="number" min="1" value={donor.amount} onChange={e=>setDonor({...donor,amount:e.target.value})} required /></label>
        <label>জমা (৳)<input type="number" min="0" value={donor.paid_amount} onChange={e=>setDonor({...donor,paid_amount:e.target.value})} required /></label>
        <label>জমার মাধ্যম<input value={donor.payment_method} onChange={e=>setDonor({...donor,payment_method:e.target.value})} list="methods" /><datalist id="methods">{methods.map(m=><option key={m.id} value={m.name}/>)}</datalist></label>
        <label>তারিখ<input type="date" value={donor.donation_date} onChange={e=>setDonor({...donor,donation_date:e.target.value})}/></label>
        <button className="wide">অনুদান সংরক্ষণ</button>
      </form></section>
      <section className="panel"><h2>অনুদানের তালিকা</h2>{busy?'লোড হচ্ছে…':<div className="tablewrap"><table><thead><tr><th>নাম</th><th>গ্রাম</th><th>প্রতিশ্রুতি</th><th>জমা</th><th>বাকি</th><th></th></tr></thead><tbody>{donations.map(d=><tr key={d.id}><td>{d.donor_name}</td><td>{d.village}</td><td>{money(d.amount)}</td><td>{money(d.paid_amount)}</td><td>{money(d.due_amount)}</td><td><button className="danger small" onClick={()=>removeRow('donations',d.id)}>মুছুন</button></td></tr>)}</tbody></table></div>}</section></> :
      <><section className="panel"><h2>নতুন খরচ যোগ করুন</h2><form onSubmit={addExpense} className="formgrid"><label>খরচের বিবরণ<input value={expense.title} onChange={e=>setExpense({...expense,title:e.target.value})} required /></label><label>পরিমাণ (৳)<input type="number" min="1" value={expense.amount} onChange={e=>setExpense({...expense,amount:e.target.value})} required /></label><label>তারিখ<input type="date" value={expense.expense_date} onChange={e=>setExpense({...expense,expense_date:e.target.value})}/></label><button className="wide">খরচ সংরক্ষণ</button></form></section>
      <section className="panel"><h2>খরচের তালিকা</h2><div className="tablewrap"><table><thead><tr><th>বিবরণ</th><th>পরিমাণ</th><th>তারিখ</th><th></th></tr></thead><tbody>{expenses.map(x=><tr key={x.id}><td>{x.title}</td><td>{money(x.amount)}</td><td>{x.expense_date}</td><td><button className="danger small" onClick={()=>removeRow('expenses',x.id)}>মুছুন</button></td></tr>)}</tbody></table></div></section></>}
      <button className="secondary" onClick={exportPdf}>সারাংশ PDF ডাউনলোড</button>
      {error&&<p className="error">{error}</p>}
    </>}
  </main>
}
