/**
 * ALFRED: THE BUTTLER - APP LOGIC
 * Updates: Renamed Tabs, Cleaned UI, Fixed Budget Display
 */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await db.open();
        await db.seedInitialData(); 
        console.log("Alfred ready.");
        loadInventoryView(); 
    } catch (e) {
        console.error("Init Failed:", e);
    }

    initNavigation();
    registerServiceWorker();
});

// ==========================================
// 1. NAVIGATION & UI
// ==========================================

function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('page-title');
    const fab = document.querySelector('.fab-add');

    updateUIContext('view-inventory', pageTitle, fab);

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            navButtons.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.remove('active-view'));

            const targetBtn = e.target.closest('.nav-item');
            targetBtn.classList.add('active');
            
            const targetId = targetBtn.dataset.target;
            document.getElementById(targetId).classList.add('active-view');

            updateUIContext(targetId, pageTitle, fab);

            if (targetId === 'view-inventory') loadInventoryView();
            if (targetId === 'view-shopping') loadShoppingView();
            if (targetId === 'view-expenses') loadExpensesView();
            if (targetId === 'view-cooking') loadCookingView();
        });
    });
}

function updateUIContext(viewId, titleEl, fabEl) {
    fabEl.onclick = null; 
    fabEl.style.display = 'flex'; 
    fabEl.textContent = '+';      

    switch(viewId) {
        case 'view-inventory':
            titleEl.textContent = 'Store'; // Renamed
            fabEl.style.backgroundColor = 'var(--accent-blue)';
            fabEl.onclick = () => editInventoryItem();
            break;

        case 'view-shopping':
            titleEl.textContent = 'Procure'; // Renamed
            fabEl.style.display = 'none'; 
            break;

        case 'view-cooking':
            titleEl.textContent = 'Prepare'; // Renamed
            fabEl.style.backgroundColor = 'var(--accent-green)';
            fabEl.onclick = () => openRecipeModal();
            break;

        case 'view-expenses':
            titleEl.textContent = 'Ledger'; // Renamed
            fabEl.style.backgroundColor = 'var(--accent-gold)';
            fabEl.onclick = () => openExpenseModal();
            break;
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(() => {});
        });
    }
}

// ==========================================
// 2. INVENTORY LOGIC (Store)
// ==========================================

async function loadInventoryView() {
    const listContainer = document.getElementById('inventory-list');
    try {
        const items = await db.getAll('inventory');
        renderInventoryList(items);
    } catch (err) {
        console.error(err);
    }
}

