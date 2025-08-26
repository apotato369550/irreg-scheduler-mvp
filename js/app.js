// State
const appState = {
  subjects: [], // { courseCode, courseName, sections: [{group, schedule, enrolled, status}]} 
  constraints: {
    earliestStart: '07:30',
    latestEnd: '16:30',
    allowFull: false,
    allowAtRisk: false,
    maxFullPerSchedule: 1,
    maxSchedules: 20,
  },
  generated: {
    schedules: [],
    filtered: [],
    activeTab: 'all',
    sort: 'best',
  },
};

// Utilities: Time parsing and schedule parsing
function toMinutesFromTimeInput(hhmm) {
  const [hh, mm] = hhmm.split(':').map(Number);
  return hh * 60 + mm;
}

function parseAmPmToMinutes(timeStr) {
  // e.g. '10:00 AM' => minutes
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'AM') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }
  return hours * 60 + minutes;
}



const scheduleParseCache = new Map();
  
function parseSchedule(scheduleString) {
  // Check cache first
  if (scheduleParseCache.has(scheduleString)) {
    return scheduleParseCache.get(scheduleString);
  }
  
  if (!scheduleString || typeof scheduleString !== 'string') {
    scheduleParseCache.set(scheduleString, null);
    return null;
  }
  
  const parts = scheduleString.split(/\s+/);
  if (parts.length < 4) {
    scheduleParseCache.set(scheduleString, null);
    return null;
  }
  
  const daysToken = parts[0];
  const timePart = scheduleString.slice(daysToken.length).trim();
  const timeMatch = timePart.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  
  if (!timeMatch) {
    scheduleParseCache.set(scheduleString, null);
    return null;
  }

  // Parse days more efficiently
  const days = [];
  let remaining = daysToken;
  
  // Handle 'Th' first, then single characters
  while (remaining.length > 0) {
    if (remaining.startsWith('Th')) {
      days.push('Th');
      remaining = remaining.slice(2);
    } else if ('MTWF'.includes(remaining[0])) {
      days.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      remaining = remaining.slice(1); // Skip invalid characters
    }
  }

  const start = parseAmPmToMinutes(timeMatch[1]);
  const end = parseAmPmToMinutes(timeMatch[2]);
  
  if (start == null || end == null || start >= end) {
    scheduleParseCache.set(scheduleString, null);
    return null;
  }
  
  const result = { days, startTime: start, endTime: end };
  scheduleParseCache.set(scheduleString, result);
  return result;
}


  // Batch processing for large datasets
  function generateValidSchedulesBatch(subjects, constraints, batchSize = 1000) {
    console.log('Starting batch generation...');
    
    const viablePerSubject = subjects.map(subj => {
      return subj.sections.filter(sec => isViableSection(sec, constraints));
    });
  
    if (viablePerSubject.some(list => list.length === 0)) {
      return [];
    }
  
    const totalCombinations = viablePerSubject.reduce((acc, sections) => acc * sections.length, 1);
    
    if (totalCombinations <= 10000) {
      // Use regular generation for smaller datasets
      return generateValidSchedules(subjects, constraints);
    }
    
    // For large datasets, use sampling approach
    return generateSampledSchedules(viablePerSubject, subjects, constraints, batchSize);
  }
  
  function generateSampledSchedules(viablePerSubject, subjects, constraints, maxSamples) {
    const results = [];
    const attempts = Math.min(maxSamples * 10, 50000); // Try up to 50k random combinations
    
    for (let attempt = 0; attempt < attempts && results.length < maxSamples; attempt++) {
      const selection = [];
      const parsedSchedules = [];
      let valid = true;
      
      // Randomly select one section from each subject
      for (let i = 0; i < viablePerSubject.length; i++) {
        const sections = viablePerSubject[i];
        const randomSection = sections[Math.floor(Math.random() * sections.length)];
        const parsed = parseSchedule(randomSection.schedule);
        
        if (!parsed) {
          valid = false;
          break;
        }
        
        // Check conflicts with previous selections
        for (let j = 0; j < parsedSchedules.length; j++) {
          if (hasTimeConflict(parsed, parsedSchedules[j])) {
            valid = false;
            break;
          }
        }
        
        if (!valid) break;
        
        selection.push(randomSection);
        parsedSchedules.push(parsed);
      }
      
      if (valid && selection.length === subjects.length) {
        // Apply constraints and add to results if valid
        const fullCount = selection.reduce((acc, s) => acc + (isFullSection(s) ? 1 : 0), 0);
        
        if (!constraints.allowFull && fullCount > 0) continue;
        if (constraints.allowFull && fullCount > constraints.maxFullPerSchedule) continue;
        
        // Check if we already have this combination
        const signature = selection.map(s => `${s.group}_${s.schedule}`).join('|');
        if (results.some(r => r.signature === signature)) continue;
        
        const latestEndPref = toMinutesFromTimeInput(constraints.latestEnd);
        const endsByPreferred = parsedSchedules.every(p => p.endTime <= latestEndPref);
        
        results.push({
          selections: selection,
          parsed: parsedSchedules,
          signature,
          meta: {
            fullCount,
            endsByPreferred,
            hasLate: !endsByPreferred,
            latestEnd: Math.max(...parsedSchedules.map(p => p.endTime)),
          },
        });
      }
    }
    
    console.log(`Sampled generation completed: ${results.length} unique schedules from ${attempts} attempts`);
    return results;
  }

