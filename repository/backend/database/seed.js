// Seeds a fuller set of clearly-fictional demo data: ~20 students, 6 supervisors, 1
// coordinator, ~20 topics, and projects spread across every stage (proposal/in_progress/
// defense/completed), so a presentation or viva can show every feature without manually
// creating data first. This is NOT real University of Kigali data - names/topics are made
// up for demo purposes only.
require('dotenv').config();

const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

const DEMO_PASSWORD = 'Passw0rd!'; // same password for every demo account, for convenience in the demo/viva
const MILESTONE_NAMES = ['Proposal', 'Chapter 1', 'Chapter 2', 'Chapter 3', 'Final', 'Defense'];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n) {
  return daysAgo(-n);
}

async function insertUser(passwordHash, fullName, email, role, department, expertiseTags) {
  const [result] = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, department, expertise_tags)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [fullName, email, passwordHash, role, department, expertiseTags]
  );
  return result.insertId;
}

async function insertTopic(proposedBy, title, description, status = 'approved') {
  const [result] = await pool.query(
    `INSERT INTO topics (proposed_by, title, description, status) VALUES (?, ?, ?, ?)`,
    [proposedBy, title, description, status]
  );
  return result.insertId;
}

async function insertProject(studentId, supervisorId, topicId, title, stage, createdAt) {
  const [result] = await pool.query(
    `INSERT INTO projects (student_id, supervisor_id, topic_id, title, stage, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [studentId, supervisorId, topicId, title, stage, createdAt]
  );
  return result.insertId;
}

// `overrides` is an array of up to 6 [status, progress_percent, completedAt] tuples,
// in MILESTONE_NAMES order; anything not overridden defaults to pending/0/null.
async function insertMilestones(projectId, overrides = []) {
  const rows = MILESTONE_NAMES.map((name, i) => {
    const [status, progress, completedAt] = overrides[i] || ['pending', 0, null];
    return [projectId, name, status, progress, completedAt];
  });
  await pool.query(
    'INSERT INTO milestones (project_id, name, status, progress_percent, completed_at) VALUES ?',
    [rows]
  );
}

async function insertFeedback(projectId, givenBy, comment, rating, createdAt) {
  await pool.query(
    `INSERT INTO feedback (project_id, given_by, comment, rating, created_at) VALUES (?, ?, ?, ?, ?)`,
    [projectId, givenBy, comment, rating, createdAt]
  );
}

async function insertAllocation(studentId, supervisorId, matchScore, approvedBy, allocatedAt) {
  await pool.query(
    `INSERT INTO supervisor_allocations (student_id, supervisor_id, match_score, approved_by, allocated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [studentId, supervisorId, matchScore, approvedBy, allocatedAt]
  );
}

async function insertNotification(userId, message, createdAt) {
  await pool.query('INSERT INTO notifications (user_id, message, created_at) VALUES (?, ?, ?)', [
    userId,
    message,
    createdAt,
  ]);
}

async function insertAuditLog(userId, action, entityAffected, timestamp) {
  await pool.query('INSERT INTO audit_log (user_id, action, entity_affected, timestamp) VALUES (?, ?, ?, ?)', [
    userId,
    action,
    entityAffected,
    timestamp,
  ]);
}

async function insertDefense(projectId, panelMembers, scheduledDate, room, status, result = null) {
  await pool.query(
    `INSERT INTO defense_schedule (project_id, panel_members, scheduled_date, room, status, result)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [projectId, JSON.stringify(panelMembers), scheduledDate, room, status, result]
  );
}

async function insertRepositoryEntry(projectId, title, keywords, department, year, path) {
  await pool.query(
    `INSERT INTO repository (project_id, title, keywords, department, year, archived_file_path)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [projectId, title, keywords, department, year, path]
  );
}

// --- Fixed reference data -----------------------------------------------------------

const SUPERVISORS = [
  { name: 'Dr. Jean Mugisha', email: 'supervisor.demo@uok.example', dept: 'Computer Science', tags: 'machine learning, databases, web development' },
  { name: 'Dr. Aline Mukamana', email: 'supervisor.mukamana@uok.example', dept: 'Computer Science', tags: 'cybersecurity, networking, cloud computing' },
  { name: 'Dr. Eric Nshimiyimana', email: 'supervisor.nshimiyimana@uok.example', dept: 'Information Systems', tags: 'mobile development, UI/UX design, e-commerce' },
  { name: 'Dr. Vincent Ndayisenga', email: 'supervisor.ndayisenga@uok.example', dept: 'Software Engineering', tags: 'software architecture, DevOps, software testing' },
  { name: 'Dr. Immaculee Uwimana', email: 'supervisor.uwimana@uok.example', dept: 'Information Technology', tags: 'data science, big data, business intelligence' },
  { name: 'Dr. Samuel Rugamba', email: 'supervisor.rugamba@uok.example', dept: 'Computer Science', tags: 'artificial intelligence, computer vision, natural language processing' },
];

const STUDENTS = [
  { name: 'Alice Uwase', email: 'student.demo@uok.example', dept: 'Computer Science' },
  { name: 'Patrick Habimana', email: 'student.habimana@uok.example', dept: 'Computer Science' },
  { name: 'Diane Ishimwe', email: 'student.ishimwe@uok.example', dept: 'Computer Science' },
  { name: 'Emmanuel Twagirayezu', email: 'student.twagirayezu@uok.example', dept: 'Information Systems' },
  { name: 'Claudine Mutesi', email: 'student.mutesi@uok.example', dept: 'Information Systems' },
  { name: 'Jean Paul Nkurunziza', email: 'student.nkurunziza@uok.example', dept: 'Software Engineering' },
  { name: 'Chantal Uwamahoro', email: 'student.uwamahoro@uok.example', dept: 'Software Engineering' },
  { name: 'Eric Bizimana', email: 'student.bizimana@uok.example', dept: 'Information Technology' },
  { name: 'Solange Umutoni', email: 'student.umutoni@uok.example', dept: 'Information Technology' },
  { name: 'David Niyonzima', email: 'student.niyonzima@uok.example', dept: 'Computer Science' },
  { name: 'Grace Nyirahabimana', email: 'student.nyirahabimana@uok.example', dept: 'Computer Science' },
  { name: 'Olivier Hakizimana', email: 'student.hakizimana@uok.example', dept: 'Information Systems' },
  { name: 'Vestine Mukamurenzi', email: 'student.mukamurenzi@uok.example', dept: 'Information Systems' },
  { name: 'Fabrice Ntawiratsa', email: 'student.ntawiratsa@uok.example', dept: 'Software Engineering' },
  { name: 'Josiane Umuhoza', email: 'student.umuhoza@uok.example', dept: 'Software Engineering' },
  { name: 'Aime Nsengiyumva', email: 'student.nsengiyumva@uok.example', dept: 'Information Technology' },
  { name: 'Yvonne Uwimana', email: 'student.uwimana@uok.example', dept: 'Information Technology' },
  { name: 'Innocent Gasana', email: 'student.gasana@uok.example', dept: 'Computer Science' },
  { name: 'Beatrice Mukashyaka', email: 'student.mukashyaka@uok.example', dept: 'Computer Science' },
  { name: 'Robert Sibomana', email: 'student.sibomana@uok.example', dept: 'Information Systems' },
];

// title/description pairs; `dept` here is only used as repository metadata if archived.
const TOPICS = [
  { title: 'AI-Based Student Attendance Tracking System', desc: 'A demo topic exploring facial-recognition-based attendance tracking for university lecture halls.', dept: 'Computer Science' },
  { title: 'Mobile-Based Crop Disease Detection for Smallholder Farmers', desc: 'A demo topic exploring a mobile app that uses image classification to flag likely crop diseases.', dept: 'Information Technology' },
  { title: 'University Library Book Reservation System', desc: 'A demo topic exploring a web system that lets students reserve and renew library books online.', dept: 'Computer Science' },
  { title: 'Blockchain-Based Land Title Registry', desc: 'A demo topic exploring blockchain technology for secure and transparent land ownership records.', dept: 'Computer Science' },
  { title: 'Cybersecurity Risk Assessment Tool for SMEs', desc: 'A demo topic exploring a tool that scans small business networks and scores their cybersecurity risk.', dept: 'Computer Science' },
  { title: 'Cloud-Based Hospital Patient Record Management System', desc: 'A demo topic exploring a cloud system for securely managing patient records across hospital departments.', dept: 'Information Systems' },
  { title: 'E-Commerce Platform for Local Artisans', desc: 'A demo topic exploring an online marketplace connecting local artisans directly with buyers.', dept: 'Information Systems' },
  { title: 'Mobile UI/UX Redesign for Campus Navigation App', desc: 'A demo topic exploring a redesigned mobile app to help new students navigate the university campus.', dept: 'Information Systems' },
  { title: 'AI-Based Loan Default Prediction System', desc: 'A demo topic exploring machine learning models that predict the probability of loan default from historical customer financial data.', dept: 'Information Technology' },
  { title: 'AI-Based Crime Hotspot Prediction System', desc: 'A demo topic exploring machine learning models that predict likely crime hotspots from historical crime records and geographical data.', dept: 'Information Technology' },
  { title: 'Smart Irrigation Scheduling System Using IoT Sensors', desc: 'A demo topic exploring an IoT sensor network that schedules farm irrigation based on soil moisture readings.', dept: 'Software Engineering' },
  { title: 'Chatbot-Based Student Helpdesk for Admissions Support', desc: 'A demo topic exploring an NLP-driven chatbot that answers common admissions and registration questions.', dept: 'Information Technology' },
  { title: 'Online Examination and Proctoring Platform', desc: 'A demo topic exploring a web platform for delivering timed exams with basic automated proctoring checks.', dept: 'Software Engineering' },
  { title: 'Ride-Sharing Platform for University Commuters', desc: 'A demo topic exploring a mobile app that matches students commuting along similar routes to share rides.', dept: 'Information Systems' },
  { title: 'Renewable Energy Consumption Monitoring Dashboard', desc: 'A demo topic exploring a dashboard that visualizes solar and grid energy consumption across campus buildings.', dept: 'Computer Science' },
  { title: 'Digital Land-Use Planning Tool for Local Government', desc: 'A demo topic exploring a GIS-backed tool that helps local government offices plan and track land-use zoning.', dept: 'Information Systems' },
  { title: 'Sports Performance Analytics Platform for University Athletes', desc: 'A demo topic exploring a platform that tracks training data and visualizes performance trends for university athletes.', dept: 'Software Engineering' },
  { title: 'Tourism Recommendation App for Rwanda Destinations', desc: 'A demo topic exploring a recommendation app that suggests Rwandan tourist destinations based on visitor preferences.', dept: 'Information Technology' },
  { title: 'Automated Timetable Generation System for University Courses', desc: 'A demo topic exploring a constraint-based scheduler that generates conflict-free university course timetables.', dept: 'Computer Science' },
  { title: 'Telemedicine Consultation Platform for Rural Clinics', desc: 'A demo topic exploring a video-consultation platform connecting rural clinics with specialist doctors.', dept: 'Software Engineering' },
];

// Each entry claims TOPICS[topicIdx] for STUDENTS[studentIdx]; supervisorIdx is null for
// unallocated proposals. Topics 15-19 are deliberately left unclaimed, so browsing/suggestion
// always has real available topics to demo.
const PROJECTS = [
  { student: 2, topic: 3, supervisor: null, stage: 'proposal', createdDaysAgo: 3 },
  { student: 10, topic: 2, supervisor: null, stage: 'proposal', createdDaysAgo: 5 },
  { student: 11, topic: 10, supervisor: null, stage: 'proposal', createdDaysAgo: 2 },

  { student: 1, topic: 4, supervisor: 1, stage: 'in_progress', createdDaysAgo: 60, matchScore: 0.72,
    feedback: 'Good progress on the risk-scoring logic - tighten up the citations in your related-work section.', rating: 4 },
  { student: 4, topic: 6, supervisor: 2, stage: 'in_progress', createdDaysAgo: 40, matchScore: 0.58,
    feedback: 'The wireframes look solid - next milestone should cover the checkout flow in more detail.', rating: 5 },
  { student: 5, topic: 11, supervisor: 5, stage: 'in_progress', createdDaysAgo: 50, matchScore: 0.69,
    feedback: 'The intent-matching accuracy is promising - add a fallback flow for questions the bot cannot answer.', rating: 4 },
  { student: 6, topic: 12, supervisor: 3, stage: 'in_progress', createdDaysAgo: 45, matchScore: 0.64,
    feedback: 'The exam-timer logic works well - the proctoring checks still need a tamper-evidence log.', rating: 3 },
  { student: 9, topic: 0, supervisor: 5, stage: 'in_progress', createdDaysAgo: 35, matchScore: 0.75,
    feedback: 'Detection accuracy is strong in good lighting - test the low-light classroom scenario next.', rating: 4 },
  { student: 12, topic: 1, supervisor: 2, stage: 'in_progress', createdDaysAgo: 30, matchScore: 0.53,
    feedback: 'The image-classification pipeline is working - now validate it against real farmer-submitted photos.', rating: 4 },

  { student: 3, topic: 5, supervisor: 0, stage: 'defense', createdDaysAgo: 100, matchScore: 0.65, defenseInDays: 10, room: 'Room A' },
  { student: 7, topic: 9, supervisor: 4, stage: 'defense', createdDaysAgo: 95, matchScore: 0.61, defenseInDays: 6, room: 'Room C' },
  { student: 13, topic: 13, supervisor: 3, stage: 'defense', createdDaysAgo: 90, matchScore: 0.57, defenseInDays: 14, room: 'Room B' },

  { student: 0, topic: 7, supervisor: 2, stage: 'completed', createdDaysAgo: 200, matchScore: 0.61,
    defenseDaysAgo: 58, room: 'Room B', result: 'Pass with minor corrections', archivedYear: -1 },
  { student: 8, topic: 8, supervisor: 4, stage: 'completed', createdDaysAgo: 220, matchScore: 0.7,
    defenseDaysAgo: 70, room: 'Room D', result: 'Pass', archivedYear: -1 },
  { student: 14, topic: 14, supervisor: 0, stage: 'completed', createdDaysAgo: 260, matchScore: 0.55,
    defenseDaysAgo: 95, room: 'Room A', result: 'Pass with major corrections', archivedYear: -2 },
];

async function seed() {
  const [existing] = await pool.query('SELECT COUNT(*) AS count FROM users');
  if (existing[0].count > 0) {
    console.log('Users table is not empty - skipping seed to avoid duplicates.');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Users -------------------------------------------------------------------------
  const coordinatorId = await insertUser(
    passwordHash,
    'Grace Ingabire (fictional demo coordinator)',
    'coordinator.demo@uok.example',
    'coordinator',
    'Computer Science',
    null
  );

  const adminId = await insertUser(
    passwordHash,
    'Admin Demo (fictional demo administrator)',
    'admin.demo@uok.example',
    'admin',
    'Computer Science',
    null
  );

  const supervisorIds = [];
  for (const s of SUPERVISORS) {
    supervisorIds.push(
      await insertUser(passwordHash, `${s.name} (fictional demo supervisor)`, s.email, 'supervisor', s.dept, s.tags)
    );
  }

  const studentIds = [];
  for (const s of STUDENTS) {
    studentIds.push(await insertUser(passwordHash, `${s.name} (fictional demo student)`, s.email, 'student', s.dept, null));
  }

  // --- Topics (proposed_by alternates across students; 5 stay unclaimed/available) ----
  const topicIds = [];
  for (let i = 0; i < TOPICS.length; i++) {
    const t = TOPICS[i];
    topicIds.push(
      await insertTopic(studentIds[i % studentIds.length], `${t.title} (fictional demo topic)`, t.desc)
    );
  }

  // --- Projects, derived from the PROJECTS table above --------------------------------
  for (const p of PROJECTS) {
    const studentId = studentIds[p.student];
    const supervisorId = p.supervisor === null ? null : supervisorIds[p.supervisor];
    const topicTitle = `${TOPICS[p.topic].title} (fictional demo topic)`;
    const projectId = await insertProject(
      studentId,
      supervisorId,
      topicIds[p.topic],
      topicTitle,
      p.stage,
      daysAgo(p.createdDaysAgo)
    );

    if (p.stage === 'proposal') {
      await insertMilestones(projectId, [['submitted', 100, null]]);
    } else if (p.stage === 'in_progress') {
      await insertMilestones(projectId, [
        ['approved', 100, daysAgo(p.createdDaysAgo - 5)],
        ['approved', 100, daysAgo(Math.round(p.createdDaysAgo / 2))],
        ['submitted', 50, null],
      ]);
    } else if (p.stage === 'defense') {
      await insertMilestones(projectId, [
        ['approved', 100, daysAgo(p.createdDaysAgo - 5)],
        ['approved', 100, daysAgo(p.createdDaysAgo - 22)],
        ['approved', 100, daysAgo(p.createdDaysAgo - 40)],
        ['approved', 100, daysAgo(p.createdDaysAgo - 58)],
        ['approved', 100, daysAgo(p.createdDaysAgo - 80)],
        ['pending', 0, null],
      ]);
    } else if (p.stage === 'completed') {
      await insertMilestones(projectId, [
        ['approved', 100, daysAgo(p.createdDaysAgo - 10)],
        ['approved', 100, daysAgo(p.createdDaysAgo - 35)],
        ['approved', 100, daysAgo(p.createdDaysAgo - 60)],
        ['approved', 100, daysAgo(p.createdDaysAgo - 90)],
        ['approved', 100, daysAgo(p.createdDaysAgo - 120)],
        ['approved', 100, daysAgo(p.createdDaysAgo - 140)],
      ]);
    }

    if (supervisorId) {
      await insertAllocation(studentId, supervisorId, p.matchScore, coordinatorId, daysAgo(p.createdDaysAgo - 2));
      await insertAuditLog(coordinatorId, 'allocate_supervisor', `projects:${projectId}`, daysAgo(p.createdDaysAgo - 2));
    }

    if (p.feedback) {
      const feedbackDaysAgo = Math.round(p.createdDaysAgo / 3);
      await insertFeedback(projectId, supervisorId, p.feedback, p.rating, daysAgo(feedbackDaysAgo));
      await insertNotification(studentId, `New feedback was posted on your project "${topicTitle}".`, daysAgo(feedbackDaysAgo));
    }

    if (p.stage === 'defense') {
      const scheduledDate = daysFromNow(p.defenseInDays);
      await insertDefense(projectId, [supervisorId, coordinatorId], scheduledDate, p.room, 'scheduled');
      await insertAuditLog(coordinatorId, 'update_stage', `projects:${projectId}`, daysAgo(15));
      await insertNotification(studentId, `Defense for "${topicTitle}" has been scheduled.`, daysAgo(2));
    }

    if (p.stage === 'completed') {
      await insertDefense(projectId, [supervisorId, coordinatorId], daysAgo(p.defenseDaysAgo), p.room, 'completed', p.result);
      await insertAuditLog(coordinatorId, 'update_stage', `projects:${projectId}`, daysAgo(p.defenseDaysAgo + 1));
      await insertAuditLog(coordinatorId, 'record_defense_result', `defense_schedule:${projectId}`, daysAgo(p.defenseDaysAgo - 1));
      await insertRepositoryEntry(
        projectId,
        topicTitle,
        `${TOPICS[p.topic].dept.toLowerCase()}, ${TOPICS[p.topic].title.toLowerCase()}`,
        TOPICS[p.topic].dept,
        new Date().getFullYear() + p.archivedYear,
        `uploads/projects/demo/${projectId}-final-report.pdf`
      );
    }
  }

  const claimedCount = PROJECTS.length;
  const availableCount = TOPICS.length - claimedCount;

  console.log('Seed complete - fictional demo dataset created:');
  console.log(`  1 coordinator, 1 admin, ${SUPERVISORS.length} supervisors, ${STUDENTS.length} students, ${TOPICS.length} topics (${availableCount} available)`);
  console.log(`  ${PROJECTS.length} projects: 3 proposal (unallocated), 6 in_progress, 3 defense-scheduled, 3 completed+archived`);
  console.log('All demo accounts share the password: ' + DEMO_PASSWORD);
  console.log('  coordinator.demo@uok.example');
  console.log('  admin.demo@uok.example');
  console.log('  ' + SUPERVISORS.map((s) => s.email).join(' / '));
  console.log('  ' + STUDENTS.map((s) => s.email).join(' / '));

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
