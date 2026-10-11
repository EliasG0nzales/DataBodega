import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import LoginScreen from './LoginScreen.jsx';
import LoadingScreen from './LoadingScreen.jsx';
const MarketStructure = React.lazy(() => import('./MarketStructure.jsx'));
const CategoryRadialChart = React.lazy(() => import('./CategoryRadialChart.jsx'));

const money = n => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n || 0);
const number = n => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(n || 0);
const pct = n => `${(n || 0).toFixed(1)}%`;
const parseCSV = text => {
  const [header, ...lines] = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const keys = header.split(',');
  const parsed = lines.map(line => {
    const cells = line.split(',');
    const row = Object.fromEntries(keys.map((key, i) => [key, cells[i] ?? '']));
    const rawZone = row.zona;
    row.zona = rawZone.trim().toLocaleLowerCase('es') === 'callao' ? 'Callao' : rawZone.trim();
    row.zonaNormalizada = rawZone !== row.zona;
    for (const key of ['precio_unit', 'unidades_vendidas', 'stock_inicio', 'quiebre_stock', 'promocion', 'semana_feriado']) row[key] = Number(row[key]);
    row.ingresos = row.precio_unit * row.unidades_vendidas;
    return row;
  }).filter(r => r.fecha_semana && r.sku);
  const unique = new Map();
  const conflicts = [];
  let duplicateRows = 0;
  const identityFields = ['fecha_semana', 'zona', 'sku', 'producto', 'categoria', 'precio_unit', 'unidades_vendidas', 'stock_inicio', 'quiebre_stock', 'promocion', 'semana_feriado'];
  for (const row of parsed) {
    const key = `${row.fecha_semana}|${row.zona}|${row.sku}`;
    const existing = unique.get(key);
    if (existing) {
      const same = identityFields.every(field => existing[field] === row[field]);
      if (!same) conflicts.push({ key, first: existing, duplicate: row });
      else duplicateRows += 1;
      continue;
    }
    unique.set(key, row);
  }
  return { rows: [...unique.values()], duplicateRows, conflicts, normalizedZones: parsed.filter(r => r.zonaNormalizada).length };
};
const fmtDate = d => new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 6-7"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/></>,
    upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 16v4h16v-4"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    down: <path d="m7 10 5 5 5-5"/>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    alert: <><path d="M10.3 4.3 2.8 17.4a1.8 1.8 0 0 0 1.6 2.7h15.2a1.8 1.8 0 0 0 1.6-2.7L13.7 4.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 3h.01"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Select({ label, value, options, onChange }) {
  return <label className="filter"><span>{label}</span><span className="select-wrap"><select value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><Icon name="down" size={14}/></span></label>;
}

