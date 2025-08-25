// Sample data and CSV utilities
window.SampleData = {
  // Sample course data
  sampleCourseData: {
    cs: {
      subjects: [
        {
          courseCode: "CIS 2103",
          courseName: "Object-Oriented Programming",
          sections: [
            { group: 1, schedule: "MW 10:00 AM - 11:30 AM", enrolled: "15/30", status: "OK" },
            { group: 2, schedule: "TTh 01:00 PM - 02:30 PM", enrolled: "20/25", status: "OK" },
            { group: 3, schedule: "MW 02:00 PM - 03:30 PM", enrolled: "25/25", status: "FULL" }
          ]
        },
        {
          courseCode: "CIS 2104",
          courseName: "Data Structures",
          sections: [
            { group: 1, schedule: "TTh 08:00 AM - 09:30 AM", enrolled: "18/25", status: "OK" },
            { group: 2, schedule: "MW 03:00 PM - 04:30 PM", enrolled: "12/30", status: "OK" }
          ]
        },
        {
          courseCode: "MATH 2105",
          courseName: "Discrete Mathematics",
          sections: [
            { group: 1, schedule: "MWF 09:00 AM - 10:00 AM", enrolled: "22/30", status: "OK" },
            { group: 2, schedule: "TTh 10:00 AM - 11:30 AM", enrolled: "15/25", status: "OK" }
          ]
        }
      ]
    },
    literature: {
      subjects: [
        {
          courseCode: "ENG 101",
          courseName: "English Literature",
          sections: [
            { group: 1, schedule: "MW 09:00 AM - 10:30 AM", enrolled: "20/25", status: "OK" },
            { group: 2, schedule: "TTh 11:00 AM - 12:30 PM", enrolled: "18/25", status: "OK" }
          ]
        },
        {
          courseCode: "ENG 201",
          courseName: "Advanced Literature",
          sections: [
            { group: 1, schedule: "MWF 02:00 PM - 03:00 PM", enrolled: "15/20", status: "OK" },
            { group: 2, schedule: "TTh 03:30 PM - 05:00 PM", enrolled: "12/20", status: "OK" }
          ]
        }
      ]
    },
    chemistry: {
      subjects: [
        {
          courseCode: "CHEM 101",
          courseName: "General Chemistry",
          sections: [
            { group: 1, schedule: "MWF 08:00 AM - 09:00 AM", enrolled: "25/30", status: "OK" },
            { group: 2, schedule: "TTh 10:00 AM - 11:30 AM", enrolled: "20/25", status: "OK" }
          ]
        },
        {
          courseCode: "CHEM 101L",
          courseName: "Chemistry Lab",
          sections: [
            { group: 1, schedule: "T 02:00 PM - 05:00 PM", enrolled: "12/15", status: "OK" },
            { group: 2, schedule: "Th 02:00 PM - 05:00 PM", enrolled: "10/15", status: "OK" }
          ]
        }
      ]
    }
  },

  // CSV versions of sample data
  sampleCourseDataCSV: {
    cs: `Course Code,Course Name,Group,Schedule,Enrolled
CIS 2103,Object-Oriented Programming,1,MW 10:00 AM - 11:30 AM,15/30
CIS 2103,Object-Oriented Programming,2,TTh 01:00 PM - 02:30 PM,20/25
CIS 2103,Object-Oriented Programming,3,MW 02:00 PM - 03:30 PM,25/25
CIS 2104,Data Structures,1,TTh 08:00 AM - 09:30 AM,18/25
CIS 2104,Data Structures,2,MW 03:00 PM - 04:30 PM,12/30
MATH 2105,Discrete Mathematics,1,MWF 09:00 AM - 10:00 AM,22/30
MATH 2105,Discrete Mathematics,2,TTh 10:00 AM - 11:30 AM,15/25`,
    
    literature: `Course Code,Course Name,Group,Schedule,Enrolled
ENG 101,English Literature,1,MW 09:00 AM - 10:30 AM,20/25
ENG 101,English Literature,2,TTh 11:00 AM - 12:30 PM,18/25
ENG 201,Advanced Literature,1,MWF 02:00 PM - 03:00 PM,15/20
ENG 201,Advanced Literature,2,TTh 03:30 PM - 05:00 PM,12/20`,
    
    chemistry: `Course Code,Course Name,Group,Schedule,Enrolled
CHEM 101,General Chemistry,1,MWF 08:00 AM - 09:00 AM,25/30
CHEM 101,General Chemistry,2,TTh 10:00 AM - 11:30 AM,20/25
CHEM 101L,Chemistry Lab,1,T 02:00 PM - 05:00 PM,12/15
CHEM 101L,Chemistry Lab,2,Th 02:00 PM - 05:00 PM,10/15`
  },

  // CSV parsing function
  parseCSV: function(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        rows.push(row);
      }
    }
    
    return rows;
  },

  // Convert CSV rows to subjects format
  csvRowsToSubjects: function(rows) {
    const subjectsMap = new Map();
    
    rows.forEach(row => {
      const courseCode = row['Course Code'];
      const courseName = row['Course Name'];
      const group = parseInt(row['Group'], 10);
      const schedule = row['Schedule'];
      const enrolled = row['Enrolled'];
      
      if (!courseCode || !courseName || !group || !schedule || !enrolled) {
        return; // Skip invalid rows
      }
      
      const key = `${courseCode}-${courseName}`;
      
      if (!subjectsMap.has(key)) {
        subjectsMap.set(key, {
          courseCode,
          courseName,
          sections: []
        });
      }
      
      const status = this.deriveStatusFromEnrolled(enrolled);
      subjectsMap.get(key).sections.push({
        group,
        schedule,
        enrolled,
        status
      });
    });
    
    return Array.from(subjectsMap.values());
  },

  // Convert subjects to CSV format
  subjectsToCSV: function(subjects) {
    let csv = 'Course Code,Course Name,Group,Schedule,Enrolled\n';
    
    subjects.forEach(subject => {
      subject.sections.forEach(section => {
        csv += `${subject.courseCode},${subject.courseName},${section.group},${section.schedule},${section.enrolled}\n`;
      });
    });
    
    return csv;
  },

  // Helper function to derive status from enrolled string
  deriveStatusFromEnrolled: function(enrolled) {
    const [cur, tot] = (enrolled || '0/0').split('/').map(v => parseInt(v.trim(), 10) || 0);
    return cur >= tot ? 'FULL' : 'OK';
  }
};