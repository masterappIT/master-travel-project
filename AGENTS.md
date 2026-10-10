# Codex project guidance / Codex 專案指引

This repository is shared with Copilot. Keep `.github/skills/` and `.github/instructions/` as the source of truth. Read the applicable files before changing code or project behavior, and apply each rule only within its stated scope.

此儲存庫與 Copilot 共用。以 `.github/skills/` 和 `.github/instructions/` 為唯一規範來源。修改程式碼或專案行為前，先讀取適用文件，並只在文件指定範圍內套用規則。

## 多代理工作模式 / Multi-agent work mode

- 多個代理可以同時在同一個工作樹工作；它們看到相同的檔案、分支與未提交變更。
- 工作樹中的 `AGENTS.md` 是共同入口；`.agents/skills/` 是指向 `.github/skills/` 的相容入口，規則內容仍以 `.github/` 為準。
- 不要把未提交變更或檔案建立者假定為自己的；修改前先查看工作樹狀態，保留其他代理的變更，並只處理已授權的範圍。
- 代理之間若有重疊工作，先按檔案與責任邊界協調；不要覆蓋、回退或重置其他代理尚未交付的內容。
- 工作樹只能證明目前檔案與規則的狀態，不能證明某項變更由哪個代理建立；交付時以實際差異、驗證結果與明確說明為準。
- 開始修改前，先查看 `.agents/active-work/`，再為自己的工作建立一個以代理及任務識別命名的 Markdown 標記。標記須寫明代理／對話識別、進行中的任務、預計修改的檔案或目錄、狀態及更新時間；範圍或狀態改變時更新標記。
- 其他代理的標記表示該範圍可能正在修改。範圍重疊時先協調，不依標記推斷對方已完成；過期或無法確認的標記先核實，不自行刪除或接管。工作結束並交付後，只移除自己的標記。
- `.agents/active-work/` 的工作標記僅供同一工作樹內即時協作，不提交至 Git；它們不取代工作樹差異、代理訊息或既有開發與發布文件。

## Workflow / 工作流程

1. Read `README.md` for product boundaries and verification gates. Use `docs/README.md` to find the relevant development, architecture, API, deployment, or operations document.
   先讀 `README.md`，了解產品邊界與驗證門檻；再透過 `docs/README.md` 找到相關的開發、架構、API、部署或維運文件。
2. For every development task, read `.github/instructions/development-reliability.instructions.md`. Read other `.github/instructions/*.instructions.md` files when their `applyTo` paths cover the files being changed. Codex does not automatically load these Copilot path instructions.
   每項開發工作都須讀取 `.github/instructions/development-reliability.instructions.md`。若其他 `.github/instructions/*.instructions.md` 的 `applyTo` 涵蓋本次修改檔案，也須讀取。Codex 不會自動載入這些 Copilot 路徑指令。
3. Use the matching project skill under `.agents/skills/` when its description or trigger applies, and read the full `SKILL.md` before proceeding. Each folder links to the source in `.github/skills/`; edit the source rather than creating a second copy. Feature changes use `verified-baseline-change-control`; `src/` work uses `passenger-modularity-maintenance`; `admin/` or `backend/` work uses `admin-development`; Figma implementation uses `figma-ui-slicing`. Payment and phone login tasks use their specialized skills when applicable.
   當技能的描述或觸發條件符合任務時，使用 `.agents/skills/` 中對應的專案技能，並在開始前讀完其 `SKILL.md`。每個資料夾都連結至 `.github/skills/` 的原始文件；修改原始文件即可，不要建立第二份副本。功能變更使用 `verified-baseline-change-control`；`src/` 工作使用 `passenger-modularity-maintenance`；`admin/` 或 `backend/` 工作使用 `admin-development`；Figma 實作使用 `figma-ui-slicing`。支付與手機登入任務在適用時使用各自的專項技能。
4. Run the applicable scope checks and verification commands from `README.md` and `docs/DEVELOPMENT.md`. Report actual results and any unverified target.
   執行 `README.md` 與 `docs/DEVELOPMENT.md` 中適用的範圍檢查和驗證命令，並如實回報結果及未驗證的平台或項目。

Preserve existing user changes in the working tree unless the user explicitly includes them in the task.

除非使用者明確把既有工作區變更納入本次任務，否則應保留這些變更。
