-- =====================================================
-- BCB Dashboard - Push Notifications Database Schema
-- =====================================================
-- Add push notification subscription table
-- =====================================================

-- Table for storing push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- Indexes for push subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_family_id ON push_subscriptions(family_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- RLS for push subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for authenticated users" ON push_subscriptions FOR ALL USING (true);

-- Update trigger for push subscriptions
CREATE TRIGGER update_push_subscriptions_updated_at 
    BEFORE UPDATE ON push_subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE push_subscriptions IS 'Table for storing push notification subscriptions';
COMMENT ON COLUMN push_subscriptions.family_id IS 'Family ID';
COMMENT ON COLUMN push_subscriptions.user_id IS 'User ID (family member)';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.keys IS 'Push subscription keys (p256dh and auth)';

