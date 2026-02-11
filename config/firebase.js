const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

let serviceAccount;

try {
    // Try to load service account from the path specified in .env
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
    // Resolve to absolute path from the backend directory
    const absolutePath = path.resolve(__dirname, '..', serviceAccountPath);
    serviceAccount = require(absolutePath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
    console.error('Please ensure your serviceAccountKey.json file is in the correct location');
    console.error('Looking for file at:', path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json'));
    process.exit(1);
}

// Export Firebase Admin instance
module.exports = admin;
