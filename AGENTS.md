# Project guidance for Codex and other agents / Codex 與其他代理專案指引

This file directs Codex and other agents to follow the same **applicable project requirements** Copilot follows throughout task intake, rule discovery, analysis, authorized changes, verification, and delivery. The current `.github/instructions/` and `.github/skills/` define those project requirements; this file does not replace them or replicate Copilot's runtime instructions and tools. Read the current applicable sources for each task, including newly added or revised rules; examples below are not exhaustive. Do not maintain a separate agent-specific copy or wait for this file to change before following updated sources. If requirements cannot be followed within the authorized scope, stop the affected work and report the conflict. A shared editor or passing checks alone does not demonstrate compliance; written guidance cannot guarantee identical tool actions by different agents.

本文件要求 Codex 及其他代理，從接到任務、辨識規範、分析、依授權修改、驗證到交付，**全程遵循 Copilot 同樣適用的專案要求**。要求以現行 `.github/instructions/` 與 `.github/skills/` 為準；本文件不取代它們，也不複製 Copilot 的執行時指令與工具。每次任務都須讀取當前適用來源，包括日後新增或修訂的規範；下方範例並非完整清單。不得另存代理專屬副本，亦不須等待本文件更新才遵守來源變更。若無法在授權範圍內遵守，停止受影響工作並說明衝突。共用編輯器或通過檢查不等於符合規範；文字指引也無法保證不同代理的每一步工具操作完全相同。

## 多代理工作模式 / Multi-agent work mode

- 多個代理可以同時在同一個工作樹工作；它們看到相同的檔案、分支與未提交變更。
- Codex 及其他代理須透過 VS Code 中已安裝、配置的同一專案工作區工作，使用其檔案、依賴、工具及規範；不得自行改用其他編輯器、副本或開發環境。開始前核對 VS Code 顯示的工作區資料夾、代理實際工作目錄與 `git rev-parse --show-toplevel` 所得倉庫根目錄是否指向目標專案。終端路徑只能證明終端所在位置，不能單獨證明代理正在 VS Code 工作區內；無法取得 VS Code 工作區資訊時須如實說明並暫停受影響操作，不得假稱已確認。此要求不改變已授權的工作樹隔離安排。
- Codex and other agents must use the same installed and configured project workspace in VS Code, with its files, dependencies, tools, and rules—not substitute another editor, checkout, or environment. Before acting, compare the workspace folder shown in VS Code, the agent's actual working directory, and the repository root from `git rev-parse --show-toplevel` against the intended project. A terminal path alone cannot establish that the agent is operating inside the VS Code workspace. If VS Code workspace information is unavailable, state that limitation and pause the affected action rather than claiming confirmation. Authorized worktree isolation remains unchanged.
- 工作樹中的 `AGENTS.md` 是 Codex 等其他代理讀取既有規範的入口；`.agents/skills/` 是指向 `.github/skills/` 的相容入口，規則內容仍以 `.github/` 為準。
- 不要把未提交變更或檔案建立者假定為自己的；修改前先查看工作樹狀態，保留其他代理的變更，並只處理已授權的範圍。
- 代理之間若有重疊工作，先按檔案與責任邊界協調；不要覆蓋、回退或重置其他代理尚未交付的內容。
- 工作樹只能證明目前檔案與規則的狀態，不能證明某項變更由哪個代理建立；交付時以實際差異、驗證結果與明確說明為準。
- 開始修改前，先查看 `.agents/active-work/`，再為自己的工作建立一個以代理及任務識別命名的 Markdown 標記。標記內容須使用繁體中文，寫明代理／對話識別、進行中的任務、預計修改的檔案或目錄、狀態及更新時間；檔名、程式路徑及必要技術識別字可保留原文。範圍或狀態改變時更新標記。
- 其他代理的標記表示該範圍可能正在修改。範圍重疊時先協調，不依標記推斷對方已完成；過期或無法確認的標記先核實，不自行刪除或接管。工作結束並交付後，只移除自己的標記。
- `.agents/active-work/` 的工作標記僅供同一工作樹內即時協作，不提交至 Git；它們不取代工作樹差異、代理訊息或既有開發與發布文件。

## Workflow / 工作流程

1. At task start, identify the task type, product area (passenger `src/`, Admin `admin/`, API `backend/`, Driver `driver/`, Brand `brand/`, shared `shared/`, database `prisma/`, or another cross-cutting area), and authorized scope.
   Read relevant product boundaries and verification gates in `README.md`; use `docs/README.md` to find applicable development, architecture, API, deployment, or operations documents. Read-only requests authorize analysis, not modifications; related functionality does not authorize changes in another area.

   接到任務時先辨識任務類型、端別（乘客 `src/`、後台 `admin/`、API `backend/`、司機 `driver/`、品牌 `brand/`、共用 `shared/`、資料庫 `prisma/` 或其他跨區工作）及授權範圍。
   讀取 `README.md` 的相關產品邊界與驗證門檻，並透過 `docs/README.md` 找到適用的開發、架構、API、部署或維運文件。唯讀要求只授權分析；功能相關不代表取得其他區域的修改授權。
