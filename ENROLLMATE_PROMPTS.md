# Enrollmate Scheduler Integration - Sequential Prompts

## Context

Integrating a **course scheduler** into existing Next.js/React/Supabase app called **Enrollmate**. The MVP uses a **backtracking algorithm** to generate conflict-free schedules from courses with multiple section options.

**Existing app:** Authentication, dashboard, profile pages, Supabase backend
**Goal:** Add `/scheduler` page for generating and saving course schedules
**OOP Requirement:** Must use all 4 OOP concepts (encapsulation, inheritance, abstraction, polymorphism)

---

## Data Models Reference

```javascript
// Subject (Course)
{
  courseCode: "CIS 2103",
  courseName: "Object-Oriented Programming",
  sections: [...]  // Array of Section objects
}

// Section (Time slot option)
{
  group: 1,                              // Section number
  schedule: "MW 10:00 AM - 11:30 AM",    // Schedule string
  enrolled: "15/30",                      // Current/total enrollment
  status: "OK"                            // OK, FULL, or AT-RISK
}

// Parsed Schedule (Internal)
{
  days: ["M", "W"],     // Array of day codes
  startTime: 600,       // Minutes from midnight
  endTime: 690
}

// Constraints
{
  earliestStart: "07:30",           // HH:MM format
  latestEnd: "16:30",
  allowFull: false,
  allowAtRisk: true,
  maxFullPerSchedule: 1,
  maxSchedules: 20
}

// Generated Schedule
{
  selections: [...],    // Array of selected sections (one per course)
  parsed: [...],        // Array of ParsedSchedule objects
  meta: {
    fullCount: 0,
    endsByPreferred: true,
    hasLate: false,
    latestEnd: 660
  }
}
```

---

## Backtracking Algorithm Core Logic

```javascript
// Key conflict detection function
function hasTimeConflict(schedule1, schedule2) {
  // 1. Check if schedules share any days
  const sharedDays = schedule1.days.filter(d => schedule2.days.includes(d));
  if (sharedDays.length === 0) return false;

  // 2. Check if time ranges overlap
  // Overlap if: start1 < end2 AND start2 < end1
  return schedule1.startTime < schedule2.endTime &&
         schedule2.startTime < schedule1.endTime;
}

// Main generation algorithm (backtracking)
function generateValidSchedules(subjects, constraints) {
  const results = [];
  const viableSections = []; // Pre-filtered sections per subject

  // 1. Pre-filter viable sections for each subject
  for (const subject of subjects) {
    const viable = subject.sections.filter(s => isViableSection(s, constraints));
    if (viable.length === 0) return []; // No solution possible
    viableSections.push(viable);
  }

  // 2. Backtracking recursion
  function backtrack(index, current) {
    // Base case: all courses scheduled
    if (index >= subjects.length) {
      const fullCount = current.filter(isFullSection).length;
      if (fullCount <= constraints.maxFullPerSchedule) {
        results.push(createScheduleObject(current));
      }
      return;
    }

    // Recursive case: try each viable section for current subject
    for (const section of viableSections[index]) {
      // Check conflicts with already-selected sections
      let conflict = false;
      const parsed = parseSchedule(section.schedule);

      for (const selected of current) {
        const selectedParsed = parseSchedule(selected.schedule);
        if (hasTimeConflict(parsed, selectedParsed)) {
          conflict = true;
          break;
        }
      }

      // No conflict: add and recurse
      if (!conflict) {
        current.push(section);
        backtrack(index + 1, current);
        current.pop(); // Backtrack
      }
    }
  }

  backtrack(0, []);
  return results.slice(0, constraints.maxSchedules); // Safety limit
}
```

**Critical functions to port:**
- `parseSchedule(scheduleString)` - Parses "MW 10:00 AM - 11:30 AM" to days/times
- `hasTimeConflict(s1, s2)` - Detects overlapping schedules
- `isViableSection(section, constraints)` - Validates section against constraints
- `isFullSection(section)` - Checks if enrollment is full
- `isAtRiskSection(section)` - Checks if section is underfilled

---

## Prompt 1: Create OOP-Based Scheduler Core Classes

**Goal:** Build the scheduler logic using JavaScript classes with all 4 OOP principles

**Copy this:**