function hasTimeConflict(schedule1, schedule2) {
  if (!schedule1 || !schedule2) return false;
  
  // Check day overlap first (cheaper operation)
  const days1 = new Set(schedule1.days);
  const hasCommonDays = schedule2.days.some(d => days1.has(d));
  if (!hasCommonDays) return false;
  
  // Check time overlap
  return schedule1.startTime < schedule2.endTime && schedule2.startTime < schedule1.endTime;
}

function isFullSection(section) {
  const [cur, tot] = section.enrolled.split('/').map(v => parseInt(v.trim(), 10));
  return cur >= tot;
}

function isAtRiskSection(section) {
  const [cur, tot] = section.enrolled.split('/').map(v => parseInt(v.trim(), 10));
  if (cur === 0) return true;
  if (tot >= 40 && cur <= 6) return true;
  if (tot >= 18 && cur <= 2) return true;
  return false;
}

function isViableSection(section, constraints) {
  if (!constraints.allowFull && isFullSection(section)) return false;
  if (!constraints.allowAtRisk && isAtRiskSection(section)) return false;
  const parsed = parseSchedule(section.schedule);
  if (!parsed) return false;
  const earliest = toMinutesFromTimeInput(constraints.earliestStart);
  const latest = toMinutesFromTimeInput(constraints.latestEnd);
  if (parsed.startTime < earliest) return false;
  if (parsed.endTime > (23 * 60 + 59)) return false; // sanity
  // Allow sections ending after latest; they are not filtered here, but used for stats and tabs.
  return true;
}

// Combination generation
function generateValidSchedules(subjects, constraints) {
  console.log('Starting optimized schedule generation...');
  console.log('Subjects:', subjects.length);
  console.log('Constraints:', constraints);

  // Pre-filter viable sections for each subject
  const viablePerSubject = subjects.map(subj => {
    const viableSections = subj.sections.filter(sec => isViableSection(sec, constraints));
    console.log(`Subject ${subj.courseCode}: ${viableSections.length} viable sections out of ${subj.sections.length}`);
    return viableSections;
  });

  // Early exit if any subject has no viable section
  if (viablePerSubject.some(list => list.length === 0)) {
    console.log('No viable sections found for at least one subject');
    return [];
  }

  // Calculate total possible combinations and set limits
  const totalCombinations = viablePerSubject.reduce((acc, sections) => acc * sections.length, 1);
  console.log('Total possible combinations:', totalCombinations);
  
  // Dynamic limits based on complexity
  let maxResults = constraints.maxSchedules;
  let maxIterations = 100000;
  
  if (totalCombinations > 100000) {
    maxResults = Math.min(maxResults, 50);
    maxIterations = 50000;
    console.warn('Large combination space detected, applying stricter limits');
  } else if (totalCombinations > 10000) {
    maxResults = Math.min(maxResults, 100);
    maxIterations = 75000;
  }

  // Use iterative approach instead of recursion to avoid stack overflow
  return generateSchedulesIterative(viablePerSubject, subjects, constraints, maxResults, maxIterations);
}

