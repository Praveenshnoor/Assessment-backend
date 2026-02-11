const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
// const { cache } = require('../config/redis'); // DISABLED: Redis
// const { cacheMiddleware } = require('../middleware/cache'); // DISABLED: Redis
const verifyToken = require('../middleware/verifyToken');

/**
 * GET /api/student/tests
 * Fetch tests assigned to the logged-in student
 */
router.get('/tests', verifyToken, async (req, res) => {
    try {
        const firebase_uid = req.firebaseUid;

        // First, get the student ID and institute from firebase_uid
        const studentResult = await pool.query(
            'SELECT id, institute FROM students WHERE firebase_uid = $1',
            [firebase_uid]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student profile not found'
            });
        }

        const studentId = studentResult.rows[0].id;
        const studentInstitute = studentResult.rows[0].institute;

        // Fetch tests assigned to this student via test_assignments table
        const assignedTestsResult = await pool.query(`
            SELECT 
                t.id, 
                t.title, 
                t.description,
                t.created_at,
                t.duration,
                t.max_attempts,
                t.start_datetime,
                t.end_datetime,
                (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) as question_count,
                ta.assigned_at,
                (SELECT COUNT(*) FROM results r
                 INNER JOIN exams e ON r.exam_id = e.id
                 WHERE r.student_id = $1 
                 AND e.name LIKE '%' || t.title || '%') as attempts_taken
            FROM tests t
            INNER JOIN test_assignments ta ON t.id = ta.test_id
            WHERE ta.student_id = $1 AND ta.is_active = true
            ORDER BY ta.assigned_at DESC
        `, [studentId]);

        // Transform assigned tests data
        const assignedTests = assignedTestsResult.rows.map(test => {
            const attemptsTaken = parseInt(test.attempts_taken) || 0;
            const maxAttempts = test.max_attempts || 1;
            const attemptsRemaining = Math.max(0, maxAttempts - attemptsTaken);
            const hasAttemptsLeft = attemptsRemaining > 0;

            // Check if test is within available time window
            const now = new Date();
            const startDate = test.start_datetime ? new Date(test.start_datetime) : null;
            const endDate = test.end_datetime ? new Date(test.end_datetime) : null;
            
            let isAvailable = true;
            let availabilityMessage = '';
            let testStatus = 'available';
            
            if (startDate && now < startDate) {
                isAvailable = false;
                testStatus = 'upcoming';
                availabilityMessage = `Available from ${startDate.toLocaleString()}`;
            } else if (endDate && now > endDate) {
                isAvailable = false;
                testStatus = 'expired';
                availabilityMessage = `Expired on ${endDate.toLocaleString()}`;
            }

            return {
                id: test.id,
                title: test.title,
                description: test.description,
                questions: parseInt(test.question_count),
                duration: test.duration || 60,
                maxAttempts: maxAttempts,
                attemptsTaken: attemptsTaken,
                attemptsRemaining: attemptsRemaining,
                hasAttemptsLeft: hasAttemptsLeft,
                startDateTime: test.start_datetime,
                endDateTime: test.end_datetime,
                isAvailable: isAvailable,
                availabilityMessage: availabilityMessage,
                testStatus: testStatus,
                subject: 'General',
                difficulty: 'Medium',
                color: 'bg-blue-50 border-blue-200',
                alreadyTaken: attemptsTaken >= maxAttempts,
                assignedAt: test.assigned_at,
                isAssigned: true
            };
        });

        console.log('Sending assigned tests to student:', assignedTests.length);

        res.json({
            success: true,
            tests: assignedTests
        });
    } catch (error) {
        console.error('Error fetching tests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tests'
        });
    }
});

/**
 * GET /api/student/test/:testId
 * Fetch a specific test and its questions (only if assigned to student)
 */
