const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const pool = require('../../config/db');

async function getProjectsData() {
  const [rows] = await pool.query(`
    SELECT p.project_id, s.full_name AS student_name, sup.full_name AS supervisor_name,
           p.title, p.stage, p.plagiarism_score, p.predicted_deadline, p.created_at
    FROM projects p
    JOIN users s ON s.user_id = p.student_id
    LEFT JOIN users sup ON sup.user_id = p.supervisor_id
    ORDER BY p.created_at DESC
  `);
  return rows;
}

async function getDefenseData() {
  const [rows] = await pool.query(`
    SELECT d.defense_id, p.title, s.full_name AS student_name, d.scheduled_date, d.room, d.status, d.result
    FROM defense_schedule d
    JOIN projects p ON p.project_id = d.project_id
    JOIN users s ON s.user_id = p.student_id
    ORDER BY d.scheduled_date DESC
  `);
  return rows;
}

function sendProjectsExcel(rows, res) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Projects');
  sheet.columns = [
    { header: 'Project ID', key: 'project_id', width: 10 },
    { header: 'Student', key: 'student_name', width: 28 },
    { header: 'Supervisor', key: 'supervisor_name', width: 28 },
    { header: 'Title', key: 'title', width: 50 },
    { header: 'Stage', key: 'stage', width: 14 },
    { header: 'Plagiarism Score', key: 'plagiarism_score', width: 16 },
    { header: 'Predicted Deadline', key: 'predicted_deadline', width: 18 },
    { header: 'Created At', key: 'created_at', width: 20 },
  ];
  rows.forEach((r) => sheet.addRow(r));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="projects-report.xlsx"');
  return workbook.xlsx.write(res).then(() => res.end());
}

function sendProjectsPdf(rows, res) {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="projects-report.pdf"');
  doc.pipe(res);

  doc.fontSize(16).text('Project Status Report', { align: 'center' });
  doc.moveDown();

  rows.forEach((r) => {
    doc
      .fontSize(10)
      .text(
        `#${r.project_id}  ${r.title}\n` +
          `Student: ${r.student_name}  |  Supervisor: ${r.supervisor_name || 'Unassigned'}  |  Stage: ${r.stage}`
      );
    doc.moveDown(0.5);
  });

  doc.end();
}

function sendDefenseExcel(rows, res) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Defense Schedule');
  sheet.columns = [
    { header: 'Defense ID', key: 'defense_id', width: 10 },
    { header: 'Project Title', key: 'title', width: 40 },
    { header: 'Student', key: 'student_name', width: 28 },
    { header: 'Scheduled Date', key: 'scheduled_date', width: 20 },
    { header: 'Room', key: 'room', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Result', key: 'result', width: 24 },
  ];
  rows.forEach((r) => sheet.addRow(r));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="defense-report.xlsx"');
  return workbook.xlsx.write(res).then(() => res.end());
}

function sendDefensePdf(rows, res) {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="defense-report.pdf"');
  doc.pipe(res);

  doc.fontSize(16).text('Defense Schedule & Results Report', { align: 'center' });
  doc.moveDown();

  rows.forEach((r) => {
    doc
      .fontSize(10)
      .text(
        `${r.title}\n` +
          `Student: ${r.student_name}  |  Date: ${new Date(r.scheduled_date).toLocaleString()}  |  ` +
          `Room: ${r.room}  |  Status: ${r.status}  |  Result: ${r.result || 'Pending'}`
      );
    doc.moveDown(0.5);
  });

  doc.end();
}

const PROJECT_STAGES = ['proposal', 'in_progress', 'defense', 'completed'];
const TOPIC_STATUSES = ['approved', 'pending', 'duplicate', 'rejected'];
const DEFENSE_STATUSES = ['scheduled', 'completed'];

function fillCounts(order, rows, key) {
  const counts = Object.fromEntries(order.map((k) => [k, 0]));
  rows.forEach((r) => {
    if (r[key] in counts) counts[r[key]] = Number(r.count);
  });
  return order.map((k) => ({ label: k, count: counts[k] }));
}

async function getStats(req, res) {
  const [stageRows] = await pool.query('SELECT stage, COUNT(*) AS count FROM projects GROUP BY stage');
  const [topicRows] = await pool.query('SELECT status, COUNT(*) AS count FROM topics GROUP BY status');
  const [defenseRows] = await pool.query('SELECT status, COUNT(*) AS count FROM defense_schedule GROUP BY status');

  const [riskRows] = await pool.query(
    `SELECT
       SUM(plagiarism_score < 0.5) AS low,
       SUM(plagiarism_score >= 0.5 AND plagiarism_score < 0.75) AS medium,
       SUM(plagiarism_score >= 0.75) AS high
     FROM projects WHERE plagiarism_score IS NOT NULL`
  );

  const [workloadRows] = await pool.query(
    `SELECT u.full_name AS label, COUNT(*) AS count
     FROM projects p JOIN users u ON u.user_id = p.supervisor_id
     WHERE p.supervisor_id IS NOT NULL
     GROUP BY u.user_id, u.full_name
     ORDER BY count DESC`
  );

  return res.json({
    projectsByStage: fillCounts(PROJECT_STAGES, stageRows, 'stage'),
    topicsByStatus: fillCounts(TOPIC_STATUSES, topicRows, 'status'),
    defenseByStatus: fillCounts(DEFENSE_STATUSES, defenseRows, 'status'),
    plagiarismRiskBands: [
      { label: 'low', count: Number(riskRows[0].low) || 0 },
      { label: 'medium', count: Number(riskRows[0].medium) || 0 },
      { label: 'high', count: Number(riskRows[0].high) || 0 },
    ],
    supervisorWorkload: workloadRows.map((r) => ({ label: r.label, count: Number(r.count) })),
  });
}

async function projectsReport(req, res) {
  const rows = await getProjectsData();
  if (req.query.format === 'pdf') {
    return sendProjectsPdf(rows, res);
  }
  return sendProjectsExcel(rows, res);
}

async function defenseReport(req, res) {
  const rows = await getDefenseData();
  if (req.query.format === 'pdf') {
    return sendDefensePdf(rows, res);
  }
  return sendDefenseExcel(rows, res);
}

module.exports = { projectsReport, defenseReport, getStats };
