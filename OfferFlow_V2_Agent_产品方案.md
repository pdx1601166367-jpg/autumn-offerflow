# OfferFlow V2 Agent 化产品方案

## 文档信息

| 项目 | 内容 |
|---|---|
| 产品名称 | OfferFlow AI 求职任务 Agent |
| 产品版本 | V2.0 |
| 产品定位 | 面向 AI 产品经理求职者的智能求职任务执行与决策平台 |
| 核心变化 | 从“用户主动操作多个求职工具”升级为“用户提出求职目标，Agent 自主协调多个工具完成任务” |

---

# 一、V2 的核心产品定位

## 1.1 V1 的问题

当前 OfferFlow 已经覆盖岗位信息、简历优化、题库、模拟面试、投递管理、复盘、能力分析、任务管理等多个环节，但这些能力目前是相互独立的功能模块。

用户仍然需要自己判断：

> 我现在应该做什么？

例如用户想冲刺阿里 AI 产品经理，需要自己完成：

1. 找阿里 JD
2. 分析 JD
3. 打开简历
4. 进行简历匹配
5. 查看能力雷达
6. 找薄弱能力
7. 去题库找题
8. 做模拟面试
9. 查看复盘
10. 创建下一步任务

产品提供了工具，但没有真正承担“求职决策”。

## 1.2 V2 要解决的核心问题

V2 不再重点解决“用户缺少某一个求职工具”，而是解决：

> **用户不知道面对一个具体求职目标，接下来应该做什么，以及如何连续完成这些事情。**

因此核心交互从“功能驱动”变成“目标驱动”。

用户不需要先知道应该使用哪个功能，只需要告诉 Agent：

> “我想拿到阿里 AI 产品经理的面试机会，帮我看看我现在差在哪里。”

Agent 自己决定：

**需要分析什么 → 调用什么工具 → 获取什么信息 → 是否继续执行 → 最后给用户什么结果。**

---

# 二、V2 的核心产品闭环

```text
用户提出求职目标
        ↓
Agent 理解目标
        ↓
判断任务类型
        ↓
拆解任务
        ↓
制定执行计划
        ↓
调用工具
        ↓
获取中间结果
        ↓
判断是否需要继续执行
        ↓
动态调整计划
        ↓
形成最终结果
        ↓
生成下一步行动
        ↓
用户确认 / 执行
        ↓
产生新的求职数据
        ↓
更新用户能力画像
```

真正体现 Agent 的地方是：

> **Agent 不只是生成答案，而是根据中间结果决定下一步行动。**

---

# 三、OfferFlow V2 的总体架构原则

## 3.1 不把整个 OfferFlow 都做成 Agent

V2 采用：

> **Agent + Workflow 混合架构**

### 保留 Workflow

对于确定性很强的功能继续使用传统 Workflow：

- 投递管理
- 面试日历
- 每日一题
- CSV 导入
- 数据同步
- 复盘报告生成
- 能力雷达计算
- 周报统计

这些任务路径固定、规则明确、结果可预测，没有必要使用 Agent。

### Agent 化

对于复杂任务由 Agent 负责决策：

- 岗位分析
- 求职规划
- 简历匹配
- 能力差距分析
- 面试准备
- 学习路径规划
- 多模块联动

核心原则：

> **Agent 不负责所有事情，只负责具有动态决策价值的任务。**

---

# 四、Agent 核心能力

OfferFlow Agent 主要负责五类能力。

## 4.1 Goal Understanding

理解用户真正想完成的事情。

例如：

> “帮我准备阿里 AI PM。”

Agent 应理解为：

- 目标企业：阿里
- 目标岗位：AI 产品经理
- 核心目标：提高投递/面试成功概率

## 4.2 Task Planning

将目标拆解成任务。

```text
目标：准备阿里 AI 产品经理

↓
获取岗位要求
↓
分析 JD
↓
分析用户简历
↓
匹配岗位要求
↓
识别能力差距
↓
检查历史练习
↓
制定训练计划
↓
生成任务
```

## 4.3 Tool Calling

根据任务选择工具。

例如：

- 分析 JD → JD Analysis Tool
- 检查能力 → Capability Analysis Tool
- 推荐题目 → Question Recommendation Tool

## 4.4 Dynamic Decision

根据中间结果动态改变下一步路径。

例如：

JD 强调：

- RAG
- Agent
- SQL

用户当前能力：

- SQL：45
- Agent：72
- RAG：81

Agent 判断 SQL 是主要缺口，因此增加 SQL 训练任务。

