-- ============================================================
-- UIU-Nest v2 — Supabase PostgreSQL Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('student', 'landlord', 'admin');
CREATE TYPE user_gender AS ENUM ('male', 'female', 'other');
CREATE TYPE user_status AS ENUM ('active', 'suspended');
CREATE TYPE listing_type AS ENUM ('full_property', 'peer_listing');
CREATE TYPE property_type AS ENUM ('single_room', 'shared_room', 'full_mess', 'sublet');
CREATE TYPE gender_pref AS ENUM ('male', 'female', 'any');
CREATE TYPE listing_status AS ENUM ('available', 'occupied', 'soon_vacant');
CREATE TYPE electricity_type AS ENUM ('individual', 'shared');
CREATE TYPE sleep_schedule AS ENUM ('early', 'late', 'flexible');
CREATE TYPE diet_type AS ENUM ('vegetarian', 'non_veg', 'halal_strict');
CREATE TYPE guest_policy AS ENUM ('allowed', 'restricted', 'not_allowed');
CREATE TYPE noise_tolerance AS ENUM ('quiet', 'moderate', 'noisy');
CREATE TYPE complaint_category AS ENUM ('hidden_costs', 'harassment', 'deposit_not_returned', 'misrepresentation', 'other');
CREATE TYPE complaint_status AS ENUM ('submitted', 'under_review', 'resolved');
CREATE TYPE seeking_property_type AS ENUM ('single_room', 'shared_room', 'full_mess', 'sublet', 'any');
CREATE TYPE seeking_status AS ENUM ('active', 'fulfilled');
CREATE TYPE payment_status AS ENUM ('paid', 'unpaid');
CREATE TYPE item_category AS ENUM ('furniture', 'appliances', 'electronics', 'kitchen', 'study', 'other');
CREATE TYPE item_condition AS ENUM ('new', 'like_new', 'good', 'fair');
CREATE TYPE item_status AS ENUM ('available', 'sold', 'withdrawn');
CREATE TYPE offer_status AS ENUM ('pending', 'countered', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE nid_type AS ENUM ('National ID', 'Passport', 'Driving License');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE response_status AS ENUM ('pending', 'accepted', 'rejected');

-- ============================================================
-- 1. profiles (mirrors auth.users, links to Supabase Auth)
-- ============================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    gender user_gender NOT NULL,
    phone VARCHAR(20),
    university_id VARCHAR(50) UNIQUE,
    profile_pic TEXT,
    status user_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-create profile row when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, gender)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
    COALESCE((NEW.raw_user_meta_data->>'gender')::user_gender, 'other')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 2. zones
-- ============================================================
CREATE TABLE zones (
    zone_id SERIAL PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL,
    description TEXT,
    center_lat NUMERIC(9,6) NOT NULL,
    center_lng NUMERIC(9,6) NOT NULL,
    radius_km NUMERIC(4,2) NOT NULL
);

