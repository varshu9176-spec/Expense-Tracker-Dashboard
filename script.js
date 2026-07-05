
const API = "http://localhost:5000";
const DEMO_USER = {
  name: "Alex Morgan",
  email: "admin@example.com",
  password: "123456"
};

let chart;
let currentUser = null;

function init() {
  const storedUser = localStorage.getItem("expenseTrackerUser");
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    renderDashboard();
    loadData();
  } else {
    renderLogin();
  }

  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("transactionForm").addEventListener("submit", handleAddTransaction);
}

function renderLogin() {
  document.getElementById("loginView").classList.remove("hidden");
  document.getElementById("dashboardView").classList.add("hidden");
  document.getElementById("loginError").textContent = "";
}

function renderDashboard() {
  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("dashboardView").classList.remove("hidden");
  document.getElementById("userName").textContent = currentUser?.name || "User";
}

function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (email === DEMO_USER.email && password === DEMO_USER.password) {
    currentUser = DEMO_USER;
    localStorage.setItem("expenseTrackerUser", JSON.stringify(currentUser));
    renderDashboard();
    loadData();
  } else {
    document.getElementById("loginError").textContent = "Invalid email or password.";
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem("expenseTrackerUser");
  renderLogin();
  document.getElementById("loginForm").reset();
}

async function loadData() {
  const statusMessage = document.getElementById("statusMessage");
  statusMessage.textContent = "Syncing with your tracker…";

  try {
    const res = await fetch(`${API}/expenses`);
    if (!res.ok) throw new Error("Unable to load expenses");

    const data = await res.json();
    let income = 0;
    let expense = 0;

    const list = document.getElementById("list");
    list.innerHTML = "";

    const categoryMap = {};

    data.forEach((item) => {
      if (item.type === "income") income += item.amount;
      else expense += item.amount;

      categoryMap[item.category] = (categoryMap[item.category] || 0) + item.amount;

      const li = document.createElement("li");
      li.innerHTML = `
        <div class="transaction-meta">
          <strong>${item.title}</strong>
          <span>₹${item.amount} • ${item.category}</span>
          <span class="badge ${item.type}">${item.type}</span>
        </div>
        <div class="actions">
          <button type="button" onclick="editExpense('${item._id}', '${item.title}', ${item.amount}, '${item.type}', '${item.category}')">✏️</button>
          <button type="button" onclick="deleteExpense('${item._id}')">🗑️</button>
        </div>
      `;
      list.appendChild(li);
    });

    document.getElementById("income").textContent = `₹${income}`;
    document.getElementById("expense").textContent = `₹${expense}`;
    document.getElementById("balance").textContent = `₹${income - expense}`;
    statusMessage.textContent = data.length ? "Your latest transactions are ready." : "No transactions yet. Add your first one.";
    updateChart(categoryMap);
  } catch (error) {
    document.getElementById("income").textContent = "₹0";
    document.getElementById("expense").textContent = "₹0";
    document.getElementById("balance").textContent = "₹0";
    statusMessage.textContent = "Backend is offline. You can still browse the dashboard UI.";
    updateChart({});
  }
}

async function handleAddTransaction(event) {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value.trim();

  if (!title || !amount || !category) return;

  try {
    await fetch(`${API}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, amount, type, category })
    });
    clearForm();
    loadData();
  } catch (error) {
    document.getElementById("statusMessage").textContent = "Could not save the transaction right now.";
  }
}

async function deleteExpense(id) {
  try {
    await fetch(`${API}/expenses/${id}`, { method: "DELETE" });
    loadData();
  } catch (error) {
    document.getElementById("statusMessage").textContent = "Could not delete the transaction.";
  }
}

async function editExpense(id, title, amount, type, category) {
  const newTitle = prompt("Edit Title", title);
  const newAmount = prompt("Edit Amount", amount);
  const newType = prompt("Edit Type (income/expense)", type);
  const newCategory = prompt("Edit Category", category);

  if (!newTitle || !newAmount) return;

  try {
    await fetch(`${API}/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        amount: Number(newAmount),
        type: newType,
        category: newCategory
      })
    });
    loadData();
  } catch (error) {
    document.getElementById("statusMessage").textContent = "Could not update the transaction.";
  }
}

function updateChart(data) {
  const ctx = document.getElementById("chart");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ["#ff6384", "#36a2eb", "#ffce56", "#8e44ad", "#2ecc71"]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

function clearForm() {
  document.getElementById("title").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("category").value = "";
  document.getElementById("type").value = "income";
}

document.addEventListener("DOMContentLoaded", init);