如果 SQL 已经达到 85，则不再优先推荐 SQL。

## 4.5 Action Execution

Agent 最终不只是给建议，还可以执行：

- 创建任务
- 推荐题目
- 生成训练计划
- 创建面试准备计划
- 保存岗位
- 更新求职状态

涉及重要数据修改时，必须先获得用户确认。

---

# 五、Agent Tool 体系

OfferFlow V1 已经存在大量可复用能力，因此 V2 不需要重新创造全部工具，而是将现有功能抽象成 Agent 可调用的 Tools。

| Tool | 作用 | 对应现有功能 |
|---|---|---|
| Job Search Tool | 搜索/获取目标岗位 | 求职资料 |
| JD Analysis Tool | 分析岗位要求 | 简历匹配 |
| Resume Analysis Tool | 分析简历 | 简历优化 |
| Resume Match Tool | 简历与 JD 匹配 | AI 深度匹配 |
| Capability Tool | 分析用户能力水平 | 能力雷达 |
| Question Search Tool | 查询题库 | 面试题库 |
| Question Recommend Tool | 推荐训练题 | 薄弱点推荐 |
| Mock Interview Tool | 启动模拟面试 | 模拟面试 |
| Review Tool | 获取历史复盘 | 复盘报告 |
| Application Tool | 管理投递记录 | 投递管理 |
| Task Tool | 创建/修改任务 | 今日任务 |
| Calendar Tool | 查询面试安排 | 面试日历 |
| Weekly Report Tool | 获取学习数据 | 周报 |
| Self-Test Tool | 获取准备度 | 自测 |

注意：

> **这些 Tool 本身不是 Agent。Agent 负责根据任务决定什么时候调用哪个 Tool。**

---

# 六、核心场景一：岗位分析 Agent

用户：

> “帮我看看阿里这个 AI PM 岗位我适不适合。”

Agent 执行：

```text
读取用户 Profile
      ↓
读取岗位 JD
      ↓
JD Analysis Tool
      ↓
提取岗位要求
      ↓
Resume Match Tool
      ↓
Capability Tool
      ↓
检查历史训练数据
      ↓
生成匹配结论
```

最终输出：

### 岗位匹配度

78 / 100

### 优势

- AI 产品项目经历
- PRD / 用户研究
- AI Workflow 实践

### 缺口

- Agent 实践不足
- SQL 数据能力不足
- 模型评估体系经验不足

### 建议

Agent 判断当前最应该补的是 Agent 实践，并询问：

> **是否生成 7 天 Agent 专项训练计划？**

用户确认后才执行。

---

# 七、核心场景二：求职准备 Agent

用户：

> “我还有 10 天参加 AI 产品经理面试，帮我安排一下。”

Agent 读取：

- 面试岗位
- JD
- 用户简历
- 能力雷达
- 历史练习
- 历史复盘

然后动态生成准备计划。

```text
Day 1
JD + 简历匹配

Day 2
大模型基础

Day 3
RAG / Agent

Day 4
AI 产品案例

Day 5
数据指标

Day 6
模拟面试

Day 7
薄弱点训练
...
```

如果 Day 3 的 Agent 题目得分已经很高，Agent 可以动态调整，减少 Agent 基础题，增加 AI 产品评估题。

---

# 八、核心场景三：面试复盘 Agent

V1：

> AI 点评 → 生成复盘报告

V2：

```text
读取本次面试
      ↓
分析每道题
      ↓
读取历史复盘
      ↓
对比历史表现
      ↓
识别重复问题
      ↓
判断核心能力缺口
      ↓
查询题库
      ↓
生成下一轮训练计划
```

例如：

> 你最近 4 次模拟面试中，有 3 次在“AI 产品价值验证”问题上得分低于 60 分。

Agent 判断：

> 这是持续性能力缺口，而不是一次性失误。

然后推荐：

- 5 道相关题目
- 1 次模拟面试

形成：

**面试 → 复盘 → 能力诊断 → 训练 → 再面试**

---

# 九、核心场景四：简历优化 Agent

V1：

> 简历 → AI 改写

V2：

```text
读取 JD
↓
分析岗位能力要求
↓
读取简历
↓
匹配
↓
读取用户已有项目
↓
发现缺口
↓
判断哪些经历值得强化
↓
调用 Resume Rewrite Tool
↓
生成修改版本
↓
再次匹配
↓
判断是否达到目标
```

核心变化：

> **分析 → 修改 → 再评估**

而不是一次性生成。

---

# 十、Agent Memory 设计

