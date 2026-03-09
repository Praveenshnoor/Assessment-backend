const { pool } = require('./config/db');

const MOCK_TEST_TITLE = 'Platform Mock Test - Programming Fundamentals';
const MOCK_TEST_DESCRIPTION = 'A practice test to help you get familiar with the exam platform. Covers basic programming concepts across multiple languages including C, C++, Java, Python, JavaScript, and SQL.';
const MOCK_TEST_DURATION = 60; // 60 minutes
const MOCK_TEST_MAX_ATTEMPTS = 1; // Only 1 attempt per student

const MOCK_QUESTIONS = [
  // ===== C Programming (Questions 1-8) =====
  {
    question_text: 'Which of the following is the correct syntax for the main function in C?',
    option_a: 'void main()',
    option_b: 'int main()',
    option_c: 'main()',
    option_d: 'function main()',
    correct_option: 'B',
    marks: 1
  },
  {
    question_text: 'What is the size of an int data type in C (on most 32/64-bit systems)?',
    option_a: '1 byte',
    option_b: '2 bytes',
    option_c: '4 bytes',
    option_d: '8 bytes',
    correct_option: 'C',
    marks: 1
  },
  {
    question_text: 'Which format specifier is used to print a float value in C?',
    option_a: '%d',
    option_b: '%f',
    option_c: '%c',
    option_d: '%s',
    correct_option: 'B',
    marks: 1
  },
  {
    question_text: 'What does the "break" statement do in a loop in C?',
    option_a: 'Skips to the next iteration',
    option_b: 'Exits the loop immediately',
    option_c: 'Restarts the loop',
    option_d: 'Pauses the loop',
    correct_option: 'B',
    marks: 1
  },
  {
    question_text: 'Which header file is required for using printf() in C?',
    option_a: '<stdlib.h>',
    option_b: '<string.h>',
    option_c: '<stdio.h>',
    option_d: '<math.h>',
    correct_option: 'C',
    marks: 1
  },
  {
    question_text: 'What is a pointer in C?',
    option_a: 'A variable that stores another variable\'s value',
    option_b: 'A variable that stores the memory address of another variable',
    option_c: 'A function that points to another function',
    option_d: 'A loop control variable',
    correct_option: 'B',
    marks: 1
  },
  {
    question_text: 'Which of the following is NOT a valid data type in C?',
    option_a: 'int',
    option_b: 'float',
    option_c: 'string',
    option_d: 'char',
    correct_option: 'C',
    marks: 1
  },
  {
    question_text: 'What is the output of: printf("%d", 5 + 3 * 2);',
    option_a: '16',
    option_b: '11',
    option_c: '13',
    option_d: '10',
    correct_option: 'B',
    marks: 1
  },

  // ===== C++ Programming (Questions 9-16) =====
  {
    question_text: 'Which of the following is used for input in C++?',
    option_a: 'scanf',
    option_b: 'cin',
    option_c: 'input',
    option_d: 'read',
    correct_option: 'B',
    marks: 1
  },
  {
    question_text: 'Which SQL statement is used to retrieve data from a database?',
    option_a: 'GET',
    option_b: 'FETCH',
    option_c: 'SELECT',
    option_d: 'RETRIEVE',
    correct_option: 'C',
    marks: 1
  },
  {
    question_text: 'What is the correct way to declare a class in C++?',
    option_a: 'class MyClass {}',
    option_b: 'Class MyClass {}',
    option_c: 'create class MyClass {}',
    option_d: 'def class MyClass {}',
    correct_option: 'A',
    marks: 1
  },
  {
    question_text: 'Which operator is used for scope resolution in C++?',
    option_a: '.',
    option_b: '->',
    option_c: '::',
    option_d: '#',
    correct_option: 'C',
    marks: 1
  },
  {
    question_text: 'What does OOP stand for?',
    option_a: 'Object Oriented Programming',
    option_b: 'Object Operated Procedure',
    option_c: 'Optimal Object Programming',
    option_d: 'Object Overloaded Programming',
    correct_option: 'A',
    marks: 1
  },
  {
    question_text: 'Which of the following is a feature of C++ but NOT of C?',
    option_a: 'Pointers',
    option_b: 'Structures',
    option_c: 'Classes and Inheritance',
    option_d: 'Functions',
    correct_option: 'C',
    marks: 1
  },
  {
    question_text: 'What is a constructor in C++?',
    option_a: 'A function that destroys objects',
    option_b: 'A special function automatically called when an object is created',
    option_c: 'A function used to declare variables',
    option_d: 'A type of loop',
    correct_option: 'B',
    marks: 1
  },
  {
    question_text: 'Which keyword is used to prevent a class from being inherited in C++?',
    option_a: 'static',
    option_b: 'const',
    option_c: 'final',
    option_d: 'sealed',
    correct_option: 'C',
    marks: 1
  },
  {
    question_text: 'Which of the following creates a reference variable in C++?',
    option_a: 'int *ref = &x;',
    option_b: 'int &ref = x;',
    option_c: 'int ref = *x;',
    option_d: 'ref int = x;',
    correct_option: 'B',
    marks: 1
  },

  // ===== SQL (Questions 43-50) =====
  {
    question_text: 'Which SQL statement is used to retrieve data from a database?',
    option_a: 'GET',
    option_b: 'FETCH',
    option_c: 'SELECT',
    option_d: 'RETRIEVE',
    correct_option: 'C',
    marks: 1
  },
  {
    question_text: 'Which SQL clause is used to filter rows?',
    option_a: 'FILTER',
    option_b: 'WHERE',
    option_c: 'HAVING',
    option_d: 'LIMIT',
    correct_option: 'B',
    marks: 1
  },
  {
    question_text: 'What does the SQL JOIN clause do?',
    option_a: 'Deletes rows from two tables',
    option_b: 'Combines rows from two or more tables based on a related column',
    option_c: 'Creates a new table',
    option_d: 'Sorts the result set',
    correct_option: 'B',
    marks: 1
  },
  {
    question_text: 'Which SQL function returns the number of rows in a result set?',
    option_a: 'SUM()',
    option_b: 'TOTAL()',
    option_c: 'COUNT()',
    option_d: 'NUM()',
    correct_option: 'C',
    marks: 1
  },
  {
    question_text: 'What is a PRIMARY KEY in SQL?',
    option_a: 'A key used to encrypt data',
    option_b: 'A column or set of columns that uniquely identifies each row in a table',
    option_c: 'The first column of any table',
    option_d: 'A key used to connect to the database',
    correct_option: 'B',
    marks: 1
  },
  {
    question_text: 'Which SQL command is used to add a new row to a table?',
    option_a: 'ADD',
    option_b: 'INSERT INTO',
    option_c: 'CREATE',
    option_d: 'APPEND',
    correct_option: 'B',
    marks: 1
  },
  {
    question_text: 'What does the GROUP BY clause do in SQL?',
    option_a: 'Sorts results in ascending order',
    option_b: 'Filters individual rows',
    option_c: 'Groups rows that have the same values into summary rows',
    option_d: 'Limits the number of results',
    correct_option: 'C',
    marks: 1
  },
  {
    question_text: 'Which of the following is used to remove a table from a database in SQL?',
    option_a: 'DELETE TABLE',
    option_b: 'REMOVE TABLE',
    option_c: 'DROP TABLE',
    option_d: 'DESTROY TABLE',
    correct_option: 'C',
    marks: 1
  }
];

