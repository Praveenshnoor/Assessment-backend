const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Check if Firebase is already initialized
if (!admin.apps.length) {
    try {
        // Option 1: Use environment variables (recommended for Render)
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
            });
            console.log('✅ Firebase Admin SDK initialized with environment variables');
        }
        // Option 2: Use service account file (for local development)
        else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
            const absolutePath = path.resolve(__dirname, '..', serviceAccountPath);
            const serviceAccount = require(absolutePath);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('✅ Firebase Admin SDK initialized with service account file');
        }
        else {
            throw new Error('Firebase credentials not found. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables, or provide FIREBASE_SERVICE_ACCOUNT_PATH.');
        }
    } catch (error) {
        console.error('❌ Error initializing Firebase Admin SDK:', error.message);
        console.error('Please ensure Firebase credentials are properly configured');
        process.exit(1);
    }
}

// Export Firebase Admin instance
module.exports = admin;
