/* 타카마츠 여행 일본어 PWA — app.js */

const STATE = {
  meta: null,
  lessons: [],
  progress: { completed: [], lastVisited: null },
  ttsAvailable: false,
  ttsChecked: false,
  jaVoice: null,
  allVoices: [],
  jaVoiceCandidates: [],
};

const PROGRESS_KEY = 'progress';
const TTS_VOICE_KEY = 'preferredJaVoice'; // voiceURI or name

const PHASE_TAG_CLASS = (phase) => {
  if (!phase) return '';
  if (phase.includes('우동')) return 'udon';
  if (phase.includes('미술관') || phase.includes('박물관') || phase.includes('관광')) return 'museum';
  if (phase.includes('쇼핑') || phase.includes('상점') || phase.includes('편의점')) return 'shop';
  if (phase.includes('비상') || phase.includes('병원') || phase.includes('곤란')) return 'emergency';
  return '';
};

/* ─── 유틸 ─── */
function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderKanaKo(text) {
  return escapeHtml(text).replace(/([↗↘])/g, '<span class="arrow">$1</span>');
}

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(s) {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${m}월 ${day}일 (${dow})`;
}

/* ─── 진도 ─── */
function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      STATE.progress.completed = Array.isArray(parsed.completed) ? parsed.completed : [];
      STATE.progress.lastVisited = parsed.lastVisited || null;
    }
  } catch (_) {}
}
function saveProgress() {
  STATE.progress.lastVisited = new Date().toISOString().slice(0, 10);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(STATE.progress));
}
function toggleComplete(day) {
  const set = new Set(STATE.progress.completed);
  if (set.has(day)) set.delete(day); else set.add(day);
  STATE.progress.completed = Array.from(set).sort((a, b) => a - b);
  saveProgress();
}

/* ─── 오늘 레슨 결정 ─── */
function getTodayLesson() {
  const today = todayMidnight();
  const exact = STATE.lessons.find(l => parseDate(l.date).getTime() === today.getTime());
  if (exact) return { lesson: exact, mode: 'exact' };

  const startD = parseDate(STATE.meta.startDate);
  const endD = parseDate(STATE.meta.endDate);

  if (today.getTime() < startD.getTime()) {
    return { lesson: STATE.lessons[0], mode: 'before' };
  }
  if (today.getTime() > endD.getTime()) {
    return { lesson: STATE.lessons[STATE.lessons.length - 1], mode: 'after' };
  }
  // 범위 내인데 매칭 안 되는 경우 — 가장 가까운 과거 일자
  const sorted = [...STATE.lessons].reverse();
  const fallback = sorted.find(l => parseDate(l.date).getTime() <= today.getTime());
  return { lesson: fallback || STATE.lessons[0], mode: 'fallback' };
}

function dDayLabel() {
  const trip = parseDate(STATE.meta.tripStart);
  const today = todayMidnight();
  const diff = Math.round((trip - today) / (1000 * 60 * 60 * 24));
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return 'D-DAY';
  return `D+${-diff}`;
}

/* ─── TTS ─── */
function isJapaneseVoice(v) {
  // 엄격: lang이 ja로 시작해야만 일본어 보이스로 인정
  return /^ja(-|_|$)/i.test(v.lang || '');
}

function detectJaVoice() {
  if (!('speechSynthesis' in window)) {
    STATE.ttsAvailable = false;
    STATE.jaVoice = null;
    STATE.allVoices = [];
    STATE.jaVoiceCandidates = [];
    return;
  }
  const voices = speechSynthesis.getVoices() || [];
  STATE.allVoices = voices.slice();

  const jaVoices = voices.filter(isJapaneseVoice);
  // 우선순위: localService(오프라인) > default > 그 외
  jaVoices.sort((a, b) => {
    if (a.localService !== b.localService) return a.localService ? -1 : 1;
    if (a.default !== b.default) return a.default ? -1 : 1;
    return 0;
  });
  STATE.jaVoiceCandidates = jaVoices;

  // 사용자가 명시 선택했으면 우선
  const preferred = localStorage.getItem(TTS_VOICE_KEY);
  let picked = null;
  if (preferred) {
    picked = voices.find(v => v.voiceURI === preferred) ||
             voices.find(v => v.name === preferred) || null;
  }
  if (!picked) picked = jaVoices[0] || null;

  STATE.jaVoice = picked;
  STATE.ttsAvailable = !!(picked && isJapaneseVoice(picked));
}

let _voiceListenerAttached = false;
function setupVoiceDetection(onVoicesChanged) {
  if (!('speechSynthesis' in window)) { onVoicesChanged && onVoicesChanged(); return; }
  detectJaVoice();
  if (!_voiceListenerAttached) {
    _voiceListenerAttached = true;
    speechSynthesis.addEventListener('voiceschanged', () => {
      detectJaVoice();
      onVoicesChanged && onVoicesChanged();
    });
  }
  // Chrome/Edge 종종 voiceschanged를 늦게 또는 안 쏨 → 짧은 폴링
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    const before = STATE.jaVoiceCandidates.length;
    detectJaVoice();
    if (STATE.jaVoiceCandidates.length !== before) {
      onVoicesChanged && onVoicesChanged();
    }
    if (STATE.jaVoiceCandidates.length > 0 || attempts > 20) {
      clearInterval(poll);
      onVoicesChanged && onVoicesChanged();
    }
  }, 200);
}

function speakJa(text) {
  if (!('speechSynthesis' in window)) {
    showToast('이 브라우저는 음성 합성을 지원하지 않아요');
    return;
  }
  if (!STATE.ttsAvailable || !STATE.jaVoice) {
    showTtsHelpModal();
    return;
  }
  try {
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.cancel();
    }
    // Chrome 버그 회피: cancel 직후 speak는 가끔 무시됨 → 약간 지연
    setTimeout(() => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.voice = STATE.jaVoice;
      utter.lang = STATE.jaVoice.lang || 'ja-JP';
      utter.rate = 0.9;
      utter.pitch = 1.0;
      utter.onerror = (e) => {
        console.error('[TTS] error', e);
        showToast('발음 재생 실패: ' + (e.error || '알 수 없는 오류'));
      };
      console.log('[TTS] speak with voice:', STATE.jaVoice.name, STATE.jaVoice.lang, '/ text:', text);
      speechSynthesis.speak(utter);
    }, 30);
  } catch (e) {
    console.error('[TTS] exception', e);
    showToast('발음 재생에 실패했어요');
  }
}

function setPreferredVoice(uriOrName) {
  if (!uriOrName) {
    localStorage.removeItem(TTS_VOICE_KEY);
  } else {
    localStorage.setItem(TTS_VOICE_KEY, uriOrName);
  }
  detectJaVoice();
}

function showTtsHelpModal() {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh/i.test(ua) && !isIOS;
  const isWin = /Windows/i.test(ua);

  let platformBlock = '';
  if (isIOS) {
    platformBlock = `
      <h4>iOS / iPadOS</h4>
      <ol>
        <li>설정 앱 → 일반 → 언어 및 지역 → 「다른 언어 추가」 → 일본어 선택</li>
        <li>또는 설정 → 손쉬운 사용 → 음성 콘텐츠 → 음성 → 일본어 다운로드</li>
        <li>다운로드 완료 후 앱을 다시 열어 주세요.</li>
      </ol>`;
  } else if (isAndroid) {
    platformBlock = `
      <h4>Android</h4>
      <ol>
        <li>설정 → 시스템 → 언어 및 입력 → 텍스트 음성 변환 출력</li>
        <li>「Google TTS」 등 엔진 옆 톱니바퀴 → 음성 데이터 설치 → 일본어 선택</li>
        <li>다운로드 완료 후 앱을 다시 열어 주세요.</li>
      </ol>`;
  } else if (isMac) {
    platformBlock = `
      <h4>macOS</h4>
      <ol>
        <li>시스템 설정 → 손쉬운 사용 → 말하기 → 시스템 음성 → 음성 관리</li>
        <li>일본어 음성(Kyoko, Otoya 등) 다운로드</li>
        <li>Safari/Chrome을 다시 시작하세요.</li>
      </ol>`;
  } else if (isWin) {
    platformBlock = `
      <h4>Windows</h4>
      <ol>
        <li>설정 → 시간 및 언어 → 언어 → 「언어 추가」 → 일본어</li>
        <li>설치 후 옵션에서 「음성」 패키지가 포함되었는지 확인</li>
        <li>설정 → 시간 및 언어 → 음성 → 「음성 추가」 → 일본어 선택</li>
        <li>설치가 끝나면 브라우저를 재시작하세요.</li>
      </ol>`;
  } else {
    platformBlock = `
      <h4>일반</h4>
      <ol>
        <li>OS 시스템 설정에서 일본어 언어팩과 음성(TTS) 데이터를 추가로 설치하세요.</li>
        <li>설치 후 브라우저를 재시작하면 발음 듣기가 동작합니다.</li>
      </ol>`;
  }

  const html = `
    <h2>🔇 일본어 음성이 설치되어 있지 않아요</h2>
    <div class="modal-body">
      <p>발음 듣기는 기기에 일본어 TTS(음성 합성) 데이터가 설치되어 있어야 동작합니다.
      웹앱에서는 음성을 직접 설치할 수 없어서, 기기 설정에서 추가해 주세요.</p>
      ${platformBlock}
      <p style="margin-top:12px;color:var(--text-muted);font-size:13px;">
        💡 모바일에서 다운로드한 음성은 한 번만 설치해 두면 다른 앱·웹에서도 모두 쓸 수 있어요.
      </p>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" data-modal-close>알겠어요</button>
    </div>`;
  showModal(html);
}

function showModal(innerHtml) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const card = document.createElement('div');
  card.className = 'modal-card';
  card.innerHTML = innerHtml;
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelectorAll('[data-modal-close]').forEach(b => b.addEventListener('click', close));
}

function showToast(msg, ms = 2400) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

/* ─── 카드 렌더 ─── */
function renderItemCard(item, kind /* 'sentence'|'response'|'followup' */) {
  const cls =
    kind === 'response' ? 'lesson-card response' :
    kind === 'followup' ? 'lesson-card followup' :
    'lesson-card';
  const labelHtml =
    kind === 'sentence' ? `<div class="card-label me-first">내가 먼저</div>` :
    kind === 'response' ? `<div class="card-label them">상대 응답</div>` :
    `<div class="card-label me-again">내가 다시</div>`;

  const speakBtnTitle = STATE.ttsAvailable ? '발음 듣기' : '일본어 음성 미설치 — 안내 보기';
  const speakBtnLabel = STATE.ttsAvailable ? '🔊 발음 듣기' : '🔇 발음 듣기';

  const tipHtml = item.tip ? `
    <button class="icon-btn tip-toggle" aria-expanded="false">
      <span class="ico">💡</span><span>팁</span><span class="chev">▾</span>
    </button>
    <div class="tip-body hidden">${escapeHtml(item.tip)}</div>
  ` : '';

  const speakBtnHtml = `<button class="icon-btn speak-btn" data-text="${escapeHtml(item.ja)}" title="${speakBtnTitle}">${speakBtnLabel}</button>`;

  return `
    <div class="${cls}">
      ${labelHtml}
      <p class="ja-text">${escapeHtml(item.ja)}</p>
      <p class="furigana">${escapeHtml(item.furigana)}</p>
      <p class="kana-ko">${renderKanaKo(item.kana_ko)}</p>
      <p class="romaji">${escapeHtml(item.romaji)}</p>
      <p class="ko-text">${escapeHtml(item.ko)}</p>
      <div class="card-actions">
        ${speakBtnHtml}
        ${tipHtml ? `<div class="tip-wrap">${tipHtml}</div>` : ''}
      </div>
    </div>`;
}

function renderToday() {
  const container = $('#today-content');
  const notice = $('#out-of-range-notice');
  notice.classList.add('hidden');

  const { lesson, mode } = getTodayLesson();
  if (!lesson) {
    container.innerHTML = '<p>레슨을 찾을 수 없습니다.</p>';
    return;
  }

  const today = todayMidnight();
  const lessonDate = parseDate(lesson.date);

  // 헤더
  $('#header-title').textContent = `타카마츠 여행 일본어`;
  $('#header-date').textContent = formatDate(today);
  $('#header-dday').textContent = dDayLabel();

  // 진행도
  const dayNum = lesson.day;
  const total = STATE.meta.totalDays;
  const completedCount = STATE.progress.completed.length;
  $('#progress-day-label').textContent = `Day ${dayNum} / ${total}`;
  $('#progress-completed-label').textContent = `완료 ${completedCount}일`;
  $('#progress-fill').style.width = `${(completedCount / total) * 100}%`;

  if (mode !== 'exact') {
    let msg = '';
    if (mode === 'before') {
      const days = Math.round((parseDate(STATE.meta.startDate) - today) / 86400000);
      msg = `학습 시작일까지 ${days}일 남았어요. 미리 Day 1을 살펴보세요.`;
    } else if (mode === 'after') {
      msg = `학습 기간이 끝났어요. 마지막 Day ${lesson.day}을 다시 보여드려요.`;
    } else {
      msg = `오늘 일자에 정확히 매칭되는 레슨이 없어 가장 가까운 ${formatDate(lessonDate)}의 Day ${lesson.day}을 보여드려요.`;
    }
    notice.textContent = msg;
    notice.classList.remove('hidden');
  }

  // 본문
  const phaseClass = PHASE_TAG_CLASS(lesson.phase);
  let html = `
    <div class="scene-card">
      <span class="phase-tag ${phaseClass}">${escapeHtml(lesson.phase)}</span>
      <span class="scene-text">${escapeHtml(lesson.scene)}</span>
    </div>
  `;

  (lesson.sentences || []).forEach(s => { html += renderItemCard(s, 'sentence'); });
  (lesson.responses || []).forEach(r => { html += renderItemCard(r, 'response'); });
  (lesson.followUp || []).forEach(f => { html += renderItemCard(f, 'followup'); });

  // 학습 완료 토글
  const isDone = STATE.progress.completed.includes(dayNum);
  html += `
    <button id="complete-toggle" class="complete-toggle ${isDone ? 'done' : ''}" data-day="${dayNum}">
      ${isDone ? '✓ 학습 완료됨 (해제)' : '학습 완료로 표시'}
    </button>
  `;

  container.innerHTML = html;

  // 이벤트 바인딩
  $$('.speak-btn', container).forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-text');
      if (!text) return;
      if (!STATE.ttsAvailable) { showTtsHelpModal(); return; }
      speakJa(text);
    });
  });
  $$('.tip-toggle', container).forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      const body = btn.nextElementSibling;
      if (body) body.classList.toggle('hidden', expanded);
    });
  });
  const ct = $('#complete-toggle', container);
  if (ct) {
    ct.addEventListener('click', () => {
      toggleComplete(dayNum);
      renderToday();
      renderSchedule();
    });
  }
}

function renderSchedule() {
  const grid = $('#schedule-grid');
  const today = todayMidnight().getTime();
  const html = STATE.lessons.map(l => {
    const d = parseDate(l.date);
    const isDone = STATE.progress.completed.includes(l.day);
    const isToday = d.getTime() === today;
    const isFuture = d.getTime() > today;
    let cls = 'day-cell';
    if (isDone) cls += ' done';
    if (isToday) cls += ' today';
    if (isFuture && !isToday) cls += ' future';
    const m = d.getMonth() + 1;
    const dd = d.getDate();
    return `
      <button class="${cls}" data-day="${l.day}">
        <span class="d-num">${l.day}</span>
        <span class="d-date">${m}/${dd}</span>
        <span class="d-tag">${escapeHtml(l.phase || '')}</span>
      </button>
    `;
  }).join('');
  grid.innerHTML = html;

  $$('.day-cell', grid).forEach(cell => {
    cell.addEventListener('click', () => {
      const day = Number(cell.getAttribute('data-day'));
      const lesson = STATE.lessons.find(l => l.day === day);
      if (!lesson) return;
      const d = parseDate(lesson.date);
      if (d.getTime() > today) {
        showToast('아직 잠겨있어요. 그날이 되면 열려요.');
        return;
      }
      // 임시로 해당 날짜 레슨을 보여주기 위해 STATE 오버라이드
      showLessonDirectly(lesson);
      switchView('today');
    });
  });
}

let _override = null;
function showLessonDirectly(lesson) {
  _override = lesson;
  // 헤더만 갱신
  const today = todayMidnight();
  $('#header-date').textContent = formatDate(today);
  $('#header-dday').textContent = dDayLabel();
  const dayNum = lesson.day;
  const total = STATE.meta.totalDays;
  const completedCount = STATE.progress.completed.length;
  $('#progress-day-label').textContent = `Day ${dayNum} / ${total}`;
  $('#progress-completed-label').textContent = `완료 ${completedCount}일`;
  $('#progress-fill').style.width = `${(completedCount / total) * 100}%`;
  $('#out-of-range-notice').classList.add('hidden');

  const container = $('#today-content');
  const phaseClass = PHASE_TAG_CLASS(lesson.phase);
  let html = `
    <div class="scene-card">
      <span class="phase-tag ${phaseClass}">${escapeHtml(lesson.phase)}</span>
      <span class="scene-text">${escapeHtml(lesson.scene)}</span>
    </div>
  `;
  (lesson.sentences || []).forEach(s => { html += renderItemCard(s, 'sentence'); });
  (lesson.responses || []).forEach(r => { html += renderItemCard(r, 'response'); });
  (lesson.followUp || []).forEach(f => { html += renderItemCard(f, 'followup'); });

  const isDone = STATE.progress.completed.includes(dayNum);
  html += `
    <button id="complete-toggle" class="complete-toggle ${isDone ? 'done' : ''}" data-day="${dayNum}">
      ${isDone ? '✓ 학습 완료됨 (해제)' : '학습 완료로 표시'}
    </button>
  `;
  container.innerHTML = html;

  $$('.speak-btn', container).forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-text');
      if (!text) return;
      if (!STATE.ttsAvailable) { showTtsHelpModal(); return; }
      speakJa(text);
    });
  });
  $$('.tip-toggle', container).forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      const body = btn.nextElementSibling;
      if (body) body.classList.toggle('hidden', expanded);
    });
  });
  const ct = $('#complete-toggle', container);
  if (ct) {
    ct.addEventListener('click', () => {
      toggleComplete(dayNum);
      showLessonDirectly(lesson);
      renderSchedule();
    });
  }
}

function renderSettings() {
  // 발음 표기 안내
  const ul = $('#pronunciation-guide');
  const guide = STATE.meta.pronunciationGuide || {};
  ul.innerHTML = Object.values(guide).map(v => `<li>${escapeHtml(v)}</li>`).join('');

  // 알림 시간 로드
  const time = (window.notify && window.notify.getTime()) || '09:00';
  $('#notify-time').value = time;
  updateNotifyStatus();

  // TTS 안내 섹션이 없으면 추가
  if (!$('#tts-help-block')) {
    const after = $('.settings-block:nth-of-type(3)') || $('.settings-block');
    const block = document.createElement('section');
    block.className = 'settings-block';
    block.id = 'tts-help-block';
    block.innerHTML = `
      <h2>🔊 발음 듣기 설정</h2>
      <p class="setting-hint" id="tts-status"></p>
      <div class="setting-row" id="tts-picker-row" style="display:block">
        <label for="tts-voice-select" class="setting-label" style="display:block;margin-bottom:6px">일본어 음성 선택</label>
        <select id="tts-voice-select" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);font-family:inherit;font-size:14px"></select>
      </div>
      <div class="setting-actions">
        <button id="tts-test-btn" class="btn btn-primary">🔊 테스트 재생</button>
        <button id="tts-recheck-btn" class="btn btn-secondary">다시 감지</button>
        <button id="tts-help-btn" class="btn btn-secondary">설치 방법 보기</button>
        <button id="tts-show-all-btn" class="btn btn-secondary">전체 음성 목록</button>
      </div>
      <div id="tts-all-voices" class="info-card hidden" style="margin-top:10px;font-size:12px;max-height:240px;overflow:auto"></div>
    `;
    after.parentNode.insertBefore(block, after.nextSibling);

    $('#tts-help-btn').addEventListener('click', showTtsHelpModal);
    $('#tts-recheck-btn').addEventListener('click', () => {
      detectJaVoice();
      renderSettings();
      renderToday();
      showToast(STATE.ttsAvailable ? '일본어 음성 감지 완료!' : '아직 일본어 음성이 보이지 않아요');
    });
    $('#tts-test-btn').addEventListener('click', () => {
      // 짧은 일본어 샘플
      const sample = 'こんにちは。チェックインをお願いします。';
      if (STATE.ttsAvailable) {
        speakJa(sample);
      } else {
        showTtsHelpModal();
      }
    });
    $('#tts-show-all-btn').addEventListener('click', () => {
      $('#tts-all-voices').classList.toggle('hidden');
    });
    $('#tts-voice-select').addEventListener('change', (e) => {
      const v = e.target.value;
      setPreferredVoice(v);
      updateTtsStatus();
      renderToday();
      showToast(v ? '음성을 변경했어요. 다시 들어보세요.' : '자동 선택으로 되돌렸어요.');
    });
  }
  updateTtsStatus();
  renderVoicePicker();
  renderAllVoicesList();
}

function renderVoicePicker() {
  const sel = $('#tts-voice-select');
  if (!sel) return;
  const candidates = STATE.jaVoiceCandidates || [];
  const cur = STATE.jaVoice ? (STATE.jaVoice.voiceURI || STATE.jaVoice.name) : '';

  if (candidates.length === 0) {
    sel.innerHTML = `<option value="">(감지된 일본어 음성 없음)</option>`;
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  let html = `<option value="">자동 선택 (추천)</option>`;
  candidates.forEach(v => {
    const id = v.voiceURI || v.name;
    const tag = [];
    if (v.localService) tag.push('오프라인');
    if (v.default) tag.push('기본');
    const label = `${v.name} [${v.lang}]${tag.length ? ' · ' + tag.join('/') : ''}`;
    const selected = id === cur ? 'selected' : '';
    html += `<option value="${escapeHtml(id)}" ${selected}>${escapeHtml(label)}</option>`;
  });
  sel.innerHTML = html;

  // 사용자 명시 선택이 있으면 그걸 표시
  const preferred = localStorage.getItem(TTS_VOICE_KEY);
  if (preferred) {
    const opt = Array.from(sel.options).find(o => o.value === preferred);
    if (opt) sel.value = preferred;
  } else {
    sel.value = '';
  }
}

function renderAllVoicesList() {
  const box = $('#tts-all-voices');
  if (!box) return;
  const voices = STATE.allVoices || [];
  if (voices.length === 0) {
    box.innerHTML = '<p>감지된 음성이 없습니다. 잠시 후 「다시 감지」를 눌러보세요.</p>';
    return;
  }
  const rows = voices.map(v => {
    const isJa = isJapaneseVoice(v);
    const flag = isJa ? '🇯🇵' : '·';
    const tag = [];
    if (v.localService) tag.push('local');
    if (v.default) tag.push('default');
    return `<div style="padding:4px 0;border-bottom:1px solid var(--border)">
      ${flag} <strong>${escapeHtml(v.name)}</strong> <span style="color:var(--text-muted)">[${escapeHtml(v.lang)}]</span>
      ${tag.length ? '<span style="color:var(--text-muted)"> ' + tag.join(', ') + '</span>' : ''}
    </div>`;
  }).join('');
  box.innerHTML = `<p style="margin:0 0 6px;color:var(--text-muted)">총 ${voices.length}개 · 🇯🇵 = ja-* 보이스</p>${rows}`;
}

function updateTtsStatus() {
  const el = $('#tts-status');
  if (!el) return;
  if (!('speechSynthesis' in window)) {
    el.innerHTML = '이 브라우저는 음성 합성을 지원하지 않습니다.';
    return;
  }
  const jaCount = (STATE.jaVoiceCandidates || []).length;
  if (STATE.ttsAvailable && STATE.jaVoice) {
    const name = STATE.jaVoice.name;
    const lang = STATE.jaVoice.lang;
    el.innerHTML = `✅ 일본어 음성 사용 중<br>
      <span style="color:var(--text-muted)">${escapeHtml(name)} [${escapeHtml(lang)}] · 후보 ${jaCount}개</span>`;
  } else if (jaCount > 0) {
    el.innerHTML = `⚠️ 일본어 음성 ${jaCount}개 감지되었지만 선택 실패. 아래에서 직접 골라주세요.`;
  } else {
    el.innerHTML = `❌ 일본어 음성이 감지되지 않았어요.<br>
      <span style="color:var(--text-muted)">「설치 방법 보기」 → 일본어 음성 설치 후 「다시 감지」</span>`;
  }
}

function updateNotifyStatus() {
  const el = $('#notify-status');
  if (!el || !window.notify) return;
  el.innerHTML = window.notify.getStatusHtml();
  // 권한 요청 버튼 활성/비활성 갱신
  const permBtn = $('#notify-permission');
  if (permBtn) {
    const canRequest = window.notify.canRequestPermission();
    permBtn.disabled = !canRequest;
    if (!canRequest && window.notify.isIOSNonPWA()) {
      permBtn.textContent = '먼저 홈 화면에 추가해 주세요';
    } else if (Notification && Notification.permission === 'granted') {
      permBtn.textContent = '알림 권한 허용됨';
      permBtn.disabled = true;
    } else {
      permBtn.textContent = '알림 권한 요청';
    }
  }
}

/* ─── 라우팅 ─── */
function switchView(name) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  const view = $(`#view-${name}`);
  if (view) view.classList.add('active');
  if (name === 'today' && !_override) renderToday();
  if (name === 'today' && _override) { /* keep override */ }
  if (name === 'schedule') renderSchedule();
  if (name === 'settings') renderSettings();
  window.scrollTo(0, 0);
}

