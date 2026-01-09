-- Family Trees table
CREATE TABLE IF NOT EXISTS family_trees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  root_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Family Units table
CREATE TABLE IF NOT EXISTS family_units (
  id TEXT PRIMARY KEY,
  tree_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single', 'couple', 'polygamous')),
  parent_id TEXT,
  primary_person_index INTEGER,
  mother_index INTEGER,
  FOREIGN KEY (tree_id) REFERENCES family_trees(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES family_units(id) ON DELETE SET NULL
);

-- Persons table
CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  birth_date TEXT,
  death_date TEXT,
  photo_url TEXT,
  biography TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (unit_id) REFERENCES family_units(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_units_tree ON family_units(tree_id);
CREATE INDEX IF NOT EXISTS idx_units_parent ON family_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_persons_unit ON persons(unit_id);
