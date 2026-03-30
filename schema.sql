-- ============================================================
-- RESTAURANT WEBSITE — SUPABASE SQL SCHEMA
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'owner')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── RESTAURANT SETTINGS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT 'Our Restaurant',
  tagline TEXT DEFAULT 'Crafted with love, served with passion',
  is_open BOOLEAN DEFAULT TRUE,
  delivery_charge NUMERIC DEFAULT 40,
  tax_percent NUMERIC DEFAULT 5,
  address TEXT DEFAULT '123 Food Street, City, State 560001',
  phone TEXT DEFAULT '+91 98765 43210',
  email TEXT DEFAULT 'hello@ourrestaurant.com',
  about TEXT DEFAULT 'Founded with a simple vision — to bring people together over exceptional food.',
  google_maps_url TEXT DEFAULT 'https://maps.google.com',
  opening_hours TEXT DEFAULT 'Mon–Fri: 11:00 AM – 11:00 PM | Sat–Sun: 10:00 AM – 11:30 PM',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default settings row
INSERT INTO restaurant_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ─── MENU ITEMS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT DEFAULT 'Mains',
  is_veg BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  delivery_time INT,
  avg_rating NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample data
INSERT INTO menu_items (name, description, price, category, is_veg, delivery_time, avg_rating, image_url) VALUES
('Paneer Butter Masala', 'Rich and creamy tomato-based curry with soft paneer cubes, best served with naan.', 280, 'Mains', TRUE, 25, 4.7, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=225&fit=crop'),
('Veg Biryani', 'Fragrant basmati rice cooked with fresh vegetables and whole spices.', 220, 'Mains', TRUE, 30, 4.5, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&h=225&fit=crop'),
('Chicken Tikka', 'Tender chicken marinated in spices and grilled to perfection in a tandoor.', 320, 'Starters', FALSE, 20, 4.8, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=225&fit=crop'),
('Masala Dosa', 'Crispy crepe filled with spiced potato filling, served with sambar and chutney.', 160, 'Starters', TRUE, 15, 4.6, 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&h=225&fit=crop'),
('Gulab Jamun', 'Soft milk-solid dumplings soaked in rose-flavored sugar syrup.', 120, 'Desserts', TRUE, 10, 4.9, 'https://images.unsplash.com/photo-1601303516534-bf4ff3f78f42?w=400&h=225&fit=crop'),
('Chicken Burger', 'Juicy grilled chicken patty with lettuce, tomato and house sauce in a brioche bun.', 250, 'Burgers', FALSE, 20, 4.4, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=225&fit=crop'),
('Margherita Pizza', 'Classic tomato sauce, fresh mozzarella and basil on a thin crust base.', 300, 'Pizza', TRUE, 25, 4.6, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=225&fit=crop'),
('Mango Lassi', 'Refreshing blend of yogurt, mango pulp and a hint of cardamom.', 100, 'Drinks', TRUE, 5, 4.8, 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&h=225&fit=crop')
ON CONFLICT DO NOTHING;

-- ─── TODAY'S SPECIAL ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS today_special (
  id INT PRIMARY KEY DEFAULT 1,
  menu_item_id UUID REFERENCES menu_items(id),
  special_price NUMERIC,
  original_price NUMERIC,
  special_note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Set default special (update menu_item_id after inserting items)
INSERT INTO today_special (id, special_price, original_price, special_note)
VALUES (1, 220, 280, 'Limited time offer — today only!')
ON CONFLICT DO NOTHING;

-- ─── ORDERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  user_email TEXT,
  phone TEXT,
  address TEXT,
  maps_link TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC NOT NULL,
  delivery_charge NUMERIC DEFAULT 40,
  tax_amount NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  coupon_code TEXT,
  total NUMERIC NOT NULL,
  status TEXT DEFAULT 'placed' CHECK (status IN ('placed','preparing','out_for_delivery','delivered','cancelled')),
  has_rating BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RATINGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  order_id UUID REFERENCES orders(id),
  menu_item_id UUID REFERENCES menu_items(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  show_in_testimonial BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, order_id)
);

-- ─── COUPONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT DEFAULT 'flat' CHECK (discount_type IN ('flat', 'percent')),
  discount_value NUMERIC NOT NULL,
  min_order NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample coupon
INSERT INTO coupons (code, description, discount_type, discount_value, min_order, is_active)
VALUES ('WELCOME50', 'Get ₹50 off on your first order above ₹300', 'flat', 50, 300, TRUE)
ON CONFLICT DO NOTHING;

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Owner can read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Menu items — public read, owner write
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read menu items" ON menu_items FOR SELECT USING (TRUE);
CREATE POLICY "Owner can manage menu items" ON menu_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Restaurant settings — public read, owner write
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON restaurant_settings FOR SELECT USING (TRUE);
CREATE POLICY "Owner can update settings" ON restaurant_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Today's special — public read, owner write
ALTER TABLE today_special ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read special" ON today_special FOR SELECT USING (TRUE);
CREATE POLICY "Owner can manage special" ON today_special FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Orders — users see own, owner sees all
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders (has_rating)" ON orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can read all orders" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Owner can update order status" ON orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Ratings
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ratings" ON ratings FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert own rating" ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Coupons — public read active, owner manages
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active coupons" ON coupons FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Owner can manage coupons" ON coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- ─── REALTIME ────────────────────────────────────────────────
-- DO NOT run ALTER PUBLICATION here — do it via the Supabase Dashboard instead.
-- See README.md → Step 7 for exact instructions (Database > Replication).
-- Running ALTER PUBLICATION supabase_realtime directly can break other projects
-- sharing the same Postgres publication. Use the Dashboard toggle instead.

-- ─── SET OWNER ROLE ─────────────────────────────────────────
-- Run this SEPARATELY after creating your owner account (do NOT run it now).
-- Replace the email below with your actual owner email, then run only this line:
--
--   UPDATE profiles SET role = 'owner' WHERE email = 'your-owner-email@example.com';
--
-- ============================================================
-- STOP HERE. Do NOT run anything below this line as part of setup.
-- The lines above are the complete schema. Follow README.md for next steps.
-- ============================================================
