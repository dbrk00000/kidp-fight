let S = null; // static data
let U = null; // updates data

const BASE = location.hostname === 'localhost' ? '' : '/kidp-fight';

async function loadData() {
  [S, U] = await Promise.all([
    fetch(`${BASE}/data/static.json`).then(r => r.json()),
    fetch(`${BASE}/data/updates.json?t=${Date.now()}`).then(r => r.json()).catch(() => ({ updates: [] }))
  ]);
}

const TAG_COLOR = {
  '최대 화두': 'red', '2026 신규': 'green', '핵심 사업': 'blue',
  '글로벌 트렌드': 'yellow', '글로벌': 'yellow', '산업부 연계': 'purple',
  '공공': 'gray', '사회적 이슈': 'gray'
};
const tag = (t) => t ? `<span class="tag tag-${TAG_COLOR[t]||'gray'}">${t}</span>` : '';

const card = (title, body, tagStr='') => `
  <div class="card">
    <div class="card-header"><span class="card-title">${title}</span>${tag(tagStr)}</div>
    <div class="card-body">${body}</div>
  </div>`;

const sectionTitle = (t) => `<div class="section-title">${t}</div>`;

function formatDate(d) {
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'short' });
}

// ── 탭1: 최신 ────────────────────────────────────────
function renderUpdates() {
  const el = document.getElementById('tab-updates');
  const updates = U?.updates || [];
  const lastFetched = U?.lastFetched
    ? new Date(U.lastFetched).toLocaleString('ko-KR', { month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })
    : '–';

  let html = `<p class="last-updated"><span class="live-dot"></span>마지막 수집: ${lastFetched}</p><br>`;

  if (updates.length === 0) {
    html += `<div class="empty-state"><div class="icon">📭</div><p>자동 수집 대기 중입니다.<br>스케줄 실행 후 새 내용이 표시됩니다.</p></div>`;
    html += sectionTitle('최근 보도자료 (초기 데이터)');
    html += `<div class="card">${S.recentNews.map(n => `
      <div class="news-item">
        <span class="news-date">${n.date.slice(5).replace('-','/')}</span>
        <span class="news-title">${n.title}</span>
        <span class="news-source">${n.source}</span>
      </div>`).join('')}</div>`;
  } else {
    const grouped = {};
    updates.forEach(item => {
      const d = item.date || item.fetchedAt?.split('T')[0] || '날짜 미상';
      (grouped[d] = grouped[d]||[]).push(item);
    });
    Object.keys(grouped).sort((a,b) => b.localeCompare(a)).forEach(date => {
      html += `<div class="archive-date">${formatDate(date)}</div>`;
      grouped[date].forEach(item => {
        html += `<div class="card">
          <div class="card-header"><span class="card-title">${item.title}</span>${tag(item.tag)}</div>
          <div class="card-body">${item.summary}</div>
          ${item.source ? `<div class="card-meta">출처: ${item.source}</div>` : ''}
        </div>`;
      });
    });
  }
  el.innerHTML = html;
}

// ── 탭2: 기관이해 ────────────────────────────────────
function renderOrg() {
  const el = document.getElementById('tab-org');
  const o = S.organization;

  el.innerHTML = `
    ${sectionTitle('기관 기본 정보')}
    <div class="card">${[
      ['기관명', o.name],
      ['영문명', o.englishName],
      ['기관 유형', o.type],
      ['핵심 역할', o.role],
      ['소재지', o.location],
      ['직원 수', o.employees],
      ['현 원장', o.president],
      ['법적 근거', o.legalBasis],
    ].map(([l,v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join('')}</div>

    ${sectionTitle('원장 비전')}
    <div class="card"><div class="card-body accent-text">"${o.presidentVision}"</div></div>

    ${sectionTitle('설립 연혁')}
    <div class="card">${S.history.map(h => `
      <div class="timeline-item">
        <span class="timeline-year">${h.year}</span>
        <span class="timeline-event">${h.event}</span>
      </div>`).join('')}</div>

    ${sectionTitle('법적 근거')}
    ${card(S.legalInfo.mainLaw,
      `<b>${S.legalInfo.article}</b><br>${S.legalInfo.purpose}<br><br>
       <b>예산 조항</b> — ${S.legalInfo.fundingArticle}<br><br>
       <b>관련 법령</b><br>${S.legalInfo.relatedLaws.map(l=>`· ${l}`).join('<br>')}`)}

    ${sectionTitle('유관기관 비교')}
    ${S.relatedOrgs.map(r => card(r.name, r.difference)).join('')}

    ${sectionTitle('주요 논란 (알아두면 좋은 것)')}
    ${S.controversies.map(c => card(c.title, c.content, '유의')).join('')}
  `;
}

