// "Who am I?" lives here. In the old single file, userId and userName were variables
// that every part could see. Separate files can't share variables like that,
// so they all ask this file instead.

let currentUser = null;
let userName = 'Unknown';

// Called once from main.js, right after the person is approved
export function setSession(user) {
  currentUser = user;
  // Signup saves a display name. Accounts made by hand in the Firebase console
  // don't have one, so fall back to the first part of the email.
  userName = user.displayName || (user.email ? user.email.split('@')[0] : 'Unknown');
}

export function getUserId() {
  return currentUser.uid;
}

export function getUserName() {
  return userName;
}

// Used later by the "Edit my name" button
export function setUserName(name) {
  userName = name;
}
