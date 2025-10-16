# Enrollmate Scheduler Integration Prompts

## Context

You are integrating a **course scheduler feature** into an existing Next.js/React/Supabase application called **Enrollmate**. The MVP (currently vanilla HTML/CSS/JS) uses a **backtracking algorithm** to generate conflict-free course schedules.

**Existing app has:**
- Authentication (login/signup)
- Landing, dashboard, profile pages
- Supabase backend

**Goal:** Add a `/scheduler` page where users can:
1. Add courses with multiple section options
2. Set constraints (time windows, section filters)
3. Generate all valid, conflict-free schedules
4. View, filter, sort, and save schedules

**OOP Requirement:** Must demonstrate all 4 OOP concepts (encapsulation, inheritance, abstraction, polymorphism) in the implementation.

---

## Core Data Models (From Existing MVP)

### Subject (Course with Sections)
```typescript
interface Subject {
  courseCode: string;        // e.g., "CIS 2103"
  courseName: string;        // e.g., "Object-Oriented Programming"
  sections: Section[];       // Array of available sections
}
```

### Section (Time Slot Option)
```typescript
interface Section {
  group: number;             // Section identifier (1, 2, 3...)
  schedule: string;          // e.g., "MW 10:00 AM - 11:30 AM"
  enrolled: string;          // e.g., "15/30" (current/total enrollment)
  status: string;            // "OK", "FULL", or "AT-RISK"
}
```

### Parsed Schedule (Internal Representation)
```typescript
interface ParsedSchedule {
  days: string[];            // ["M", "W"] or ["T", "Th"]
  startTime: number;         // Minutes from midnight (e.g., 600 = 10:00 AM)
  endTime: number;           // Minutes from midnight (e.g., 690 = 11:30 AM)
}
```

### Generated Schedule
```typescript
interface GeneratedSchedule {
  selections: Section[];     // One section per course (conflict-free)
  parsed: ParsedSchedule[];  // Parsed time data for rendering
  meta: {
    fullCount: number;       // How many full sections in this schedule
    endsByPreferred: boolean;// Does it meet latest end time preference?
    hasLate: boolean;        // Has classes after preferred end time?
    latestEnd: number;       // Latest class end time in this schedule
  };
}
```

### Constraints (User Preferences)
```typescript
interface Constraints {
  earliestStart: string;      // "HH:MM" format (e.g., "07:30")
  latestEnd: string;          // "HH:MM" format (e.g., "16:30")
  allowFull: boolean;         // Allow full sections?
  allowAtRisk: boolean;       // Allow at-risk sections?
  maxFullPerSchedule: number; // Max full sections per schedule
  maxSchedules: number;       // Max number of schedules to generate
}
```

---

## Core Algorithm: Schedule Generation (Backtracking)

### High-Level Overview

The algorithm uses **backtracking with conflict detection**:

1. **Pre-filter viable sections** - For each course, extract sections that meet constraints (time window, full/at-risk rules)
2. **Early exit** - If any course has zero viable sections, return empty array
3. **Recursive backtracking**:
   - For each course, try each viable section
   - Check for time conflicts with already-selected sections
   - If no conflict, add to current schedule and recurse to next course
   - If all courses covered, save schedule to results
   - Backtrack (remove section) and try next option
4. **Safety limits**:
   - Max 50,000 iterations (prevent runaway recursion)
   - Cap at 100 schedules (performance limit)
   - Stop when user's `maxSchedules` reached

### Key Functions to Port

#### 1. Time Parsing
```
parseSchedule(scheduleString: string): ParsedSchedule | null
- Input: "MW 10:00 AM - 11:30 AM"
- Output: { days: ["M", "W"], startTime: 600, endTime: 690 }
- Handles: M, T, W, Th (special case), F
- Returns null if unparseable
```

#### 2. Conflict Detection
```
hasTimeConflict(schedule1: ParsedSchedule, schedule2: ParsedSchedule): boolean
- Check if schedules share any days
- If yes, check if time ranges overlap:
  - start1 < end2 AND start2 < end1
- Return true if conflict exists
```

