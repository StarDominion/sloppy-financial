-- Meal Planning System

CREATE TABLE IF NOT EXISTS ingredients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'unit',
  current_price DECIMAL(10,2) NULL,
  current_price_qty DECIMAL(10,3) NOT NULL DEFAULT 1,
  calories_per_unit DECIMAL(8,2) NULL,
  protein_per_unit DECIMAL(8,2) NULL,
  carbs_per_unit DECIMAL(8,2) NULL,
  fat_per_unit DECIMAL(8,2) NULL,
  dietary_tags VARCHAR(500) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_ingredients_profile (profile_id)
);

CREATE TABLE IF NOT EXISTS ingredient_price_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ingredient_id INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  qty DECIMAL(10,3) NOT NULL DEFAULT 1,
  store VARCHAR(255) NULL,
  recorded_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
  INDEX idx_iph_ingredient (ingredient_id),
  INDEX idx_iph_date (recorded_date)
);

CREATE TABLE IF NOT EXISTS recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  meal_type VARCHAR(50) NOT NULL DEFAULT 'dinner',
  servings INT NOT NULL DEFAULT 1,
  prep_time_minutes INT NULL,
  cook_time_minutes INT NULL,
  instructions TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_recipes_profile (profile_id)
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipe_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit_override VARCHAR(50) NULL,
  notes TEXT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
  INDEX idx_ri_recipe (recipe_id),
  INDEX idx_ri_ingredient (ingredient_id)
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_meal_plans_profile (profile_id)
);

CREATE TABLE IF NOT EXISTS meal_plan_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meal_plan_id INT NOT NULL,
  recipe_id INT NOT NULL,
  plan_date DATE NOT NULL,
  meal_slot VARCHAR(50) NOT NULL DEFAULT 'dinner',
  servings_to_eat DECIMAL(5,2) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  INDEX idx_mpe_plan (meal_plan_id),
  INDEX idx_mpe_date (plan_date)
);

CREATE TABLE IF NOT EXISTS shopping_lists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  meal_plan_id INT NULL,
  transaction_id INT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  estimated_total DECIMAL(10,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE SET NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
  INDEX idx_shopping_lists_profile (profile_id)
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shopping_list_id INT NOT NULL,
  ingredient_id INT NULL,
  name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit VARCHAR(50) NULL,
  estimated_price DECIMAL(10,2) NULL,
  checked TINYINT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (shopping_list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE SET NULL,
  INDEX idx_sli_list (shopping_list_id)
);

CREATE TABLE IF NOT EXISTS meal_budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  period_type VARCHAR(20) NOT NULL DEFAULT 'weekly',
  budget_amount DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_meal_budgets_profile (profile_id)
);
