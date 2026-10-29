// Firebase web app configuration is public; never put service-account keys here.
window.NONO_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCEE4kstWm87W3uZzjj4b88k2aPC9-bFm4',
  authDomain: 'nono-web-ishyun-20261020.firebaseapp.com',
  databaseURL: 'https://nono-web-ishyun-20261020-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'nono-web-ishyun-20261020',
  appId: '1:1042947209712:web:a35060b2281832e9e0c535'
};

// 1-bit answer completion is enabled only for verified, server-seeded IDs.
// Other puzzles keep the legacy mask. Never change this to `true` globally.
window.NONO_PACKED_ANSWERS_READY = Object.freeze(['heart5', 'cat10', 'rocket10']);