#### 3. Section Classification
```
isFullSection(section: Section): boolean
- Parse enrollment string "X/Y"
- Return true if current >= total

isAtRiskSection(section: Section): boolean
- Return true if:
  - Enrolled = 0 (empty section)
  - Total >= 40 AND current <= 6 (underfilled large section)
  - Total >= 18 AND current <= 2 (very underfilled small section)
```

#### 4. Section Viability
```
isViableSection(section: Section, constraints: Constraints): boolean
- Check if section meets user constraints:
  1. If full and !allowFull, reject
  2. If at-risk and !allowAtRisk, reject
  3. Parse schedule (reject if unparseable)
  4. Check if startTime >= earliestStart
- Return true if all checks pass
```

#### 5. Main Generation Function
```
generateValidSchedules(subjects: Subject[], constraints: Constraints): GeneratedSchedule[]
- Pre-filter viable sections for each subject
- If any subject has 0 viable sections, return []
- Run backtracking algorithm
- For each complete schedule:
  - Count full sections
  - Apply maxFullPerSchedule constraint
  - Calculate metadata (endsByPreferred, hasLate, latestEnd)
- Return array of GeneratedSchedule objects
```

### Pseudo-code for Backtracking
```
function backtrack(index, current):
  if reached max iterations (50,000):
    return

  if reached max schedules:
    return

  if index >= subjects.length:
    # Base case: all courses covered
    fullCount = count full sections in current
    if fullCount > maxFullPerSchedule:
      return

    parsed = parse all sections in current
    meta = calculate metadata (endsByPreferred, hasLate, etc.)
    results.push({ selections: current, parsed, meta })
    return

  # Recursive case: try each viable section for current subject
  for each section in viableSections[index]:
    conflict = false
    for each selected in current:
      if hasTimeConflict(section, selected):
        conflict = true
        break

    if not conflict:
      current.push(section)
      backtrack(index + 1, current)
      current.pop()  # Backtrack
```

---

## UI Components to Build

### 1. Course Input Panel (Left Side)

**Purpose:** Allow users to add courses and their sections

**Features:**
- Form with fields:
  - Course Code (text input)
  - Course Name (text input)
  - Sections (dynamic list):
    - Group number
    - Schedule string (e.g., "MW 10:00 AM - 11:30 AM")
    - Enrollment (e.g., "15/30")
  - "Add Section" button (dynamic row builder)
  - "Submit" button (add subject to list)

- Subject List Display:
  - Each subject shows:
    - Course code and name
    - Section count
    - "Remove" button
    - "Add Section" button
  - Section chips:
    - Group #, schedule, enrollment
    - Color-coded by status:
      - Blue: OK
      - Yellow: At-risk
      - Red: Full
    - Click to remove

**Optional Enhancements:**
- CSV import/export buttons
- Pre-built sample datasets (dropdown selector)
- Integration with university course catalog API
- Autocomplete for course codes

---

### 2. Constraints Panel (Right Side)

**Purpose:** Set scheduling preferences

**Features:**
- Time Window:
  - Earliest Start (time input, default 07:30)
  - Latest End (time input, default 16:30)

- Section Filtering:
  - Allow Full Sections (checkbox)
  - Max Full Sections per Schedule (number input, default 1)
  - Allow At-Risk Sections (checkbox)

- Generation Control:
  - Max Schedules (range slider, 1-50, default 20)
  - "Generate Schedules" button
  - Generation status display (e.g., "Generated 15 schedules in 234ms")

**Optional Enhancements:**
- Save preferences to user profile (Supabase)
- Load saved preferences on page load
- Named preference profiles (e.g., "Morning Person", "Night Owl")

---

### 3. Results Panel

**Purpose:** Display and filter generated schedules

#### A. Summary Statistics Bar
- Total schedules count
- Count ending by preferred time
- Count with late classes
- Count with full sections