async function seedMockTest() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting Mock Test Seeding...\n');

    await client.query('BEGIN');

    // 1. Add is_mock_test column to tests table if not exists
    await client.query(`
      ALTER TABLE tests ADD COLUMN IF NOT EXISTS is_mock_test BOOLEAN DEFAULT false
    `);
    console.log('✅ Added is_mock_test column to tests table');

    // 2. Check if mock test already exists
    const existingTest = await client.query(
      'SELECT id FROM tests WHERE is_mock_test = true'
    );

    let testId;

    if (existingTest.rows.length > 0) {
      testId = existingTest.rows[0].id;
      console.log(`⚠️  Mock test already exists with ID: ${testId}. Updating...`);

      // Update existing mock test
      await client.query(
        `UPDATE tests SET title = $1, description = $2, duration = $3, max_attempts = $4,
         status = 'published', is_published = true, is_mock_test = true
         WHERE id = $5`,
        [MOCK_TEST_TITLE, MOCK_TEST_DESCRIPTION, MOCK_TEST_DURATION, MOCK_TEST_MAX_ATTEMPTS, testId]
      );

      // Delete old questions
      await client.query('DELETE FROM questions WHERE test_id = $1', [testId]);
      console.log('🗑️  Deleted old mock test questions');
    } else {
      // 3. Create the mock test
      const testResult = await client.query(
        `INSERT INTO tests (title, description, duration, max_attempts, status, is_published, is_mock_test)
         VALUES ($1, $2, $3, $4, 'published', true, true)
         RETURNING id`,
        [MOCK_TEST_TITLE, MOCK_TEST_DESCRIPTION, MOCK_TEST_DURATION, MOCK_TEST_MAX_ATTEMPTS]
      );
      testId = testResult.rows[0].id;
      console.log(`✅ Created mock test with ID: ${testId}`);
    }

    // 4. Insert all 50 questions
    for (let i = 0; i < MOCK_QUESTIONS.length; i++) {
      const q = MOCK_QUESTIONS[i];
      await client.query(
        `INSERT INTO questions (test_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [testId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.marks]
      );
    }
    console.log(`✅ Inserted ${MOCK_QUESTIONS.length} questions`);

    // 5. Create test_assignments table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_assignments (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        UNIQUE(test_id, student_id)
      )
    `);

    // 6. Assign mock test to ALL existing students
    const studentsResult = await client.query('SELECT id, full_name FROM students');
    const students = studentsResult.rows;

    let assignedCount = 0;
    for (const student of students) {
      const result = await client.query(
        `INSERT INTO test_assignments (test_id, student_id, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT (test_id, student_id) DO NOTHING`,
        [testId, student.id]
      );
      if (result.rowCount > 0) {
        assignedCount++;
        console.log(`  📝 Assigned to: ${student.full_name} (ID: ${student.id})`);
      }
    }

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('🎉 Mock Test Seeding Complete!');
    console.log('========================================');
    console.log(`📋 Test ID: ${testId}`);
    console.log(`📋 Test Title: ${MOCK_TEST_TITLE}`);
    console.log(`❓ Questions: ${MOCK_QUESTIONS.length}`);
    console.log(`⏱️  Duration: ${MOCK_TEST_DURATION} minutes`);
    console.log(`🔄 Max Attempts: ${MOCK_TEST_MAX_ATTEMPTS}`);
    console.log(`👥 Total students: ${students.length}`);
    console.log(`✅ Newly assigned: ${assignedCount}`);
    console.log(`⏭️  Already assigned: ${students.length - assignedCount}`);
    console.log('========================================\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding mock test:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedMockTest()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));