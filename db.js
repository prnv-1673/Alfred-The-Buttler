/**
 * ALFRED - Database Layer (Version 5: Meal Types)
 */

class AlfredDB {
    constructor() {
        this.dbName = 'Alfred_DB'; 
        this.dbVersion = 5; // Bumped for Meal Types
        this.db = null;
    }

    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('inventory')) {
                    const store = db.createObjectStore('inventory', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('name', 'name', { unique: false });
                }
                if (!db.objectStoreNames.contains('expenses')) {
                    const store = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('date', 'date', { unique: false });
                }
                if (!db.objectStoreNames.contains('recipes')) {
                    const store = db.createObjectStore('recipes', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("DB Opened Successfully");
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("DB Error:", event.target.error);
                reject("DB Error");
            };
        });
    }

    // --- GENERIC CRUD ---
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readwrite');
            const request = tx.objectStore(storeName).add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readonly');
            const request = tx.objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readonly');
            const request = tx.objectStore(storeName).get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readwrite');
            const request = tx.objectStore(storeName).put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readwrite');
            const request = tx.objectStore(storeName).delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // --- SETTINGS MANAGEMENT ---
    async getList(type) {
        const result = await this.get('settings', type);
        if (result) return result.options;
        return []; 
    }

    async addToList(type, newItem) {
        const data = await this.get('settings', type);
        if (data) {
            if (!data.options.includes(newItem)) {
                data.options.push(newItem);
                data.options.sort(); 
                await this.update('settings', data);
            }
        }
    }

    // --- SEEDING ---
    async seedInitialData() {
        // 1. Settings
        const settingsCheck = await this.get('settings', 'stores');
        if (!settingsCheck) {
            console.log("Seeding Settings...");
            const tx = this.db.transaction(['settings'], 'readwrite');
            const store = tx.objectStore('settings');
            store.put({ id: 'stores', options: ['Esselunga', 'Indian Shop', 'Lidl', 'Carrefour', 'Pharmacy'] });
            store.put({ id: 'categories', options: ['Groceries', 'Transport', 'Eating Out', 'Shopping', 'Bills', 'Gifts'] });
        }

        // 2. Inventory
        const invItems = await this.getAll('inventory');
        if (invItems.length === 0) {
            console.log("Seeding Inventory...");
            const initialInventory = [
                { name: "Eggs", unit: "count", quantity: 6, restock: 12, critical: 4, store: "Esselunga", category: "Protein" },
                { name: "Chicken Breast", unit: "g", quantity: 0, restock: 1000, critical: 300, store: "Esselunga", category: "Protein" },
                { name: "Greek Yogurt", unit: "g", quantity: 0, restock: 1000, critical: 200, store: "Esselunga", category: "Protein" },
                { name: "Paneer", unit: "g", quantity: 0, restock: 500, critical: 100, store: "Indian Shop", category: "Protein" },
                { name: "Pasta (Barilla)", unit: "g", quantity: 500, restock: 1000, critical: 200, store: "Esselunga", category: "Carbs" },
                { name: "Basmati Rice", unit: "g", quantity: 1000, restock: 2000, critical: 500, store: "Esselunga", category: "Carbs" },
                { name: "Olive Oil", unit: "mL", quantity: 500, restock: 250, critical: 50, store: "Esselunga", category: "Pantry" },
                { name: "Sambar Powder", unit: "g", quantity: 500, restock: 100, critical: 50, store: "Indian Shop", category: "Spices" },
                { name: "Garam Masala", unit: "g", quantity: 250, restock: 50, critical: 20, store: "Indian Shop", category: "Spices" },
                { name: "Turmeric", unit: "g", quantity: 250, restock: 50, critical: 20, store: "Indian Shop", category: "Spices" },
                { name: "Chilli Powder", unit: "g", quantity: 250, restock: 50, critical: 20, store: "Indian Shop", category: "Spices" }
            ];
            const tx = this.db.transaction(['inventory'], 'readwrite');
            initialInventory.forEach(item => tx.objectStore('inventory').add(item));
        }

        // 3. Recipes (Updated with Meal Types)
        const recipeItems = await this.getAll('recipes');
        if (recipeItems.length === 0) {
            console.log("Seeding Recipes...");
            const initialRecipes = [
                { 
                    name: "Tandoori Chicken (Pan)", 
                    protein: 40, 
                    mealType: "Dinner",
                    ingredients: [
                        {name: "Chicken Breast", qty: 300, unit: "g"},
                        {name: "Greek Yogurt", qty: 100, unit: "g"}
                    ]
                },
                { 
                    name: "Egg Curry", 
                    protein: 30, 
                    mealType: "Lunch",
                    ingredients: [
                        {name: "Eggs", qty: 4, unit: "count"},
                        {name: "Sambar Powder", qty: 10, unit: "g"}
                    ]
                },
                {
                    name: "Spaghetti Aglio e Olio",
                    protein: 12,
                    mealType: "Dinner",
                    ingredients: [
                        {name: "Pasta", qty: 100, unit: "g"},
                        {name: "Olive Oil", qty: 15, unit: "mL"}
                    ]
                },
                {
                    name: "Scrambled Eggs & Toast",
                    protein: 18,
                    mealType: "Breakfast",
                    ingredients: [
                        {name: "Eggs", qty: 3, unit: "count"}
                    ]
                }
            ];
            const tx = this.db.transaction(['recipes'], 'readwrite');
            initialRecipes.forEach(rec => tx.objectStore('recipes').add(rec));
        }
    }
}

const db = new AlfredDB();