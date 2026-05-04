# Phase 4: Inventory & Products

## Goal
Build the product and inventory management system: CRUD for products, categories, ingredients, stock movements, recipes, and low-stock alerts.

## What Ships
- Product CRUD: name, nameAr, price, type (standard/recipe), trackStock, stockQty, image
- Category CRUD with bilingual names
- Ingredient CRUD: name, unit, stockQty, costPerUnit, lowStockThreshold
- Recipe mapping: product → ingredients with quantities
- Stock movement history: purchase, sale, wastage, adjustment
- Low-stock alerts on dashboard
- Product type handling: standard (tracked), recipe (calculated), service (non-inventory)

## Status
✅ Complete — commit `71ec82d`

## Steps

### Step 1: Product Management
- Create admin page: `/admin/products`
- CRUD: create, read, update, delete products
- Fields: name, nameAr, category, type, price, trackStock, stockQty, image
- Toggle trackStock: enables inventory tracking for standard products

### Step 2: Category Management
- Create `/admin/categories`
- CRUD for product categories with nameAr
- Hierarchical support (optional, can be flat for now)

### Step 3: Ingredient Management
- Create `/admin/ingredients`
- CRUD: name, unit (link to units table), stockQty, costPerUnit, lowStockThreshold
- Unit management: grams, kg, pieces, liters, etc.

### Step 4: Recipe / Product-Ingredient Mapping
- Create recipe editor: link products to ingredients
- Example: "Cappuccino" → 18g beans + 200ml milk
- On sale of recipe product, deduct ingredients automatically

### Step 5: Stock Movements
- Track every stock change:
  - purchase: stock IN from vendor
  - sale_deduction: stock OUT via product sale (standard items)
  - wastage: stock OUT (expired/spoiled)
  - adjustment: manual correction
- Link to orderId or purchaseId where applicable

### Step 6: Low Stock Alerts
- Dashboard banner if any ingredient or tracked product below threshold
- List view of all low-stock items

## Dependencies
- Phase 1 (auth, admin layout)
- Phase 2 (product data available in POS)

## Success Criteria
- [ ] Admin can create/edit/delete products with all fields
- [ ] Admin can manage categories with Arabic names
- [ ] Admin can manage ingredients with stock levels
- [ ] Recipe mapping works: selling recipe deducts ingredients
- [ ] Stock movement history is complete and queryable
- [ ] Low-stock alerts show on dashboard