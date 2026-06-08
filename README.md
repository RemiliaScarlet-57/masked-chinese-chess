# 🎲 象棋揭棋 (Masked Chinese Chess)

一个现代化的中国象棋揭棋游戏，包含强大的 AI 对手和完善的游戏功能。

## ✨ 功能特性

### 🎮 游戏玩法
- **经典中国象棋规则
- **揭棋模式（暗棋）玩法
- 支持人机对战、双人对战、AI 对战
- 完整的游戏规则实现（将军、困毙、长捉判负等）

### 🤖 AI 功能
- **Alpha-Beta 剪枝搜索算法
- 概率搜索处理暗子不确定性
- 完整的评估函数（子力价值、位置价值、攻防体系）
- PV 主变路径显示
- 分数趋势图可视化

### 📊 高级功能
- **FEN 格式支持**：导入/导出棋局状态
- 分数实时评分和历史记录
- 被吃掉棋子显示
- 最后一步高亮显示
- 游戏记录导出（JSON/文本）

## 🛠️ 技术栈

- **前端框架**：Vue 3 + TypeScript
- **UI 框架**：Tailwind CSS
- **构建工具**：Vite
- **游戏引擎**：自定义实现

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 🎯 游戏规则

### 基本规则
- 暗子移动规则：
  - 暗子的移动规则基于该位置在开局布局中的原始棋子类型
  - 移动后如果是暗子会自动翻开

### 胜负判定
1. 将/帅被吃掉 -> 输
2. 困毙（无子可走）-> 输
3. 长捉 -> 长捉方判负

## 📁 项目结构

```
masked-chinese-chess/
├── src/
│   ├── ai/
│   │   ├── board-state.ts    # 游戏状态管理
│   │   ├── evaluation.ts     # 局面评估函数
│   │   ├── probability.ts   # 概率计算
│   │   └── search.ts       # AI 搜索算法
│   └── renderer/
│       ├── components/       # Vue 组件
│       ├── composables/    # Vue 组合式函数
│       ├── types/        # TypeScript 类型定义
│       └── utils/        # 工具函数
├── index.html
├── package.json
└── vite.config.ts
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
