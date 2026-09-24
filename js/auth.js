// The login gate. It runs FIRST. The map and everything else only start
// after requireApproval() finishes, which only happens for approved people.
import { auth, db } from '../firebase.js';

const el = (id) => document.getElementById(id);

// ---- Grab the pieces of the login screen (all defined in index.html) ----
const overlay = el('auth-overlay');
const views = {
  loading: el('auth-loading-view'),
  login: el('auth-login-view'),
  waiting: el('auth-waiting-view')
};
const form = el('auth-form');
const subtitleEl = el('auth-subtitle');
const nameInput = el('auth-name');
const emailInput = el('auth-email');
const passwordInput = el('auth-password');
const submitBtn = el('auth-submit');
const messageEl = el('auth-message');
const toggleBtn = el('auth-toggle');
const forgotBtn = el('auth-forgot');
const logoutBtn = el('auth-logout-btn');

let mode = 'login';   // 'login' or 'signup'
let signupName = '';  // remembered because Firebase saves the name a moment after the account is created

// ---- Small helpers ----
function showView(name) {
  overlay.classList.remove('hidden');
  Object.keys(views).forEach((key) => {
    views[key].classList.toggle('hidden', key !== name);
  });
}

function setMode(newMode) {
  mode = newMode;
  const isSignup = mode === 'signup';
  nameInput.classList.toggle('hidden', !isSignup);
  forgotBtn.classList.toggle('hidden', isSignup);
  passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
  subtitleEl.textContent = isSignup
    ? 'Request access. The admin has to approve you before you can get in.'
    : 'Log in to continue';
  submitBtn.textContent = isSignup ? 'Request access' : 'Log in';
  toggleBtn.textContent = isSignup ? 'Already approved? Log in' : 'New here? Request access';
  messageEl.textContent = '';
}

// Firebase error codes are ugly, so we translate the common ones
function friendlyError(error) {
  const messages = {
    'auth/invalid-email': "That email doesn't look right.",
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'Wrong email or password.',
    'auth/email-already-in-use': 'That email already has an account. Try logging in.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many tries. Wait a bit and try again.',
    'auth/network-request-failed': 'No internet. Check your connection.'
  };
  return messages[error.code] || 'Something went wrong. Try again.';
}

// ---- Form actions ----
form.addEventListener('submit', async (event) => {
  event.preventDefault(); // stop the page from reloading
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const name = nameInput.value.trim();

  if (!email || !password) {
    messageEl.textContent = 'Enter your email and password.';
    return;
  }
  if (mode === 'signup' && !name) {
    messageEl.textContent = 'Enter your name so the admin knows who you are.';
    return;
  }

  submitBtn.disabled = true;
  messageEl.textContent = '';
  try {
    if (mode === 'signup') {
      signupName = name; // set BEFORE creating the account, see comment at the top
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
    // Success: onAuthStateChanged (below) takes over from here
  } catch (error) {
    messageEl.textContent = friendlyError(error);
  }
  submitBtn.disabled = false;
});

toggleBtn.addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'));

forgotBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  if (!email) {
    messageEl.textContent = 'Type your email above first, then tap this again.';
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    messageEl.textContent = 'Reset link sent. Check your email (and spam folder).';
  } catch (error) {
    messageEl.textContent = friendlyError(error);
  }
});

logoutBtn.addEventListener('click', () => auth.signOut());

export function logout() {
  return auth.signOut();
}

// ---- Tell the admin someone is knocking ----
function sendAccessRequest(user) {
  return db.ref('pending/' + user.uid).set({
    name: user.displayName || signupName || 'Unknown',
    email: user.email,
    requestedAt: firebase.database.ServerValue.TIMESTAMP
  }).catch((error) => console.warn('Could not send request:', error.message));
}

// ---- The gate itself ----
// Usage in main.js:   const user = await requireApproval();
// The promise only finishes once this person is logged in AND approved.
export function requireApproval() {
  return new Promise((resolve) => {
    let stopWatching = null;
    let unlocked = false;
    let requestSent = false;

    setMode('login');
    showView('loading'); // avoids a flash of the login form while Firebase restores an old session

    auth.onAuthStateChanged((user) => {
      // Clean up the previous approval listener, if any
      if (stopWatching) {
        stopWatching();
        stopWatching = null;
      }
      requestSent = false;

      if (!user) {
        if (unlocked) {          // they logged out from inside the app
          location.reload();
          return;
        }
        passwordInput.value = '';
        showView('login');
        return;
      }

      showView('loading');
      // Watch approved/<my id> live, so the moment the admin approves, we unlock
      const approvedRef = db.ref('approved/' + user.uid);

      const onChange = (snapshot) => {
        if (snapshot.val() === true) {
          unlocked = true;
          overlay.classList.add('hidden');
          resolve(user);
        } else {
          if (unlocked) {        // approval was taken away while they were using the app
            location.reload();
            return;
          }
          showView('waiting');
          if (!requestSent) {
            requestSent = true;
            sendAccessRequest(user);
          }
        }
      };

      const onError = () => {
        showView('login');
        messageEl.textContent = 'Could not check your approval. Try again.';
      };

      approvedRef.on('value', onChange, onError);
      stopWatching = () => approvedRef.off('value', onChange);
    });
  });
}