function renderInventoryList(items) {
    const listContainer = document.getElementById('inventory-list');
    listContainer.innerHTML = '';

    if (items.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">Store is empty. Tap + to add items.</div>';
        return;
    }

    const grouped = items.reduce((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const sortedCategories = Object.keys(grouped).sort();

    sortedCategories.forEach(cat => {
        const header = document.createElement('div');
        header.className = 'inv-group-header';
        header.textContent = cat;
        listContainer.appendChild(header);

        grouped[cat].sort((a, b) => a.name.localeCompare(b.name));

        grouped[cat].forEach(item => {
            const card = document.createElement('div');
            card.className = 'inv-card';
            
            const isManualShop = item.onShoppingList === true;
            const cartClass = isManualShop ? 'btn-cart active' : 'btn-cart';

            card.innerHTML = `
                <div class="card-info" onclick="editInventoryItem(${item.id})">
                    <div class="card-name">${item.name}</div>
                    <div class="card-meta">${item.store}</div>
                </div>
                <div class="card-actions">
                    <button class="${cartClass}" onclick="toggleShoppingStatus(${item.id})">🛒</button>
                    <button class="btn-qty" onclick="updateStock(${item.id}, -1)">-</button>
                    <span class="qty-display">${item.quantity} <span style="font-size:0.7em">${item.unit}</span></span>
                    <button class="btn-qty" onclick="updateStock(${item.id}, 1)">+</button>
                </div>
            `;
            listContainer.appendChild(card);
        });
    });
}

async function toggleShoppingStatus(id) {
    const items = await db.getAll('inventory');
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.onShoppingList = !item.onShoppingList;
    await db.update('inventory', item);
    loadInventoryView(); 
}

async function updateStock(id, change) {
    const items = await db.getAll('inventory');
    const item = items.find(i => i.id === id);
    if (!item) return;

    item.quantity = parseFloat(item.quantity) + change;
    if (item.quantity < 0) item.quantity = 0;
    item.quantity = Math.round(item.quantity * 100) / 100;

    await db.update('inventory', item);
    loadInventoryView(); 
}

// ==========================================
// 3. SHOPPING LOGIC (Procure)
// ==========================================

async function loadShoppingView() {
    const listContainer = document.getElementById('shopping-list');
    try {
        const items = await db.getAll('inventory');
        const toBuy = items.filter(item => 
            item.quantity <= item.restock || item.onShoppingList === true
        );
        renderShoppingList(toBuy);
    } catch (err) {
        console.error(err);
    }
}

function renderShoppingList(items) {
    const listContainer = document.getElementById('shopping-list');
    listContainer.innerHTML = '';

    if (items.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">Nothing to procure.</div>';
        return;
    }

    const grouped = items.reduce((acc, item) => {
        const store = item.store || 'Other';
        if (!acc[store]) acc[store] = [];
        acc[store].push(item);
        return acc;
    }, {});

    for (const [store, storeItems] of Object.entries(grouped)) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'shop-group';
        groupDiv.innerHTML = `<div class="shop-group-header">${store}</div>`;
        
        storeItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            
            const reason = item.onShoppingList ? "Manual Add" : `Low (${item.quantity} ${item.unit})`;

            itemDiv.innerHTML = `
                <div class="shop-item-info">
                    <div class="shop-item-name">${item.name}</div>
                    <div class="shop-item-meta">${reason}</div>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button class="btn-edit-recipe" onclick="editInventoryItem(${item.id})">✎</button>
                    <button class="btn-buy" onclick="openRestockModal(${item.id}, '${item.name}')">
                        BOUGHT
                    </button>
                </div>
            `;
            groupDiv.appendChild(itemDiv);
        });
        listContainer.appendChild(groupDiv);
    }
}

// ==========================================
// 4. EXPENSES LOGIC (Ledger)
// ==========================================

async function loadExpensesView() {
    const listContainer = document.getElementById('expenses-list');
    try {
        const allExpenses = await db.getAll('expenses');
        const budgetSetting = await db.get('settings', 'budget');
        const monthlyBudget = budgetSetting ? parseFloat(budgetSetting.value) : 250;

        const now = new Date();
        const currentMonthPrefix = now.toISOString().slice(0, 7); 
        const monthlyExpenses = allExpenses.filter(e => e.date.startsWith(currentMonthPrefix));
        
        renderPieChart(monthlyExpenses, monthlyBudget);
        renderExpenseList(monthlyExpenses);
    } catch (err) {
        console.error(err);
    }
}

function renderPieChart(expenses, budgetLimit) {
    const listContainer = document.getElementById('expenses-list');
    listContainer.innerHTML = ''; 

    const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
    const catTotals = {};
    expenses.forEach(e => {
        catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });

    const colors = ['#ff6b6b', '#fcc419', '#51cf66', '#339af0', '#cc5de8', '#845ef7'];
    let gradientStr = '';
    let currentDeg = 0;
    let legendHTML = '';

    Object.entries(catTotals).forEach(([cat, amount], index) => {
        const pct = (amount / totalSpent) * 100;
        const deg = (pct / 100) * 360;
        const color = colors[index % colors.length];
        gradientStr += `${color} ${currentDeg}deg ${currentDeg + deg}deg, `;
        currentDeg += deg;
        legendHTML += `<div class="legend-item"><div class="legend-dot" style="background-color:${color}"></div>${cat} (${Math.round(pct)}%)</div>`;
    });

    gradientStr = gradientStr.slice(0, -2);
    if (totalSpent === 0) gradientStr = '#444 0deg 360deg'; 

    const chartHTML = `
        <div class="chart-container">
            <div class="pie-chart" style="background: conic-gradient(${gradientStr})">
                <div class="pie-hole">
                    <span class="total-spend-label">Total Spent</span>
                    <div style="display:flex; align-items:center;">
                        <span class="total-spend-amount">€${totalSpent.toFixed(2)}</span>
                    </div>
                    <div style="font-size:0.8rem; color:#888; margin-top:5px;">
                        Limit: €${budgetLimit} 
                        <button class="btn-edit-budget" onclick="editBudget(${budgetLimit})">✎</button>
                    </div>
                </div>
            </div>
            <div class="chart-legend">${legendHTML}</div>
        </div>
    `;
    listContainer.innerHTML = chartHTML;
}