function TrendChart({ data, metric }) {
  const w = 720, h = 240, pad = { l: 52, r: 53, t: 15, b: 34 };
  const maxBar = Math.max(1, ...data.map(d => d.value));
  const maxLine = Math.max(1, ...data.map(d => Math.max(d.low || 0, d.high || 0)));
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
  const step = plotW / Math.max(1, data.length);
  const points = data.map((d, i) => ({ ...d, x: pad.l + step * (i + .5), barY: pad.t + (1 - d.value / maxBar) * plotH, lowY: pad.t + (1 - (d.low || 0) / maxLine) * plotH, highY: pad.t + (1 - (d.high || 0) / maxLine) * plotH }));
  const lowLine = points.map(p => `${p.x},${p.lowY}`).join(' ');
  const highLine = points.map(p => `${p.x},${p.highY}`).join(' ');
  const barWidth = Math.min(32, step * .62);
  const labels = points.filter((_, i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0);
  const rightFormat = metric === 'units' ? money : number;
  return <div className="chart-wrap combo-chart-wrap"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={metric === 'units' ? 'Barras de unidades vendidas y lÃ­neas de precio mÃ­nimo y mÃ¡ximo' : 'Barras de quiebres y lÃ­neas de demanda mÃ­nima y mÃ¡xima'}>
    {[0, 1, 2, 3].map(i => { const y = pad.t + i * plotH / 3; return <g key={i}><line x1={pad.l} x2={w - pad.r} y1={y} y2={y} className="gridline"/><text x={pad.l - 7} y={y + 3} textAnchor="end" className="axis-label">{number(maxBar * (1 - i / 3))}</text><text x={w - pad.r + 7} y={y + 3} textAnchor="start" className="axis-label">{rightFormat(maxLine * (1 - i / 3))}</text></g>; })}
    <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} className="gridline"/>
    {points.map(p => <g key={`bar-${p.label}`}><title>{`${p.label} Â· ${metric === 'units' ? `${number(p.value)} unidades` : `${number(p.value)} quiebres`}`}</title><rect className="combo-bar" x={p.x - barWidth / 2} y={p.barY} width={barWidth} height={Math.max(0, h - pad.b - p.barY)} rx="3"/></g>)}
    <polyline points={lowLine} className="combo-line combo-low"/><polyline points={highLine} className="combo-line combo-high"/>
    {points.map(p => <g key={`points-${p.label}`}><circle cx={p.x} cy={p.lowY} r="3.2" className="combo-point combo-low-point"><title>{`${p.label} Â· ${metric === 'units' ? 'Precio mÃ­nimo' : 'Demanda mÃ­nima'}: ${rightFormat(p.low)}`}</title></circle><circle cx={p.x} cy={p.highY} r="3.2" className="combo-point combo-high-point"><title>{`${p.label} Â· ${metric === 'units' ? 'Precio mÃ¡ximo' : 'Demanda mÃ¡xima'}: ${rightFormat(p.high)}`}</title></circle></g>)}
    {labels.map((p, i) => <text key={p.label} x={p.x} y={h - 8} textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'} className="axis-label">{p.label}</text>)}
    <text x="17" y={h / 2} textAnchor="middle" transform={`rotate(-90 17 ${h / 2})`} className="combo-axis-title">{metric === 'units' ? 'Unidades' : 'Quiebres'}</text><text x={w - 18} y={h / 2} textAnchor="middle" transform={`rotate(90 ${w - 18} ${h / 2})`} className="combo-axis-title">{metric === 'units' ? 'Precio (S/)' : 'Unidades'}</text>
  </svg></div>;
}

function Bars({ data, format = 'money' }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return <div className="bars">{data.map((d, i) => <div className="bar-row" key={d.label}><span className="bar-label" title={d.label}>{d.label}</span><div className="bar-track"><div className={`bar-fill tone-${i % 5}`} style={{ width: `${d.value / max * 100}%` }}/></div><span className="bar-value">{format === 'number' ? number(d.value) : money(d.value)}</span></div>)}</div>;
}

function DonutChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const colors = ['#2e7650', '#62a875', '#97c389', '#c2d99e', '#e2d8a5'];
  let offset = 0;
  const arcs = data.map((item, i) => {
    const length = item.value / total * 100;
    const arc = { ...item, color: colors[i % colors.length], length, offset };
    offset += length;
    return arc;
  });
  return <div className="donut-layout"><div className="donut-graphic"><svg viewBox="0 0 120 120" role="img" aria-label="ParticipaciÃ³n de ingresos por categorÃ­a"><circle cx="60" cy="60" r="43" fill="none" stroke="#edf1ed" strokeWidth="15"/>{arcs.map(a => <circle key={a.label} cx="60" cy="60" r="43" fill="none" stroke={a.color} strokeWidth="15" strokeDasharray={`${a.length} ${100 - a.length}`} strokeDashoffset={-a.offset} pathLength="100" transform="rotate(-90 60 60)"/>)}<text x="60" y="56" textAnchor="middle" className="donut-total-label">TOTAL</text><text x="60" y="72" textAnchor="middle" className="donut-total">{money(total)}</text></svg></div><div className="donut-legend">{arcs.map(a => <div className="donut-legend-row" key={a.label}><span className="donut-swatch" style={{ background: a.color }}/><span className="donut-category">{a.label}</span><b>{pct(a.length)}</b></div>)}</div></div>;
}

function ProductScatter({ data, onSelect }) {
  const w = 620, h = 230, pad = { l: 46, r: 20, t: 16, b: 34 };
  const maxX = Math.max(1, ...data.map(d => d.averagePrice)), maxY = Math.max(1, ...data.map(d => d.unidades));
  const points = data.map((d, i) => ({ ...d, x: pad.l + d.averagePrice / maxX * (w - pad.l - pad.r), y: h - pad.b - d.unidades / maxY * (h - pad.t - pad.b), color: ['#3f8058', '#729f66', '#9aaf60', '#c29a56', '#67889a', '#8b79a5', '#b77564'][i % 7] }));
  return <div className="scatter-wrap"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="ComparaciÃ³n de precio promedio y unidades vendidas por producto">{[0, 1, 2, 3].map(i => { const y = pad.t + i * (h - pad.t - pad.b) / 3; return <g key={i}><line x1={pad.l} x2={w - pad.r} y1={y} y2={y} className="gridline"/><text x={pad.l - 7} y={y + 3} textAnchor="end" className="axis-label">{number(maxY * (1 - i / 3))}</text></g>; })}<line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} className="gridline"/>{points.map(p => <g key={p.sku} className="scatter-point" onClick={() => onSelect(p.sku)} role="button" tabIndex="0" onKeyDown={e => e.key === 'Enter' && onSelect(p.sku)}><title>{`${p.producto} Â· ${money(p.averagePrice)} por unidad Â· ${number(p.unidades)} unidades Â· clic para filtrar`}</title><circle cx={p.x} cy={p.y} r="7" fill={p.color} fillOpacity=".82" stroke="white" strokeWidth="2"/><text x={p.x} y={p.y - 11} textAnchor="middle" className="scatter-label">{p.sku.replace('SKU-', '')}</text></g>)}<text x={w / 2} y={h - 8} textAnchor="middle" className="axis-label">Precio promedio por unidad (S/)</text><text x="11" y={h / 2} textAnchor="middle" transform={`rotate(-90 11 ${h / 2})`} className="axis-label">Unidades vendidas</text></svg><div className="scatter-hint">Cada punto es un producto Â· selecciona un punto para filtrarlo</div></div>;
}