router.get('/test/:testId', verifyToken, async (req, res) => {
    const { testId } = req.params;
    const firebaseUid = req.firebaseUid;

    try {
        // Get student ID and institute
        const studentResult = await pool.query(
            'SELECT id, institute FROM students WHERE firebase_uid = $1',
            [firebaseUid]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const studentId = studentResult.rows[0].id;
        const studentInstitute = studentResult.rows[0].institute;

        // 1. Fetch Test Details first
        const testResult = await pool.query('SELECT * FROM tests WHERE id = $1', [testId]);

        if (testResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Test not found' });
        }

        const test = testResult.rows[0];

        // Check if test is assigned to this student
        const assignmentCheck = await pool.query(
            'SELECT * FROM test_assignments WHERE test_id = $1 AND student_id = $2 AND is_active = true',
            [testId, studentId]
        );

        const isAssigned = assignmentCheck.rows.length > 0;

        // Only allow access if test is assigned to this student
        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                message: 'This test is not assigned to you. Please contact your administrator.'
            });
        }

        // Check if test is within available time window
        const now = new Date();
        const startDate = test.start_datetime ? new Date(test.start_datetime) : null;
        const endDate = test.end_datetime ? new Date(test.end_datetime) : null;
        
        if (startDate && now < startDate) {
            return res.status(403).json({
                success: false,
                message: `This test is not yet available. It will be available from ${startDate.toLocaleString()}`,
                notYetAvailable: true
            });
        }
        
        if (endDate && now > endDate) {
            return res.status(403).json({
                success: false,
                message: `This test has expired. It was available until ${endDate.toLocaleString()}`,
                expired: true
            });
        }

        // Check how many attempts the student has made
        const attemptsCheck = await pool.query(`
            SELECT COUNT(*) as attempts_count
            FROM results r
            INNER JOIN exams e ON r.exam_id = e.id
            WHERE r.student_id = $1 AND e.name LIKE '%' || $2 || '%'
        `, [studentId, test.title]);

        const attemptsTaken = parseInt(attemptsCheck.rows[0]?.attempts_count) || 0;
        const maxAttempts = test.max_attempts || 1;

        // Block access only if max attempts exceeded AND no saved progress
        if (attemptsTaken >= maxAttempts) {
            // Check if there's saved progress
            const progressCheck = await pool.query(`
                SELECT id FROM exam_progress
                WHERE student_id = $1 AND test_id = $2
            `, [studentId, testId]);

            // If no progress and attempts exceeded, block access
            if (progressCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'You have used all your attempts for this test',
                    alreadyTaken: true,
                    attemptsTaken: attemptsTaken,
                    maxAttempts: maxAttempts
                });
            }
        }

        // 2. Fetch Questions (excluding correct_option to prevent cheating)
        const questionsResult = await pool.query(`
            SELECT 
                id, 
                question_text as question, 
                option_a, 
                option_b, 
                option_c, 
                option_d,
                marks
            FROM questions 
            WHERE test_id = $1
            ORDER BY id ASC
        `, [testId]);

        // Transform questions to frontend format
        const questions = questionsResult.rows.map(q => ({
            id: q.id,
            question: q.question,
            options: [q.option_a, q.option_b, q.option_c, q.option_d].filter(opt => opt !== null && opt !== ''),
            marks: q.marks
        }));

        // 3. Check for saved progress
        const progressResult = await pool.query(`
            SELECT answers, current_question, marked_for_review, visited_questions, time_remaining, warning_count
            FROM exam_progress
            WHERE student_id = $1 AND test_id = $2
        `, [studentId, testId]);

        let savedProgress = null;
        if (progressResult.rows.length > 0) {
            const progress = progressResult.rows[0];
            console.log('Raw progress from DB:', progress);
            console.log('Answers type:', typeof progress.answers);
            console.log('Answers value:', progress.answers);
            
            savedProgress = {
                answers: progress.answers || {},
                currentQuestion: progress.current_question || 0,
                markedForReview: progress.marked_for_review || [],
                visitedQuestions: progress.visited_questions || [0],
                timeRemaining: progress.time_remaining,
                warningCount: progress.warning_count || 0
            };
        }

        res.json({
            success: true,
            test: {
                id: test.id,
                title: test.title,
                description: test.description,
                duration: test.duration || 60,
                questions: questions,
                isAssigned: isAssigned
            },
            savedProgress: savedProgress
        });

    } catch (error) {
        console.error('Error fetching test details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch test details'
        });
    }
});

/**
 * POST /api/student/save-progress
 * Save exam progress
 */
