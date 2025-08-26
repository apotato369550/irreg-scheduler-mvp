// Embedded sample datasets and CSV strings

const sampleCourseData = {
  cs: {
    subjects: [
      {
        courseCode: 'CIS 2103',
        courseName: 'Object-Oriented Programming',
        sections: [
          { group: 1, schedule: 'TTh 10:00 AM - 12:30 PM', enrolled: '20/20' },
          { group: 2, schedule: 'TTh 10:00 AM - 12:30 PM', enrolled: '20/20' },
          { group: 3, schedule: 'TTh 07:30 AM - 10:00 AM', enrolled: '20/20' },
          { group: 4, schedule: 'TTh 07:30 AM - 10:00 AM', enrolled: '7/20' },
          { group: 5, schedule: 'MW 10:00 AM - 12:30 PM', enrolled: '6/20' },
          { group: 6, schedule: 'MW 07:30 AM - 10:00 AM', enrolled: '0/20' },
          { group: 7, schedule: 'MW 10:00 AM - 12:30 PM', enrolled: '2/18' },
          { group: 8, schedule: 'TTh 12:30 PM - 03:00 PM', enrolled: '0/18' },
          { group: 9, schedule: 'MW 03:00 PM - 05:30 PM', enrolled: '10/18' },
          { group: 10, schedule: 'MW 12:30 PM - 03:00 PM', enrolled: '20/20' },
        ],
      },
      {
        courseCode: 'CS 3101N',
        courseName: 'Discrete Structures III',
        sections: [
          { group: 1, schedule: 'MW 09:00 AM - 10:30 AM', enrolled: '40/40' },
          { group: 2, schedule: 'MW 10:30 AM - 12:00 PM', enrolled: '27/40' },
          { group: 3, schedule: 'MW 01:30 PM - 03:00 PM', enrolled: '6/40' },
        ],
      },
      {
        courseCode: 'CS 3103',
        courseName: 'Assembly Language Programming',
        sections: [
          { group: 1, schedule: 'MW 07:30 AM - 09:00 AM', enrolled: '40/40' },
          { group: 2, schedule: 'MW 09:00 AM - 10:30 AM', enrolled: '27/40' },
          { group: 3, schedule: 'MW 03:00 PM - 04:30 PM', enrolled: '6/40' },
        ],
      },
      {
        courseCode: 'CIS 2102',
        courseName: 'Web Development II',
        sections: [
          { group: 1, schedule: 'MW 03:00 PM - 05:30 PM', enrolled: '20/20' },
          { group: 2, schedule: 'MW 03:00 PM - 05:30 PM', enrolled: '20/20' },
          { group: 3, schedule: 'MW 12:30 PM - 03:00 PM', enrolled: '20/20' },
          { group: 4, schedule: 'MW 12:30 PM - 03:00 PM', enrolled: '7/20' },
          { group: 5, schedule: 'TTh 07:30 AM - 10:00 AM', enrolled: '6/20' },
          { group: 6, schedule: 'TTh 10:00 AM - 12:30 PM', enrolled: '0/20' },
        ],
      },
      {
        courseCode: 'CIS 2101',
        courseName: 'Data Structures and Algorithms',
        sections: [
          { group: 1, schedule: 'TTh 07:30 AM - 10:00 AM', enrolled: '20/20' },
          { group: 2, schedule: 'TTh 07:30 AM - 10:00 AM', enrolled: '20/20' },
          { group: 3, schedule: 'TTh 10:00 AM - 12:30 PM', enrolled: '20/20' },
          { group: 4, schedule: 'TTh 10:00 AM - 12:30 PM', enrolled: '7/20' },
          { group: 5, schedule: 'MW 07:30 AM - 10:00 AM', enrolled: '6/20' },
          { group: 6, schedule: 'MW 10:00 AM - 12:30 PM', enrolled: '0/20' },
          { group: 7, schedule: 'MW 07:30 AM - 10:00 AM', enrolled: '2/18' },
          { group: 8, schedule: 'MW 10:00 AM - 12:30 PM', enrolled: '0/18' },
          { group: 9, schedule: 'MW 12:30 PM - 03:00 PM', enrolled: '10/18' },
          { group: 10, schedule: 'MW 03:00 PM - 05:30 PM', enrolled: '18/18' },
        ],
      },
      {
        courseCode: 'CIS 2105',
        courseName: 'Networking II',
        sections: [
          { group: 1, schedule: 'MW 12:30 PM - 03:00 PM', enrolled: '20/20' },
          { group: 2, schedule: 'MW 12:30 PM - 03:00 PM', enrolled: '20/20' },
          { group: 3, schedule: 'MW 03:00 PM - 05:30 PM', enrolled: '20/20' },
          { group: 4, schedule: 'MW 03:00 PM - 05:30 PM', enrolled: '7/20' },
          { group: 5, schedule: 'TTh 10:00 AM - 12:30 PM', enrolled: '6/20' },
          { group: 6, schedule: 'TTh 07:30 AM - 10:00 AM', enrolled: '0/20' },
          { group: 7, schedule: 'TTh 12:30 PM - 03:00 PM', enrolled: '2/18' },
          { group: 8, schedule: 'MW 07:30 AM - 10:00 AM', enrolled: '0/18' },
          { group: 9, schedule: 'TTh 07:30 AM - 10:00 AM', enrolled: '10/18' },
          { group: 10, schedule: 'TTh 03:00 PM - 05:30 PM', enrolled: '18/18' },
        ],
      },
    ],
  },
  literature: {
    subjects: [
      {
        courseCode: 'LIT 1201',
        courseName: 'World Literature I',
        sections: [
          { group: 1, schedule: 'MW 09:00 AM - 10:30 AM', enrolled: '25/30' },
          { group: 2, schedule: 'TTh 01:00 PM - 02:30 PM', enrolled: '30/30' },
        ],
      },
      {
        courseCode: 'LIT 2202',
        courseName: 'Modern Poetry',
        sections: [
          { group: 1, schedule: 'F 10:00 AM - 12:00 PM', enrolled: '12/20' },
          { group: 2, schedule: 'F 01:00 PM - 03:00 PM', enrolled: '0/20' },
        ],
      },
    ],
  },
  chemistry: {
    subjects: [
      {
        courseCode: 'CHEM 101',
        courseName: 'General Chemistry',
        sections: [
          { group: 1, schedule: 'MW 08:00 AM - 09:30 AM', enrolled: '40/40' },
          { group: 2, schedule: 'TTh 10:00 AM - 11:30 AM', enrolled: '38/40' },
        ],
      },
      {
        courseCode: 'CHEM 201',
        courseName: 'Organic Chemistry',
        sections: [
          { group: 1, schedule: 'MW 01:00 PM - 02:30 PM', enrolled: '6/40' },
          { group: 2, schedule: 'TTh 03:00 PM - 04:30 PM', enrolled: '0/40' },
        ],
      },
    ],
  },
};

