(function () {
  const DATA = window.Data;

  function has(text, list) {
    const t = (text || "").toLowerCase();
    return list.filter(k => t.includes(String(k).toLowerCase()));
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function evalAnswer(question, answer) {
    const a = (answer || "").trim();
    const len = a.length;
    const kws = has(a, question.kws || []);
    let score = 0;
    const points = [];
    const gaps = [];

    score += len < 20 ? 8 : len < 60 ? 18 : len < 150 ? 26 : 30;
    score += Math.min(30, kws.length * 7);
    if (/[0-9]|%|倍|增长|提升|降低|耗时|QPS|TPS|ms|s\b/.test(a)) { score += 8; points.push("答案中包含量化信息，说服力更强"); }
    if (/(第一|第二|首先|然后|最后|①|②|1\.|2\.|一是|二是)/.test(a)) { score += 8; points.push("使用结构化表达，层次清楚"); }
    if (question.type === "手撕" || question.type === "算法") {
      const hasCode = /(function|const|let|=>|\{|class|def |return|while|for\()/.test(a);
      if (hasCode) { score += 14; points.push("给出代码实现并说明思路"); } else { score += 4; gaps.push("建议补充核心代码或伪代码，并逐步解释"); }
    }
    if ((question.cat === "行为") || (question.cat === "产品")) {
      if (/(项目|经历|负责|做了|结果|上线|指标|用户|数据)/.test(a)) points.push("结合了真实经历，有具体场景");
      if (!/(项目|经历|我|负责|做)/.test(a)) gaps.push("建议用 STAR 结构讲一个具体例子");
    }
    if (question.cat === "英语") {
      const words = a.split(/\s+/).filter(Boolean).length;
      score = clamp(words >= 25 ? 78 : words >= 10 ? 62 : 40, 20, 95);
      if (words < 20) gaps.push("回答偏短，建议补充具体例子或量化成果");
      if (/(because|first|also|then|for example|in my)/.test(a.toLowerCase())) points.push("使用连接词让表达更连贯");
    }
    if (kws.length === 0) gaps.push("缺少题目核心关键词：" + (question.kws || []).slice(0, 4).join("、"));
    const missed = (question.kws || []).filter(k => !String(a).toLowerCase().includes(String(k).toLowerCase())).slice(0, 3);
    if (missed.length && missed.length < (question.kws || []).length) gaps.push("可补充要点：" + missed.join("、"));
    if (len > 260) gaps.push("回答偏长，建议压缩到 60-120 秒的核心表达");

    const pct = (question.points || []).length;
    (question.points || []).slice(0, 2).forEach(pt => { if (len > 40) points.push(pt + "（参考要点）"); });

    const total = clamp(score, 20, 96);
    const comment = total >= 85 ? "回答质量高：覆盖核心要点，表达清楚，继续保持。"
      : total >= 70 ? "回答合格：核心思路正确，再补充细节与结构会更出彩。"
      : total >= 55 ? "回答偏弱：方向对了但内容单薄，建议对照要点补全。"
      : "回答需要重构：先给出结论，再按结构展开，并补充关键概念。";

    return { score: total, points: points.slice(0, 4), gaps: gaps.slice(0, 4), comment };
  }

  function scoreResume(text, jd) {
    const t = text || "";
    const dims = {};
    const suggestions = [];
    let score = 0;

    const hasSection = s => new RegExp(s).test(t);
    const structure = ["教育", "学校", "大学", "学院"].some(hasSection) ? 1 : 0;
    const exp = ["工作", "实习", "项目", "经历"].some(hasSection) ? 1 : 0;
    const skill = ["技能", "掌握", "熟悉", "了解", "技术栈"].some(hasSection) ? 1 : 0;
    dims["结构与完整性"] = Math.round((structure + exp + skill) / 3 * 100);
    if (!structure) suggestions.push("缺少教育背景区块，招聘方无法快速判断学历信息。");
    if (!exp) suggestions.push("缺少经历区块，建议按「项目经历 / 实习经历」分别列出。");
    if (!skill) suggestions.push("缺少技能区块，建议用「熟悉 / 掌握 / 了解」标注技术栈。");
    score += dims["结构与完整性"] * 0.3;

    const quant = (t.match(/[0-9]|%|倍|增长|提升|降低|耗时|QPS|TPS|ms|并发|用户/gi) || []).length;
    dims["量化程度"] = clamp(Math.round(30 + quant * 14), 30, 100);
    if (quant < 3) suggestions.push("量化结果偏少：为每段经历补充 1-2 个数字，如「性能提升 40%」「覆盖 10 万用户」。");
    else suggestions.push("量化信息较好，继续保持「动作 + 指标」的表达。");
    score += dims["量化程度"] * 0.25;

    const verbs = ["负责", "主导", "完成", "实现", "优化", "搭建", "设计", "推动", "重构", "上线", "交付", "improved", "built", "led", "designed"];
    const found = has(t, verbs);
    dims["动词强度"] = clamp(Math.round(35 + found.length * 9), 35, 100);
    if (found.length < 4) suggestions.push("动词偏弱：用「主导 / 优化 / 交付」等强动词替代「参与 / 协助」。");
    score += dims["动词强度"] * 0.2;

    let jdScore = 75;
    if (jd && jd.trim()) {
      const jdWords = jd.match(/[\u4e00-\u9fa5A-Za-z0-9+.#]{2,}/g) || [];
      const unique = [...new Set(jdWords.filter(w => !["以及", "负责", "我们", "要求", "岗位", "工作", "职责", "能力", "相关"].includes(w)))];
      const hit = unique.filter(w => t.includes(w));
      jdScore = clamp(Math.round(30 + hit.length * 7), 30, 100);
      if (hit.length < 4) suggestions.push("与 JD 匹配度较低：把 JD 中的关键词（如「微服务」「Vue3」「高并发」）写进简历。");
      else suggestions.push("关键词覆盖良好：" + hit.slice(0, 6).join("、") + "。");
    }
    dims["JD 匹配"] = jdScore;
    score += jdScore * 0.15;

    const lines = t.split(/\r?\n/).filter(l => l.trim()).length;
    dims["篇幅与可读性"] = clamp(lines >= 8 && lines <= 40 ? 88 : lines > 40 ? 60 : 48, 40, 95);
    if (lines > 40) suggestions.push("篇幅过长：精简到一页 A4，删除冗余描述。");
    if (lines < 8) suggestions.push("内容过少：补充项目成果、技术栈与实习细节。");
    score += dims["篇幅与可读性"] * 0.1;

    const total = Math.round(score);
    const level = total >= 85 ? "优秀" : total >= 70 ? "良好" : total >= 55 ? "待改进" : "薄弱";
    return { score: total, level, dims, suggestions, keywords: found, matches: jd ? [] : null };
  }

  function matchProblem(text) {
    const t = (text || "").toLowerCase();
    const rules = [
      ["two", ["两数之和", "two sum", "两数", "target"]],
      ["reverse", ["反转链表", "reverse list", "反转一个链表"]],
      ["substring", ["最长无重复", "无重复字符", "longest substring"]],
      ["palindrome", ["回文", "palindrome"]],
      ["stairs", ["爬楼梯", "climb stairs", "斐波那契"]],
      ["brackets", ["括号", "brackets", "parentheses", "valid"]],
      ["lru", ["lru", "最近最少使用", "缓存"]],
      ["stock", ["股票", "买卖股票", "max profit"]],
      ["islands", ["岛屿", "islands"]],
      ["coins", ["零钱", "硬币", "coin change"]],
      ["quicksort", ["快排", "快速排序", "quicksort"]]
      ,["ai_cs", ["客服", "customer service", "chatbot", "智能客服"]]
      ,["funnel", ["转化率", "注册转化", "提升转化", "conversion"]]
      ,["member", ["会员", "会员体系", "membership"]]
      ,["fermi", ["估算", "加油站", "费米", "market sizing"]]
      ,["ai_interview", ["AI 面试", "面试产品", "评分维度", "面试官"]]
      ,["ai_value", ["是否有价值", "验证价值", "假设验证", "最小实验"]]
      ,["cold_start", ["冷启动", "推荐系统", "推荐冷启动"]]
      ,["pricing", ["定价", "怎么收费", "AI 功能定价"]]
    ];
    let best = null, bestScore = 0;
    for (const [key, words] of rules) {
      const hit = words.filter(w => t.includes(w)).length;
      if (hit > bestScore) { bestScore = hit; best = key; }
    }
    return bestScore > 0 ? DATA.solverDb.find(p => p.key === best) : null;
  }

  function solveProblem(text, type) {
    const known = matchProblem(text);
    const lower = (text || "").toLowerCase();
    if (known) {
      return {
        matched: true, title: known.title,
        approach: known.approach, code: known.code,
        complexity: known.complexity, hint: known.hint,
        tags: known.tags
      };
    }
    const typeGuide = {
      "编程": { steps: ["明确输入输出与数据规模", "选择合适的数据结构（数组/哈希/堆/栈）", "设计核心循环或递归并处理边界", "验证复杂度与测试用例"] },
      "选择": { steps: ["先排除明显错误选项", "回到题干确认考察的知识点", "对不确定选项用反例验证", "注意绝对化表述通常是干扰项"] },
      "读图": { steps: ["先读坐标轴、图例与单位", "识别趋势、拐点和异常点", "把图形结论转成业务含义", "结合数据量级判断是否显著"] },
      "英语": { steps: ["先判断题目考察的时态与句法", "定位关键词并对应选项", "检查主谓一致与搭配", "通读确认语义通顺"] },
      "综合": { steps: ["拆解问题为已知子问题", "列出关键约束与优先级", "给出可选方案并比较取舍", "明确验证与复盘方式"] }
    };
    const guide = typeGuide[type] || typeGuide["综合"];
    return {
      matched: false, title: "通用解题框架", type,
      approach: guide.steps.map((s, i) => (i + 1) + ". " + s).join("\n"),
      code: null,
      complexity: "按实际算法确定，回答时说明时间与空间复杂度",
      hint: "先把问题描述转成输入、输出和约束，再选择数据结构",
      tags: ["通用"]
    };
  }

  function selfTestResult(answers) {
    let sum = 0;
    DATA.selfTest.forEach(q => {
      const v = answers[q.id];
      if (v !== undefined && v !== null) sum += q.scores[v];
    });
    const max = DATA.selfTest.length * 4;
    const score = Math.round(sum / max * 100);
    const level = score >= 80 ? "充分准备" : score >= 60 ? "基本在线" : score >= 40 ? "需要加速" : "起步阶段";
    const tips = score >= 80 ? ["保持当前节奏，重点做查漏补缺", "每周安排一次模拟面试保持手感", "把面经沉淀成自己的回答模板"]
      : score >= 60 ? ["固定每周 3 次模拟面试", "简历按 JD 定制并补充量化数据", "整理投递表格，及时跟进状态"]
      : score >= 40 ? ["先补信息：整理目标公司与时间线", "从题库高频题开始每日 3 题", "用复盘报告定位薄弱维度"]
      : ["先建立投递与训练的最小闭环", "每天 30 分钟：1 题 + 1 段 STAR 练习", "完成一次自测后复查改进"];
    return { score, level, tips, max, sum };
  }

  function salaryCalc(input) {
    const month = Number(input.month) || 0;
    const bonus = Number(input.bonus) || 0;
    const stockYear = Number(input.stock) || 0;
    const currentTotal = month * (12 + bonus) + stockYear;
    const ratios = [
      { label: "保守涨幅 +15%", total: Math.round(currentTotal * 1.15) },
      { label: "合理涨幅 +25%", total: Math.round(currentTotal * 1.25) },
      { label: "理想涨幅 +35%", total: Math.round(currentTotal * 1.35) }
    ];
    const base = Number(input.base) || 0;
    const bBonus = Number(input.bBonus) || 0;
    const bStock = Number(input.bStock) || 0;
    const target = base * (12 + bBonus) + bStock;
    const diff = target - currentTotal;
    return { currentTotal, ratios, target, diff, diffPct: currentTotal ? Math.round(diff / currentTotal * 100) : 0 };
  }

  async function callAI(messages, settings) {
    if (!settings || !settings.apiKey) return null;
    const base = (settings.apiBase || "https://api.openai.com/v1").replace(/\/+$/, "");
    try {
      const res = await fetch(base + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + settings.apiKey },
        body: JSON.stringify({ model: settings.model || "gpt-4o-mini", messages, temperature: 0.6, max_tokens: 900 }),
        signal: AbortSignal.timeout(25000)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.choices && data.choices[0] ? data.choices[0].message.content : null;
    } catch (e) {
      return null;
    }
  }

  async function visionOCR(dataUrl, settings) {
    if (!settings || !settings.apiKey || !dataUrl) return null;
    const base = (settings.apiBase || "https://api.openai.com/v1").replace(/\/+$/, "");
    const model = settings.model || "gpt-4o-mini";
    try {
      const res = await fetch(base + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + settings.apiKey },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "你是简历 OCR 助手。请把图片中的文字完整、按原结构提取出来，保留换行；不要翻译、不要总结、不要添加任何评论。" },
            { role: "user", content: [{ type: "text", text: "提取这张简历图片中的全部文字：" }, { type: "image_url", image_url: { url: dataUrl } }] }
          ],
          temperature: 0.1,
          max_tokens: 2000
        }),
        signal: AbortSignal.timeout(40000)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.choices && data.choices[0] ? data.choices[0].message.content : null;
    } catch (e) {
      return null;
    }
  }

  window.Engine = { evalAnswer, scoreResume, matchProblem, solveProblem, selfTestResult, salaryCalc, callAI, visionOCR, clamp };
})();
