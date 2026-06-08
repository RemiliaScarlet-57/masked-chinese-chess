
# 象棋揭棋最优解计算软件设计文档

## 1. 项目概述

本项目是一个基于 Electron 的桌面应用，用于计算象棋揭棋的最优解。软件支持棋盘可视化、人机对战、残局分析等功能，采用 Alpha-Beta 剪枝算法实现高效的最优解搜索。

## 2. 功能需求

### 2.1 核心功能

| 功能模块 | 功能描述 | 优先级 |
|---------|---------|-------|
| 棋盘渲染 | SVG绘制棋盘和棋子，支持暗棋显示 | 高 |
| 规则引擎 | 验证走法合法性、处理翻棋逻辑 | 高 |
| AI搜索 | Alpha-Beta剪枝算法计算最优解 | 高 |
| 游戏管理 | 管理棋局状态、历史记录 | 高 |
| 对战模式 | 人机对战、人人对战、AI分析 | 中 |
| 复盘功能 | 棋局回放、步骤分析 | 中 |

### 2.2 胜负规则

- 吃掉对方的将帅为胜利
- 双方棋子都无法移动为和棋

## 3. 技术架构

### 3.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Window     │  │   IPC        │  │   Process       │   │
│  │   Manager    │  │   Handler    │  │   Manager       │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘   │
└─────────┼─────────────────┼────────────────────┼────────────┘
          │                 │                    │
          │ IPC             │ IPC                │ Spawn
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Renderer Process (Vue)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Board      │  │   Game       │  │   UI            │   │
│  │   Component  │  │   State      │  │   Components    │   │
│  │   (棋盘渲染)  │  │   Manager    │  │   (控制面板等)   │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ IPC
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Worker Process                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Board      │  │   Search     │  │   Evaluation    │   │
│  │   State      │  │   Algorithm  │  │   Function      │   │
│  │   (棋盘状态)  │  │   (Alpha-    │  │   (评估函数)     │   │
│  │              │  │   Beta剪枝)   │  │                 │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 技术栈

| 模块 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue | 3.4.x |
| 语言 | TypeScript | 5.x |
| 构建工具 | Vite | 6.x |
| 样式 | Tailwind CSS | 3.x |
| 图标 | Lucide Icons | 1.x |
| 框架 | Electron | 29.x |

### 3.3 目录结构

```
masked_chinese_chess/
├── src/
│   ├── main/                    # Electron主进程
│   │   ├── index.ts            # 主入口
│   │   ├── ipc-handler.ts      # IPC处理器
│   │   └── process-manager.ts  # 进程管理
│   ├── renderer/               # Vue渲染进程
│   │   ├── components/         # Vue组件
│   │   │   ├── Board.vue       # 棋盘组件
│   │   │   ├── Piece.vue       # 棋子组件
│   │   │   └── ControlPanel.vue# 控制面板
│   │   ├── composables/        # 组合式函数
│   │   │   └── useGame.ts      # 游戏状态管理
│   │   ├── types/              # 类型定义
│   │   │   └── index.ts        # 类型定义
│   │   ├── App.vue             # 根组件
│   │   └── main.ts             # 渲染入口
│   └── ai/                     # AI算法模块
│       ├── board-state.ts      # 棋盘状态
│       ├── search.ts           # 搜索算法
│       ├── evaluation.ts       # 评估函数
│       └── probability.ts      # 暗棋概率推理
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

## 4. 数据结构设计

### 4.1 棋子类型

```typescript
type PieceType = 'king' | 'guard' | 'elephant' | 'horse' | 'chariot' | 'cannon' | 'soldier';
type PieceColor = 'red' | 'black';

interface Piece {
  id: string;
  type: PieceType;
  color: PieceColor;
  isRevealed: boolean;  // 是否已翻开
  position: Position;
}

interface Position {
  row: number;  // 0-9 (10行)
  col: number;  // 0-8 (9列)
}