async function editBudget(currentLimit) {
    const newLimit = prompt("Enter new monthly budget (€):", currentLimit);
    if (newLimit && !isNaN(newLimit)) {
        await db.update('settings', { id: 'budget', value: parseFloat(newLimit) });
        loadExpensesView();
    }
}

function renderExpenseList(expenses) {
    const listContainer = document.getElementById('expenses-list');
    const header = document.createElement('div');
    header.className = 'history-header';
    header.innerHTML = `<span class="history-title">Recent Transactions</span><button class="btn-link" onclick="viewAllExpenses()">View All</button>`;
    listContainer.appendChild(header);

    const recent = expenses.slice(0, 10);
    if (recent.length === 0) {
        listContainer.innerHTML += '<div class="empty-state">No expenses this month.</div>';
    } else {
        recent.forEach(item => {
            const div = document.createElement('div');
            div.className = 'expense-item';
            div.innerHTML = `
                <div>
                    <div class="expense-date">${item.date} • ${item.category}</div>
                    <div class="expense-title">${item.title}</div>
                </div>
                <div class="expense-amount">-€${item.amount.toFixed(2)}</div>
            `;
            listContainer.appendChild(div);
        });
    }

    const archiveBtn = document.createElement('button');
    archiveBtn.className = 'btn-archive';
    archiveBtn.textContent = "📥 Download CSV & Clear Old Data";
    archiveBtn.onclick = () => exportAndClearData();
    listContainer.appendChild(archiveBtn);
}