2. Before analyzing or changing a development area, read the current `.github/instructions/development-reliability.instructions.md` and inspect `.github/instructions/*.instructions.md`.
   Identify rules whose `applyTo` covers affected files or whose description matches the task. Apply them throughout analysis and implementation, and reassess when scope or affected files change. Codex must explicitly read these instructions rather than assume they were automatically loaded. For non-development requests, check relevance without imposing unrelated gates.

   分析或修改開發區域前，讀取現行 `.github/instructions/development-reliability.instructions.md`，並檢視 `.github/instructions/*.instructions.md`。
   按涉及檔案的 `applyTo` 或任務相關描述辨識指令，在分析和實作時遵守；範圍或檔案改變時重新核對。Codex 須主動讀取，不可假設已自動載入。非開發要求也須檢查適用性，但不強加無關門檻。
3. Before analyzing or changing an applicable domain, inspect `.github/skills/` and read each matching `SKILL.md` in full according to its description and trigger. `.agents/skills/` links to the same files for compatibility; `.github/skills/` is the source.
   Examples, not an exhaustive list: feature changes use `verified-baseline-change-control`; `src/` uses `passenger-modularity-maintenance`; `admin/` or `backend/` uses `admin-development`; Figma work uses `figma-ui-slicing`. Use the payment or phone-login skill when applicable. Apply `.github/instructions/driver-web-ui.instructions.md` to covered Driver Web UI work, not unrelated Driver tasks. Never substitute one platform's rules for another's.

   分析或修改適用領域前，檢視 `.github/skills/`，依描述與觸發條件完整讀取適用的 `SKILL.md`。`.agents/skills/` 為相容入口，規範仍以 `.github/skills/` 為來源。
   範例而非完整清單：功能變更使用 `verified-baseline-change-control`；`src/` 使用 `passenger-modularity-maintenance`；`admin/` 或 `backend/` 使用 `admin-development`；Figma 使用 `figma-ui-slicing`。支付與手機登入任務在適用時使用專項技能。`.github/instructions/driver-web-ui.instructions.md` 僅適用其涵蓋的司機端 Web UI 工作；不可用其他端別規範替代。
4. Before editing, understand existing behavior, dependencies, data/API contracts, lifecycle, failure handling, and affected callers or views.
   Define the smallest complete change, behaviors to preserve, applicable requirements, and verification plan. If essential work crosses an unauthorized boundary or a significant choice is unclear, stop the affected write and obtain authorization; do not bypass a rule.

   修改前理解既有行為、依賴、資料／API 契約、生命週期、錯誤處理及受影響的呼叫者或畫面。
   確定最小完整修改、須保留的行為、適用規範與驗證方式。必要修改超出授權範圍或重大選擇不明時，停止受影響的寫入並取得授權，不得跳過規範。
5. Follow the applicable domain's architecture and UI/API requirements while implementing, not as a final cleanup.
   For frontend work, follow that platform's component, page/style isolation, and design rules. For backend work, preserve validation, permissions, business rules, and API contracts. Check affected behavior and required states during implementation. Do not duplicate backend business rules in the frontend or silently modify other areas as a workaround.

   實作時就遵守適用端別的架構及 UI／API 規範，不得留到交付前補救。
   前端遵守該端的元件、頁面／樣式隔離及設計規則；後端保護輸入驗證、權限、業務規則與 API 契約。過程中核對受影響行為及必要狀態；不可把後端業務規則複製到前端，或暗中修改其他區域作為補丁。
6. Compare the actual diff with applicable requirements. Run relevant scope and verification commands from `README.md`, `docs/DEVELOPMENT.md`, and matching instructions and skills.
   Fix nonconformities within authorized scope and revalidate; otherwise report the blocker without claiming completion. Builds and static checks do not replace required functional, visual, interaction, or cross-area verification. Report exact commands, results, and unverified items. For documentation-only edits, check content, links, and diff instead of unrelated application builds.

   依適用規範檢查實際差異，並執行 `README.md`、`docs/DEVELOPMENT.md`、適用指令及技能要求的範圍與驗證命令。
   授權範圍內的不符項目須修正並重新驗證；否則說明阻塞，不宣稱完成。建置或靜態檢查不能取代必要的功能、視覺、互動或跨區驗證。交付列出實際命令、結果及未驗證項目。純文件變更只檢查內容、連結及差異，不跑無關應用建置。

Preserve existing user changes in the working tree unless the user explicitly includes them in the task.

除非使用者明確把既有工作區變更納入本次任務，否則應保留這些變更。
