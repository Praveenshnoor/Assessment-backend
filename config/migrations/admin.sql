-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin (password: admin123)
-- We'll use a hardcoded hash for 'admin123' generated with bcrypt
-- Hash: $2a$10$X7.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1 (This is a placeholder, I will use a real hash in the actual implementation or app code)
-- Actually, it's better to let the app handle the seeding if we want to be clean, 
-- but for a migration script, I can use a known hash.
-- bcrypt hash for 'admin123': $2b$10$wS2/i.j.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1 (just kidding, I'll generate one in a script locally to be safe or just use a helper script)

-- Let's just create the table first. We can seed via a node script to ensure correct hashing.
