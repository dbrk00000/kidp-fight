let staticData = null;
let updatesData = null;

async function loadData() {
  const base = location.hostname === 'localhost' ? '' : '/kidp-daily';
  const [s, u] = await Promise.all([
    fetch(`${base}/data/static.json`).then(r => r.json()),
    fetch(`${base}/data/updates.json?t=${Date.now()}`).then(r => r.json()).catch(() => ({ updates: [] }))
  ]);
  staticData = s;
  updatesData = u;
}

function tagClass(tag) {
  const map = { '최대 화두': 'red', '2026 신규': 'green', '핵심 사업': 'blue',
    '글로벌 트렌드': 'yellow', '글로벌': 'yellow', '산업부 연계': 'purple',
    '공공': 'gray', '사회적 이슈': 'gray' };
  return `tag tag-${map[tag] || 'gray'}`;
}

// ── 탭 1: 최신 업데이트 ──────────────────────────────
function renderUpdates() {
  const el = document.getElementById('tab-updates');
  const allUpdates = updatesData?.updates || [];
  const lastFetched = updatesData?.lastFetched
    ? new Date(updatesData.lastFetched).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '–';

  if (allUpdates.length === 0) {
    el.innerHTML = `
      <p class="last-updated"><span class="live-dot"></span>마지막 수집: ${lastFetched}</p>
      <br>
      <div class="empty-state">
        <div class="icon">📭</div>
        <p>아직 자동 수집된 업데이트가 없습니다.<br>스케줄 실행 후 새 내용이 표시됩니다.</p>
      </div>
      <div class="section-title" style="margin-top:24px">최근 보도자료 (초기 데이터)</div>
      ${renderNewsItems(staticData.recentNews)}
    `;
    return;
  }

  // 날짜별 그룹화
  const grouped = {};
  allUpdates.forEach(item => {
    const d = item.date || item.fetchedAt?.split('T')[0] || '날짜 미상';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(item);
  });

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  el.innerHTML = `
    <p class="last-updated"><span class="live-dot"></span>마지막 수집: ${lastFetched}</p>
    <br>
    ${dates.map(date => `
      <div class="archive-date">${formatDate(date)}</div>
      ${grouped[date].map(renderUpdateCard).join('')}
    `).join('')}
  `;
}

function renderUpdateCard(item) {
  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${item.title}</span>
        ${item.tag ? `<span class="${tagClass(item.tag)}">${item.tag}</span>` : ''}
      </div>
      <div class="card-body">${item.summary}</div>
      ${item.source ? `<div style="margin-top:8px;font-size:11px;color:var(--text2)">출처: ${item.source}</div>` : ''}
    </div>
  `;
}

function renderNewsItems(news) {
  return `<div class="card">${news.map(n => `
    <div class="news-item">
      <span class="news-date">${n.date.slice(5).replace('-', '/')}</span>
      <span class="news-title">${n.title}</span>
    </div>
  `).join('')}</div>`;
}

// ── 탭 2: 기관 핵심정보 ──────────────────────────────
function renderOrg() {
  const o = staticData.organization;
  const el = document.getElementById('tab-org');
  el.innerHTML = `
    <div class="section-title">기관 기본 정보</div>
    <div class="card">
      ${[
        ['기관명', o.name],
        ['영문명', o.englishName],
        ['약칭', o.abbreviation],
        ['설립', o.founded],
        ['개칭', o.renamed],
        ['기관 유형', o.type],
        ['역할', o.role],
        ['소재지', o.location],
        ['원장', o.president],
        ['연락처', o.contact],
      ].map(([label, value]) => `
        <div class="info-row">
          <span class="info-label">${label}</span>
          <span class="info-value">${value}</span>
        </div>
      `).join('')}
    </div>

    <div class="section-title">원장 비전 / 방향성</div>
    <div class="card">
      <div class="card-body" style="color:var(--accent2);font-style:italic;line-height:1.8">
        "${o.presidentVision}"
      </div>
    </div>

    <div class="section-title">면접 핵심 포인트</div>
    ${staticData.keyPoints.map(kp => `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${kp.title}</span>
        </div>
        <div class="card-body">${kp.content}</div>
      </div>
    `).join('')}
  `;
}

// ── 탭 3: 6대 사업 ──────────────────────────────────
function renderBusiness() {
  const el = document.getElementById('tab-biz');
  el.innerHTML = `
    <div class="section-title">6대 사업 영역 (탭하면 상세 보기)</div>
    ${staticData.businesses.map(b => `
      <div class="biz-item" id="biz-${b.id}">
        <div class="biz-header" onclick="toggleBiz(${b.id})">
          <span class="biz-icon">${b.icon}</span>
          <span class="biz-name">${b.name}</span>
          <span class="biz-arrow">▼</span>
        </div>
        <div class="biz-body">
          <div class="biz-summary">${b.summary}</div>
          <ul class="biz-programs">
            ${b.programs.map(p => `<li>${p}</li>`).join('')}
          </ul>
          <div class="biz-issue">💡 현재 이슈: ${b.currentIssue}</div>
        </div>
      </div>
    `).join('')}

    <div class="section-title" style="margin-top:24px">현재 핫이슈</div>
    ${staticData.hotIssues.map(h => `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${h.title}</span>
          <span class="${tagClass(h.tag)}">${h.tag}</span>
        </div>
        <div class="card-body">${h.content}</div>
      </div>
    `).join('')}
  `;
}

function toggleBiz(id) {
  const el = document.getElementById(`biz-${id}`);
  el.classList.toggle('open');
}

// ── 탭 4: 아카이브 ──────────────────────────────────
function renderArchive() {
  const el = document.getElementById('tab-archive');
  const allUpdates = updatesData?.updates || [];

  if (allUpdates.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="icon">🗂️</div>
        <p>자동 수집이 시작되면<br>날짜별로 여기에 쌓입니다.</p>
      </div>
    `;
    return;
  }

  const grouped = {};
  allUpdates.forEach(item => {
    const d = item.date || item.fetchedAt?.split('T')[0] || '날짜 미상';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(item);
  });

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  el.innerHTML = dates.map(date => `
    <div class="archive-date">${formatDate(date)}</div>
    ${grouped[date].map(renderUpdateCard).join('')}
  `).join('');
}

// ── 탭 전환 ──────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.querySelector(`nav button[data-tab="${name}"]`).classList.add('active');
}

// ── 유틸 ─────────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

// ── 초기화 ───────────────────────────────────────────
async function init() {
  await loadData();
  renderUpdates();
  renderOrg();
  renderBusiness();
  renderArchive();

  document.querySelectorAll('nav button').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/kidp-daily/sw.js');
  }
}

init();
