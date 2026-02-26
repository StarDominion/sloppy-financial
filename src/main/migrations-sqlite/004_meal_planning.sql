-- Meal Planning System

CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unit',
  current_price REAL NULL,
  current_price_qty REAL NOT NULL DEFAULT 1,
  calories_per_unit REAL NULL,
  protein_per_unit REAL NULL,
  carbs_per_unit REAL NULL,
  fat_per_unit REAL NULL,
  dietary_tags TEXT NULL,
  notes TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ingredients_profile ON ingredients(profile_id);

CREATE TABLE IF NOT EXISTS ingredient_price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id INTEGER NOT NULL,
  price REAL NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  store TEXT NULL,
  recorded_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_iph_ingredient ON ingredient_price_history(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_iph_date ON ingredient_price_history(recorded_date);

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'dinner',
  servings INTEGER NOT NULL DEFAULT 1,
  prep_time_minutes INTEGER NULL,
  cook_time_minutes INTEGER NULL,
  instructions TEXT NULL,
  notes TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_recipes_profile ON recipes(profile_id);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL,
  ingredient_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  unit_override TEXT NULL,
  notes TEXT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ri_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_ri_ingredient ON recipe_ingredients(ingredient_id);

CREATE TABLE IF NOT EXISTS meal_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  notes TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_meal_plans_profile ON meal_plans(profile_id);

CREATE TABLE IF NOT EXISTS meal_plan_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_plan_id INTEGER NOT NULL,
  recipe_id INTEGER NOT NULL,
  plan_date TEXT NOT NULL,
  meal_slot TEXT NOT NULL DEFAULT 'dinner',
  servings_to_eat REAL NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mpe_plan ON meal_plan_entries(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_mpe_date ON meal_plan_entries(plan_date);

CREATE TABLE IF NOT EXISTS shopping_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  meal_plan_id INTEGER NULL,
  transaction_id INTEGER NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  estimated_total REAL NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE SET NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_profile ON shopping_lists(profile_id);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shopping_list_id INTEGER NOT NULL,
  ingredient_id INTEGER NULL,
  name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT NULL,
  estimated_price REAL NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (shopping_list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_sli_list ON shopping_list_items(shopping_list_id);

CREATE TABLE IF NOT EXISTS meal_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'weekly',
  budget_amount REAL NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_meal_budgets_profile ON meal_budgets(profile_id);
