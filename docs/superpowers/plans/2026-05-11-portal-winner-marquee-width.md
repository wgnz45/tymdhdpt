# Portal Winner Marquee Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `src/pages/PortalStyleSports.jsx` 主展示页面中“中奖喜报”跑马灯容器只占左侧主列，从而与上方图片轮播容器保持同宽。

**Architecture:** 这个改动只触碰现有的网格布局类名，不重构页面结构，也不改动右侧栏。测试继续沿用当前仓库已有的“读取源码并断言关键字符串”的 Vitest 风格，为这个布局约束补一个最小回归测试。

**Tech Stack:** React 19、Vite、Vitest、Node `fs` 源码断言测试、Tailwind 类名布局

---

## File Structure

- `src/pages/PortalStyleSports.jsx`
  - 当前主展示页面实现。
  - 需要修改“中奖喜报跑马灯 - 轮播下方”这一段的 grid 类名，去掉跨两列设置。

- `tests/winnerMarqueeWidth.test.js`
  - 新增最小回归测试。
  - 直接读取 `src/pages/PortalStyleSports.jsx` 源码，验证“中奖喜报跑马灯”容器不再包含 `col-span-2`，并且保持在左侧第 1 列第 2 行。

## Workspace Note

当前工作目录 `e:\体彩门店互动平台` 不是 git 仓库，`git status` 会返回 `fatal: not a git repository`。因此本计划里的“提交”步骤改为**手动变更检查点**：记录变更文件并重新运行测试；如果后续迁移到 git 仓库，再使用文末给出的提交命令。

### Task 1: Add a regression test and align the winner marquee container

**Files:**
- Create: `tests/winnerMarqueeWidth.test.js`
- Modify: `src/pages/PortalStyleSports.jsx:2310-2330`
- Test: `tests/winnerMarqueeWidth.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/winnerMarqueeWidth.test.js` with this exact content:

```js
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('winner marquee width alignment', () => {
  const source = readFileSync('src/pages/PortalStyleSports.jsx', 'utf8');

  it('keeps the winner marquee in the left content column instead of spanning into the sidebar column', () => {
    const marker = '{/* 中奖喜报跑马灯 - 轮播下方 */}';
    const start = source.indexOf(marker);

    expect(start).toBeGreaterThan(-1);

    const snippet = source.slice(start, start + 500);

    expect(snippet).toContain('className="col-start-1 row-start-2');
    expect(snippet).not.toContain('col-span-2');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run tests/winnerMarqueeWidth.test.js
```

Expected: FAIL，因为当前源码片段仍然包含 `col-span-2`，而且还没有连续的 `className="col-start-1 row-start-2"`。

- [ ] **Step 3: Write the minimal implementation**

In `src/pages/PortalStyleSports.jsx`, find the block under the comment `中奖喜报跑马灯 - 轮播下方` and change only the outer wrapper class from:

```jsx
<div className="col-start-1 col-span-2 row-start-2 flex items-center justify-center gap-3 h-12 min-h-0 overflow-hidden rounded-2xl bg-white/70 shadow-sm border border-gray-100 px-5">
```

to:

```jsx
<div className="col-start-1 row-start-2 flex items-center justify-center gap-3 h-12 min-h-0 overflow-hidden rounded-2xl bg-white/70 shadow-sm border border-gray-100 px-5">
```

Do not change any other markup, animation, text, or right-column layout.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run tests/winnerMarqueeWidth.test.js
```

Expected: PASS

- [ ] **Step 5: Run related regression tests for the same source file**

Run:

```bash
npx vitest run tests/winnerMarqueeWidth.test.js tests/welfareMini.test.js tests/gameHubPreview.test.js
```

Expected: PASS，确认同文件里的右侧公益金卡片和互动区预览测试未受影响。

- [ ] **Step 6: Create a manual checkpoint for this non-git workspace**

Run:

```bash
git status --short
```

Expected:

```text
fatal: not a git repository (or any of the parent directories): .git
```

Then record these changed files in the final work summary:

```text
tests/winnerMarqueeWidth.test.js
src/pages/PortalStyleSports.jsx
docs/superpowers/specs/2026-05-11-portal-winner-marquee-width-design.md
docs/superpowers/plans/2026-05-11-portal-winner-marquee-width.md
```

If this workspace is later attached to a git repository, use this commit command:

```bash
git add tests/winnerMarqueeWidth.test.js src/pages/PortalStyleSports.jsx docs/superpowers/specs/2026-05-11-portal-winner-marquee-width-design.md docs/superpowers/plans/2026-05-11-portal-winner-marquee-width.md
git commit -m "fix: align winner marquee width with carousel"
```

