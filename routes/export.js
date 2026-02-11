const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { exportExamResults } = require('../services/exportService');
const verifyAdmin = require('../middleware/verifyAdmin');

// Get all results as JSON - admin only (shows only highest score per student per test)
router.get('/all-results', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      WITH ranked_results AS (
        SELECT 
          r.id,
          r.marks_obtained,
          r.total_marks,
          r.created_at as submitted_at,
          ROUND((r.marks_obtained::numeric / r.total_marks::numeric * 100), 2) as percentage,
          e.name as exam_name,
          e.date as exam_date,
          s.full_name as student_name,
          s.roll_number,
          s.email as student_email,
          s.id as student_id,
          t.id as test_id,
          t.duration,
          t.max_attempts,
          t.passing_percentage,
          t.start_datetime,
          t.end_datetime,
          ROW_NUMBER() OVER (
            PARTITION BY s.id, t.id 
            ORDER BY r.marks_obtained DESC, r.created_at DESC
          ) as rank
        FROM results r
        INNER JOIN exams e ON r.exam_id = e.id
        INNER JOIN students s ON r.student_id = s.id
        LEFT JOIN tests t ON t.title = e.name
        WHERE t.id IS NOT NULL
      )
      SELECT 
        id,
        marks_obtained,
        total_marks,
        submitted_at,
        percentage,
        exam_name,
        exam_date,
        student_name,
        roll_number,
        student_email,
        test_id,
        duration,
        max_attempts,
        passing_percentage,
        start_datetime,
        end_datetime
      FROM ranked_results
      WHERE rank = 1
      ORDER BY submitted_at DESC
    `);

    res.json({
      success: true,
      results: result.rows
    });
  } catch (error) {
    console.error('Error fetching all results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch results'
    });
  }
});

// Export endpoint - admin only
router.get('/results', verifyAdmin, async (req, res) => {
  console.log('=== EXPORT ROUTE HIT ===');
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers.authorization);
  
  try {
    const { examId, testId, startDate, endDate, studentIds } = req.query;
    console.log('Parsed examId:', examId, 'testId:', testId);

    const filters = {};

    // If testId is provided, find the corresponding exam(s) by name
    if (testId) {
      const parsedTestId = parseInt(testId, 10);
      if (isNaN(parsedTestId)) {
        return res.status(400).json({ error: 'Invalid test ID format' });
      }
      
      // Get the test name
      const testResult = await pool.query('SELECT title FROM tests WHERE id = $1', [parsedTestId]);
      if (testResult.rows.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }
      
      const testName = testResult.rows[0].title;
      
      // Find ALL matching exams by name
      const examResult = await pool.query('SELECT id FROM exams WHERE name = $1', [testName]);
      if (examResult.rows.length === 0) {
        return res.status(404).json({ error: 'No results found for this exam. Please ensure students have completed the exam before exporting.' });
      }
      
      // Use ALL matching exam IDs
      filters.examIds = examResult.rows.map(row => row.id);
      console.log('Found matching exam IDs:', filters.examIds, 'for test:', testName);
    } else if (examId) {
      const parsedExamId = parseInt(examId, 10);
      console.log('Parsed exam ID:', parsedExamId);
      if (isNaN(parsedExamId)) {
        return res.status(400).json({ error: 'Invalid exam ID format' });
      }
      filters.examId = parsedExamId;
    }

    if (startDate) {
      filters.startDate = startDate;
    }
    if (endDate) {
      filters.endDate = endDate;
    }

    if (studentIds) {
      filters.studentIds = studentIds;
    }

    console.log('Calling exportExamResults with filters:', filters);
    const { buffer, filename } = await exportExamResults(filters);
    console.log('Export successful, filename:', filename);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    res.send(buffer);

  } catch (error) {
    console.error('=== EXPORT ERROR ===');
    console.error('Error:', error);
    console.error('Status code:', error.statusCode);
    console.error('Message:', error.message);
    
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';

    if (statusCode === 500) {
      console.error('Error in export endpoint:', error);
    }

    res.status(statusCode).json({ error: message });
  }
});

module.exports = router;