async function exportAndClearData() {
    const allExpenses = await db.getAll('expenses');
    if (allExpenses.length === 0) { alert("No data to export."); return; }

    let csvContent = "data:text/csv;charset=utf-8,Date,Category,Description,Amount\n";
    allExpenses.forEach(e => {
        csvContent += `${e.date},${e.category},"${e.title}",${e.amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `Alfred_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click(); 

    if (confirm("CSV Downloaded. Do you want to DELETE all expense data from the app to start fresh?")) {
        const tx = db.db.transaction(['expenses'], 'readwrite');
        tx.objectStore('expenses').clear();
        alert("Data cleared. Ready for new month.");
        loadExpensesView();
    }
}

window.viewAllExpenses = function() {
    alert("Full history view coming in v2. Check CSV export for details.");
}

// ==========================================
// 6. COOKING LOGIC (Prepare)
// ==========================================

let currentCookFilter = 'Lunch'; 

async function loadCookingView() {
    const listContainer = document.getElementById('cooking-list');
    
    let filterBar = document.querySelector('.filter-bar');
    if (!filterBar) {
        filterBar = document.createElement('div');
        filterBar.className = 'filter-bar';
        listContainer.parentNode.insertBefore(filterBar, listContainer);
    }

    filterBar.innerHTML = `
        <button class="filter-btn ${currentCookFilter === 'Breakfast' ? 'active' : ''}" onclick="switchCookTab('Breakfast')">Breakfast</button>
        <button class="filter-btn ${currentCookFilter === 'Lunch' ? 'active' : ''}" onclick="switchCookTab('Lunch')">Lunch</button>
        <button class="filter-btn ${currentCookFilter === 'Dinner' ? 'active' : ''}" onclick="switchCookTab('Dinner')">Dinner</button>
    `;

    try {
        const [recipes, inventory] = await Promise.all([
            db.getAll('recipes'),
            db.getAll('inventory')
        ]);

        const now = new Date();

        const filteredRecipes = recipes.filter(r => {
            if (!r.mealType) return true; 
            return r.mealType === currentCookFilter || r.mealType === 'Any';
        });

        const scoredRecipes = filteredRecipes.map(recipe => {
            let canCook = true;
            let totalSurplus = 0;
            let ingredientCount = 0;

            const enrichedIngredients = recipe.ingredients.map(ing => {
                const stockItem = inventory.find(i => i.name.toLowerCase().includes(ing.name.toLowerCase()));
                const hasQty = stockItem ? stockItem.quantity : 0;
                const required = ing.qty;
                const isMissing = hasQty < required;

                if (isMissing) canCook = false;

                if (stockItem && stockItem.restock > 0) {
                    totalSurplus += (stockItem.quantity / stockItem.restock);
                    ingredientCount++;
                }

                return { ...ing, hasQty, isMissing };
            });

            let score = ingredientCount > 0 ? (totalSurplus / ingredientCount) : 0;

            let lastCookedText = "Never";
            if (recipe.lastCooked) {
                const lastDate = new Date(recipe.lastCooked);
                const hoursSince = (now - lastDate) / (1000 * 60 * 60);
                const day = lastDate.getDate();
                const month = lastDate.toLocaleString('default', { month: 'short' });
                lastCookedText = `${day} ${month}`;

                if (hoursSince < 24) { score -= 100; lastCookedText = "Today (Avoid)"; } 
                else if (hoursSince < 48) { score -= 50; lastCookedText = "Yesterday"; }
            }

            return { ...recipe, ingredients: enrichedIngredients, canCook, score, lastCookedText };
        });

        scoredRecipes.sort((a, b) => {
            if (a.canCook !== b.canCook) return b.canCook - a.canCook; 
            return b.score - a.score; 
        });

        renderCookingList(scoredRecipes);

    } catch (err) {
        console.error(err);
    }
}

window.switchCookTab = function(tabName) {
    currentCookFilter = tabName;
    loadCookingView();
}

function renderCookingList(recipes) {
    const listContainer = document.getElementById('cooking-list');
    listContainer.innerHTML = '';

    if (recipes.length === 0) {
        listContainer.innerHTML = `<div class="empty-state">No ${currentCookFilter} recipes yet.</div>`;
        return;
    }

    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        const ingHTML = recipe.ingredients.map(ing => `
            <li class="ing-item ${ing.isMissing ? 'missing' : ''}">
                <span>${ing.name}</span>
                <span>${ing.required || ing.qty} ${ing.unit} ${ing.isMissing ? '(Low)' : ''}</span>
            </li>
        `).join('');

        let videoBtn = '';
        if (recipe.link) {
            let btnText = "Open Link";
            if (recipe.link.includes('youtube') || recipe.link.includes('youtu.be')) btnText = "Watch Video";
            else if (recipe.link.includes('instagram')) btnText = "View Post";
            else if (recipe.link.includes('facebook')) btnText = "View Post";
            videoBtn = `<a href="${recipe.link}" target="_blank" class="btn-video">${btnText}</a>`;
        }

        const isRecent = recipe.lastCookedText.includes("Today") || recipe.lastCookedText.includes("Yesterday");
        const recentStyle = isRecent ? 'color: #888; font-size: 0.8rem;' : 'color: var(--accent-green); font-size: 0.8rem;';

        card.innerHTML = `
            <div class="recipe-header">
                <div>
                    <div class="recipe-title">${recipe.name}</div>
                    <div style="${recentStyle}">Last: ${recipe.lastCookedText}</div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="recipe-protein">${recipe.protein}g P</span>
                    <button class="btn-edit-recipe" onclick="openRecipeModal(${recipe.id})">✎</button>
                </div>
            </div>
            <div class="recipe-body">
                <ul class="ingredient-list">
                    ${ingHTML}
                </ul>
                <div class="recipe-actions">
                    <button class="btn-cook" 
                        ${!recipe.canCook ? 'disabled' : ''} 
                        onclick="logCook(${recipe.id})">
                        ${recipe.canCook ? 'LOG MEAL' : 'MISSING ITEMS'}
                    </button>
                    ${videoBtn}
                </div>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

window.logCook = async function(recipeId) {
    const recipes = await db.getAll('recipes');
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    if(!confirm(`Log "${recipe.name}" as eaten? \n(Inventory will NOT be deducted)`)) return;

    recipe.lastCooked = new Date().toISOString();
    await db.update('recipes', recipe);
    loadCookingView();
};

// ==========================================
// 5. MODALS & FORMS
// ==========================================

window.openModal = function(type, titleText, htmlContent, saveCallback) {
    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    const title = document.getElementById('modal-title');
    const saveBtn = document.getElementById('modal-save-btn');

    if (type === 'modal-inventory' && !htmlContent) { editInventoryItem(); return; }
    if (type === 'modal-expenses' && !htmlContent) { openExpenseModal(); return; }
    if (type === 'modal-recipe' && !htmlContent) { openRecipeModal(); return; }

    title.textContent = titleText || "Edit";
    body.innerHTML = htmlContent;
    
    saveBtn.onclick = saveCallback;
    modal.classList.remove('hidden');
}

window.closeModal = function() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

async function handleDynamicDropdown(elementId, type) {
    const select = document.getElementById(elementId);
    if (select.value === 'ADD_NEW') {
        const newVal = prompt(`Enter new ${type.slice(0, -1)} name:`);
        if (newVal && newVal.trim() !== "") {
            await db.addToList(type, newVal.trim());
            const options = await db.getList(type);
            select.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('') + `<option value="ADD_NEW" style="font-weight:bold; color:var(--accent-blue);">+ Add New...</option>`;
            select.value = newVal.trim();
        } else {
            select.value = select.options[0].value; 
        }
    }
}

// --- FORM: Inventory ---
window.editInventoryItem = async function(id = null) {
    let item = {};
    let title = "Add Item";

    if (id) {
        const items = await db.getAll('inventory');
        item = items.find(i => i.id === id);
        title = "Edit Item";
    }

    const stores = await db.getList('stores');
    const storeOptions = stores.map(s => `<option value="${s}" ${item.store === s ? 'selected' : ''}>${s}</option>`).join('');

    const data = {
        id: item.id || '',
        name: item.name || '',
        quantity: item.quantity || 0,
        unit: item.unit || 'count',
        restock: item.restock || 5,
        critical: item.critical || 2,
        store: item.store || stores[0],
        category: item.category || 'Pantry'
    };

    const html = `
        <input type="hidden" id="inv-id" value="${data.id}">
        <div class="form-group"><label>Name</label><input type="text" id="inv-name" value="${data.name}"></div>
        <div class="form-group" style="display:flex; gap:10px;">
            <div style="flex:1"><label>Qty</label><input type="number" id="inv-qty" value="${data.quantity}"></div>
            <div style="flex:1"><label>Unit</label>
                <select id="inv-unit">
                    <option value="count" ${data.unit === 'count'?'selected':''}>Count</option>
                    <option value="g" ${data.unit === 'g'?'selected':''}>g</option>
                    <option value="kg" ${data.unit === 'kg'?'selected':''}>kg</option>
                    <option value="mL" ${data.unit === 'mL'?'selected':''}>mL</option>
                </select>
            </div>
        </div>
        <div class="form-group" style="display:flex; gap:10px;">
            <div style="flex:1"><label>Restock (<)</label><input type="number" id="inv-restock" value="${data.restock}"></div>
            <div style="flex:1"><label>Critical (<)</label><input type="number" id="inv-critical" value="${data.critical}"></div>
        </div>
        <div class="form-group">
            <label>Store</label>
            <select id="inv-store" onchange="handleDynamicDropdown('inv-store', 'stores')">
                ${storeOptions}
                <option value="ADD_NEW" style="font-weight:bold; color:var(--accent-blue);">+ Add New...</option>
            </select>
        </div>
        <div class="form-group"><label>Category</label>
            <select id="inv-category">
                <option value="Protein" ${data.category === 'Protein'?'selected':''}>Protein</option>
                <option value="Carbs" ${data.category === 'Carbs'?'selected':''}>Carbs</option>
                <option value="Pantry" ${data.category === 'Pantry'?'selected':''}>Pantry</option>
                <option value="Spices" ${data.category === 'Spices'?'selected':''}>Spices</option>
                <option value="Veggies" ${data.category === 'Veggies'?'selected':''}>Veggies</option>
            </select>
        </div>
        ${id ? `<button onclick="deleteItem('inventory', ${id})" style="color:red; background:none; border:none; margin-top:10px;">Delete Item</button>` : ''}
    `;

    openModal('modal-inventory', title, html, saveInventory);
};

async function saveInventory() {
    const id = document.getElementById('inv-id').value;
    const item = {
        name: document.getElementById('inv-name').value,
        quantity: parseFloat(document.getElementById('inv-qty').value) || 0,
        unit: document.getElementById('inv-unit').value,
        restock: parseFloat(document.getElementById('inv-restock').value) || 0,
        critical: parseFloat(document.getElementById('inv-critical').value) || 0,
        store: document.getElementById('inv-store').value,
        category: document.getElementById('inv-category').value
    };

    if (id) { 
        const oldItem = await db.get('inventory', parseInt(id));
        if (oldItem) item.onShoppingList = oldItem.onShoppingList;
        item.id = parseInt(id); 
        await db.update('inventory', item); 
    } 
    else { await db.add('inventory', item); }
    
    closeModal();
    const activeView = document.querySelector('.active-view').id;
    if(activeView === 'view-inventory') loadInventoryView();
    if(activeView === 'view-shopping') loadShoppingView();
}

// --- FORM: Restock ---
window.openRestockModal = function(id, name) {
    const html = `
        <input type="hidden" id="buy-id" value="${id}">
        <p style="margin-bottom:15px; color:#aaa;">Buying <strong>${name}</strong></p>
        <div class="form-group"><label>Quantity Bought</label><input type="number" id="buy-qty"></div>
        <p style="font-size:0.8rem; color:#666;">Stock will update. Log total cost in Ledger tab.</p>
    `;
    openModal('modal-restock', 'Restock', html, processRestock);
};

async function processRestock() {
    const id = parseInt(document.getElementById('buy-id').value);
    const qty = parseFloat(document.getElementById('buy-qty').value);

    if (!qty) return;

    const items = await db.getAll('inventory');
    const item = items.find(i => i.id === id);
    if (item) {
        item.quantity += qty;
        item.onShoppingList = false; 
        await db.update('inventory', item);
    }

    closeModal();
    loadShoppingView();
}

// --- FORM: Expenses ---
window.openExpenseModal = async function() {
    const today = new Date().toISOString().split('T')[0];
    const categories = await db.getList('categories');
    const catOptions = categories.map(c => `<option value="${c}">${c}</option>`).join('');

    const html = `
        <div class="form-group"><label>Amount (€)</label><input type="number" id="exp-amount" step="0.01" style="font-size:1.5rem;"></div>
        <div class="form-group"><label>Category</label>
            <select id="exp-category" onchange="handleDynamicDropdown('exp-category', 'categories')">
                ${catOptions}
                <option value="ADD_NEW" style="font-weight:bold; color:var(--accent-blue);">+ Add New...</option>
            </select>
        </div>
        <div class="form-group"><label>Description</label><input type="text" id="exp-title"></div>
        <div class="form-group"><label>Date</label><input type="date" id="exp-date" value="${today}"></div>
    `;
    openModal('modal-expenses', 'Log Expense', html, saveExpense);
};

async function saveExpense() {
    const amount = parseFloat(document.getElementById('exp-amount').value);
    if (!amount) return;

    await db.add('expenses', {
        amount,
        category: document.getElementById('exp-category').value,
        title: document.getElementById('exp-title').value || 'Expense',
        date: document.getElementById('exp-date').value
    });

    closeModal();
    loadExpensesView();
}

// --- FORM: RECIPE BUILDER ---
window.openRecipeModal = async function(id = null) {
    let recipe = { name: '', protein: 0, link: '', mealType: 'Lunch', ingredients: [] };
    let title = "Add Recipe";

    const inventory = await db.getAll('inventory');
    inventory.sort((a, b) => a.name.localeCompare(b.name));

    if (id) {
        const recipes = await db.getAll('recipes');
        recipe = recipes.find(r => r.id === id);
        title = "Edit Recipe";
    }

    const invOptions = inventory.map(i => `<option value="${i.name}">${i.name} (${i.unit})</option>`).join('');
    window.currentInvOptions = invOptions; 

    const html = `
        <input type="hidden" id="rec-id" value="${recipe.id || ''}">
        <div class="form-group">
            <label>Dish Name</label>
            <input type="text" id="rec-name" value="${recipe.name}" placeholder="e.g. Pasta Carbonara">
        </div>
        <div class="form-group" style="display:flex; gap:10px;">
            <div style="flex:1">
                <label>Protein (g)</label>
                <input type="number" id="rec-protein" value="${recipe.protein}">
            </div>
            <div style="flex:1">
                <label>Meal Type</label>
                <select id="rec-mealtype">
                    <option value="Breakfast" ${recipe.mealType === 'Breakfast' ? 'selected' : ''}>Breakfast</option>
                    <option value="Lunch" ${recipe.mealType === 'Lunch' ? 'selected' : ''}>Lunch</option>
                    <option value="Dinner" ${recipe.mealType === 'Dinner' ? 'selected' : ''}>Dinner</option>
                    <option value="Any" ${recipe.mealType === 'Any' ? 'selected' : ''}>Any/Snack</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Video Link (Optional)</label>
            <input type="text" id="rec-link" value="${recipe.link || ''}" placeholder="https://youtube.com/...">
        </div>
        
        <label style="display:block; margin-bottom:5px; color:#aaa;">Major Ingredients</label>
        <div id="ing-container"></div>
        <button class="btn-add-row" onclick="addIngredientRow()">+ Add Ingredient</button>

        ${id ? `<button onclick="deleteItem('recipes', ${id})" style="color:red; background:none; border:none;">Delete Recipe</button>` : ''}
    `;

    openModal('modal-recipe', title, html, saveRecipe);

    if (recipe.ingredients.length > 0) {
        recipe.ingredients.forEach(ing => addIngredientRow(ing));
    } else {
        addIngredientRow(); 
    }
};

window.addIngredientRow = function(data = {}) {
    const container = document.getElementById('ing-container');
    const div = document.createElement('div');
    div.className = 'ing-row';
    
    div.innerHTML = `
        <select class="ing-select">
            <option value="">Select Item...</option>
            ${window.currentInvOptions}
        </select>
        <input type="number" class="ing-qty" placeholder="Qty" value="${data.qty || ''}">
        <input type="text" class="ing-unit" placeholder="Unit" value="${data.unit || ''}">
        <button class="btn-remove-row" onclick="this.parentElement.remove()">×</button>
    `;

    if (data.name) {
        const select = div.querySelector('select');
        select.value = data.name;
    }
    container.appendChild(div);
};

async function saveRecipe() {
    const id = document.getElementById('rec-id').value;
    const name = document.getElementById('rec-name').value;
    const protein = parseFloat(document.getElementById('rec-protein').value) || 0;
    const link = document.getElementById('rec-link').value;
    const mealType = document.getElementById('rec-mealtype').value;

    if (!name) { alert("Name required"); return; }

    const rows = document.querySelectorAll('.ing-row');
    const ingredients = [];
    
    rows.forEach(row => {
        const select = row.querySelector('.ing-select');
        const qtyInput = row.querySelector('.ing-qty');
        const unitInput = row.querySelector('.ing-unit');

        if (select.value && qtyInput.value) {
            ingredients.push({
                name: select.value,
                qty: parseFloat(qtyInput.value),
                unit: unitInput.value || 'unit'
            });
        }
    });

    const recipe = { name, protein, link, mealType, ingredients };

    if (id) {
        const oldRecipes = await db.getAll('recipes');
        const oldRec = oldRecipes.find(r => r.id === parseInt(id));
        if (oldRec && oldRec.lastCooked) recipe.lastCooked = oldRec.lastCooked;
        
        recipe.id = parseInt(id);
        await db.update('recipes', recipe);
    } else {
        await db.add('recipes', recipe);
    }

    closeModal();
    loadCookingView();
}

window.deleteItem = async function(store, id) {
    if(confirm("Delete?")) {
        await db.delete(store, id);
        closeModal();
        const activeView = document.querySelector('.active-view').id;
        if(activeView === 'view-inventory') loadInventoryView();
        if(activeView === 'view-cooking') loadCookingView();
        if(activeView === 'view-shopping') loadShoppingView();
    }
}