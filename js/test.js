// Optimized schedule generation with iterative approach and early termination
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
  
  // Enhanced conflict detection with better time parsing
  function hasTimeConflict(schedule1, schedule2) {
    if (!schedule1 || !schedule2) return false;
    
    // Check day overlap first (cheaper operation)
    const days1 = new Set(schedule1.days);
    const hasCommonDays = schedule2.days.some(d => days1.has(d));
    if (!hasCommonDays) return false;
    
    // Check time overlap
    return schedule1.startTime < schedule2.endTime && schedule2.startTime < schedule1.endTime;
  }
  
  // Optimized schedule parsing with caching
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