```
Create the core scheduler classes in a new file `lib/scheduler/SchedulerEngine.js`:

1. Create an abstract base class ScheduleParser:
   - Abstract method: parse(scheduleString) - to be implemented by subclasses
   - Concrete method: toMinutes(timeStr) - converts HH:MM to minutes
   - This demonstrates ABSTRACTION (abstract parse method) and ENCAPSULATION (private time conversion logic)

2. Create class StandardScheduleParser extends ScheduleParser:
   - Implements parse(scheduleString) for format "MW 10:00 AM - 11:30 AM"
   - Returns {days: ["M", "W"], startTime: 600, endTime: 690} or null
   - Handles day codes: M, T, W, Th (special case), F
   - This demonstrates INHERITANCE (extends ScheduleParser)

3. Create class Section:
   - Constructor takes: group, schedule, enrolled, status
   - Private fields: #parsedSchedule (cached parsed result)
   - Methods:
     - getParsedSchedule() - returns parsed schedule (lazy load/cache)
     - isFull() - checks if enrolled current >= total
     - isAtRisk() - checks if underfilled (0 enrolled, or large section with <6, or medium section with <2)
     - isViable(constraints) - checks if section meets constraints
   - This demonstrates ENCAPSULATION (private parsed cache, public methods)

4. Create class ConflictDetector:
   - Static method: hasConflict(section1, section2)
   - Takes two Section objects, compares their parsed schedules
   - Returns true if they share days AND times overlap
   - This demonstrates POLYMORPHISM (can work with any Section subclass if you later extend it)

5. Create class ScheduleGenerator:
   - Constructor takes: sections array, constraints object
   - Method: generate() - runs backtracking algorithm
   - Private method: #backtrack(index, current, results) - recursive helper
   - Returns array of generated schedule objects
   - Each schedule has: selections (sections), parsed (times), meta (fullCount, endsByPreferred, etc.)

File structure:
- Export: ScheduleParser (abstract), StandardScheduleParser, Section, ConflictDetector, ScheduleGenerator
- Use ES6 class syntax with private fields (#fieldName)
- Add JSDoc comments for each class/method

After this, all scheduler logic should be encapsulated in OOP classes.
```

**Test:** Import classes and verify you can create Section objects and call methods

---

## Prompt 2: Create Supabase Database Schema

**Goal:** Set up database tables for course data and user schedules

**Copy this:**

```
Create Supabase migration for scheduler tables:

1. Create table course_sections:
   - id: UUID primary key (auto-generated)
   - course_code: VARCHAR(50) NOT NULL
   - course_name: TEXT NOT NULL
   - section_group: INT NOT NULL
   - schedule: VARCHAR(100) NOT NULL (e.g., "MW 10:00 AM - 11:30 AM")
   - enrolled_current: INT DEFAULT 0
   - enrolled_total: INT NOT NULL
   - created_at: TIMESTAMP DEFAULT NOW()
   - Add index on course_code for fast filtering

2. Create table user_schedules:
   - id: UUID primary key
   - user_id: UUID references auth.users(id) ON DELETE CASCADE
   - name: VARCHAR(255) (user's label for schedule)
   - sections_json: JSONB NOT NULL (array of section objects)
   - constraints_json: JSONB (stored constraints used)
   - created_at: TIMESTAMP DEFAULT NOW()
   - Add index on user_id

3. Create table schedule_preferences (optional):
   - id: UUID primary key
   - user_id: UUID references auth.users(id) ON DELETE CASCADE
   - default_earliest_start: TIME DEFAULT '07:30'
   - default_latest_end: TIME DEFAULT '16:30'
   - allow_full_sections: BOOLEAN DEFAULT false
   - allow_at_risk_sections: BOOLEAN DEFAULT true
   - max_full_per_schedule: INT DEFAULT 1
   - max_schedules: INT DEFAULT 20

Generate the SQL migration file and apply it to your Supabase project. Add a few sample courses to course_sections table for testing.
```

**Test:** Query course_sections table and verify sample data exists

---

## Prompt 3: Create Data Access Layer

**Goal:** Build API functions for fetching/saving scheduler data

**Copy this:**

```
Create `lib/scheduler/schedulerAPI.js` with Supabase client functions:

1. fetchCourseSections() - async function:
   - Query all rows from course_sections table
   - Group by course_code into Subject objects: {courseCode, courseName, sections: [...]}
   - Each section has: {group, schedule, enrolled, status} (compute status from enrolled_current/total)
   - Return array of Subject objects

2. fetchCoursesByCodes(courseCodes) - async function:
   - Same as above but filter by array of course codes
   - Use Supabase .in() filter

3. saveUserSchedule(userId, name, sections, constraints) - async function:
   - Insert into user_schedules table
   - sections_json should store array of section objects (not IDs, full objects for display)
   - constraints_json stores the constraints used to generate
   - Return the inserted schedule ID

4. fetchUserSchedules(userId) - async function:
   - Query user_schedules where user_id matches
   - Order by created_at DESC
   - Return array of schedule objects

5. deleteUserSchedule(scheduleId) - async function:
   - Delete from user_schedules where id matches
   - Return success boolean

Use the Supabase client from your existing app setup. Add error handling (try/catch) and log errors to console.
```

