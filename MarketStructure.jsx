import React, { useMemo, useState } from 'react';
import marketData from './market-ohlcv.json';
import { BarPlot } from '@mui/x-charts/BarChart';
import { LinePlot } from '@mui/x-charts/LineChart';
import { ChartsContainer } from '@mui/x-charts/ChartsContainer';
import { ChartsXAxis } from '@mui/x-charts/ChartsXAxis';
import { ChartsYAxis } from '@mui/x-charts/ChartsYAxis';
import { ChartsTooltip } from '@mui/x-charts/ChartsTooltip';
import { ChartsAxisHighlight } from '@mui/x-charts/ChartsAxisHighlight';
import { useDrawingArea, useXScale, useYScale } from '@mui/x-charts/hooks';

const dates = marketData.map(day => new Date(day.date));
const prices = marketData.flatMap(day => [day.low, day.high]);
const minPrice = Math.min(...prices);
const maxPrice = Math.max(...prices);
const usd = value => `$${Number(value).toFixed(2)}`;
const compact = value => new Intl.NumberFormat('es-PE', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

function Candles() {
  const plot = useDrawingArea();
  const xScale = useXScale('date');
  const yScale = useYScale('price');
  const bandwidth = xScale.bandwidth?.() || plot.width / marketData.length;
  const candleWidth = Math.max(1, Math.min(9, bandwidth * 0.62));
  return <g className="market-candles">{marketData.map(day => {
    const x = xScale(new Date(day.date));
    if (x == null) return null;
    const center = x + bandwidth / 2;
    const high = yScale(day.high), low = yScale(day.low), open = yScale(day.open), close = yScale(day.close);
    const rising = day.close >= day.open;
    const y = Math.min(open, close), bodyHeight = Math.max(1, Math.abs(close - open));
    return <g key={day.date} className={rising ? 'market-candle up' : 'market-candle down'}><title>{`${day.date.slice(0, 10)} · Apertura ${usd(day.open)} · Máximo ${usd(day.high)} · Mínimo ${usd(day.low)} · Cierre ${usd(day.close)} · Volumen ${compact(day.volume)}`}</title><line x1={center} x2={center} y1={high} y2={low} className="candle-wick"/><rect x={center - candleWidth / 2} y={y} width={candleWidth} height={bodyHeight} rx=".7" className="candle-body"/></g>;
  })}</g>;
}

export default function MarketStructure() {
  const [windowSize, setWindowSize] = useState(20);
  const closes = marketData.map(day => day.close);
  const movingAverage = useMemo(() => closes.map((_, index) => index < windowSize - 1
    ? null
    : closes.slice(index - windowSize + 1, index + 1).reduce((sum, value) => sum + value, 0) / windowSize), [windowSize]);
  const series = [
    { type: 'bar', yAxisId: 'volume', label: 'Volumen', color: '#cbd4cd', data: marketData.map(day => day.volume), highlightScope: { highlight: 'item' } },
    { type: 'line', yAxisId: 'price', label: 'Cierre', color: 'transparent', data: closes, showMark: false, curve: 'linear' },
    ...(windowSize ? [{ type: 'line', yAxisId: 'price', label: `Media móvil ${windowSize} días`, color: '#d47a68', data: movingAverage, showMark: false, curve: 'linear' }] : []),
  ];
  return <div className="market-chart"><div className="market-chart-toolbar"><div><b>Serie diaria IBKR</b><span>02 ene — 30 dic 2025 · 249 sesiones</span></div><label>Media móvil<select value={windowSize} onChange={event => setWindowSize(Number(event.target.value))}><option value={0}>Desactivada</option><option value={20}>20 días</option><option value={50}>50 días</option></select></label></div><ChartsContainer series={series} xAxis={[{ id: 'date', data: dates, scaleType: 'band', valueFormatter: value => value.toLocaleDateString('es-PE'), height: 42 }]} yAxis={[{ id: 'price', scaleType: 'linear', position: 'left', width: 64, valueFormatter: usd, domainLimit: (min, max) => ({ min: Math.min(min, minPrice), max: Math.max(max, maxPrice) }) }, { id: 'volume', scaleType: 'linear', position: 'right', width: 58, valueFormatter: compact }]} height={370} margin={{ top: 12, bottom: 0, left: 8, right: 8 }}><ChartsAxisHighlight x="line"/><BarPlot/><LinePlot/><Candles/><ChartsXAxis axisId="date" tickInterval={(_, index) => index % 30 === 0} tickLabelStyle={{ fontSize: 10 }}/><ChartsYAxis axisId="price" label="Precio (USD)" tickLabelStyle={{ fontSize: 10 }}/><ChartsYAxis axisId="volume" label="Volumen" tickLabelStyle={{ fontSize: 10 }}/><ChartsTooltip/></ChartsContainer><div className="market-chart-legend"><span><i className="candle-up-key"/>Cierre ≥ apertura</span><span><i className="candle-down-key"/>Cierre &lt; apertura</span><span><i className="market-ma-key"/>Media móvil</span><span><i className="market-volume-key"/>Volumen</span></div><div className="market-chart-note">Velas OHLC, volumen y media móvil sobre datos bursátiles adjuntos; esta referencia es independiente de las ventas y filtros del CSV de Databodega. Pasa el cursor por una vela para ver apertura, máximo, mínimo, cierre y volumen.</div></div>;
}