router.post('/save-progress', verifyToken, async (req, res) => {
    const { testId, answers, currentQuestion, markedForReview, visitedQuestions, timeRemaining, warningCount } = req.body;
    const firebaseUid = req.firebaseUid;

    console.log('=== SAVE PROGRESS REQUEST ===');
    console.log('Firebase UID:', firebaseUid);
    console.log('Test ID:', testId);
    console.log('Current Question:', currentQuestion);
    console.log('Time Remaining:', timeRemaining);
    console.log('Warning Count:', warningCount);

    try {
        // Get student ID
        const studentResult = await pool.query(
            'SELECT id FROM students WHERE firebase_uid = $1',
            [firebaseUid]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const studentId = studentResult.rows[0].id;
        console.log('Student ID:', studentId);
        console.log('Answers to save:', answers);
        console.log('Answers type:', typeof answers);

        // Upsert progress - PostgreSQL JSONB column will handle JSON conversion
        const result = await pool.query(`
            INSERT INTO exam_progress (student_id, test_id, answers, current_question, marked_for_review, visited_questions, time_remaining, warning_count)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (student_id, test_id)
            DO UPDATE SET
                answers = $3,
                current_question = $4,
                marked_for_review = $5,
                visited_questions = $6,
                time_remaining = $7,
                warning_count = $8,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        `, [studentId, testId, answers, currentQuestion, markedForReview, visitedQuestions, timeRemaining, warningCount]);

        console.log('Progress saved with ID:', result.rows[0].id);

        res.json({
            success: true,
            message: 'Progress saved',
            progressId: result.rows[0].id
        });

    } catch (error) {
        console.error('Error saving progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save progress',
            error: error.message
        });
    }
});

/**
 * POST /api/student/submit-exam
 * Submit exam answers, calculate results, and store in database
 */
