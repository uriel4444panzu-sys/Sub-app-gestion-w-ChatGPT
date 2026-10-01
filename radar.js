/* Radar presentation only. Account, subscription and notification logic stays in app.js. */
window.SubpilotRadar = (() => {
  const query = (selector) => document.querySelector(selector);
  const svgNS = 'http://www.w3.org/2000/svg';
  let categorySelection = '';
  let categoryContext = null;

  function animatePanel(panel) {
    if (!panel) return;
    panel.classList.remove('sp-moving');
    void panel.offsetWidth;
    panel.classList.add('sp-moving');
  }

  function renderHomeGauge(total, budget) {
    const gauge = query('.radar-home-gauge');
    const percent = budget > 0 ? Math.min(100, total / budget * 100) : 0;
    gauge.querySelector('span').style.width = `${percent}%`;
    gauge.setAttribute('aria-valuenow', String(Math.round(percent)));
  }

  function ringPath(start, end) {
    const point = (angle, radius) => [64 + radius * Math.cos(angle * Math.PI / 180), 64 + radius * Math.sin(angle * Math.PI / 180)];
    const outerStart = point(start, 57), outerEnd = point(end, 57);
    const innerEnd = point(end, 44), innerStart = point(start, 44);
    return `M${outerStart} A57,57 0 0 1 ${outerEnd} L${innerEnd} A44,44 0 0 0 ${innerStart} Z`;
  }

  function renderDigitalGauges() {
    for (const [id, labelId] of [['budgetDonut', 'budgetPercent'], ['simulationDonut', 'simulationPercent']]) {
      const donut = query(`#${id}`), svg = donut.querySelector('svg'), marks = svg.querySelector('g');
      const percent = Number(query(`#${labelId}`).textContent.replace(/[^0-9.]/g, '')) || 0;
      donut.dataset.overBudget = String(percent > 100);
      svg.setAttribute('aria-label', `${id === 'budgetDonut' ? 'Budget utilisé' : 'Budget après simulation'} : ${percent} %`);
      if (!marks.children.length) {
        for (let index = 0; index < 60; index++) {
          for (const kind of ['track', 'fill']) {
            const path = document.createElementNS(svgNS, 'path');
            path.dataset.index = String(index);
            path.classList.add(`radar-ring-${kind}`);
            marks.append(path);
          }
        }
      }
      for (const path of marks.children) {
        const start = -90 + Number(path.dataset.index) * 6, end = start + 4.8;
        const activeEnd = Math.min(end, -90 + Math.min(100, percent) * 3.6);
        const track = path.classList.contains('radar-ring-track');
        path.setAttribute('d', ringPath(start, track ? end : Math.max(start + .001, activeEnd)));
        path.style.opacity = track || activeEnd > start ? '1' : '0';
      }
    }
  }

  function drawCategoryPie() {
    const { data, total, getCategoryMeta, formatMoney } = categoryContext;
    if (!data.some(item => item.category === categorySelection)) categorySelection = '';
    const svg = query('.sp-pie'), container = query('.sp-pie-sectors'), legend = query('.sp-pie-legend');
    const colors = ['#c2e786', '#7fac8c', '#9eb8ab', '#aac386', '#719f99', '#c4d9b9'];
    const point = (angle, radius) => [120 + radius * Math.cos(angle * Math.PI / 180), 120 + radius * Math.sin(angle * Math.PI / 180)];
    container.replaceChildren();
    legend.replaceChildren();
    let start = -90;
    data.forEach((item, index) => {
      const end = start + (total ? 360 * item.total / total : 0);
      const color = getCategoryMeta(item.category).custom ? item.color : colors[index % colors.length];
      const group = document.createElementNS(svgNS, 'g');
      group.style.fill = color;
      group.style.opacity = categorySelection && categorySelection !== item.category ? '.32' : '1';
      for (let angle = start + .5; angle < end - .5; angle += 5) {
        const next = Math.min(angle + 4, end - .5);
        const outerStart = point(angle, 92), outerEnd = point(next, 92);
        const innerEnd = point(next, 68), innerStart = point(angle, 68);
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', `M${outerStart} A92,92 0 0 1 ${outerEnd} L${innerEnd} A68,68 0 0 0 ${innerStart} Z`);
        group.append(path);
      }
      container.append(group);
      start = end;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.pie = item.category;
      button.setAttribute('aria-pressed', String(categorySelection === item.category));
      const dot = document.createElement('span');dot.className = 'sp-pie-dot';dot.style.background = color;
      const label = document.createElement('span');label.textContent = item.category;
      const small = document.createElement('small');small.textContent = `${total ? Math.round(item.total / total * 100) : 0} % du total`;
      label.append(small);
      const value = document.createElement('strong');value.textContent = formatMoney(item.total);
      button.append(dot, label, value);
      button.addEventListener('click', () => {
        categorySelection = categorySelection === item.category ? '' : item.category;
        drawCategoryPie();
        query(`[data-pie="${CSS.escape(item.category)}"]`).focus();
      });
      legend.append(button);
    });
    const selection = data.find(item => item.category === categorySelection);
    query('.sp-pie-label').textContent = selection ? selection.category.toLocaleUpperCase('fr-FR') : 'TOTAL MENSUEL';
    query('.sp-pie-value').textContent = (selection ? selection.total : total).toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    query('.sp-pie-unit').textContent = selection ? `${total ? Math.round(selection.total / total * 100) : 0} % du total` : '€ / mois';
    query('.sp-pie-heading>span').textContent = `${data.length} catégories`;
    svg.setAttribute('aria-label', `Répartition mensuelle : ${data.length ? data.map(item => `${item.category} ${formatMoney(item.total)}`).join(', ') : 'aucun abonnement'}`);
  }

  function renderBudget(data, total, getCategoryMeta, formatMoney) {
    categoryContext = { data, total, getCategoryMeta, formatMoney };
    renderDigitalGauges();
    drawCategoryPie();
  }

  function collapsePopularServices(container) {
    const remaining = [...container.children].slice(6);
    if (!remaining.length) return;
    const details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('div');
    details.className = 'radar-more-services';
    summary.textContent = `Voir les ${remaining.length} autres services`;
    list.className = 'popular-services';
    list.append(...remaining);
    details.append(summary, list);
    container.append(details);
  }

  return { animatePanel, renderHomeGauge, renderBudget, collapsePopularServices };
})();
