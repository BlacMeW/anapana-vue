# Anapana Vue

## မြန်မာဘာသာ

`anapana-vue` သည် Vue 3 ဖြင့်တည်ဆောက်ထားသော ရိုးရှင်းသော်လည်း သေသပ်သော အာနာပါန ရှုမှတ်မှတ်တမ်းအက်ပ် ဖြစ်ပါသည်။
ဤအက်ပ်သည် ရှုမှတ်ချိန်၊ ရှုမှတ်အကြိမ်အရေအတွက်၊ ပတ် (ဝါရ) အရေအတွက်၊ နှင့် result / history analysis များကို တစ်မျက်နှာတည်းတွင် ပြသပေးနိုင်ရန် ရည်ရွယ်ထားပါသည်။

### အဓိက လုပ်ဆောင်ချက်များ

- တစ်ချက်ထိ၍ ရှုမှတ်မှတ်တမ်း စတင်နိုင်ခြင်း
- တစ်ချက်စီ မှတ်ယူခြင်း သို့မဟုတ် ပတ် (ဝါရ) အလိုက် မှတ်ယူခြင်း
- ၈ / ၁၀ / ၁၂ ကြိမ်ကို ၁ ဝါရ အဖြစ် သတ်မှတ်နိုင်ခြင်း
- ရှုမှတ်ရလဒ်ကို မြန်မာ / English နှစ်ဘာသာဖြင့် ကြည့်ရှုနိုင်ခြင်း
- သမာဓိရမှတ်၊ ညီမျှမှု၊ ကွာဟမှု၊ ကြာမြင့်ချိန် စသည့် အချက်အလက်များကို ပြသပေးခြင်း
- history မှတ်တမ်းများကို သိမ်းဆည်း၍ ပြန်လည်ကြည့်ရှုနိုင်ခြင်း
- Wake Lock ဖြင့် ဖုန်းမျက်နှာပြင် မပိတ်အောင် ထိန်းနိုင်ခြင်း

### About အပိုင်း

- `About` modal ကို `/DATA/LLM_Projs/TestArea/geolib/example/lib/widgets/about_dialog_widget.dart` ထဲက layout inspiration အတိုင်း ချိတ်ဆက်ထားပါသည်။
- သို့သော် About ထဲက စာသားများသည် `anapana-vue` အက်ပ်အတွက်ပဲ သီးသန့် ပြန်လည်ရေးသားထားသော စာသားများဖြစ်ပါသည်။
- Local image assets များကို `assets/images/` ထဲတွင် ထားပြီး About layout တွင် ပြသထားပါသည်။

### ဖိုင်ဖွဲ့စည်းပုံ

- `index.html` — UI template
- `js/app.js` — Vue logic, result calculation, history handling
- `css/style.css` — style and layout

### အသုံးပြုပုံ

1. `index.html` ကို browser ဖြင့်ဖွင့်ပါ။
2. `Start` ခလုတ်ကိုနှိပ်၍ session စတင်ပါ။
3. မျက်နှာပြင်ကို ထိ၍ ရှုမှတ်ကြိမ်များကို မှတ်ယူပါ။
4. ရလဒ်ကို `Show Result` ခလုတ်မှတစ်ဆင့် ကြည့်ရှုပါ။
5. `History` မှ ယခင် session များကို ပြန်လည်ဖော်ပြနိုင်ပါသည်။

### မှတ်ချက်

- ဤ project သည် build tool မလိုအပ်သော static app ဖြစ်ပါသည်။
- Vue 3 ကို CDN မှ တိုက်ရိုက်အသုံးပြုထားပါသည်။
- Browser မှ `index.html` ကို တိုက်ရိုက်ဖွင့်၍ အသုံးပြုနိုင်ပါသည်။

---

## English

`anapana-vue` is a simple yet polished Ānāpāna breathing counter built with Vue 3.
It is designed to show breathing time, breath counts, round counts (ဝါရ), and result/history analysis on a single screen.

### Key features

- One-tap session start
- Per-breath counting or round-based counting
- Supports 8 / 10 / 12 breaths as 1 ဝါရ
- Bilingual result display in Myanmar and English
- Samadhi score, consistency, deviation, and duration analysis
- Session history storage and replay
- Wake Lock support to keep the screen on during practice

### Project structure

- `index.html` — UI template
- `js/app.js` — Vue logic, scoring, and history handling
- `css/style.css` — styles and layout

### How to use

1. Open `index.html` in a browser.
2. Press `Start` to begin a session.
3. Tap the screen to record breaths.
4. Open `Show Result` to view session analysis.
5. Use `History` to revisit past sessions.

### Notes

- This is a static app and does not require a build tool.
- Vue 3 is loaded directly from a CDN.
- You can run it simply by opening `index.html` in a browser.
- The `About` modal follows the same visual structure as the Flutter reference dialog, but the wording is written specifically for this app.

### GitHub Pages

- This repository includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.
- After pushing to `main`, GitHub Actions will build and deploy the site to GitHub Pages.
- In the repository settings, make sure **Pages** is set to use **GitHub Actions**.
- The app is already structured for Pages because it uses relative paths like `css/style.css` and `js/app.js`.