router.post('/submit-exam', verifyToken, async (req, res) => {
    const { testId, answers, examId } = req.body;
    const firebaseUid = req.firebaseUid; // From verifyToken middleware

    console.log('=== SUBMIT EXAM REQUEST ===');
    console.log('Firebase UID:', firebaseUid);
    console.log('Test ID:', testId);
    console.log('Exam ID:', examId);
    console.log('Answers:', answers);
    console.log('Answers type:', typeof answers);
    console.log('Answers keys:', Object.keys(answers || {}));

    try {
        // 1. Get student ID from database using Firebase UID
        const studentResult = await pool.query(
            'SELECT id FROM students WHERE firebase_uid = $1',
            [firebaseUid]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const studentId = studentResult.rows[0].id;
        console.log('Student ID from DB:', studentId);

        // 2. Validate input
        if (!testId || !answers || typeof answers !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission data'
            });
        }

        // 3. Get test details to check max attempts and availability
        const testDetails = await pool.query(`
            SELECT title, max_attempts, start_datetime, end_datetime FROM tests WHERE id = $1
        `, [testId]);

        if (testDetails.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }

        const testTitle = testDetails.rows[0].title;
        const maxAttempts = testDetails.rows[0].max_attempts || 1;
        const startDateTime = testDetails.rows[0].start_datetime;
        const endDateTime = testDetails.rows[0].end_datetime;

        // Check if test is within available time window
        const now = new Date();
        const startDate = startDateTime ? new Date(startDateTime) : null;
        const endDate = endDateTime ? new Date(endDateTime) : null;
        
        if (startDate && now < startDate) {
            return res.status(403).json({
                success: false,
                message: `This test is not yet available. It will be available from ${startDate.toLocaleString()}`,
                notYetAvailable: true
            });
        }
        
        if (endDate && now > endDate) {
            return res.status(403).json({
                success: false,
                message: `This test has expired. It was available until ${endDate.toLocaleString()}`,
                expired: true
            });
        }

        // Check how many attempts the student has already made
        const existingAttemptsCheck = await pool.query(`
            SELECT COUNT(*) as attempt_count
            FROM results r
            INNER JOIN exams e ON r.exam_id = e.id
            WHERE r.student_id = $1 AND e.name LIKE '%' || $2 || '%'
        `, [studentId, testTitle]);

        const attemptsTaken = parseInt(existingAttemptsCheck.rows[0]?.attempt_count) || 0;

        if (attemptsTaken >= maxAttempts) {
            return res.status(400).json({
                success: false,
                message: `You have used all ${maxAttempts} attempt(s) for this test.`,
                alreadyTaken: true,
                attemptsTaken: attemptsTaken,
                maxAttempts: maxAttempts
            });
        }

        // 4. Fetch all questions with correct answers
        const questionsResult = await pool.query(`
            SELECT 
                id, 
                question_text,
                option_a, 
                option_b, 
                option_c, 
                option_d,
                correct_option,
                marks
            FROM questions 
            WHERE test_id = $1
            ORDER BY id ASC
        `, [testId]);

        if (questionsResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }        // 3. Calculate marks
        let totalMarks = 0;
        let marksObtained = 0;
        const questionResults = [];

        questionsResult.rows.forEach((question, index) => {
            totalMarks += question.marks || 1;
            
            // Get student's answer for this question
            const studentAnswer = answers[index]; // answers is object with index as key
            
            // Map correct_option (A, B, C, D) to index (0, 1, 2, 3)
            const correctOptionMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            const correctAnswerIndex = correctOptionMap[question.correct_option];
            
            const isCorrect = studentAnswer === correctAnswerIndex;
            
            if (isCorrect) {
                marksObtained += question.marks || 1;
            }

            questionResults.push({
                questionId: question.id,
                questionText: question.question_text,
                studentAnswer: studentAnswer,
                correctAnswer: correctAnswerIndex,
                isCorrect: isCorrect,
                marks: question.marks || 1
            });
        });

        // 4. Calculate percentage and determine pass/fail (50% passing criteria)
        const percentage = (marksObtained / totalMarks) * 100;
        const status = percentage >= 50 ? 'Pass' : 'Fail';

        // 5. Find or create exam record
        let finalExamId = examId;
        
        if (!finalExamId) {
            // Create a new exam record if not provided
            const testInfo = await pool.query('SELECT title FROM tests WHERE id = $1', [testId]);
            const examName = testInfo.rows[0]?.title || 'Exam';
            
            const examResult = await pool.query(`
                INSERT INTO exams (name, date, duration)
                VALUES ($1, CURRENT_DATE, 60)
                RETURNING id
            `, [examName]);
            
            finalExamId = examResult.rows[0].id;
        }

        // 6. Store result in database
        const resultInsert = await pool.query(`
            INSERT INTO results (student_id, exam_id, marks_obtained, total_marks, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [studentId, finalExamId, marksObtained, totalMarks, status]);

        // 7. Clear saved progress after successful submission
        await pool.query(`
            DELETE FROM exam_progress
            WHERE student_id = $1 AND test_id = $2
        `, [studentId, testId]);

        // 8. Return success response
        res.json({
            success: true,
            message: 'Exam submitted successfully',
            result: {
                resultId: resultInsert.rows[0].id,
                marksObtained: marksObtained,
                totalMarks: totalMarks,
                percentage: percentage.toFixed(2),
                status: status,
                totalQuestions: questionsResult.rows.length,
                correctAnswers: questionResults.filter(q => q.isCorrect).length
            }
        });

    } catch (error) {
        console.error('Error submitting exam:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            testId,
            studentId,
            answersCount: Object.keys(answers || {}).length
        });
        res.status(500).json({
            success: false,
            message: 'Failed to submit exam',
            error: error.message
        });
    }
});

/**
 * GET /api/student/my-results
 * Fetch all results for the logged-in student
 */
router.get('/my-results', verifyToken, async (req, res) => {
    const firebaseUid = req.firebaseUid;

    try {
        // Get student ID from database
        const studentResult = await pool.query(
            'SELECT id FROM students WHERE firebase_uid = $1',
            [firebaseUid]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const studentId = studentResult.rows[0].id;

        const results = await pool.query(`
            SELECT 
                r.id,
                r.marks_obtained,
                r.total_marks,
                r.created_at,
                e.name as exam_name,
                e.date as exam_date,
                ROUND((r.marks_obtained / r.total_marks * 100), 2) as percentage,
                CASE 
                    WHEN (r.marks_obtained / r.total_marks * 100) >= 50 THEN 'Pass'
                    ELSE 'Fail'
                END as status
            FROM results r
            INNER JOIN exams e ON r.exam_id = e.id
            WHERE r.student_id = $1
            ORDER BY r.created_at DESC
        `, [studentId]);

        res.json({
            success: true,
            results: results.rows
        });

    } catch (error) {
        console.error('Error fetching student results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch results'
        });
    }
});

module.exports = router;
