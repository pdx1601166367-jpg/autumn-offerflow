(function () {
  const Q = [
    {
      id: 1, cat: "前端", type: "原理", diff: "中等", q: "从浏览器输入 URL 到页面渲染完成，中间发生了什么？",
      tags: ["浏览器", "网络", "渲染"],
      ans: "完整链路大致为：DNS 解析域名得到 IP，建立 TCP 连接，HTTPS 还需要 TLS 握手；浏览器发送 HTTP 请求，服务器返回 HTML；浏览器解析 HTML 构建 DOM 树，解析 CSS 构建 CSSOM，执行脚本；随后合成渲染树、计算布局、进行绘制与合成。回答时建议分段说明网络请求阶段、解析构建阶段和渲染绘制阶段，并补充关键优化点如资源加载顺序、异步脚本、减少重排重绘。",
      kws: ["DNS", "TCP", "TLS", "HTTP", "DOM", "CSSOM", "渲染", "布局", "绘制"],
      points: ["先讲网络阶段：DNS/TCP/TLS/HTTP", "再讲解析阶段：DOM/CSSOM/JS 执行", "最后讲渲染：合成渲染树、布局、绘制", "补充重排重绘和优化手段更完整"],
      follow: ["哪些过程会阻塞首次渲染？", "如何用 Performance API 定位慢在哪？"]
    },
    {
      id: 2, cat: "前端", type: "概念", diff: "中等", q: "React 中 key 的作用是什么？为什么列表不建议用 index 作为 key？",
      tags: ["React", "diff"],
      ans: "key 帮助 React 在列表 diff 时识别哪些元素被新增、删除或移动，从而复用组件实例和 DOM 节点。用 index 做 key 时，如果列表顺序变化或头部插入元素，React 会复用错误的节点，导致状态错乱、输入框内容串位等问题；因此更推荐使用稳定且唯一的业务 id。",
      kws: ["diff", "复用", "实例", "唯一", "稳定", "状态", "index"],
      points: ["key 的本质是 diff 的身份标识", "index 在插入/排序时会造成错误复用", "使用稳定唯一 id 更安全"],
      follow: ["key 变化时组件会发生什么？", "同列表里 key 重复会怎样？"]
    },
    {
      id: 3, cat: "前端", type: "概念", diff: "入门", q: "什么是闭包？闭包在什么场景下可能造成内存泄漏？",
      tags: ["JavaScript", "作用域"],
      ans: "闭包是指函数能够访问其词法作用域外部变量的能力，即使外层函数已经执行完毕，内部函数仍保留对外部变量的引用。可能造成内存泄漏的场景包括：闭包长期持有大对象、事件监听器未解绑、定时器回调引用 DOM 等。回答时最好写一个计数器或缓存的小例子。",
      kws: ["词法作用域", "引用", "事件监听", "定时器", "内存", "释放"],
      points: ["闭包 = 函数 + 词法作用域引用", "常见用途：私有变量、柯里化、缓存", "内存泄漏通常来自长期引用", "解决：置空引用、及时解绑"],
      follow: ["闭包和柯里化有什么关系？"]
    },
    {
      id: 4, cat: "前端", type: "场景", diff: "中等", q: "页面首屏加载慢，你会如何定位并优化？",
      tags: ["性能", "优化"],
      ans: "先用 Performance、Lighthouse 或浏览器 Network 面板定位瓶颈，区分网络、解析和渲染问题。常见手段：代码分割与按需加载、资源压缩与 CDN、图片懒加载与 WebP、合理缓存、减少阻塞脚本、SSR/预渲染、优化关键 CSS 路径。回答时建议给出一个定位→量化→优化→验证的闭环。",
      kws: ["Performance", "Lighthouse", "Network", "压缩", "CDN", "懒加载", "缓存", "分割", "SSR"],
      points: ["先量化再优化", "网络层：压缩/CDN/缓存", "资源层：分割/懒加载/预加载", "渲染层：关键路径/SSR"],
      follow: ["什么是 TTI？如何降低？"]
    },
    {
      id: 5, cat: "前端", type: "手撕", diff: "入门", q: "实现一个防抖 debounce 函数。",
      tags: ["JavaScript", "手写"],
      ans: "防抖让函数在连续触发后等待一段时间才执行，适合搜索框输入、窗口 resize。关键是每次调用时清除上一次定时器并重新计时。",
      kws: ["setTimeout", "clearTimeout", "定时器", "立即执行"],
      code: "function debounce(fn, wait, immediate) {\n  let timer = null;\n  return function (...args) {\n    const callNow = immediate && !timer;\n    clearTimeout(timer);\n    timer = setTimeout(() => {\n      timer = null;\n      if (!immediate) fn.apply(this, args);\n    }, wait);\n    if (callNow) fn.apply(this, args);\n  };\n}",
      points: ["每次触发重置定时器", "支持 this 与参数透传", "可选 immediate 立即执行", "对比节流 throttle 的差异"],
      follow: ["防抖和节流的区别？分别在什么场景用？"]
    },
    {
      id: 6, cat: "前端", type: "原理", diff: "中等", q: "JavaScript 事件循环（Event Loop）是如何工作的？",
      tags: ["JavaScript", "异步"],
      ans: "JS 是单线程的，通过事件循环调度任务。宏任务如 script、setTimeout、setInterval，微任务如 Promise.then、queueMicrotask；每轮循环先执行一个宏任务，再清空微任务队列，之后进入渲染阶段。await 之后的代码属于微任务，因此 promise.then 会先于 setTimeout 执行。",
      kws: ["单线程", "宏任务", "微任务", "Promise", "setTimeout", "渲染", "队列"],
      points: ["区分宏任务和微任务", "每轮宏任务后清空微任务", "Node 与浏览器的事件循环有差异"],
      follow: ["下面代码的输出顺序是什么？console.log(1); setTimeout(...); Promise.resolve().then(...)"]
    },
    {
      id: 7, cat: "后端", type: "原理", diff: "入门", q: "HTTP 和 HTTPS 的区别？HTTPS 的握手过程是怎样的？",
      tags: ["网络", "安全"],
      ans: "HTTPS 在 HTTP 上增加 TLS/SSL 加密层，解决明文传输、内容被篡改、身份伪造三个问题。TLS 握手大致为：客户端发送支持的加密套件与随机数；服务端返回证书与随机数；客户端验证证书并生成预主密钥；双方通过非对称加密交换密钥，之后使用对称密钥加密业务数据。",
      kws: ["TLS", "证书", "加密", "非对称", "对称", "随机数", "握手"],
      points: ["HTTPS = HTTP + TLS", "证书用于身份验证", "非对称交换密钥，对称加密数据", "补充：HTTP/2 与 HTTPS 关系"],
      follow: ["TLS 1.2 与 1.3 的差异？"]
    },
    {
      id: 8, cat: "后端", type: "原理", diff: "中等", q: "数据库索引为什么常用 B+ 树而不是哈希或二叉树？",
      tags: ["数据库", "索引"],
      ans: "B+ 树是多路平衡搜索树，非叶子节点只存键不存数据，单节点能容纳更多键，树高更低；叶子节点通过链表相连，适合范围查询和顺序扫描。哈希索引只能等值查询，二叉树树高随数据量增长，磁盘 IO 更多。B+ 树在等值与范围查询、磁盘友好、稳定 IO 之间取得平衡。",
      kws: ["多路", "树高", "叶子", "链表", "范围查询", "磁盘", "IO"],
      points: ["B+ 树矮且宽，减少磁盘 IO", "叶子链表支持范围扫描", "哈希不支持范围，二叉树太高"],
      follow: ["聚簇索引与非聚簇索引的区别？"]
    },
    {
      id: 9, cat: "后端", type: "概念", diff: "中等", q: "事务的 ACID 是什么？数据库的隔离级别有哪些？",
      tags: ["数据库", "事务"],
      ans: "ACID 指原子性、一致性、隔离性、持久性。隔离级别从低到高：读未提交、读已提交、可重复读、串行化。低隔离级别有脏读、不可重复读、幻读问题；MySQL 默认可重复读，通过 MVCC 和间隙锁解决部分问题。回答时建议把四个级别与三个异常一一对应。",
      kws: ["原子性", "一致性", "隔离性", "持久性", "脏读", "不可重复读", "幻读", "MVCC", "间隙锁"],
      points: ["四个特性的含义", "四个隔离级别", "三类并发异常对应关系", "MySQL 默认可重复读"],
      follow: ["MVCC 是怎么实现的？"]
    },
    {
      id: 10, cat: "后端", type: "概念", diff: "进阶", q: "什么是微服务？服务之间如何通信？有哪些常见治理手段？",
      tags: ["架构", "微服务"],
      ans: "微服务把单体拆分为独立部署、独立扩展的小服务，每个服务拥有自己的数据与边界。通信方式包括同步的 HTTP/RPC（如 gRPC、Dubbo）和异步消息（Kafka、RabbitMQ）。治理手段包括注册发现、配置中心、网关路由、熔断限流、链路追踪和容器化编排。回答时建议结合拆分原则与带来的复杂度。",
      kws: ["拆分", "gRPC", "HTTP", "消息", "注册", "网关", "熔断", "限流", "链路追踪"],
      points: ["微服务的收益与代价", "同步/异步通信对比", "注册发现与网关", "可观测性与故障治理"],
      follow: ["如何评估一个服务该不该拆？"]
    },
    {
      id: 11, cat: "后端", type: "设计", diff: "中等", q: "设计一个短链接服务，你会怎么做？",
      tags: ["系统设计", "高并发"],
      ans: "核心是长链接转短码并支持 302 跳转。短码用自增 ID 加 Base62 编码或哈希加碰撞处理生成；存储用 Redis 缓存热点、DB 持久化；读多写少，可用缓存加布隆过滤器防穿透；统计点击量用异步消息。需要明确跳转是否区分平台、有效期、自定义短链等需求。",
      kws: ["Base62", "哈希", "Redis", "缓存", "302", "布隆", "持久化", "统计"],
      points: ["先定需求和量级", "短码生成策略", "缓存与存储分层", "跳转与统计闭环"],
      follow: ["短码如何防止枚举？"]
    },
    {
      id: 12, cat: "后端", type: "手撕", diff: "进阶", q: "实现一个 LRU 缓存。",
      tags: ["数据结构", "手写"],
      ans: "LRU 需要 O(1) 的 get 和 put，用哈希表记录 key 到节点的映射，双向链表维护访问顺序。访问时把节点移到头部，容量满时淘汰尾部节点。",
      kws: ["哈希表", "双向链表", "O(1)", "淘汰", "头部", "尾部"],
      code: "class LRUCache {\n  constructor(cap) {\n    this.cap = cap;\n    this.map = new Map();\n  }\n  get(key) {\n    if (!this.map.has(key)) return -1;\n    const val = this.map.get(key);\n    this.map.delete(key);\n    this.map.set(key, val);\n    return val;\n  }\n  put(key, val) {\n    if (this.map.has(key)) this.map.delete(key);\n    this.map.set(key, val);\n    if (this.map.size > this.cap) {\n      this.map.delete(this.map.keys().next().value);\n    }\n  }\n}",
      points: ["Map 的插入序天然支持 LRU", "get 时刷新顺序", "容量满删除最旧项", "面试可再写双链表版本"],
      follow: ["如果是 LFU 呢？"]
    },
    {
      id: 13, cat: "算法", type: "手撕", diff: "入门", q: "两数之和：给定数组和目标值，找出和为目标的两个下标。",
      tags: ["哈希表", "数组"],
      ans: "用哈希表记录已经出现过的值和下标，遍历时检查 target - num 是否已存在，时间 O(n)、空间 O(n)。注意返回下标而不是值。",
      kws: ["哈希表", "target", "下标", "O(n)"],
      code: "function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const rest = target - nums[i];\n    if (seen.has(rest)) return [seen.get(rest), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}",
      points: ["先问是否有序、能否用空间换时间", "哈希表解法 O(n)", "排序+双指针是另一种思路"],
      follow: ["如果要求不能重复使用同一元素呢？"]
    },
    {
      id: 14, cat: "算法", type: "手撕", diff: "入门", q: "反转单链表。",
      tags: ["链表"],
      ans: "迭代法维护 prev、cur、next 三个指针逐个反转；也可以递归。重点是把当前节点指向前驱，再移动指针。",
      kws: ["链表", "指针", "prev", "递归"],
      code: "function reverseList(head) {\n  let prev = null, cur = head;\n  while (cur) {\n    const next = cur.next;\n    cur.next = prev;\n    prev = cur;\n    cur = next;\n  }\n  return prev;\n}",
      points: ["画图辅助推导", "注意先保存 next", "递归写法等价于栈"],
      follow: ["反转链表的前 N 个节点呢？"]
    },
    {
      id: 15, cat: "算法", type: "手撕", diff: "中等", q: "最长无重复字符子串的长度。",
      tags: ["滑动窗口"],
      ans: "滑动窗口加哈希集合：右指针扩展并维护窗口内无重复，遇到重复时移动左指针收缩。时间复杂度 O(n)，空间 O(min(n, 字符集))。",
      kws: ["滑动窗口", "哈希", "左右指针", "O(n)"],
      code: "function lengthOfLongestSubstring(s) {\n  let left = 0, max = 0;\n  const set = new Set();\n  for (let right = 0; right < s.length; right++) {\n    while (set.has(s[right])) {\n      set.delete(s[left++]);\n    }\n    set.add(s[right]);\n    max = Math.max(max, right - left + 1);\n  }\n  return max;\n}",
      points: ["窗口合法性由集合保证", "右进左出", "答案通常是 max 窗口长度"],
      follow: ["如果要输出子串本身呢？"]
    },
    {
      id: 16, cat: "算法", type: "手撕", diff: "入门", q: "判断字符串是否为回文（忽略空格与大小写）。",
      tags: ["字符串", "双指针"],
      ans: "清洗字符串后使用双指针从两端向中间比较，遇到不相等直接返回 false。也可以直接反转比较，但双指针更省空间。",
      kws: ["双指针", "反转", "比较", "忽略"],
      code: "function isPalindrome(s) {\n  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');\n  let l = 0, r = clean.length - 1;\n  while (l < r) {\n    if (clean[l] !== clean[r]) return false;\n    l++; r--;\n  }\n  return true;\n}",
      points: ["确认是否忽略大小写和非字母数字", "双指针 O(n) O(1)", "边界：空串视为回文"],
      follow: ["如果字符串很长，怎么优化？"]
    },
    {
      id: 17, cat: "算法", type: "手撕", diff: "入门", q: "爬楼梯：每次可以爬 1 或 2 阶，到达 n 阶有多少种方法？",
      tags: ["动态规划"],
      ans: "dp[i] = dp[i-1] + dp[i-2]，即斐波那契数列。可以用滚动变量把空间压到 O(1)。",
      kws: ["dp", "斐波那契", "滚动", "状态转移"],
      code: "function climbStairs(n) {\n  let a = 1, b = 2;\n  for (let i = 3; i <= n; i++) {\n    const c = a + b;\n    a = b; b = c;\n  }\n  return n <= 2 ? n : b;\n}",
      points: ["先写状态定义与转移方程", "注意 n=1、n=2 边界", "可以滚动数组降空间"],
      follow: ["如果每次可爬 1/2/3 阶呢？"]
    },
    {
      id: 18, cat: "算法", type: "手撕", diff: "中等", q: "二叉树的层序遍历。",
      tags: ["二叉树", "BFS"],
      ans: "用队列做 BFS，每一轮取出当前层的全部节点，记录值后把下一层节点入队，从而得到按层分组的结果。",
      kws: ["队列", "BFS", "层", "分组"],
      code: "function levelOrder(root) {\n  if (!root) return [];\n  const res = [], queue = [root];\n  while (queue.length) {\n    const size = queue.length, level = [];\n    for (let i = 0; i < size; i++) {\n      const node = queue.shift();\n      level.push(node.val);\n      if (node.left) queue.push(node.left);\n      if (node.right) queue.push(node.right);\n    }\n    res.push(level);\n  }\n  return res;\n}",
      points: ["size 固定当前层", "队列 FIFO", "DFS 加 depth 也可实现"],
      follow: ["之字形层序遍历怎么做？"]
    },
    {
      id: 19, cat: "算法", type: "算法", diff: "中等", q: "说说常见排序算法的复杂度，并手写快速排序。",
      tags: ["排序"],
      ans: "快排平均 O(n log n)，最坏 O(n^2)；归并稳定且稳定 O(n log n)；堆排 O(n log n) 但不稳定。手写快排要点：选基准、分区、递归左右两侧。",
      kws: ["快排", "基准", "分区", "O(n log n)", "稳定"],
      code: "function quickSort(arr) {\n  if (arr.length <= 1) return arr;\n  const pivot = arr[arr.length - 1];\n  const left = [], right = [];\n  for (let i = 0; i < arr.length - 1; i++) {\n    arr[i] < pivot ? left.push(arr[i]) : right.push(arr[i]);\n  }\n  return [...quickSort(left), pivot, ...quickSort(right)];\n}",
      points: ["能说出各算法复杂度", "原地分区与额外空间版本", "稳定性与工程实现差异"],
      follow: ["为什么工程排序一般不用纯快排？"]
    },
    {
      id: 20, cat: "算法", type: "概念", diff: "进阶", q: "动态规划的本质是什么？什么时候该用 DP？",
      tags: ["动态规划"],
      ans: "DP 是把大问题分解为重叠子问题，用状态转移方程记录子问题答案避免重复计算，本质是带记忆化的状态转移。适用条件：最优子结构和重叠子问题。思考路径：定义状态 → 转移方程 → 初始化 → 遍历顺序 → 边界。",
      kws: ["重叠子问题", "最优子结构", "状态", "转移方程", "记忆化"],
      points: ["两个适用条件", "五步思考法", "与贪心/分治的区分", "空间优化方向"],
      follow: ["背包问题为什么能/不能用贪心？"]
    },
    {
      id: 21, cat: "系统设计", type: "设计", diff: "进阶", q: "如何设计一个秒杀系统？",
      tags: ["高并发", "架构"],
      ans: "秒杀的关键是限流与削峰，把压力挡在入口。方案：静态资源走 CDN；用户点击后先过验证码/答题/令牌桶限流；库存预扣减用 Redis 原子操作+Lua；下单写消息队列异步落库；数据库扣库存用乐观锁或条件更新防止超卖；最后异步生成订单。还要考虑防刷、幂等和降级。",
      kws: ["限流", "CDN", "Redis", "Lua", "消息队列", "乐观锁", "超卖", "幂等", "降级"],
      points: ["先压测明确峰值", "分层削峰：网关/缓存/队列", "原子扣减防超卖", "异步化与最终一致性"],
      follow: ["如果秒杀瞬间流量超过服务器上限怎么办？"]
    },
    {
      id: 22, cat: "系统设计", type: "设计", diff: "进阶", q: "高并发下缓存穿透、击穿、雪崩分别是什么？怎么解决？",
      tags: ["缓存", "高并发"],
      ans: "穿透是查询不存在的 key 打到 DB，可用布隆过滤器或缓存空值；击穿是热点 key 过期瞬间大量请求打到 DB，可用互斥锁或逻辑过期；雪崩是大批 key 同时失效，可把过期时间加随机值、多级缓存、熔断限流。",
      kws: ["布隆", "空值", "互斥锁", "逻辑过期", "随机", "多级缓存", "熔断"],
      points: ["三个问题的成因", "各自的标准解法", "从缓存层和存储层双保险"],
      follow: ["如何预热热点 key？"]
    },
    {
      id: 23, cat: "系统设计", type: "设计", diff: "中等", q: "分布式场景下如何保证接口幂等？",
      tags: ["分布式", "幂等"],
      ans: "幂等的核心是业务上保证重复请求结果一致。常用手段：客户端生成全局唯一请求号；服务端用 Redis SETNX 或数据库唯一键做去重；支付/扣款类用状态机保证只能流转一次；写操作加乐观锁版本号。",
      kws: ["请求号", "SETNX", "唯一键", "状态机", "版本号", "去重"],
      points: ["明确幂等与防重的区别", "先记录再处理", "异常后的补偿与查询"],
      follow: ["消息队列重复消费怎么处理？"]
    },
    {
      id: 24, cat: "系统设计", type: "设计", diff: "中等", q: "设计一个日活百万的消息推送服务，需要考虑什么？",
      tags: ["架构", "消息"],
      ans: "需要拆分接入层、路由层、下发层。设备连接用长连接网关集群，按用户路由到对应连接；消息先入队，消费端按设备批量下发；离线用户存待推送表，App 启动后拉取；还要做消息去重、失败重试、限流与监控。",
      kws: ["长连接", "网关", "路由", "消息队列", "离线", "重试", "监控"],
      points: ["先定义 QPS 与延迟目标", "网关无状态可水平扩展", "离线消息与在线消息分路径", "可观测性要覆盖连接数/成功率"],
      follow: ["如何做消息回执与补偿？"]
    },
    {
      id: 25, cat: "行为", type: "场景", diff: "入门", q: "请介绍一下你自己。",
      tags: ["自我介绍", "开场"],
      ans: "建议 1 分钟三段式：我是谁（背景与当前状态）→ 我做过什么（与岗位相关的 1-2 个亮点）→ 我为什么适合这个岗位（能力+动机）。避免背诵简历，要突出与目标岗位的匹配。",
      kws: ["背景", "亮点", "匹配", "动机", "岗位"],
      points: ["时间控制在 1 分钟左右", "用 STAR 提炼经历亮点", "结尾引向岗位匹配", "不要复述简历全文"],
      follow: ["如果用三个词形容自己，你会选什么？"]
    },
    {
      id: 26, cat: "行为", type: "场景", diff: "中等", q: "为什么想离开现在的公司 / 为什么看新的机会？",
      tags: ["离职原因", "动机"],
      ans: "回答原则：不贬低前东家，从成长空间、技术方向、业务阶段等客观角度讲动机，并把动机引向目标公司。例如：希望从业务驱动转向技术深度、希望接触更大规模的数据挑战。避免说薪资低、加班多、和同事关系差。",
      kws: ["成长", "方向", "挑战", "匹配", "客观"],
      points: ["负面归因转正面诉求", "结合目标公司优势", "避免抱怨和情绪化表达", "给出可验证的下一步"],
      follow: ["如果面试官追问具体不满，怎么回答？"]
    },
    {
      id: 27, cat: "行为", type: "场景", diff: "中等", q: "你最大的优点和缺点分别是什么？",
      tags: ["自我认知"],
      ans: "优点要具体且有例子支撑，最好与岗位能力相关；缺点要真实但不致命，并给出正在改进的方法。例如：优点是复盘意识强，上线事故后会做根因梳理；缺点是公开表达偏慢，现在通过每周例会主动发言练习。",
      kws: ["例子", "真实", "改进", "方法", "岗位"],
      points: ["优点给证据", "缺点给改进路径", "避免说完美主义等套话"],
      follow: ["你觉得你上一任老板会怎么评价你？"]
    },
    {
      id: 28, cat: "行为", type: "场景", diff: "中等", q: "讲一个你最有成就感的项目（建议用 STAR）。",
      tags: ["STAR", "项目经历"],
      ans: "用 STAR 组织：情境（背景与目标）→ 任务（你的职责）→ 行动（具体做了哪些关键动作）→ 结果（量化成果与复盘）。建议选择能体现技术深度或业务影响力的项目，并准备 1-2 个可追问的细节。",
      kws: ["情境", "任务", "行动", "结果", "量化", "复盘"],
      points: ["结构化叙事", "突出个人贡献而非团队功劳", "结果尽量量化", "预留可深挖的技术细节"],
      follow: ["这个项目里遇到的最大技术难点是什么？"]
    },
    {
      id: 29, cat: "行为", type: "场景", diff: "中等", q: "和同事产生分歧或冲突时，你会怎么处理？",
      tags: ["协作", "冲突"],
      ans: "先对齐事实和目标，避免上升到人身评价；主动倾听对方诉求，把分歧定义成问题而不是立场；给出可验证的方案或实验，必要时请上级/第三方仲裁。强调对事不对人、以结果为导向。",
      kws: ["倾听", "事实", "目标", "方案", "对事不对人", "协作"],
      points: ["先情绪后问题", "用数据或实验验证分歧", "维护长期协作关系"],
      follow: ["如果对方拒绝沟通怎么办？"]
    },
    {
      id: 30, cat: "行为", type: "场景", diff: "入门", q: "你的职业规划是什么？",
      tags: ["规划", "稳定性"],
      ans: "把规划分成短期（1 年：胜任岗位、沉淀核心技能）和中期（3 年：独当一面、带项目或带人）两个层次，并把规划与目标公司和岗位结合起来，体现稳定性与上进心。避免只说升职加薪。",
      kws: ["短期", "中期", "技能", "岗位", "目标"],
      points: ["规划要贴合岗位成长路径", "展示学习计划更可信", "避免空泛和过度承诺"],
      follow: ["如果这个岗位三年都不晋升，你会怎么办？"]
    },
    {
      id: 31, cat: "行为", type: "场景", diff: "中等", q: "为什么选择我们公司？",
      tags: ["动机", "公司研究"],
      ans: "从三个层面回答：业务层面（产品或行业吸引你）、团队与技术层面（技术栈、规模、挑战匹配）、个人层面（长期发展与价值观契合）。提前研究官网、公开产品与近期新闻，引用具体信息更有说服力。",
      kws: ["业务", "产品", "技术栈", "价值观", "匹配"],
      points: ["体现做过功课", "把公司优势与个人需求结合", "避免只谈薪资或离家近"],
      follow: ["你还面了哪些公司？怎么选？"]
    },
    {
      id: 32, cat: "行为", type: "场景", diff: "中等", q: "多个任务同时要交付，你会怎么安排优先级？",
      tags: ["时间管理", "优先级"],
      ans: "先确认每个任务的截止时间、影响面和负责人；用重要性/紧急性矩阵排序，明确哪些可以并行、哪些需要同步依赖方；对确实做不完的任务及时暴露风险，主动协商调整范围，而不是闷头硬扛。",
      kws: ["优先级", "截止", "影响", "同步", "风险", "范围"],
      points: ["先对齐再执行", "及时暴露风险", "给出可执行的取舍方案"],
      follow: ["如果两个老板都说是最高优先级呢？"]
    },
    {
      id: 33, cat: "行为", type: "场景", diff: "进阶", q: "讲一次你失败或搞砸的经历，你是怎么应对的？",
      tags: ["抗压", "复盘"],
      ans: "选择一次真实的失败但可控的经历，重点是复盘闭环：发生了什么、你的责任在哪、采取了什么补救、沉淀了什么机制避免重犯。展示成长与抗压能力，避免推卸责任或显得毫无影响。",
      kws: ["失败", "责任", "补救", "复盘", "机制", "成长"],
      points: ["失败要有细节", "主动认领责任", "补救行动要具体", "沉淀机制说明成长"],
      follow: ["这件事如果重来一次，你会怎么做？"]
    },
    {
      id: 34, cat: "行为", type: "场景", diff: "进阶", q: "被问到期望薪资时，你会怎么回答？",
      tags: ["薪资谈判"],
      ans: "先表达对岗位的兴趣，再给一个基于市场行情的范围而不是固定数字；可以参考城市、职级、薪资结构（月薪*月份、股票、补贴）综合计算。对方问底价时，可以把问题抛回：希望先了解岗位薪资带宽与结构。回答要有底气但不僵化。",
      kws: ["范围", "市场", "薪资结构", "带宽", "综合"],
      points: ["给范围优于给单点", "按总包而非月薪比较", "先了解再报价", "留出谈判弹性"],
      follow: ["对方给的 offer 低于期望，怎么争取？"]
    },
    {
      id: 35, cat: "产品", type: "场景", diff: "中等", q: "如果某头部 App 的日活跃用户数下降 5%，你会怎么分析？",
      tags: ["数据分析", "问题定位"],
      ans: "先确认口径：是统计口径变化还是真实下降，下降发生在哪个时间段、平台、版本、城市和用户分层；再拆解漏斗：新增、留存、召回哪一环出问题；结合版本发布、竞品动作、内容事件等找原因；最后给出假设验证与恢复方案。",
      kws: ["口径", "分层", "漏斗", "新增", "留存", "版本", "竞品", "假设"],
      points: ["先验证数据口径", "维度下钻定位波动范围", "用漏斗拆解业务环节", "外部事件与内部变更交叉验证"],
      follow: ["怎么判断这次下降是季节性波动？"]
    },
    {
      id: 36, cat: "产品", type: "设计", diff: "中等", q: "设计一个面向应届生的求职产品，你会怎么做？",
      tags: ["产品设计"],
      ans: "目标用户是信息不对称、经验不足的应届生，核心痛点是不知道有哪些机会、不会准备面试、投递后无反馈。方案：校招日历与信息聚合（解决信息）、简历与模拟面试训练（解决能力）、投递进度管理（解决掌控感）。MVP 可以先做信息聚合加投递跟踪，验证使用频次后再加 AI 训练。",
      kws: ["痛点", "信息", "训练", "进度", "MVP"],
      points: ["先定义用户与核心痛点", "按信息/能力/管理拆解方案", "MVP 聚焦一个闭环", "给出衡量指标"],
      follow: ["这类产品最大的留存风险是什么？"]
    },
    {
      id: 37, cat: "产品", type: "场景", diff: "进阶", q: "如何评估一个功能上线后的效果？",
      tags: ["指标", "AB测试"],
      ans: "上线前明确功能目标和北极星指标，拆出过程指标与结果指标；通过 AB 实验或分流对比，控制时间与样本量，排除新奇效应；上线后看留存、使用深度、核心转化与负面指标（如投诉、卸载），并结合用户反馈迭代。",
      kws: ["北极星", "指标", "AB", "样本", "留存", "转化", "负面"],
      points: ["指标先于功能定义", "AB 实验的统计严谨性", "结果指标与护栏指标并看", "用户反馈辅助归因"],
      follow: ["实验结论不显著时怎么决策？"]
    },
    {
      id: 38, cat: "英语", type: "场景", diff: "入门", q: "Introduce yourself and your background.",
      tags: ["English", "自我介绍"],
      ans: "Keep it to 60-90 seconds: who you are, one or two relevant achievements with numbers, and why you are interested in this role. Use simple, confident English and avoid memorized long paragraphs.",
      kws: ["achievements", "relevant", "role", "background", "confident"],
      points: ["Structure: background, highlights, motivation", "Quantify achievements", "Match skills to the role", "Practice tone and pacing"],
      follow: ["Can you describe your current role in one sentence?"]
    },
    {
      id: 39, cat: "英语", type: "场景", diff: "中等", q: "Tell me about a challenge you overcame at work.",
      tags: ["English", "behavioral"],
      ans: "Use STAR: describe the situation, your task, the specific actions you took, and the measurable result. Keep the story concise and focus on your contribution, then explain what you learned.",
      kws: ["situation", "task", "action", "result", "learned", "challenge"],
      points: ["Follow STAR structure", "Stay specific with numbers", "Show ownership", "End with a lesson"],
      follow: ["What would you do differently next time?"]
    },
    {
      id: 40, cat: "英语", type: "场景", diff: "入门", q: "Why should we hire you?",
      tags: ["English", "motivation"],
      ans: "Summarize your strongest match: relevant skills, proof from past projects, and motivation for the company. Frame it as what you can deliver in the first few months rather than what the job gives you.",
      kws: ["skills", "projects", "motivation", "deliver", "company"],
      points: ["Lead with the strongest match", "Give proof, not adjectives", "Connect to the company's needs", "Close with confidence"],
      follow: ["What would your first 90 days look like?"]
    }
  ];

  function splitList(v) {
    return Array.isArray(v) ? v : String(v || "").split("/").map(s => s.trim()).filter(Boolean);
  }

  const EXTRA_DETAIL = Object.assign({}, window.BankDetail || {}, window.BankDetail2 || {}, window.BankDetail3 || {});
  const EXTRA_QUESTIONS = (window.BankExtra || []).concat(window.BankExtra2 || [], window.BankExtra3 || [], window.BankExtra4 || []).map((e, i) => {
    const id = 1000 + i;
    const detail = EXTRA_DETAIL[id] || "";
    return {
      id,
      cat: e[0], type: e[1], diff: e[2], q: e[3], ans: e[4], detail,
      tags: splitList(e[5]), kws: splitList(e[6]), points: splitList(e[7]), follow: splitList(e[8])
    };
  });

  const ALL_QUESTIONS = Q.concat(EXTRA_QUESTIONS);

  const RESOURCES = {
    campus: [
      { id: "c1", company: "微纳核芯", batch: "秋招", date: "2026-08-07", roles: "存算一体(CIM)、SRAM/DRAM 设计、AI 芯片架构、NPU/SoC 设计、编译器、AI 算法、大模型推理可靠性", cities: "杭州 上海 北京 深圳 苏州", note: "芯片设计为主，岗位类别多；官网待补充", link: "" },
      { id: "c2", company: "航天控制", batch: "秋招提前批", date: "2026-08", roles: "控制类、电子类、软件类、机械类、管理类", cities: "贵州贵阳", note: "军工航天方向；官网待补充", link: "" },
      { id: "c3", company: "英飞凌", batch: "秋招", date: "2026-08", roles: "Staff FAE、合作伙伴管理、国际管培生", cities: "上海 无锡 宁波 深圳 西安", note: "外企半导体", link: "https://careers.infineon.com" },
      { id: "c4", company: "迈塔兰斯", batch: "秋招", date: "2026-08", roles: "光子计算、超表面设计、光学设计/结构/工艺、材料制备、产品研发", cities: "深圳 湖州", note: "光学与光子计算", link: "https://www.meta-lens.com" },
      { id: "c5", company: "基康技术", batch: "秋招", date: "2026-08", roles: "水利水电、桥隧、机械、嵌入式、销售工程师", cities: "北京 武汉 成都 西安 广州", note: "工程检测技术；官网待补充", link: "" },
      { id: "c6", company: "瀚亚投资", batch: "实习", date: "2026-08", roles: "分销部实习生", cities: "上海", note: "金融资管", link: "https://www.eastspring.com.cn" },
      { id: "c7", company: "思格新能源", batch: "秋招", date: "2026-08", roles: "技术研发、职能支持、智能制造、供应链、销售与服务、市场营销", cities: "上海 南通 珠海", note: "新能源方向", link: "https://www.sigenergy.com" },
      { id: "c8", company: "腾讯", batch: "秋招", date: "2026-08", roles: "技术、产品、设计、职能类", cities: "深圳 北京 上海 成都", note: "演示数据", link: "https://careers.tencent.com" },
      { id: "c9", company: "字节跳动", batch: "秋招提前批", date: "2026-08", roles: "研发、算法、产品", cities: "北京 上海 杭州", note: "演示数据", link: "https://jobs.bytedance.com" },
      { id: "c10", company: "华为", batch: "秋招", date: "2026-08", roles: "研发、销售、供应链", cities: "深圳 东莞 南京", note: "演示数据", link: "https://career.huawei.com" },
      { id: "c11", company: "美团", batch: "秋招", date: "2026-08", roles: "技术、产品、运营", cities: "北京 上海", note: "演示数据", link: "https://zhaopin.meituan.com" },
      { id: "c12", company: "小米", batch: "秋招", date: "2026-08", roles: "软硬件研发、运营", cities: "北京 南京 武汉", note: "演示数据", link: "https://hr.xiaomi.com" }
    ],
    intern: [
      { id: "i1", company: "瀚亚投资", role: "分销部实习生", cities: "上海", date: "2026-08", tags: "金融", link: "https://www.eastspring.com.cn" },
      { id: "i2", company: "湖南省第十五届运动会开幕式", role: "制片后勤组、演员管理组、现场执行组", cities: "湖南益阳", date: "2026-08", tags: "大型活动", link: "" },
      { id: "i3", company: "腾讯", role: "产品运营实习生", cities: "深圳", date: "2026-08", tags: "互联网", link: "https://careers.tencent.com" },
      { id: "i4", company: "字节跳动", role: "前端开发实习生", cities: "北京", date: "2026-08", tags: "互联网", link: "https://jobs.bytedance.com" },
      { id: "i5", company: "蚂蚁集团", role: "算法实习生", cities: "杭州", date: "2026-08", tags: "金融科技", link: "https://talent.antgroup.com" },
      { id: "i6", company: "蔚来", role: "车辆工程实习生", cities: "上海", date: "2026-08", tags: "新能源", link: "https://nio.jobs.feishu.cn" },
      { id: "i7", company: "网易", role: "数据分析实习生", cities: "北京", date: "2026-08", tags: "互联网", link: "https://hr.163.com" },
      { id: "i8", company: "小红书", role: "内容运营实习生", cities: "上海", date: "2026-08", tags: "互联网", link: "https://job.xiaohongshu.com" }
    ],
    state: [
      { id: "s1", company: "国家电网", batch: "一批次", date: "2026-11", roles: "电工类、计算机类、财会类", cities: "全国", link: "https://zhaopin.sgcc.com.cn" },
      { id: "s2", company: "中国移动", batch: "秋招", date: "2026-10", roles: "通信、技术、市场类", cities: "全国", link: "https://job.10086.cn" },
      { id: "s3", company: "中国银行", batch: "秋招", date: "2026-09", roles: "金融科技、综合类", cities: "全国", link: "https://www.boc.cn" },
      { id: "s4", company: "中国船舶集团", batch: "校招", date: "2026-10", roles: "船舶、机械、电气类", cities: "上海 大连", link: "https://www.cssc.net.cn" },
      { id: "s5", company: "中石化", batch: "秋招", date: "2026-10", roles: "石油化工、信息化类", cities: "全国", link: "https://job.sinopec.com" },
      { id: "s6", company: "中国电信", batch: "秋招", date: "2026-09", roles: "云计算、大数据、研发类", cities: "全国", link: "https://job.chinatelecom.com.cn" },
      { id: "s7", company: "中国烟草", batch: "招聘", date: "2026-11", roles: "综合、技术类", cities: "各省", link: "https://www.tobacco.gov.cn" },
      { id: "s8", company: "航天科技集团", batch: "秋招", date: "2026-09", roles: "航天、电子、软件类", cities: "北京 上海 西安", link: "https://www.spacechina.com" }
    ]
  };

  const SOLVER_DB = [
    {
      key: "two", title: "两数之和", type: "编程", tags: ["哈希表"],
      hint: "把已经遍历过的值放进哈希表，查找 target - num。",
      approach: "遍历数组，用哈希表记录值和下标；对每个数检查 target - num 是否存在。存在则返回两个下标。",
      code: "function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}",
      complexity: "时间 O(n)，空间 O(n)"
    },
    {
      key: "reverse", title: "反转链表", type: "编程", tags: ["链表"],
      hint: "三指针 prev/cur/next 逐个反转。",
      approach: "从 head 开始，用 next 保存后继，把当前节点的 next 指向前驱，然后三个指针整体后移。",
      code: "function reverseList(head) {\n  let prev = null, cur = head;\n  while (cur) {\n    const next = cur.next;\n    cur.next = prev;\n    prev = cur;\n    cur = next;\n  }\n  return prev;\n}",
      complexity: "时间 O(n)，空间 O(1)"
    },
    {
      key: "substring", title: "最长无重复子串", type: "编程", tags: ["滑动窗口"],
      hint: "右指针扩展，遇到重复时左指针收缩。",
      approach: "滑动窗口 + 哈希集合。右指针逐个加入，窗口内出现重复则移动左指针直到无重复，实时更新最大长度。",
      code: "function lengthOfLongestSubstring(s) {\n  let l = 0, ans = 0;\n  const set = new Set();\n  for (let r = 0; r < s.length; r++) {\n    while (set.has(s[r])) set.delete(s[l++]);\n    set.add(s[r]);\n    ans = Math.max(ans, r - l + 1);\n  }\n  return ans;\n}",
      complexity: "时间 O(n)，空间 O(min(n, 字符集))"
    },
    {
      key: "palindrome", title: "回文串判断", type: "编程", tags: ["双指针"],
      hint: "清洗后两端指针向中间比较。",
      approach: "先去除空格和非字母数字并统一大小写，再用左右指针比较字符是否相等。",
      code: "function isPalindrome(s) {\n  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');\n  let l = 0, r = clean.length - 1;\n  while (l < r) if (clean[l++] !== clean[r--]) return false;\n  return true;\n}",
      complexity: "时间 O(n)，空间 O(n)（清洗副本）"
    },
    {
      key: "stairs", title: "爬楼梯", type: "编程", tags: ["动态规划"],
      hint: "dp[i] = dp[i-1] + dp[i-2]。",
      approach: "状态转移即斐波那契数列，使用两个滚动变量从 3 迭代到 n。",
      code: "function climbStairs(n) {\n  if (n <= 2) return n;\n  let a = 1, b = 2;\n  for (let i = 3; i <= n; i++) [a, b] = [b, a + b];\n  return b;\n}",
      complexity: "时间 O(n)，空间 O(1)"
    },
    {
      key: "brackets", title: "有效括号", type: "编程", tags: ["栈"],
      hint: "左括号入栈，右括号与栈顶匹配。",
      approach: "遍历字符串，左括号压栈；右括号检查栈顶是否配对，不配对直接 false；结束时栈必须为空。",
      code: "function isValid(s) {\n  const map = { ')': '(', ']': '[', '}': '{' };\n  const stack = [];\n  for (const c of s) {\n    if (c in map) {\n      if (stack.pop() !== map[c]) return false;\n    } else stack.push(c);\n  }\n  return stack.length === 0;\n}",
      complexity: "时间 O(n)，空间 O(n)"
    },
    {
      key: "lru", title: "LRU 缓存", type: "编程", tags: ["设计"],
      hint: "哈希表 + 有序结构，get/put 都刷新顺序。",
      approach: "用 Map 记录插入顺序，get 时先删后插刷新顺序，put 时容量满则删除最旧键。",
      code: "class LRUCache {\n  constructor(cap) { this.cap = cap; this.map = new Map(); }\n  get(k) {\n    if (!this.map.has(k)) return -1;\n    const v = this.map.get(k);\n    this.map.delete(k); this.map.set(k, v);\n    return v;\n  }\n  put(k, v) {\n    if (this.map.has(k)) this.map.delete(k);\n    this.map.set(k, v);\n    if (this.map.size > this.cap) this.map.delete(this.map.keys().next().value);\n  }\n}",
      complexity: "get/put 均为 O(1)"
    },
    {
      key: "stock", title: "买卖股票的最佳时机", type: "编程", tags: ["动态规划"],
      hint: "记录历史最低价，更新最大利润。",
      approach: "一次遍历：维护当前之前的最低买入价，用当天价格减最低价更新最大利润。",
      code: "function maxProfit(prices) {\n  let min = Infinity, profit = 0;\n  for (const p of prices) {\n    min = Math.min(min, p);\n    profit = Math.max(profit, p - min);\n  }\n  return profit;\n}",
      complexity: "时间 O(n)，空间 O(1)"
    },
    {
      key: "islands", title: "岛屿数量", type: "编程", tags: ["DFS", "矩阵"],
      hint: "遇到 1 就 DFS 淹没整个岛。",
      approach: "遍历网格，遇到陆地时计数加一，并用 DFS/BFS 把所有相邻陆地标记为 0。",
      code: "function numIslands(grid) {\n  let count = 0;\n  const dfs = (i, j) => {\n    if (i < 0 || j < 0 || i >= grid.length || j >= grid[0].length || grid[i][j] === '0') return;\n    grid[i][j] = '0';\n    dfs(i + 1, j); dfs(i - 1, j); dfs(i, j + 1); dfs(i, j - 1);\n  };\n  for (let i = 0; i < grid.length; i++)\n    for (let j = 0; j < grid[0].length; j++)\n      if (grid[i][j] === '1') { count++; dfs(i, j); }\n  return count;\n}",
      complexity: "时间 O(mn)，空间 O(mn)（递归栈）"
    },
    {
      key: "coins", title: "零钱兑换", type: "编程", tags: ["动态规划"],
      hint: "dp[amount] = min(dp[amount - coin]) + 1。",
      approach: "dp[i] 表示凑成金额 i 的最少硬币数，初始化为大数；遍历金额与硬币，状态转移后 dp[amount] 若仍为大数则返回 -1。",
      code: "function coinChange(coins, amount) {\n  const dp = Array(amount + 1).fill(Infinity);\n  dp[0] = 0;\n  for (let i = 1; i <= amount; i++)\n    for (const c of coins)\n      if (i >= c) dp[i] = Math.min(dp[i], dp[i - c] + 1);\n  return dp[amount] === Infinity ? -1 : dp[amount];\n}",
      complexity: "时间 O(amount * coins)，空间 O(amount)"
    },
    {
      key: "quicksort", title: "快速排序", type: "编程", tags: ["排序"],
      hint: "选基准，分区，递归。",
      approach: "选取末尾元素为基准，把小于基准的放左边、大于的放右边，递归排序左右。",
      code: "function quickSort(arr) {\n  if (arr.length <= 1) return arr;\n  const p = arr[arr.length - 1], l = [], r = [];\n  for (let i = 0; i < arr.length - 1; i++) arr[i] < p ? l.push(arr[i]) : r.push(arr[i]);\n  return [...quickSort(l), p, ...quickSort(r)];\n}",
      complexity: "平均 O(n log n)，最坏 O(n^2)"
    },
    {
      key: "ai_cs", title: "设计一个 AI 客服产品", type: "产品", tags: ["AI 产品", "客服"],
      hint: "先定义问题边界和转人工规则，再设计知识库、澄清、引用、满意度回收。",
      approach: "1. 明确自动解决的范围（退款政策、物流查询等）和转人工条件（情绪激烈、连续失败）；2. 设计知识库与 RAG 引用溯源；3. 多轮澄清避免答非所问；4. 会话后满意度回收，badcase 回流评测集；5. 定义指标：自动解决率、转人工率、满意度。",
      code: null,
      complexity: "考察点：问题边界、人机协作、评测闭环、成本控制"
    },
    {
      key: "funnel", title: "如何提升注册转化率？", type: "产品", tags: ["转化", "漏斗"],
      hint: "拆漏斗找最大流失环节，再降低门槛、增强信任、做 A/B 验证。",
      approach: "1. 把注册流程拆成曝光、点击、填写、验证、完成五步，看每步流失；2. 找到最大流失点后小步优化（减少字段、第三方登录、明确利益点）；3. 用 A/B 测试验证，一次只改一个变量；4. 同步监控新用户次日留存，避免为转化牺牲质量。",
      code: null,
      complexity: "考察点：漏斗思维、实验设计、指标权衡"
    },
    {
      key: "member", title: "设计一个会员体系", type: "产品", tags: ["会员", "留存"],
      hint: "权益要有真实价值，等级与活跃/消费挂钩，避免权益贬值。",
      approach: "1. 明确目标（提升留存还是客单价）；2. 设计等级与成长路径，权益要可感知（专属内容、折扣、优先服务）；3. 关键节点给即时反馈（差一级升级的进度条）；4. 持续更新权益并监控续费率；5. 用数据验证哪些权益真正驱动升级。",
      code: null,
      complexity: "考察点：用户分层、激励设计、商业闭环"
    },
    {
      key: "fermi", title: "估算北京有多少个加油站？", type: "产品", tags: ["费米", "估算"],
      hint: "用供需或面积法拆解，先给假设再给数量级。",
      approach: "1. 方法一（供需）：北京约 2000 万人口、约 500 万辆汽车，按每辆车每月加油 2 次、每个加油站日均服务 500 辆车估算，约 2000-3000 个；2. 方法二（面积）：北京约 1.6 万平方公里，按每 5-8 平方公里一个加油站估算，约 2000-3000 个；3. 交叉验证数量级，说明假设即可。",
      code: null,
      complexity: "考察点：结构化拆解、假设合理性、数量级意识"
    },
    {
      key: "ai_interview", title: "设计 AI 面试产品的评分维度", type: "产品", tags: ["AI 产品", "面试"],
      hint: "训练场景重反馈，招聘场景重公平和可解释。",
      approach: "1. 分场景定义维度：表达能力、结构逻辑、技术深度、岗位匹配、抗压表现；2. 每个维度给出可操作的评分标准（1-5 分加锚点描述）；3. 训练场景输出逐题反馈和改进建议；4. 招聘场景公开评分依据、保留人工复核与申诉通道；5. 用标注集校验 AI 评分与人工评分的一致性。",
      code: null,
      complexity: "考察点：场景差异、评估体系、公平性与可解释性"
    },
    {
      key: "ai_value", title: "如何验证一个 AI 功能是否有价值？", type: "产品", tags: ["AI 产品", "验证"],
      hint: "先定义价值假设和成功指标，再做最小实验，不直接全量开发。",
      approach: "1. 把价值写成可证伪的假设（例如：用户愿意每周使用 3 次，任务完成率提升 30%）；2. 用最小实验验证：人工模拟、原型、灰度 5% 用户；3. 测量使用率、完成率、回访和付费意愿；4. 达标再扩大，不达标就调整或放弃；5. 把验证结论和 badcase 沉淀成评测集。",
      code: null,
      complexity: "考察点：假设思维、最小实验、指标定义"
    },
    {
      key: "cold_start", title: "设计推荐系统的冷启动方案", type: "产品", tags: ["推荐", "冷启动"],
      hint: "用户无行为时用内容属性、热门榜和轻量引导快速建立兴趣。",
      approach: "1. 用户冷启动：注册时选兴趣标签，用热门榜和编辑精选兜底；2. 物品冷启动：用内容属性（分类、关键词、Embedding 相似）替代点击数据；3. 探索策略：给新内容固定曝光配额，收集反馈；4. 冷启动结束后平滑切换到个性化模型；5. 指标：冷启动期点击率、7 日留存、探索内容占比。",
      code: null,
      complexity: "考察点：探索利用平衡、分层策略、指标闭环"
    },
    {
      key: "pricing", title: "如何给 AI 功能定价？", type: "产品", tags: ["AI 产品", "定价"],
      hint: "先算成本毛利，再看用户价值和竞品价格，用分层定价测试。",
      approach: "1. 算清单次调用成本（Token + 检索 + 审核）和毛利目标；2. 调研用户支付意愿和竞品价格带宽；3. 设计分层：免费额度引流、按量包、订阅套餐；4. 小范围价格测试（29/39/49 元）看转化和收入；5. 上线后监控用量和退订，防止超支和价格错配。",
      code: null,
      complexity: "考察点：成本结构、价值定价、分层与测试"
    }
  ];

  const SELF_TEST = [
    { id: "st1", q: "面对不熟悉的岗位 JD，你的第一反应是？", opts: ["直接放弃", "先问朋友再决定", "逐条对照并补短板", "先投了再说"], scores: [0, 2, 4, 1] },
    { id: "st2", q: "模拟面试的完成度如何？", opts: ["没练过", "偶尔练 1 次", "每周固定 2 次以上", "只练过熟悉题目"], scores: [0, 2, 4, 2] },
    { id: "st3", q: "自我介绍能稳定控制在 1 分钟吗？", opts: ["完全看临场发挥", "背熟但容易紧张", "结构清晰且能脱稿", "只会复述简历"], scores: [1, 2, 4, 1] },
    { id: "st4", q: "你如何准备行为面试题？", opts: ["不准备", "背答案", "用 STAR 提炼真实经历", "只准备技术题"], scores: [0, 2, 4, 1] },
    { id: "st5", q: "投递记录是否完整？", opts: ["记在脑子里", "散落在聊天记录", "有表格并定期更新", "只记录已约面"], scores: [0, 2, 4, 2] },
    { id: "st6", q: "简历是否针对不同岗位做了定制？", opts: ["一份走天下", "只改公司名", "按 JD 调整重点", "有多个版本但没整理"], scores: [1, 2, 4, 2] },
    { id: "st7", q: "笔试环节的短板是？", opts: ["不会算法题", "会做但写不快", "能稳定过笔试", "没参加过笔试"], scores: [1, 2, 4, 0] },
    { id: "st8", q: "你每周花多少时间做求职准备？", opts: ["基本没有", "少于 3 小时", "3-8 小时", "超过 8 小时"], scores: [0, 2, 3, 4] },
    { id: "st9", q: "收到拒信后你会？", opts: ["受挫躺平", "抱怨运气", "复盘失败环节并改进", "无所谓继续投"], scores: [0, 1, 4, 2] },
    { id: "st10", q: "对目标公司做过调研吗？", opts: ["没有", "只看官网首页", "研究了产品/团队/面经", "只看了薪资"], scores: [0, 1, 4, 2] },
    { id: "st11", q: "你的项目经历能讲出量化结果吗？", opts: ["没有项目", "能讲过程不能讲数字", "有清晰的指标和数据", "只讲了团队成果"], scores: [0, 2, 4, 2] },
    { id: "st12", q: "离第一场正式面试还有多久？", opts: ["还没投递", "1 周以内", "1-4 周", "1 个月以上"], scores: [1, 4, 3, 2] }
  ];

  const SEED_APPS = [
    { id: "a1", company: "字节跳动", role: "前端开发工程师", city: "北京", channel: "官网投递", status: "面试", applyDate: "2026-07-20", note: "一面已约 08/12", link: "https://jobs.bytedance.com", interviewAt: "2026-08-12T10:00", remindMin: 30 },
    { id: "a2", company: "腾讯", role: "后台开发工程师", city: "深圳", channel: "内推", status: "笔试", applyDate: "2026-07-25", note: "08/09 笔试", link: "https://careers.tencent.com" },
    { id: "a3", company: "美团", role: "算法工程师", city: "北京", channel: "官网投递", status: "已投递", applyDate: "2026-08-01", note: "", link: "https://zhaopin.meituan.com" },
    { id: "a4", company: "蚂蚁集团", role: "数据研发工程师", city: "杭州", channel: "内推", status: "面试", applyDate: "2026-07-18", note: "二面通过", link: "https://talent.antgroup.com", interviewAt: "2026-08-13T15:00", remindMin: 60 },
    { id: "a5", company: "华为", role: "软件工程师", city: "南京", channel: "官网投递", status: "意向", applyDate: "2026-08-03", note: "待完善简历后投递", link: "https://career.huawei.com" },
    { id: "a6", company: "小红书", role: "前端开发实习生", city: "上海", channel: "实习平台", status: "Offer", applyDate: "2026-07-10", note: "已收 offer", link: "https://job.xiaohongshu.com" },
    { id: "a7", company: "微纳核芯", role: "AI 芯片架构师", city: "杭州", channel: "校招官网", status: "笔试", applyDate: "2026-08-05", note: "8 月批次笔试；官网待补充", link: "" },
    { id: "a8", company: "英飞凌", role: "Staff FAE", city: "上海", channel: "官网投递", status: "拒绝", applyDate: "2026-07-15", note: "英语轮未通过", link: "https://careers.infineon.com" }
  ];

  const SEED_REVIEWS = [
    {
      id: "r1", date: "2026-08-06 20:30", track: "前端", scenario: "常规面", lang: "中文",
      score: 76, dims: { 技术深度: 78, 表达结构: 72, 项目还原: 80, 行为面试: 74 },
      duration: 18, total: 5,
      summary: "整体表现中等偏上：技术概念覆盖不错，但回答偏口语化、缺少数据支撑；行为题的结构感比技术题弱。",
      strengths: ["闭包、事件循环等概念解释清楚", "手写防抖能正确实现并讲清思路", "对浏览器渲染链路有完整认知"],
      improves: ["技术回答先给结论再展开，减少铺垫", "为每个项目准备量化指标", "行为题统一使用 STAR 结构"],
      turns: [
        { q: "什么是闭包？闭包在什么场景下可能造成内存泄漏？", a: "闭包就是函数能访问外部变量，比如计数器。内存泄漏可能是事件没解绑。", score: 78 },
        { q: "从浏览器输入 URL 到页面渲染完成，中间发生了什么？", a: "先 DNS，然后 TCP 连接，拿到 HTML 后解析成 DOM，构建 CSSOM，最后渲染绘制。", score: 82 },
        { q: "讲一个你最有成就感的项目。", a: "做了一个数据平台，我负责前端，最后上线了。", score: 62 }
      ]
    },
    {
      id: "r2", date: "2026-08-04 21:10", track: "算法", scenario: "压力面", lang: "中文",
      score: 84, dims: { 算法能力: 86, 思路表达: 82, 边界处理: 80, 抗压表现: 88 },
      duration: 22, total: 5,
      summary: "算法面表现稳定：能主动分析复杂度并处理边界，两道手撕题一次通过；建议继续强化动态规划类题目。",
      strengths: ["滑动窗口与哈希表解法熟练", "会主动说明时间和空间复杂度", "压力追问下仍保持清晰表达"],
      improves: ["动态规划转移方程推导偏慢", "链表题可以补充递归写法"],
      turns: [
        { q: "最长无重复字符子串的长度。", a: "用滑动窗口，维护一个集合，右指针走，遇到重复就动左指针，最后更新最大值。", score: 88 },
        { q: "爬楼梯：每次可以爬 1 或 2 阶。", a: "斐波那契，dp[i]=dp[i-1]+dp[i-2]，用两个变量滚动。", score: 90 }
      ]
    }
  ];

  const SEED_RESUMES = [
    {
      id: "res1", name: "我的简历 v1", savedAt: "2026-08-05 19:00",
      text: "张三\n求职意向：前端开发工程师\n教育背景：某大学 计算机科学与技术 本科 2024-2028\n技能：React、Vue、TypeScript、Node.js\n项目经历：参与电商后台系统开发，负责订单模块，使用 React 重构页面。\n实习经历：某公司前端实习生，完成日常迭代需求。"
    }
  ];

  const SEED_TASKS = [
    { title: "完成一次模拟面试并查看复盘", note: "建议从题库挑选 5 道高频题", done: false },
    { title: "更新投递进度表", note: "记录本周笔试与面试安排", done: false },
    { title: "做一道高频算法题", note: "保持手写代码的手感", done: false }
  ];

  window.Data = {
    questions: ALL_QUESTIONS,
    resources: RESOURCES,
    solverDb: SOLVER_DB,
    selfTest: SELF_TEST,
    seedApps: SEED_APPS,
    seedReviews: SEED_REVIEWS,
    seedResumes: SEED_RESUMES,
    seedTasks: SEED_TASKS,
    statuses: ["意向", "已投递", "笔试", "面试", "Offer", "拒绝"],
    cats: ["AI 产品", "前端", "后端", "算法", "系统设计", "行为", "产品", "英语"],
    diffs: ["入门", "中等", "进阶"],
    types: ["概念", "原理", "场景", "手撕", "算法", "设计"],
    tracks: ["AI 产品", "前端", "后端", "算法", "系统设计", "产品", "综合"]
  };
})();
