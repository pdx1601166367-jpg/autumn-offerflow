# Agent 用户画像建立与首次使用（实现记录）

对应需求：《OfferFlow V2 Agent 用户画像建立与首次使用 PRD》（第一阶段）。

## 已实现范围

```text
首次进入 Agent
  → 判断是否存在 User Profile
  → 无：建立求职档案
  → 上传简历（PDF/DOCX/PNG/JPG/TXT，≤10MB，点击或拖拽）
  → 服务端提取文本（DOCX/PDF/TXT）/ OCR（图片）
  → AI 结构化解析（基本信息/教育/实习/项目/技能/AI 实践）
  → 用户确认与编辑
  → 设置求职目标（目标岗位/求职阶段/目标公司/目标城市/期望方向）
  → 生成 User Profile 与完整度
  → 进入 Agent 首页（Hi + 当前目标 + 阶段 + 快捷任务 Starter）
```

## 数据模型

```text
userProfile
├── basic（姓名/学校/专业/学历/毕业年份）
├── education / experiences / projects（原始条目，可编辑）
├── skills（product / ai / tech）
├── aiPractice
├── goals（roles / companies / cities / stage / direction）
├── source（简历文件名与更新时间）
├── completeness（完整度 0-100）
└── complete（是否完成画像建立）
```

## Agent Context 接入

`js/agent.js` 的 `buildMemory` 已把 User Profile 与 Career Goals 注入 Layer 1/Layer 2 Context；目标岗位/目标公司缺失时优先使用画像中的设置。

## 异常处理

- 无法解析的格式/文件过大：明确提示，不阻断。
- OCR/AI 解析失败：进入基础手动填写模式（至少目标岗位 + 求职阶段）。
- 跳过简历：允许使用 Agent，首页显示画像完整度与“上传简历完善画像”入口。
- 解析结果必须经用户确认后才写入 Profile，模型不得虚构经历。

## 验收映射

- 后端测试：注册 → 上传 TXT 简历 → AI 解析 → 确认 → 设置目标 → 画像创建成功 → Agent 检索岗位并生成报告。
- 冒烟测试：首次进入 Agent 显示建档引导，跳过后可正常使用 Agent。
