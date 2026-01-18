# Alfred: The Buttler

**Kitchen Resource Planning & Inventory Management System**

Alfred is a Progressive Web Application (PWA) designed to optimize domestic kitchen operations. It implements "Level-Loading" principles to manage inventory turnover, minimize waste through precise stock tracking, and monitor monthly procurement expenses. The application operates entirely client-side using an offline-first architecture.

## System Overview

The application is structured around four core operational modules:

### 1. Store (Inventory Management)
* **Threshold Monitoring:** Implements a logic-based alert system for inventory levels. Items are categorized by "Restock" and "Critical" thresholds, providing immediate visual cues for replenishment requirements.
* **Stock Adjustment:** Allows for real-time quantity updates with supported unit precision (grams, milliliters, count).
* **Categorization:** Organizes assets into functional categories (Proteins, Carbs, Pantry, Spices) to facilitate rapid auditing.

### 2. Procure (Automated Procurement)
* **Logic-Driven Lists:** The shopping list is automatically populated based on inventory deficits (Current Quantity < Restock Threshold).
* **Manual Overrides:** Supports manual additions for non-standard requirements.
* **Reconciliation:** The "Bought" action triggers a transaction that verifies the purchase and immediately updates the master inventory record, ensuring data consistency between procurement and storage.

### 3. Prepare (Recipe Execution)
* **Resource Availability Check:** The system cross-references recipe requirements against current stock levels to determine feasibility.
* **Variety Optimization:** A scoring algorithm penalizes recently prepared meals to encourage dietary variety.
* **Consumption Logic:** Includes a configurable "Auto-Deduct" feature. High-value perishables (e.g., proteins, produce) can be set to automatically deduct from inventory upon meal logging, while pantry staples (e.g., spices, oil) can be excluded to maintain data accuracy without requiring micro-management.

### 4. Ledger (Expense Tracking)
* **Budget Analysis:** visualizations compare current monthly spend against user-defined budget caps.
* **Data Archival:** Features a CSV export utility for external analysis.
* **Period Management:** Includes a manual month-end reset protocol to clear the ledger while preserving historical data via export.

## Technical Architecture

* **Platform:** Progressive Web App (PWA)
* **Core Stack:** Vanilla JavaScript (ES6+), HTML5, CSS3.
* **Data Persistence:** IndexedDB (Client-side storage). No remote database or backend dependency required.
* **Offline Capability:** Service Worker caching ensures full functionality without network connectivity.
* **Design:** Responsive layout utilizing CSS Grid and Flexbox for cross-device compatibility (Mobile/Desktop).

## Installation & Deployment

This application is designed to be hosted via static site hosting (e.g., GitHub Pages).

1.  **Deployment:** Upload the repository contents to a web server or enable GitHub Pages for the repository.
2.  **Client Installation:**
    * Navigate to the hosted URL on a mobile device.
    * Select "Add to Home Screen" (iOS via Safari Share, Android via Chrome Menu).
3.  **Permissions:** Upon initialization, the application may request persistent storage permissions to prevent browser data eviction policies from affecting the database.

## Usage Notes

* **Data Privacy:** All data is stored locally on the client device within the browser's IndexedDB container. No data is transmitted to external servers.
* **Reset Procedure:** The "Clear Old Data" function in the Ledger is destructive. Ensure CSV export is completed prior to executing the monthly reset.
* **Updates:** Application updates are handled via the Service Worker lifecycle. Refreshing the application after a new deployment will cache the latest version.

## Roadmap

* **Cloud Synchronization:** Implementation of an optional backend for multi-device state synchronization.
* **Cost Analysis:** Integration of historical pricing data to automate expense logging during procurement.