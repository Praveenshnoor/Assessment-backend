const { pool } = require('./db');

// run a query with parameters (prevents sql injection)
async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// build the sql query based on what filters we got
function buildQuery(filters = {}) {
  const { examId, examIds, startDate, endDate, studentIds } = filters;
  
  // start with CTE to rank results and get only highest score per student per exam
  let query = `
    WITH ranked_results AS (
      SELECT 
        s.id AS student_id,
        s.full_name AS student_name,
        s.email AS student_email,
        e.id AS exam_id,
        e.name AS exam_name,
        e.date AS exam_date,
        r.marks_obtained,
        r.total_marks,
        ROUND((r.marks_obtained / r.total_marks * 100), 2) as percentage,
        CASE 
          WHEN (r.marks_obtained / r.total_marks * 100) >= COALESCE(t.passing_percentage, 50) THEN 'Pass'
          ELSE 'Fail'
        END as status,
        r.created_at AS attempt_date,
        t.id as test_id,
        ROW_NUMBER() OVER (
          PARTITION BY s.id, t.id 
          ORDER BY r.marks_obtained DESC, r.created_at DESC
        ) as rank
      FROM results r
      INNER JOIN students s ON r.student_id = s.id
      INNER JOIN exams e ON r.exam_id = e.id
      LEFT JOIN tests t ON t.title = e.name
      WHERE 1=1 AND t.id IS NOT NULL
  `;
  
  const params = [];
  let paramIndex = 1;
  
  // filter by multiple exam IDs if specified (for tests with multiple exam records)
  if (examIds && Array.isArray(examIds) && examIds.length > 0) {
    const placeholders = examIds.map((_, index) => `$${paramIndex + index}`).join(', ');
    query += ` AND e.id IN (${placeholders})`;
    params.push(...examIds);
    paramIndex += examIds.length;
  }
  // filter by single exam if specified
  else if (examId !== undefined && examId !== null) {
    query += ` AND e.id = $${paramIndex}`;
    params.push(examId);
    paramIndex++;
  }
  
  // filter by date range if provided
  if (startDate) {
    query += ` AND e.date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }
  
  if (endDate) {
    query += ` AND e.date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }
  
  // filter by specific students if needed
  if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
    const placeholders = studentIds.map((_, index) => `$${paramIndex + index}`).join(', ');
    query += ` AND s.id IN (${placeholders})`;
    params.push(...studentIds);
    paramIndex += studentIds.length;
  }
  
  // close the CTE and select only rank 1 (highest score per student per exam)
  query += `
    )
    SELECT 
      student_id,
      student_name,
      student_email,
      exam_id,
      exam_name,
      exam_date,
      marks_obtained,
      total_marks,
      percentage,
      status,
      attempt_date
    FROM ranked_results
    WHERE rank = 1
    ORDER BY exam_date DESC, student_name ASC
  `;
  
  return { query, params };
}

// main function to get exam results with all the student and exam info
async function getExamResults(filters = {}) {
  const { query, params } = buildQuery(filters);
  return executeQuery(query, params);
}

// grab a specific exam by its id
async function getExamById(examId) {
  const query = 'SELECT id, name, date, duration FROM exams WHERE id = $1';
  const rows = await executeQuery(query, [examId]);
  return rows.length > 0 ? rows[0] : null;
}

module.exports = {
  executeQuery,
  buildQuery,
  getExamResults,
  getExamById
};
