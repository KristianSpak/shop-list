import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// 🔴 Použiť rovnakú konfiguráciu ako v script.js
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
const storage = getStorage();
const recipesRef = collection(db, "recipes");

// UI elementy
const recipesDiv = document.getElementById("recipes");
const recipeListEl = document.getElementById("recipeList");
const recipeNameInput = document.getElementById("recipeName");
const recipeStepsInput = document.getElementById("recipeSteps");
const recipePhotoInput = document.getElementById("recipePhoto");
const newCategoryInput = document.getElementById("newCategory");
const recipeFilterInput = document.getElementById("recipeFilter");
const ingredientsContainer = document.getElementById("ingredientsContainer");
const ingredientsDatalist = document.getElementById("ingredientsDatalist");
const DEFAULT_RECIPE_IMAGE = "img/recipe-placeholder.jpg";


let allRecipes = [];
let editingRecipeId = null;
let allCategories = [];

// 🔹 Dynamické textarea pre postup
function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = (el.scrollHeight + 5) + "px";
}

recipeStepsInput.addEventListener("input", () => autoResizeTextarea(recipeStepsInput));

window.setRecipeStepsValue = function(text) {
  recipeStepsInput.value = text;
  autoResizeTextarea(recipeStepsInput);
}

// Po načítaní receptov z Firestore
function loadRecipes() {
  allRecipes = []; // vyčisti
  allCategories = [];

  onSnapshot(recipesRef, snapshot => {
    allRecipes = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    // aktualizácia kategórií
    const catSet = new Set();
    allRecipes.forEach(r => r.categories.forEach(c => catSet.add(c)));
    allCategories = Array.from(catSet);

    updateAllIngredients();
    renderFilterCategories(); // naplní select
    filterRecipes(); // zobrazí recepty podľa filtra
  });
}

function filterRecipes() {
  const nameFilter = document.getElementById("searchName")?.value.trim().toLowerCase() || "";
  const catFilter = document.getElementById("filterCategoriesInput")?.value.split(",").map(c => c.trim()).filter(Boolean) || [];
  const ingFilter = document.getElementById("searchIngredients")?.value.split(",").map(i => i.trim().toLowerCase()).filter(Boolean) || [];

  const filtered = allRecipes.filter(r => {
    const matchesName = r.name.toLowerCase().includes(nameFilter);
    const matchesCat = catFilter.length === 0 || r.categories.some(c => catFilter.includes(c));
    const matchesIng = ingFilter.length === 0 || ingFilter.every(i => r.ingredients.some(ing => ing.name.toLowerCase().includes(i)));
    return matchesName && matchesCat && matchesIng;
  });

  renderRecipesPaged(filtered);
}

function addIngredientInput(name = "", amount = "") {
  const div = document.createElement("div");
  div.className = "ingredient-row";
  div.draggable = true;

  const nameInput = document.createElement("input");
  nameInput.placeholder = "Ingrediencia";
  nameInput.value = name;
  nameInput.setAttribute("list", "ingredientsDatalist");

  const amountInput = document.createElement("input");
  amountInput.placeholder = "Množstvo";
  amountInput.value = amount;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "🗑";
  removeBtn.onclick = () => div.remove();

  div.appendChild(nameInput);
  div.appendChild(amountInput);
  div.appendChild(removeBtn);
  ingredientsContainer.appendChild(div);

  // Drag & Drop eventy
  div.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text/plain", null); // pre Firefox
    div.classList.add("dragging");
  });

  div.addEventListener("dragend", () => {
    div.classList.remove("dragging");
  });

  div.addEventListener("dragover", e => {
    e.preventDefault();
    const dragging = document.querySelector(".dragging");
    if (!dragging || dragging === div) return;

    const rect = div.getBoundingClientRect();
    const next = (e.clientY - rect.top) / rect.height > 0.5;
    ingredientsContainer.insertBefore(dragging, next ? div.nextSibling : div);
  });
}

function getIngredientsFromInputs() {
  return Array.from(ingredientsContainer.children).map(div => {
    const inputs = div.querySelectorAll("input");
    const name = inputs[0].value.trim();
    const amount = inputs[1].value.trim();
    return { name, amount };
  }).filter(i => i.name && i.amount);
}

const recipeModal = document.getElementById("recipeModal");
const modalTitle = document.getElementById("modalTitle");

window.showCreateRecipeForm = function() {
  editingRecipeId = null;
  modalTitle.textContent = "Nový recept";

  recipeEditDiv.classList.remove("hidden"); // zobraz edit div
  recipeViewDiv.classList.add("hidden");    // skry view div

  recipeFormReset();

  updateAllCategories();

  recipeModal.classList.remove("hidden");
  openModal(recipeModal)
}