**Test:** Call fetchCourseSections() and verify it returns Subject objects with sections array

---

## Prompt 4: Build Scheduler Page UI Components

**Goal:** Create React components for the scheduler page

**Copy this:**

```
Create `app/scheduler/page.js` with three main sections:

1. CourseInputPanel component (left side):
   - Form to add courses:
     - Course code input
     - Course name input
     - Sections array (dynamic rows):
       - Group number, schedule string, enrollment
       - "Add Section" button adds row
     - "Add Course" button submits
   - Display added courses list:
     - Course code + name
     - Section chips (colored by status: blue=OK, yellow=AT-RISK, red=FULL)
     - Remove course button
   - Use React useState for courses array

2. ConstraintsPanel component (right side):
   - Time inputs: earliest start (default 07:30), latest end (default 16:30)
   - Checkboxes: allow full sections, allow at-risk sections
   - Number input: max full sections per schedule (default 1)
   - Range slider: max schedules (1-50, default 20)
   - "Generate Schedules" button
   - Use React useState for constraints object

3. ResultsPanel component (below):
   - Summary stats: total schedules, ends by time, has late, has full
   - Filter tabs: All, Ends by [TIME], Has Late, Has Full
   - Sort dropdown: Best match, Earliest end, Fewest full
   - Schedule cards grid (2 columns):
     - Card shows: schedule number, badges (ends by time, full sections)
     - Subject table: course code, group, schedule, enrollment, status
     - "Copy" button (copy text to clipboard)
     - "Save" button (save to database)

Layout: Use CSS Grid or Flexbox. Top section has 2 columns (input left, constraints right), bottom section full width for results.

Wire up the generate button to:
1. Read courses and constraints from state
2. Create Section objects from course data
3. Call ScheduleGenerator.generate()
4. Store results in state
5. Pass to ResultsPanel for display

Import and use the SchedulerEngine classes from Prompt 1.
```

**Test:** Manually add 2-3 courses, set constraints, click generate - verify results appear

---

## Prompt 5: Implement Results Display and Filtering

**Goal:** Complete the ResultsPanel with filtering, sorting, and visual timetable

**Copy this:**

```
Enhance the ResultsPanel component:

1. Filter logic:
   - When user clicks tab, filter generated schedules array:
     - "All": no filter
     - "Ends by": filter where meta.endsByPreferred === true
     - "Has Late": filter where meta.hasLate === true
     - "Has Full": filter where meta.fullCount > 0
   - Update filtered array in state

2. Sort logic:
   - "Best match": score = (endsByPreferred ? 2 : 0) + (fullCount === 0 ? 1 : 0) - (latestEnd - latestEndConstraint) * 0.01
   - "Earliest end": sort by meta.latestEnd ascending
   - "Fewest full": sort by meta.fullCount ascending, then latestEnd

3. ScheduleCard component:
   - Props: schedule object, index
   - Header: "#N" + badges (green/red pills for ends-by/full status)
   - Subject table: map over schedule.selections, display course code, group, schedule, enrollment, status
   - TimetableGrid sub-component:
     - 5 columns (Mon-Fri)
     - Rows for time slots (extract min/max time from schedule)
     - Place colored blocks for each section (parse days/times)
     - Block shows: Group # • Time range
     - Color by status (blue/yellow/red)
   - "Copy" button: copy schedule as plain text to clipboard using navigator.clipboard.writeText()
   - "Save" button: prompt for name, call saveUserSchedule API, show success message

4. Add loading state during generation (show spinner)

5. Handle empty results: show message "No valid schedules found. Try relaxing constraints."

Use React hooks (useState, useEffect) for state management. Style with CSS modules or Tailwind.
```

**Test:** Generate schedules, test filtering tabs, test sorting, test copy/save buttons

---

## Prompt 6: Add Saved Schedules View

**Goal:** Show user's saved schedules with load/delete functionality

**Copy this:**