#### B. Filter Tabs
- "All" - Show all generated schedules
- "Ends by [TIME]" - Only schedules meeting latest end constraint
- "Has Late Classes" - Schedules with evening classes
- "Has Full Sections" - Schedules with full enrollment

#### C. Sort Dropdown
- Best match (score: +2 for ends by preference, +1 for no full sections, -0.01/hour over preference)
- Earliest end time
- Fewest full sections

#### D. Schedule Cards (2-column grid)

**Each card displays:**

**Header:**
- Schedule number (#1, #2, etc.)
- Badges:
  - Green: "Ends by [TIME]" (if meets preference)
  - Red: "Has Late Classes" (if exceeds preference)
  - Green: "No Full Sections" or Red: "Has Full Sections"

**Timetable Grid:**
- 5-column grid (Monday-Friday)
- Time-based rows
- Color-coded blocks:
  - Blue: OK sections
  - Yellow: At-risk sections
  - Red: Full sections
- Block content: Group # • Start-End time

**Subject Listing Table:**
- Course Code | Group # | Schedule | Enrollment | Status

**Actions:**
- "Copy to Clipboard" button (plain text format)
- "Save Schedule" button (persist to Supabase)
- Optional: "Share" button (generate shareable link)

---

## Implementation Roadmap (Step-by-Step)

### Phase 1: Core Algorithm Migration (No UI)

**Goal:** Extract and test the schedule generation logic in isolation

**Step 1:** Create utility module `scheduler.ts`
- Port time parsing functions (`parseSchedule`, `toMinutesFromTimeInput`, etc.)
- Port conflict detection (`hasTimeConflict`)
- Port section classification (`isFullSection`, `isAtRiskSection`, `isViableSection`)
- Port generation algorithm (`generateValidSchedules`)
- Add TypeScript types (Subject, Section, Constraints, GeneratedSchedule)

**Testing:**
- Create sample data fixture (3-5 courses with 2-3 sections each)
- Call `generateValidSchedules(sampleSubjects, sampleConstraints)`
- Verify:
  - Returns non-empty array
  - All schedules have no time conflicts (validate pairwise)
  - Schedules respect constraints (no full sections if allowFull=false)
- Test edge cases:
  - All sections full with allowFull=false (expect empty array)
  - Unsatisfiable constraints (expect empty array)
  - Large dataset (10+ courses) - measure performance

**Expected Outcome:** Working `scheduler.ts` module with unit tests passing

---

### Phase 2: Data Models & Supabase Integration

**Goal:** Define database schema and data access layer

**Step 2:** Create Supabase tables

```sql
-- Course catalog (pre-populated by admin or imported)
CREATE TABLE course_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_code VARCHAR(50) NOT NULL,
  course_name TEXT NOT NULL,
  section_group INT NOT NULL,
  schedule VARCHAR(100) NOT NULL,
  enrolled_current INT DEFAULT 0,
  enrolled_total INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for filtering by course code
CREATE INDEX idx_course_sections_code ON course_sections(course_code);

-- User-saved schedules
CREATE TABLE user_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  sections_json JSONB NOT NULL, -- Array of section IDs
  constraints_json JSONB,       -- Stored constraints
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fetching user's schedules
CREATE INDEX idx_user_schedules_user ON user_schedules(user_id);

-- User preferences (optional)
CREATE TABLE schedule_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  default_earliest_start TIME DEFAULT '07:30',
  default_latest_end TIME DEFAULT '16:30',
  allow_full_sections BOOLEAN DEFAULT false,
  allow_at_risk_sections BOOLEAN DEFAULT true,
  max_full_per_schedule INT DEFAULT 1,
  max_schedules INT DEFAULT 20,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Step 3:** Create data access layer `courseAPI.ts`

```typescript
// Fetch all available courses
async function fetchCourseSections(): Promise<Subject[]>

// Fetch specific courses by code
async function fetchCoursesByCodes(codes: string[]): Promise<Subject[]>

// Save user schedule
async function saveSchedule(
  userId: string,
  name: string,
  sections: Section[],
  constraints: Constraints
): Promise<{ id: string }>

// Load user's saved schedules
async function fetchUserSchedules(userId: string): Promise<SavedSchedule[]>

// Delete saved schedule
async function deleteSchedule(scheduleId: string): Promise<void>
```

**Testing:**
- Insert sample course data into `course_sections` table
- Test `fetchCourseSections()` - verify data structure matches Subject interface
- Test `saveSchedule()` - verify data persists correctly
- Test `fetchUserSchedules()` - verify user isolation (users only see their schedules)

**Expected Outcome:** Working API layer with database integration

---

### Phase 3: Basic UI (No Styling)

**Goal:** Build functional React components

**Step 4:** Create React component structure

```
app/scheduler/page.tsx
  ├── CourseInputPanel
  │   ├── CourseForm (add course with sections)
  │   ├── SubjectList (display added courses)
  │   └── SectionChip (individual section display)
  ├── ConstraintsPanel
  │   ├── TimeWindowInputs
  │   ├── SectionFilterToggles
  │   └── GenerateButton
  └── ResultsPanel
      ├── SummaryStats
      ├── FilterTabs
      ├── SortDropdown
      └── ScheduleCard[]
          ├── ScheduleHeader (badges)
          ├── TimetableGrid
          ├── SubjectTable
          └── ActionButtons
```

**Step 5:** Implement CourseInputPanel
- Create form with controlled inputs (React state)
- Add dynamic section builder (add/remove rows)
- Implement "Add Subject" button (update state array)
- Render subject list with remove functionality
- Section chips with status colors

**Manual Test:**
- Add 3 courses with 2-3 sections each
- Verify state updates correctly
- Remove a course - verify it disappears
- Add/remove sections dynamically

**Expected Outcome:** Working course input with state management

---

### Phase 4: Connect Generation Algorithm

**Goal:** Wire up the scheduler algorithm to UI

**Step 6:** Implement ConstraintsPanel
- Create form with time inputs (HH:MM format)
- Add checkboxes for full/at-risk sections
- Add range slider for max schedules
- Implement "Generate Schedules" button:
  - Read form values → Constraints object
  - Call `generateValidSchedules(subjects, constraints)`
  - Store results in state
  - Display generation stats (count, time elapsed)

**Manual Test:**
- Enter 3 courses
- Set constraints (e.g., earliest 8:00, latest 16:00, no full sections)
- Click "Generate Schedules"
- Verify:
  - Results array is populated
  - Console logs show generation time
  - No JavaScript errors

**Expected Outcome:** Functional generation with results in state

---

### Phase 5: Results Display

**Goal:** Render generated schedules

**Step 7:** Implement ResultsPanel components

**A. Summary Stats:**
- Display counts from results metadata
- Update on every generation

**B. Filter Tabs:**
- Implement tab state (activeTab: 'all' | 'endsBy' | 'late' | 'full')
- Filter results array based on activeTab
- Update label with dynamic time (e.g., "Ends by 4:30 PM")

**C. Sort Dropdown:**
- Implement sort function (best, earliest, fewestFull)
- Re-sort filtered results on dropdown change

**D. Schedule Cards:**
- Map over filtered results
- Render card with:
  - Header (number + badges)
  - Subject table (course code, group, schedule, enrollment, status)
  - Action buttons (copy, save)

**Manual Test:**
- Generate schedules
- Verify all schedules display
- Click "Ends by" tab - verify filtered correctly
- Change sort to "Earliest end time" - verify order changes
- Click "Copy to Clipboard" - verify text format

**Expected Outcome:** Full results display with filtering and sorting

---

### Phase 6: Timetable Grid Visualization

**Goal:** Add visual schedule grid

**Step 8:** Implement TimetableGrid component

**Logic:**
1. Extract unique days from schedule (M, T, W, Th, F)
2. Extract time range (earliest start → latest end)
3. Create grid:
   - Columns: Day labels (Mon, Tue, Wed, Thu, Fri)
   - Rows: Time slots (30-min or 1-hour increments)
4. Place blocks:
   - For each section in schedule:
     - Parse days and time
     - Calculate grid position (row/column span)
     - Render colored block with course info

**Styling:**
- Use CSS Grid for layout
- Color-code by status (blue/yellow/red)
- Display: Group # • Time range

**Manual Test:**
- Generate schedules
- Verify grid renders correctly
- Check block positioning (no overlaps in visual grid)
- Verify colors match section status

**Expected Outcome:** Visual timetable grid for each schedule

---

### Phase 7: Persistence & User Features

**Goal:** Save schedules to database

**Step 9:** Implement "Save Schedule" functionality

**Flow:**
1. User clicks "Save Schedule" button on card
2. Prompt for schedule name (modal or inline input)
3. Extract section IDs from schedule
4. Call `saveSchedule(userId, name, sections, constraints)`
5. Show success message
6. Add saved schedule ID to card state (disable save button)

**Step 10:** Implement "Load Saved Schedules" view

**Features:**
- Add tab/section to view saved schedules
- Fetch saved schedules on page load
- Render saved schedules similarly to generated ones
- Add "Delete" button for saved schedules

**Manual Test:**
- Generate schedules
- Save a schedule with name "My Schedule"
- Refresh page
- Navigate to "Saved Schedules" view
- Verify saved schedule appears
- Delete schedule - verify it's removed

**Expected Outcome:** Full persistence with CRUD operations

---

### Phase 8: Polish & Enhancements

**Goal:** Improve UX and edge cases

**Step 11:** Error handling & validation

- Validate time inputs (HH:MM format, start < end)
- Validate course form (required fields)
- Handle empty results gracefully (show message: "No valid schedules found. Try relaxing constraints.")
- Handle API errors (show error banner)
- Loading states during generation and API calls

**Step 12:** Performance optimizations

- Debounce generation button (prevent double-clicks)
- Show loading spinner during generation
- Paginate results if > 20 schedules (or virtual scrolling)
- Memoize expensive calculations (React.useMemo for sorting)

**Step 13:** Responsive design

- Mobile layout (single column)
- Tablet layout (adjust grid)
- Desktop layout (2-column results, side panels)

**Step 14:** Accessibility

- ARIA labels for buttons and inputs
- Keyboard navigation for tabs and dropdowns
- Focus management for modals
- Screen reader announcements for generation status

**Expected Outcome:** Production-ready scheduler page

---

## Trade-offs & Architectural Decisions

### Decision 1: Client-Side vs. Server-Side Generation

**Options:**

**A. Client-Side (Current Approach):**
- **Pros:**
  - Instant results (no API latency)
  - No server load (scales for free)
  - Works offline once page loads
- **Cons:**
  - Slow for large datasets (15+ courses)
  - Browser tab freezes during generation
  - Duplicate computation for same constraints
- **Best for:** Small-medium datasets (< 10 courses), single user

**B. Server-Side (API Route):**
- **Pros:**
  - Handles large datasets efficiently
  - Can cache results (same courses + constraints)
  - Doesn't block UI (async)
- **Cons:**
  - API latency (~100-500ms)
  - Server costs (compute + memory)
  - Requires backend infrastructure
- **Best for:** Large datasets (10+ courses), multi-user platform

**C. Web Worker (Hybrid):**
- **Pros:**
  - Non-blocking UI (runs in background thread)
  - Still client-side (no server costs)
  - Instant for small datasets
- **Cons:**
  - Adds complexity (worker communication)
  - Still slow for large datasets
  - Browser compatibility concerns (minimal)
- **Best for:** Medium datasets with UX priority

**Recommendation for MVP:** Start with **client-side** (Option A)
- Simplest implementation
- Sufficient for typical use case (5-8 courses)
- Can migrate to Web Worker later if needed

**Migration Path:**
- If generation exceeds 2 seconds, add loading spinner and warning
- If users report slowness, implement Web Worker
- If Web Worker insufficient, move to server-side

---

### Decision 2: Course Data Management

**Options:**

**A. Manual Input Only (Current MVP):**
- **Pros:** No dependencies, works immediately
- **Cons:** Tedious for users, error-prone
- **Best for:** Testing, small-scale use

**B. CSV Import:**
- **Pros:** Easy for users with spreadsheets, bulk import
- **Cons:** Requires parsing logic, no validation
- **Best for:** Power users, data migration

**C. University API Integration:**
- **Pros:** Always up-to-date, accurate data, zero user effort
- **Cons:** Requires API access, rate limits, data format mapping
- **Best for:** Production platform for specific university

**D. Admin-Managed Catalog:**
- **Pros:** Curated data, controlled updates, searchable
- **Cons:** Requires admin panel, initial data entry effort
- **Best for:** Multi-user platform serving one institution

**Recommendation for MVP:** Start with **A + B** (Manual + CSV)
- Manual input for quick testing
- CSV import for bulk data (power users)
- Plan for **C or D** as next phase based on user feedback

---

### Decision 3: Schedule Persistence Strategy

**Options:**

**A. Session Storage (No Persistence):**
- **Pros:** Zero backend work, instant
- **Cons:** Lost on refresh, no cross-device sync
- **Best for:** Quick prototyping

**B. Supabase Database (Full Persistence):**
- **Pros:** Cross-device, shareable, historical data
- **Cons:** API calls, auth required, storage costs
- **Best for:** Production platform

**C. Browser LocalStorage:**
- **Pros:** Persists locally, no backend, fast
- **Cons:** No cross-device, limited storage (5MB)
- **Best for:** Single-device use, MVP without backend

**Recommendation:** Use **Supabase (Option B)**
- You already have auth and database
- Enables future features (sharing, history, analytics)
- Minimal incremental work

---

### Decision 4: Constraint Validation Timing

**Options:**

**A. Validate on Input (Real-Time):**
- Show error if earliest > latest immediately
- Disable "Generate" button if invalid
- **Pros:** Prevents errors, clear feedback
- **Cons:** Can be annoying (errors while typing)

**B. Validate on Submit:**
- Only check when "Generate" clicked
- Show error message if invalid
- **Pros:** Less intrusive, simpler logic
- **Cons:** User wasted effort if invalid

**Recommendation:** Use **A** (Real-Time) with debouncing
- Validate on blur or after 500ms pause
- Show inline error messages (red text below input)
- Disable button only if errors exist

---

## Testing Strategy (Manual)

### Test Case 1: Happy Path (Typical User Flow)

**Setup:**
- Add 5 courses with 3 sections each
- Set constraints: earliest 8:00 AM, latest 5:00 PM, no full sections

**Steps:**
1. Input course data (manually or CSV import)
2. Set constraints
3. Click "Generate Schedules"
4. View results
5. Filter by "Ends by 5:00 PM"
6. Sort by "Earliest end time"
7. Click "Copy to Clipboard" on schedule #1
8. Click "Save Schedule" on schedule #2
9. Name it "Spring 2025 - Option 1"
10. Refresh page
11. Navigate to "Saved Schedules"
12. Verify saved schedule appears

**Expected Outcome:**
- All schedules displayed (should be < 20)
- Filtered view shows only schedules ending by 5:00 PM
- Sorted correctly (earliest first)
- Clipboard contains readable text format
- Saved schedule persists after refresh

---

### Test Case 2: Edge Case - Unsatisfiable Constraints

**Setup:**
- Add 3 courses where all sections conflict (e.g., all at MW 10:00-11:30)
- Set constraints: earliest 8:00 AM, latest 5:00 PM

**Steps:**
1. Input conflicting courses
2. Click "Generate Schedules"

**Expected Outcome:**
- Message displayed: "No valid schedules found. Try relaxing constraints."
- No error in console
- UI remains functional

---

### Test Case 3: Edge Case - All Sections Full

**Setup:**
- Add 3 courses with all sections marked FULL
- Set constraints: allowFull = false

**Steps:**
1. Input courses with full sections
2. Set allowFull to false
3. Click "Generate Schedules"

**Expected Outcome:**
- Message displayed: "No valid schedules found. Try allowing full sections."
- Suggest enabling "Allow Full Sections" toggle

---

### Test Case 4: Performance - Large Dataset

**Setup:**
- Add 10 courses with 5 sections each

**Steps:**
1. Input large dataset (use CSV import for speed)
2. Click "Generate Schedules"
3. Measure time to complete

**Expected Outcome:**
- If < 2 seconds: No action needed
- If 2-5 seconds: Show loading spinner + progress message
- If > 5 seconds: Consider Web Worker or server-side generation

---

### Test Case 5: Validation - Invalid Time Format

**Setup:**
- Enter invalid time in "Earliest Start" field (e.g., "25:00" or "abc")

**Steps:**
1. Type invalid value
2. Blur field (click away)

**Expected Outcome:**
- Red error message below field: "Invalid time format. Use HH:MM (e.g., 08:30)"
- "Generate Schedules" button disabled

---

### Test Case 6: Mobile Responsiveness

**Setup:**
- Open scheduler page on mobile device (or browser dev tools mobile view)

**Steps:**
1. Add courses
2. Set constraints
3. Generate schedules
4. View results
5. Interact with timetable grid

**Expected Outcome:**
- Layout adapts to single column
- Form inputs are thumb-friendly (larger touch targets)
- Timetable grid scrolls horizontally if needed
- All features functional on mobile

---

## Rollback Plan

If scheduler integration breaks existing functionality:

**Step 1:** Isolate the scheduler page
- Ensure scheduler route is separate: `/app/scheduler/page.tsx`
- Does NOT import/modify existing pages
- Only uses shared auth/layout components

**Step 2:** Test existing pages
- Verify login, signup, dashboard, profile still work
- Check no shared state conflicts (use React Context carefully)

**Step 3:** If issues arise:
- Remove scheduler route
- Revert any shared component changes
- Deploy as separate branch for testing

**Minimal Viable Fallback:**
- Comment out scheduler link in navigation
- Keep code in repo but inaccessible to users
- Debug offline, re-enable once stable

---

## Future Enhancement Ideas (Out of Scope for MVP)

### Phase 9: Advanced Features (Post-Launch)

1. **Preference Ranking:**
   - Allow users to rank sections by preference (professor, time, location)
   - Score schedules by preference match

2. **Collaborative Scheduling:**
   - Generate schedules for multiple students
   - Find schedules where friends have common free time

3. **Waitlist Integration:**
   - Track waitlist positions
   - Notify when full sections open up

4. **Historical Data:**
   - Show past enrollment trends
   - Predict likelihood of section filling up

5. **Room Availability:**
   - Cross-check with campus room schedules
   - Warn if section conflicts with room bookings

6. **Co-requisite Validation:**
   - Enforce lab sections paired with lectures
   - Validate prerequisite completion

7. **Export Options:**
   - Export to Google Calendar, iCal, Outlook
   - PDF timetable download

8. **Sharing:**
   - Generate shareable link for schedule
   - Public gallery of optimal schedules (anonymized)

9. **Analytics Dashboard:**
   - Show popular courses, sections, time slots
   - Help university optimize offerings

10. **AI Recommendations:**
    - Suggest courses based on major requirements
    - Predict course difficulty based on reviews

---

## Key Principles to Remember

### Simplicity First
- Build the minimal version that works
- Avoid over-engineering (no Redux if useState works)
- Use existing patterns from your codebase

### Incremental Progress
- Test each phase before moving to next
- Don't build Phase 6 before Phase 1-5 work
- Each phase should be independently deployable

### Manual Testing
- After each phase, manually verify functionality
- Use browser dev tools to inspect state and API calls
- Test edge cases (empty inputs, large datasets, invalid data)

### User-Centric Design
- Prioritize speed (generation should feel instant)
- Clear error messages (actionable, not technical)
- Visual feedback (loading states, success messages)

### Maintainability
- Document complex logic (especially backtracking algorithm)
- Use TypeScript for type safety
- Extract reusable components (ScheduleCard, TimetableGrid)
- Keep functions small (< 50 lines)

---

## Questions to Clarify Before Starting

1. **Course Data Source:**
   - Will you provide CSV files of courses?
   - Do you have access to a university course API?
   - Should users manually enter all courses?

2. **User Scope:**
   - Is this for personal use or multi-user platform?
   - Should schedules be shareable between users?
   - Do you need admin features (manage course catalog)?

3. **Performance Expectations:**
   - How many courses will typical user add (5? 10? 20?)
   - How many sections per course (2? 5? 10?)
   - What's acceptable generation time (< 1s? < 5s? < 30s?)

4. **Existing Codebase:**
   - What UI library/framework are you using? (Next.js App Router? Pages Router?)
   - Are you using a component library? (shadcn/ui, Chakra, Material-UI?)
   - What's your styling approach? (Tailwind? CSS Modules? styled-components?)

5. **MVP Scope:**
   - Must-have features for first version?
   - Nice-to-have features for later?
   - What's your timeline? (1 week? 1 month?)

---

## How to Use This Document with Another LLM

### When Starting a Session:

**Provide this context:**
```
I'm building a scheduler feature for my Next.js/React/Supabase app.
I have a detailed implementation guide. Let me share the relevant sections.

[Copy specific sections of this document based on current phase]

I'm currently working on [Phase X]. Here's my question:
[Your specific question]
```

### Example Prompts:

**Phase 1 (Algorithm):**
```
I'm porting a schedule generation algorithm from vanilla JS to TypeScript.
Here's the data model and algorithm description:

[Paste "Data Models" and "Core Algorithm" sections]

Help me implement the `generateValidSchedules` function in TypeScript.
Focus on the backtracking logic and conflict detection.
```

**Phase 3 (UI Components):**
```
I'm building a React component for course input.
Here's the required functionality:

[Paste "UI Components to Build - Course Input Panel" section]

Help me design the component structure and state management.
I'm using React hooks and TypeScript.
```

**Phase 7 (Persistence):**
```
I need to save generated schedules to Supabase.
Here's my data model:

[Paste "Supabase Schema" from Phase 2]

Help me implement the `saveSchedule` API function.
Handle errors and provide user feedback.
```

---

## Final Checklist

Before considering MVP complete:

- [ ] Algorithm generates valid schedules (no conflicts)
- [ ] UI allows adding courses and sections
- [ ] Constraints form works (time windows, filters)
- [ ] Results display with filtering and sorting
- [ ] Timetable grid renders correctly
- [ ] Copy to clipboard functionality works
- [ ] Save schedule to database works
- [ ] Load saved schedules works
- [ ] Error messages are clear and actionable
- [ ] Mobile layout is usable
- [ ] No console errors in browser
- [ ] Page loads in < 3 seconds
- [ ] Generation completes in < 5 seconds for 8 courses
- [ ] All manual test cases pass
- [ ] Code is documented (comments for complex logic)

---

## Summary

This scheduler is a **backtracking-based schedule generator** that:
1. Takes courses with multiple sections
2. Applies user constraints
3. Generates all valid, conflict-free combinations
4. Presents results with filtering, sorting, and visualization
5. Persists schedules to user profiles

**Core Value Proposition:** Saves students hours by automatically finding ALL valid schedule options instead of manual trial-and-error.

**Technical Complexity:** Moderate
- Algorithm: Backtracking with pruning (well-defined, portable)
- UI: Standard CRUD with visual rendering
- Backend: Simple Supabase integration

**Success Metrics:**
- Users generate schedules in < 5 seconds
- Users save at least 1 schedule
- Users report saving time compared to manual scheduling

Good luck with the integration! Start with Phase 1, test thoroughly, and iterate based on real usage patterns.