function generateSchedulesIterative(viablePerSubject, subjects, constraints, maxResults, maxIterations) {
  const results = [];
  let iterationCount = 0;
  
  // Initialize stack with first level choices
  const stack = [];
  for (let i = 0; i < viablePerSubject[0].length; i++) {
    stack.push({
      subjectIndex: 0,
      sectionIndex: i,
      currentSelection: [viablePerSubject[0][i]],
      parsedSchedules: [parseSchedule(viablePerSubject[0][i].schedule)]
    });
  }
  
  while (stack.length > 0 && results.length < maxResults && iterationCount < maxIterations) {
    iterationCount++;
    
    // Progress reporting for large searches
    if (iterationCount % 10000 === 0) {
      console.log(`Progress: ${iterationCount} iterations, ${results.length} valid schedules found`);
    }
    
    const state = stack.pop();
    const { subjectIndex, currentSelection, parsedSchedules } = state;
    
    // If we've selected for all subjects, validate and add result
    if (subjectIndex === subjects.length - 1) {
      const fullCount = currentSelection.reduce((acc, s) => acc + (isFullSection(s) ? 1 : 0), 0);
      
      // Apply full section constraints
      if (!constraints.allowFull && fullCount > 0) continue;
      if (constraints.allowFull && fullCount > constraints.maxFullPerSchedule) continue;
      
      // Check if all schedules parsed correctly
      if (parsedSchedules.some(p => p === null)) continue;
      
      // Calculate metadata
      const latestEndPref = toMinutesFromTimeInput(constraints.latestEnd);
      const endsByPreferred = parsedSchedules.every(p => p.endTime <= latestEndPref);
      const latestEnd = Math.max(...parsedSchedules.map(p => p.endTime));
      
      results.push({
        selections: [...currentSelection],
        parsed: [...parsedSchedules],
        meta: {
          fullCount,
          endsByPreferred,
          hasLate: !endsByPreferred,
          latestEnd,
        },
      });
      continue;
    }
    
    // Try next subject's sections
    const nextSubjectIndex = subjectIndex + 1;
    const nextSubjectSections = viablePerSubject[nextSubjectIndex];
    
    for (let i = 0; i < nextSubjectSections.length; i++) {
      const nextSection = nextSubjectSections[i];
      const nextParsed = parseSchedule(nextSection.schedule);
      
      if (!nextParsed) continue;
      
      // Check for conflicts with current selection
      let hasConflict = false;
      for (let j = 0; j < parsedSchedules.length; j++) {
        if (parsedSchedules[j] && hasTimeConflict(nextParsed, parsedSchedules[j])) {
          hasConflict = true;
          break;
        }
      }
      
      if (!hasConflict) {
        // Add this branch to the stack
        stack.push({
          subjectIndex: nextSubjectIndex,
          sectionIndex: i,
          currentSelection: [...currentSelection, nextSection],
          parsedSchedules: [...parsedSchedules, nextParsed]
        });
      }
    }
  }
  
  console.log(`Generation completed: ${results.length} schedules found in ${iterationCount} iterations`);
  
  if (iterationCount >= maxIterations) {
    console.warn('Hit iteration limit - results may be incomplete');
  }
  
  return results;
}

// Rendering helpers
function el(tag, opts = {}, children = []) { const e = document.createElement(tag); Object.assign(e, opts); children.forEach(c => e.appendChild(c)); return e; }
function text(t) { return document.createTextNode(t); }

function renderSubjects() {
  const wrap = document.getElementById('subject-list');
  wrap.innerHTML = '';
  if (appState.subjects.length === 0) {
    wrap.appendChild(el('div', { className: 'subject-meta', innerText: 'No subjects added yet.' }));
    return;
  }
  appState.subjects.forEach((subj, idx) => {
    const head = el('div', { className: 'subject-head' }, [
      el('div', { }, [
        el('div', { innerText: `${subj.courseCode} — ${subj.courseName}` }),
        el('div', { className: 'subject-meta', innerText: `${subj.sections.length} section(s)` }),
      ]),
      el('div', {}, [
        el('button', { className: 'btn', innerText: 'Add Section', onclick: () => promptAddSection(idx) }),
        el('button', { className: 'btn', innerText: 'Remove', style: 'margin-left:8px', onclick: () => { appState.subjects.splice(idx,1); renderSubjects(); } }),
      ])
    ]);

    const chips = el('div', { className: 'chips' });
    subj.sections.forEach((s, sidx) => {
      const chip = el('span', { className: `chip ${isFullSection(s) ? 'full' : (isAtRiskSection(s) ? 'warn' : 'ok')}` , innerText: `G${s.group} • ${s.schedule} • ${s.enrolled}` });
      chip.title = 'Click to remove';
      chip.style.cursor = 'pointer';
      chip.onclick = () => { subj.sections.splice(sidx,1); renderSubjects(); };
      chips.appendChild(chip);
    });

    const item = el('div', { className: 'subject-item' }, [ head, chips ]);
    wrap.appendChild(item);
  });
}