const sampleCourseDataCSV = {
  cs: `courseCode,courseName,group,schedule,enrolled
CIS 2103,Object-Oriented Programming,1,"TTh 10:00 AM - 12:30 PM",20/20
CIS 2103,Object-Oriented Programming,2,"TTh 10:00 AM - 12:30 PM",20/20
CIS 2103,Object-Oriented Programming,3,"TTh 07:30 AM - 10:00 AM",20/20
CIS 2103,Object-Oriented Programming,4,"TTh 07:30 AM - 10:00 AM",7/20
CIS 2103,Object-Oriented Programming,5,"MW 10:00 AM - 12:30 PM",6/20
CIS 2103,Object-Oriented Programming,6,"MW 07:30 AM - 10:00 AM",0/20
CIS 2103,Object-Oriented Programming,7,"MW 10:00 AM - 12:30 PM",2/18
CIS 2103,Object-Oriented Programming,8,"TTh 12:30 PM - 03:00 PM",0/18
CIS 2103,Object-Oriented Programming,9,"MW 03:00 PM - 05:30 PM",10/18
CIS 2103,Object-Oriented Programming,10,"MW 12:30 PM - 03:00 PM",20/20
CS 3101N,Discrete Structures III,1,"MW 09:00 AM - 10:30 AM",40/40
CS 3101N,Discrete Structures III,2,"MW 10:30 AM - 12:00 PM",27/40
CS 3101N,Discrete Structures III,3,"MW 01:30 PM - 03:00 PM",6/40
CS 3103,Assembly Language Programming,1,"MW 07:30 AM - 09:00 AM",40/40
CS 3103,Assembly Language Programming,2,"MW 09:00 AM - 10:30 AM",27/40
CS 3103,Assembly Language Programming,3,"MW 03:00 PM - 04:30 PM",6/40
CIS 2102,Web Development II,1,"MW 03:00 PM - 05:30 PM",20/20
CIS 2102,Web Development II,2,"MW 03:00 PM - 05:30 PM",20/20
CIS 2102,Web Development II,3,"MW 12:30 PM - 03:00 PM",20/20
CIS 2102,Web Development II,4,"MW 12:30 PM - 03:00 PM",7/20
CIS 2102,Web Development II,5,"TTh 07:30 AM - 10:00 AM",6/20
CIS 2102,Web Development II,6,"TTh 10:00 AM - 12:30 PM",0/20
CIS 2101,Data Structures and Algorithms,1,"TTh 07:30 AM - 10:00 AM",20/20
CIS 2101,Data Structures and Algorithms,2,"TTh 07:30 AM - 10:00 AM",20/20
CIS 2101,Data Structures and Algorithms,3,"TTh 10:00 AM - 12:30 PM",20/20
CIS 2101,Data Structures and Algorithms,4,"TTh 10:00 AM - 12:30 PM",7/20
CIS 2101,Data Structures and Algorithms,5,"MW 07:30 AM - 10:00 AM",6/20
CIS 2101,Data Structures and Algorithms,6,"MW 10:00 AM - 12:30 PM",0/20
CIS 2101,Data Structures and Algorithms,7,"MW 07:30 AM - 10:00 AM",2/18
CIS 2101,Data Structures and Algorithms,8,"MW 10:00 AM - 12:30 PM",0/18
CIS 2101,Data Structures and Algorithms,9,"MW 12:30 PM - 03:00 PM",10/18
CIS 2101,Data Structures and Algorithms,10,"MW 03:00 PM - 05:30 PM",18/18
CIS 2105,Networking II,1,"MW 12:30 PM - 03:00 PM",20/20
CIS 2105,Networking II,2,"MW 12:30 PM - 03:00 PM",20/20
CIS 2105,Networking II,3,"MW 03:00 PM - 05:30 PM",20/20
CIS 2105,Networking II,4,"MW 03:00 PM - 05:30 PM",7/20
CIS 2105,Networking II,5,"TTh 10:00 AM - 12:30 PM",6/20
CIS 2105,Networking II,6,"TTh 07:30 AM - 10:00 AM",0/20
CIS 2105,Networking II,7,"TTh 12:30 PM - 03:00 PM",2/18
CIS 2105,Networking II,8,"MW 07:30 AM - 10:00 AM",0/18
CIS 2105,Networking II,9,"TTh 07:30 AM - 10:00 AM",10/18
CIS 2105,Networking II,10,"TTh 03:00 PM - 05:30 PM",18/18`,
  literature: `courseCode,courseName,group,schedule,enrolled
LIT 1201,World Literature I,1,"MW 09:00 AM - 10:30 AM",25/30
LIT 1201,World Literature I,2,"TTh 01:00 PM - 02:30 PM",30/30
LIT 2202,Modern Poetry,1,"F 10:00 AM - 12:00 PM",12/20
LIT 2202,Modern Poetry,2,"F 01:00 PM - 03:00 PM",0/20`,
  chemistry: `courseCode,courseName,group,schedule,enrolled
CHEM 101,General Chemistry,1,"MW 08:00 AM - 09:30 AM",40/40
CHEM 101,General Chemistry,2,"TTh 10:00 AM - 11:30 AM",38/40
CHEM 201,Organic Chemistry,1,"MW 01:00 PM - 02:30 PM",6/40
CHEM 201,Organic Chemistry,2,"TTh 03:00 PM - 04:30 PM",0/40`,
};