-- ============================================================
-- 3. listings
-- ============================================================
CREATE TABLE listings (
    listing_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    zone_id INT REFERENCES zones(zone_id),
    listing_type listing_type NOT NULL,
    property_type property_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    lat NUMERIC(9,6) NOT NULL,
    lng NUMERIC(9,6) NOT NULL,
    gender_pref gender_pref NOT NULL DEFAULT 'any',
    total_rooms INT NOT NULL,
    current_occupancy INT DEFAULT 0,
    status listing_status DEFAULT 'available',
    expected_vacate_date DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    description TEXT,
    photos JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ============================================================
-- 4. utility_costs
-- ============================================================
CREATE TABLE utility_costs (
    cost_id SERIAL PRIMARY KEY,
    listing_id INT UNIQUE REFERENCES listings(listing_id) ON DELETE CASCADE,
    base_rent NUMERIC(10,2) NOT NULL,
    electricity_amount NUMERIC(8,2) DEFAULT 0,
    electricity_type electricity_type NOT NULL DEFAULT 'individual',
    gas_bill NUMERIC(8,2) DEFAULT 0,
    water_bill NUMERIC(8,2) DEFAULT 0,
    internet_cost NUMERIC(8,2) DEFAULT 0,
    maintenance_fee NUMERIC(8,2) DEFAULT 0,
    caretaker_fee NUMERIC(8,2) DEFAULT 0,
    other_fees NUMERIC(8,2) DEFAULT 0,
    total_monthly NUMERIC(10,2) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER utility_costs_updated_at
  BEFORE UPDATE ON utility_costs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ============================================================
-- 5. listing_amenities
-- ============================================================
CREATE TABLE listing_amenities (
    amenity_id SERIAL PRIMARY KEY,
    listing_id INT UNIQUE REFERENCES listings(listing_id) ON DELETE CASCADE,
    attached_bathroom BOOLEAN DEFAULT FALSE,
    attached_kitchen BOOLEAN DEFAULT FALSE,
    is_furnished BOOLEAN DEFAULT FALSE,
    rooftop_access BOOLEAN DEFAULT FALSE,
    parking BOOLEAN DEFAULT FALSE,
    power_backup BOOLEAN DEFAULT FALSE,
    lift_access BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- 6. user_preferences
-- ============================================================
CREATE TABLE user_preferences (
    pref_id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    sleep_schedule sleep_schedule NOT NULL DEFAULT 'flexible',
    study_hours INT DEFAULT 0,
    diet diet_type NOT NULL DEFAULT 'non_veg',
    guest_policy guest_policy NOT NULL DEFAULT 'restricted',
    smoking_tolerance BOOLEAN DEFAULT FALSE,
    preferred_gender gender_pref NOT NULL DEFAULT 'any',
    cleanliness_score INT CHECK (cleanliness_score BETWEEN 1 AND 5) DEFAULT 3,
    noise_tolerance noise_tolerance NOT NULL DEFAULT 'moderate'
);

-- ============================================================
-- 7. reviews
-- ============================================================
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    listing_id INT REFERENCES listings(listing_id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    value_for_money INT CHECK (value_for_money BETWEEN 1 AND 5),
    listing_accuracy INT CHECK (listing_accuracy BETWEEN 1 AND 5),
    landlord_response INT CHECK (landlord_response BETWEEN 1 AND 5),
    cleanliness INT CHECK (cleanliness BETWEEN 1 AND 5),
    safety INT CHECK (safety BETWEEN 1 AND 5),
    composite_score NUMERIC(3,2) NOT NULL,
    comment VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(listing_id, reviewer_id)
);

-- ============================================================
-- 8. complaints
-- ============================================================
CREATE TABLE complaints (
    complaint_id SERIAL PRIMARY KEY,
    complainant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    against_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id INT REFERENCES listings(listing_id) ON DELETE SET NULL,
    category complaint_category NOT NULL DEFAULT 'other',
    description TEXT NOT NULL,
    status complaint_status DEFAULT 'submitted',
    document_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ============================================================
-- 9. seeking_posts
-- ============================================================
CREATE TABLE seeking_posts (
    post_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    zone_id INT REFERENCES zones(zone_id),
    budget_min NUMERIC(10,2) NOT NULL,
    budget_max NUMERIC(10,2) NOT NULL,
    property_type seeking_property_type NOT NULL DEFAULT 'any',
    preferred_gender gender_pref NOT NULL DEFAULT 'any',
    move_in_date DATE,
    requirements TEXT,
    status seeking_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. monthly_bills
-- ============================================================
CREATE TABLE monthly_bills (
    bill_id SERIAL PRIMARY KEY,
    listing_id INT REFERENCES listings(listing_id) ON DELETE CASCADE,
    bill_month DATE NOT NULL,
    electricity_amount NUMERIC(8,2) DEFAULT 0,
    gas_amount NUMERIC(8,2) DEFAULT 0,
    water_amount NUMERIC(8,2) DEFAULT 0,
    internet_amount NUMERIC(8,2) DEFAULT 0,
    other_amount NUMERIC(8,2) DEFAULT 0,
    custom_fees JSONB DEFAULT '[]',
    total_amount NUMERIC(10,2) NOT NULL,
    per_person_amount NUMERIC(10,2) NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. bill_payments
-- ============================================================
CREATE TABLE bill_payments (
    payment_id SERIAL PRIMARY KEY,
    bill_id INT REFERENCES monthly_bills(bill_id) ON DELETE CASCADE,
    resident_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resident_label VARCHAR(50),
    status payment_status DEFAULT 'unpaid',
    paid_at TIMESTAMPTZ
);

-- ============================================================
-- 12. rent_history
-- ============================================================
CREATE TABLE rent_history (
    history_id SERIAL PRIMARY KEY,
    listing_id INT REFERENCES listings(listing_id) ON DELETE CASCADE,
    old_rent NUMERIC(10,2) NOT NULL,
    new_rent NUMERIC(10,2) NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ============================================================
-- 13. items (Exchange Marketplace)
-- ============================================================
CREATE TABLE items (
    item_id SERIAL PRIMARY KEY,
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    zone_id INT REFERENCES zones(zone_id),
    listing_id INT REFERENCES listings(listing_id) ON DELETE SET NULL,
    category item_category NOT NULL DEFAULT 'other',
    title VARCHAR(200) NOT NULL,
    description TEXT,
    item_condition item_condition NOT NULL DEFAULT 'good',
    asking_price NUMERIC(10,2) NOT NULL,
    reason_for_selling VARCHAR(300),
    photo_url TEXT,
    photos JSONB,
    status item_status DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. offers
-- ============================================================
CREATE TABLE offers (
    offer_id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(item_id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    offer_price NUMERIC(10,2) NOT NULL,
    message VARCHAR(300),
    status offer_status DEFAULT 'pending',
    counter_price NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ============================================================
-- 15. applications
-- ============================================================
CREATE TABLE applications (
    application_id SERIAL PRIMARY KEY,
    listing_id INT REFERENCES listings(listing_id) ON DELETE CASCADE,
    applicant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT,
    status application_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. verifications
-- ============================================================
CREATE TABLE verifications (
    verification_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    nid_type nid_type NOT NULL,
    document_path TEXT NOT NULL,
    description TEXT,
    status verification_status DEFAULT 'pending',
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. watchlists
-- ============================================================
CREATE TABLE watchlists (
    watchlist_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id INT REFERENCES listings(listing_id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

-- ============================================================
-- 18. seeking_responses
-- ============================================================
CREATE TABLE seeking_responses (
    response_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES seeking_posts(post_id) ON DELETE CASCADE,
    responder_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT,
    status response_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 19. notifications
-- ============================================================
CREATE TABLE notifications (
    notif_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA: Zones
-- ============================================================
INSERT INTO zones (zone_name, description, center_lat, center_lng, radius_km) VALUES
('UIU Campus Area',  'Immediate surroundings of UIU main campus', 23.797900, 90.449700, 1.5),
('Sayed Nagar',      'Residential area close to campus',          23.795000, 90.444000, 2.0),
('Shatarkul',        'Quiet neighbourhood south of campus',       23.791000, 90.435000, 2.5),
('Nurer Chala',      'Bustling commercial and residential area',  23.805000, 90.438000, 2.0),
('Aftabnagar',       'Planned residential sector',                23.766000, 90.434000, 3.0),
('Notun Bazar',      'Major transit and shopping hub',            23.797000, 90.422000, 2.5);

-- ============================================================
-- SEED DATA: Master Admin
-- NOTE: After running this schema, create the admin user in
-- Supabase Auth (Dashboard > Authentication > Users > Add User)
-- with the email/password you chose.
-- Then run this UPDATE to set the role to 'admin':
--
--   UPDATE profiles SET role = 'admin', name = 'Master Admin'
--   WHERE email = 'YOUR_ADMIN_EMAIL';
--
-- ============================================================