function StockoutHeatmap({ rows }) {
  const weeks = [...new Set(rows.map(r => r.fecha_semana))].sort().slice(-12);
  const zones = [...new Set(rows.map(r => r.zona))].sort();
  const values = new Map();
  rows.forEach(r => { const key = `${r.zona}|${r.fecha_semana}`; values.set(key, (values.get(key) || 0) + r.quiebre_stock); });
  const max = Math.max(1, ...values.values());
  return <div className="heatmap-scroll"><div className="heatmap" style={{ gridTemplateColumns: `104px repeat(${weeks.length}, minmax(24px, 1fr))` }}><span className="heatmap-corner">Zona Â· semana</span>{weeks.map(week => <span className="heatmap-week" key={week}>{new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${week}T00:00:00Z`))}</span>)}{zones.flatMap(z => [<span className="heatmap-zone" key={`zone-${z}`}>{z}</span>, ...weeks.map(week => { const value = values.get(`${z}|${week}`) || 0; const level = value === 0 ? 0 : Math.min(4, Math.ceil(value / max * 4)); return <span key={`${z}-${week}`} className={`heatmap-cell heat-${level}`} title={`${z} Â· ${week}: ${value} quiebres`}>{value || 'Â·'}</span>; })])}</div><div className="heatmap-legend"><span>Menos quiebres</span>{[0, 1, 2, 3, 4].map(n => <i className={`heat-${n}`} key={n}/>)}<span>MÃ¡s quiebres</span></div></div>;
}

function SparkLine({ data, color, format = 'number', metricLabel }) {
  const [activeIndex, setActiveIndex] = useState(null);
  if (!data.length) return <div className="spark-empty">Sin datos semanales</div>;
  const width = 195, height = 42, padX = 4, top = 5, bottom = 37;
  const values = data.map(d => d.value);
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || Math.max(Math.abs(max) * .12, 1);
  const points = data.map((d, i) => ({ ...d, x: padX + i * (width - padX * 2) / Math.max(1, data.length - 1), y: bottom - (d.value - min) / span * (bottom - top) }));
  const line = points.map(p => `${p.x},${p.y}`).join(' ');
  const area = `${padX},${bottom} ${line} ${width - padX},${bottom}`;
  const selectedIndex = Math.min(activeIndex ?? data.length - 1, data.length - 1);
  const selected = points[selectedIndex];
  const printValue = value => format === 'money' ? money(value) : format === 'percent' ? pct(value) : number(value);
  const setFromPointer = event => { const rect = event.currentTarget.getBoundingClientRect(); const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)); setActiveIndex(Math.round(ratio * (data.length - 1))); };
  return <div className="sparkline-control" role="slider" tabIndex={0} aria-label={`${metricLabel} por semana`} aria-valuemin={0} aria-valuemax={data.length - 1} aria-valuenow={selectedIndex} aria-valuetext={`${selected.label}: ${printValue(selected.value)}`} aria-orientation="horizontal" onFocus={() => setActiveIndex(i => i ?? data.length - 1)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setActiveIndex(null); }} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setActiveIndex(i => i === null ? data.length - 1 : (data.length + i + (e.key === 'ArrowLeft' ? -1 : 1)) % data.length); } }} onPointerMove={setFromPointer} onPointerLeave={() => setActiveIndex(null)}>
    <div className="sparkline-meta"><span>{selected.label}</span><b>{printValue(selected.value)}</b></div>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true"><line x1={padX} x2={width - padX} y1={bottom} y2={bottom} className="spark-baseline"/><polygon points={area} fill={color} className="spark-area"/><polyline points={line} fill="none" stroke={color} className="spark-path"/>{selected && <><line x1={selected.x} x2={selected.x} y1={top} y2={bottom} stroke={color} className="spark-highlight"/><circle cx={selected.x} cy={selected.y} r="3.7" fill={color} className="spark-dot"/></>}</svg>
  </div>;
}

function MetricCard({ title, value, foot, icon, tone, series, format, featured = false }) {
  return <article className={`kpi-card ${featured ? 'featured' : ''}`}><div className="kpi-top"><span>{title}</span><span className={`kpi-icon ${tone || ''}`}>{icon}</span></div><strong>{value}</strong><div className="kpi-foot"><span className="kpi-context">{foot}</span>{featured && <span className="trend-chip"><Icon name="arrow" size={13}/> ventas</span>}</div><SparkLine data={series} color={featured ? '#a9d6b6' : tone === 'amber' ? '#c9954d' : tone === 'lilac' ? '#8876b2' : '#5a9a6d'} format={format} metricLabel={title}/></article>;
}

function App() {
  const [sessionReady, setSessionReady] = useState(() => typeof window !== 'undefined' && (localStorage.getItem('databodega-demo-session') === 'true' || sessionStorage.getItem('databodega-demo-session') === 'true'));
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [quality, setQuality] = useState({ duplicateRows: 0, normalizedZones: 0 });
  const [status, setStatus] = useState('loading');
  const [activeSection, setActiveSection] = useState('summary');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fileName, setFileName] = useState('ventas_databodega.csv');
  const [toast, setToast] = useState(null);
  const [zone, setZone] = useState('Todas las zonas');
  const [category, setCategory] = useState('Todas las categorÃ­as');
  const [product, setProduct] = useState('Todos los productos');
  const [range, setRange] = useState('Ãšltimas 12 semanas');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('Semana');
  const [metric, setMetric] = useState('units');

  React.useEffect(() => { fetch('/ventas_databodega.csv').then(r => { if (!r.ok) throw Error(); return r.text(); }).then(t => { const parsed = parseCSV(t); setRows(parsed.rows); setQuality(parsed); setStatus('ready'); }).catch(() => setStatus('error')); }, []);
  React.useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(null), 5200); return () => clearTimeout(timer); }, [toast]);
  const zones = useMemo(() => [...new Set(rows.map(r => r.zona))].sort(), [rows]);
  const categories = useMemo(() => [...new Set(rows.map(r => r.categoria))].sort(), [rows]);
  const productOptions = useMemo(() => [...new Map(rows.map(r => [r.sku, { sku: r.sku, producto: r.producto }])).values()].sort((a, b) => a.producto.localeCompare(b.producto, 'es')), [rows]);
  const dateOptions = useMemo(() => [...new Set(rows.map(r => r.fecha_semana))].sort(), [rows]);
  const filtered = useMemo(() => rows.filter(r => {
    const q = search.toLocaleLowerCase('es');
    const weekCount = range === 'Ãšltimas 12 semanas' ? 12 : range === 'Ãšltimas 13 semanas' ? 13 : range === 'Ãšltimas 26 semanas' ? 26 : range === 'Ãšltimas 52 semanas' ? 52 : 0;
    const cutoff = weekCount ? dateOptions.at(-weekCount) : '';
    return (!cutoff || r.fecha_semana >= cutoff) && (zone === 'Todas las zonas' || r.zona === zone) && (category === 'Todas las categorÃ­as' || r.categoria === category) && (product === 'Todos los productos' || r.sku === product) && (!q || `${r.producto} ${r.sku}`.toLocaleLowerCase('es').includes(q));
  }), [rows, zone, category, product, range, search, dateOptions]);
  const stats = useMemo(() => {
    const revenue = filtered.reduce((s, r) => s + r.ingresos, 0), units = filtered.reduce((s, r) => s + r.unidades_vendidas, 0);
    const stockouts = filtered.filter(r => r.quiebre_stock).length;
    const base = filtered.length || 1;
    return { revenue, units, stockouts, rate: stockouts / base * 100, price: units ? revenue / units : 0, promo: filtered.filter(r => r.promocion).length / base * 100 };
  }, [filtered]);
  const weeklyMetrics = useMemo(() => {
    const group = new Map();
    filtered.forEach(r => {
      const entry = group.get(r.fecha_semana) || { revenue: 0, units: 0, stockouts: 0, promotions: 0, records: 0, zones: new Set() };
      entry.revenue += r.ingresos;
      entry.units += r.unidades_vendidas;
      entry.stockouts += r.quiebre_stock;
      entry.promotions += r.promocion;
      entry.records += 1;
      entry.zones.add(r.zona);
      group.set(r.fecha_semana, entry);
    });
    const all = [...group].sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({ date, label: fmtDate(date), revenue: d.revenue, units: d.units, stockoutRate: d.records ? d.stockouts / d.records * 100 : 0, averagePrice: d.units ? d.revenue / d.units : 0, promotionRate: d.records ? d.promotions / d.records * 100 : 0, zones: d.zones.size }));
    return all;
  }, [filtered]);
  const sparkSeries = metric => weeklyMetrics.map(week => ({ label: week.label, value: week[metric] }));
  const trend = useMemo(() => {
    const group = new Map();
    filtered.forEach(r => {
      const key = period === 'Mes' ? r.fecha_semana.slice(0, 7) : r.fecha_semana;
      const entry = group.get(key) || { value: 0, prices: [], demands: [] };
      entry.value += metric === 'units' ? r.unidades_vendidas : r.quiebre_stock;
      entry.prices.push(r.precio_unit);
      entry.demands.push(r.unidades_vendidas);
      group.set(key, entry);
    });
    const sorted = [...group].sort(([a], [b]) => a.localeCompare(b));
    const step = Math.max(1, Math.ceil(sorted.length / 18));
    return sorted.filter((_, i) => i % step === 0 || i === sorted.length - 1).map(([key, entry]) => ({ value: entry.value, low: Math.min(...(metric === 'units' ? entry.prices : entry.demands)), high: Math.max(...(metric === 'units' ? entry.prices : entry.demands)), label: period === 'Mes' ? new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${key}-01T00:00:00Z`)) : fmtDate(key) }));
  }, [filtered, period, metric]);
  const categoryBars = useMemo(() => {
    const group = new Map(); filtered.forEach(r => group.set(r.categoria, (group.get(r.categoria) || 0) + r.ingresos));
    return [...group].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);
  const products = useMemo(() => {
    const group = new Map(); filtered.forEach(r => { const p = group.get(r.sku) || { sku: r.sku, producto: r.producto, categoria: r.categoria, unidades: 0, ingresos: 0, quiebres: 0 }; p.unidades += r.unidades_vendidas; p.ingresos += r.ingresos; p.quiebres += r.quiebre_stock; group.set(r.sku, p); });
    return [...group.values()].map(p => ({ ...p, averagePrice: p.unidades ? p.ingresos / p.unidades : 0 })).sort((a, b) => b.ingresos - a.ingresos).slice(0, 7);
  }, [filtered]);
  const productRevenueBars = useMemo(() => products.map(p => ({ label: p.producto, value: p.ingresos })), [products]);
  const stockoutsByZone = useMemo(() => { const group = new Map(); filtered.forEach(r => group.set(r.zona, (group.get(r.zona) || 0) + r.quiebre_stock)); return [...group].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); }, [filtered]);
  const stockoutsByProduct = useMemo(() => { const group = new Map(); filtered.forEach(r => group.set(r.sku, { label: r.producto, value: (group.get(r.sku)?.value || 0) + r.quiebre_stock })); return [...group.values()].sort((a, b) => b.value - a.value).slice(0, 7); }, [filtered]);
  const navigate = section => { setActiveSection(section); if (section === 'tracking') setMetric('stockouts'); else setMetric('units'); };
  const upload = async e => { const file = e.target.files?.[0]; if (!file) return; try { const parsed = parseCSV(await file.text()); if (!parsed.rows.length) throw Error('El archivo no contiene filas de ventas vÃ¡lidas.'); setRows(parsed.rows); setQuality(parsed); setStatus('ready'); setFileName(file.name); setToast({ type: 'success', title: 'Archivo subido y conectado', message: `${file.name} Â· ${number(parsed.rows.length)} registros listos` }); } catch (error) { setToast({ type: 'error', title: 'No se pudo cargar el CSV', message: error.message || 'Revisa que tenga las columnas de la base Databodega.' }); } e.target.value = ''; };
  const demoLogin = remember => { if (remember) { localStorage.setItem('databodega-demo-session', 'true'); sessionStorage.removeItem('databodega-demo-session'); } else { sessionStorage.setItem('databodega-demo-session', 'true'); localStorage.removeItem('databodega-demo-session'); } setIsLoading(true); setTimeout(() => { setIsLoading(false); setSessionReady(true); }, 33000); };
  const logout = () => { localStorage.removeItem('databodega-demo-session'); sessionStorage.removeItem('databodega-demo-session'); setIsLoading(false); setSessionReady(false); };
  const allWeeks = rows.length ? `${fmtDate(dateOptions[0])} â€” ${fmtDate(dateOptions.at(-1))}` : 'Cargando perÃ­odosâ€¦';
  const sectionTitle = { summary: 'Resumen', products: 'Productos', tracking: 'Seguimiento', structure: 'Estructura' }[activeSection];
  const trendPanel = <article className="panel trend-panel"><div className="panel-heading"><div><h2>{metric === 'units' ? 'Demanda semanal' : 'Quiebres de stock'}</h2><p>{metric === 'units' ? 'Volumen vendido y rango de precios por semana' : 'Quiebres frente al rango de demanda semanal'}</p></div><div className="trend-controls"><div className="segmented"><button className={metric === 'units' ? 'selected' : ''} onClick={() => setMetric('units')}>Demanda</button><button className={metric === 'stockouts' ? 'selected' : ''} onClick={() => setMetric('stockouts')}>Quiebres</button></div><div className="segmented"><button className={period === 'Semana' ? 'selected' : ''} onClick={() => setPeriod('Semana')}>Semana</button><button className={period === 'Mes' ? 'selected' : ''} onClick={() => setPeriod('Mes')}>Mes</button></div></div></div><TrendChart data={trend} metric={metric}/><div className="combo-legend"><span><i className="legend-bar"/>{metric === 'units' ? 'Unidades vendidas' : 'Quiebres'}</span><span><i className="legend-line low"/>{metric === 'units' ? 'Precio mÃ­nimo' : 'Demanda mÃ­nima'}</span><span><i className="legend-line high"/>{metric === 'units' ? 'Precio mÃ¡ximo' : 'Demanda mÃ¡xima'}</span></div></article>;
  const categoryPanel = <article className="panel category-panel"><div className="panel-heading"><div><h2>Ventas por categorÃ­a</h2><p>DistribuciÃ³n de ingresos</p></div><span className="heading-badge">{categoryBars.length} categorÃ­as</span></div><Bars data={categoryBars}/><div className="panel-foot">Importes estimados a partir de unidades vendidas</div></article>;
  const categoryMixPanel = <article className="panel mix-panel"><div className="panel-heading"><div><h2>Mezcla de ingresos</h2><p>ParticipaciÃ³n por categorÃ­a</p></div></div><DonutChart data={categoryBars}/></article>;
  const productScatterPanel = <article className="panel scatter-panel"><div className="panel-heading"><div><h2>Precio y volumen</h2><p>Compara precio promedio con unidades vendidas</p></div><span className="heading-badge">Top productos</span></div><ProductScatter data={products} onSelect={sku => setProduct(sku)}/></article>;
  const heatmapPanel = <article className="panel heatmap-panel"><div className="panel-heading"><div><h2>Mapa de quiebres</h2><p>Intensidad semanal por zona Â· Ãºltimas 12 semanas</p></div></div><StockoutHeatmap rows={filtered}/></article>;
  const marketPanel = <article className="panel market-panel"><div className="panel-heading"><div><h2>Estructura de mercado</h2><p>Velas OHLC, volumen y media mÃ³vil para la serie adjunta</p></div><span className="heading-badge">249 sesiones</span></div><React.Suspense fallback={<div className="loading">Cargando grÃ¡fico de mercadoâ€¦</div>}><MarketStructure/></React.Suspense></article>;
  const categoryRadialPanel = <article className="panel category-radial-panel"><div className="panel-heading"><div><h2>DistribuciÃ³n radial de ventas</h2><p>Compara categorÃ­as con el mismo filtro de zona, producto y perÃ­odo</p></div><span className="heading-badge">{categoryBars.length} categorÃ­as</span></div><React.Suspense fallback={<div className="loading">Cargando distribuciÃ³n por categorÃ­aâ€¦</div>}><CategoryRadialChart rows={filtered}/></React.Suspense></article>;
  const productTable = <section className="panel product-panel"><div className="panel-heading table-heading"><div><h2>Productos destacados</h2><p>Ordenados por ingreso estimado</p></div><label className="search-box"><Icon name="search" size={16}/><input placeholder="Buscar producto" value={search} onChange={e => setSearch(e.target.value)}/></label></div><div className="table-scroll"><table><thead><tr><th>PRODUCTO</th><th>CATEGORÃA</th><th>UNIDADES</th><th>INGRESOS EST.</th><th>QUIEBRES</th></tr></thead><tbody>{products.map((p, i) => <tr key={p.sku}><td><span className={`product-icon product-${i % 5}`}><Icon name="box" size={16}/></span><span className="product-name"><b>{p.producto}</b><small>{p.sku}</small></span></td><td><span className="category-tag">{p.categoria}</span></td><td>{number(p.unidades)}</td><td className="revenue-cell">{money(p.ingresos)}</td><td><span className={p.quiebres ? 'stock-warning' : 'stock-good'}>{number(p.quiebres)}</span></td></tr>)}{!products.length && <tr><td colSpan="5" className="empty">No hay productos para estos filtros.</td></tr>}</tbody></table></div><div className="table-footer">Mostrando {products.length} de {new Set(filtered.map(r => r.sku)).size} productos <span>Fuente: registros semanales de ventas</span></div></section>;
  const qualityNote = status === 'ready' && <div className={`quality-note ${quality.conflicts.length ? 'has-conflicts' : ''}`}><span className="quality-check">{quality.conflicts.length ? '!' : 'âœ“'}</span><div><span><b>{quality.conflicts.length ? 'Revisar duplicados' : 'Calidad de datos aplicada'}</b> Â· {number(quality.duplicateRows)} filas idÃ©nticas consolidadas Â· {number(quality.normalizedZones)} zonas normalizadas{quality.conflicts.length ? ` Â· ${number(quality.conflicts.length)} claves con valores distintos; se cuenta la primera fila` : ''}</span>{quality.conflicts.length > 0 && <details className="conflict-details"><summary>Ver registros en conflicto</summary><div className="conflict-table-wrap"><table className="conflict-table"><thead><tr><th>SEMANA</th><th>ZONA</th><th>SKU</th><th>PRODUCTO Â· 1.Âº / REPETIDO</th><th>CATEGORÃA Â· 1.Âª / REPETIDA</th><th>PRECIO Â· 1.Âº / REPETIDO</th><th>UNIDADES Â· 1.Âº / REPETIDO</th><th>STOCK Â· 1.Âº / REPETIDO</th><th>QUIEBRE Â· 1.Âº / REPETIDO</th><th>PROMO Â· 1.Âº / REPETIDO</th><th>FERIADO Â· 1.Âº / REPETIDO</th></tr></thead><tbody>{quality.conflicts.slice(0, 30).map((item, i) => <tr key={`${item.key}-${i}`}><td>{item.first.fecha_semana}</td><td>{item.first.zona}</td><td>{item.first.sku}</td><td>{item.first.producto} / {item.duplicate.producto}</td><td>{item.first.categoria} / {item.duplicate.categoria}</td><td>{item.first.precio_unit} / {item.duplicate.precio_unit}</td><td>{number(item.first.unidades_vendidas)} / {number(item.duplicate.unidades_vendidas)}</td><td>{number(item.first.stock_inicio)} / {number(item.duplicate.stock_inicio)}</td><td>{item.first.quiebre_stock} / {item.duplicate.quiebre_stock}</td><td>{item.first.promocion} / {item.duplicate.promocion}</td><td>{item.first.semana_feriado} / {item.duplicate.semana_feriado}</td></tr>)}</tbody></table>{quality.conflicts.length > 30 && <p className="conflict-more">Se muestran 30 de {number(quality.conflicts.length)} claves.</p>}</div></details>}</div></div>;

  if (isLoading) return <LoadingScreen/>;
  if (!sessionReady) return <LoginScreen onLogin={demoLogin}/>;

  return <div className={`app-shell ${sidebarOpen ? '' : 'nav-hidden'}`}>
    <aside className="sidebar">
      <a className="brand" href="#inicio" onClick={() => navigate('summary')}><span className="brand-logo-frame"><img className="brand-logo-image" src="/databodega-logo.jpg" alt="Logo Bodega CafÃ© Aralia"/></span><span className="brand-name">databodega<small>INTELIGENCIA COMERCIAL</small></span></a>
      <div className="nav-caption">ESPACIO DE TRABAJO</div>
      <button className={`nav-link ${activeSection === 'summary' ? 'active' : ''}`} onClick={() => navigate('summary')}><Icon name="grid"/><span>Resumen</span></button>
      <button className={`nav-link ${activeSection === 'products' ? 'active' : ''}`} onClick={() => navigate('products')}><Icon name="box"/><span>Productos</span></button>
      <button className={`nav-link ${activeSection === 'tracking' ? 'active' : ''}`} onClick={() => navigate('tracking')}><Icon name="chart"/><span>Seguimiento</span></button>
      <button className={`nav-link ${activeSection === 'structure' ? 'active' : ''}`} onClick={() => navigate('structure')}><Icon name="layers"/><span>Estructura</span></button>
      <div className="sidebar-bottom"><div className={`source-card ${status === 'ready' ? 'source-connected' : status === 'error' ? 'source-disconnected' : 'source-loading'}`}><span className="source-dot"/><div><b>{status === 'ready' ? 'CSV conectado' : status === 'error' ? 'CSV desconectado' : 'Conectando CSVâ€¦'}</b><small>{status === 'ready' ? fileName : status === 'error' ? 'Carga un archivo para iniciar' : 'Buscando archivo de datos'}</small></div></div><div className="user-card"><div className="avatar">DB</div><div><b>Databodega</b><small>Panel de negocio</small></div><span className="more">Â·Â·Â·</span></div></div>
    </aside>
    <main className="main" id="inicio">
      <header className="topbar"><div className="topbar-leading"><button type="button" className="sidebar-toggle" aria-label={sidebarOpen ? 'Ocultar menÃº lateral' : 'Mostrar menÃº lateral'} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(open => !open)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><div className="breadcrumb">Panel de control <span>/</span> <b>{sectionTitle}</b></div></div><div className="top-actions"><span className={`live connection-status ${status === 'ready' ? 'connected' : status === 'error' ? 'disconnected' : 'connecting'}`}><i/>{status === 'ready' ? 'CSV conectado' : status === 'error' ? 'Sin archivo conectado' : 'Conectandoâ€¦'}</span><label className="upload-button"><Icon name="upload" size={16}/> Cargar CSV<input type="file" accept=".csv,text/csv" onChange={upload}/></label><button type="button" className="logout-button" onClick={logout}>Salir</button></div></header>
      <section className="page-heading"><div><div className="eyebrow"><span/> INFORME COMERCIAL</div><h1>{sectionTitle}</h1><p>{activeSection === 'summary' ? 'Una lectura clara de lo que mueve tu negocio.' : activeSection === 'products' ? 'Compara el desempeÃ±o y el detalle de cada producto.' : activeSection === 'tracking' ? 'Controla los quiebres y la calidad de los datos.' : 'Analiza el mercado y compara las ventas por categorÃ­a.'}</p></div><div className="period-note"><Icon name="calendar" size={16}/><span>{activeSection === 'structure' ? `Ventas: ${allWeeks}` : allWeeks}</span></div></section>
      <section className="filters" aria-label="Filtros del panel"><div className="filter-heading">Explorar datos <span>Â·</span></div><Select label="Zona" value={zone} onChange={setZone} options={['Todas las zonas', ...zones].map(v => ({ value: v, label: v }))}/><Select label="Producto" value={product} onChange={setProduct} options={[{ value: 'Todos los productos', label: 'Todos los productos' }, ...productOptions.map(p => ({ value: p.sku, label: p.producto }))]}/><Select label="CategorÃ­a" value={category} onChange={setCategory} options={['Todas las categorÃ­as', ...categories].map(v => ({ value: v, label: v }))}/><Select label="PerÃ­odo" value={range} onChange={setRange} options={['Ãšltimas 12 semanas', 'Ãšltimas 13 semanas', 'Ãšltimas 26 semanas', 'Ãšltimas 52 semanas', 'Todo el perÃ­odo'].map(v => ({ value: v, label: v }))}/></section>
      {status === 'error' && <div className="connection-alert"><Icon name="alert"/><div><b>El CSV estÃ¡ desconectado</b><span>No encontramos la base local. Carga un archivo CSV para conectar el dashboard.</span></div><label className="upload-button"><Icon name="upload" size={15}/> Cargar archivo<input type="file" accept=".csv,text/csv" onChange={upload}/></label></div>}
      {status === 'loading' && <div className="loading">Conectando con ventas_databodega.csvâ€¦</div>}
      {qualityNote}
      {activeSection === 'summary' && <><section className="kpis" aria-label="Indicadores clave"><MetricCard title="INGRESOS ESTIMADOS" value={money(stats.revenue)} foot="Precio unitario Ã— unidades vendidas" icon={<Icon name="chart"/>} series={sparkSeries('revenue')} format="money" featured/><MetricCard title="UNIDADES VENDIDAS" value={number(stats.units)} foot="Unidades en el perÃ­odo filtrado" icon={<Icon name="box"/>} tone="mint" series={sparkSeries('units')} format="number"/><MetricCard title="QUIEBRES DE STOCK" value={pct(stats.rate)} foot={`${number(stats.stockouts)} registros con quiebre`} icon={<Icon name="alert"/>} tone="amber" series={sparkSeries('stockoutRate')} format="percent"/><MetricCard title="VENTA PROMEDIO / UNIDAD" value={money(stats.price)} foot={`Promociones en ${pct(stats.promo)} de registros`} icon="S/" tone="lilac" series={sparkSeries('averagePrice')} format="money"/></section><section className="content-grid">{trendPanel}{categoryPanel}</section><section className="content-grid summary-mix-grid">{categoryMixPanel}<article className="panel insight-panel"><div className="panel-heading"><div><h2>Lectura del perÃ­odo</h2><p>SeÃ±ales para el siguiente pedido</p></div></div><div className="insight-list"><div><span className="insight-icon green">â†‘</span><p><b>{number(stats.units)} unidades</b><small>vendidas en los filtros seleccionados</small></p></div><div><span className="insight-icon amber">!</span><p><b>{number(stats.stockouts)} registros</b><small>marcados con quiebre de stock</small></p></div><div><span className="insight-icon blue">%</span><p><b>{pct(stats.promo)} con promociÃ³n</b><small>revisa su relaciÃ³n con la demanda</small></p></div></div></article></section></>}
      {activeSection === 'products' && <><section className="content-grid product-charts"><article className="panel category-panel"><div className="panel-heading"><div><h2>Ingresos por producto</h2><p>Productos con mayor venta estimada</p></div><span className="heading-badge">Top {productRevenueBars.length}</span></div><Bars data={productRevenueBars}/><div className="panel-foot">Filtra por zona y perÃ­odo para comparar productos</div></article>{productScatterPanel}</section><section className="content-grid product-trend-grid">{trendPanel}<article className="panel product-unit-panel"><div className="panel-heading"><div><h2>Unidades por categorÃ­a</h2><p>Volumen total dentro de cada categorÃ­a</p></div></div><Bars data={categoryBars.map(c => ({ ...c, value: filtered.filter(r => r.categoria === c.label).reduce((sum, r) => sum + r.unidades_vendidas, 0) }))} format="number"/></article></section>{productTable}</>}
      {activeSection === 'tracking' && <><section className="kpis tracking-kpis"><MetricCard title="REGISTROS CON QUIEBRE" value={number(stats.stockouts)} foot={`De ${number(filtered.length)} registros filtrados`} icon={<Icon name="alert"/>} tone="amber" series={sparkSeries('stockouts')} format="number"/><MetricCard title="TASA DE QUIEBRE" value={pct(stats.rate)} foot="Objetivo del caso: reducir a la mitad" icon="%" tone="amber" series={sparkSeries('stockoutRate')} format="percent"/><MetricCard title="REGISTROS CON PROMOCIÃ“N" value={pct(stats.promo)} foot="Con promociÃ³n activa" icon="%" tone="mint" series={sparkSeries('promotionRate')} format="percent"/><MetricCard title="ZONAS EN SEGUIMIENTO" value={number(new Set(filtered.map(r => r.zona)).size)} foot="Zonas dentro de los filtros" icon={<Icon name="grid"/>} tone="lilac" series={sparkSeries('zones')} format="number"/></section><section className="content-grid tracking-charts">{trendPanel}<article className="panel category-panel"><div className="panel-heading"><div><h2>Quiebres por zona</h2><p>Registros que requieren seguimiento</p></div><span className="heading-badge">{stockoutsByZone.length} zonas</span></div><Bars data={stockoutsByZone} format="number"/></article></section><section className="content-grid tracking-detail-grid">{heatmapPanel}<section className="panel tracking-products"><div className="panel-heading"><div><h2>Quiebres por producto</h2><p>Productos con mÃ¡s registros de quiebre</p></div></div><Bars data={stockoutsByProduct} format="number"/></section></section></>}
      {activeSection === 'structure' && <section className="content-grid structure-grid">{marketPanel}{categoryRadialPanel}</section>}
      <footer className="footer">Databodega <span>Â·</span> Panel de seguimiento comercial <span className="footer-right">Los ingresos son una estimaciÃ³n, no incluyen costos ni margen.</span></footer>
    </main>
    {toast && <div className={`upload-toast ${toast.type}`} role="status" aria-live="polite"><span className="toast-mark">{toast.type === 'success' ? 'âœ“' : '!'}</span><div><b>{toast.title}</b><span>{toast.message}</span></div><button aria-label="Cerrar aviso" onClick={() => setToast(null)}>Ã—</button></div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