function promptAddSection(subjectIndex) {
  const group = prompt('Group number (e.g., 1)');
  if (group == null) return;
  const schedule = prompt('Schedule (e.g., TTh 07:30 AM - 10:00 AM)');
  if (schedule == null) return;
  const enrolled = prompt('Enrolled (current/total) (e.g., 7/20)');
  if (enrolled == null) return;
  const status = deriveStatusFromEnrolled(enrolled);
  appState.subjects[subjectIndex].sections.push({ group: Number(group), schedule, enrolled, status });
  renderSubjects();
}

function deriveStatusFromEnrolled(enrolled) {
  const [cur, tot] = (enrolled || '0/0').split('/').map(v => parseInt(v.trim(), 10) || 0);
  return cur >= tot ? 'FULL' : 'OK';
}

// Sections builder (within new subject form)
function addBuilderRow() {
  const list = document.getElementById('builder-section-list');
  const row = document.createElement('div');
  row.className = 'builder-row';
  row.innerHTML = `
    <input type="number" min="0" placeholder="Group" class="b-group" />
    <input type="text" placeholder="e.g., TTh 07:30 AM - 10:00 AM" class="b-schedule" />
    <input type="text" placeholder="7/20" class="b-enrolled" />
    <button type="button" class="remove-icon" title="Remove">✕</button>
  `;
  row.querySelector('.remove-icon').onclick = () => row.remove();
  list.appendChild(row);
}

function clearBuilder() {
  document.getElementById('builder-section-list').innerHTML = '';
}

// Constraints and generation
function readConstraints() {
  const earliestStart = document.getElementById('earliestStart').value || '07:30';
  const latestEnd = document.getElementById('latestEnd').value || '16:30';
  const allowFull = document.getElementById('allowFull').checked;
  const allowAtRisk = document.getElementById('allowAtRisk').checked;
  const maxFullPerSchedule = parseInt(document.getElementById('maxFullPerSchedule').value, 10) || 0;
  const maxSchedules = parseInt(document.getElementById('maxSchedules').value, 10) || 20;
  return { earliestStart, latestEnd, allowFull, allowAtRisk, maxFullPerSchedule, maxSchedules };
}

