const { pool } = require('./config/db');

// Realistic Indian student names
const REALISTIC_STUDENTS = [
  // Shortlisted students (passed and not flagged)
  { name: 'Rahul Sharma', email: 'rahul.sharma@example.com', score: 66, violations: 0 },
  { name: 'Priya Patel', email: 'priya.patel@example.com', score: 90, violations: 1 },
  { name: 'Amit Kumar', email: 'amit.kumar@example.com', score: 56, violations: 2 },
  { name: 'Sneha Reddy', email: 'sneha.reddy@example.com', score: 92, violations: 0 },
  { name: 'Vikram Singh', email: 'vikram.singh@example.com', score: 87, violations: 1 },
  { name: 'Anjali Gupta', email: 'anjali.gupta@example.com', score: 55, violations: 0 },
  { name: 'Rohan Desai', email: 'rohan.desai@example.com', score: 73, violations: 2 },
  { name: 'Kavya Menon', email: 'kavya.menon@example.com', score: 71, violations: 1 },
  { name: 'Arjun Nair', email: 'arjun.nair@example.com', score: 67, violations: 0 },
  { name: 'Divya Iyer', email: 'divya.iyer@example.com', score: 82, violations: 2 },
  
  // Failed students (score < 50 or flagged with high violations)
  { name: 'Karan Malhotra', email: 'karan.malhotra@example.com', score: 44, violations: 0 },
  { name: 'Sanya Kapoor', email: 'sanya.kapoor@example.com', score: 38, violations: 1 },
  { name: 'Harsh Agarwal', email: 'harsh.agarwal@example.com', score: 38, violations: 0 },
  { name: 'Neha Joshi', email: 'neha.joshi@example.com', score: 22, violations: 2 },
  { name: 'Aditya Verma', email: 'aditya.verma@example.com', score: 32, violations: 1 },
  
  // Passed but flagged (high violations >= 3)
  { name: 'Pooja Shah', email: 'pooja.shah@example.com', score: 75, violations: 4 },
  { name: 'Ravi Chopra', email: 'ravi.chopra@example.com', score: 68, violations: 5 },
  { name: 'Shreya Banerjee', email: 'shreya.banerjee@example.com', score: 64, violations: 3 },
  { name: 'Manish Rao', email: 'manish.rao@example.com', score: 58, violations: 6 },
  { name: 'Ananya Pillai', email: 'ananya.pillai@example.com', score: 78, violations: 4 },
  
  // More shortlisted students
  { name: 'Siddharth Bose', email: 'siddharth.bose@example.com', score: 85, violations: 0 },
  { name: 'Meera Krishnan', email: 'meera.krishnan@example.com', score: 69, violations: 2 },
  { name: 'Nikhil Pandey', email: 'nikhil.pandey@example.com', score: 77, violations: 1 },
  { name: 'Ishita Saxena', email: 'ishita.saxena@example.com', score: 62, violations: 0 },
  { name: 'Varun Bhatt', email: 'varun.bhatt@example.com', score: 54, violations: 2 },
  
  // More failed students
  { name: 'Tanvi Mishra', email: 'tanvi.mishra@example.com', score: 41, violations: 1 },
  { name: 'Akash Tiwari', email: 'akash.tiwari@example.com', score: 35, violations: 0 },
  { name: 'Ritika Dubey', email: 'ritika.dubey@example.com', score: 28, violations: 2 },
  { name: 'Gaurav Sinha', email: 'gaurav.sinha@example.com', score: 46, violations: 1 },
  { name: 'Anushka Chawla', email: 'anushka.chawla@example.com', score: 39, violations: 0 }
];

async function updateStudentNames() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to update student names...');
    
    // Get all existing students with their IDs
    const result = await client.query(`
      SELECT s.id, s.full_name 
      FROM students s 
      WHERE s.full_name LIKE '%Test Student%'
      ORDER BY s.id 
      LIMIT ${REALISTIC_STUDENTS.length}
    `);
    
    if (result.rows.length === 0) {
      console.log('No test students found to update.');
      return;
    }
    
    console.log(`Found ${result.rows.length} test students to update`);
    
    // Update each student with a realistic name
    for (let i = 0; i < result.rows.length && i < REALISTIC_STUDENTS.length; i++) {
      const studentId = result.rows[i].id;
      const newData = REALISTIC_STUDENTS[i];
      
      await client.query(`
        UPDATE students 
        SET full_name = $1, email = $2
        WHERE id = $3
      `, [newData.name, newData.email, studentId]);
      
      console.log(`✓ Updated student ${studentId}: ${result.rows[i].full_name} → ${newData.name}`);
    }
    
    console.log('\n✅ Successfully updated all student names!');
    console.log('Refresh your browser to see the changes.');
    
  } catch (error) {
    console.error('Error updating student names:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateStudentNames()
  .then(() => {
    console.log('\n🎉 Student names update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to update student names:', error);
    process.exit(1);
  });