OfferFlow 可以基于现有用户数据建立三层 Memory。

## 10.1 用户长期画像

```text
目标岗位
目标企业
技术能力
产品能力
行业偏好
求职阶段
```

## 10.2 求职上下文

```text
当前目标岗位
当前 JD
当前简历版本
当前投递状态
面试时间
```

## 10.3 行为记忆

```text
练习历史
模拟面试
复盘记录
收藏题目
掌握题目
能力变化
```

Agent 每次执行任务时，不需要用户重新解释这些信息。

## 10.4 Memory 使用原则

区分：

**长期事实**

> 用户目标岗位是 AI 产品经理。

与：

**临时上下文**

> 用户刚刚让我分析阿里某个 JD。

临时上下文不一定永久保存。

---

# 十一、Human-in-the-loop

Agent 不应该拥有无限制操作权限。

建议按照风险分级：

| 风险等级 | 操作 | 权限 |
|---|---|---|
| 低 | 分析 JD | Agent 自动执行 |
| 低 | 推荐题目 | Agent 自动执行 |
| 低 | 生成计划 | Agent 自动执行 |
| 中 | 创建任务 | Agent 执行前确认 |
| 中 | 修改简历 | 展示修改内容后确认 |
| 中 | 修改投递状态 | 用户确认 |
| 高 | 自动投递 | 禁止或强确认 |

核心原则：

> **低风险任务自动执行，高风险任务由用户确认。**

---

# 十二、V2 核心 UI

不建议新增一个普通 Chat 页面，而是设计：

# AI 求职 Agent 工作台

用户入口：

> **今天想完成什么？**

例如输入：

> “帮我准备阿里 AI 产品经理面试。”

Agent 执行过程中展示：

```text
任务：准备阿里 AI 产品经理面试

✓ 已读取岗位 JD
✓ 已分析你的简历
✓ 已分析最近 10 次练习
✓ 已识别 3 个能力差距

正在制定准备计划……

你的主要问题是：
① Agent 实践不足
② SQL 数据分析能力不足
③ AI 产品评估体系掌握不足

建议优先补充：

[生成 7 天计划]
```

---

# 十三、Agent 执行过程可视化

为了让用户知道 Agent 正在做什么，同时方便作品集 Demo 展示，建议展示执行轨迹：

```text
任务：准备阿里 AI 产品经理面试

✓ 分析岗位 JD
✓ 分析个人简历
✓ 匹配岗位要求
✓ 检查能力数据
→ 发现 SQL 能力不足
✓ 查询 SQL 题库
✓ 生成训练方案

任务完成
```

支持展开查看：

> Agent 调用了哪些 Tool、每个 Tool 返回了什么结果、Agent 为什么继续下一步。

这样能够明显区别于普通 Chatbot。

---

# 十四、Agent Evaluation 评估体系

V2 必须新增 Agent 专属评估体系。

## 14.1 Task Success Rate

Agent 是否真正完成用户目标。

例如：

100 次标准任务中，82 次成功：

> Task Success Rate = 82%

## 14.2 Planning Accuracy

Agent 是否制定了正确的执行路径。

## 14.3 Tool Calling Accuracy

Agent 是否选择了正确 Tool。

## 14.4 Recommendation Accuracy

Agent 推荐的岗位、题目、训练方向是否真正符合用户能力缺口。

## 14.5 Hallucination Rate

Agent 是否生成真实数据中不存在的信息。

## 14.6 Error Recovery Rate

工具调用失败、数据缺失、模型异常后，Agent 是否能够正确恢复。

## 14.7 Task Completion Time

完成一个完整任务所需时间。

## 14.8 Cost

每次任务消耗的 Token、模型调用次数及平均 API 成本。

---

# 十五、Agent Evaluation Dataset

第一版建议建立：

> **50 个标准求职任务评测集**

分类：

| 类型 | 数量 |
|---|---:|
| 岗位分析 | 10 |
| 简历匹配 | 10 |
| 面试准备 | 10 |
| 能力诊断 | 10 |
| 综合任务 | 10 |
| **合计** | **50** |

每个任务定义：

```text
Input
Expected Plan
Expected Tools
Expected Result
```

例如：

输入：

> “帮我准备阿里 AI PM 面试。”

Expected Plan：

```text
JD Analysis
→ Resume Match
→ Capability Analysis
→ Question Recommendation
→ Training Plan
```

如果 Agent 调用：

```text
JD Analysis
→ Calendar
→ CSV Import
```

则判定为规划/工具调用错误。

---

# 十六、V1 → V2 产品升级