interface DarkPieceProbability {
  pieceId: string;
  possibleTypes: Map<PieceType, number>;  // 每种可能类型的概率
}
```

### 4.2 游戏状态

```typescript
interface GameState {
  pieces: Piece[];
  currentPlayer: PieceColor;
  history: Move[];
  status: 'playing' | 'red_win' | 'black_win' | 'draw';
  selectedPieceId: string | null;
  darkPieceProbabilities: DarkPieceProbability[];  // 暗棋概率分布
  remainingPieces: Map<PieceColor, Map<PieceType, number>>;  // 剩余未翻开的棋子统计
}

interface Move {
  pieceId: string;
  from: Position;
  to: Position;
  capturedPieceId?: string;
  isReveal: boolean;
  isCheck: boolean;
}
```

### 4.3 棋子价值表

| 棋子类型 | 价值 |
|---------|------|
| king | 10000 |
| guard | 200 |
| elephant | 200 |
| horse | 450 |
| chariot | 900 |
| cannon | 450 |
| soldier | 100 |

## 5. AI搜索算法设计

### 5.1 暗棋概率推理系统

揭棋的核心难点在于暗棋的不确定性。AI需要维护一个概率模型来跟踪每个暗棋可能的类型。

**概率更新流程：**

```
1. 初始化：所有暗棋的概率分布均匀（基于初始棋子数量）
2. 翻棋事件：当暗棋被翻开，更新所有暗棋的概率分布
3. 吃子事件：当暗棋被吃掉，更新剩余棋子统计和概率分布
4. 走棋事件：根据走法推断暗棋类型的可能性
```

**剩余棋子统计：**

| 棋子类型 | 红方数量 | 黑方数量 |
|---------|---------|---------|
| king | 1 | 1 |
| guard | 2 | 2 |
| elephant | 2 | 2 |
| horse | 2 | 2 |
| chariot | 2 | 2 |
| cannon | 2 | 2 |
| soldier | 5 | 5 |

**概率计算公式：**

```
P(暗棋A是类型T) = 剩余该类型棋子数 / 剩余暗棋总数
```

### 5.2 考虑暗棋的搜索算法

采用 **概率加权搜索** + **Alpha-Beta剪枝**：

```
function probabilisticSearch(state, depth, alpha, beta, maximizingPlayer):
    if depth == 0 or gameOver(state):
        return evaluate(state)
    
    if state has dark pieces:
        // 对每个暗棋生成可能的类型组合
        for each possible combination of dark piece types:
            probability = product of each dark piece's type probability
            hypotheticalState = applyTypeHypothesis(state, combination)
            eval = alphaBeta(hypotheticalState, depth-1, alpha, beta, maximizingPlayer)
            totalEval += probability * eval
        return totalEval
    else:
        // 所有棋子都已翻开，使用标准Alpha-Beta
        return alphaBeta(state, depth, alpha, beta, maximizingPlayer)
```

### 5.3 Alpha-Beta剪枝算法（标准）

```
function alphaBeta(state, depth, alpha, beta, maximizingPlayer):
    if depth == 0 or gameOver(state):
        return evaluate(state)
    
    if maximizingPlayer:
        maxEval = -infinity
        for each move in getLegalMoves(state):
            childState = makeMove(state, move)
            eval = alphaBeta(childState, depth-1, alpha, beta, false)
            maxEval = max(maxEval, eval)
            alpha = max(alpha, eval)
            if beta <= alpha:
                break  # Beta剪枝
        return maxEval
    else:
        minEval = +infinity
        for each move in getLegalMoves(state):
            childState = makeMove(state, move)
            eval = alphaBeta(childState, depth-1, alpha, beta, true)
            minEval = min(minEval, eval)
            beta = min(beta, eval)
            if beta <= alpha:
                break  # Alpha剪枝
        return minEval
