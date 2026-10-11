import React, { useMemo, useState } from 'react';

const colors = ['#1976d2', '#2e7650', '#d47a68', '#8876b2', '#c9954d', '#5a9a6d'];
const centerX = 380, centerY = 270, innerRadius = 72, outerRadius = 190;
const money = value => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(value || 0);
const number = value => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(value || 0);
const point = (radius, angle) => [centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)];
const makeBand = (inner, outer, start, end) => {
  const [x1, y1] = point(outer, start), [x2, y2] = point(outer, end);
  const [x3, y3] = point(inner, end), [x4, y4] = point(inner, start);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${outer} ${outer} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
};

export default function CategoryRadialChart({ rows }) {
  const [metric, setMetric] = useState('revenue');
  const [activeIndex, setActiveIndex] = useState(null);
  const categories = useMemo(() => {
    const grouped = new Map();
    rows.forEach(row => {
      const entry = grouped.get(row.categoria) || { category: row.categoria, revenue: 0, units: 0, stockouts: 0, records: 0 };
      entry.revenue += row.ingresos;
      entry.units += row.unidades_vendidas;
      entry.stockouts += row.quiebre_stock;
      entry.records += 1;
      grouped.set(row.categoria, entry);
    });
    return [...grouped.values()].sort((a, b) => b[metric] - a[metric]);
  }, [rows, metric]);
  const total = categories.reduce((sum, category) => sum + category[metric], 0);
  const maximum = Math.max(0, ...categories.map(category => category[metric]));
  const average = categories.length ? total / categories.length : 0;
  const radiusFor = value => innerRadius + (maximum ? value / maximum : 0) * (outerRadius - innerRadius);
  const selected = activeIndex == null ? null : categories[activeIndex];
  const formatValue = value => metric === 'revenue' ? money(value) : number(value);
  const metricLabel = metric === 'revenue' ? 'Ingresos estimados' : metric === 'units' ? 'Unidades vendidas' : 'Quiebres de stock';
  const step = categories.length ? Math.PI * 2 / categories.length : Math.PI * 2;

  return <div className="category-radial-chart">
    <div className="category-radial-toolbar"><div><b>{metricLabel}</b><span>Por categoría · usa los filtros del dashboard</span></div><label>Indicador<select value={metric} onChange={event => { setMetric(event.target.value); setActiveIndex(null); }}><option value="revenue">Ingresos</option><option value="units">Unidades</option><option value="stockouts">Quiebres</option></select></label></div>
    {!categories.length || total === 0 ? <div className="category-radial-empty">No hay valores para graficar con los filtros seleccionados.</div> : <>
      <svg className="category-radial" viewBox="0 0 760 540" role="group" aria-label={`${metricLabel} agrupados por categoría`}>
        {[.25, .5, .75, 1].map(ratio => <circle key={ratio} cx={centerX} cy={centerY} r={innerRadius + ratio * (outerRadius - innerRadius)} className="category-grid-ring"/>)}
        <circle cx={centerX} cy={centerY} r={radiusFor(average)} className="category-average-ring"/>
        {categories.map((category, index) => {
          const start = -Math.PI / 2 + index * step + step * .055;
          const end = -Math.PI / 2 + (index + 1) * step - step * .055;
          const middle = (start + end) / 2;
          const [labelX, labelY] = point(220, middle);
          const difference = category[metric];
          const share = total ? difference / total * 100 : 0;
          return <g key={category.category} className="category-radial-item" tabIndex={0} role="button" aria-label={`${category.category}: ${formatValue(difference)}, ${share.toFixed(1)} por ciento del total`} onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}>
            <title>{`${category.category} · ${formatValue(difference)} · ${share.toFixed(1)}% del total · ${number(category.records)} registros`}</title>
            <path d={makeBand(innerRadius, radiusFor(difference), start, end)} fill={colors[index % colors.length]} className="category-radial-bar"/>
            <text x={labelX} y={labelY} textAnchor="middle" className="category-radial-label">{category.category}</text>
          </g>;
        })}
        <text x={centerX} y={centerY - 4} textAnchor="middle" className="category-radial-center-label">TOTAL</text>
        <text x={centerX} y={centerY + 18} textAnchor="middle" className="category-radial-center-value">{formatValue(total)}</text>
      </svg>
      <div className="category-radial-legend"><span><i className="category-radial-swatch"/>Valor por categoría</span><span><i className="category-radial-average"/>Promedio entre categorías</span></div>
      <div className="category-radial-detail" aria-live="polite">{selected ? <><b>{selected.category}</b><span>{metricLabel}: {formatValue(selected[metric])}</span><span>{total ? (selected[metric] / total * 100).toFixed(1) : '0.0'}% del total</span><span>{number(selected.records)} registros</span></> : <span>Apunta o enfoca una categoría para ver su aporte al total.</span>}</div>
    </>}
  </div>;
}
