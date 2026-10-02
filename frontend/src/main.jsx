import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { Activity, ArrowDownRight, ArrowUpRight, Crosshair, Database, Fingerprint, LockKeyhole, LogOut, RefreshCw, Shield, Terminal, Wifi } from 'lucide-react';
import './style.css';

const api = axios.create({ baseURL: 'http://127.0.0.1:4000/api', withCredentials: true });
function App() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(null);

  async function loadData(access = token) {
    if (!access) return;
    setLoading(true); setError('');
    try {
      const config = { headers: { Authorization: `Bearer ${access}` } };
      const [s, e] = await Promise.all([api.get('/attack-summary', config), api.get('/attack-events', config)]);
      setSummary(s.data); setEvents(e.data.eventos || []); setUpdated(new Date());
    } catch (e) {
      if (e.response?.status === 401) {
        try {
          const { data } = await api.post('/auth/refresh');
          setToken(data.accessToken);
          const config = { headers: { Authorization: `Bearer ${data.accessToken}` } };
          const [s, ev] = await Promise.all([api.get('/attack-summary', config), api.get('/attack-events', config)]);
          setSummary(s.data); setEvents(ev.data.eventos || []); setUpdated(new Date());
          return;
        } catch {
          setToken(''); setSummary(null); setEvents([]);
          setError('La sesión expiró. Inicia sesión de nuevo.');
          return;
        }
      }
      setError(e.response?.data?.message || 'No se pudo conectar con CiberBox Bridge.');
    }
    finally { setLoading(false); }
  }

  async function signIn(e) {
    e.preventDefault(); setError('');
    try { const { data } = await api.post('/auth/login', { email, password }); setToken(data.accessToken); await loadData(data.accessToken); }
    catch (e) { setError(e.response?.data?.message || 'No se pudo iniciar sesión.'); }
  }

  async function signOut() { try { await api.post('/auth/logout'); } finally { setToken(''); setSummary(null); setEvents([]); } }
  useEffect(() => { if (!token) return; const id = setInterval(() => loadData(), 15000); return () => clearInterval(id); }, [token]);

  if (!token) return <main className="login-screen"><div className="login-grid"></div><div className="login-card">
    <div className="brand"><div className="brand-icon"><Crosshair size={23}/></div><div><b>CIBER<span>BOX</span></b><small>SECURITY OPERATIONS</small></div></div>
    <div className="login-copy"><div className="eyebrow"><i/> LABORATORIO ACTIVO</div><h1>Observa cada<br/><em>movimiento.</em></h1><p>Accede al centro de operaciones para revisar la actividad capturada en tu entorno CiberBox.</p></div>
    <form onSubmit={signIn}><label>Correo del agente</label><div className="input-wrap"><Fingerprint size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="agente@ciberbox.local" required /></div><label>Contraseña</label><div className="input-wrap"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••" required /></div>{error&&<div className="error">{error}</div>}<button className="primary-btn">Iniciar sesión <ArrowUpRight size={17}/></button></form>
    <div className="login-foot"><Shield size={14}/> AUTENTICACIÓN PROTEGIDA CON JWT</div>
  </div><div className="login-aside"><span>CB / 01</span><span>ENTORNO CONTROLADO · LOCALHOST</span></div></main>;

  const statusCount = summary?.codigosEstado || {};
  const successful = Object.entries(statusCount).filter(([code])=>Number(code)<400).reduce((a,[,n])=>a+n,0);
  const failed = (summary?.totalIntentos || 0) - successful;
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-icon"><Crosshair size={22}/></div><div><b>CIBER<span>BOX</span></b><small>SECURITY OPERATIONS</small></div></div><div className="nav-label">PLATAFORMA</div><div className="nav-item active"><Activity size={17}/> Vista general <span className="nav-dot"/></div><div className="side-card"><div className="side-card-title"><span className="pulse"/> SESIÓN SEGURA</div><p>Bridge autenticado<br/>mediante JWT</p><div className="side-mono">TOKEN ACTIVO <i>●</i></div></div><div className="sidebar-bottom"><div className="env"><span className="env-led"/>LOCAL LAB ENVIRONMENT</div><button className="logout" onClick={signOut}><LogOut size={16}/> Cerrar sesión</button><div className="version">CIBERBOX PLATFORM <span>v1.0.0</span></div></div></aside>
    <main className="main"><header className="topbar"><div className="crumb">PLATAFORMA <span>/</span> <b>VISTA GENERAL</b></div><div className="top-right"><div className="connection"><span className="pulse"/> SISTEMA EN LÍNEA</div><div className="avatar">CB</div></div></header>
      <section className="content"><div className="page-heading"><div><div className="eyebrow">CENTRO DE OPERACIONES <span>·</span> 01</div><h1>Vista general</h1><p>Monitorea y analiza la actividad capturada en tu laboratorio.</p></div><button className="refresh" onClick={()=>loadData()} disabled={loading}><RefreshCw size={15} className={loading?'spin':''}/> {loading?'Actualizando':'Actualizar datos'}</button></div>
      {error&&<div className="error-banner">{error}</div>}
      <div className="section-label"><span>01</span> RESUMEN DE ACTIVIDAD <i/></div>
      <div className="stats-grid"><article className="stat-card"><div className="stat-top"><div className="stat-icon cyan"><Activity size={18}/></div><span className="stat-tag">CAPTURADOS</span></div><div className="stat-number">{summary?.totalIntentos ?? '—'}</div><div className="stat-caption">Eventos registrados</div><div className="stat-foot"><span className="trend"><ArrowUpRight size={13}/> En tiempo real</span><span>ÚLTIMOS 1.000</span></div></article>
      <article className="stat-card"><div className="stat-top"><div className="stat-icon green"><ArrowDownRight size={18}/></div><span className="stat-tag">RESPUESTA 2XX–3XX</span></div><div className="stat-number">{summary ? successful : '—'}</div><div className="stat-caption">Solicitudes completadas</div><div className="stat-foot"><span className="muted">Respuestas del objetivo</span><span className="tiny-green">● OK</span></div></article>
      <article className="stat-card"><div className="stat-top"><div className="stat-icon red"><ArrowUpRight size={18}/></div><span className="stat-tag">RESPUESTA 4XX–5XX</span></div><div className="stat-number">{summary ? failed : '—'}</div><div className="stat-caption">Respuestas de error</div><div className="stat-foot"><span className="muted">Revisar por endpoint</span><span className="tiny-red">● ALERTA</span></div></article>
      <article className="stat-card"><div className="stat-top"><div className="stat-icon blue"><Database size={18}/></div><span className="stat-tag">RUTAS OBSERVADAS</span></div><div className="stat-number">{summary ? Object.keys(summary.porEndpoint||{}).length : '—'}</div><div className="stat-caption">Endpoints con actividad</div><div className="stat-foot"><span className="muted">Target · puerto 4000</span><span>API</span></div></article></div>
      <div className="section-label endpoints-label"><span>02</span> ENDPOINTS MÁS ACTIVOS <i/><small>ORDENADOS POR EVENTOS</small></div>
      <div className="panel"><div className="panel-head"><div><h2>Actividad por endpoint</h2><p>Distribución de solicitudes registradas por ruta.</p></div><div className="live-label"><span className="pulse"/> LIVE</div></div>
        {!summary || !Object.keys(summary.porEndpoint||{}).length ? <div className="empty"><div className="empty-icon"><Terminal size={21}/></div><b>Esperando actividad</b><span>Las solicitudes enviadas al Target aparecerán aquí.</span></div> : <div className="endpoint-list">{Object.entries(summary.porEndpoint).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([path,count],i)=><div className="endpoint-row" key={path}><div className="endpoint-rank">0{i+1}</div><div className="endpoint-path"><code>{path}</code><div className="bar"><i style={{width:`${Math.max(5,(count/Math.max(...Object.values(summary.porEndpoint)))*100)}%`}}/></div></div><div className="endpoint-count">{count}<small> eventos</small></div></div>)}</div>}
      </div>
      <div className="section-label events-label"><span>03</span> REGISTRO RECIENTE <i/><small>{events.length} EVENTOS</small></div>
      <div className="panel events-panel"><div className="panel-head"><div><h2>Últimos eventos</h2><p>Actividad reciente recibida por CiberBox Logger.</p></div><Wifi size={17} className="wifi"/></div><div className="table-wrap"><table><thead><tr><th>ENDPOINT</th><th>MÉTODO</th><th>ESTADO</th><th>IP ORIGEN</th><th>FECHA Y HORA</th></tr></thead><tbody>{events.slice(0,8).map((ev)=><tr key={ev.id}><td><code>{ev.endpoint}</code></td><td><span className="method">{ev.metodo}</span></td><td><span className={`status ${ev.status_code>=400?'bad':''}`}>{ev.status_code}</span></td><td className="ip">{ev.ip||'—'}</td><td className="date">{new Date(ev.timestamp).toLocaleString('es-EC')}</td></tr>)}</tbody></table>{events.length===0&&<div className="table-empty">Sin eventos todavía · envía una solicitud al Target para comenzar.</div>}</div></div>
      <footer><span>© 2026 CIBERBOX SECURITY LAB</span><span><i className="env-led"/> {updated?`ACTUALIZADO ${updated.toLocaleTimeString('es-EC')}`:'EN ESPERA DE DATOS'}</span></footer>
      </section></main></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
