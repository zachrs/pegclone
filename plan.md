# Time-Release Campaign Templates — Implementation Plan

## Overview

Add the ability to create reusable **campaign templates** with scheduled interval-based message delivery. Example: a "Pregnancy" template that sends one message per trimester (3 steps over ~9 months). Users define the intervals and content for each step. Recipients are enrolled into a campaign, and a tracking page shows enrollment status and delivery history.

---

## New Database Tables

### 1. `campaign_templates`
Reusable template definitions created by admins/providers.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK → organizations | |
| created_by | uuid FK → users | |
| name | text | e.g. "Pregnancy Education" |
| description | text | Optional summary |
| is_active | boolean | Soft-disable without deleting |
| steps | jsonb | Array of step definitions (see below) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`steps` JSONB shape:**
```ts
Array<{
  stepNumber: number;        // 1-based
  name: string;              // e.g. "First Trimester"
  delayDays: number;         // days after enrollment (step 1 = 0)
  contentItemIds: string[];  // content to send in this step
  reminderEnabled: boolean;
  maxReminders: number;
  reminderIntervalHours: number;
}>
```

> JSONB over a separate `campaign_template_steps` table because steps are always read/written as a unit, rarely queried individually, and the nesting is shallow. This avoids join overhead and simplifies the CRUD.

### 2. `campaign_enrollments`
Tracks each recipient enrolled in a running campaign.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK → organizations | |
| template_id | uuid FK → campaign_templates | |
| recipient_id | uuid FK → recipients | |
| enrolled_by | uuid FK → users | Who started it |
| enrolled_at | timestamptz | Start date for interval calculation |
| status | enum | `active`, `completed`, `paused`, `cancelled` |
| current_step | integer | Which step they're on (1-based) |
| completed_at | timestamptz | Null until all steps sent |
| paused_at | timestamptz | |
| cancelled_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Unique constraint:** `(template_id, recipient_id)` — one enrollment per template per recipient.

### 3. `campaign_step_sends`
Links each step delivery back to the message that was actually sent.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK → organizations | |
| enrollment_id | uuid FK → campaign_enrollments | |
| step_number | integer | Which step |
| message_id | uuid FK → messages | The actual sent message |
| scheduled_for | timestamptz | When this step is scheduled |
| sent_at | timestamptz | When actually delivered |
| created_at | timestamptz | |

This table ties the campaign system to the existing `messages` infrastructure, so all delivery tracking, open tracking, and reminder logic works unchanged.

### New Enums

```sql
CREATE TYPE campaign_enrollment_status AS ENUM ('active', 'completed', 'paused', 'cancelled');
```

---

## New Job Type

### `PROCESS_CAMPAIGN_STEP`

Added to pg-boss queue. Fires when a step's scheduled time arrives.

```ts
interface ProcessCampaignStepJob {
  enrollmentId: string;
  stepNumber: number;
  tenantId: string;
}
```

**Worker logic:**
1. Load enrollment + template steps
2. Verify enrollment is still `active` (not paused/cancelled)
3. Load recipient, verify not opted out
4. Call existing `sendMessage()` to create & deliver the message
5. Insert `campaign_step_sends` record
6. Update `campaign_enrollments.current_step`
7. If more steps remain, schedule next `PROCESS_CAMPAIGN_STEP` job with `startAfter` = next step's `delayDays`
8. If last step, set enrollment status to `completed`

This reuses the entire existing delivery pipeline — email/SMS routing, access tokens, event tracking, reminders — without duplication.

---

## Server Actions

### Template CRUD (`src/lib/actions/campaigns.ts` — new file)

| Action | Auth | Notes |
|--------|------|-------|
| `getCampaignTemplates()` | any user | List active templates for tenant |
| `getCampaignTemplate(id)` | any user | Single template with steps |
| `createCampaignTemplate(data)` | admin | Insert template |
| `updateCampaignTemplate(id, data)` | admin | Update name, description, steps |
| `deleteCampaignTemplate(id)` | admin | Soft-delete (set is_active=false) |
| `duplicateCampaignTemplate(id)` | admin | Clone to a new template |

### Enrollment Management

