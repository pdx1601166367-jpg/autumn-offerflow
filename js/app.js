(function () {
  const D = window.Data;
  const Icon = window.Icon;
  const E = window.Engine;
  const LS_KEY = "offerflow:v1";
  const $ = (s) => document.querySelector(s);

  function esc(v) {
    return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function nl(v) { return esc(v).replace(/\n/g, "<br>"); }
  function uid() { return "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function today() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function nowStr() {
    const d = new Date();
    return today() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function shuffle(a) { const arr = a.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  function defaultState() {
    return {
      profile: { name: "林同学", role: "前端开发", aiEnabled: false, apiKey: "", apiBase: "https://api.openai.com/v1", model: "gpt-4o-mini" },
      apps: JSON.parse(JSON.stringify(D.seedApps)),
      reviews: JSON.parse(JSON.stringify(D.seedReviews)),
      favorites: [],
      mastered: [],
      resumes: JSON.parse(JSON.stringify(D.seedResumes)),
      selfTests: [],
      solved: [],
      practice: [],
      tasks: JSON.parse(JSON.stringify(D.seedTasks)).map(t => Object.assign({ id: uid(), done: false }, t))
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      return {
        profile: Object.assign(base.profile, parsed.profile || {}),
        apps: Array.isArray(parsed.apps) ? parsed.apps : base.apps,
        reviews: Array.isArray(parsed.reviews) ? parsed.reviews : base.reviews,
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : base.favorites,
        mastered: Array.isArray(parsed.mastered) ? parsed.mastered : base.mastered,
        resumes: Array.isArray(parsed.resumes) ? parsed.resumes : base.resumes,
        selfTests: Array.isArray(parsed.selfTests) ? parsed.selfTests : base.selfTests,
        solved: Array.isArray(parsed.solved) ? parsed.solved : base.solved,
        practice: Array.isArray(parsed.practice) ? parsed.practice : base.practice,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : base.tasks
      };
    } catch (e) { return defaultState(); }
  }
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
    if (window.Auth && Auth.token() && !remoteApplying) {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(function () {
        Auth.putState(S).catch(function () {});
      }, 800);
    }
  }

  function normalizeState(raw) {
    const base = defaultState();
    const r = raw || {};
    return {
      profile: Object.assign({}, base.profile, r.profile || {}),
      apps: Array.isArray(r.apps) ? r.apps : base.apps,
      reviews: Array.isArray(r.reviews) ? r.reviews : base.reviews,
      favorites: Array.isArray(r.favorites) ? r.favorites : base.favorites,
      mastered: Array.isArray(r.mastered) ? r.mastered : base.mastered,
      resumes: Array.isArray(r.resumes) ? r.resumes : base.resumes,
      selfTests: Array.isArray(r.selfTests) ? r.selfTests : base.selfTests,
      solved: Array.isArray(r.solved) ? r.solved : base.solved,
      practice: Array.isArray(r.practice) ? r.practice : base.practice,
      tasks: Array.isArray(r.tasks) ? r.tasks : base.tasks
    };
  }

  function applyRemoteState(raw) {
    remoteApplying = true;
    S = normalizeState(raw);
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
    remoteApplying = false;
    render();
  }

  let S = load();
  let MOCK = null;
  let timerId = null;
  let testStarted = false;
  let testAnswers = {};
  let voiceRec = null;
  let voiceOn = false;
  let resumeImage = null;
  let taskEditId = null;
  let lastSolve = null;
  let syncTimer = null;
  let remoteApplying = false;
  let syncingOnce = false;
  let remoteRes = null;
  let resUpdatedAt = null;
  let agentInput = "";
  let agentShowJd = false;
  let agentResult = null;
  let diagIds = [];
  const filters = { bank: { q: "", cat: "全部", diff: "全部", type: "全部", fav: false, master: false }, tracker: { q: "", status: "全部", view: "table" }, res: { tab: "campus", q: "", city: "全部" } };

  const NAV = [
    { id: "dashboard", label: "工作台", icon: "dashboard" },
    { id: "agent", label: "AI 求职 Agent", icon: "bot" },
    { id: "mock", label: "模拟面试", icon: "mic" },
    { id: "solver", label: "笔试解题台", icon: "scan" },
    { id: "bank", label: "面试题库", icon: "book" },
    { id: "resume", label: "简历优化", icon: "file" },
    { id: "tracker", label: "投递管理", icon: "kanban" },
    { id: "resources", label: "求职资料", icon: "database" },
    { id: "reviews", label: "复盘报告", icon: "clipboard" },
    { id: "self-test", label: "自测工具", icon: "gauge" }
  ];
  const TITLES = {
    dashboard: ["工作台", "求职进度与今日任务总览"],
    agent: ["AI 求职 Agent", "提出求职目标，Agent 自动规划、调用工具并生成行动方案"],
    mock: ["AI 模拟面试", "配置面试档案并开始一场真实感训练"],
    solver: ["笔试解题台", "粘贴题目，秒得思路、复杂度与示例代码"],
    bank: ["面试题库", "按方向、难度与题型筛选高频题目"],
    resume: ["AI 简历优化", "粘贴简历与 JD，获取维度评分和改写建议"],
    tracker: ["投递管理", "用表格或看板管理每一次投递"],
    resources: ["求职资料", "校招、实习与国央企信息速查"],
    reviews: ["复盘报告", "回顾每一场模拟面试的表现与改进点"],
    "self-test": ["自测工具", "面试准备度自测与薪资期望计算"]
  };

  const STATUS_COLOR = { 意向: "b-blue", 已投递: "b-sky", 笔试: "b-amber", 面试: "b-red", Offer: "b-green", 拒绝: "b-gray" };
  const DIFF_COLOR = { 入门: "b-green", 中等: "b-amber", 进阶: "b-red" };

  function badge(text, color) { return '<span class="badge ' + (color || "b-gray") + '">' + esc(text) + "</span>"; }
  function ringHtml(score) {
    const c = score >= 85 ? "#15803d" : score >= 70 ? "#0e9488" : score >= 55 ? "#d97706" : "#dc2626";
    return `<div class="ring" style="--val:${score};background:conic-gradient(${c} calc(${score}*1%), var(--gray-soft) 0)"><div><b style="color:${c}">${score}</b><span>综合得分</span></div></div>`;
  }
  function dimsHtml(dims) {
    return Object.entries(dims || {}).map(([k, v]) =>
      '<div class="dim-row"><span>' + esc(k) + '</span><div class="progress"><i style="width:' + v + '%"></i></div><b>' + v + "</b></div>"
    ).join("");
  }
  function fmtTime(s) {
    s = Math.max(0, s);
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  function recordPractice(qid, cat, type, diff, score) {
    S.practice.unshift({ id: uid(), qid, cat, type, diff, score, date: today(), time: nowStr() });
    S.practice = S.practice.slice(0, 500);
  }

  function catScores() {
    const map = {};
    S.practice.forEach(p => {
      if (!map[p.cat]) map[p.cat] = [];
      map[p.cat].push(p.score);
    });
    return Object.keys(map).map(k => ({
      cat: k,
      score: Math.round(map[k].reduce((a, b) => a + b, 0) / map[k].length),
      count: map[k].length
    })).sort((a, b) => a.score - b.score);
  }

  function lastPractice(qid) {
    const p = S.practice.find(x => x.qid === qid);
    return p ? p.score : null;
  }

  function practiceStreak() {
    const days = new Set(S.practice.map(p => p.date));
    let streak = 0;
    const d = new Date();
    while (days.has(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function fmtDay(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function weekRange() {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - day);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: fmtDay(mon), end: fmtDay(sun), label: fmtDay(mon) + " ~ " + fmtDay(sun) };
  }

  function weekStats() {
    const w = weekRange();
    const practice = S.practice.filter(p => p.date >= w.start && p.date <= w.end);
    const avg = practice.length ? Math.round(practice.reduce((a, b) => a + b.score, 0) / practice.length) : null;
    return {
      range: w.label,
      count: practice.length,
      avg,
      uniqueQ: new Set(practice.map(p => p.qid)).size,
      apps: S.apps.filter(a => a.applyDate >= w.start && a.applyDate <= w.end).length,
      interviews: S.apps.filter(a => a.interviewAt && new Date(a.interviewAt) >= new Date(w.start + "T00:00:00") && new Date(a.interviewAt) <= new Date(w.end + "T23:59:59")).length,
      tasksDone: S.tasks.filter(t => t.done).length
    };
  }

  function fmtInterview(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function countdownText(iso) {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return "已开始";
    const m = Math.floor(diff / 60000);
    if (m < 60) return m + " 分钟后";
    const h = Math.floor(m / 60);
    if (h < 24) return h + " 小时后";
    return Math.floor(h / 24) + " 天后";
  }

  function notifySupported() { return "Notification" in window; }

  function notifyPermission() { return notifySupported() ? Notification.permission : "unsupported"; }

  function requestNotify() {
    if (!notifySupported()) { toast("当前浏览器不支持通知"); return; }
    Notification.requestPermission().then(p => {
      toast(p === "granted" ? "面试提醒已开启" : "通知权限未开启");
      render();
    });
  }

  function checkReminders() {
    if (!notifySupported() || Notification.permission !== "granted") return;
    let changed = false;
    S.apps.forEach(a => {
      if (!a.interviewAt || !a.remindMin || a.reminded) return;
      const t = new Date(a.interviewAt).getTime();
      if (t > Date.now() && Date.now() >= t - a.remindMin * 60000) {
        a.reminded = true;
        changed = true;
        try {
          new Notification("面试提醒：" + a.company + " " + a.role, { body: countdownText(a.interviewAt) + " 开始" });
        } catch (e) {}
        toast("面试提醒：" + a.company + " " + a.role);
      }
    });
    if (changed) save();
  }

  function canUseAI() {
    if (!S.profile.aiEnabled || !S.profile.apiKey) return false;
    if (window.Auth && Auth.user()) return true;
    const key = "offerflow:aiq:" + today();
    const used = Number(localStorage.getItem(key) || 0);
    if (used >= 10) {
      toast("访客今日 AI 次数已用完（10 次），注册登录后可无限使用");
      return false;
    }
    localStorage.setItem(key, String(used + 1));
    return true;
  }

  function toast(msg) {
    const root = $("#toastRoot");
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = Icon("check-circle", 16) + "<span>" + esc(msg) + "</span>";
    root.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 320); }, 2600);
  }

  function showModal(html, wide) {
    const root = $("#modalRoot");
    root.hidden = false;
    root.innerHTML = '<div class="modal' + (wide ? ' modal-wide' : "") + '">' + html + "</div>";
  }
  function closeModal() {
    const root = $("#modalRoot");
    root.hidden = true;
    root.innerHTML = "";
  }

  // ---------- Router ----------
  function routeInfo() {
    const h = location.hash.replace(/^#\/?/, "");
    const parts = h.split("?");
    return { path: parts[0] || "dashboard", params: new URLSearchParams(parts[1] || "") };
  }
  function navigate(path) {
    const cur = routeInfo().path;
    if (path === cur) { render(); return; }
    location.hash = "#/" + path;
  }
  window.addEventListener("hashchange", render);

  function renderNav(path) {
    const nav = $("#nav");
    const counts = { tracker: S.apps.filter(a => ["已投递", "笔试", "面试"].includes(a.status)).length, reviews: S.reviews.length, bank: S.favorites.length };
    nav.innerHTML = NAV.map(n => {
      const active = path === n.id || (n.id === "mock" && path === "mock");
      const count = counts[n.id];
      return '<button class="nav-item' + (active ? " active" : "") + '" data-action="navigate" data-id="' + n.id + '">' +
        '<span class="ic">' + Icon(n.icon) + "</span><span>" + n.label + "</span>" +
        (count ? '<span class="nav-badge">' + count + "</span>" : "") + "</button>";
    }).join("");
  }

  function renderCrumb(path) {
    const t = TITLES[path] || TITLES.dashboard;
    $("#crumb").innerHTML = t[0] + "<small>" + t[1] + "</small>";
  }

  function render() {
    const { path, params } = routeInfo();
    stopVoice();
    renderNav(path);
    renderCrumb(path);
    const view = $("#view");
    const fn = PAGES[path] || PAGES.dashboard;
    view.innerHTML = fn(params);
    afterRender(path, params);
    const av = $(".avatar");
    if (av) av.textContent = window.Auth && Auth.user() ? Auth.user().username.slice(0, 1).toUpperCase() : (S.profile.name || "林").slice(0, 1);
    const pill = $("#aiPillText");
    if (pill) pill.textContent = window.Auth && Auth.token() ? "云同步已开启" : (S.profile.aiEnabled && S.profile.apiKey ? "AI 接口已启用" : "本地 AI 在线");
    $("#sidebar").classList.remove("open");
  }

  function afterRender(path, params) {
    if (path === "mock") bindMock();
    if (path === "bank") bindBank();
    if (path === "tracker") bindTracker();
    if (path === "resources") bindResources();
    if (path === "reviews" && params.get("open")) openReview(params.get("open"));
    if (path === "solver" && $("#solverInput")) $("#solverInput").focus();
    if (path === "resume") {
      const fi = $("#resumeImg");
      if (fi) fi.addEventListener("change", handleResumeImage);
      renderResumePreview();
    }
  }

  // ---------- Pages ----------
  const PAGES = {
    dashboard: pageDashboard,
    agent: pageAgent,
    mock: pageMock,
    solver: pageSolver,
    bank: pageBank,
    resume: pageResume,
    tracker: pageTracker,
    resources: pageResources,
    reviews: pageReviews,
    "self-test": pageSelfTest
  };

  function pageDashboard() {
    const apps = S.apps;
    const active = apps.filter(a => ["已投递", "笔试", "面试"].includes(a.status)).length;
    const offers = apps.filter(a => a.status === "Offer").length;
    const avg = S.reviews.length ? Math.round(S.reviews.reduce((s, r) => s + r.score, 0) / S.reviews.length) : 0;
    const latestTest = S.selfTests.length ? S.selfTests[S.selfTests.length - 1].score : null;
    const prep = Math.round(((avg || 60) + (latestTest || 65)) / 2);
    const pmPool = D.questions.filter(q => q.cat === "AI 产品" || q.cat === "产品");
    const dayIdx = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1)) / 864e5) % pmPool.length;
    const dailyQ = pmPool[dayIdx];
    const dailyPracticed = S.practice.some(p => p.date === today() && p.qid === dailyQ.id);
    const streak = practiceStreak();
    const cats = catScores();
    const weakCats = cats.slice(0, 3).map(c => c.cat);
    const recs = [];
    const recUsed = new Set();
    weakCats.forEach(cat => {
      const q = D.questions.find(x => x.cat === cat && !S.mastered.includes(x.id) && !recUsed.has(x.id));
      if (q) { recs.push(q); recUsed.add(q.id); }
    });
    if (recs.length < 3) {
      D.questions.forEach(q => {
        if (recs.length >= 3 || recUsed.has(q.id) || S.mastered.includes(q.id)) return;
        recs.push(q);
        recUsed.add(q.id);
      });
    }
    const nextInterview = apps.find(a => a.status === "面试") || null;
    const upcoming = apps.filter(a => a.interviewAt && new Date(a.interviewAt) > new Date()).sort((a, b) => new Date(a.interviewAt) - new Date(b.interviewAt)).slice(0, 6);
    const wk = weekStats();
    return `
      <div class="hero-band">
        <div class="grow">
          <h2>${esc(S.profile.name)}，今天也准备充分一点。</h2>
          <p>目标岗位 ${esc(S.profile.role || "未设置")} · ${today()} · 距离秋招黄金期还有 ${Math.max(0, Math.round((new Date(new Date().getFullYear(), 8, 1) - new Date()) / 864e5))} 天</p>
        </div>
        <div class="hero-score"><b>${prep}</b><span>准备指数</span></div>
      </div>
      ${window.Auth && !Auth.user() ? '<div class="note">' + Icon("users") + "<span>访客演示模式：数据仅保存在本机，每日 AI 使用限 10 次；注册登录后可云端同步并无限使用 AI。</span></div>" : ""}
      <div class="grid grid-2" style="margin-bottom:14px">
        <div class="card panel" style="display:flex;gap:10px;align-items:flex-start">
          <div class="stat-ic b-teal" style="background:var(--brand-soft);color:var(--brand-dark)">${Icon("sparkles")}</div>
          <div class="grow"><strong>每日一题</strong><span style="font-size:11px;color:var(--ink-3);margin-left:6px">每日更新 · 产品方向</span><p style="font-size:13px;color:var(--ink-2);margin-top:4px">${esc(dailyQ.q)}</p>
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
            <button class="btn btn-sm" data-action="practice-one" data-id="${dailyQ.id}">${Icon("play")}${dailyPracticed ? "再练一次" : "开始练习"}</button>
            ${dailyPracticed ? badge("今日已完成", "b-green") : ""}
            ${badge("连续练习 " + streak + " 天", streak > 0 ? "b-teal" : "b-gray")}
          </div></div>
        </div>
        <div class="card panel">
          <div class="section-title">${Icon("zap")}快捷操作</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <button class="btn btn-primary" data-action="navigate" data-id="mock">${Icon("mic")}开始模拟面试</button>
            <button class="btn" data-action="navigate" data-id="solver">${Icon("scan")}笔试解题</button>
            <button class="btn" data-action="navigate" data-id="resume">${Icon("file")}简历诊断</button>
            <button class="btn" data-action="open-app-modal">${Icon("plus")}记录投递</button>
          </div>
          <div class="note" style="margin-top:14px;margin-bottom:0">${Icon("lightbulb")}<span>准备指数由模拟面试分与自测分实时生成，做完一场训练再看会有变化。</span></div>
        </div>
      </div>
      <div class="card panel" style="margin-bottom:14px">
        <div class="panel-head"><div><h2>今日任务</h2><div class="sub">可新增、修改、删除并标记完成</div></div>
          <button class="btn btn-sm" data-action="open-task-modal">${Icon("plus")}新增任务</button></div>
        ${S.tasks.length ? S.tasks.map(t => `
          <div class="list-row">
            <input type="checkbox" class="task-check" data-action="toggle-task" data-id="${t.id}" ${t.done ? "checked" : ""} aria-label="标记完成">
            <div class="grow"><h4 class="${t.done ? "task-done-title" : ""}">${esc(t.title)}</h4><p>${esc(t.note || "无备注")}</p></div>
            <button class="icon-btn" data-action="edit-task" data-id="${t.id}" aria-label="编辑任务">${Icon("edit")}</button>
            <button class="icon-btn" data-action="delete-task" data-id="${t.id}" aria-label="删除任务">${Icon("trash")}</button>
          </div>`).join("") : '<div class="empty">' + Icon("calendar") + "<h3>暂无任务</h3><p>点击右上角新增一条任务</p></div>"}
      </div>
      <div class="card panel" style="margin-bottom:14px">
        <div class="panel-head"><div><h2>能力雷达与薄弱点</h2><div class="sub">根据练习记录统计各方向平均分，优先攻克薄弱方向</div></div>
          <button class="btn btn-sm" data-action="navigate" data-id="bank">${Icon("arrow-right")}去题库</button></div>
        ${cats.length ? `
          <div class="grid grid-2">
            <div>
              ${cats.map(c => {
                const color = c.score >= 75 ? "var(--green)" : c.score >= 60 ? "var(--amber)" : "var(--red)";
                return '<div class="dim-row"><span>' + esc(c.cat) + "（" + c.count + "次）</span><div class=\"progress\"><i style=\"width:" + c.score + "%;background:" + color + "\"></i></div><b>" + c.score + "</b></div>";
              }).join("")}
            </div>
            <div>
              <div class="section-title">${Icon("target")}推荐练习</div>
              ${recs.slice(0, 3).map(q => `
                <div class="list-row">
                  <div class="grow"><h4>${esc(q.q)}</h4><div class="q-meta" style="margin-top:4px">${badge(q.cat, "b-teal")}${badge(q.diff, DIFF_COLOR[q.diff])}</div></div>
                  <button class="btn btn-sm" data-action="practice-one" data-id="${q.id}">${Icon("play")}练习</button>
                </div>`).join("")}
            </div>
          </div>` : '<div class="empty">' + Icon("gauge") + "<h3>还没有练习记录</h3><p>完成一场模拟面试或练习一道题后，这里会生成能力雷达</p><button class='btn btn-primary' style='margin-top:10px' data-action='navigate' data-id='mock'>去模拟面试</button></div>"}
      </div>
      <div class="card panel" style="margin-bottom:14px">
        <div class="panel-head"><div><h2>面试日历</h2><div class="sub">即将到来的面试与倒计时</div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${notifySupported() && notifyPermission() !== "granted" ? '<button class="btn btn-sm" data-action="enable-notify">' + Icon("bell") + "开启通知</button>" : ""}
            <button class="btn btn-sm" data-action="navigate" data-id="tracker">${Icon("arrow-right")}管理</button>
          </div></div>
        ${upcoming.length ? upcoming.map(a => {
          const diff = new Date(a.interviewAt) - Date.now();
          const color = diff < 2 * 3600e3 ? "b-red" : diff < 24 * 3600e3 ? "b-amber" : "b-teal";
          return `
          <div class="list-row">
            <div class="stat-ic b-gray" style="background:var(--gray-soft);color:var(--ink-2);width:40px;height:40px">${Icon("calendar")}</div>
            <div class="grow"><h4>${esc(a.company)} · ${esc(a.role)}</h4><p>${fmtInterview(a.interviewAt)} · ${esc(a.city || "未填城市")}</p></div>
            ${badge(countdownText(a.interviewAt), color)}
            ${a.link ? '<a class="btn btn-sm" href="' + esc(a.link) + '" target="_blank" rel="noopener">' + Icon("link") + "打开</a>" : ""}
          </div>`;
        }).join("") : '<div class="empty">' + Icon("calendar") + "<h3>暂无已安排面试</h3><p>在投递管理中填写面试时间后，这里会显示倒计时</p></div>"}
      </div>
      <div class="card panel" style="margin-bottom:14px">
        <div class="panel-head"><div><h2>本周学习报告</h2><div class="sub">${esc(wk.range)} · 每周自动汇总</div></div>
          <button class="btn btn-sm" data-action="export-week">${Icon("download")}导出周报</button></div>
        <div class="review-metrics">
          <div class="metric"><b>${wk.count}</b><span>练习次数</span></div>
          <div class="metric"><b>${wk.avg === null ? "—" : wk.avg}</b><span>平均得分</span></div>
          <div class="metric"><b>${wk.uniqueQ}</b><span>练习题目</span></div>
          <div class="metric"><b>${wk.apps}</b><span>新增投递</span></div>
          <div class="metric"><b>${wk.interviews}</b><span>面试安排</span></div>
          <div class="metric"><b>${wk.tasksDone}</b><span>完成任务</span></div>
        </div>
      </div>
      <div class="card panel" style="margin-bottom:14px">
        <div class="panel-head"><div><h2>投递管道</h2><div class="sub">按状态汇总，点击进入投递管理</div></div>
          <button class="btn btn-sm" data-action="navigate" data-id="tracker">${Icon("arrow-right")}管理</button></div>
        <div class="grid" style="grid-template-columns:repeat(5,minmax(0,1fr));gap:10px">
          ${D.statuses.filter(s => s !== "拒绝").map(s => {
            const list = apps.filter(a => a.status === s);
            return '<div style="border:1px solid var(--line-2);border-radius:var(--radius-sm);padding:10px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span class="badge ' + STATUS_COLOR[s] + '">' + s + '</span><b>' + list.length + '</b></div>' +
              list.slice(0, 2).map(a => '<div style="font-size:12px;padding:5px 0;border-top:1px dashed var(--line-2)"><strong>' + esc(a.company) + '</strong><div style="color:var(--ink-3)">' + esc(a.role) + '</div></div>').join("") + "</div>";
          }).join("")}
        </div>
      </div>
      <div class="card panel" style="margin-bottom:14px">
        <div class="panel-head"><div><h2>最近复盘</h2><div class="sub">最近的模拟面试报告</div></div>
          <button class="btn btn-sm" data-action="navigate" data-id="reviews">${Icon("arrow-right")}全部</button></div>
        ${S.reviews.length ? S.reviews.slice(0, 3).map(r => `
          <div class="list-row" data-action="open-review" data-id="${r.id}" style="cursor:pointer">
            <div class="grow"><h4>${esc(r.track)} ${esc(r.scenario)} · ${r.score} 分</h4><p>${esc(r.date)} · ${r.total} 题 · ${esc(r.summary.slice(0, 46))}…</p></div>
            ${badge(r.score >= 80 ? "优秀" : r.score >= 60 ? "合格" : "待加强", r.score >= 80 ? "b-green" : r.score >= 60 ? "b-amber" : "b-red")}
          </div>`).join("") : '<div class="empty">' + Icon("clipboard") + "<h3>还没有复盘报告</h3><p>完成一场模拟面试后自动生成</p></div>"}
      </div>
      <div class="card panel">
        <div class="panel-head"><div><h2>校招速览</h2><div class="sub">最新汇总信息</div></div>
          <button class="btn btn-sm" data-action="navigate" data-id="resources">${Icon("arrow-right")}更多</button></div>
        ${D.resources.campus.slice(0, 3).map(r => `
          <div class="list-row"><div class="grow"><h4>${esc(r.company)}</h4><p>${esc(r.batch)} · ${esc(r.cities)}</p></div>${badge(r.batch, r.batch.includes("提前") ? "b-red" : "b-teal")}</div>`).join("")}
      </div>`;
  }

  function pageAgent() {
    return `
      <div class="hero-band">
        <div class="grow"><h2>今天想完成什么？</h2><p>输入求职目标，Agent 会自主规划、调用工具并生成可执行的行动方案。</p></div>
        ${badge("Single Agent + Tools", "b-teal")}
      </div>
      <div class="card panel" style="margin-bottom:14px">
        <div class="form-grid">
          <div class="form-item full"><label>求职目标</label>
            <textarea id="agentGoal" rows="3" placeholder="例如：帮我准备阿里 AI 产品经理面试，还有 10 天">${esc(agentInput)}</textarea></div>
          <div class="form-item full"><label>快捷目标</label>
            <div class="pill-row">
              ${["准备阿里 AI 产品经理面试", "分析腾讯 AI PM 岗位我适不适合", "还有 10 天面试，帮我安排计划", "帮我诊断能力差距并推荐题目"].map(g => '<button type="button" class="option-chip" data-action="agent-goal" data-value="' + esc(g) + '">' + esc(g) + "</button>").join("")}
            </div>
          </div>
          <div class="form-item full"><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="agentShowJd" data-action="agent-toggle-jd" ${agentShowJd ? "checked" : ""} style="accent-color:var(--brand)"> 附带岗位 JD 文本</label></div>
          ${agentShowJd ? '<div class="form-item full"><label>JD 文本</label><textarea id="agentJdText" rows="5" placeholder="粘贴目标岗位 JD…"></textarea></div>' : ""}
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary" data-action="run-agent">${Icon("bot")}让 Agent 执行</button>
        </div>
      </div>
      <div id="agentResultWrap">${agentResult ? agentResultHtml(agentResult) : '<div class="card empty">' + Icon("bot") + "<h3>还没有执行任务</h3><p>输入一个求职目标，让 Agent 开始分析。</p></div>"}</div>`;
  }

  function agentResultHtml(r) {
    const traceHtml = r.trace.map((t, i) => `
      <details style="border-bottom:1px solid var(--line-2)">
        <summary style="cursor:pointer;padding:10px 12px;display:flex;gap:8px;align-items:center">
          <span style="color:var(--green)">✓</span><b style="font-size:13px">${i + 1}. ${esc(t.label)}</b>
          <span style="margin-left:auto;color:var(--ink-3);font-size:12px">${esc(t.name)}</span>
        </summary>
        <div style="padding:0 12px 10px 34px;font-size:12.5px;color:var(--ink-2);line-height:1.6">${esc(t.detail)}</div>
      </details>`).join("");
    const planHtml = r.plan.map((p, i) => `<div class="list-row"><div class="grow"><h4>${esc(p)}</h4></div>${badge("Day " + (i + 1), "b-gray")}</div>`).join("");
    const qHtml = r.ids.map(id => {
      const q = D.questions.find(x => x.id === id);
      if (!q) return "";
      return `<div class="list-row"><div class="grow"><h4>${esc(q.q)}</h4><div class="q-meta" style="margin-top:4px">${badge(q.cat, "b-teal")}${badge(q.diff, DIFF_COLOR[q.diff])}</div></div>
        <button class="btn btn-sm" data-action="agent-practice" data-id="${q.id}">${Icon("play")}练习</button></div>`;
    }).join("");
    return `
      <div class="card panel" style="margin-bottom:14px">
        <div class="panel-head"><div><h2>Agent 执行轨迹</h2><div class="sub">展示每一步调用的工具与中间结果</div></div>${badge(r.ms + "ms 本地执行", "b-gray")}</div>
        ${traceHtml}
      </div>
      <div class="grid grid-2" style="margin-bottom:14px">
        <div class="card panel">
          <div class="panel-head"><div><h2>岗位匹配分析</h2><div class="sub">${esc(r.company || "目标企业")} · ${esc(r.role)}</div></div></div>
          <div class="score-grid" style="grid-template-columns:110px 1fr">
            ${ringHtml(r.matchScore)}
            <div>
              <h4 style="font-size:13px;margin-bottom:6px">优势</h4>
              ${r.strengths.map(s => '<div style="font-size:13px;color:var(--green);margin:3px 0">✓ ' + esc(s) + "</div>").join("")}
              <h4 style="font-size:13px;margin:10px 0 6px">缺口</h4>
              ${r.gaps.map(g => '<div style="font-size:13px;color:var(--amber);margin:3px 0">▲ ' + esc(g) + "</div>").join("") || '<div style="font-size:13px;color:var(--ink-3)">暂无练习数据，建议先完成一次模拟面试</div>'}
            </div>
          </div>
        </div>
        <div class="card panel">
          <div class="panel-head"><div><h2>岗位信息</h2><div class="sub">来自 Job Search Tool</div></div>
            ${r.jobs[0] && r.jobs[0].link ? '<a class="btn btn-sm" href="' + esc(r.jobs[0].link) + '" target="_blank" rel="noopener">' + Icon("link") + "打开</a>" : ""}</div>
          ${(r.jobs[0] ? '<div class="list-row"><div class="grow"><h4>' + esc(r.jobs[0].company) + "</h4><p>" + esc(r.jobs[0].batch) + " · " + esc(r.jobs[0].roles) + " · " + esc(r.jobs[0].cities) + "</p></div></div>" : "")}
          <div class="answer-block"><h4>JD 关键要求</h4><p style="line-height:1.7">${esc(r.jd.keywords.join("、"))}</p></div>
        </div>
      </div>
      <div class="card panel" style="margin-bottom:14px">
        <div class="panel-head"><div><h2>${r.plan.length} 天准备计划</h2><div class="sub">Training Plan Tool 生成，可执行后按日完成</div></div>${badge("动态可调整", "b-teal")}</div>
        ${planHtml}
      </div>
      <div class="grid grid-2" style="margin-bottom:14px">
        <div class="card panel">
          <div class="panel-head"><div><h2>推荐训练题目</h2><div class="sub">基于能力缺口推荐</div></div></div>
          ${qHtml || '<div class="empty">' + Icon("book") + "<h3>暂无可推荐题目</h3></div>"}
        </div>
        <div class="card panel">
          <div class="panel-head"><div><h2>建议行动任务</h2><div class="sub">高风险操作需你确认后执行</div></div>${badge("Human-in-the-loop", "b-amber")}</div>
          ${r.tasks.map(t => `<div class="list-row"><div class="grow"><h4>${esc(t.title)}</h4><p>${esc(t.note)}</p></div></div>`).join("")}
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
            <button class="btn btn-primary" data-action="agent-confirm-tasks">${Icon("check")}确认创建任务</button>
            <button class="btn" data-action="agent-save-job">${Icon("briefcase")}保存岗位到投递</button>
            <button class="btn" data-action="agent-practice-all">${Icon("play")}练习推荐题目</button>
          </div>
        </div>
      </div>
      <div id="agentAiInsight" style="margin-bottom:14px"></div>`;
  }

  function runAgentAction() {
    const goal = ($("#agentGoal") && $("#agentGoal").value.trim()) || agentInput;
    if (!goal) { toast("请输入求职目标"); return; }
    agentInput = goal;
    const jd = ($("#agentJdText") && $("#agentJdText").value) || "";
    const resumeText = S.resumes && S.resumes[0] ? S.resumes[0].text : "";
    agentResult = window.Agent.runGoal(goal, { jd, resumeText, state: S });
    render();
    if (canUseAI()) {
      const prompt = [
        { role: "system", content: "你是 OfferFlow 求职 Agent 的决策层。基于本地工具结果，用 120 字以内补充最有价值的一条判断与一个可执行建议，不要重复已有信息。" },
        { role: "user", content: "目标：" + goal + "\n工具摘要：" + JSON.stringify({ matchScore: agentResult.matchScore, gaps: agentResult.gaps, plan: agentResult.plan.slice(0, 3), tasks: agentResult.tasks.map(t => t.title) }) }
      ];
      E.callAI(prompt, S.profile).then(res => {
        const el = $("#agentAiInsight");
        if (el && res) el.innerHTML = '<div class="answer-block" style="border-left:3px solid var(--brand)"><h4>Agent 决策洞察</h4><div style="line-height:1.7">' + nl(res) + "</div></div>";
      });
    }
  }

  function confirmAgentTasks() {
    if (!agentResult) return;
    const existing = new Set(S.tasks.map(t => t.title));
    let added = 0;
    agentResult.tasks.forEach(t => {
      if (!existing.has(t.title)) {
        S.tasks.unshift({ id: uid(), title: t.title, note: t.note, done: false });
        added++;
      }
    });
    save();
    render();
    toast("已创建 " + added + " 个任务");
  }

  function saveAgentJob() {
    if (!agentResult || !agentResult.company) { toast("未识别目标企业"); return; }
    const job = agentResult.jobs[0] || {};
    S.apps.unshift({
      id: uid(), company: agentResult.company, role: agentResult.role,
      city: job.cities && job.cities !== "待确认" ? job.cities : "",
      channel: "AI Agent", status: "意向", applyDate: today(),
      link: job.link || "", note: "来自 AI 求职 Agent"
    });
    save();
    render();
    toast("已加入投递管理");
  }

  function reviewDiagnosis() {
    const gaps = {};
    S.reviews.slice(0, 8).forEach(r => (r.improves || []).forEach(g => { gaps[g] = (gaps[g] || 0) + 1; }));
    const top = Object.entries(gaps).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const weakCats = [...new Set(S.reviews.flatMap(r => (r.turns || []).filter(t => t.score < 60).map(t => t.cat)))];
    diagIds = window.Agent.recommend(S, weakCats.length ? weakCats : ["AI 产品"], 5);
    const qRows = diagIds.map(id => {
      const q = D.questions.find(x => x.id === id);
      return q ? '<div class="list-row"><div class="grow"><h4>' + esc(q.q) + "</h4><p>" + esc(q.cat) + " · " + esc(q.diff) + "</p></div></div>" : "";
    }).join("");
    showModal(`
      <div class="modal-head"><h3>Agent 复盘诊断</h3><button class="icon-btn" data-action="close-modal">${Icon("x")}</button></div>
      <div class="modal-body">
        <p style="font-size:13.5px;line-height:1.7;color:var(--ink-2);margin-bottom:12px">分析最近 ${S.reviews.length} 场复盘，识别重复出现的改进点：</p>
        ${top.length ? top.map(t => `<div style="padding:9px 12px;border:1px solid var(--line-2);border-radius:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px">${esc(t[0])}</span>${badge("出现 " + t[1] + " 次", t[1] >= 3 ? "b-red" : "b-amber")}</div>`).join("") : '<div class="empty">' + Icon("check-circle") + "<h3>未发现重复问题</h3><p>继续保持当前训练节奏</p></div>"}
        <h3 style="font-size:14px;margin:16px 0 8px">推荐训练</h3>
        ${qRows || '<div class="empty">' + Icon("book") + "<h3>暂无可推荐题目</h3></div>"}
      </div>
      <div class="modal-foot">
        <button class="btn" data-action="close-modal">关闭</button>
        <button class="btn" data-action="diag-create-tasks">${Icon("check")}创建训练任务</button>
        <button class="btn btn-primary" data-action="diag-practice">${Icon("play")}练习推荐题</button>
      </div>`, true);
  }

  async function resumeAgent() {
    const text = ($("#resumeText") && $("#resumeText").value) || "";
    const jd = ($("#jdText") && $("#jdText").value) || "";
    if (!text.trim()) { toast("请先粘贴简历内容"); return; }
    if (!jd.trim()) { toast("请先粘贴目标岗位 JD"); return; }
    const box = $("#resumeResult");
    const before = E.scoreResume(text, jd).score;
    if (S.profile.aiEnabled && S.profile.apiKey && canUseAI()) {
      if (box) box.innerHTML = '<div class="empty">' + Icon("bot") + "<h3>Agent 简历优化中…</h3><p>分析 → 改写 → 再评估，最多等待 60 秒</p></div>";
      const prompt = [
        { role: "system", content: "你是 AI 产品经理招聘简历 Agent。请完成：1.【优化前匹配分】2.【改写后简历】用 Markdown 输出可直接使用的简历 3.【优化后匹配分】4.【关键改动说明】。先分析再改写再评估，不要客套。" },
        { role: "user", content: "JD：\n" + jd + "\n\n简历：\n" + text }
      ];
      const res = await E.callAI(prompt, S.profile);
      if (!res) {
        if (box) box.innerHTML = '<div class="note">' + Icon("alert-circle") + "<span>Agent 调用失败，已回退本地优化。</span></div>";
        localResumeAgent(text, jd, before, box);
        return;
      }
      if (box) box.innerHTML = '<div class="card panel" style="border-color:var(--line)"><div class="panel-head"><div><h2>Agent 简历优化结果</h2><div class="sub">分析 → 改写 → 再评估</div></div>' + badge("AI 生成", "b-teal") + '</div><div style="margin-top:12px"><textarea id="agentResumeText" rows="16">' + esc(res) + '</textarea><div style="margin-top:10px"><button class="btn btn-primary btn-sm" data-action="apply-agent-resume">' + Icon("check") + "应用改写后简历</button></div></div>";
    } else {
      localResumeAgent(text, jd, before, box);
    }
  }

  function localResumeAgent(text, jd, before, box) {
    const r1 = E.scoreResume(text, jd);
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    r1.suggestions.slice(0, 3).forEach((s, i) => {
      lines.push("Agent 优化 " + (i + 1) + "：" + s.replace(/[。；;]$/, "") + "（示例：主导 XX 项目，XX 指标提升 40%）");
    });
    const improved = lines.join("\n");
    const after = E.scoreResume(improved, jd).score;
    if (box) box.innerHTML = '<div class="card panel" style="border-color:var(--line)"><div class="panel-head"><div><h2>Agent 简历优化（本地引擎）</h2><div class="sub">分析 → 建议 → 再评估</div></div>' + badge("离线可用", "b-teal") + '</div><div class="score-grid"><div><div class="dim-row"><span>优化前</span><div class="progress"><i style="width:' + before + '%"></i></div><b>' + before + '</b></div><div class="dim-row"><span>优化后</span><div class="progress"><i style="width:' + after + '%;background:var(--green)"></i></div><b>' + after + '</b></div></div><div class="answer-block"><h4>应用建议</h4>' + r1.suggestions.map(s => "<div style='font-size:13px;margin:4px 0'>· " + esc(s) + "</div>").join("") + '</div></div><div class="answer-block" style="margin-top:12px"><h4>优化后简历预览</h4><textarea id="agentResumeText" rows="12">' + esc(improved) + '</textarea><div style="margin-top:10px"><button class="btn btn-primary btn-sm" data-action="apply-agent-resume">' + Icon("check") + "应用到编辑器</button></div></div></div>";
  }

  function taskModal(task) {
    const t = task || { title: "", note: "", done: false };
    showModal(`
      <div class="modal-head"><h3>${task ? "编辑任务" : "新增任务"}</h3><button class="icon-btn" data-action="close-modal">${Icon("x")}</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <input type="hidden" id="taskId" value="${esc(t.id || "")}">
          <div class="form-item full"><label>任务标题</label><input id="taskTitle" value="${esc(t.title)}" placeholder="例如：复习动态规划"></div>
          <div class="form-item full"><label>备注</label><textarea id="taskNote" placeholder="补充时间、链接或注意事项">${esc(t.note || "")}</textarea></div>
          <div class="form-item full"><label>状态</label><select id="taskDone"><option value="0" ${t.done ? "" : "selected"}>未完成</option><option value="1" ${t.done ? "selected" : ""}>已完成</option></select></div>
        </div>
      </div>
      <div class="modal-foot"><button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="save-task">${Icon("save")}保存</button></div>`);
  }

  function saveTask() {
    const id = ($("#taskId") && $("#taskId").value) || "";
    const title = ($("#taskTitle") && $("#taskTitle").value.trim()) || "";
    if (!title) { toast("任务标题必填"); return; }
    const note = ($("#taskNote") && $("#taskNote").value.trim()) || "";
    const done = ($("#taskDone") && $("#taskDone").value) === "1";
    if (id) {
      const t = S.tasks.find(x => x.id === id);
      if (t) Object.assign(t, { title, note, done });
    } else {
      S.tasks.unshift({ id: uid(), title, note, done });
    }
    save();
    closeModal();
    render();
    toast("任务已保存");
  }

  function pageMock() {
    if (MOCK && MOCK.active) return mockSessionHtml();
    const cfg = (MOCK && MOCK.config) || { track: "AI 产品", diff: "中等", scenario: "常规面", lang: "中文", count: 5 };
    const recent = S.reviews.slice(0, 4);
    return `
      <div class="split">
        <div class="card panel">
          <div class="panel-head"><div><h2>面试档案</h2><div class="sub">配置会决定本场出题方向与风格</div></div>${badge("第 1 步 / 共 1 步", "b-teal")}</div>
          <div class="form-grid">
            <div class="form-item full"><label>岗位方向</label>
              <div class="pill-row" id="mockTrack">${D.tracks.map(t => '<button type="button" class="option-chip' + (cfg.track === t ? " active" : "") + '" data-mock="track" data-value="' + t + '">' + t + "</button>").join("")}</div>
            </div>
            <div class="form-item full"><label>难度</label>
              <div class="pill-row" id="mockDiff">${["混合", ...D.diffs].map(t => '<button type="button" class="option-chip' + (cfg.diff === t ? " active" : "") + '" data-mock="diff" data-value="' + t + '">' + t + "</button>").join("")}</div>
            </div>
            <div class="form-item full"><label>面试场景</label>
              <div class="pill-row" id="mockScenario">${["常规面", "压力面", "英文面"].map(t => '<button type="button" class="option-chip' + (cfg.scenario === t ? " active" : "") + '" data-mock="scenario" data-value="' + t + '">' + t + "</button>").join("")}</div>
            </div>
            <div class="form-item"><label>面试语言</label>
              <select id="mockLang"><option value="中文" ${cfg.lang === "中文" ? "selected" : ""}>中文</option><option value="英文" ${cfg.lang === "英文" ? "selected" : ""}>英文</option></select>
            </div>
            <div class="form-item"><label>题量（自定义）</label>
              <input type="number" id="mockCount" min="1" max="20" value="${cfg.count}" style="height:36px">
            </div>
            <div class="form-item full"><label>目标岗位 / 简历摘要（可选，帮助贴合个人经历）</label>
              <textarea id="mockResume" placeholder="例如：2 年前端经验，熟悉 React/Vue，主导过商城订单模块重构，性能提升 40%…"></textarea></div>
            <div class="form-item full"><label>岗位 JD（可选）</label>
              <textarea id="mockJd" placeholder="粘贴目标岗位 JD 关键词，例如：微服务、高并发、TypeScript…"></textarea></div>
            <div class="form-item"><label>AI 连续追问</label>
              <div style="display:flex;align-items:center;gap:8px;height:36px">
                <input type="checkbox" id="mockAiFollow" style="width:18px;height:18px;accent-color:var(--brand)">
                <span class="hint">提交答案后自动生成追问</span>
              </div>
            </div>
            <div class="form-item"><label>每题最多追问</label>
              <select id="mockAiRounds"><option value="1">1 次</option><option value="2" selected>2 次</option><option value="3">3 次</option></select>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="btn btn-primary" data-action="start-mock">${Icon("play")}生成题单并开始</button>
            <button class="btn" data-action="mock-random">${Icon("refresh")}随机配置</button>
          </div>
        </div>
        <div class="side-stack">
          <div class="card panel">
            <div class="panel-head"><div><h2>历史模拟</h2><div class="sub">回看评分与复盘</div></div>
              <button class="btn btn-sm" data-action="navigate" data-id="reviews">${Icon("arrow-right")}全部</button></div>
            ${recent.length ? recent.map(r => `<div class="list-row" data-action="open-review" data-id="${r.id}" style="cursor:pointer"><div class="grow"><h4>${esc(r.track)} · ${esc(r.scenario)}</h4><p>${esc(r.date)} · ${r.total} 题 · ${r.score} 分</p></div>${badge(r.score >= 80 ? "优秀" : r.score >= 60 ? "合格" : "待加强", r.score >= 80 ? "b-green" : r.score >= 60 ? "b-amber" : "b-red")}</div>`).join("") : '<div class="empty">' + Icon("history") + "<h3>暂无历史</h3><p>完成首场模拟后自动生成复盘</p></div>"}
          </div>
          <div class="card panel">
            <div class="section-title">${Icon("lightbulb")}训练建议</div>
            <ul style="list-style:none;display:flex;flex-direction:column;gap:10px">
              <li style="display:flex;gap:8px;font-size:13px;color:var(--ink-2)"><b style="color:var(--brand-dark)">1.</b> 技术题先给结论，再展开原理和例子</li>
              <li style="display:flex;gap:8px;font-size:13px;color:var(--ink-2)"><b style="color:var(--brand-dark)">2.</b> 行为题统一用 STAR，结果尽量量化</li>
              <li style="display:flex;gap:8px;font-size:13px;color:var(--ink-2)"><b style="color:var(--brand-dark)">3.</b> 压力面只练不慌：答不出也保持节奏</li>
              <li style="display:flex;gap:8px;font-size:13px;color:var(--ink-2)"><b style="color:var(--brand-dark)">4.</b> 每题限时作答，练完立刻看复盘</li>
            </ul>
          </div>
        </div>
      </div>`;
  }

  function mockSessionHtml() {
    const q = MOCK.queue[MOCK.idx];
    if (!q) return '<div class="empty">' + Icon("alert-circle") + "<h3>题库为空</h3><button class='btn' data-action='navigate' data-id='bank'>去题库看看</button></div>";
    const done = MOCK.submitted;
    return `
      <div class="card panel" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px">
            ${badge(MOCK.config.track, "b-teal")}${badge(MOCK.config.scenario, "b-amber")}${badge(MOCK.config.lang, "b-sky")}
          </div>
          <div class="grow"></div>
          <span class="timer-pill">${Icon("timer")}<span id="mockTimer">${fmtTime(MOCK.left)}</span></span>
          <button class="btn btn-sm" data-action="quit-mock">${Icon("x")}退出</button>
        </div>
        <div class="progress" style="margin-top:12px"><i style="width:${Math.round((MOCK.idx + 1) / MOCK.queue.length * 100)}%"></i></div>
        <div style="text-align:center;color:var(--ink-3);font-size:12px;margin-top:6px">第 ${MOCK.idx + 1} / ${MOCK.queue.length} 题</div>
      </div>
      <div class="card panel" style="margin-bottom:14px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">${badge(q.type, "b-blue")}${badge(q.diff, DIFF_COLOR[q.diff])}</div>
        <h2 style="font-size:19px;line-height:1.5">${esc(q.q)}</h2>
        <div style="margin-top:10px">${(q.tags || []).map(t => '<span class="tag">' + esc(t) + "</span>").join("")}</div>
        ${MOCK.config.scenario === "压力面" ? '<div class="note" style="margin-top:12px">' + Icon("zap") + "<span>压力模式：面试官会打断、追问，重点练稳定输出。</span></div>" : ""}
      </div>
      <div class="card panel">
        <div class="panel-head"><div><h2>你的回答</h2><div class="sub">${MOCK.config.lang === "英文" ? "Answer in English" : "建议按总分结构作答"}</div></div>${done ? "" : '<div style="display:flex;gap:8px">' + (window.SpeechRecognition || window.webkitSpeechRecognition ? '<button class="btn btn-sm" id="voiceBtn" data-action="toggle-voice">' + Icon("mic") + '<span id="voiceText">语音输入</span></button>' : "") + '<button class="btn btn-primary btn-sm" id="mockSubmit" data-action="submit-answer">' + Icon("send") + "提交答案</button></div>"}</div>
        <textarea id="mockAnswer" rows="7" placeholder="在此输入回答…" ${done ? "disabled" : ""}></textarea>
        <div id="mockFeedback" style="margin-top:14px"></div>
      </div>`;
  }

  function speechAPI() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; }

  function toggleVoice() {
    const SR = speechAPI();
    if (!SR) { toast("当前浏览器不支持语音输入，建议使用 Chrome"); return; }
    if (voiceOn) { stopVoice(); return; }
    const rec = new SR();
    rec.lang = (MOCK && MOCK.config.lang === "英文") ? "en-US" : "zh-CN";
    rec.continuous = true;
    rec.interimResults = true;
    voiceRec = rec;
    voiceOn = true;
    const txt = $("#voiceText");
    if (txt) txt.textContent = "停止录音";
    const btn = $("#voiceBtn");
    if (btn) btn.classList.add("voice-on");
    rec.onresult = function (e) {
      let finalText = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      if (finalText) {
        const ta = $("#mockAnswer");
        if (ta) ta.value = (ta.value ? ta.value + "\n" : "") + finalText;
      }
    };
    rec.onerror = function (e) {
      stopVoice();
      if (e.error === "not-allowed") toast("麦克风权限被拒绝");
    };
    rec.onend = function () {
      if (voiceOn) { try { rec.start(); } catch (err) { voiceOn = false; } }
    };
    try { rec.start(); } catch (e) { voiceOn = false; toast("语音输入启动失败"); }
  }

  function stopVoice() {
    voiceOn = false;
    if (voiceRec) {
      try { voiceRec.onend = null; voiceRec.stop(); } catch (e) {}
      voiceRec = null;
    }
    const txt = $("#voiceText");
    if (txt) txt.textContent = "语音输入";
    const btn = $("#voiceBtn");
    if (btn) btn.classList.remove("voice-on");
  }

  function bindMock() {
    document.querySelectorAll("[data-mock]").forEach(btn => {
      btn.addEventListener("click", function () {
        document.querySelectorAll('[data-mock="' + this.dataset.mock + '"]').forEach(b => b.classList.remove("active"));
        this.classList.add("active");
      });
    });
    if (MOCK && MOCK.active && !MOCK.submitted && !MOCK.timerOn) {
      MOCK.timerOn = true;
      startTimer();
    }
  }

  function startTimer() {
    clearInterval(timerId);
    if (!MOCK || !MOCK.active) return;
    const q = MOCK.queue[MOCK.idx];
    MOCK.left = q && q.type === "手撕" ? 300 : 180;
    const el = $("#mockTimer");
    const tick = () => {
      MOCK.left--;
      if (el) { el.textContent = fmtTime(MOCK.left); if (MOCK.left <= 30) el.style.color = "var(--red)"; }
      if (MOCK.left <= 0) { clearInterval(timerId); MOCK.timerOn = false; submitAnswer(true); }
    };
    timerId = setInterval(tick, 1000);
    MOCK.timerOn = true;
    if (el) el.textContent = fmtTime(MOCK.left);
  }

  function buildQueue(cfg) {
    let pool = D.questions.slice();
    if (cfg.track !== "综合") pool = pool.filter(q => q.cat === cfg.track);
    else {
      const tech = pool.filter(q => ["前端", "后端", "算法", "系统设计"].includes(q.cat));
      const soft = pool.filter(q => ["行为", "产品", "英语"].includes(q.cat));
      pool = shuffle(tech).slice(0, Math.ceil(cfg.count * 0.6)).concat(shuffle(soft).slice(0, Math.ceil(cfg.count * 0.4)));
    }
    if (cfg.diff !== "混合") pool = pool.filter(q => q.diff === cfg.diff);
    if (cfg.lang === "英文") {
      const eng = D.questions.filter(q => q.cat === "英语");
      pool = pool.concat(eng);
    }
    pool = shuffle(pool);
    if (cfg.lang === "英文") {
      const engFirst = pool.filter(q => q.cat === "英语");
      const rest = pool.filter(q => q.cat !== "英语");
      pool = engFirst.slice(0, Math.min(3, engFirst.length)).concat(rest);
    }
    return pool.slice(0, cfg.count);
  }

  function startMockWith(ids) {
    const pool = ids ? D.questions.filter(q => ids.includes(q.id)) : buildQueue(readMockConfig());
    if (!pool.length) { toast("没有匹配的题目，请调整筛选"); return; }
    MOCK = { active: true, config: readMockConfig(), queue: pool.slice(0, 10), idx: 0, turns: [], submitted: false, left: 180, timerOn: false, startedAt: nowStr(), followCount: 0 };
    navigate("mock");
  }

  function readMockConfig() {
    const track = document.querySelector('[data-mock="track"].active')?.dataset.value || "AI 产品";
    const diff = document.querySelector('[data-mock="diff"].active')?.dataset.value || "中等";
    const scenario = document.querySelector('[data-mock="scenario"].active')?.dataset.value || "常规面";
    const lang = ($("#mockLang") && $("#mockLang").value) || "中文";
    const count = Math.max(1, Math.min(20, Number(($("#mockCount") && $("#mockCount").value) || 5)));
    const aiFollow = $("#mockAiFollow") ? $("#mockAiFollow").checked : false;
    const aiRounds = Number(($("#mockAiRounds") && $("#mockAiRounds").value) || 1);
    return { track, diff, scenario, lang, count, aiFollow, aiRounds, resume: $("#mockResume") ? $("#mockResume").value : "", jd: $("#mockJd") ? $("#mockJd").value : "" };
  }

  function submitAnswer(auto) {
    if (!MOCK || !MOCK.active || MOCK.submitted) return;
    clearInterval(timerId);
    MOCK.timerOn = false;
    MOCK.submitted = true;
    stopVoice();
    const q = MOCK.queue[MOCK.idx];
    const ansEl = $("#mockAnswer");
    const ans = (ansEl ? ansEl.value : "").trim() || (auto ? "（超时未作答）" : "");
    const token = uid();
    const local = E.evalAnswer(q, ans);
    if (auto) local.score = Math.min(local.score, 42);
    local.token = token;
    MOCK.turns.push({ qid: q.id, q: q.q, cat: q.cat, a: ans, score: local.score, points: local.points, gaps: local.gaps, comment: local.comment, token, auto });
    recordPractice(q.id, q.cat, q.type, q.diff, local.score);
    save();
    const fb = $("#mockFeedback");
    if (fb) fb.innerHTML = feedbackHtml(local, q);
    if (fb && S.profile.aiEnabled && S.profile.apiKey) {
      if (MOCK.config.aiFollow && (MOCK.followCount || 0) < (MOCK.config.aiRounds || 1)) {
        aiFollow();
      } else {
        const wrap = document.createElement("div");
        wrap.style.marginTop = "12px";
        wrap.innerHTML = '<button class="btn btn-sm" id="aiFollowBtn" data-action="ai-follow">' + Icon("bot") + "AI 追问</button>";
        fb.appendChild(wrap);
      }
    }
    const sub = $("#mockSubmit");
    if (sub) sub.remove();
    const vbtn = $("#voiceBtn");
    if (vbtn) vbtn.remove();
    const box = $("#mockAnswer");
    if (box) box.disabled = true;
    const q2 = MOCK.queue[MOCK.idx + 1];
    const next = document.createElement("button");
    next.className = "btn btn-primary";
    next.dataset.action = q2 ? "next-question" : "finish-mock";
    next.innerHTML = Icon("arrow-right") + (q2 ? "下一题" : "结束并生成复盘");
    const panel = document.querySelector(".card.panel:last-of-type .panel-head");
    if (panel) panel.appendChild(next);
    maybeAI(q, ans, local);
  }

  function feedbackHtml(f, q) {
    return `
      <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
        <div class="ring" style="--val:${f.score};width:84px;height:84px"><div style="width:62px;height:62px"><b>${f.score}</b><span>本题得分</span></div></div>
        <div style="flex:1;min-width:240px">
          <p style="font-size:14px;line-height:1.6;margin-bottom:10px">${esc(f.comment)}</p>
          ${f.points.length ? '<div style="margin-bottom:8px">' + f.points.map(p => '<div style="font-size:13px;color:var(--green);margin:3px 0">✓ ' + esc(p) + "</div>").join("") + "</div>" : ""}
          ${f.gaps.length ? '<div>' + f.gaps.map(g => '<div style="font-size:13px;color:var(--amber);margin:3px 0">▲ ' + esc(g) + "</div>").join("") + "</div>" : ""}
        </div>
      </div>
      ${q ? '<div class="answer-block" style="margin-top:12px"><h4>参考答案</h4><div style="line-height:1.75">' + nl(q.ans) + "</div>" + ((q.points || []).length ? "<div style='margin-top:8px;font-size:12.5px;color:var(--ink-2)'><b>要点：</b>" + esc(q.points.join("；")) + "</div>" : "") + "</div>" : ""}
      <div id="aiAdvice" style="margin-top:12px;font-size:13px;color:var(--ink-2);line-height:1.65"></div>`;
  }

  function maybeAI(q, ans, local) {
    const p = S.profile;
    if (!canUseAI()) return;
    const el = $("#aiAdvice");
    if (el) el.innerHTML = '<span class="badge b-amber">' + Icon("sparkles", 12) + " AI 增强分析中…</span>";
    const prompt = [
      { role: "system", content: "你是资深面试教练。根据问题和候选人回答，用 80 字以内给出具体改进建议，指出 1 个亮点与 1 个不足。" },
      { role: "user", content: "题目：" + q.q + "\n\n候选回答：" + ans }
    ];
    E.callAI(prompt, p).then(res => {
      const cur = MOCK && MOCK.turns.length ? MOCK.turns[MOCK.turns.length - 1] : null;
      if (res && cur && cur.token === local.token) {
        const box = $("#aiAdvice");
        if (box) box.innerHTML = '<span class="badge b-teal">' + Icon("sparkles", 12) + " AI 增强建议</span><div style='margin-top:8px'>" + nl(res) + "</div>";
      }
    });
  }

  async function aiFollow() {
    if (!MOCK || !MOCK.active) return;
    const turn = MOCK.turns[MOCK.turns.length - 1];
    if (!turn) return;
    if (!canUseAI()) return;
    const btn = $("#aiFollowBtn");
    if (btn) btn.disabled = true;
    if (btn) btn.innerHTML = Icon("bot") + "生成中…";
    const context = MOCK.turns.slice(-4).map(t => "题目：" + t.q + "\n回答：" + t.a).join("\n\n");
    const prompt = [
      { role: "system", content: "你是资深面试官。根据候选人的回答生成一个自然、有压迫感的追问，只输出追问本身，不超过 40 字，不要评价。" },
      { role: "user", content: "对话记录：\n" + context }
    ];
    const res = await E.callAI(prompt, S.profile);
    if (!res) {
      if (btn) { btn.disabled = false; btn.innerHTML = Icon("bot") + "AI 追问"; }
      toast("追问生成失败，请检查接口配置");
      return;
    }
    MOCK.followCount = (MOCK.followCount || 0) + 1;
    const q = MOCK.queue[MOCK.idx];
    const follow = { id: uid(), cat: q.cat, type: "场景", diff: q.diff, q: res, tags: ["AI 追问"], ans: "", kws: [], points: [], follow: [] };
    MOCK.queue.splice(MOCK.idx + 1, 0, follow);
    if (btn) btn.remove();
    toast("已插入一道 AI 追问");
  }

  function finishMock() {
    if (!MOCK || !MOCK.turns.length) { MOCK = null; navigate("mock"); return; }
    const turns = MOCK.turns;
    const scores = turns.map(t => t.score);
    const score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const tech = turns.filter(t => ["前端", "后端", "算法", "系统设计"].includes(t.cat));
    const soft = turns.filter(t => ["行为", "产品", "英语"].includes(t.cat));
    const techScore = tech.length ? Math.round(tech.reduce((s, t) => s + t.score, 0) / tech.length) : 0;
    const softScore = soft.length ? Math.round(soft.reduce((s, t) => s + t.score, 0) / soft.length) : 0;
    const structureScore = Math.round((score + (turns.filter(t => /第一|首先|然后|最后|1\.|2\./.test(t.a)).length * 4)) / 2);
    const dims = {
      技术深度: techScore || Math.round(score * 0.95),
      表达结构: E.clamp(structureScore, 40, 98),
      项目还原: softScore || Math.round(score * 0.9),
      行为面试: softScore || Math.round(score * 0.9)
    };
    const strengths = [];
    const improves = [];
    turns.forEach(t => {
      (t.points || []).slice(0, 1).forEach(p => { if (!strengths.includes(p)) strengths.push(p); });
      (t.gaps || []).slice(0, 1).forEach(g => { if (!improves.includes(g)) improves.push(g); });
    });
    const summary = "本场" + MOCK.config.track + "方向" + MOCK.config.scenario + "共完成 " + turns.length + " 题，综合得分 " + score + "。" +
      (score >= 80 ? "整体表现优秀，建议保持节奏并针对薄弱题型加深练习。" : score >= 60 ? "表现稳定，核心思路正确，主要差距在细节与结构化表达。" : "还有明显提升空间，建议先回到题库补齐概念，再做一轮模拟。");
    const review = {
      id: uid(), date: nowStr(), track: MOCK.config.track, scenario: MOCK.config.scenario, lang: MOCK.config.lang,
      score, dims, duration: Math.max(1, Math.round((Date.now() - new Date(MOCK.startedAt.replace(" ", "T")).getTime()) / 60000)),
      total: turns.length, summary, strengths: strengths.slice(0, 5), improves: improves.slice(0, 5),
      turns: turns.map(t => ({ q: t.q, a: t.a, score: t.score, cat: t.cat }))
    };
    S.reviews.unshift(review);
    save();
    const id = review.id;
    MOCK = null;
    navigate("reviews?open=" + id);
  }

  function pageSolver() {
    return `
      <div class="side-stack">
          <div class="card panel">
            <div class="panel-head"><div><h2>智能解题</h2><div class="sub">粘贴题目文本，AI 深度解析；未配置 AI 时使用本地引擎</div></div>${badge("AI + 本地", "b-teal")}</div>
            <div class="form-grid">
              <div class="form-item full"><label>题目文本</label>
                <textarea id="solverInput" rows="8" placeholder="例如：给定一个整数数组 nums 和目标值 target，请找出和为目标值的那两个整数并返回下标。"></textarea></div>
              <div class="form-item"><label>题目类型</label>
                <select id="solverType"><option>编程</option><option>逻辑</option><option>选择</option><option>读图</option><option>英语</option><option>综合</option></select></div>
              <div style="display:flex;align-items:flex-end"><button class="btn btn-primary" data-action="solve">${Icon("scan")}智能分析</button></div>
            </div>
            <div id="solverResult" style="margin-top:14px">${lastSolve ? solverResultHtml(lastSolve) : ""}</div>
          </div>
          <div class="card panel">
            <div class="panel-head"><div><h2>最近解题</h2><div class="sub">保存最近 ${Math.min(20, S.solved.length)} 条</div></div>
              ${S.solved.length ? '<button class="btn btn-sm" data-action="clear-solved">' + Icon("trash") + "清空</button>" : ""}</div>
            <div id="solvedList">${S.solved.length ? S.solved.map(x => '<div class="list-row"><div class="grow"><h4>' + esc(x.title) + "</h4><p>" + esc(x.text.slice(0, 60)) + "…</p></div>" + badge(x.matched ? "命中" : "通用", x.matched ? "b-green" : "b-gray") + "</div>").join("") : '<div class="empty">' + Icon("history") + "<h3>暂无记录</h3><p>分析过的题目会出现在这里</p></div>"}</div>
          </div>
        </div>
        <div class="card panel">
          <div class="panel-head"><div><h2>白板练习</h2><div class="sub">内置高频笔试题，可展开提示与解法</div></div>${badge(D.solverDb.length + " 题", "b-blue")}</div>
          ${D.solverDb.map(p => `
            <details class="q-card" style="padding:0">
              <summary style="cursor:pointer;padding:13px 14px;font-weight:600;font-size:14px;list-style:none">${esc(p.title)} <span style="font-weight:400;color:var(--ink-3);font-size:12px">· ${p.tags.join(" / ")}</span></summary>
              <div style="padding:0 14px 14px">
                <div class="answer-block"><h4>提示</h4>${esc(p.hint)}</div>
                <div class="answer-block"><h4>解题思路</h4><span style="white-space:pre-line">${esc(p.approach)}</span></div>
                <pre>${esc(p.code)}</pre>
                <div style="font-size:12.5px;color:var(--ink-3)">${esc(p.complexity)}</div>
              </div>
            </details>`).join("")}
        </div>
      </div>`;
  }

  function solverResultHtml(r) {
    return `
      <div class="answer-block" style="margin-top:0">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${badge(r.matched ? "命中题型" : "通用框架", r.matched ? "b-green" : "b-gray")}${badge(r.title, "b-blue")}${(r.tags || []).map(t => '<span class="tag">' + esc(t) + "</span>").join("")}</div>
        <h4>解题思路</h4>
        <div style="white-space:pre-line;line-height:1.7;font-size:13px;color:var(--ink-2)">${esc(r.approach)}</div>
        ${r.code ? "<h4 style='margin-top:12px'>示例代码</h4><pre>" + esc(r.code) + "</pre>" : ""}
        <h4 style="margin-top:10px">复杂度</h4>
        <div style="font-size:13px;color:var(--ink-2)">${esc(r.complexity)}</div>
      </div>`;
  }

  function pageBank() {
    const f = filters.bank;
    const favOn = f.fav, masOn = f.master;
    return `
      <div class="card" style="margin-bottom:14px">
        <div class="toolbar">
          <div class="search-box">${Icon("search")}<input id="bankSearch" placeholder="搜索题目、关键词…" value="${esc(f.q)}"></div>
          <select class="field" id="bankCat">${["全部", ...D.cats].map(c => '<option ' + (f.cat === c ? "selected" : "") + ">" + c + "</option>").join("")}</select>
          <select class="field" id="bankDiff">${["全部", ...D.diffs].map(c => '<option ' + (f.diff === c ? "selected" : "") + ">" + c + "</option>").join("")}</select>
          <select class="field" id="bankType">${["全部", ...D.types].map(c => '<option ' + (f.type === c ? "selected" : "") + ">" + c + "</option>").join("")}</select>
          <button class="btn btn-sm" data-action="bank-fav" style="${favOn ? "border-color:var(--amber);color:var(--amber)" : ""}">${Icon("star")}收藏</button>
          <button class="btn btn-sm" data-action="bank-master" style="${masOn ? "border-color:var(--brand);color:var(--brand-dark)" : ""}">${Icon("check")}已掌握</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${badge(D.questions.length + " 道题库", "b-teal")}
        ${badge(S.favorites.length + " 收藏", "b-amber")}
        ${badge(S.mastered.length + " 已掌握", "b-green")}
        <div class="grow"></div>
        <button class="btn btn-sm" data-action="practice-filtered">${Icon("play")}练当前筛选集</button>
      </div>
      <div class="card" id="bankList"></div>`;
  }

  function updateBankList() {
    const box = $("#bankList");
    if (!box) return;
    const f = filters.bank;
    let list = D.questions.filter(q => {
      if (f.cat !== "全部" && q.cat !== f.cat) return false;
      if (f.diff !== "全部" && q.diff !== f.diff) return false;
      if (f.type !== "全部" && q.type !== f.type) return false;
      if (f.fav && !S.favorites.includes(q.id)) return false;
      if (f.master && !S.mastered.includes(q.id)) return false;
      if (f.q) {
        const t = (q.q + " " + q.ans + " " + q.tags.join(" ")).toLowerCase();
        if (!t.includes(f.q.toLowerCase())) return false;
      }
      return true;
    });
    if (!list.length) {
      box.innerHTML = '<div class="empty">' + Icon("book") + "<h3>没有匹配的题目</h3><p>换个筛选条件试试</p></div>";
      return;
    }
    box.innerHTML = list.map(q => {
      const fav = S.favorites.includes(q.id);
      const mas = S.mastered.includes(q.id);
      const lp = lastPractice(q.id);
      return `
        <div class="q-card">
          <div class="q-row">
            <div class="grow" data-action="toggle-q" data-id="${q.id}" style="cursor:pointer">
              <h3>${esc(q.q)}</h3>
              <div class="q-meta">${badge(q.cat, "b-teal")}${badge(q.type, "b-blue")}${badge(q.diff, DIFF_COLOR[q.diff])}${lp !== null ? badge("练过 " + lp + " 分", lp >= 80 ? "b-green" : lp >= 60 ? "b-amber" : "b-red") : ""}${(q.tags || []).map(t => '<span class="tag">' + esc(t) + "</span>").join("")}</div>
            </div>
            <button class="icon-btn" data-action="toggle-fav" data-id="${q.id}" title="收藏" style="${fav ? "color:var(--amber);border-color:var(--amber)" : ""}">${Icon("star")}</button>
            <button class="icon-btn" data-action="toggle-master" data-id="${q.id}" title="标记掌握" style="${mas ? "color:var(--green);border-color:var(--green)" : ""}">${Icon("check")}</button>
            <button class="btn btn-sm" data-action="practice-one" data-id="${q.id}">${Icon("play")}练习</button>
          </div>
          <div id="qa-${q.id}" class="q-answer" style="display:none">
            <h4>${q.ans && q.ans.indexOf("答题思路：") === 0 ? "标准答案与解析" : "标准答案"}</h4>
            <div style="font-size:13.5px;line-height:1.75">${nl(q.ans)}</div>
            ${q.code ? "<pre>" + esc(q.code) + "</pre>" : ""}
            ${(q.points || []).length ? "<h4>答题思路与要点</h4><ul>" + q.points.map(p => "<li>" + esc(p) + "</li>").join("") + "</ul>" : ""}
            ${q.detail ? "<h4>通俗理解与举例</h4><div style='line-height:1.75'>" + nl(q.detail) + "</div>" : (q.ans && q.ans.indexOf("通俗理解") > -1 ? "" : "")}
            ${(q.follow || []).length ? "<h4>常见追问</h4><div class='q-meta' style='margin-top:0'>" + q.follow.map(f => badge(f, "b-blue")).join("") + "</div>" : ""}
          </div>
        </div>`;
    }).join("");
  }

  function bindBank() {
    const q = $("#bankSearch");
    if (q) q.addEventListener("input", function () { filters.bank.q = this.value; updateBankList(); });
    ["bankCat", "bankDiff", "bankType"].forEach(id => {
      const el = $("#" + id);
      if (el) el.addEventListener("change", function () {
        filters.bank[this.id.replace("bank", "").toLowerCase()] = this.value;
        updateBankList();
      });
    });
    updateBankList();
  }

  function pageResume() {
    const latest = S.resumes[0];
    return `
      <div class="split">
        <div class="side-stack">
          <div class="card panel">
            <div class="panel-head"><div><h2>简历内容</h2><div class="sub">支持手动粘贴，数据仅保存在本地</div></div>${badge("AI 评分", "b-teal")}</div>
            <div class="form-grid">
              <div class="form-item full"><label>简历文本</label>
                <textarea id="resumeText" rows="14" placeholder="姓名、教育背景、技能、项目经历、实习经历…">${latest ? esc(latest.text) : ""}</textarea></div>
              <div class="form-item full"><label>目标岗位 JD（可选，用于关键词匹配）</label>
                <textarea id="jdText" rows="6" placeholder="粘贴 JD 文本，例如：熟悉 React 或 Vue，有大型项目经验，了解性能优化…"></textarea></div>
              <div class="form-item full"><label>简历图片（可选）</label>
                <input type="file" id="resumeImg" accept="image/*" hidden>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                  <button class="btn" data-action="pick-resume-img">${Icon("upload")}选择图片</button>
                  <span class="hint">支持 PNG / JPG；配置 AI 接口后可识别图中文字</span>
                </div>
                <div id="resumeImgPreview" style="margin-top:10px"></div>
              </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
              <button class="btn btn-primary" data-action="diagnose-resume">${Icon("sparkles")}开始诊断</button>
              <button class="btn" data-action="save-resume">${Icon("save")}保存版本</button>
              <button class="btn" data-action="ai-rewrite">${Icon("bot")}AI 改写</button>
              <button class="btn" data-action="ai-match">${Icon("target")}AI 深度匹配</button>
              <button class="btn" data-action="resume-agent">${Icon("zap")}Agent 简历优化</button>
              <button class="btn btn-ghost" data-action="load-sample">${Icon("refresh")}载入示例</button>
            </div>
            <div id="resumeResult" style="margin-top:14px"></div>
          </div>
        </div>
        <div class="card panel">
          <div class="panel-head"><div><h2>版本记录</h2><div class="sub">保存过的简历版本</div></div></div>
          <div id="versionList">
            ${S.resumes.length ? S.resumes.map((r, i) => `<div class="list-row"><div class="grow"><h4>${esc(r.name)}</h4><p>${esc(r.savedAt)} · ${r.text.length} 字</p></div><button class="btn btn-sm" data-action="load-version" data-id="${r.id}">${Icon("rotate")}载入</button></div>`).join("") : '<div class="empty">' + Icon("file") + "<h3>暂无版本</h3><p>保存后会出现在这里</p></div>"}
          </div>
          <div class="answer-block" style="margin-top:12px">
            <h4>评分维度说明</h4>
            <p style="font-size:12.5px;line-height:1.7;color:var(--ink-2)">结构与完整性检查教育/经历/技能区块；量化程度统计数字与业务指标；动词强度识别「主导/优化/交付」等强动词；JD 匹配按 JD 关键词覆盖度计算；篇幅与可读性按行数评估。</p>
          </div>
        </div>
      </div>`;
  }

  function diagnoseResume() {
    const text = ($("#resumeText") && $("#resumeText").value) || "";
    if (!text.trim()) { toast("请先粘贴简历内容"); return; }
    const jd = ($("#jdText") && $("#jdText").value) || "";
    const r = E.scoreResume(text, jd);
    const box = $("#resumeResult");
    box.innerHTML = `
      <div class="card panel" style="border-color:var(--line)">
        <div class="score-grid">
          ${ringHtml(r.score)}
          <div>
            <div style="margin-bottom:10px">${badge(r.level, r.score >= 80 ? "b-green" : r.score >= 60 ? "b-amber" : "b-red")} <span style="font-size:13px;color:var(--ink-3)">综合诊断</span></div>
            ${dimsHtml(r.dims)}
          </div>
        </div>
        <div class="answer-block">
          <h4>改进建议</h4>
          ${r.suggestions.map(s => '<div style="font-size:13px;color:var(--ink-2);margin:5px 0">· ' + esc(s) + "</div>").join("")}
        </div>
      </div>`;
    if (S.profile.aiEnabled && S.profile.apiKey && jd.trim()) aiMatch(true);
  }

  function aiRewrite() {
    const text = ($("#resumeText") && $("#resumeText").value) || "";
    if (!text.trim()) { toast("请先粘贴简历内容"); return; }
    const p = S.profile;
    if (!p.aiEnabled || !p.apiKey) { toast("请先在设置中开启并配置 AI 接口"); return; }
    if (!canUseAI()) return;
    const box = $("#resumeResult");
    box.innerHTML = '<div class="empty">' + Icon("sparkles") + "<h3>AI 改写中…</h3><p>最多等待 25 秒</p></div>";
    E.callAI([
      { role: "system", content: "你是资深简历顾问。改写简历，保留事实，增强动词与量化结果，输出结构化 Markdown 文本，不要加评价。" },
      { role: "user", content: text }
    ], p).then(res => {
      if (!res) { box.innerHTML = '<div class="note">' + Icon("alert-circle") + "<span>AI 调用失败，请检查接口配置，或使用本地诊断。</span></div>"; return; }
      box.innerHTML = '<div class="answer-block"><h4>AI 改写结果</h4><textarea id="aiRewritten" rows="14" style="width:100%;border:1px solid var(--line);border-radius:6px;padding:10px;line-height:1.6">' + esc(res) + "</textarea><div style='margin-top:10px;display:flex;gap:8px'><button class='btn btn-primary btn-sm' data-action='apply-rewrite'>" + Icon("check") + "应用到编辑器</button><button class='btn btn-sm' data-action='copy-rewrite'>" + Icon("copy") + "复制</button></div></div>";
    });
  }

  async function aiMatch(auto) {
    const text = ($("#resumeText") && $("#resumeText").value) || "";
    const jd = ($("#jdText") && $("#jdText").value) || "";
    if (!text.trim()) { toast("请先粘贴简历内容"); return; }
    if (!jd.trim()) { toast("请先粘贴目标岗位 JD"); return; }
    if (!S.profile.aiEnabled || !S.profile.apiKey) { toast("请先在设置中开启并配置 AI 接口"); return; }
    if (!canUseAI()) return;
    const box = $("#resumeResult");
    if (box) box.innerHTML = '<div class="empty">' + Icon("bot") + "<h3>AI 深度匹配中…</h3><p>正在分析岗位匹配度，最多等待 40 秒</p></div>";
    const prompt = [
      { role: "system", content: "你是资深 AI 产品经理招聘顾问。根据简历和 JD 输出：1.【匹配分】0-100 并说明理由；2.【核心亮点】简历中最值得突出的 3 点；3.【匹配差距】与 JD 的 3 个差距；4.【优化后亮点表述】针对差距给出可直接替换进简历的 3 条亮点句子。用 Markdown 输出，不要客套。" },
      { role: "user", content: "JD：\n" + jd + "\n\n简历：\n" + text }
    ];
    const res = await E.callAI(prompt, S.profile);
    const box2 = $("#resumeResult");
    if (!box2) return;
    if (!res) {
      box2.innerHTML = '<div class="note">' + Icon("alert-circle") + "<span>AI 匹配失败，请检查接口配置后重试。</span></div>";
      return;
    }
    box2.innerHTML = '<div class="card panel" style="border-color:var(--line)"><div class="panel-head"><div><h2>AI 深度匹配结果</h2><div class="sub">基于简历与 JD 的模型分析</div></div>' + badge("AI 生成", "b-teal") + '</div><div style="white-space:pre-line;line-height:1.75;font-size:13.5px">' + nl(res) + "</div></div>";
    if (!auto) toast("AI 深度匹配完成");
  }

  function pickResumeImg() {
    const el = $("#resumeImg");
    if (el) el.click();
  }

  function handleResumeImage(e) {
    const file = e.target && e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast("请选择图片文件"); return; }
    const reader = new FileReader();
    reader.onload = function (ev) {
      resumeImage = ev.target.result;
      renderResumePreview();
      toast("图片已载入");
    };
    reader.readAsDataURL(file);
  }

  function renderResumePreview() {
    const box = $("#resumeImgPreview");
    if (!box) return;
    box.innerHTML = resumeImage ? `
      <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
        <img src="${resumeImage}" alt="简历图片预览" style="max-width:260px;max-height:180px;border:1px solid var(--line);border-radius:6px">
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-sm" data-action="ocr-resume">${Icon("bot")}识别图中文字</button>
          <button class="btn btn-sm btn-ghost" data-action="clear-resume-image">${Icon("trash")}清除图片</button>
        </div>
      </div>` : "";
  }

  async function ocrResume() {
    if (!resumeImage) { toast("请先选择简历图片"); return; }
    if (!S.profile.aiEnabled || !S.profile.apiKey) { toast("请先在设置中启用并配置 AI 接口"); return; }
    if (!canUseAI()) return;
    const box = $("#resumeImgPreview");
    if (!box) return;
    const note = document.createElement("div");
    note.id = "ocrStatus";
    note.className = "note";
    note.style.marginTop = "8px";
    note.innerHTML = Icon("sparkles") + "<span>正在识别图片文字，最多等待 40 秒…</span>";
    box.appendChild(note);
    const text = await E.visionOCR(resumeImage, S.profile);
    if (text === null) {
      note.innerHTML = Icon("alert-circle") + "<span>识别失败，请检查 AI 接口配置或模型是否支持图片输入。</span>";
      return;
    }
    note.innerHTML = Icon("check-circle") + "<span>识别完成，可应用到简历编辑器。</span>";
    const wrap = document.createElement("div");
    wrap.className = "answer-block";
    wrap.innerHTML = '<h4>识别结果</h4><textarea id="ocrText" rows="12">' + esc(text) + '</textarea><div style="margin-top:10px;display:flex;gap:8px"><button class="btn btn-primary btn-sm" data-action="apply-ocr">' + Icon("check") + "应用到编辑器</button><button class=\"btn btn-sm\" data-action=\"copy-ocr\">" + Icon("copy") + "复制</button></div>";
    box.appendChild(wrap);
  }

  function pageTracker() {
    return `
      <div class="card" style="margin-bottom:14px">
        <div class="toolbar">
          <div class="search-box">${Icon("search")}<input id="trackerSearch" placeholder="搜索公司 / 岗位…" value="${esc(filters.tracker.q)}"></div>
          <select class="field" id="trackerStatus">${["全部", ...D.statuses].map(s => '<option ' + (filters.tracker.status === s ? "selected" : "") + ">" + s + "</option>").join("")}</select>
          <div class="tabs" style="margin-bottom:0">
            <button class="tab ${filters.tracker.view === "table" ? "active" : ""}" data-action="tracker-view" data-value="table">${Icon("list", 14)}表格</button>
            <button class="tab ${filters.tracker.view === "kanban" ? "active" : ""}" data-action="tracker-view" data-value="kanban">${Icon("kanban", 14)}看板</button>
          </div>
          <div class="grow"></div>
          <input type="file" id="importCsv" accept=".csv,text/csv" hidden>
          <button class="btn" data-action="pick-csv">${Icon("upload")}导入 CSV</button>
          <button class="btn" data-action="export-csv">${Icon("download")}导出 CSV</button>
          <button class="btn btn-primary" data-action="open-app-modal">${Icon("plus")}新增投递</button>
        </div>
      </div>
      <div id="trackerBody"></div>`;
  }

  function trackerStats() {
    return `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${D.statuses.map(s => { const n = S.apps.filter(a => a.status === s).length; return badge(s + " " + n, STATUS_COLOR[s]); }).join("")}
        <div class="grow"></div>${badge("共 " + S.apps.length + " 条", "b-gray")}
      </div>`;
  }

  function updateTracker() {
    const box = $("#trackerBody");
    if (!box) return;
    const f = filters.tracker;
    let list = S.apps.filter(a => {
      if (f.status !== "全部" && a.status !== f.status) return false;
      if (f.q && !((a.company + a.role + a.city + a.note).toLowerCase().includes(f.q.toLowerCase()))) return false;
      return true;
    });
    list = list.slice().sort((a, b) => String(b.applyDate).localeCompare(String(a.applyDate)));
    box.innerHTML = trackerStats() + (f.view === "table" ? trackerTable(list) : trackerKanban(list));
  }

  function trackerTable(list) {
    if (!list.length) return '<div class="card empty">' + Icon("kanban") + "<h3>没有匹配的投递</h3><p>点击右上角新增一条记录</p></div>";
    return `
      <div class="card table-wrap">
        <table>
          <thead><tr><th>公司 / 岗位</th><th>城市</th><th>渠道</th><th>投递链接</th><th>状态</th><th>投递日期</th><th>面试时间</th><th>备注</th><th style="width:110px">操作</th></tr></thead>
          <tbody>${list.map(a => `
            <tr>
              <td><div class="cell-main">${esc(a.company)}</div><div class="cell-sub">${esc(a.role)}</div></td>
              <td>${esc(a.city)}</td>
              <td>${esc(a.channel)}</td>
              <td>${a.link ? '<a href="' + esc(a.link) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px">' + Icon("link", 14) + "打开</a>" : '<span class="cell-sub">—</span>'}</td>
              <td><select class="field" style="min-width:104px;height:30px" data-action="app-status" data-id="${a.id}">${D.statuses.map(s => '<option ' + (a.status === s ? "selected" : "") + ">" + s + "</option>").join("")}</select></td>
              <td>${esc(a.applyDate)}</td>
              <td>${a.interviewAt ? '<div>' + fmtInterview(a.interviewAt) + '</div><div class="cell-sub">' + countdownText(a.interviewAt) + "</div>" : '<span class="cell-sub">—</span>'}</td>
              <td style="max-width:180px"><span class="cell-sub">${esc(a.note || "—")}</span></td>
              <td><div style="display:flex;gap:5px"><button class="icon-btn" data-action="edit-app" data-id="${a.id}" title="编辑">${Icon("edit")}</button><button class="icon-btn" data-action="delete-app" data-id="${a.id}" title="删除">${Icon("trash")}</button></div></td>
            </tr>`).join("")}</tbody>
        </table>
      </div>`;
  }

  function trackerKanban(list) {
    return `<div class="kanban">${D.statuses.map(s => {
      const items = list.filter(a => a.status === s);
      return `<div class="kcol"><div class="kcol-head"><span class="badge ${STATUS_COLOR[s]}">${s}</span><span class="count">${items.length}</span></div><div class="kcol-body">${
        items.length ? items.map(a => `<div class="kcard"><h5>${esc(a.company)}</h5><p>${esc(a.role)} · ${esc(a.city)}</p><p>${esc(a.applyDate)}</p>${a.interviewAt ? '<p style="color:var(--amber)">面试 ' + fmtInterview(a.interviewAt) + "</p>" : ""}<div class="row">
          ${s !== "意向" ? '<button class="btn btn-sm" title="上一步" data-action="move-app" data-id="' + a.id + '" data-dir="-1">' + Icon("chevron-left") + "</button>" : ""}
          ${s !== "拒绝" ? '<button class="btn btn-sm" title="下一步" data-action="move-app" data-id="' + a.id + '" data-dir="1">' + Icon("chevron-right") + "</button>" : ""}
          ${a.link ? '<a class="btn btn-sm" title="打开投递链接" href="' + esc(a.link) + '" target="_blank" rel="noopener">' + Icon("link") + "</a>" : ""}
          ${'<button class="btn btn-sm" title="编辑" data-action="edit-app" data-id="' + a.id + '">' + Icon("edit") + "</button>"}
        </div></div>`).join("") : '<div style="font-size:12px;color:var(--ink-3);text-align:center;padding:12px 4px">暂无</div>'}
      </div></div>`;
    }).join("")}</div>`;
  }

  function bindTracker() {
    const q = $("#trackerSearch");
    if (q) q.addEventListener("input", function () { filters.tracker.q = this.value; updateTracker(); });
    const st = $("#trackerStatus");
    if (st) st.addEventListener("change", function () { filters.tracker.status = this.value; updateTracker(); });
    updateTracker();
  }

  function appFormModal(app) {
    const a = app || { company: "", role: "", city: "", channel: "", status: "意向", applyDate: today(), note: "" };
    showModal(`
      <div class="modal-head"><h3>${app ? "编辑投递" : "新增投递"}</h3><button class="icon-btn" data-action="close-modal">${Icon("x")}</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <input type="hidden" id="fId" value="${esc(a.id || "")}">
          <div class="form-item"><label>公司</label><input id="fCompany" value="${esc(a.company)}" placeholder="公司名称"></div>
          <div class="form-item"><label>岗位</label><input id="fRole" value="${esc(a.role)}" placeholder="岗位名称"></div>
          <div class="form-item"><label>城市</label><input id="fCity" value="${esc(a.city)}" placeholder="工作城市"></div>
          <div class="form-item"><label>渠道</label><input id="fChannel" value="${esc(a.channel)}" placeholder="内推 / 官网 / 招聘平台"></div>
          <div class="form-item full"><label>投递链接</label><input id="fLink" value="${esc(a.link || "")}" placeholder="https://…"></div>
          <div class="form-item"><label>状态</label><select id="fStatus">${D.statuses.map(s => '<option ' + (a.status === s ? "selected" : "") + ">" + s + "</option>").join("")}</select></div>
          <div class="form-item"><label>投递日期</label><input type="date" id="fDate" value="${esc(a.applyDate)}"></div>
          <div class="form-item"><label>面试时间</label><input type="datetime-local" id="fInterviewAt" value="${esc(a.interviewAt || "")}"></div>
          <div class="form-item"><label>提醒提前</label><select id="fRemind">
            ${[0, 10, 30, 60, 1440].map(m => '<option value="' + m + '" ' + ((a.remindMin || 0) === m ? "selected" : "") + ">" + (m === 0 ? "不提醒" : m === 10 ? "10 分钟" : m === 30 ? "30 分钟" : m === 60 ? "1 小时" : "1 天") + "</option>").join("")}
          </select></div>
          <div class="form-item full"><label>备注</label><textarea id="fNote" placeholder="笔试时间、面试轮次、联系人等">${esc(a.note)}</textarea></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" data-action="close-modal">取消</button>
        <button class="btn btn-primary" data-action="save-app">${Icon("save")}保存</button>
      </div>`);
  }

  function saveApp() {
    const id = $("#fId").value;
    const data = {
      company: $("#fCompany").value.trim(), role: $("#fRole").value.trim(), city: $("#fCity").value.trim(),
      channel: $("#fChannel").value.trim(), link: ($("#fLink") && $("#fLink").value.trim()) || "",
      status: $("#fStatus").value, applyDate: $("#fDate").value || today(), note: $("#fNote").value.trim(),
      interviewAt: ($("#fInterviewAt") && $("#fInterviewAt").value) || "",
      remindMin: Number(($("#fRemind") && $("#fRemind").value) || 0)
    };
    if (!data.company || !data.role) { toast("公司和岗位必填"); return; }
    if (id) {
      const app = S.apps.find(x => x.id === id);
      if (app) {
        if (app.interviewAt !== data.interviewAt || (app.remindMin || 0) !== data.remindMin) app.reminded = false;
        Object.assign(app, data);
      }
    } else {
      S.apps.unshift(Object.assign({ id: uid() }, data));
    }
    save();
    closeModal();
    render();
    toast("已保存");
  }

  function exportCSV() {
    const head = ["公司", "岗位", "城市", "渠道", "投递链接", "状态", "投递日期", "面试时间", "备注"];
    const rows = S.apps.map(a => [a.company, a.role, a.city, a.channel, a.link || "", a.status, a.applyDate, a.interviewAt || "", a.note]);
    const csv = "\uFEFF" + [head, ...rows].map(r => r.map(c => '"' + String(c || "").replace(/"/g, '""') + '"').join(",")).join("\r\n");
    download(csv, "offerflow-applications-" + today() + ".csv");
  }
  function download(content, filename, mime) {
    const blob = new Blob([content], { type: mime || "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  let backupPending = null;

  function exportBackup() {
    const payload = { app: "offerflow", version: 1, exportedAt: nowStr(), data: S };
    download(JSON.stringify(payload, null, 2), "offerflow-backup-" + today() + ".json", "application/json;charset=utf-8");
    toast("备份已导出");
  }

  function handleBackupFile(e) {
    const file = e.target && e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const parsed = JSON.parse(ev.target.result);
        const data = parsed && parsed.data ? parsed.data : parsed;
        if (!data || !Array.isArray(data.apps) || !Array.isArray(data.reviews) || !Array.isArray(data.tasks)) throw new Error("bad");
        backupPending = data;
        showModal(`
          <div class="modal-head"><h3>导入数据备份</h3><button class="icon-btn" data-action="close-modal">${Icon("x")}</button></div>
          <div class="modal-body">
            <p style="font-size:13.5px;line-height:1.7;color:var(--ink-2);margin-bottom:14px">备份包含以下内容，请选择合并或覆盖。</p>
            <div class="review-metrics">
              <div class="metric"><b>${data.apps.length}</b><span>投递</span></div>
              <div class="metric"><b>${(data.reviews || []).length}</b><span>复盘</span></div>
              <div class="metric"><b>${(data.tasks || []).length}</b><span>任务</span></div>
              <div class="metric"><b>${(data.resumes || []).length}</b><span>简历</span></div>
            </div>
            <div class="note">${Icon("lightbulb")}<span>合并会按 ID 去重并保留现有记录；覆盖会用备份完整替换当前数据。</span></div>
          </div>
          <div class="modal-foot">
            <button class="btn" data-action="close-modal">取消</button>
            <button class="btn" data-action="apply-backup-merge">${Icon("refresh")}合并导入</button>
            <button class="btn btn-primary" data-action="apply-backup-overwrite">${Icon("download")}覆盖导入</button>
          </div>`);
      } catch (err) {
        toast("备份文件格式不正确");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function applyBackup(mode) {
    if (!backupPending) return;
    const b = backupPending;
    if (mode === "overwrite") {
      const base = defaultState();
      S = {
        profile: Object.assign({}, base.profile, b.profile || {}),
        apps: Array.isArray(b.apps) ? b.apps : [],
        reviews: Array.isArray(b.reviews) ? b.reviews : [],
        favorites: Array.isArray(b.favorites) ? b.favorites : [],
        mastered: Array.isArray(b.mastered) ? b.mastered : [],
        resumes: Array.isArray(b.resumes) ? b.resumes : [],
        selfTests: Array.isArray(b.selfTests) ? b.selfTests : [],
        solved: Array.isArray(b.solved) ? b.solved : [],
        practice: Array.isArray(b.practice) ? b.practice : [],
        tasks: Array.isArray(b.tasks) ? b.tasks : []
      };
    } else {
      mergeById(S.apps, b.apps);
      mergeById(S.reviews, b.reviews);
      mergeById(S.tasks, b.tasks);
      mergeById(S.resumes, b.resumes);
      S.selfTests = S.selfTests.concat(b.selfTests || []);
      S.solved = S.solved.concat(b.solved || []);
      S.practice = S.practice.concat(b.practice || []).slice(0, 500);
      S.favorites = Array.from(new Set(S.favorites.concat(b.favorites || [])));
      S.mastered = Array.from(new Set(S.mastered.concat(b.mastered || [])));
      if (b.profile && b.profile.name) S.profile.name = b.profile.name;
      if (b.profile && b.profile.role) S.profile.role = b.profile.role;
    }
    backupPending = null;
    save();
    closeModal();
    render();
    toast(mode === "overwrite" ? "已覆盖导入" : "已合并导入");
  }

  function mergeById(target, incoming) {
    (incoming || []).forEach(item => {
      if (!item || !item.id) return;
      const idx = target.findIndex(x => x.id === item.id);
      if (idx >= 0) target[idx] = item; else target.push(item);
    });
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
        } else field += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some(x => String(x).trim() !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
    if (field !== "" || row.length) {
      row.push(field);
      if (row.some(x => String(x).trim() !== "")) rows.push(row);
    }
    return rows;
  }

  function handleCsvFile(e) {
    const file = e.target && e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      const rows = parseCSV(String(ev.target.result).replace(/^\uFEFF/, ""));
      if (rows.length < 2) { toast("CSV 内容为空"); return; }
      const head = rows[0].map(h => String(h).trim().toLowerCase());
      const mapCol = names => {
        const i = head.findIndex(h => names.includes(h));
        return i >= 0 ? i : -1;
      };
      const idx = {
        company: mapCol(["公司", "company"]),
        role: mapCol(["岗位", "role", "职位"]),
        city: mapCol(["城市", "city", "地点"]),
        channel: mapCol(["渠道", "channel", "来源"]),
        link: mapCol(["投递链接", "link", "链接"]),
        status: mapCol(["状态", "status"]),
        date: mapCol(["投递日期", "applydate", "日期"]),
        interviewAt: mapCol(["面试时间", "interviewtime"]),
        remindMin: mapCol(["提醒提前", "remindmin", "提醒"]),
        note: mapCol(["备注", "note"])
      };
      if (idx.company < 0 || idx.role < 0) { toast("CSV 缺少公司或岗位列"); return; }
      let added = 0;
      rows.slice(1).forEach(r => {
        const get = i => (i >= 0 && r[i] !== undefined ? String(r[i]).trim() : "");
        const company = get(idx.company), role = get(idx.role);
        if (!company || !role) return;
        const status = D.statuses.includes(get(idx.status)) ? get(idx.status) : "意向";
        S.apps.unshift({
          id: uid(), company, role, city: get(idx.city), channel: get(idx.channel),
          link: get(idx.link), status, applyDate: get(idx.date) || today(), note: get(idx.note),
          interviewAt: get(idx.interviewAt), remindMin: Number(get(idx.remindMin)) || 0
        });
        added++;
      });
      save();
      render();
      toast("导入 " + added + " 条投递");
    };
    reader.readAsText(file, "utf-8");
  }

  function pageResources() {
    const f = filters.res;
    const key = f.tab;
    const title = { campus: "校招信息汇总", intern: "实习信息表", state: "国央企信息表" }[key];
    return `
      <div class="tabs">
        ${[["campus", "校招信息汇总"], ["intern", "实习信息表"], ["state", "国央企信息表"]].map(([k, t]) => '<button class="tab ' + (f.tab === k ? "active" : "") + '" data-action="tab-res" data-value="' + k + '">' + t + "</button>").join("")}
      </div>
      <div class="note">${Icon("lightbulb")}<span>内置演示数据；部署后端并配置 RESOURCES_FEED_URL 数据源后，可每日自动抓取校招信息并合并到表格。</span></div>
      <div class="card" style="margin-bottom:14px">
        <div class="toolbar">
          <div class="search-box">${Icon("search")}<input id="resSearch" placeholder="搜索公司 / 岗位…" value="${esc(f.q)}"></div>
          <select class="field" id="resCity">${resCityOptions(key)}</select>
          <div class="grow"></div>${badge(title, "b-teal")}
          <span class="badge b-gray" id="resSyncBadge">${resUpdatedAt ? "云端已同步 · " + String(resUpdatedAt).slice(5, 16) : "内置演示数据"}</span>
          <button class="btn btn-sm" data-action="refresh-resources">${Icon("refresh")}立即抓取</button>
        </div>
      </div>
      <div class="card table-wrap" id="resTable"></div>`;
  }

  function resData(key) {
    const base = D.resources[key];
    const remote = (remoteRes || []).filter(x => x.type === key);
    const merged = base.slice();
    remote.forEach(item => {
      if (!merged.some(x => x.company === item.company && x.batch === item.batch)) merged.push(item);
    });
    return merged;
  }

  async function loadRemoteResources() {
    if (!window.OFFERFLOW_BACKEND) return;
    try {
      const r = await fetch("/api/resources", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      if (d && Array.isArray(d.items)) {
        remoteRes = d.items;
        resUpdatedAt = d.updatedAt;
        const badge = $("#resSyncBadge");
        if (badge) badge.textContent = resUpdatedAt ? "云端已同步 · " + String(resUpdatedAt).slice(5, 16) : "内置演示数据";
        updateResTable();
      }
    } catch (e) {}
  }

  function resCityOptions(key) {
    const cities = new Set();
    resData(key).forEach(r => String(r.cities).split(/[\s,，\/]+/).filter(Boolean).forEach(c => cities.add(c)));
    return ["全部", ...[...cities].sort()].map(c => '<option ' + (filters.res.city === c ? "selected" : "") + ">" + c + "</option>").join("");
  }

  function updateResTable() {
    const box = $("#resTable");
    if (!box) return;
    const f = filters.res;
    const key = f.tab;
    const list = resData(key).filter(r => {
      if (f.q && !((r.company + r.roles + r.cities + r.note).toLowerCase().includes(f.q.toLowerCase()))) return false;
      if (f.city !== "全部" && !String(r.cities).split(/[\s,，\/]+/).includes(f.city)) return false;
      return true;
    });
    if (!list.length) { box.innerHTML = '<div class="empty">' + Icon("database") + "<h3>没有匹配记录</h3><p>换个关键词试试</p></div>"; return; }
    const cols = key === "intern"
      ? ["公司", "岗位 / 组别", "城市", "更新时间", "类型", "投递链接", ""]
      : ["公司", "批次", "更新时间", "岗位方向", "城市", "备注", "投递链接", ""];
    const linkCell = r => r.link ? '<a href="' + esc(r.link) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px">' + Icon("link", 14) + "投递</a>" : '<span class="cell-sub">—</span>';
    const row = key === "intern" ? (r => `
      <td><div class="cell-main">${esc(r.company)}</div></td><td>${esc(r.role)}</td><td>${esc(r.cities)}</td><td>${esc(r.date)}</td><td>${badge(r.tags || "实习", "b-sky")}</td>
      <td>${linkCell(r)}</td>
      <td><button class="btn btn-sm" data-action="apply-resource" data-company="${esc(r.company)}" data-role="${esc(r.role || r.batch)}" data-city="${esc(r.cities.split(/[\s,，\/]+/)[0])}" data-link="${esc(r.link || "")}">${Icon("plus")}加入投递</button></td>`)
      : (r => `
      <td><div class="cell-main">${esc(r.company)}</div></td><td>${badge(r.batch, r.batch.includes("提前") ? "b-red" : "b-teal")}</td><td>${esc(r.date)}</td><td style="max-width:260px"><span class="cell-sub">${esc(r.roles)}</span></td><td>${esc(r.cities)}</td><td><span class="cell-sub">${esc(r.note || "—")}</span></td>
      <td>${linkCell(r)}</td>
      <td><button class="btn btn-sm" data-action="apply-resource" data-company="${esc(r.company)}" data-role="${esc(r.batch)}" data-city="${esc(r.cities.split(/[\s,，\/]+/)[0])}" data-link="${esc(r.link || "")}">${Icon("plus")}加入投递</button></td>`);
    box.innerHTML = `<table><thead><tr>${cols.map(c => "<th>" + c + "</th>").join("")}</tr></thead><tbody>${list.map(r => "<tr>" + row(r) + "</tr>").join("")}</tbody></table>`;
  }

  function bindResources() {
    const q = $("#resSearch");
    if (q) q.addEventListener("input", function () { filters.res.q = this.value; updateResTable(); });
    const c = $("#resCity");
    if (c) c.addEventListener("change", function () { filters.res.city = this.value; updateResTable(); });
    updateResTable();
    loadRemoteResources();
  }

  function pageReviews() {
    return `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${badge(S.reviews.length + " 场复盘", "b-teal")}
        ${S.reviews.length ? badge("平均 " + Math.round(S.reviews.reduce((s, r) => s + r.score, 0) / S.reviews.length) + " 分", "b-amber") : badge("暂无数据", "b-gray")}
        <div class="grow"></div>
        <button class="btn btn-sm" data-action="agent-review-diagnosis">${Icon("bot")}Agent 复盘诊断</button>
        <button class="btn btn-sm" data-action="navigate" data-id="mock">${Icon("mic")}再练一场</button>
      </div>
      <div id="reviewList">
        ${S.reviews.length ? S.reviews.map(r => `
          <div class="card panel" style="margin-bottom:12px">
            <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
              <div class="stat-ic b-teal" style="background:var(--brand-soft);color:var(--brand-dark);width:44px;height:44px">${Icon("clipboard")}</div>
              <div class="grow" style="min-width:220px">
                <h3 style="font-size:15px">${esc(r.track)} ${esc(r.scenario)} · ${esc(r.lang)}</h3>
                <p style="color:var(--ink-3);font-size:12.5px;margin-top:3px">${esc(r.date)} · ${r.total} 题 · ${r.duration} 分钟</p>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">${badge(r.score >= 80 ? "优秀" : r.score >= 60 ? "合格" : "待加强", r.score >= 80 ? "b-green" : r.score >= 60 ? "b-amber" : "b-red")}${badge(r.score + " 分", "b-gray")}</div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-sm" data-action="open-review" data-id="${r.id}">${Icon("eye")}查看报告</button>
                <button class="btn btn-sm" data-action="copy-review" data-id="${r.id}">${Icon("copy")}复制</button>
                <button class="btn btn-sm" data-action="export-review" data-id="${r.id}">${Icon("download")}导出</button>
                <button class="btn btn-sm btn-danger" data-action="delete-review" data-id="${r.id}">${Icon("trash")}</button>
              </div>
            </div>
          </div>`).join("") : '<div class="card empty">' + Icon("clipboard") + "<h3>还没有复盘报告</h3><p>完成一场模拟面试后自动生成</p><button class='btn btn-primary' style='margin-top:10px' data-action='navigate' data-id='mock'>去模拟面试</button></div>"}
      </div>`;
  }

  function openReview(id) {
    const r = S.reviews.find(x => x.id === id);
    if (!r) return;
    showModal(`
      <div class="modal-head"><h3>复盘报告 · ${esc(r.track)} ${esc(r.scenario)}</h3><button class="icon-btn" data-action="close-modal">${Icon("x")}</button></div>
      <div class="modal-body">
        <div class="review-metrics">
          <div class="metric"><b>${r.score}</b><span>综合得分</span></div>
          <div class="metric"><b>${r.total}</b><span>完成题数</span></div>
          <div class="metric"><b>${r.duration}</b><span>时长（分钟）</span></div>
          <div class="metric"><b>${esc(r.lang)}</b><span>面试语言</span></div>
        </div>
        <div class="score-grid" style="margin-bottom:16px">
          ${ringHtml(r.score)}
          <div>${dimsHtml(r.dims)}</div>
        </div>
        <div class="answer-block"><h4>总结</h4><p style="line-height:1.7">${esc(r.summary)}</p></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0">
          <div class="answer-block"><h4>做得好的地方</h4>${r.strengths.map(s => '<div style="font-size:13px;color:var(--green);margin:4px 0">✓ ' + esc(s) + "</div>").join("") || "暂无"}</div>
          <div class="answer-block"><h4>改进方向</h4>${r.improves.map(s => '<div style="font-size:13px;color:var(--amber);margin:4px 0">▲ ' + esc(s) + "</div>").join("") || "暂无"}</div>
        </div>
        <h3 style="font-size:14px;margin:16px 0 10px">逐题回放</h3>
        ${r.turns.map(t => `
          <div class="chat-line ai"><div class="who">面试官</div><div class="bubble">${esc(t.q)}</div></div>
          <div class="chat-line user"><div class="who">候选人</div><div class="bubble">${nl(t.a)}${t.score ? '<div style="margin-top:8px">' + badge(t.score + " 分", t.score >= 80 ? "b-green" : t.score >= 60 ? "b-amber" : "b-red") + "</div>" : ""}</div></div>`).join("")}
      </div>
      <div class="modal-foot">
        <button class="btn" data-action="copy-review" data-id="${r.id}">${Icon("copy")}复制报告</button>
        <button class="btn" data-action="export-review" data-id="${r.id}">${Icon("download")}导出报告</button>
        <button class="btn btn-primary" data-action="close-modal">关闭</button>
      </div>`, true);
  }

  function copyReview(id) {
    const r = S.reviews.find(x => x.id === id);
    if (!r) return;
    const text = [
      "OfferFlow 复盘报告",
      r.track + " " + r.scenario + " · " + r.date,
      "综合得分：" + r.score + " · 题数：" + r.total,
      "",
      r.summary,
      "",
      "做得好的地方：",
      ...r.strengths.map(s => "- " + s),
      "",
      "改进方向：",
      ...r.improves.map(s => "- " + s),
      "",
      "逐题回放：",
      ...r.turns.map(t => "Q: " + t.q + "\nA: " + t.a + " (" + t.score + " 分)")
    ].join("\n");
    copyText(text);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast("已复制到剪贴板")).catch(() => fallbackCopy(text));
    } else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("已复制到剪贴板"); } catch (e) { toast("复制失败"); }
    ta.remove();
  }

  function reviewHtml(r) {
    return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>复盘报告 · ' + esc(r.track) + '</title><style>body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;max-width:760px;margin:32px auto;padding:0 20px;color:#101828;line-height:1.7}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border:1px solid #dbe2ea;padding:10px;text-align:left;font-size:14px}.ok{color:#15803d}.bad{color:#d97706}.meta{color:#475467;font-size:13px}</style></head><body><h1>复盘报告 · ' + esc(r.track) + ' ' + esc(r.scenario) + '</h1><div class="meta">' + esc(r.date) + ' · ' + r.total + ' 题 · ' + r.duration + ' 分钟 · 综合得分 ' + r.score + '</div><h2>总结</h2><p>' + esc(r.summary) + '</p><h2>维度得分</h2><table><tr><th>维度</th><th>得分</th></tr>' + Object.entries(r.dims || {}).map(([k, v]) => '<tr><td>' + esc(k) + '</td><td>' + v + '</td></tr>').join('') + '</table><h2>做得好的地方</h2><ul>' + (r.strengths || []).map(s => '<li class="ok">' + esc(s) + '</li>').join('') + '</ul><h2>改进方向</h2><ul>' + (r.improves || []).map(s => '<li class="bad">' + esc(s) + '</li>').join('') + '</ul><h2>逐题回放</h2>' + (r.turns || []).map(t => '<h3>Q: ' + esc(t.q) + '</h3><p><b>回答：</b>' + esc(t.a) + '</p><p><b>得分：</b>' + t.score + '</p>').join('') + '</body></html>';
  }

  function exportReview(id) {
    const r = S.reviews.find(x => x.id === id);
    if (!r) return;
    download(reviewHtml(r), "offerflow-review-" + r.id + ".html", "text/html;charset=utf-8");
    toast("报告已导出");
  }

  function weekHtml(w) {
    const cats = catScores();
    const upcoming = S.apps.filter(a => a.interviewAt && new Date(a.interviewAt) > new Date()).sort((a, b) => new Date(a.interviewAt) - new Date(b.interviewAt)).slice(0, 6);
    return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>OfferFlow 周报</title><style>body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;max-width:760px;margin:32px auto;padding:0 20px;color:#101828;line-height:1.7}h1{font-size:22px}.cards{display:flex;gap:12px;flex-wrap:wrap}.card{border:1px solid #dbe2ea;border-radius:8px;padding:14px 18px;min-width:110px}.num{font-size:24px;font-weight:700}.meta{color:#475467;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #dbe2ea;padding:8px;text-align:left;font-size:13px}</style></head><body><h1>OfferFlow 本周学习报告</h1><div class="meta">' + esc(w.range) + '</div><div class="cards"><div class="card"><div class="num">' + w.count + '</div>练习次数</div><div class="card"><div class="num">' + (w.avg === null ? "—" : w.avg) + '</div>平均得分</div><div class="card"><div class="num">' + w.uniqueQ + '</div>练习题目</div><div class="card"><div class="num">' + w.apps + '</div>新增投递</div><div class="card"><div class="num">' + w.interviews + '</div>面试安排</div><div class="card"><div class="num">' + w.tasksDone + '</div>完成任务</div></div><h2>方向得分</h2><table><tr><th>方向</th><th>平均分</th><th>次数</th></tr>' + cats.map(c => '<tr><td>' + esc(c.cat) + '</td><td>' + c.score + '</td><td>' + c.count + '</td></tr>').join('') + '</table><h2>即将到来的面试</h2><table><tr><th>公司</th><th>岗位</th><th>时间</th></tr>' + upcoming.map(a => '<tr><td>' + esc(a.company) + '</td><td>' + esc(a.role) + '</td><td>' + fmtInterview(a.interviewAt) + '</td></tr>').join('') + '</table></body></html>';
  }

  function exportWeek() {
    download(weekHtml(weekStats()), "offerflow-week-" + today() + ".html", "text/html;charset=utf-8");
    toast("周报已导出");
  }

  function pageSelfTest() {
    if (testStarted) return selfTestQuizHtml();
    const last = S.selfTests[S.selfTests.length - 1];
    return `
      <div class="split">
        <div class="side-stack">
          <div class="card panel">
            <div class="panel-head"><div><h2>面试准备度自测</h2><div class="sub">12 道题，约 3 分钟，评估当前准备状态</div></div>${badge("12 题", "b-teal")}</div>
            <p style="font-size:13.5px;line-height:1.8;color:var(--ink-2);margin-bottom:16px">从信息收集、简历、投递管理、笔试、模拟训练到复盘闭环，逐项自检。完成后会得到准备指数和分阶段行动建议，适合每周复测。</p>
            <button class="btn btn-primary" data-action="start-test">${Icon("play")}开始自测</button>
            ${last ? '<div style="margin-top:18px;border-top:1px solid var(--line-2);padding-top:14px"><div class="section-title">' + Icon("trend") + "最近一次结果</div><div class='score-grid' style='grid-template-columns:90px 1fr'>" + ringHtml(last.score) + "<div>" + dimsHtml({ "综合准备度": last.score }) + "</div></div><button class='btn btn-sm' style='margin-top:10px' data-action='start-test'>重新测试</button></div>" : ""}
          </div>
          <div class="card panel">
            <div class="panel-head"><div><h2>历史记录</h2><div class="sub">准备指数变化</div></div></div>
            ${S.selfTests.length ? S.selfTests.slice(-6).map((t, i) => `<div class="list-row"><div class="grow"><h4>第 ${Math.max(1, S.selfTests.length - 5) + i} 次自测</h4><p>${esc(t.date)}</p></div>${badge(t.score + " 分", t.score >= 80 ? "b-green" : t.score >= 60 ? "b-amber" : "b-red")}</div>`).join("") : '<div class="empty">' + Icon("gauge") + "<h3>暂无自测记录</h3><p>完成第一次自测后出现</p></div>"}
          </div>
        </div>
      </div>`;
  }

  function selfTestQuizHtml() {
    return `
      <div class="card panel">
        <div class="panel-head"><div><h2>面试准备度自测</h2><div class="sub">请按真实情况作答</div></div>${badge("进行中", "b-amber")}</div>
        ${D.selfTest.map((q, i) => `
          <div style="padding:14px 0;border-bottom:1px solid var(--line-2)">
            <div style="font-size:14px;font-weight:600;margin-bottom:10px">${i + 1}. ${esc(q.q)}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${q.opts.map((o, j) => `
              <label class="option-chip" style="border-radius:6px;display:flex;gap:8px;align-items:center;cursor:pointer">
                <input type="radio" name="st-${q.id}" value="${j}" style="accent-color:var(--brand)"> ${esc(o)}
              </label>`).join("")}</div>
          </div>`).join("")}
        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn btn-primary" data-action="submit-test">${Icon("check")}提交并查看结果</button>
          <button class="btn" data-action="cancel-test">${Icon("x")}放弃</button>
        </div>
      </div>`;
  }

  function submitSelfTest() {
    const answers = {};
    let missing = false;
    D.selfTest.forEach(q => {
      const el = document.querySelector('input[name="st-' + q.id + '"]:checked');
      if (!el) missing = true;
      else answers[q.id] = Number(el.value);
    });
    if (missing) { toast("还有题目未作答"); return; }
    const r = E.selfTestResult(answers);
    S.selfTests.push({ date: nowStr(), score: r.score, level: r.level });
    save();
    testStarted = false;
    render();
    const box = $("#view");
    const tipHtml = `<div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h2>行动清单</h2><div class="sub">按优先级执行</div></div>${badge(r.level, r.score >= 80 ? "b-green" : r.score >= 60 ? "b-amber" : "b-red")}</div>${r.tips.map((t, i) => '<div class="list-row"><div class="grow"><h4>' + esc(t) + "</h4></div>" + badge("步骤 " + (i + 1), "b-gray") + "</div>").join("")}</div>`;
    const last = S.selfTests[S.selfTests.length - 1];
    box.insertAdjacentHTML("beforeend", tipHtml);
    toast("自测完成：" + last.score + " 分");
  }

  function bindSalary() {
    ["salMonth", "salBonus", "salStock", "salTargetMonth", "salTargetBonus", "salTargetStock"].forEach(id => {
      const el = $("#" + id);
      if (el) el.addEventListener("input", calcSalary);
    });
  }

  function calcSalary() {
    const input = {
      month: ($("#salMonth") && $("#salMonth").value) || 0,
      bonus: ($("#salBonus") && $("#salBonus").value) || 0,
      stock: ($("#salStock") && $("#salStock").value) || 0,
      base: ($("#salTargetMonth") && $("#salTargetMonth").value) || 0,
      bBonus: ($("#salTargetBonus") && $("#salTargetBonus").value) || 0,
      bStock: ($("#salTargetStock") && $("#salTargetStock").value) || 0
    };
    if (!input.month) { return; }
    const r = E.salaryCalc(input);
    const box = $("#salaryResult");
    box.innerHTML = `
      <div class="answer-block">
        <h4>当前总包 ≈ ${r.currentTotal.toLocaleString()} 元/年</h4>
        ${r.ratios.map(x => '<div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px dashed var(--line-2)"><span>' + esc(x.label) + "</span><b>" + x.total.toLocaleString() + " 元</b></div>").join("")}
        ${r.target ? '<div style="margin-top:8px;font-size:13px">目标总包 <b>' + r.target.toLocaleString() + "</b> 元，较当前 " + (r.diff >= 0 ? "+" : "") + r.diff.toLocaleString() + " 元（" + (r.diffPct >= 0 ? "+" : "") + r.diffPct + "%）</div>" : ""}
        <div style="font-size:12px;color:var(--ink-3);margin-top:8px">报价建议：给区间上限，留出谈判空间；比较时使用总包而非月薪。</div>
      </div>`;
  }

  // ---------- Settings ----------
  function settingsModal() {
    const p = S.profile;
    showModal(`
      <div class="modal-head"><h3>设置</h3><button class="icon-btn" data-action="close-modal">${Icon("x")}</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-item"><label>姓名</label><input id="setName" value="${esc(p.name)}"></div>
          <div class="form-item"><label>目标岗位</label><input id="setRole" value="${esc(p.role)}"></div>
          <div class="form-item full" style="flex-direction:row;align-items:center;gap:10px;border:1px solid var(--line-2);border-radius:var(--radius-sm);padding:10px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="setAi" ${p.aiEnabled ? "checked" : ""} style="accent-color:var(--brand)"> 启用 AI 接口（可选）</label>
            <span class="hint" style="margin-left:auto">未启用时使用内置本地引擎</span>
          </div>
          <div class="form-item full"><label>快捷预设</label>
            <select id="setPreset">
              <option value="">选择预设</option>
              <option value="doubao">豆包 Seed 2.0 mini（火山方舟）</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          <div class="form-item"><label>API Base URL</label><input id="setBase" value="${esc(p.apiBase)}" placeholder="https://api.openai.com/v1"></div>
          <div class="form-item"><label>模型</label><input id="setModel" value="${esc(p.model)}" placeholder="gpt-4o-mini"></div>
          <div class="form-item full"><label>API Key</label><input id="setKey" type="password" value="${esc(p.apiKey)}" placeholder="sk-..."></div>
        </div>
        <div class="note" style="margin-top:14px">${Icon("lock")}<span>API Key 仅保存在本地浏览器，用于调用 OpenAI 兼容接口增强面试点评与简历改写；不配置也不影响使用。</span></div>
        <div style="border-top:1px solid var(--line-2);margin-top:16px;padding-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div><div style="font-weight:600">数据管理</div><div style="font-size:12px;color:var(--ink-3)">导出完整备份，或从备份文件恢复，支持合并与覆盖</div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <input type="file" id="importBackup" accept="application/json,.json" hidden>
            <button class="btn btn-sm" data-action="export-backup">${Icon("download")}导出备份</button>
            <button class="btn btn-sm" data-action="pick-backup">${Icon("upload")}导入备份</button>
            <button class="btn btn-danger btn-sm" data-action="reset-data">${Icon("trash")}重置</button>
          </div>
        </div>
      </div>
      <div class="modal-foot"><button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="save-settings">${Icon("save")}保存设置</button></div>`);
  }

  function saveSettings() {
    S.profile.name = ($("#setName") && $("#setName").value.trim()) || S.profile.name;
    S.profile.role = ($("#setRole") && $("#setRole").value.trim()) || "";
    S.profile.aiEnabled = !!($("#setAi") && $("#setAi").checked);
    S.profile.apiBase = ($("#setBase") && $("#setBase").value.trim()) || "";
    S.profile.model = ($("#setModel") && $("#setModel").value.trim()) || "";
    S.profile.apiKey = ($("#setKey") && $("#setKey").value.trim()) || "";
    save();
    closeModal();
    const av = $(".avatar");
    if (av) av.textContent = (S.profile.name || "林").slice(0, 1);
    const pill = $("#aiPillText");
    if (pill) pill.textContent = S.profile.aiEnabled && S.profile.apiKey ? "AI 接口已启用" : "本地 AI 在线";
    toast("设置已保存");
  }

  function applyPreset(v) {
    const base = $("#setBase");
    const model = $("#setModel");
    if (!base || !model) return;
    if (v === "doubao") {
      base.value = "https://ark.cn-beijing.volces.com/api/v3";
      model.value = "ep-m-20260607002345-lbn6s";
      toast("已填入豆包地址与接入点 ID");
    } else if (v === "openai") {
      base.value = "https://api.openai.com/v1";
      model.value = "gpt-4o-mini";
      toast("已填入 OpenAI 预设");
    }
  }

  // ---------- Global events ----------
  document.addEventListener("click", function (e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const act = el.dataset.action;
    const id = el.dataset.id;
    switch (act) {
      case "navigate": navigate(id); break;
      case "toggle-menu": $("#sidebar").classList.toggle("open"); break;
      case "agent-goal": agentInput = el.dataset.value; runAgentAction(); break;
      case "agent-toggle-jd": agentShowJd = !!el.checked; render(); break;
      case "run-agent": runAgentAction(); break;
      case "agent-confirm-tasks": confirmAgentTasks(); break;
      case "agent-save-job": saveAgentJob(); break;
      case "agent-practice": startMockWith([Number(el.dataset.id)]); break;
      case "agent-practice-all": if (agentResult && agentResult.ids.length) startMockWith(agentResult.ids); break;
      case "open-settings": settingsModal(); break;
      case "open-account": Auth.openAccountModal(); break;
      case "close-modal": closeModal(); break;
      case "start-mock": startMockWith(null); break;
      case "mock-random": {
        const tracks = D.tracks, diffs = ["混合", ...D.diffs], scen = ["常规面", "压力面", "英文面"];
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        document.querySelectorAll("[data-mock]").forEach(b => b.classList.toggle("active", b.dataset.value === pick(b.dataset.mock === "track" ? tracks : b.dataset.mock === "diff" ? diffs : scen)));
        break;
      }
      case "quit-mock": clearInterval(timerId); MOCK = null; navigate("mock"); break;
      case "toggle-voice": toggleVoice(); break;
      case "submit-answer": submitAnswer(false); break;
      case "next-question": {
        const cur = MOCK.queue[MOCK.idx];
        const isFollow = cur && (cur.tags || []).includes("AI 追问");
        MOCK.followCount = isFollow ? (MOCK.followCount || 0) : 0;
        MOCK.submitted = false; MOCK.timerOn = false; MOCK.idx++;
        if (MOCK.idx >= MOCK.queue.length) finishMock(); else render();
        break;
      }
      case "finish-mock": finishMock(); break;
      case "solve": {
        const text = ($("#solverInput") && $("#solverInput").value) || "";
        if (!text.trim()) { toast("请先粘贴题目"); break; }
        const type = ($("#solverType") && $("#solverType").value) || "编程";
        const local = E.solveProblem(text, type);
        if (canUseAI()) {
          const box = $("#solverResult");
          if (box) box.innerHTML = '<div class="empty">' + Icon("sparkles") + "<h3>AI 解析中…</h3><p>正在分析题目，最多等待 40 秒</p></div>";
          const prompt = [
            { role: "system", content: "你是资深 AI 产品笔试与面试解析专家。根据题目类型输出：1. 标准答案 2. 答题思路与要点 3. 举例说明；产品题给结构化方案，编程题额外给复杂度与示例代码。直接输出，不要客套。" },
            { role: "user", content: "题目类型：" + type + "\n题目：" + text }
          ];
          E.callAI(prompt, S.profile).then(res => {
            lastSolve = { matched: false, title: "AI 深度解析", type, approach: res || "AI 解析失败，已回退本地引擎", code: null, complexity: "AI 生成", hint: "", tags: [type] };
            S.solved.unshift({ title: lastSolve.title, text: text.slice(0, 120), matched: false, time: nowStr() });
            S.solved = S.solved.slice(0, 20);
            save();
            render();
          }).catch(() => {
            lastSolve = local;
            S.solved.unshift({ title: local.title, text: text.slice(0, 120), matched: local.matched, time: nowStr() });
            S.solved = S.solved.slice(0, 20);
            save();
            render();
          });
        } else {
          lastSolve = local;
          S.solved.unshift({ title: local.title, text: text.slice(0, 120), matched: local.matched, time: nowStr() });
          S.solved = S.solved.slice(0, 20);
          save();
          render();
        }
        break;
      }
      case "clear-solved": S.solved = []; lastSolve = null; save(); render(); toast("已清空解题记录"); break;
      case "toggle-fav": {
        const i = S.favorites.indexOf(id);
        if (i >= 0) S.favorites.splice(i, 1); else S.favorites.push(id);
        save(); updateBankList(); renderNav(routeInfo().path);
        break;
      }
      case "toggle-master": {
        const i = S.mastered.indexOf(id);
        if (i >= 0) S.mastered.splice(i, 1); else S.mastered.push(id);
        save(); updateBankList(); renderNav(routeInfo().path);
        break;
      }
      case "toggle-q": {
        const box = $("#qa-" + id);
        if (box) box.style.display = box.style.display === "none" ? "block" : "none";
        break;
      }
      case "bank-fav": filters.bank.fav = !filters.bank.fav; render(); break;
      case "bank-master": filters.bank.master = !filters.bank.master; render(); break;
      case "practice-one": startMockWith([Number(id)]); break;
      case "practice-filtered": {
        const ids = D.questions.filter(q => {
          const f = filters.bank;
          if (f.cat !== "全部" && q.cat !== f.cat) return false;
          if (f.diff !== "全部" && q.diff !== f.diff) return false;
          if (f.type !== "全部" && q.type !== f.type) return false;
          return true;
        }).map(q => q.id);
        startMockWith(ids);
        break;
      }
      case "diagnose-resume": diagnoseResume(); break;
      case "save-resume": {
        const text = ($("#resumeText") && $("#resumeText").value) || "";
        if (!text.trim()) { toast("简历内容为空"); break; }
        S.resumes.unshift({ id: uid(), name: "简历 v" + (S.resumes.length + 1), savedAt: nowStr(), text });
        save(); render(); toast("版本已保存");
        break;
      }
      case "load-sample": {
        const ta = $("#resumeText");
        if (ta) ta.value = "张三\n求职意向：前端开发工程师\n教育背景：某大学 计算机科学与技术 本科 2024-2028\n技能：React、Vue、TypeScript、Node.js\n项目经历：参与电商后台系统开发，负责订单模块，使用 React 重构页面。\n实习经历：某公司前端实习生，完成日常迭代需求。";
        break;
      }
      case "ai-rewrite": aiRewrite(); break;
      case "ai-match": aiMatch(false); break;
      case "agent-review-diagnosis": reviewDiagnosis(); break;
      case "diag-practice": if (diagIds.length) startMockWith(diagIds); break;
      case "diag-create-tasks": {
        const g = {};
        S.reviews.slice(0, 8).forEach(r => (r.improves || []).forEach(x => { g[x] = (g[x] || 0) + 1; }));
        const top = Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const existing = new Set(S.tasks.map(t => t.title));
        let added = 0;
        top.forEach(pair => {
          const title = "复盘专项：" + pair[0].slice(0, 30);
          if (!existing.has(title)) { S.tasks.unshift({ id: uid(), title, note: "Agent 复盘诊断生成", done: false }); added++; }
        });
        const t2 = "练习推荐题目（" + diagIds.length + " 题）";
        if (!existing.has(t2)) { S.tasks.unshift({ id: uid(), title: t2, note: "Agent 复盘诊断生成", done: false }); added++; }
        save();
        closeModal();
        render();
        toast("已创建 " + added + " 个训练任务");
        break;
      }
      case "resume-agent": resumeAgent(); break;
      case "apply-agent-resume": {
        const v = $("#agentResumeText") && $("#agentResumeText").value;
        const ta = $("#resumeText");
        if (ta && v) { ta.value = v; toast("已应用到简历编辑器"); }
        break;
      }
      case "apply-rewrite": {
        const v = $("#aiRewritten") && $("#aiRewritten").value;
        const ta = $("#resumeText");
        if (ta && v) { ta.value = v; toast("已应用到编辑器"); }
        break;
      }
      case "copy-rewrite": {
        const v = $("#aiRewritten") && $("#aiRewritten").value;
        if (v) copyText(v);
        break;
      }
      case "load-version": {
        const r = S.resumes.find(x => x.id === id);
        const ta = $("#resumeText");
        if (ta && r) ta.value = r.text;
        toast("已载入版本");
        break;
      }
      case "open-task-modal": taskEditId = null; taskModal(null); break;
      case "edit-task": taskEditId = id; taskModal(S.tasks.find(x => x.id === id)); break;
      case "save-task": saveTask(); break;
      case "toggle-task": {
        const t = S.tasks.find(x => x.id === id);
        if (t) { t.done = !t.done; save(); render(); }
        break;
      }
      case "delete-task": S.tasks = S.tasks.filter(x => x.id !== id); save(); render(); toast("任务已删除"); break;
      case "pick-resume-img": pickResumeImg(); break;
      case "clear-resume-image": resumeImage = null; renderResumePreview(); toast("图片已清除"); break;
      case "ocr-resume": ocrResume(); break;
      case "apply-ocr": {
        const v = $("#ocrText") && $("#ocrText").value;
        const ta = $("#resumeText");
        if (ta && v) { ta.value = v; toast("识别结果已应用到简历编辑器"); }
        break;
      }
      case "copy-ocr": {
        const v = $("#ocrText") && $("#ocrText").value;
        if (v) copyText(v);
        break;
      }
      case "open-app-modal": appFormModal(null); break;
      case "edit-app": appFormModal(S.apps.find(a => a.id === id)); break;
      case "save-app": saveApp(); break;
      case "delete-app": {
        S.apps = S.apps.filter(a => a.id !== id);
        save(); render(); toast("已删除");
        break;
      }
      case "move-app": {
        const app = S.apps.find(a => a.id === id);
        if (!app) break;
        const i = D.statuses.indexOf(app.status);
        const j = i + Number(el.dataset.dir);
        if (j >= 0 && j < D.statuses.length) { app.status = D.statuses[j]; save(); updateTracker(); }
        break;
      }
      case "tracker-view": filters.tracker.view = el.dataset.value; render(); break;
      case "export-csv": exportCSV(); toast("CSV 已导出"); break;
      case "tab-res": filters.res.tab = el.dataset.value; filters.res.city = "全部"; render(); break;
      case "refresh-resources": {
        if (!window.OFFERFLOW_BACKEND) { toast("请通过后端服务访问（当前为纯静态模式）"); break; }
        fetch("/api/resources/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", cache: "no-store" })
          .then(r => r.json())
          .then(d => {
            if (d.ok) {
              toast("已新增 " + d.added + " 条校招信息");
              loadRemoteResources();
            } else {
              toast(d.error || "抓取失败");
            }
          })
          .catch(() => toast("请通过后端服务访问（当前为纯静态模式）"));
        break;
      }
      case "apply-resource": appFormModal({ company: el.dataset.company, role: el.dataset.role, city: el.dataset.city, channel: "校招官网", status: "意向", applyDate: today(), note: "来自求职资料", link: el.dataset.link || "" }); break;
      case "open-review": openReview(id); break;
      case "copy-review": copyReview(id); break;
      case "export-review": exportReview(id); break;
      case "export-week": exportWeek(); break;
      case "delete-review": S.reviews = S.reviews.filter(r => r.id !== id); save(); render(); toast("报告已删除"); break;
      case "start-test": testStarted = true; testAnswers = {}; render(); break;
      case "cancel-test": testStarted = false; render(); break;
      case "submit-test": submitSelfTest(); break;
      case "save-settings": saveSettings(); break;
      case "enable-notify": requestNotify(); break;
      case "export-backup": exportBackup(); break;
      case "pick-backup": { const el = $("#importBackup"); if (el) el.click(); } break;
      case "apply-backup-merge": applyBackup("merge"); break;
      case "apply-backup-overwrite": applyBackup("overwrite"); break;
      case "pick-csv": { const el = $("#importCsv"); if (el) el.click(); } break;
      case "ai-follow": aiFollow(); break;
      case "reset-data": {
        localStorage.removeItem(LS_KEY);
        location.reload();
        break;
      }
    }
  });

  document.addEventListener("change", function (e) {
    const el = e.target;
    if (el && el.dataset.action === "app-status") {
      const app = S.apps.find(a => a.id === el.dataset.id);
      if (app) { app.status = el.value; save(); updateTracker(); }
    }
    if (el && el.id === "importBackup") handleBackupFile(e);
    if (el && el.id === "importCsv") handleCsvFile(e);
    if (el && el.id === "setPreset") applyPreset(el.value);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!$("#modalRoot").hidden) closeModal();
    }
  });

  $("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

  const pill = $("#aiPillText");
  if (pill) pill.textContent = S.profile.aiEnabled && S.profile.apiKey ? "AI 接口已启用" : "本地 AI 在线";
  const av = $(".avatar");
  if (av) av.textContent = (S.profile.name || "林").slice(0, 1);

  window.__onAuthChange = function () {
    render();
    if (window.Auth && Auth.token() && !syncingOnce) {
      syncingOnce = true;
      Auth.getState().then(d => {
        syncingOnce = false;
        if (d && d.state) applyRemoteState(d.state);
      }).catch(() => { syncingOnce = false; });
    }
  };
  render();
  checkReminders();
  setInterval(checkReminders, 60000);
  if (window.Auth) Auth.check();
})();
