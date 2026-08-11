const JD = 'AI 产品经理：熟悉大模型应用、RAG、Agent、SQL 数据分析，有智能客服或知识库产品经验优先，负责需求分析、产品设计、评测体系搭建与商业化。';
const RESUME = '张三\n求职意向：AI 产品经理\n技能：熟悉大模型应用、RAG、评测集\n项目：主导智能客服项目，人工介入率降低 25%。\n实习：某互联网公司产品实习生，负责需求文档与数据分析。';

module.exports = {
  JD,
  RESUME,
  CASES: [
    { id: 1, goal: '帮我准备阿里 AI 产品经理面试，还有 10 天', jd: JD, resume: RESUME, expectedTools: ['JD Analysis', 'Resume Match', 'Capability Analysis', 'Question Recommend', 'Training Plan'], planKeys: ['JD', '大模型', '模拟面试'], minScore: 50 },
    { id: 2, goal: '分析腾讯 AI PM 岗位我适不适合', jd: JD, resume: RESUME, expectedTools: ['JD Analysis', 'Resume Match', 'Capability Analysis'], planKeys: ['匹配', 'JD'], minScore: 50 },
    { id: 3, goal: '帮我优化字节产品经理的简历匹配', jd: '产品经理：负责需求分析、用户研究、数据分析、项目管理。', resume: RESUME, expectedTools: ['Resume Analysis', 'Resume Match', 'Capability Analysis'], planKeys: ['匹配'], minScore: 40 },
    { id: 4, goal: '帮我诊断华为 AI 产品经理的能力差距', jd: JD, resume: RESUME, expectedTools: ['Capability Analysis', 'Question Recommend'], planKeys: ['薄弱', '模拟面试'], minScore: 50 },
    { id: 5, goal: '美团产品经理面试还有 7 天', jd: '产品经理：需求分析、数据分析、跨团队协作。', resume: RESUME, expectedTools: ['JD Analysis', 'Resume Match', 'Training Plan'], planKeys: ['Day'], minScore: 40 },
    { id: 6, goal: '帮我看看蚂蚁 AI 产品经理岗位适不适合投递', jd: JD, resume: RESUME, expectedTools: ['Job Search', 'JD Analysis', 'Resume Match'], planKeys: ['匹配'], minScore: 50 },
    { id: 7, goal: '京东产品经理 10 天面试准备计划', jd: '产品经理：用户研究、数据分析、项目管理。', resume: RESUME, expectedTools: ['JD Analysis', 'Resume Match', 'Training Plan'], planKeys: ['Day'], minScore: 40 },
    { id: 8, goal: '百度 AI PM 岗位简历匹配分析', jd: JD, resume: RESUME, expectedTools: ['Resume Analysis', 'Resume Match', 'Capability Analysis'], planKeys: ['匹配'], minScore: 50 },
    { id: 9, goal: '快手产品经理能力诊断并推荐题目', jd: '产品经理：需求、数据、协作。', resume: RESUME, expectedTools: ['Capability Analysis', 'Question Recommend'], planKeys: ['薄弱'], minScore: 40 },
    { id: 10, goal: '网易 AI 产品经理面试准备', jd: JD, resume: RESUME, expectedTools: ['JD Analysis', 'Resume Match', 'Training Plan'], planKeys: ['模拟面试'], minScore: 50 },
    { id: 11, goal: '小米产品经理 14 天求职准备计划', jd: '产品经理：需求分析、数据、沟通。', resume: RESUME, expectedTools: ['JD Analysis', 'Resume Match', 'Training Plan'], planKeys: ['Day'], minScore: 40 },
    { id: 12, goal: '帮我综合准备小红书 AI 产品经理岗位', jd: JD, resume: RESUME, expectedTools: ['Goal Understanding', 'JD Analysis', 'Resume Match', 'Capability Analysis', 'Question Recommend', 'Training Plan', 'Task Creation'], planKeys: ['Day'], minScore: 50 }
  ]
};