```

### 5.4 评估函数（考虑暗棋概率）

评估函数需要考虑暗棋的概率分布：

1. **棋子价值**：各棋子的基础价值 × 存在概率
2. **位置分数**：棋子所在位置的优劣
3. **威胁程度**：对对方将帅的威胁（考虑暗棋可能的攻击）
4. **防守能力**：保护己方将帅的能力
5. **信息价值**：翻棋带来的信息增益

```
evaluate(state) = 
    sum(棋子价值 × 存在概率 × 颜色系数) +
    sum(位置分数) +
    威胁分数 +
    防守分数 +
    信息价值分数
```

**暗棋价值计算：**

```
暗棋价值 = sum(每种可能类型的价值 × 该类型的概率)
```

### 5.5 暗棋组合爆炸处理

由于暗棋组合数量可能非常大（7^n，n为暗棋数量），需要采用启发式方法：

| 策略 | 描述 |
|-----|------|
| 蒙特卡洛采样 | 随机采样部分组合进行评估 |
| 最大概率路径 | 只考虑概率最高的几种组合 |
| 期望值近似 | 使用期望值代替完整枚举 |
| 逐步精化 | 先使用粗粒度评估，再对关键走法精化 |

### 5.6 优化策略

| 优化策略 | 描述 |
|---------|------|
| 迭代加深搜索 | 从浅到深逐步搜索，提高剪枝效率 |
| 置换表 | 缓存已计算的局面评估值 |
| 走法排序 | 按评分排序走法，优先搜索好走法 |
| 历史启发 | 记录历史走法的评分，用于排序 |
| 概率剪枝 | 忽略概率极低的暗棋组合 |

## 6. 界面设计

### 6.1 主界面布局

```
┌─────────────────────────────────────────────────────┐
│  标题栏: 象棋揭棋最优解计算器                        │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────────────────────┐   │
│  │   控制面板   │ │         棋盘区域             │   │
│  │ ──────────  │ │                             │   │
│  │ 新游戏      │ │     8x4 棋盘展示            │   │
│  │ 模式选择    │ │     (暗棋显示为灰色)         │   │
│  │ 难度设置    │ │                             │   │
│  │ AI分析      │ │                             │   │
│  │ 复盘        │ │                             │   │
│  └─────────────┘ └─────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  状态栏: 当前玩家 | 步数 | 搜索深度 | 用时          │
└─────────────────────────────────────────────────────┘
```

### 6.2 棋子显示

- **暗棋**：灰色棋子，未翻开状态
- **红方**：红色棋子
- **黑方**：黑色棋子
- **选中状态**：高亮显示

### 6.3 操作流程

1. 点击新游戏开始
2. 选择对战模式（人机/人人）
3. 点击暗棋翻开或选择己方棋子移动
4. AI自动计算并执行最优解

## 7. 测试计划

### 7.1 单元测试

| 测试模块 | 测试内容 |
|---------|---------|
| 规则引擎 | 走法合法性验证 |
| AI算法 | 搜索正确性、最优解验证 |
| 状态管理 | 状态转换正确性 |

### 7.2 集成测试

| 测试场景 | 测试内容 |
|---------|---------|
| 人机对战 | 完整对局流程 |
| 残局分析 | 特定残局的最优解计算 |
| 复盘功能 | 棋局回放正确性 |

### 7.3 性能测试

| 测试项 | 目标 |
|--------|------|
| 搜索深度8层 | < 5秒 |
| 搜索深度10层 | < 15秒 |
| 内存占用 | < 500MB |

## 8. 部署计划

### 8.1 构建目标

- Windows (x64)
- macOS (x64, arm64)
- Linux (x64)

### 8.2 版本发布

采用语义化版本控制：`v1.0.0`

---

**文档版本**: 1.1  
**创建日期**: 2026-06-02  
**更新日期**: 2026-06-02  
**状态**: 待审核  
**更新内容**: 添加暗棋概率推理系统设计