```
Add a "Saved Schedules" section to the scheduler page:

1. Add tab navigation: "Generate New" | "Saved Schedules"

2. When "Saved Schedules" tab active:
   - Fetch user's schedules using fetchUserSchedules(userId)
   - Display as grid of cards similar to generated schedules
   - Each card shows:
     - Schedule name (user's label)
     - Created date
     - Subject list (from sections_json)
     - Same timetable grid as generated schedules
     - "Load" button: populate CourseInputPanel with this schedule's courses
     - "Delete" button: call deleteUserSchedule, refresh list

3. When "Load" clicked:
   - Switch back to "Generate New" tab
   - Pre-fill courses from saved schedule
   - Pre-fill constraints from saved constraints_json
   - User can modify and re-generate

4. Add authentication check:
   - Use Supabase auth to get current user ID
   - If not logged in, show message "Please log in to save schedules"
   - Disable save button if not authenticated

Use Supabase auth.getUser() to check authentication status. Add loading state while fetching saved schedules.
```

**Test:** Save a schedule, navigate to "Saved Schedules", verify it appears, test load/delete

---

## Prompt 7: Add CSV Import/Export and Polish

**Goal:** Final features and UX improvements

**Copy this:**

```
Add final features to scheduler page:

1. CSV Import (in CourseInputPanel):
   - Add file input button
   - Parse CSV format: Course Code, Course Name, Group, Schedule, Enrolled
   - Convert rows to Subject objects
   - Replace current courses array
   - Use FileReader API to read file

2. CSV Export (in CourseInputPanel):
   - Add "Export CSV" button
   - Convert courses array to CSV string
   - Trigger browser download using Blob and URL.createObjectURL
   - Filename: "enrollmate_courses_[date].csv"

3. Sample Data Loader (optional):
   - Add dropdown: "Load Sample: CS Courses | Literature | Chemistry"
   - Load pre-defined sample data from JSON file
   - Helps with demo/testing

4. Input Validation:
   - Earliest start < latest end (show error if invalid)
   - Required fields for course form (course code, name, at least 1 section)
   - Schedule format validation (basic regex check for "DAY TIME - TIME")
   - Show error messages inline (red text below inputs)

5. UX Polish:
   - Add loading spinner during generation
   - Show generation time in results header ("Generated 15 schedules in 234ms")
   - Add success toast when saving schedule
   - Add confirmation dialog for delete actions
   - Disable "Generate" button while processing
   - Make layout responsive (mobile: single column, desktop: 2 columns)

6. Error Handling:
   - Try/catch around API calls
   - Show user-friendly error messages in UI (not console)
   - Handle empty course list (disable generate button)
   - Handle Supabase errors (network issues, auth errors)

Test all edge cases: invalid input, empty results, large datasets (10+ courses), CSV import with bad data.
```

**Test:** Import CSV, export CSV, test validation errors, test mobile layout, verify error handling

---

## OOP Concepts Implementation Summary

**Encapsulation:**
- Section class with private #parsedSchedule field and public methods (getParsedSchedule, isFull, etc.)
- ScheduleGenerator class with private #backtrack method

**Inheritance:**
- StandardScheduleParser extends abstract ScheduleParser base class

**Abstraction:**
- ScheduleParser abstract class with abstract parse() method
- Hides parsing complexity behind simple interface

**Polymorphism:**
- ConflictDetector.hasConflict() works with any Section subclass
- ScheduleParser.parse() can have multiple implementations (Standard, Custom, etc.)

---

## Testing Checklist

After completing all prompts:

1. ✅ Can add courses with multiple sections manually
2. ✅ Can set all constraint options (time, filters, max schedules)
3. ✅ Generate button produces valid schedules (no conflicts)
4. ✅ Filter tabs work correctly (All, Ends by, Late, Full)
5. ✅ Sort dropdown changes order properly
6. ✅ Copy to clipboard works
7. ✅ Save schedule persists to database (logged in users only)
8. ✅ Saved schedules view shows user's schedules
9. ✅ Load saved schedule populates form correctly
10. ✅ Delete schedule removes from database
11. ✅ CSV import/export works
12. ✅ Validation shows appropriate error messages
13. ✅ Works on mobile layout
14. ✅ No console errors during normal operation

---

## Notes

- Start with Prompt 1 (OOP classes) before UI work
- Keep the backtracking algorithm as-is (proven to work)
- Test each prompt before moving to next
- The page should work without auth for generation, but require auth for saving
- Performance: 5-8 courses generates in < 2 seconds (acceptable for MVP)
- If generation is slow (> 5s), add Web Worker later (not in MVP scope)