// CSV helpers (minimal parser for this structure)
function parseCSV(text) {
  // Supports quoted fields with commas, simple lines
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const header = lines[0].split(',');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const row = [];
    let cur = '';
    let inQuotes = false;
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuotes && line[j+1] === '"') { cur += '"'; j++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        row.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    row.push(cur);
    const obj = {};
    header.forEach((h, idx) => { obj[h.trim()] = (row[idx] || '').trim(); });
    rows.push(obj);
  }
  return rows;
}

function csvRowsToSubjects(rows) {
  const key = (r) => `${r.courseCode}|||${r.courseName}`;
  const map = new Map();
  rows.forEach(r => {
    const k = key(r);
    if (!map.has(k)) map.set(k, { courseCode: r.courseCode, courseName: r.courseName, sections: [] });
    map.get(k).sections.push({
      group: parseInt(r.group, 10),
      schedule: r.schedule,
      enrolled: r.enrolled,
      status: 'OK',
    });
  });
  return Array.from(map.values());
}

function subjectsToCSV(subjects) {
  const header = 'courseCode,courseName,group,schedule,enrolled';
  const lines = subjects.flatMap(s => s.sections.map(sec =>
    `${s.courseCode},${s.courseName},${sec.group},"${sec.schedule}",${sec.enrolled}`
  ));
  return [header, ...lines].join('\n');
}

window.SampleData = { sampleCourseData, sampleCourseDataCSV, parseCSV, csvRowsToSubjects, subjectsToCSV };


