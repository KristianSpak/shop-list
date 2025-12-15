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

// 🔴 TU DOPLŇ SVOJE ÚDAJE
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

// uchovanie loginu v localStorage (zostane prihlásený)
setPersistence(auth, browserLocalPersistence);

// UI
const loginDiv = document.getElementById("login");
const appDiv = document.getElementById("app");
const listEl = document.getElementById("list");

// sledovanie auth state
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
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Zadajte email aj heslo");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert("Zlé prihlasovacie údaje");
    console.error(err);
  }
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

// ADD ITEM
window.addItem = async function () {
  const textInput = document.getElementById("text");
  const countInput = document.getElementById("count");

  const text = textInput.value.trim();
  let count = parseInt(countInput.value);
  if (!count || count < 1) count = 1;

  if (!text) return;

  try {
    await addDoc(itemsRef, { text, count });
    textInput.value = "";
    countInput.value = "";
  } catch (err) {
    console.error("Chyba pri pridávaní:", err);
    alert("Nepodarilo sa pridať položku");
  }
};

// REMOVE ITEM (vložené do košíka)
window.removeItem = async function (id) {
  try {
    await deleteDoc(doc(db, "shoppingList", id));
  } catch (err) {
    console.error("Chyba pri mazani:", err);
    alert("Nepodarilo sa odstrániť položku");
  }
};