window.closeRecipeModal = function() {
  recipeModal.classList.add("hidden");
  recipeFormReset();
  closeModal(recipeModal)
}


// 🔹 Uložiť recept
window.saveRecipe = async function() {
  const name = recipeNameInput.value.trim();
  const steps = recipeStepsInput.value.trim();
  const ingredients = getIngredientsFromInputs();
  const categories = getCategoriesFromInputs();

  if (!name || !steps || ingredients.length === 0) {
    alert("Zadajte názov, postup a aspoň jednu ingredienciu");
    return;
  }

  let photoUrl = "";
  if (recipePhotoInput.files.length > 0) {
    const file = recipePhotoInput.files[0];
    const storageRef = ref(storage, `recipes/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    photoUrl = await getDownloadURL(snapshot.ref);
  }

  const data = {
    name,
    ingredients,
    steps,
    categories,
    photoUrl,
    createdBy: auth.currentUser.uid,
    createdAt: new Date()
};


  try {
    if (editingRecipeId) {
      await updateDoc(doc(db, "recipes", editingRecipeId), data);
      alert("Recept upravený");
    } else {
      await addDoc(recipesRef, data);
      alert("Recept pridaný");
    }

    // Zavrie modal a vymaže polia
    closeRecipeModal();

  } catch (err) {
    console.error(err);
    alert("Chyba pri ukladaní receptu");
  }
}

// Elementy
const recipeViewDiv = document.getElementById("recipeView");
const recipeEditDiv = document.getElementById("recipeEdit");

// Zobraziť recept (view)
window.viewRecipe = function(id) {
  const r = allRecipes.find(r => r.id === id);
  if (!r) return;

  modalTitle.textContent = r.name;
  recipeEditDiv.classList.add("hidden");
  recipeViewDiv.classList.remove("hidden");

  recipeViewPhoto.src = r.photoUrl || "";
  recipeViewCategories.textContent = r.categories.join(", ");
  recipeViewIngredients.innerHTML = "";
  r.ingredients.forEach(i => {
    const li = document.createElement("li");
    li.textContent = `${i.name} - ${i.amount}`;
    const addBtn = document.createElement("button");
    addBtn.textContent = "+";
    addBtn.onclick = () => addIngredientToShoppingList(i.name, i.amount);
    li.appendChild(addBtn);
    recipeViewIngredients.appendChild(li);
  });
  recipeViewSteps.textContent = r.steps;

  recipeModal.classList.remove("hidden");
  openModal(recipeModal)
}

window.editRecipe = function (id) {
  const r = allRecipes.find(r => r.id === id);
  if (!r) return;

  editingRecipeId = id;

  recipeNameInput.value = r.name;
  setRecipeStepsValue(r.steps);

  // Ingrediencie
  ingredientsContainer.innerHTML = "";
  r.ingredients.forEach(i => addIngredientInput(i.name, i.amount));

  // Kategórie
  categoriesContainer.innerHTML = "";
  r.categories.forEach(c => addCategoryInput(c));

  updateAllCategories();

  recipeModal.classList.remove("hidden");
  openModal(recipeModal)
};

// 🔹 Odstrániť recept
window.deleteRecipe = async function(id) {
  if (!confirm("Naozaj chcete zmazať recept?")) return;
  try {
    await deleteDoc(doc(db, "recipes", id));
  } catch (err) {
    console.error(err);
    alert("Chyba pri mazani receptu");
  }
}

// 🔹 Pridať ingredienciu do nákupného zoznamu
window.addIngredientToShoppingList = async function(name, amount) {
  const { addDoc, collection } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
  const itemsRef = collection(db, "shoppingList");

  try {
    await addDoc(itemsRef, { text: name, count: amount });
    alert(`Ingrediencia "${name}" pridaná do nákupného zoznamu`);
  } catch (err) {
    console.error(err);
    alert("Chyba pri pridávaní ingrediencie");
  }
}

function recipeFormReset() {
  recipeNameInput.value = "";
  setRecipeStepsValue("");
  recipePhotoInput.value = "";
  categoriesContainer.innerHTML = "";
  addCategoryInput();
  ingredientsContainer.innerHTML = "";
  addIngredientInput();
}

const categoriesContainer = document.getElementById("categoriesContainer");
const categoriesDatalist = document.getElementById("categoriesDatalist");

function addCategoryInput(value = "") {
  const container = document.getElementById("categoriesContainer");

  const row = document.createElement("div");
  row.className = "category-row";

  row.innerHTML = `
    <input
      type="text"
      list="categoriesDatalist"
      placeholder="Kategória"
      value="${value}"
    />
    <button type="button">✖</button>
  `;

  row.querySelector("button").onclick = () => row.remove();

  container.appendChild(row);
}


function updateAllCategories() {
  allCategories = [
    ...new Set(
      allRecipes.flatMap(r => r.categories || [])
    )
  ];

  const datalist = document.getElementById("categoriesDatalist");
  datalist.innerHTML = "";

  allCategories.forEach(c => {
    const option = document.createElement("option");
    option.value = c;
    datalist.appendChild(option);
  });
}

function getCategoriesFromInputs() {
  return Array.from(
    document.querySelectorAll("#categoriesContainer input")
  )
    .map(i => i.value.trim())
    .filter(Boolean);
}



let allIngredients = []; // všetky ingrediencie zo všetkých receptov

// Voláme po načítaní receptov
function updateAllIngredients() {
  const set = new Set();
  allRecipes.forEach(r => r.ingredients.forEach(i => set.add(i.name)));
  allIngredients = Array.from(set);

  ingredientsDatalist.innerHTML = "";
  allIngredients.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    ingredientsDatalist.appendChild(opt);
  });
}

function renderRecipes(recipes) {
  const container = document.getElementById("recipesList");
  container.innerHTML = "";

  recipes.forEach(r => {
    const card = document.createElement("div");
    card.className = "recipe-card";

    const img = document.createElement("img");
    img.src = r.photoUrl || DEFAULT_RECIPE_IMAGE;
    img.alt = r.name;
    img.onclick = () => viewRecipe(r.id);

    const content = document.createElement("div");
    content.className = "recipe-card-content";

    const h3 = document.createElement("h3");
    h3.textContent = r.name;

    const tagsDiv = document.createElement("div");
    tagsDiv.className = "tags";
    r.categories.forEach(c => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = c;
      tagsDiv.appendChild(tag);
    });

    const actions = document.createElement("div");
    actions.classList.add("recipe-actions");

    const viewBtn = document.createElement("button");
    viewBtn.innerHTML = "👁️";
    viewBtn.title = "Zobraziť";
    viewBtn.classList.add("icon-btn");
    viewBtn.onclick = () => viewRecipe(r.id);

    const editBtn = document.createElement("button");
    editBtn.innerHTML = "✏️";
    editBtn.title = "Upraviť";
    editBtn.classList.add("icon-btn");
    editBtn.onclick = () => editRecipe(r.id);

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.title = "Zmazať";
    deleteBtn.classList.add("icon-btn", "danger");
    deleteBtn.onclick = () => deleteRecipe(r.id);

    actions.append(viewBtn, editBtn, deleteBtn);

    content.appendChild(h3);
    content.appendChild(tagsDiv);
    content.appendChild(actions);

    card.appendChild(img);
    card.appendChild(content);

    container.appendChild(card);
  });
}

let currentPage = 1;
const pageSize = 10;

function renderRecipesPaged(recipes) {
  const totalPages = Math.ceil(recipes.length / pageSize);
  const start = (currentPage - 1) * pageSize;
  const pageRecipes = recipes.slice(start, start + pageSize);

  renderRecipes(pageRecipes);

  // Tlačidlá
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  pagination.innerHTML = "";
  if (currentPage > 1) {
    const prev = document.createElement("button");
    prev.textContent = "Späť";
    prev.onclick = () => { currentPage--; renderRecipesPaged(recipes); };
    pagination.appendChild(prev);
  }
  if (currentPage < totalPages) {
    const next = document.createElement("button");
    next.textContent = "Ďalej";
    next.onclick = () => { currentPage++; renderRecipesPaged(recipes); };
    pagination.appendChild(next);
  }
}

function openModal(modal) {
  modal.classList.remove("hidden", "hide");
  modal.classList.add("show");
}

function closeModal(modal) {
  modal.classList.remove("show");
  modal.classList.add("hide");
  setTimeout(() => modal.classList.add("hidden"), 300);
}

function renderFilterCategories() {
  const datalist = document.getElementById("filterCategoriesDatalist");
  if (!datalist) return;

  const categories = [
    ...new Set(
      allRecipes.flatMap(r => r.categories || [])
    )
  ].sort();

  datalist.innerHTML = "";

  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    datalist.appendChild(option);
  });
}


window.filterRecipes = filterRecipes;
renderFilterCategories();
window.loadRecipes = loadRecipes;
window.addIngredientInput = addIngredientInput;
window.addCategoryInput = addCategoryInput;
