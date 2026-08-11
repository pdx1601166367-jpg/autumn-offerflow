(function () {
  const D = window.Data;
  const E = window.Engine;

  const COMPANIES = { 阿里: "阿里巴巴", 腾讯: "腾讯", 字节: "字节跳动", 美团: "美团", 华为: "华为", 蚂蚁: "蚂蚁集团", 小米: "小米", 京东: "京东", 百度: "百度", 快手: "快手", 网易: "网易", 小红书: "小红书", 拼多多: "拼多多" };
  const ROLES = { "AI 产品经理": "AI 产品经理", "AI产品经理": "AI 产品经理", "产品经理": "产品经理", "AI PM": "AI 产品经理", "前端": "前端", "后端": "后端", "算法": "算法" };
  const ROLE_DEFAULTS = {
    "AI 产品经理": ["大模型应用", "RAG", "Agent", "数据分析", "用户研究", "产品设计", "评测体系", "商业化"],
    "产品经理": ["需求分析", "数据分析", "用户研究", "产品设计", "项目管理", "沟通协作"],
    "前端": ["JavaScript", "CSS", "React", "性能优化", "工程化"],
    "后端": ["数据库", "分布式", "网络", "中间件", "系统设计"],
    "算法": ["数据结构", "算法", "机器学习", "深度学习", "推荐系统"]
  };

  function readState() {
    try { return JSON.parse(localStorage.getItem("offerflow:v1") || "{}"); } catch (e) { return {}; }
  }

  function readLatestResume(state) {
    const r = (state.resumes || [])[0];
    return r ? r.text : "";
  }

  function parseGoal(goal) {
    const g = goal || "";
    let company = "";
    Object.keys(COMPANIES).forEach(k => { if (g.includes(k)) company = COMPANIES[k]; });
    if (!company && g.includes("阿里")) company = "阿里巴巴";
    let role = "";
    Object.keys(ROLES).forEach(k => { if (g.includes(k)) role = ROLES[k]; });
    if (!role) role = "AI 产品经理";
    const intent = g.includes("面试") ? "面试准备" : /简历|匹配/.test(g) ? "简历匹配" : /诊断|能力/.test(g) ? "能力诊断" : /岗位|适合|投递/.test(g) ? "岗位分析" : "求职准备";
    const m = g.match(/(\d+)\s*天/);
    const days = m ? Number(m[1]) : 7;
    return { company, role, intent, days: Math.min(21, Math.max(3, days)) };
  }

  function practiceStats(state) {
    const map = {};
    (state.practice || []).forEach(p => {
      if (!map[p.cat]) map[p.cat] = [];
      map[p.cat].push(p.score);
    });
    return Object.keys(map).map(k => ({
      cat: k,
      score: Math.round(map[k].reduce((a, b) => a + b, 0) / map[k].length),
      count: map[k].length
    })).sort((a, b) => a.score - b.score);
  }

  function jobSearch(goal, state) {
    const found = [];
    (D.resources.campus || []).forEach(r => {
      if (goal.company && (r.company.includes(goal.company) || goal.company.includes(r.company))) found.push(r);
    });
    return found.length ? found : [{ company: goal.company || "目标企业", batch: "目标岗位", roles: goal.role, cities: "待确认", link: "", note: "未在内置资料中找到，可手动粘贴 JD" }];
  }

  function jdAnalysis(goal, opts) {
    if (opts.jd && opts.jd.trim()) {
      const words = opts.jd.match(/[\u4e00-\u9fa5A-Za-z0-9+#.]{2,}/g) || [];
      const stop = new Set(["以及", "负责", "我们", "要求", "岗位", "工作", "职责", "能力", "相关", "熟悉", "优先", "具备", "经验", "参与", "良好", "了解", "掌握"]);
      const kws = [...new Set(words.filter(w => !stop.has(w)))].slice(0, 10);
      return { source: "用户粘贴 JD", keywords: kws };
    }
    return { source: "岗位默认能力模型", keywords: ROLE_DEFAULTS[goal.role] || ROLE_DEFAULTS["AI 产品经理"] };
  }

  function capability(state) {
    const stats = practiceStats(state);
    const weak = stats.length ? stats.slice(0, 3).map(s => s.cat) : ["AI 产品"];
    const all = stats.length ? stats : [{ cat: "AI 产品", score: 60, count: 0 }];
    return { stats: all, weak, avg: stats.length ? Math.round(stats.reduce((a, b) => a + b.score, 0) / stats.length) : null };
  }

  function recommend(state, weakCats, count) {
    const ids = [];
    const mastered = new Set(state.mastered || []);
    const pool = weakCats && weakCats.length
      ? D.questions.filter(q => weakCats.includes(q.cat))
      : D.questions.filter(q => q.cat === "AI 产品" || q.cat === "产品");
    pool.filter(q => !mastered.has(q.id)).slice(0, count).forEach(q => ids.push(q.id));
    if (ids.length < count) {
      D.questions.filter(q => !mastered.has(q.id) && !ids.includes(q.id)).slice(0, count - ids.length).forEach(q => ids.push(q.id));
    }
    return ids;
  }

  function reviewMemory(state) {
    const reviews = state.reviews || [];
    const gaps = {};
    reviews.slice(0, 5).forEach(r => (r.improves || []).forEach(g => { gaps[g] = (gaps[g] || 0) + 1; }));
    const top = Object.entries(gaps).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => ({ gap: x[0], times: x[1] }));
    return { recent: reviews.length, top };
  }

  function planFor(goal, cap, jdKws, company) {
    const weak = cap.weak.length ? cap.weak[0] : "AI 产品";
    const days = goal.days;
    const base = [
      "Day 1：JD 与简历匹配，整理 " + (company || "目标企业") + " " + goal.role + " 岗位要求",
      "Day 2：大模型基础与大模型应用案例",
      "Day 3：" + (jdKws.includes("Agent") ? "Agent 工作流与工具调用" : "RAG 与知识库产品设计"),
      "Day 4：" + goal.role + " 产品案例拆解（AI 客服 / 知识库 / 搜索）",
      "Day 5：数据指标与评测体系（命中 " + weak + " 薄弱方向）",
      "Day 6：模拟面试（AI 产品方向）+ 复盘",
      "Day 7：薄弱点专项训练与面试日历准备"
    ];
    const plan = [];
    for (let i = 0; i < Math.min(days, 14); i++) plan.push(base[i % base.length].replace(/Day \d+：/, "Day " + (i + 1) + "："));
    return plan;
  }

  function tasksFrom(goal, plan, cap) {
    const tasks = [];
    tasks.push({ title: "分析 " + (goal.company || "目标企业") + " " + goal.role + " JD 并完成简历匹配", note: "Agent 生成" });
    tasks.push({ title: "完成 Day 1 计划：" + plan[0], note: "Agent 生成" });
    if (cap.weak.length) {
      const s = cap.stats.find(x => x.cat === cap.weak[0]) || { cat: cap.weak[0], score: 60 };
      tasks.push({ title: "专项训练：" + cap.weak[0] + " 薄弱方向（当前平均 " + s.score + " 分）", note: "Agent 生成" });
    }
    tasks.push({ title: "完成 1 次 AI 产品方向模拟面试并查看复盘", note: "Agent 生成" });
    tasks.push({ title: "整理面试材料与提问清单", note: "Agent 生成" });
    return tasks.slice(0, 5);
  }

  function runGoal(goalText, opts) {
    opts = opts || {};
    const t0 = Date.now();
    const state = opts.state || readState();
    const goal = parseGoal(goalText);
    const trace = [];
    const tool = (name, label, detail) => trace.push({ name, label, detail });

    tool("Goal Understanding", "理解求职目标", goal.company + " · " + goal.role + " · " + goal.intent + " · " + goal.days + " 天");

    const jobs = jobSearch(goal, state);
    tool("Job Search", "搜索目标岗位", jobs[0].company + " · " + jobs[0].batch + (jobs[0].link ? " · " + jobs[0].link : ""));

    const jd = jdAnalysis(goal, opts);
    tool("JD Analysis", "分析岗位要求", jd.keywords.slice(0, 6).join("、"));

    const resumeText = opts.resumeText !== undefined ? opts.resumeText : readLatestResume(state);
    const resume = E.scoreResume(resumeText, opts.jd || "");
    tool("Resume Analysis", "分析个人简历", resumeText.trim() ? "简历评分 " + resume.score : "未检测到简历，建议先粘贴简历");

    tool("Resume Match", "匹配岗位要求", "匹配分 " + resume.score + " · 最弱维度 " + Object.entries(resume.dims).sort((a, b) => a[1] - b[1])[0][0] + " " + Object.entries(resume.dims).sort((a, b) => a[1] - b[1])[0][1]);

    const cap = capability(state);
    tool("Capability Analysis", "检查能力数据", cap.stats.length ? cap.stats.map(s => s.cat + " " + s.score).join(" / ") : "暂无练习数据，以岗位能力模型兜底");

    const mem = reviewMemory(state);
    tool("Review Memory", "读取历史复盘", mem.recent ? "最近 " + mem.recent + " 场，重复问题：" + (mem.top.map(t => t.gap.slice(0, 14) + "×" + t.times).join("、") || "无") : "暂无复盘记录");

    const ids = recommend(state, cap.weak, 5);
    tool("Question Recommend", "推荐训练题目", "命中 " + (cap.weak.length ? cap.weak[0] : "AI 产品") + " 方向，推荐 " + ids.length + " 题");

    const plan = planFor(goal, cap, jd.keywords, goal.company);
    tool("Training Plan", "生成准备计划", plan.length + " 天计划（Day 1: " + plan[0].replace(/^Day \d+：/, "") + "）");

    const tasks = tasksFrom(goal, plan, cap);
    tool("Task Creation", "生成行动任务", "建议创建 " + tasks.length + " 个任务，等待用户确认");

    const strengths = [];
    if (resumeText.trim()) strengths.push("简历已就绪，可进入匹配优化");
    if (cap.avg !== null && cap.avg >= 70) strengths.push("近期练习平均分 " + cap.avg + "，基础扎实");
    if (mem.recent > 0 && mem.top.length === 0) strengths.push("复盘无重复性问题，表现稳定");
    if (!strengths.length) strengths.push("已具备完整求职工具链，Agent 已启动");
    const gaps = cap.weak.slice(0, 3).map(c => {
      const s = cap.stats.find(x => x.cat === c) || { cat: c, score: 60 };
      return c + " 平均分 " + s.score;
    });

    return {
      goal, jobs, jd, resume, matchScore: resume.score, cap, mem, ids, plan, tasks,
      strengths, gaps, trace, ms: Date.now() - t0, deterministic: true, company: goal.company, role: goal.role
    };
  }

  window.Agent = {
    runGoal,
    parseGoal,
    practiceStats,
    recommend,
    readState,
    TOOLS: ["Goal Understanding", "Job Search", "JD Analysis", "Resume Analysis", "Resume Match", "Capability Analysis", "Review Memory", "Question Recommend", "Training Plan", "Task Creation"]
  };
})();