/* ─── 이벤트 ─── */
function bindGlobalEvents() {
  $$('.tab-btn').forEach(b => {
    b.addEventListener('click', () => {
      const target = b.dataset.view;
      if (target === 'today') _override = null;
      switchView(target);
    });
  });

  $('#banner-close').addEventListener('click', () => {
    $('#in-app-banner').classList.add('hidden');
  });

  // 설정: 알림
  $('#notify-save').addEventListener('click', () => {
    const t = $('#notify-time').value;
    if (window.notify) window.notify.setTime(t);
    showToast(`알림 시간이 ${t}로 저장되었어요`);
    updateNotifyStatus();
  });
  $('#notify-permission').addEventListener('click', async () => {
    if (!window.notify) return;
    const result = await window.notify.requestPermission();
    if (result === 'granted') showToast('알림 권한이 허용되었어요');
    else if (result === 'denied') showToast('알림 권한이 거부되었어요');
    else if (result === 'blocked-ios') showToast('iOS는 홈 화면에 추가한 상태여야 해요');
    updateNotifyStatus();
  });
  $('#notify-test').addEventListener('click', () => {
    if (window.notify) window.notify.testNotify();
  });

  // 진도 초기화
  $('#progress-reset').addEventListener('click', () => {
    if (confirm('학습 진도를 모두 초기화할까요?\n이 동작은 되돌릴 수 없습니다.')) {
      STATE.progress = { completed: [], lastVisited: null };
      localStorage.removeItem(PROGRESS_KEY);
      showToast('진도가 초기화되었어요');
      renderToday();
      renderSchedule();
    }
  });
}

/* ─── Service Worker ─── */
function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('SW 등록 실패:', err);
      });
    });
  }
}

/* ─── 인앱 배너 ─── */
function maybeShowInAppBanner() {
  if (!window.notify) return;
  const should = window.notify.shouldShowInAppBanner();
  if (should) {
    $('#in-app-banner').classList.remove('hidden');
    window.notify.markBannerShown();
  }
}

/* ─── 부트스트랩 ─── */
async function init() {
  loadProgress();
  try {
    const res = await fetch('lessons.json');
    const data = await res.json();
    STATE.meta = data.meta;
    STATE.lessons = data.lessons;
  } catch (e) {
    document.body.innerHTML = '<p style="padding:20px">레슨 데이터를 불러오지 못했습니다. 새로고침 해주세요.</p>';
    return;
  }

  bindGlobalEvents();

  setupVoiceDetection(() => {
    renderToday();
    if ($('#view-settings').classList.contains('active')) {
      renderSettings();
    }
  });
  renderToday();

  if (window.notify) {
    window.notify.init();
    window.notify.scheduleTodayReminder();
  }

  maybeShowInAppBanner();
  registerSW();
}

document.addEventListener('DOMContentLoaded', init);
