import React from 'react';

export default function LoadingScreen() {
  const backgroundVideo = import.meta.env.PROD
    ? 'https://media.githubusercontent.com/media/EliasG0nzales/DataBodega/main/public/15178508_3840_2160_60fps.mp4'
    : '/15178508_3840_2160_60fps.mp4';
  return <main className="loading-screen" role="status" aria-live="polite">
    <video className="loading-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
      <source src={backgroundVideo} type="video/mp4"/>
    </video>
    <div className="loading-overlay" aria-hidden="true"/>
    <div className="loader">
      <img className="loading-logo" src="/databodega-logo.jpg" alt=""/>
      <div data-glitch="Cargando..." className="glitch">Cargando...</div>
      <span className="loading-caption">Preparando tu espacio de trabajo</span>
    </div>
  </main>;
}
