import { firebaseConfig } from './config.js';

// `firebase` is a global that comes from the <script> tags in index.html
firebase.initializeApp(firebaseConfig);

// Other files import these two instead of creating their own connection.
// Logging in and approval are handled by auth.js.
export const db = firebase.database();
export const auth = firebase.auth();
