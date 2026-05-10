/* 알림 — 플랫폼 감지 + 권한 + 인앱 배너 + setTimeout 예약 */

(function () {
  const NOTIFY_TIME_KEY = 'notifyTime';
  const LAST_BANNER_KEY = 'lastBannerDate'; // YYYY-MM-DD
  const TIMER_TAG = '__takamatsu_jp_timer';

  function ua() { return navigator.userAgent || ''; }
  function isIOS() { return /iPhone|iPad|iPod/i.test(ua()); }
  function isAndroid() { return /Android/i.test(ua()); }

  function isStandalonePWA() {
    const iosStandalone = window.navigator.standalone === true;
    const otherStandalone = window.matchMedia &&
      window.matchMedia('(display-mode: standalone)').matches;
    return iosStandalone || otherStandalone;
  }

  function isIOSNonPWA() {
    return isIOS() && !isStandalonePWA();
  }

  function getTime() {
    return localStorage.getItem(NOTIFY_TIME_KEY) || '09:00';
  }
  function setTime(t) {
    localStorage.setItem(NOTIFY_TIME_KEY, t);
    scheduleTodayReminder();
  }

  function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function nowMinutes() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
  function timeStrToMinutes(s) {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  }

  function shouldShowInAppBanner() {
    const last = localStorage.getItem(LAST_BANNER_KEY);
    if (last === todayStr()) return false;
    const target = timeStrToMinutes(getTime());
    return nowMinutes() >= target;
  }
  function markBannerShown() {
    localStorage.setItem(LAST_BANNER_KEY, todayStr());
  }

  function canRequestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return false;
    if (isIOSNonPWA()) return false;
    return true;
  }

  async function requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (isIOSNonPWA()) return 'blocked-ios';
    try {
      const result = await Notification.requestPermission();
      return result;
    } catch {
      return 'denied';
    }
  }

  async function fireNotification(title, body, extraOpts) {
    if (!('Notification' in window)) {
      return { ok: false, reason: '이 브라우저는 알림 API를 지원하지 않습니다.' };
    }
    if (Notification.permission !== 'granted') {
      return { ok: false, reason: '알림 권한이 허용되지 않았습니다.' };
    }
    const options = Object.assign({
      body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: 'daily-lesson',
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
      renotify: true,
    }, extraOpts || {});

    // SW 우선 (PWA + 모바일에서 표준 경로)
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, options);
        console.log('[notify] SW.showNotification OK', { title, options });
        return { ok: true, via: 'sw' };
      } catch (e) {
        console.warn('[notify] SW.showNotification 실패:', e);
        // 직접 경로로 폴백 시도 (Android Chrome PWA에서는 throw할 수 있음)
      }
    }

    try {
      new Notification(title, options);
      console.log('[notify] new Notification OK', { title, options });
      return { ok: true, via: 'direct' };
    } catch (e) {
      console.error('[notify] new Notification 실패:', e);
      return { ok: false, reason: '알림 전송 실패: ' + (e.message || e.name || '알 수 없는 오류') };
    }
  }

  async function testNotify() {
    if (!('Notification' in window)) {
      alert('이 브라우저는 알림을 지원하지 않습니다.');
      return;
    }
    if (Notification.permission !== 'granted') {
      alert('먼저 알림 권한을 허용해 주세요. (설정 화면 상단의 「알림 권한 요청」 버튼)');
      return;
    }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg || !reg.active) {
        alert('Service Worker가 아직 활성화되지 않았어요. 페이지를 한 번 새로고침한 뒤 다시 시도해 주세요.');
        return;
      }
    }
    const result = await fireNotification(
      '타카마츠 JP — 테스트 ✨',
      '알림이 정상적으로 동작합니다. 이 알림이 보이면 OK!',
      {
        tag: 'test-' + Date.now(),
        requireInteraction: true,
        renotify: true,
      }
    );
    if (result.ok) {
      // 즉시 피드백 (시스템 알림이 안 보일 때를 대비)
      if (typeof window.showToast === 'function') {
        window.showToast('알림을 보냈어요. 화면 상단을 내려 알림 영역도 확인해 주세요.');
      } else {
        alert('알림을 보냈어요. 화면 상단의 알림 영역도 확인해 주세요.');
      }
    } else {
      alert('알림 전송 실패: ' + result.reason +
        '\n\n진단: F12 콘솔 또는 Chrome DevTools에서 [notify] 로그를 확인해 주세요.');
    }
  }

  function scheduleTodayReminder() {
    if (window[TIMER_TAG]) {
      clearTimeout(window[TIMER_TAG]);
      window[TIMER_TAG] = null;
    }
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const target = timeStrToMinutes(getTime());
    const now = nowMinutes();
    if (target <= now) return; // 이미 지난 시각

    const ms = (target - now) * 60 * 1000;
    window[TIMER_TAG] = setTimeout(() => {
      fireNotification('오늘의 일본어 학습 📖', '타카마츠 여행 준비, 오늘 한 걸음 더!');
    }, ms);
  }

  function getStatusHtml() {
    const lines = [];
    const platform = isIOS() ? 'iOS' : isAndroid() ? 'Android' : '데스크톱';
    const pwa = isStandalonePWA() ? '홈 화면에서 실행 중 ✓' : '브라우저에서 실행 중';
    lines.push(`현재 환경: ${platform} · ${pwa}`);

    if (!('Notification' in window)) {
      lines.push('이 브라우저는 알림 API를 지원하지 않습니다.');
    } else {
      let p = '미정';
      if (Notification.permission === 'granted') p = '허용됨 ✅';
      else if (Notification.permission === 'denied') p = '거부됨 ❌';
      lines.push(`알림 권한: ${p}`);
    }
    if (isIOSNonPWA()) {
      lines.push('⚠️ iOS Safari에서 알림을 받으려면 먼저 「공유 → 홈 화면에 추가」로 PWA를 설치해야 합니다.');
    }
    return lines.map(l => `<span style="display:block">${l}</span>`).join('');
  }

  function init() {
    // 페이지 진입 시 setTimeout 예약 (오늘분만)
    scheduleTodayReminder();
  }

  window.notify = {
    init,
    isIOS,
    isAndroid,
    isStandalonePWA,
    isIOSNonPWA,
    canRequestPermission,
    requestPermission,
    getTime,
    setTime,
    scheduleTodayReminder,
    fireNotification,
    testNotify,
    getStatusHtml,
    shouldShowInAppBanner,
    markBannerShown,
  };
})();
