import React, { useState } from 'react';

function Glyph({ name, size = 20 }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v11H3z"/><path d="M8 21v-7h8v7M9 8h6"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3"/></>,
    eye: <><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3 3.6M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.5 0 2.8-.4 4-1"/></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8m-9 5v9"/></>,
    chart: <><path d="M3 21h18M5 17l5-5 4 3 6-8"/><path d="M5 17v-5m5 5V8m4 7v-3m5 5V7"/></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    personAdd: <><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0m4-11v8m-4-4h8"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function WarehouseArtwork() {
  const [imageFailed, setImageFailed] = useState(false);
  return <div className="warehouse-art" aria-hidden="true">{imageFailed ? <><div className="warehouse-glow"/><div className="warehouse-ceiling"/><div className="warehouse-rack rack-left">{[0, 1, 2, 3].map(row => <div className="rack-level" key={row}><i/><i/><i/></div>)}</div><div className="warehouse-rack rack-right">{[0, 1, 2, 3].map(row => <div className="rack-level" key={row}><i/><i/><i/><i/></div>)}</div><div className="warehouse-floor"/><div className="warehouse-lift"><b/><i/><span/><em/></div></> : <img className="warehouse-photo" src="/warehouse-login.jpg" alt="" onError={() => setImageFailed(true)} referrerPolicy="no-referrer"/>}<div className="warehouse-shade"/></div>;
}

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');
  const submit = event => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setNotice('Ingresa un usuario y una contraseña para continuar.');
      return;
    }
    onLogin(remember);
  };
  return <main className="login-page"><div className="login-diagonal diagonal-top"/><div className="login-diagonal diagonal-bottom"/><section className="login-card">
    <div className="login-showcase"><WarehouseArtwork/><div className="login-showcase-content"><div className="login-brand"><span className="login-logo"><img src="/databodega-logo.jpg" alt="Logo de Bodega"/></span><div><b>BODEGA</b><small>GESTIÓN INTELIGENTE</small></div></div><div className="login-pitch"><h1>Controla tu inventario,<br/><span>impulsa tu negocio</span></h1><p>Ventas, productos y existencias reunidos en un solo lugar.</p></div><div className="login-features"><div><Glyph name="box" size={24}/><b>Inventario</b><span>en tiempo real</span></div><div><Glyph name="chart" size={24}/><b>Reportes</b><span>y estadísticas</span></div><div><Glyph name="shield" size={24}/><b>Mayor control</b><span>y seguimiento</span></div></div></div></div>
    <div className="login-form-panel"><div className="login-form-inner"><div className="login-heading-icon"><Glyph name="home" size={29}/></div><h2>Iniciar sesión</h2><p className="login-subtitle">Ingresa tus credenciales para acceder<br/> a tu panel de bodega.</p><form className="login-form" onSubmit={submit}><label className="login-input"><Glyph name="user"/><input autoComplete="username" placeholder="Usuario" aria-label="Usuario" value={username} onChange={event => setUsername(event.target.value)}/></label><label className="login-input"><Glyph name="lock"/><input autoComplete="current-password" type={showPassword ? 'text' : 'password'} placeholder="Contraseña" aria-label="Contraseña" value={password} onChange={event => setPassword(event.target.value)}/><button type="button" className="password-toggle" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(show => !show)}><Glyph name={showPassword ? 'eyeOff' : 'eye'}/></button></label><div className="login-options"><label className="remember-option"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)}/><span>Recordar mi sesión</span></label><button type="button" className="login-text-button" onClick={() => setNotice('La recuperación de contraseña requiere configurar una cuenta de acceso.')}>¿Olvidaste tu contraseña?</button></div><button type="submit" className="login-submit">Ingresar <Glyph name="arrow" size={19}/></button></form><div className="login-divider"><span/><i>o</i><span/></div><button type="button" className="login-provider" onClick={() => setNotice('El acceso con Google todavía no está configurado.')}><b>G</b>Ingresar con Google</button>{notice && <p className="login-notice" role="status">{notice}</p>}<div className="login-register"><Glyph name="personAdd" size={24}/><span>¿No tienes una cuenta?</span><button type="button" className="login-text-button" onClick={() => setNotice('El registro de usuarios todavía no está configurado.')}>Regístrate</button></div><p className="login-demo-note">Modo de demostración local · las credenciales aún no se validan con un servidor.</p></div></div>
  </section></main>;
}
