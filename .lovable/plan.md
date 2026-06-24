# Sprint 4 — Exam credibility & structured topic mapping

Make Tentra feel exam-specific for SQE1, SQE2, NY Bar, MPRE. One source of truth for exam structure, used everywhere.

## 1. New central config: `src/lib/exam-config.ts`

Single source of truth. Replaces ad-hoc lookups in onboarding/dashboard/preview. Existing `sqe-syllabus.ts`, `ube-syllabus.ts`, `mpre-syllabus.ts` stay as low-level data; the new config layers user-facing structure on top (groupings, skills, dashboard cards, credibility metadata).

Shape per exam (`SQE1` | `SQE2` | `NY_BAR` | `MPRE`):

```ts
type ExamConfig = {
  key: "SQE1" | "SQE2" | "NY_BAR" | "MPRE";
  name: string;                // "SQE1"
  shortDescription: string;
  components: { key: string; name: string; weight?: number }[];
  topicGroups: {               // user-facing groupings
    key: string;
    name: string;              // display label
    component?: string;        // e.g. "FLK1"
    subtopics: string[];
    sourceLabel?: string;      // official/internal label (may differ from display)
  }[];
  skills?: { key: string; name: string; mode: "oral" | "written" }[]; // SQE2 + MPT
  pathwayRequirements?: { key: string; name: string; note?: string }[]; // NY Bar
  assessmentStyle: string;
  planLogicNotes: string[];
  exampleTasks: string[];
  dashboardCards: { key: string; label: string }[];
  credibilityBadge: string;    // "Mapped to SQE1 FLK structure" etc.
  source: { label: string; version: string; lastReviewed: string };
  internalNotes: string;
};
```

Helpers:
- `getExamConfig(examType)` — main accessor
- `getOnboardingWeakAreas(examType)` — flat list of user-facing topic labels
- `getDashboardCards(examType)`
- `getTopicGroupForSubtopic(examType, subtopic)`

### Structures

**SQE1** — components FLK1 + FLK2, plus pervasive Ethics layer (not a 13th group, but flagged via `pervasiveLayers`).
- FLK1 groups: Business Law & Practice, Dispute Resolution, Contract Law, Tort, Legal System Constitutional & Administrative Law (subtopics include EU Law / retained EU law), Legal Services
- FLK2 groups: Property Law & Practice, Wills & Administration of Estates, Solicitors Accounts, Land Law, Trusts Law, Criminal Law & Practice (subtopics include Criminal liability, Offences, Defences, Police powers, Bail, Mode of trial, Sentencing, Appeals)
- `sourceLabel` may still reference "EU Law" / "Criminal Liability" — display labels do not.

**SQE2** — `skills` array (6 skills, oral/written) + `topicGroups` for practice areas (Criminal Litigation, Dispute Resolution, Property Practice, Wills & Probate, Business organisations).

**NY Bar** — components MBE (50%), MEE (30%), MPT (20%). MBE + MEE subjects per brief (post-Jul 2026 MEE list). `pathwayRequirements`: UBE, NYLC, NYLE, MPRE, 50hr pro bono. MPT `skills`. `internalNotes` carries the Jul 2026 MEE-scope note.

**MPRE** — 10 topic groups per brief.

## 2. Refactor consumers

Update to read from `getExamConfig`:
- `src/routes/onboarding.tsx` — weak-area step uses `getOnboardingWeakAreas`. Map to existing `ModuleConfidence` shape so plan-store contract is unchanged. Preserve saved draft answers; if a draft references a now-renamed module, keep the user's confidence value by best-effort name match.
- `src/lib/preview-plan.ts` — preview plan template uses exam config (FLK split for SQE1, skills+areas for SQE2, MBE/MEE/MPT for NY Bar, PR topics for MPRE).
- `src/routes/plan-preview.tsx` — section headings reflect exam structure; show credibility badge + trust copy.
- `src/routes/dashboard.tsx` — top metric cards driven by `dashboardCards`. Show credibility badge in header subtle. Keep current layout/visual rhythm; just swap the labels and which data feeds each card based on exam.
- `src/routes/coach.tsx` — inject exam config summary into AI tutor system context; render trust copy footer.
- `src/lib/exam-paths.ts` — keep as thin adapter so existing `plan-store` `ExamPath` semantics survive. `getSubjectsForExamPath` now derives from exam config topic groups rather than syllabus files directly.

## 3. Plan generator credibility

`buildStoredPreview` and the cloud `generate-plan` edge function prompt both reference exam-config `planLogicNotes` and `exampleTasks` so generated tasks read as exam-specific (e.g. "25 mixed FLK1 MCQs: Contract + Tort" not "Study Contract Law"). Edge function: pass the structured config into the prompt; do not change response schema.

## 4. Trust + credibility UI

- Small `<CredibilityBadge>` component (subtle pill, gradient border) used on preview header, dashboard header, onboarding review step.
- `<TrustNote>` component rendered in coach footer and plan preview footer:
  > "Tentra helps structure your revision and track your progress. Always check current official exam specifications and provider materials for authoritative syllabus detail."
- No "coming soon" / "other exam" copy anywhere — sweep with ripgrep and remove.

## 5. Versioning & internal notes

Each exam config carries `source.label`, `source.version`, `source.lastReviewed`, `internalNotes`. Surface `source.lastReviewed` quietly in a footer ("Exam structure reviewed: …") on the preview and dashboard.

## 6. Out of scope

- No DB migration (plan-store shape unchanged; weak-area names persist as strings).
- No new auth/profile fields.
- No real adaptive engine rewrite — only structural credibility.

## 7. Acceptance check

After implementation:
- Onboarding weak areas differ per exam and never show "EU Law" / "Criminal Liability" standalone for SQE1.
- Preview + dashboard headings match exam structure (FLK1/FLK2/Ethics; Skills/Areas; MBE/MEE/MPT; PR topics).
- Credibility badge visible on preview + dashboard.
- Trust copy visible in coach + preview.
- `rg "coming soon|Other legal exam|generic legal"` returns nothing.
- `bunx tsgo --noEmit` passes.

## Verification

`bunx tsgo --noEmit` + Playwright walk: anonymous → onboarding (each exam) → preview → sign-up → dashboard, screenshot each exam's labels.
