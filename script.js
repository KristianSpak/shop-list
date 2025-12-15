import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔴 DOPLŇ SVOJE ÚDAJE
const firebaseConfig = {
  apiKey: "AIzaSyAwfWUFRLVCE35BuFiqXvFANbw5DThDsUs",
  authDomain: "shop-list-46c15.firebaseapp.com",
  projectId: "shop-list-46c15",
  storageBucket: "shop-list-46c15.firebasestorage.app",
  messagingSenderId: "914737572872",
  appId: "1:914737572872:web:1c4ab9da0b07ee31a7b5bd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const itemsRef = collection(db, "shoppingList");

// udrží prihlásenie aj po refreshe
setPersistence(auth, browserLocalPersistence);

// UI
const loginDiv = document.getElementById("login");
const appDiv = document.getElementById("app");
const listEl = document.getElementById("list");

// AUTH STATE
onAuthStateChanged(auth, user => {
  if (user) {
    loginDiv.classList.add("hidden");
    appDiv.classList.remove("hidden");
    loadItems();
  } else {
    loginDiv.classList.remove("hidden");
    appDiv.classList.add("hidden");
  }
});

// LOGIN
window.login = async function () {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const email = emailInput.value;
  const password = passwordInput.value;

  await signInWithEmailAndPassword(auth, email, password);
};

// LOGOUT
window.logout = async function () {
  await signOut(auth);
};

// LOAD ITEMS (realtime)
function loadItems() {
  onSnapshot(itemsRef, snapshot => {
    listEl.innerHTML = "";
    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      const li = document.createElement("li");
      li.innerHTML = `
        ${item.text} (${item.count}x)
        <button onclick="removeItem('${docSnap.id}')">🛒</button>
      `;
      listEl.appendChild(li);
    });
  });
}

// ADD
window.addItem = async function () {
    const textInput = document.getElementById("text");
    const countInput = document.getElementById("count");

    const text = textInput.value.trim();
    let count = countInput.value || 1;

    await addDoc(itemsRef, { text, count });

    textInput.value = "";
    countInput.value = "";
};

// REMOVE (vložené do košíka)
window.removeItem = async function (id) {
  await deleteDoc(doc(db, "shoppingList", id));
};