| Action | Auth | Notes |
|--------|------|-------|
| `enrollRecipients(templateId, recipientIds[])` | any user | Bulk enroll, schedule first step |
| `getEnrollmentsForTemplate(templateId)` | any user | List enrollments with status + progress |
| `getEnrollmentDetail(enrollmentId)` | any user | Single enrollment with all step send history |
| `pauseEnrollment(enrollmentId)` | any user | Set status=paused, cancel pending jobs |
| `resumeEnrollment(enrollmentId)` | any user | Set status=active, reschedule next step |
| `cancelEnrollment(enrollmentId)` | any user | Set status=cancelled, cancel pending jobs |
| `getActiveCampaigns()` | any user | For the tracking page: all templates with enrollment counts |

---

## UI Changes

### 1. Campaign Templates Page (`/campaigns/templates`)

**List view:**
- Table showing template name, # of steps, total enrolled, date created
- "Create Template" button (admin only)
- Click row → edit/view template

**Template editor (dialog or page):**
- Name + description fields
- **Steps builder:**
  - Each step: name, delay (days from enrollment), content picker (select from library), reminder toggle
  - Add/remove/reorder steps (reuse existing drag-and-drop pattern)
  - Visual timeline preview showing intervals
- Save / Cancel

### 2. Enroll Recipients Flow

**Entry point:** From the campaign template detail page, "Enroll Recipients" button opens a dialog similar to the existing send wizard's recipient step:
- Single recipient input (email/phone)
- Bulk CSV upload
- Roster search from existing recipients
- Preview shows: template name, # steps, total duration, recipient list
- "Enroll" button kicks off the campaign

### 3. Campaign Tracking Page (`/campaigns/[id]/tracking`)

**Overview panel:**
- Template name, description, total steps
- Summary stats: total enrolled, active, completed, paused, cancelled
- Progress chart: how many recipients are at each step

**Enrollment table:**
- Columns: Recipient name/contact, status, current step, enrolled date, last send date
- Status badges with color coding
- Click row → detail view showing per-step delivery status (sent/delivered/opened)
- Actions: pause, resume, cancel per enrollment
- Bulk actions: pause all, cancel all

### 4. Sidebar / Navigation

- Add "Templates" sub-tab under existing Campaigns navigation
- Or add to the existing campaigns page as a second tab: "Campaigns | Templates"

### 5. Dashboard Widget (optional, phase 2)

- "Active Campaigns" card on the dashboard showing running campaigns with progress

---

## Migration Strategy

All new tables — no modifications to existing tables. The `campaign_step_sends.message_id` FK ties into existing `messages`, so all existing analytics, tracking, event logging, and viewer infrastructure works out of the box.

Existing one-shot sends and bulk sends are untouched.

---

## Implementation Order

### Phase 1: Schema + Template CRUD
1. Add new enums and tables to drizzle schema
2. Write + run migration
3. Create `src/lib/actions/campaigns.ts` with template CRUD
4. Build the template list page and editor UI

### Phase 2: Enrollment + Delivery
5. Add `PROCESS_CAMPAIGN_STEP` job type + worker
6. Implement `enrollRecipients()` — creates enrollments, schedules first step
7. Implement pause/resume/cancel with job cancellation
8. Add enrollment dialog UI (reuse recipient picker from send wizard)

### Phase 3: Tracking
9. Build campaign tracking page with enrollment table
10. Build enrollment detail view (per-step delivery timeline)
11. Add campaign stats to existing analytics page

### Phase 4: Polish
12. Add e2e tests for template CRUD and enrollment flow
13. Add template duplication
14. Add visual timeline preview in template editor
15. Seed data with sample pregnancy template

---

## Estimated Scope

- **3 new DB tables** + 1 new enum
- **1 new server actions file** (~12 actions)
- **1 new job worker** (campaign step processor)
- **2–3 new pages** (template list, template editor, campaign tracking)
- **1 new dialog** (enrollment)
- **0 modifications** to existing send/delivery infrastructure

The heaviest lift is the template step editor UI and the tracking page. The backend is straightforward because it leans entirely on the existing pg-boss + messages infrastructure.