function formatMinutesToLabel(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function refreshTabsLabels() {
  const latestEndPref = toMinutesFromTimeInput(appState.constraints.latestEnd);
  document.querySelectorAll('#result-tabs .time-label').forEach(el => el.textContent = formatMinutesToLabel(latestEndPref));
}

function renderSummary(schedules) {
  const wrap = document.getElementById('summary-stats');
  wrap.innerHTML = '';
  const total = schedules.length;
  const latestEndPref = toMinutesFromTimeInput(appState.constraints.latestEnd);
  const endsBy = schedules.filter(s => s.meta.endsByPreferred).length;
  const late = total - endsBy;
  const hasFull = schedules.filter(s => s.meta.fullCount > 0).length;
  const stats = [
    { label: 'Total schedules', value: total },
    { label: `End by ${formatMinutesToLabel(latestEndPref)}`, value: endsBy },
    { label: 'With late classes', value: late },
    { label: 'With full sections', value: hasFull },
  ];
  stats.forEach(s => {
    const node = el('div', { className: 'stat' }, [ el('strong', { innerText: s.value + ' ' }), text(s.label) ]);
    wrap.appendChild(node);
  });
}

function timetableBounds(parsedArray) {
  const minStart = Math.min(...parsedArray.map(p => p.startTime));
  const maxEnd = Math.max(...parsedArray.map(p => p.endTime));
  const startHour = Math.max(7*60, Math.floor(minStart/60)*60);
  const endHour = Math.min(22*60, Math.ceil(maxEnd/60)*60);
  return { startHour, endHour };
}

function renderTimetableGrid(container, selections, parsedArray) {
  const days = ['M','T','W','Th','F'];
  const { startHour, endHour } = timetableBounds(parsedArray);
  const hours = [];
  for (let t = startHour; t <= endHour; t += 60) hours.push(t);

  const grid = el('div', { className: 'grid' });
  grid.appendChild(el('div'));
  days.forEach(d => grid.appendChild(el('div', { className: 'col-head', innerText: d })));

  hours.forEach(hh => {
    grid.appendChild(el('div', { className: 'time-cell', innerText: formatMinutesToLabel(hh) }));
    for (let i=0;i<5;i++) grid.appendChild(el('div', { className: 'cell' }));
  });

  // Blocks
  parsedArray.forEach((p, idx) => {
    p.days.forEach(d => {
      const dayIndex = days.indexOf(d);
      if (dayIndex === -1) return;
      const colOffset = 1 + dayIndex; // first column are times
      const rowCount = hours.length;
      // Find container cell for that day; we'll absolutely position block within grid container
      const block = el('div', { className: `block ${isFullSection(selections[idx]) ? 'full' : (isAtRiskSection(selections[idx]) ? 'warn' : 'ok')}` });
      block.textContent = `${selections[idx].group} • ${formatMinutesToLabel(p.startTime)}-${formatMinutesToLabel(p.endTime)}`;
      // Compute top based on time
      const totalGridHeight = (rowCount) * 28 + (rowCount) * 4; // approx cell height + gap
      const dayTop = (p.startTime - startHour) / (endHour - startHour + 60) * totalGridHeight;
      const height = Math.max(18, (p.endTime - p.startTime) / (endHour - startHour + 60) * totalGridHeight);
      block.style.top = `${8 + dayTop}px`;
      block.style.height = `${height}px`;
      // Column positioning
      const gridRect = grid.getBoundingClientRect(); // may be 0 now; we will place after insert using requestAnimationFrame
      block.dataset.colIndex = String(colOffset);
      grid.appendChild(block);
      requestAnimationFrame(() => {
        const cells = grid.querySelectorAll('.cell');
        const columns = 6; // 1 time + 5 days
        const colWidth = grid.clientWidth / columns;
        block.style.left = `${colWidth * colOffset + 2}px`;
        block.style.right = `${2}px`;
        block.style.position = 'absolute';
      });
    });
  });

  // Make grid relatively positioned for absolute blocks
  grid.style.position = 'relative';
  container.appendChild(grid);
}

function renderScheduleCard(schedule, index) {
  const card = el('div', { className: 'card' });
  const header = el('div', { className: 'card-header' }, [
    el('div', { innerText: `Schedule #${index+1}` }),
    el('div', { className: 'badges' }),
  ]);

  const endsBadge = el('span', { className: `badge ${schedule.meta.endsByPreferred ? 'good' : 'warn'}` });
  endsBadge.innerText = schedule.meta.endsByPreferred ? `Ends by ${formatMinutesToLabel(toMinutesFromTimeInput(appState.constraints.latestEnd))}` : 'Has Late Classes';
  const fullBadge = el('span', { className: `badge ${schedule.meta.fullCount > 0 ? 'danger' : 'good'}` , innerText: schedule.meta.fullCount > 0 ? 'Has Full Sections' : 'No Full Sections' });
  header.querySelector('.badges').appendChild(endsBadge);
  header.querySelector('.badges').appendChild(fullBadge);

  const gridWrap = el('div');
  renderTimetableGrid(gridWrap, schedule.selections, schedule.parsed);

  const list = el('div', { className: 'subject-listing' });
  schedule.selections.forEach((s, i) => {
    const row = el('div', { className: 'subject-row' }, [
      el('div', { className: 'cc', innerText: findCourseCodeForSection(s) }),
      el('div', { innerText: `G${s.group}` }),
      el('div', { className: 'sched', innerText: s.schedule }),
      el('div', { className: 'enr', innerText: s.enrolled }),
      el('div', {}, [ el('span', { className: `chip ${isFullSection(s) ? 'full' : (isAtRiskSection(s) ? 'warn' : 'ok')}` , innerText: isFullSection(s) ? 'FULL' : (isAtRiskSection(s) ? 'AT-RISK' : 'OK') }) ])
    ]);
    list.appendChild(row);
  });

  const actions = el('div', { className: 'card-actions' }, [
    el('button', { className: 'btn', innerText: 'Copy Text', onclick: () => copyScheduleToClipboard(schedule) }),
  ]);

  card.appendChild(header);
  card.appendChild(gridWrap);
  card.appendChild(list);
  card.appendChild(actions);
  return card;
}

function findCourseCodeForSection(section) {
  for (const subj of appState.subjects) {
    if (subj.sections.includes(section)) return subj.courseCode;
  }
  return '';
}

function copyScheduleToClipboard(schedule) {
  const lines = schedule.selections.map(s => `${findCourseCodeForSection(s)} | G${s.group} | ${s.schedule} | ${s.enrolled}`);
  const textOut = `Schedule\n${lines.join('\n')}`;
  navigator.clipboard.writeText(textOut).then(() => {
    alert('Schedule copied to clipboard');
  }).catch(() => {
    alert('Copy failed');
  });
}

function sortSchedules(list) {
  const latestEndPref = toMinutesFromTimeInput(appState.constraints.latestEnd);
  const sort = appState.generated.sort;
  const scored = list.map(s => {
    const score = (s.meta.endsByPreferred ? 2 : 0) + (s.meta.fullCount === 0 ? 1 : 0) - Math.max(0, (s.meta.latestEnd - latestEndPref) / 60) * 0.01;
    return { s, score };
  });
  if (sort === 'earliest') {
    return [...list].sort((a, b) => a.meta.latestEnd - b.meta.latestEnd);
  } else if (sort === 'fewestFull') {
    return [...list].sort((a, b) => a.meta.fullCount - b.meta.fullCount || a.meta.latestEnd - b.meta.latestEnd);
  }
  return scored.sort((a,b) => b.score - a.score).map(x => x.s);
}

function applyResultsFilters() {
  const tab = appState.generated.activeTab;
  const latestEndPref = toMinutesFromTimeInput(appState.constraints.latestEnd);
  let list = appState.generated.schedules;
  if (tab === 'endsBy') list = list.filter(s => s.meta.endsByPreferred);
  else if (tab === 'late') list = list.filter(s => s.meta.hasLate);
  else if (tab === 'full') list = list.filter(s => s.meta.fullCount > 0);
  appState.generated.filtered = sortSchedules(list);
}

function renderResults() {
  renderSummary(appState.generated.schedules);
  applyResultsFilters();
  const listWrap = document.getElementById('results-list');
  listWrap.innerHTML = '';
  if (appState.generated.filtered.length === 0) {
    listWrap.appendChild(el('div', { className: 'subject-meta', innerText: 'No schedules to display.' }));
    return;
  }
  appState.generated.filtered.forEach((sched, i) => listWrap.appendChild(renderScheduleCard(sched, i)));
}

// Additional optimizations for your scheduler

// 1. Pre-filter sections by time constraints
function preFilterSectionsByTime(sections, constraints) {
  const earliestStart = toMinutesFromTimeInput(constraints.earliestStart);
  const latestEnd = toMinutesFromTimeInput(constraints.latestEnd);
  
  return sections.filter(section => {
    const parsed = parseSchedule(section.schedule);
    if (!parsed) return false;
    
    // Allow sections that start after earliest time
    // Don't filter by end time here - let user see late options
    return parsed.startTime >= earliestStart;
  });
}

// 2. Smart section ordering (put sections with fewer options first)
function optimizeSubjectOrder(subjects, viablePerSubject) {
  const subjectInfo = subjects.map((subject, index) => ({
    subject,
    viableSections: viablePerSubject[index],
    sectionCount: viablePerSubject[index].length
  }));
  
  // Sort by number of viable sections (ascending) - constrained first
  subjectInfo.sort((a, b) => a.sectionCount - b.sectionCount);
  
  return {
    subjects: subjectInfo.map(info => info.subject),
    viablePerSubject: subjectInfo.map(info => info.viableSections)
  };
}

// 3. Enhanced constraint checking with early termination
function isValidPartialSchedule(selections, parsedSchedules, constraints) {
  // Check full sections count early
  const fullCount = selections.reduce((acc, s) => acc + (isFullSection(s) ? 1 : 0), 0);
  
  if (!constraints.allowFull && fullCount > 0) return false;
  if (constraints.allowFull && fullCount > constraints.maxFullPerSchedule) return false;
  
  // Check time conflicts
  for (let i = 0; i < parsedSchedules.length - 1; i++) {
    for (let j = i + 1; j < parsedSchedules.length; j++) {
      if (hasTimeConflict(parsedSchedules[i], parsedSchedules[j])) {
        return false;
      }
    }
  }
  
  return true;
}

// 4. Progressive difficulty - start with easier constraints
function generateProgressiveSchedules(subjects, constraints) {
  console.log('Using progressive generation strategy...');
  
  // Try with stricter preferences first
  let results = [];
  const originalMaxSchedules = constraints.maxSchedules;
  
  // Phase 1: Try to find schedules ending by preferred time with no full sections
  const strictConstraints = {
    ...constraints,
    allowFull: false,
    maxSchedules: Math.min(50, originalMaxSchedules)
  };
  
  console.log('Phase 1: Strict constraints (no full, ends by preferred time)');
  results = generateValidSchedules(subjects, strictConstraints);
  
  if (results.length >= 10 || results.length >= originalMaxSchedules) {
    console.log(`Phase 1 successful: Found ${results.length} schedules`);
    return results.slice(0, originalMaxSchedules);
  }
  
  // Phase 2: Allow full sections but prefer ending by preferred time
  if (constraints.allowFull) {
    console.log('Phase 2: Allow full sections');
    const relaxedConstraints = {
      ...constraints,
      maxSchedules: originalMaxSchedules - results.length
    };
    
    const additionalResults = generateValidSchedules(subjects, relaxedConstraints);
    results = [...results, ...additionalResults].slice(0, originalMaxSchedules);
  }
  
  console.log(`Progressive generation completed: ${results.length} total schedules`);
  return results;
}

// 5. Memory-efficient result storage
class ScheduleResultManager {
  constructor(maxResults = 1000) {
    this.maxResults = maxResults;
    this.results = [];
    this.signatures = new Set(); // Prevent duplicates
  }
  
  addResult(schedule) {
    // Generate signature to detect duplicates
    const signature = schedule.selections
      .map(s => `${s.group}_${s.schedule}`)
      .sort()
      .join('|');
    
    if (this.signatures.has(signature)) {
      return false; // Duplicate
    }
    
    this.signatures.add(signature);
    this.results.push(schedule);
    
    // If we exceed max results, remove worst result
    if (this.results.length > this.maxResults) {
      this.results.sort((a, b) => this.scoreSchedule(b) - this.scoreSchedule(a));
      const removed = this.results.pop();
      this.signatures.delete(this.getSignature(removed));
    }
    
    return true;
  }
  
  scoreSchedule(schedule) {
    // Higher score = better schedule
    let score = 0;
    if (schedule.meta.endsByPreferred) score += 100;
    if (schedule.meta.fullCount === 0) score += 50;
    score -= schedule.meta.fullCount * 10; // Penalize full sections
    score -= Math.max(0, schedule.meta.latestEnd - (16 * 60 + 30)) / 60; // Penalize late end times
    return score;
  }
  
  getSignature(schedule) {
    return schedule.selections
      .map(s => `${s.group}_${s.schedule}`)
      .sort()
      .join('|');
  }
  
  getResults() {
    // Return results sorted by score (best first)
    return this.results.sort((a, b) => this.scoreSchedule(b) - this.scoreSchedule(a));
  }
}

// 6. Updated main generation function with all optimizations
function generateOptimizedSchedules(subjects, constraints) {
  console.log('Starting fully optimized schedule generation...');
  
  // Pre-filter sections
  const preFilteredSubjects = subjects.map(subject => ({
    ...subject,
    sections: preFilterSectionsByTime(subject.sections, constraints)
  }));
  
  const viablePerSubject = preFilteredSubjects.map(subj => {
    return subj.sections.filter(sec => isViableSection(sec, constraints));
  });
  
  // Check if any subject has no viable sections
  if (viablePerSubject.some(list => list.length === 0)) {
    console.log('No viable sections found for at least one subject');
    return [];
  }
  
  // Optimize subject order
  const optimized = optimizeSubjectOrder(preFilteredSubjects, viablePerSubject);
  
  // Calculate complexity and choose strategy
  const totalCombinations = optimized.viablePerSubject.reduce((acc, sections) => acc * sections.length, 1);
  console.log(`Total combinations: ${totalCombinations}`);
  
  if (totalCombinations > 100000) {
    console.log('Using sampling strategy for large dataset');
    return generateSampledSchedules(optimized.viablePerSubject, optimized.subjects, constraints, constraints.maxSchedules);
  } else if (totalCombinations > 10000) {
    console.log('Using progressive strategy for medium dataset');
    return generateProgressiveSchedules(optimized.subjects, constraints);
  } else {
    console.log('Using iterative strategy for small dataset');
    return generateSchedulesIterative(optimized.viablePerSubject, optimized.subjects, constraints, constraints.maxSchedules, 100000);
  }
}

// Event wiring and initialization
function init() {
  document.getElementById('add-section-btn').onclick = addBuilderRow;
  document.getElementById('reset-form').onclick = (e) => {
    e.preventDefault();
    document.getElementById('courseCode').value = '';
    document.getElementById('courseName').value = '';
    clearBuilder();
  };
  document.getElementById('subject-form').onsubmit = (e) => {
    e.preventDefault();
    const courseCode = document.getElementById('courseCode').value.trim();
    const courseName = document.getElementById('courseName').value.trim();
    if (!courseCode || !courseName) return;
    const secs = [];
    document.querySelectorAll('#builder-section-list .builder-row').forEach(row => {
      const group = parseInt(row.querySelector('.b-group').value, 10);
      const schedule = row.querySelector('.b-schedule').value.trim();
      const enrolled = row.querySelector('.b-enrolled').value.trim();
      if (!group || !schedule || !enrolled) return;
      secs.push({ group, schedule, enrolled, status: deriveStatusFromEnrolled(enrolled) });
    });
    if (secs.length === 0) { alert('Add at least one section.'); return; }
    appState.subjects.push({ courseCode, courseName, sections: secs });
    document.getElementById('courseCode').value = '';
    document.getElementById('courseName').value = '';
    clearBuilder();
    renderSubjects();
  };

  const maxSlider = document.getElementById('maxSchedules');
  const maxVal = document.getElementById('maxSchedulesValue');
  maxSlider.addEventListener('input', () => { maxVal.textContent = maxSlider.value; });

  // Tabs
  document.querySelectorAll('#result-tabs .tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#result-tabs .tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.generated.activeTab = btn.dataset.tab;
      renderResults();
    };
  });

  document.getElementById('sortSelect').onchange = (e) => {
    appState.generated.sort = e.target.value;
    renderResults();
  };

  document.getElementById('allowFull').addEventListener('change', () => {
    document.getElementById('maxFullPerSchedule').disabled = !document.getElementById('allowFull').checked;
  });
  document.getElementById('maxFullPerSchedule').disabled = !document.getElementById('allowFull').checked;

  document.getElementById('generate-btn').onclick = async () => {
    const status = document.getElementById('gen-status');
    status.textContent = 'Generating…';
    
    try {
      appState.constraints = readConstraints();
      refreshTabsLabels();
      
      await new Promise(r => setTimeout(r, 50));
      
      // Use the optimized function
      const res = generateOptimizedSchedules(appState.subjects, appState.constraints);
      appState.generated.schedules = res;
      
      status.textContent = res.length === 0 ? 'No schedules found.' : `Generated ${res.length} schedule(s).`;
      renderResults();
    } catch (error) {
      console.error('Error generating schedules:', error);
      status.textContent = 'Error generating schedules. Check console for details.';
    }
  };

  // Seed with sample data for smoke testing
  seedSample();
  renderSubjects();
  refreshTabsLabels();

  // Import/Export wiring
  document.getElementById('importCsvBtn').onclick = async () => {
    const fi = document.getElementById('csvFileInput');
    if (!fi.files || fi.files.length === 0) { alert('Choose a CSV file first.'); return; }
    const text = await fi.files[0].text();
    const rows = window.SampleData.parseCSV(text);
    const subjects = window.SampleData.csvRowsToSubjects(rows);
    appState.subjects = subjects;
    renderSubjects();
  };
  document.getElementById('exportCsvBtn').onclick = () => {
    const csv = window.SampleData.subjectsToCSV(appState.subjects);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'subjects_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };
  document.getElementById('loadSampleJsonBtn').onclick = () => {
    const sel = document.getElementById('sampleSelect').value;
    appState.subjects = JSON.parse(JSON.stringify(window.SampleData.sampleCourseData[sel].subjects));
    renderSubjects();
  };
  document.getElementById('loadSampleCsvBtn').onclick = () => {
    const sel = document.getElementById('sampleSelect').value;
    const rows = window.SampleData.parseCSV(window.SampleData.sampleCourseDataCSV[sel]);
    appState.subjects = window.SampleData.csvRowsToSubjects(rows);
    renderSubjects();
  };
}

function seedSample() {
  if (appState.subjects.length > 0) return;
  // Default to CS sample
  appState.subjects = JSON.parse(JSON.stringify(window.SampleData.sampleCourseData.cs.subjects));
}

document.addEventListener('DOMContentLoaded', init);

// Expose critical functions to window for quick testing
window.parseSchedule = parseSchedule;
window.hasTimeConflict = hasTimeConflict;
window.isViableSection = (s,c) => isViableSection(s, c || appState.constraints);
window.generateValidSchedules = generateValidSchedules;