| 能力 | V1 | V2 |
|---|---|---|
| 用户入口 | 功能入口 | 目标入口 |
| 产品逻辑 | 用户选择功能 | Agent 理解目标 |
| Workflow | 固定 | 保留 |
| Tool | 隐藏在页面 | Agent 可调用 |
| 决策 | 用户决定 | Agent 辅助/自主决定 |
| 数据 | 各模块独立使用 | Agent 跨模块调用 |
| 推荐 | 规则推荐 | 动态决策 |
| 任务 | 用户创建 | Agent 建议/创建 |
| 复盘 | 单次报告 | 持续能力诊断 |
| 训练 | 用户主动 | Agent 动态规划 |
| Memory | 用户数据存储 | 用户长期求职上下文 |
| Evaluation | 功能指标 | Agent 任务评估 |

---

# 十七、技术架构

第一版不建议直接做 Multi-Agent。

采用：

> **Single Agent + Tools**

```text
                    用户
                     ↓
               OfferFlow UI
                     ↓
                Agent API
                     ↓
              ┌────────────┐
              │ LLM / Agent │
              └──────┬─────┘
                     ↓
                 Tool Router
                     ↓
        ┌────────────┼────────────┐
        ↓            ↓            ↓
      JD Tool      Resume Tool   Skill Tool
        ↓            ↓            ↓
      Job DB       Resume DB    Practice DB
                     ↓
                  Memory
```

Agent 第一阶段需要掌握：

- Goal Understanding
- Planning
- Tool Calling
- Memory
- Result Validation
- Error Recovery
- Human-in-the-loop

---

# 十八、V2 开发优先级

## Phase 1：Agent MVP

先实现：

- 单 Agent
- Tool Calling
- 任务规划
- 5～8 个核心 Tool
- 基础 Memory
- 用户确认机制

核心链路：

**用户目标 → Agent → JD分析 → 简历分析 → 能力分析 → 题目推荐 → 生成准备计划 → 用户确认 → 创建任务**

## Phase 2：Agent Evaluation

增加：

- 评测集
- Task Success Rate
- Tool Calling Accuracy
- Planning Accuracy
- 幻觉测试
- 成本
- 延迟

## Phase 3：Agent 产品体验

增加：

- Agent 工作台
- 执行过程
- Tool 调用记录
- Plan 展示
- 用户确认
- 错误恢复

## Phase 4：作品集包装

最终形成：

> **OfferFlow：从 AI Workflow 到 AI Agent 的产品演进**

---

# 十九、核心闭环

V2 最终形成：

```text
目标
 ↓
分析
 ↓
计划
 ↓
执行
 ↓
面试
 ↓
复盘
 ↓
能力更新
 ↓
再规划
```

这比单纯增加一个 Agent 聊天窗口更有产品价值。

---

# 二十、作品集核心叙事

项目不应该被包装成：

> “我做了一个 AI Agent。”

而应该呈现为：

> **我在 V1 中搭建了一套覆盖岗位、简历、题库、模拟面试、投递和复盘的 AI 求职工作台。进一步分析用户行为后发现，用户真正的痛点并不是缺少单一 AI 功能，而是需要在多个模块之间不断切换，并自行判断下一步行动。因此，我在 V2 中设计 Agent 决策层，将原有能力抽象成 Tools，让 Agent 根据用户目标自主规划任务、调用工具、读取中间结果并动态调整执行路径，同时通过评测集建立任务完成率、工具调用准确率、幻觉率、成本和响应时间等 Agent 评估指标。**

---

# 二十一、V2 MVP 最终范围

第一阶段不要修改整个 OfferFlow。

只跑通：

**用户目标 → Agent → JD 分析 → 简历分析 → 能力分析 → 题目推荐 → 生成准备计划 → 用户确认 → 创建任务**

第二阶段再接入：

**模拟面试 → 复盘 → 能力更新 → Agent 动态调整训练计划**

最终形成完整闭环：

> **目标 → 分析 → 计划 → 执行 → 面试 → 复盘 → 再规划**

---

# 二十二、项目核心价值

OfferFlow V2 的核心不是“使用了 Agent 技术”，而是完成了产品形态上的一次升级：

> **从“用户主动使用求职工具”，升级为“用户提出目标，Agent 协调多个求职能力完成任务”。**

同时保留 Workflow 负责确定性任务，使系统在：

- 智能性
- 可控性
- 成本
- 稳定性
- 用户体验

之间取得平衡。

这构成了 OfferFlow V2 最核心的 AI 产品设计原则。
