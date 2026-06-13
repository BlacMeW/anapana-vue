const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

const app = createApp({
    setup() {
        const isEnglish = ref(false);
        const toggleLanguage = () => isEnglish.value = !isEnglish.value;

        // Session state
        const running = ref(false);
        const seconds = ref(0);
        const breaths = ref(0);
        const rounds = ref(0);
        const breathLog = ref([]);
        
        // Settings
        const breathsPerRound = ref(10);
        const tapMode = ref('round'); // 'breath' | 'round'
        const roundTarget = ref(0);
        const inhaleTarget = ref(3);
        const exhaleTarget = ref(3);
        
        const targetDuration = computed(() => Math.max(0.5, inhaleTarget.value + exhaleTarget.value));
        
        // UI State
        const tapFlash = ref(false);
        const rejectFlash = ref(false);
        const breathPop = ref(false);
        const roundPop = ref(false);
        const showBadge = ref(false);
        const badgeText = ref('');
        const breathBadgeClass = ref('');
        const showTargetBanner = ref(false);
        const showResultBtn = ref(false);
        const wakeLockEnabled = ref(false);
        const wakeLockSupported = ref(false);
        const history = ref([]);
        const showResultModal = ref(false);
        const showHistoryModal = ref(false);
        const showAboutModal = ref(false);
        const isViewingHistory = ref(false);
        const historyDateLabel = ref('');
        const resultStats = ref(null);
        const samadhiStats = ref(null);
        
        // Timers and refs
        let timerId = null;
        let lastTapMs = null;
        let twoFingerLast = 0;
        let wakeLockSentinel = null;
        let badgeTimeout = null;
        
        // Computed
        const formattedTime = computed(() => {
            const m = Math.floor(seconds.value / 60).toString().padStart(2, '0');
            const s = (seconds.value % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        });
        
        const displayBreaths = computed(() => {
            return tapMode.value === 'round' ? rounds.value * breathsPerRound.value : breaths.value;
        });

        const displayBreathsPerRoundSub = computed(() => {
            return isEnglish.value ? 'per ' + breathsPerRound.value : breathsPerRound.value + ' ကြိမ် ၁ ဝါရ';
        });

        const displayRoundTarget = computed(() => {
            return roundTarget.value > 0 ? rounds.value + '/' + roundTarget.value + '  ×' + breathsPerRound.value : '×' + breathsPerRound.value;
        });
        
        const overlayHintMain = computed(() => {
            if (tapMode.value === 'round') {
                return isEnglish.value ? `Tap after every ${breathsPerRound.value} breaths` : `ရှု ${breathsPerRound.value} ကြိမ် ၁ ဝါရ ပြည့်သည့်အခါမှ မှတ်ယူပါ။`;
            }
            return isEnglish.value ? 'Tap anywhere to count a breath' : 'မျက်နှာပြင်ပေါ် မည်သည့်နေရာကိုမဆို ထိ၍ တစ်ချက်မှတ်ပါ။';
        });
        
        const overlayHintSub = computed(() => {
            if (tapMode.value === 'round') {
                return isEnglish.value ? `Two-finger tap · Double-click · Esc to stop` : `တစ်မှတ်သည် ${breathsPerRound.value} ကြိမ် ဖြစ်ပါသည်၊ နှစ်ချက်ထိ သို့မဟုတ် Esc ဖြင့် ရပ်နိုင်ပါသည်။`;
            }
            return isEnglish.value ? 'Two-finger tap · Double-click · Esc to stop' : 'တစ်မှတ်သည် တစ်ကြိမ် ဖြစ်ပါသည်၊ နှစ်ချက်ထိ သို့မဟုတ် Esc ဖြင့် ရပ်နိုင်ပါသည်။';
        });

        // Methods
        const setBreathsPerRound = (val) => {
            breathsPerRound.value = val;
            const defaults = { 8: { i: 4, e: 4 }, 10: { i: 3, e: 3 }, 12: { i: 2.5, e: 2.5 } };
            if (defaults[val]) {
                inhaleTarget.value = defaults[val].i;
                exhaleTarget.value = defaults[val].e;
            }
        };

        const setTapMode = (mode) => {
            tapMode.value = mode;
        };

        const openResultModal = () => {
            showResultModal.value = true;
        };

        const openHistoryModal = () => {
            showHistoryModal.value = true;
        };

        const closeHistoryModal = () => {
            showHistoryModal.value = false;
        };

        const openAboutModal = () => {
            showAboutModal.value = true;
        };

        const closeAboutModal = () => {
            showAboutModal.value = false;
        };

        const playGongTone = () => {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                const ctx = new AudioCtx();
                const t = ctx.currentTime;
                
                const master = ctx.createGain();
                master.gain.setValueAtTime(0, t);
                master.gain.linearRampToValueAtTime(1, t + 0.02);
                master.gain.exponentialRampToValueAtTime(0.001, t + 4.0);
                master.connect(ctx.destination);
                
                const freqs = [
                    { f: 200, v: 1.0 },
                    { f: 410, v: 0.6 },
                    { f: 550, v: 0.4 },
                    { f: 800, v: 0.2 }
                ];
                freqs.forEach(({f, v}) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = f;
                    g.gain.value = v;
                    osc.connect(g);
                    g.connect(master);
                    osc.start(t);
                    osc.stop(t + 4.0);
                });
            } catch (e) { console.warn(e); }
        };

        const playTargetReachedTone = () => {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                const ctx = new AudioCtx();
                const strikes = [
                    { base: 440.00, delay: 0.00, dur: 2.0 },
                    { base: 554.37, delay: 0.55, dur: 2.0 },
                    { base: 659.25, delay: 1.10, dur: 3.2 },
                ];
                strikes.forEach(({ base, delay, dur }) => {
                    const t = ctx.currentTime + delay;
                    const master = ctx.createGain();
                    master.gain.setValueAtTime(0, t);
                    master.gain.linearRampToValueAtTime(0.5, t + 0.018);
                    master.gain.exponentialRampToValueAtTime(0.0001, t + dur);
                    master.connect(ctx.destination);
                    const osc = ctx.createOscillator();
                    osc.frequency.value = base;
                    osc.connect(master);
                    osc.start(t);
                    osc.stop(t + dur);
                });
            } catch (e) { console.warn(e); }
        };

        const spawnRipple = (e) => {
            const x = e.clientX ?? window.innerWidth / 2;
            const y = e.clientY ?? window.innerHeight / 2;
            const size = 120;
            const ripple = document.createElement('div');
            ripple.className = 'anapana-ripple';
            ripple.style.cssText = `width:${size}px;height:${size}px;left:${x - size/2}px;top:${y - size/2}px;`;
            document.body.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        };

        const checkRoundTarget = () => {
            if (roundTarget.value <= 0) return;
            if (rounds.value === roundTarget.value) {
                playTargetReachedTone();
                showTargetBanner.value = true;
                setTimeout(() => showTargetBanner.value = false, 4500);
            }
        };

        const showTapRejected = () => {
            badgeText.value = isEnglish.value ? '✕ Impossible — too fast' : '✕ မဖြစ်နိုင် — နူးညံ့စွာ ပြန်လည်မှတ်ယူပါ။';
            breathBadgeClass.value = 'badge-reject';
            showBadge.value = true;
            clearTimeout(badgeTimeout);
            badgeTimeout = setTimeout(() => showBadge.value = false, 1800);
            
            rejectFlash.value = true;
            setTimeout(() => rejectFlash.value = false, 220);
        };

        const showBreathBadge = (dev, target) => {
            const ratio = Math.abs(dev) / (target || 1);
            if (ratio <= 0.2) {
                badgeText.value = isEnglish.value ? '✓ Perfect' : '✓ တိကျကောင်းမွန်';
                breathBadgeClass.value = 'badge-good';
            } else if (dev > 0) {
                badgeText.value = isEnglish.value ? `↑ +${dev}s · Slow` : `↑ +${dev}s · နောက်ကျနေသည်`;
                breathBadgeClass.value = 'badge-slow';
            } else {
                badgeText.value = isEnglish.value ? `↓ ${dev}s · Fast` : `↓ ${dev}s · စောနေသည်`;
                breathBadgeClass.value = 'badge-fast';
            }
            showBadge.value = true;
            clearTimeout(badgeTimeout);
            badgeTimeout = setTimeout(() => showBadge.value = false, 1800);
        };

        const handleCount = (e) => {
            if (!running.value) return;
            const nowMs = Date.now();
            const actualSec = (nowMs - lastTapMs) / 1000;
            
            if (tapMode.value === 'breath') {
                const targetSec = targetDuration.value;
                const minSec = Math.max(1.0, targetSec * 0.25);
                if (actualSec < minSec) { showTapRejected(); return; }
                
                const dev = parseFloat((actualSec - targetSec).toFixed(2));
                breathLog.value.push({
                    breathNum: breathLog.value.length + 1,
                    actual: parseFloat(actualSec.toFixed(2)),
                    target: targetSec,
                    deviation: dev
                });
                showBreathBadge(dev, targetSec);
                
                breaths.value++;
                breathPop.value = true; setTimeout(() => breathPop.value = false, 150);
                
                if (breaths.value % breathsPerRound.value === 0) {
                    rounds.value++;
                    breaths.value = 0;
                    roundPop.value = true; setTimeout(() => roundPop.value = false, 300);
                    playGongTone();
                    checkRoundTarget();
                }
            } else {
                const targetSec = targetDuration.value * breathsPerRound.value;
                const minSec = Math.max(breathsPerRound.value * 1.5, targetSec * 0.25);
                if (actualSec < minSec) { showTapRejected(); return; }
                
                const dev = parseFloat((actualSec - targetSec).toFixed(2));
                breathLog.value.push({
                    breathNum: breathLog.value.length + 1,
                    actual: parseFloat(actualSec.toFixed(2)),
                    target: targetSec,
                    deviation: dev,
                    isRound: true
                });
                showBreathBadge(dev, targetSec);
                rounds.value++;
                roundPop.value = true; setTimeout(() => roundPop.value = false, 300);
                playGongTone();
                checkRoundTarget();
            }
            
            lastTapMs = nowMs;
            spawnRipple(e);
            tapFlash.value = true; setTimeout(() => tapFlash.value = false, 100);
            updateLiveChart();
        };

        const handleTouch = (e) => {
            e.preventDefault();
            const now = Date.now();
            if (e.touches.length >= 2) {
                if (now - twoFingerLast < 350) return;
                twoFingerLast = now;
                stopSession();
            } else if (e.touches.length === 1) {
                handleCount(e.touches[0]);
            }
        };

        const handleClick = (e) => {
            if (e.detail === 1) handleCount(e);
        };

        const startSession = () => {
            running.value = true;
            breaths.value = 0;
            rounds.value = 0;
            seconds.value = 0;
            breathLog.value = [];
            showTargetBanner.value = false;
            showResultBtn.value = false;
            lastTapMs = Date.now();
            
            try {
                const el = document.documentElement;
                if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(()=>{});
            } catch(e){}

            document.body.style.overflow = 'hidden';
            
            timerId = setInterval(() => {
                seconds.value++;
            }, 1000);
            
            if (wakeLockEnabled.value) requestWakeLock();
        };

        const stopSession = () => {
            running.value = false;
            clearInterval(timerId);
            try {
                if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
            } catch(e){}
            document.body.style.overflow = '';
            releaseWakeLock();
            
            if (breathLog.value.length > 0) {
                showResultBtn.value = true;
            }
        };

        // Screen Wake Lock API
        const requestWakeLock = async () => {
            if (!('wakeLock' in navigator)) return;
            try {
                wakeLockSentinel = await navigator.wakeLock.request('screen');
                wakeLockSentinel.addEventListener('release', () => {
                    if (wakeLockEnabled.value && document.visibilityState === 'visible') requestWakeLock();
                });
            } catch (err) {}
        };
        const releaseWakeLock = () => {
            if (wakeLockSentinel) {
                wakeLockSentinel.release().catch(()=>{});
                wakeLockSentinel = null;
            }
        };
        const toggleWakeLock = () => {
            wakeLockEnabled.value = !wakeLockEnabled.value;
            if (wakeLockEnabled.value && running.value) requestWakeLock();
            else releaseWakeLock();
        };

        // Live Chart (Simple implementation using Canvas API)
        const updateLiveChart = () => {
            nextTick(() => {
                const canvas = document.getElementById('aoLiveChart');
                if (!canvas) return;
                const W = canvas.offsetWidth || window.innerWidth - 48;
                const H = canvas.offsetHeight || 96;
                canvas.width = W; canvas.height = H;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0,0,W,H);
                
                if (breathLog.value.length === 0) return;
                const maxAbs = Math.max(1, ...breathLog.value.map(b => Math.abs(b.deviation)));
                const yScale = (H / 2) / (maxAbs * 1.15);
                const zeroY = H / 2;
                const pad = 20;
                const chartW = W - pad * 2;
                
                ctx.strokeStyle = 'rgba(253,230,138,0.3)';
                ctx.beginPath(); ctx.moveTo(pad, zeroY); ctx.lineTo(W-pad, zeroY); ctx.stroke();
                
                const px = i => pad + (breathLog.value.length === 1 ? chartW/2 : i * chartW / (breathLog.value.length-1));
                const py = d => zeroY - d * yScale;
                
                ctx.strokeStyle = '#fca5a5';
                ctx.lineWidth = 2;
                ctx.beginPath();
                breathLog.value.forEach((b, i) => {
                    const x = px(i); const y = py(b.deviation);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                });
                ctx.stroke();
                
                // Draw dots
                breathLog.value.forEach((b, i) => {
                    ctx.fillStyle = Math.abs(b.deviation)/(b.target||1) <= 0.2 ? '#4ade80' : '#fb923c';
                    ctx.beginPath(); ctx.arc(px(i), py(b.deviation), 3, 0, Math.PI*2); ctx.fill();
                });
            });
        };

        // Samadhi and History Logic
        const calcSamadhiAnalysis = (totalSec, r, bpR, t, log, gPct, fC, sC, n, english = false) => {
            const sampleConfidence = n >= 3 ? 1 : n === 2 ? 0.76 : 0.58;
            const sampleIsTiny = n < 3;
            const eventCount = Math.max(log.length, 1);
            const expectedPerEvent = t;
            const expectedTotal    = expectedPerEvent * eventCount;
            const actualPerEvent   = eventCount > 0 ? totalSec / eventCount : totalSec;
            const paceRatio        = totalSec / Math.max(expectedTotal, 0.1);
            const paceDev          = Math.abs(1 - paceRatio);

            const avgAbsDev = log.length > 0
                ? log.reduce((acc, item) => acc + Math.abs(item.deviation), 0) / eventCount
                : 0;
            const consistencyRatio = avgAbsDev / Math.max(expectedPerEvent || 1, 0.1);

            const qualityScore = n > 0 ? gPct / 100 : Math.max(0, 1 - paceDev / 0.6);
            const consistencyScore = Math.max(0, 1 - consistencyRatio / 0.6);
            const paceScore = Math.max(0, 1 - paceDev / 0.6);
            const durationScore = Math.min(1.0, totalSec / 1200);

            const rawScore = n > 0
                ? qualityScore * 0.30 + consistencyScore * 0.25 + paceScore * 0.25 + durationScore * 0.20
                : paceScore * 0.60 + consistencyScore * 0.20 + durationScore * 0.20;
            const samadhiScore = Math.min(100, Math.max(0, Math.round(rawScore * 100 * sampleConfidence)));
            
            const durM = Math.floor(totalSec / 60);
            const durS = totalSec % 60;
            const durLabel = `${String(durM).padStart(2,'0')}:${String(durS).padStart(2,'0')}`;
            let durContext;
            if (english) {
                durContext = totalSec < 180 ? `Duration ${durLabel} — under 3 minutes, so gently extend your practice (aim for 5–10 minutes first).` :
                             totalSec < 600 ? `Duration ${durLabel} — a good start. Try to gradually extend toward 10–15 minutes.` :
                             totalSec < 1200 ? `Duration ${durLabel} — a healthy range. Continue with sessions around 20 minutes.` :
                             totalSec < 2400 ? `Duration ${durLabel} — excellent steady practice. Keep this duration consistent.` :
                             `Duration ${durLabel} — excellent endurance. Your samadhi is becoming deeper.`;
            } else {
                durContext = totalSec < 180 ? `ကြာမြင့်ချိန် ${durLabel} — ၃ မိနစ်အောက်သာ ရှိသေး၍ အချိန်အတိုင်းအတာကို ဖြည်းဖြည်းချင်း တိုးမြှင့်ပါ (ဦးစွာ ၅–၁၀ မိနစ်ကို ရည်မှန်းပါ)။` :
                             totalSec < 600 ? `ကြာမြင့်ချိန် ${durLabel} ဖြစ်ပါသည်။ ၁၀–၁၅ မိနစ်ခန့်အထိ အနည်းငယ်စီ တိုးမြှင့် ရည်မှန်းပါ။` :
                             totalSec < 1200 ? `ကြာမြင့်ချိန် ${durLabel} — ကောင်းမွန်သော အတိုင်းအတာတစ်ရပ် ဖြစ်ပါသည်။ ၂၀ မိနစ်ခန့် အလေ့အကျင့်များဖြင့် ဆက်လက်လေ့ကျင့်ပါ။` :
                             totalSec < 2400 ? `ကြာမြင့်ချိန် ${durLabel} — ကြာရှည်တည်ငြိမ်စွာ လေ့ကျင့်နိုင်ခြင်းအတွက် ဝမ်းမြောက်ပါသည်။ ဤအချိန်အတိုင်းအတာကို ပုံမှန်ထိန်းသိမ်းပါ။` :
                             `ကြာမြင့်ချိန် ${durLabel} — ထူးချွန်သော အချိန်အတိုင်းအတာဖြင့် လေ့ကျင့်နိုင်ခြင်းအတွက် ဝမ်းမြောက်ပါသည်။ သမာဓိသည် ပိုမိုနက်ရှိုင်းလာနေပါပြီ။`;
            }
                             
            let levelLabel, levelColor, recommendation;
            const bpLabel = bpR === 8 ? '၈' : bpR === 10 ? '၁၀' : '၁၂';
            
            if (samadhiScore >= 80) {
                levelColor = '#15803d'; levelLabel = english ? 'Good samadhi' : 'သမာဓိ ကောင်းမွန်သည်';
                recommendation = english
                    ? `Well done. You were able to keep the ${bpLabel}-breath pattern quite steadily. Your mind is clear and stable. Please continue your regular practice — samadhi will deepen further. ${durContext}`
                    : `ဝမ်းမြောက်ဖွယ်ကောင်းပါသည်။ တစ်ပတ် (ဝါရ) လျှင် ${bpLabel} ကြိမ် စနစ်ကို အတော်အတန် တည်ငြိမ်စွာ ထိန်းနိုင်ခဲ့ပါသည်။ စိတ်ကြည်လင်၍ တည်ငြိမ်မှုလည်း ထင်ရှားပါသည်။ ဤအကျင့်ကို မပျောက်မကွယ် ဆက်လက်ပြုလုပ်ပါ — သမာဓိ ပိုမိုနက်ရှိုင်းလာပါမည်။ ${durContext}`;
            } else if (samadhiScore >= 60) {
                levelColor = '#65a30d'; levelLabel = english ? 'Fairly good samadhi' : 'သမာဓိ ပျမ်းမျှကောင်းသည်';
                recommendation = english
                    ? `Good. Your practice is progressing. If you keep noticing the in-breath and out-breath calmly and carefully, samadhi will become more steady. ${durContext}`
                    : `ကောင်းမွန်ပါသည်။ အာရုံသည် တဖြည်းဖြည်း တည်ကြည်လာနေပါသည်။ ရှုသွင်း၊ ရှုထုတ်ကို ငြိမ်သက်စွာနှင့် သတိမလွတ်စွာ မှတ်ယူနိုင်သရွေ့ သမာဓိ ပိုမိုတည်ငြိမ်လာပါမည်။ ${durContext}`;
            } else if (samadhiScore >= 40) {
                levelColor = '#d97706'; levelLabel = english ? 'Some samadhi' : 'သမာဓိ အနည်းငယ်ရှိသည်';
                recommendation = english
                    ? `This is normal. There are some gaps in breath timing consistency. Count the in-breath and out-breath quietly as 1, 2, 3 … and continue gently. With regular practice, the mind will become steadier. ${durContext}`
                    : `ဤအခြေအနေသည် ပုံမှန်ဖြစ်ပါသည်။ ရှုမှတ်စဉ်၏ ညီမျှမှု၌ အနည်းငယ် အတက်အကျ ရှိနေသေးပါသည်။ ရှုသွင်း၊ ရှုထုတ်ကို ၁၊ ၂၊ ၃ … ဟု ငြိမ်သက်စွာ ရေတွက်၍ မှတ်ယူပါ။ ပုံမှန်ကျင့်ကြံလာသည်နှင့်အမျှ အာရုံ ပိုမိုတည်ကြည်လာပါမည်။ ${durContext}`;
            } else if (samadhiScore >= 20) {
                levelColor = '#ea580c'; levelLabel = english ? 'Low samadhi' : 'သမာဓိ နည်းပါးသည်';
                recommendation = english
                    ? `Only a little breath regularity was observed in this session. Each time you notice the mind drifting, gently return to the breath — it is not a mistake, only a fresh gathering of attention. ${durContext}`
                    : `ဤအခါ၌ အာရုံ၏ ညီမျှမှုမှာ အနည်းငယ်သာ ထင်ရှားပါသည်။ ပျံလွင့်မှုကို သိမြင်သည့်အခါတိုင်း အပြစ်မထားဘဲ ရှုမှတ်ဆီသို့ နူးညံ့စွာ ပြန်လာပါ — မှားနေသည်မဟုတ်ဘဲ အာရုံပြန်လည်စုစည်းနေခြင်းသာ ဖြစ်ပါသည်။ ${durContext}`;
            } else {
                levelColor = '#b91c1c'; levelLabel = english ? 'Very low samadhi' : 'သမာဓိ မရှိသလောက်ဖြစ်သည်';
                recommendation = english
                    ? `Very little regularity was present in this session. You may be physically tired or your attention may have wandered outside. ${durContext}`
                    : `ဤအခါ၌ အာရုံတည်ငြိမ်မှု အလွန်နည်းပါးခဲ့ပါသည်။ ကိုယ်ခန္ဓာပင်ပန်းမှု သို့မဟုတ် အာရုံပြင်ပသို့ ပျံ့လွင့်နေခြင်း ဖြစ်နိုင်ပါသည်။ ${durContext}`;
            }

            if (sampleIsTiny) {
                const tinyNote = english
                    ? (n === 1
                        ? 'Note: This session has only 1 recorded event, so the result is provisional and should be read gently.'
                        : 'Note: This session has only 2 recorded events, so the result is provisional and should be read gently.')
                    : (n === 1
                        ? 'မှတ်ချက် — ဤအခါတွင် မှတ်တမ်း ၁ ကြိမ်သာ ရှိသဖြင့် ရလဒ်ကို ယာယီသဘောဖြင့်သာ နူးညံ့စွာ ဖတ်ရှုပါ။'
                        : 'မှတ်ချက် — ဤအခါတွင် မှတ်တမ်း ၂ ကြိမ်သာ ရှိသဖြင့် ရလဒ်ကို ယာယီသဘောဖြင့်သာ နူးညံ့စွာ ဖတ်ရှုပါ။');
                recommendation = `${tinyNote} ${recommendation}`;
                levelLabel = english ? 'Provisional result' : 'ယာယီရလဒ်';
                levelColor = '#b45309';
            }
            
            return { samadhiScore, levelLabel, levelColor, recommendation, actualPerEvent, expectedPerEvent, paceRatio, paceScore, qualityScore, consistencyScore, durationScore, durLabel, avgAbsDev, sampleConfidence, sampleIsTiny };
        };

        const generateResultStats = (logArr, totalSec, r, bpR, isHistory = false) => {
            if (logArr.length === 0) return;
            const isRound = logArr[0].isRound === true;
            const n = logArr.length;
            const target0 = logArr[0].target;
            const totalBreaths = isRound ? n * bpR : n;
            const completedRounds = isRound ? n : Math.floor(n / bpR);
            const remainingBreaths = isRound ? 0 : n % bpR;
            const expectedTotal = n * target0;
            
            const actuals = logArr.map(b => b.actual);
            const avgActual = actuals.reduce((a, v) => a + v, 0) / n;
            const avgDev = logArr.map(b => b.deviation).reduce((a, v) => a + v, 0) / n;
            const avgAbsDev = logArr.map(b => Math.abs(b.deviation)).reduce((a, v) => a + v, 0) / n;
            const minDev = Math.min(...logArr.map(b => b.deviation));
            const maxDev = Math.max(...logArr.map(b => b.deviation));
            
            const fC = logArr.filter(b => b.deviation < 0  && Math.abs(b.deviation) / (b.target||1) > 0.2).length;
            const sC = logArr.filter(b => b.deviation > 0  && Math.abs(b.deviation) / (b.target||1) > 0.2).length;
            const gC = n - fC - sC;
            const gPct = Math.round(gC / n * 100);
            
            const fW = Math.round(fC / n * 100);
            const gW = Math.round(gC / n * 100);
            const sW = 100 - fW - gW;
            
            const gradeColor = gPct >= 80 ? '#15803d' : gPct >= 60 ? '#d97706' : '#b91c1c';
            const avgDevRatio = Math.abs(avgDev) / (target0 || 1);
            const avgDevColor = avgDevRatio <= 0.2 ? '#15803d' : avgDevRatio <= 0.5 ? '#d97706' : '#ef4444';
            const consistencyPct = Math.round(Math.max(0, 100 - (avgAbsDev / Math.max(target0, 0.1)) * 120));
            const consistencyColor = consistencyPct >= 75 ? '#15803d' : consistencyPct >= 50 ? '#d97706' : '#b91c1c';
            const sessionPacePct = Math.round(Math.max(0, 100 - (Math.abs(totalSec - expectedTotal) / Math.max(expectedTotal, 0.1)) * 100));
            const sampleConfidencePct = n >= 3 ? 100 : n === 2 ? 76 : 58;
            const sampleNote = n === 1
                ? (isEnglish ? 'Provisional: only 1 event was recorded.' : 'ယာယီသဘော — မှတ်တမ်း ၁ ကြိမ်သာ ရှိပါသည်။')
                : n === 2
                    ? (isEnglish ? 'Provisional: only 2 events were recorded.' : 'ယာယီသဘော — မှတ်တမ်း ၂ ကြိမ်သာ ရှိပါသည်။')
                    : '';
            
            const durMin = Math.floor(totalSec / 60).toString().padStart(2, '0');
            const durSec = (totalSec % 60).toString().padStart(2, '0');
            
            resultStats.value = {
                gradeColor, goodPct: gPct, fastCount: fC, goodCount: gC, slowCount: sC,
                fastW: fW, goodW: gW, slowW: sW, durStr: `${durMin}:${durSec}`, n,
                isRound, target0, targetPerBreath: target0.toFixed(1),
                avgActual: avgActual.toFixed(1), avgActualPerBreath: (isRound ? (avgActual/bpR) : avgActual).toFixed(1),
                avgDev: Math.abs(avgDev).toFixed(1), avgDevSign: avgDev >= 0 ? '+' : '-', avgDevColor,
                rangeUnit: isRound ? 'တစ်ပတ်' : 'တစ်ချက်', minDevStr: (minDev >= 0 ? '+' : '') + minDev.toFixed(1),
                maxDevStr: (maxDev >= 0 ? '+' : '') + maxDev.toFixed(1),
                totalBreaths, completedRounds, remainingBreaths, expectedTotal: expectedTotal.toFixed(1),
                avgAbsDev: avgAbsDev.toFixed(1), consistencyPct, consistencyColor, sessionPacePct,
                sampleConfidencePct, sampleNote
            };
            
            const sd = calcSamadhiAnalysis(totalSec, r, bpR, target0, logArr, gPct, fC, sC, n, isEnglish.value);
            
            const paceDevPct  = Math.round(Math.abs(sd.paceRatio - 1) * 100);
            const paceColor   = paceDevPct <= 15 ? '#15803d' : paceDevPct <= 35 ? '#d97706' : '#b91c1c';
            const qualityPct  = Math.round(sd.qualityScore * 100);
            const consistencyPct2 = Math.round(sd.consistencyScore * 100);
            const qualColor   = qualityPct >= 75 ? '#15803d' : qualityPct >= 50 ? '#d97706' : '#b91c1c';
            const consColor   = consistencyPct2 >= 75 ? '#15803d' : consistencyPct2 >= 50 ? '#d97706' : '#b91c1c';
            const durPct      = Math.round(sd.durationScore * 100);
            const durColor    = durPct >= 75 ? '#15803d' : durPct >= 40 ? '#d97706' : '#b91c1c';
            
            const gradFill = sd.samadhiScore >= 80 ? 'linear-gradient(90deg,#4ade80,#15803d)' :
                             sd.samadhiScore >= 60 ? 'linear-gradient(90deg,#a3e635,#65a30d)' :
                             sd.samadhiScore >= 40 ? 'linear-gradient(90deg,#fbbf24,#d97706)' :
                             sd.samadhiScore >= 20 ? 'linear-gradient(90deg,#fb923c,#ea580c)' :
                             'linear-gradient(90deg,#f87171,#b91c1c)';

            samadhiStats.value = {
                samadhiScore: sd.samadhiScore, levelLabel: sd.levelLabel, levelColor: sd.levelColor,
                gradFill, expectedPerEvent: sd.expectedPerEvent.toFixed(1), actualPerEvent: sd.actualPerEvent.toFixed(1),
                paceDevStr: (sd.paceRatio >= 1 ? '+' : '') + paceDevPct + '%', paceColor,
                qualityPct, qualColor, consistencyPct: consistencyPct2, consColor, durPct, durColor,
                durLabel: sd.durLabel, recommendation: sd.recommendation,
                sampleConfidencePct, sampleNote: sd.sampleIsTiny ? sampleNote : ''
            };
            
            if (!isHistory) {
                saveHistoryEntry({
                    id: 'ana_' + Date.now(),
                    savedAt: Date.now(),
                    breathsPer: bpR, tapMode: tapMode.value, totalSec, rounds: r,
                    breathLog: [...logArr], samadhiScore: sd.samadhiScore, levelLabel: sd.levelLabel, levelColor: sd.levelColor
                });
            }
        };

        const loadHistory = () => {
            try {
                const raw = localStorage.getItem('anapana_history');
                if (raw) {
                    history.value = JSON.parse(raw).map(e => {
                        const d = new Date(e.savedAt);
                        const m = Math.floor(e.totalSec / 60).toString().padStart(2, '0');
                        const s = (e.totalSec % 60).toString().padStart(2, '0');
                        return { ...e, dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, tm: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, durationStr: `${m}:${s}` };
                    });
                }
            } catch (e) {}
        };

        const saveHistoryEntry = (entry) => {
            history.value.unshift(entry);
            if (history.value.length > 50) history.value.length = 50;
            localStorage.setItem('anapana_history', JSON.stringify(history.value));
            loadHistory();
        };

        const clearHistory = () => {
            if (confirm(isEnglish.value ? 'Delete all history entries?' : 'ရှုမှတ်မှတ်တမ်းအားလုံးကို ဖယ်ရှားမည်လား။')) {
                localStorage.removeItem('anapana_history');
                history.value = [];
            }
        };

        const deleteHistoryEntry = (id) => {
            history.value = history.value.filter(e => e.id !== id);
            localStorage.setItem('anapana_history', JSON.stringify(history.value));
        };

        const viewHistoryEntry = (e) => {
            isViewingHistory.value = true;
            historyDateLabel.value = isEnglish.value
                ? `Date — ${e.dt} · Time — ${e.tm}`
                : `ရက်စွဲ — ${e.dt}၊ အချိန် — ${e.tm}`;
            showHistoryModal.value = false;
            generateResultStats(e.breathLog, e.totalSec, e.rounds, e.breathsPer, true);
            showResultModal.value = true;
        };

        const hideResult = () => {
            showResultModal.value = false;
            isViewingHistory.value = false;
        };

        watch(showResultModal, (val) => {
            if (val && !isViewingHistory.value && breathLog.value.length > 0) {
                generateResultStats(breathLog.value, seconds.value, rounds.value, breathsPerRound.value, false);
            }
        });

        onMounted(() => {
            tapMode.value = 'round';
            wakeLockSupported.value = 'wakeLock' in navigator;
            loadHistory();
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && running.value) stopSession();
            });
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && wakeLockEnabled.value && running.value) {
                    requestWakeLock();
                }
            });
        });

        return {
            isEnglish, toggleLanguage,
            running, seconds, breaths, rounds, breathLog,
            breathsPerRound, tapMode, roundTarget, inhaleTarget, exhaleTarget, targetDuration,
            tapFlash, rejectFlash, breathPop, roundPop,
            showBadge, badgeText, breathBadgeClass, showTargetBanner, showResultBtn,
            wakeLockEnabled, wakeLockSupported, history,
            showResultModal, showHistoryModal, isViewingHistory, historyDateLabel, resultStats, samadhiStats,
            showAboutModal,
            formattedTime, displayBreaths, displayBreathsPerRoundSub, displayRoundTarget, overlayHintMain, overlayHintSub,
            setBreathsPerRound, setTapMode, startSession, stopSession, handleTouch, handleClick, toggleWakeLock,
            clearHistory, deleteHistoryEntry, viewHistoryEntry, hideResult, openResultModal, openHistoryModal, closeHistoryModal,
            openAboutModal, closeAboutModal
        };
    }
});

app.mount('#app');
