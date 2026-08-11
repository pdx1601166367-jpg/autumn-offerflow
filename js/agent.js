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

  function localJobSearch(goal, state, remoteItems) {
    const pool = remoteItems && remoteItems.length ? remoteItems : (D.resources.campus || []);
    const found = pool.filter(r => goal.company && (r.company.includes(goal.company) || goal.company.includes(r.company)));
    return found.length ? found : [{ company: goal.company || "目标企业", batch: "目标岗位", roles: goal.role, cities: "待确认", link: "", note: "未在内置资料中找到，可手动粘贴 JD" }];
  }

  function jdAnalysis(goal, opts) {
    if (opts.jd && opts.jd.trim()) {
      const words = opts.jd.match(/[\u4e00-\u9fa5A-Za-z0-9+#.]{2,}/g) || [];
      const stop = new Set(["以及", "负责", "我们", "要求", "岗位", "工作", "职责", "能力", "相关", "熟悉", "优先", "具备", "经验", "参与", "良好", "了解", "掌握"]);
      return { source: "用户粘贴 JD", keywords: [...new Set(words.filter(w => !stop.has(w)))].slice(0, 10) };
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

  function buildMemory(state, opts, goal) {
    const resumeText = opts.resumeText !== undefined ? opts.resumeText : readLatestResume(state);
    const cap = capability(state);
    return {
      profile: { name: (state.profile && state.profile.name) || "未设置", role: (state.profile && state.profile.role) || "未设置" },
      goal,
      resumeText: resumeText.slice(0, 1200),
      jdText: opts.jd ? opts.jd.slice(0, 1500) : "",
      practice: cap.stats,
      reviews: (state.reviews || []).slice(0, 3).map(r => ({ score: r.score, improves: r.improves })),
      mastered: (state.mastered || []).length,
      favorites: (state.favorites || []).length,
      applications: (state.apps || []).map(a => ({ company: a.company, status: a.status, interviewAt: a.interviewAt || "" })),
      tasks: (state.tasks || []).map(t => t.title)
    };
  }

  function parseAgentResponse(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) {}
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (e) {}
    }
    return null;
  }

  async function fetchRemoteJobs() {
    if (!window.OFFERFLOW_BACKEND) return null;
    try {
      const r = await fetch("/api/resources", { cache: "no-store" });
      if (!r.ok) return null;
      const d = await r.json();
      return d.items || null;
    } catch (e) { return null; }
  }

  const TOOL_DOCS = [
    { name: "search_job", desc: "检索目标企业岗位信息", params: { company: "企业名", role: "岗位名" } },
    { name: "analyze_jd", desc: "分析岗位 JD 提取能力要求", params: { jd: "JD 文本" } },
    { name: "analyze_resume", desc: "分析用户简历质量", params: {} },
    { name: "match_resume", desc: "计算简历与 JD 匹配度", params: {} },
    { name: "analyze_capability", desc: "读取练习记录分析能力缺口", params: {} },
    { name: "review_memory", desc: "读取历史复盘识别重复问题", params: {} },
    { name: "recommend_questions", desc: "根据缺口推荐训练题目", params: { count: 5 } },
    { name: "generate_plan", desc: "生成 N 天准备计划", params: { days: 7 } },
    { name: "propose_tasks", desc: "生成待用户确认的行动任务", params: {} }
  ];

  const SYSTEM_PROMPT = "你是 OfferFlow 求职 Agent。用户提出求职目标后，你必须自主规划并逐步调用工具。规则：\n" +
    "1. 每步只输出 JSON：{\"reasoning\":\"为什么做这步\",\"next_tool\":\"工具名\",\"params\":{}}；全部完成时输出 {\"reasoning\":\"...\",\"done\":true,\"result\":{\"matchScore\":0-100,\"strengths\":[],\"gaps\":[],\"plan\":[],\"tasks\":[],\"narrative\":\"最终结论\"}}。\n" +
    "2. 必须先调用 analyze_jd 或 search_job 获取岗位要求，再调用 analyze_resume / match_resume，再 analyze_capability / review_memory，最后 recommend_questions / generate_plan / propose_tasks。\n" +
    "3. 只能基于工具返回的真实数据做判断，不得编造用户练习记录、简历内容或岗位数据；数据缺失时在 gaps 或 narrative 中说明。\n" +
    "4. 创建任务、保存岗位属于高风险操作，只在 result.tasks 中给出建议，由用户确认。\n" +
    "5. 不要重复调用同一个工具且参数相同；如果 search_job 返回的岗位没有 JD，立即用 analyze_jd 基于用户提供的 JD 或岗位默认能力模型继续。\n" +
    "6. 你最多执行 5 个工具调用；最后一次输出必须带 done:true 并给出完整 result（matchScore/strengths/gaps/plan/tasks/narrative）。\n" +
    "可用工具：" + JSON.stringify(TOOL_DOCS);

  async function toolRouter(name, params, ctx) {
    switch (name) {
      case "search_job": {
        const remote = await fetchRemoteJobs();
        const jobs = localJobSearch(ctx.goal, ctx.state, remote);
        ctx.jobs = jobs;
        return { summary: "检索到 " + jobs.length + " 条相关岗位：" + jobs[0].company + " · " + jobs[0].batch + (jobs[0].link ? "" : "（无 JD，下一步请调用 analyze_jd）"), data: jobs.slice(0, 5) };
      }
      case "analyze_jd": {
        ctx.jd = jdAnalysis(ctx.goal, ctx.opts);
        return { summary: "JD 关键要求：" + ctx.jd.keywords.slice(0, 6).join("、"), data: ctx.jd };
      }
      case "analyze_resume": {
        const text = ctx.opts.resumeText !== undefined ? ctx.opts.resumeText : readLatestResume(ctx.state);
        ctx.resume = E.scoreResume(text, ctx.opts.jd || "");
        ctx.resumeText = text;
        return { summary: "简历评分 " + ctx.resume.score + (text.trim() ? "" : "（未检测到简历）"), data: { score: ctx.resume.score, dims: ctx.resume.dims } };
      }
      case "match_resume": {
        const text = ctx.resumeText !== undefined ? ctx.resumeText : (ctx.opts.resumeText !== undefined ? ctx.opts.resumeText : readLatestResume(ctx.state));
        ctx.resume = E.scoreResume(text, ctx.opts.jd || "");
        ctx.matchScore = ctx.resume.score;
        return { summary: "匹配分 " + ctx.resume.score, data: { score: ctx.resume.score, dims: ctx.resume.dims, suggestions: ctx.resume.suggestions.slice(0, 3) } };
      }
      case "analyze_capability": {
        ctx.cap = capability(ctx.state);
        return { summary: ctx.cap.stats.map(s => s.cat + " " + s.score).join(" / ") || "暂无练习数据", data: ctx.cap };
      }
      case "review_memory": {
        ctx.mem = reviewMemory(ctx.state);
        return { summary: ctx.mem.recent ? "最近 " + ctx.mem.recent + " 场，重复问题 " + ctx.mem.top.length + " 个" : "暂无复盘", data: ctx.mem };
      }
      case "recommend_questions": {
        ctx.ids = recommend(ctx.state, ctx.cap ? ctx.cap.weak : null, Number(params.count) || 5);
        return { summary: "推荐 " + ctx.ids.length + " 题", data: ctx.ids };
      }
      case "generate_plan": {
        ctx.plan = planFor(ctx.goal, ctx.cap || capability(ctx.state), ctx.jd ? ctx.jd.keywords : [], ctx.goal.company);
        return { summary: "生成 " + ctx.plan.length + " 天计划", data: ctx.plan };
      }
      case "propose_tasks": {
        ctx.tasks = tasksFrom(ctx.goal, ctx.plan || planFor(ctx.goal, ctx.cap || capability(ctx.state), ctx.jd ? ctx.jd.keywords : [], ctx.goal.company), ctx.cap || capability(ctx.state));
        return { summary: "建议 " + ctx.tasks.length + " 个任务（待用户确认）", data: ctx.tasks };
      }
      default:
        return { summary: "未知工具：" + name, data: null };
    }
  }

  async function runAgentic(goalText, opts, profile) {
    const state = opts.state || readState();
    const goal = parseGoal(goalText);
    const ctx = { state, goal, opts, jobs: [], jd: null, resume: null, resumeText: "", cap: null, mem: null, ids: [], plan: [], tasks: [], matchScore: 0 };
    const trace = [];
    const steps = [];
    const memory = buildMemory(state, opts, goal);
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: "用户目标：" + goalText + "\n用户上下文：" + JSON.stringify(memory) }
    ];
    const MAX_STEPS = 5;
    let final = null;
    for (let i = 0; i < MAX_STEPS; i++) {
      const raw = await E.callAI(messages, profile);
      if (!raw) break;
      const parsed = parseAgentResponse(raw);
      if (!parsed) {
        messages.push({ role: "assistant", content: raw });
        messages.push({ role: "user", content: "输出格式错误，请严格输出 JSON。" });
        continue;
      }
      if (parsed.done) { final = parsed; break; }
      if (!parsed.next_tool) {
        messages.push({ role: "assistant", content: raw });
        messages.push({ role: "user", content: "缺少 next_tool，请选择可用工具。" });
        continue;
      }
      let toolResult;
      try {
        toolResult = await toolRouter(parsed.next_tool, parsed.params || {}, ctx);
      } catch (e) {
        toolResult = { summary: "工具执行失败：" + e.message, data: null };
      }
      trace.push({ type: "llm", step: i + 1, reasoning: parsed.reasoning || "", nextTool: parsed.next_tool, detail: toolResult.summary });
      steps.push({ reasoning: parsed.reasoning || "", tool: parsed.next_tool, summary: toolResult.summary });
      messages.push({ role: "assistant", content: JSON.stringify({ next_tool: parsed.next_tool, reasoning: parsed.reasoning || "" }) });
      messages.push({ role: "user", content: "Tool " + parsed.next_tool + " 返回：" + JSON.stringify(toolResult.data).slice(0, 2500) });
    }
    if (!steps.length) {
      return null;
    }
    const r = final && final.result ? final.result : {};
    const cap = ctx.cap || capability(state);
    const plan = Array.isArray(r.plan) && r.plan.length ? r.plan : ctx.plan;
    const tasks = Array.isArray(r.tasks) && r.tasks.length ? r.tasks.map(t => typeof t === "string" ? { title: t, note: "Agent 生成" } : t) : ctx.tasks;
    const ids = Array.isArray(r.questionIds) && r.questionIds.length ? r.questionIds : ctx.ids;
    const matchScore = typeof r.matchScore === "number" ? r.matchScore : (ctx.resume ? ctx.resume.score : 60);
    const strengths = Array.isArray(r.strengths) && r.strengths.length ? r.strengths : [];
    const gaps = Array.isArray(r.gaps) && r.gaps.length ? r.gaps : cap.weak.slice(0, 3).map(c => {
      const s = cap.stats.find(x => x.cat === c) || { cat: c, score: 60 };
      return c + " 平均分 " + s.score;
    });
    return {
      goal, jobs: ctx.jobs.length ? ctx.jobs : localJobSearch(goal, state), jd: ctx.jd || jdAnalysis(goal, opts),
      resume: ctx.resume, matchScore, cap, mem: ctx.mem || reviewMemory(state), ids, plan, tasks, strengths, gaps,
      trace, steps, ms: 0, mode: "ai", deterministic: false, company: goal.company, role: goal.role,
      narrative: r.narrative || ""
    };
  }

  function runLocal(goalText, opts) {
    const t0 = Date.now();
    const state = opts.state || readState();
    const goal = parseGoal(goalText);
    const trace = [];
    const tool = (name, label, detail) => trace.push({ type: "tool", name, label, detail });
    tool("search_job", "搜索目标岗位", goal.company + " · " + goal.role);
    const jobs = localJobSearch(goal, state);
    tool("analyze_jd", "分析岗位要求", "默认能力模型");
    const jd = jdAnalysis(goal, opts);
    const resumeText = opts.resumeText !== undefined ? opts.resumeText : readLatestResume(state);
    const resume = E.scoreResume(resumeText, opts.jd || "");
    tool("analyze_resume", "分析个人简历", resumeText.trim() ? "简历评分 " + resume.score : "未检测到简历");
    tool("match_resume", "匹配岗位要求", "匹配分 " + resume.score);
    const cap = capability(state);
    tool("analyze_capability", "检查能力数据", cap.stats.map(s => s.cat + " " + s.score).join(" / "));
    const mem = reviewMemory(state);
    tool("review_memory", "读取历史复盘", mem.recent ? "最近 " + mem.recent + " 场" : "暂无复盘");
    const ids = recommend(state, cap.weak, 5);
    tool("recommend_questions", "推荐训练题目", "推荐 " + ids.length + " 题");
    const plan = planFor(goal, cap, jd.keywords, goal.company);
    tool("generate_plan", "生成准备计划", plan.length + " 天");
    const tasks = tasksFrom(goal, plan, cap);
    tool("propose_tasks", "生成行动任务", "建议 " + tasks.length + " 个任务（待用户确认）");
    return {
      goal, jobs, jd, resume, matchScore: resume.score, cap, mem, ids, plan, tasks,
      strengths: resumeText.trim() ? ["简历已就绪"] : [], gaps: cap.weak.map(c => c + " 平均分 " + (cap.stats.find(x => x.cat === c) || { score: 60 }).score),
      trace, steps: [], ms: Date.now() - t0, mode: "local", deterministic: true, company: goal.company, role: goal.role, narrative: ""
    };
  }

  async function runGoal(goalText, opts) {
    opts = opts || {};
    const profile = opts.profile || readState().profile || {};
    const useAI = window.OFFERFLOW_BACKEND || (profile.aiEnabled && profile.apiKey);
    if (useAI) {
      try {
        const r = await runAgentic(goalText, opts, profile);
        if (r && r.steps.length) return r;
      } catch (e) {}
    }
    return runLocal(goalText, opts);
  }

  window.Agent = {
    runGoal,
    runLocal,
    parseGoal,
    practiceStats,
    recommend,
    readState,
    TOOLS: TOOL_DOCS.map(t => t.name)
  };
})();
