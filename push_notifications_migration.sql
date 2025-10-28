    -- =====================================================
    -- Push Notifications Migration
    -- =====================================================
    -- This file adds push notification support to BabyCare Dashboard
    -- Run this script to enable push notifications in your database
    -- =====================================================

    -- Table for storing push notification subscriptions
    CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(family_id, user_id)
    );

    -- Indexes for optimization
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_family_id ON push_subscriptions(family_id);
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

    -- Enable Row Level Security
    ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

    -- RLS Policy for push_subscriptions
    CREATE POLICY "Enable all operations for authenticated users" ON push_subscriptions FOR ALL USING (true);

    -- Trigger for updating updated_at
    CREATE TRIGGER update_push_subscriptions_updated_at 
        BEFORE UPDATE ON push_subscriptions 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();

    -- Add comments
    COMMENT ON TABLE push_subscriptions IS 'Table for storing push notification subscriptions';
    COMMENT ON COLUMN push_subscriptions.family_id IS 'Family ID';
    COMMENT ON COLUMN push_subscriptions.user_id IS 'User ID (family member)';
    COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL';
    COMMENT ON COLUMN push_subscriptions.p256dh IS 'P256DH key for push encryption';
    COMMENT ON COLUMN push_subscriptions.auth IS 'Auth key for push encryption';

    -- =====================================================
    -- Migration complete
    -- =====================================================