// ── 탭3: 사업/정책 ───────────────────────────────────
function renderBiz() {
  const el = document.getElementById('tab-biz');
  el.innerHTML = `
    ${sectionTitle('6대 사업 영역 (탭하면 상세)')}
    ${S.businesses.map(b => `
      <div class="biz-item" id="biz-${b.id}">
        <div class="biz-header" onclick="toggleBiz(${b.id})">
          <span class="biz-icon">${b.icon}</span>
          <span class="biz-name">${b.name}</span>
          <span class="biz-arrow">▼</span>
        </div>
        <div class="biz-body">
          <div class="biz-summary">${b.summary}</div>
          <ul class="biz-programs">${b.programs.map(p=>`<li>${p}</li>`).join('')}</ul>
          <div class="biz-issue">💡 현재 이슈: ${b.issue}</div>
        </div>
      </div>`).join('')}

    ${sectionTitle('정부 정책 연계')}
    ${S.govPolicy.map(p => card(p.title, p.content)).join('')}

    ${sectionTitle('현재 핫이슈')}
    ${S.hotIssues.map(h => card(h.title, h.content, h.tag)).join('')}
  `;
}

function toggleBiz(id) {
  document.getElementById(`biz-${id}`).classList.toggle('open');
}

// ── 탭4: 산업현황 ────────────────────────────────────
function renderStats() {
  const el = document.getElementById('tab-stats');
  const st = S.industryStats;

  el.innerHTML = `
    ${sectionTitle(`디자인 산업 통계 — ${st.baseYear}`)}

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${st.marketSize}</div>
        <div class="stat-label">디자인 산업 규모</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${st.workers.split(' ')[0]}</div>
        <div class="stat-label">종사자 수</div>
      </div>
    </div>

    ${sectionTitle('시장 구성')}
    <div class="card">${st.breakdown.map(b=>`
      <div class="info-row">
        <span class="info-label">${b.label}</span>
        <span class="info-value">${b.value}</span>
      </div>`).join('')}</div>

    ${sectionTitle('주요 트렌드 수치')}
    <div class="card">${st.trends.map(t=>`
      <div class="info-row">
        <span class="info-label" style="min-width:130px">${t.label}</span>
        <span class="info-value accent-num">${t.value}</span>
      </div>`).join('')}</div>

    ${sectionTitle('주요 디자인 분야')}
    <div class="card"><div class="card-body">${st.majorFields.map(f=>`<span class="field-badge">${f}</span>`).join('')}</div></div>

    ${sectionTitle('시사점')}
    ${card('AI 도입 초기 단계', 'AI 활용률 4.9%로 아직 낮지만, KIDP는 AI 학습용 디자인 데이터 구축사업으로 기반 마련 중. 향후 급성장 예상.', '최대 화두')}
    ${card('친환경 디자인 급증', '전년 17.5% → 40.5%로 23%p 급증. ESG 경영 확산과 맞물려 지속가능디자인이 산업 주류로 진입 중.', '글로벌 트렌드')}
    ${card('인력 수급 불균형', '종사자 수 2.7% 감소, 전공 졸업자 2만명 vs 경력자 선호 49.8%. 신입 취업 장벽 해소가 KIDP 핵심 과제.', '사회적 이슈')}
  `;
}

// ── 탭5: 아카이브 ────────────────────────────────────
function renderArchive() {
  const el = document.getElementById('tab-archive');
  const updates = U?.updates || [];

  if (updates.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="icon">🗂️</div><p>자동 수집이 시작되면<br>날짜별로 여기에 쌓입니다.</p></div>`;
    return;
  }

  const grouped = {};
  updates.forEach(item => {
    const d = item.date || item.fetchedAt?.split('T')[0] || '날짜 미상';
    (grouped[d] = grouped[d]||[]).push(item);
  });

  el.innerHTML = Object.keys(grouped).sort((a,b)=>b.localeCompare(a)).map(date => `
    <div class="archive-date">${formatDate(date)}</div>
    ${grouped[date].map(item => `<div class="card">
      <div class="card-header"><span class="card-title">${item.title}</span>${tag(item.tag)}</div>
      <div class="card-body">${item.summary}</div>
      ${item.source ? `<div class="card-meta">출처: ${item.source}</div>` : ''}
    </div>`).join('')}
  `).join('');
}

// ── 탭 전환 ──────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(e => e.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.querySelector(`nav button[data-tab="${name}"]`).classList.add('active');
}

// ── 초기화 ───────────────────────────────────────────
async function init() {
  await loadData();
  renderUpdates();
  renderOrg();
  renderBiz();
  renderStats();
  renderArchive();

  document.querySelectorAll('nav button').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${BASE}/sw.js`);
  }
}

init();
