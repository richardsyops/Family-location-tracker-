import { firebaseConfig } from './config.js';

// `firebase` is a global that comes from the <script> tags in index.html
firebase.initializeApp(firebaseConfig);

// Other files import these two instead of creating their own connection
export const db = firebase.database();
export const auth = firebase.auth();

// Signs in anonymously and resolves with the user once we're in.
// Usage in main.js:  const user = await signIn();  then user.uid is our ID.
export function signIn() {
  return new Promise((resolve, reject) => {
    const stopListening = auth.onAuthStateChanged((user) => {
      if (user) {
        stopListening(); // we only need the first successful sign-in
        resolve(user);
      }
    });
    auth.signInAnonymously().catch(reject);
  });
}

import { firebaseConfig } from './config.js';

// `firebase` is a global that comes from the <script> tags in index.html
firebase.initializeApp(firebaseConfig);

// Other files import these two instead of creating their own connection.
// Logging in and approval are handled by auth.js.
export const db = firebase.database();
export const auth = firebase.auth();
