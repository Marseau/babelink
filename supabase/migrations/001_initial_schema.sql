-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Subscription info
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro', 'unlimited')),
    subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Usage tracking
    translations_used INTEGER DEFAULT 0,
    translations_limit INTEGER DEFAULT 100, -- Free tier limit
    cycle_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Settings
    default_source_language TEXT DEFAULT 'auto',
    default_target_language TEXT DEFAULT 'en',
    default_voice_gender TEXT DEFAULT 'female',
    default_voice_speed REAL DEFAULT 1.0,
    default_voice_pitch REAL DEFAULT 1.0,
    
    CONSTRAINT valid_voice_speed CHECK (default_voice_speed >= 0.5 AND default_voice_speed <= 2.0),
    CONSTRAINT valid_voice_pitch CHECK (default_voice_pitch >= 0.5 AND default_voice_pitch <= 2.0)
);

-- Create translations table
CREATE TABLE public.translations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Text data
    original_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    
    -- Metadata
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    image_url TEXT, -- URL to captured screenshot
    
    -- Voice settings used
    voice_settings JSONB DEFAULT '{
        "gender": "female",
        "speed": 1.0,
        "pitch": 1.0
    }'::jsonb,
    
    -- Quality metrics
    confidence_score REAL, -- OCR confidence
    character_count INTEGER GENERATED ALWAYS AS (LENGTH(original_text)) STORED,
    
    -- Indexing
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', original_text || ' ' || translated_text)
    ) STORED
);

-- Create usage tracking table
CREATE TABLE public.usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('translation', 'tts', 'ocr')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create languages table for reference
CREATE TABLE public.languages (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    native_name TEXT,
    is_popular BOOLEAN DEFAULT FALSE,
    supports_tts BOOLEAN DEFAULT TRUE,
    region TEXT
);

-- Insert popular languages
INSERT INTO public.languages (code, name, native_name, is_popular, supports_tts, region) VALUES
('auto', 'Auto-detect', 'Auto-detect', TRUE, FALSE, 'system'),
('en', 'English', 'English', TRUE, TRUE, 'americas'),
('es', 'Spanish', 'Español', TRUE, TRUE, 'americas'),
('fr', 'French', 'Français', TRUE, TRUE, 'europe'),
('de', 'German', 'Deutsch', TRUE, TRUE, 'europe'),
('it', 'Italian', 'Italiano', TRUE, TRUE, 'europe'),
('pt', 'Portuguese', 'Português', TRUE, TRUE, 'americas'),
('ru', 'Russian', 'Русский', TRUE, TRUE, 'europe'),
('ja', 'Japanese', '日本語', TRUE, TRUE, 'asia'),
('ko', 'Korean', '한국어', TRUE, TRUE, 'asia'),
('zh', 'Chinese (Simplified)', '中文 (简体)', TRUE, TRUE, 'asia'),
('zh-TW', 'Chinese (Traditional)', '中文 (繁體)', TRUE, TRUE, 'asia'),
('ar', 'Arabic', 'العربية', TRUE, TRUE, 'middle_east'),
('hi', 'Hindi', 'हिन्दी', TRUE, TRUE, 'asia'),
('th', 'Thai', 'ไทย', FALSE, TRUE, 'asia'),
('vi', 'Vietnamese', 'Tiếng Việt', FALSE, TRUE, 'asia'),
('nl', 'Dutch', 'Nederlands', FALSE, TRUE, 'europe'),
('sv', 'Swedish', 'Svenska', FALSE, TRUE, 'europe'),
('no', 'Norwegian', 'Norsk', FALSE, TRUE, 'europe'),
('da', 'Danish', 'Dansk', FALSE, TRUE, 'europe'),
('fi', 'Finnish', 'Suomi', FALSE, TRUE, 'europe'),
('pl', 'Polish', 'Polski', FALSE, TRUE, 'europe'),
('tr', 'Turkish', 'Türkçe', FALSE, TRUE, 'middle_east'),
('he', 'Hebrew', 'עברית', FALSE, TRUE, 'middle_east'),
('cs', 'Czech', 'Čeština', FALSE, TRUE, 'europe'),
('hu', 'Hungarian', 'Magyar', FALSE, TRUE, 'europe'),
('ro', 'Romanian', 'Română', FALSE, TRUE, 'europe'),
('bg', 'Bulgarian', 'Български', FALSE, TRUE, 'europe'),
('hr', 'Croatian', 'Hrvatski', FALSE, TRUE, 'europe'),
('sk', 'Slovak', 'Slovenčina', FALSE, TRUE, 'europe'),
('sl', 'Slovenian', 'Slovenščina', FALSE, TRUE, 'europe'),
('et', 'Estonian', 'Eesti', FALSE, TRUE, 'europe'),
('lv', 'Latvian', 'Latviešu', FALSE, TRUE, 'europe'),
('lt', 'Lithuanian', 'Lietuvių', FALSE, TRUE, 'europe'),
('uk', 'Ukrainian', 'Українська', FALSE, TRUE, 'europe'),
('be', 'Belarusian', 'Беларуская', FALSE, TRUE, 'europe'),
('mk', 'Macedonian', 'Македонски', FALSE, TRUE, 'europe'),
('sq', 'Albanian', 'Shqip', FALSE, TRUE, 'europe'),
('sr', 'Serbian', 'Српски', FALSE, TRUE, 'europe'),
('bs', 'Bosnian', 'Bosanski', FALSE, TRUE, 'europe'),
('mt', 'Maltese', 'Malti', FALSE, TRUE, 'europe'),
('is', 'Icelandic', 'Íslenska', FALSE, TRUE, 'europe'),
('ga', 'Irish', 'Gaeilge', FALSE, TRUE, 'europe'),
('cy', 'Welsh', 'Cymraeg', FALSE, TRUE, 'europe'),
('eu', 'Basque', 'Euskera', FALSE, TRUE, 'europe'),
('ca', 'Catalan', 'Català', FALSE, TRUE, 'europe'),
('gl', 'Galician', 'Galego', FALSE, TRUE, 'europe'),
('af', 'Afrikaans', 'Afrikaans', FALSE, TRUE, 'africa'),
('sw', 'Swahili', 'Kiswahili', FALSE, TRUE, 'africa'),
('zu', 'Zulu', 'isiZulu', FALSE, TRUE, 'africa'),
('xh', 'Xhosa', 'isiXhosa', FALSE, TRUE, 'africa'),
('yo', 'Yoruba', 'Yorùbá', FALSE, TRUE, 'africa'),
('ig', 'Igbo', 'Asụsụ Igbo', FALSE, TRUE, 'africa'),
('ha', 'Hausa', 'Harshen Hausa', FALSE, TRUE, 'africa'),
('am', 'Amharic', 'አማርኛ', FALSE, TRUE, 'africa'),
('bn', 'Bengali', 'বাংলা', FALSE, TRUE, 'asia'),
('ur', 'Urdu', 'اردو', FALSE, TRUE, 'asia'),
('fa', 'Persian', 'فارسی', FALSE, TRUE, 'middle_east'),
('ps', 'Pashto', 'پښتو', FALSE, TRUE, 'middle_east'),
('tg', 'Tajik', 'Тоҷикӣ', FALSE, TRUE, 'asia'),
('uz', 'Uzbek', 'O''zbek', FALSE, TRUE, 'asia'),
('kk', 'Kazakh', 'Қазақша', FALSE, TRUE, 'asia'),
('ky', 'Kyrgyz', 'Кыргызча', FALSE, TRUE, 'asia'),
('mn', 'Mongolian', 'Монгол', FALSE, TRUE, 'asia'),
('my', 'Myanmar', 'မြန်မာ', FALSE, TRUE, 'asia'),
('km', 'Khmer', 'ខ្មែរ', FALSE, TRUE, 'asia'),
('lo', 'Lao', 'ລາວ', FALSE, TRUE, 'asia'),
('si', 'Sinhala', 'සිංහල', FALSE, TRUE, 'asia'),
('ta', 'Tamil', 'தமிழ்', FALSE, TRUE, 'asia'),
('te', 'Telugu', 'తెలుగు', FALSE, TRUE, 'asia'),
('kn', 'Kannada', 'ಕನ್ನಡ', FALSE, TRUE, 'asia'),
('ml', 'Malayalam', 'മലയാളം', FALSE, TRUE, 'asia'),
('gu', 'Gujarati', 'ગુજરાતી', FALSE, TRUE, 'asia'),
('pa', 'Punjabi', 'ਪੰਜਾਬੀ', FALSE, TRUE, 'asia'),
('ne', 'Nepali', 'नेपाली', FALSE, TRUE, 'asia'),
('id', 'Indonesian', 'Bahasa Indonesia', FALSE, TRUE, 'asia'),
('ms', 'Malay', 'Bahasa Melayu', FALSE, TRUE, 'asia'),
('tl', 'Filipino', 'Filipino', FALSE, TRUE, 'asia');

-- Indexes for better performance
CREATE INDEX idx_translations_user_id ON public.translations(user_id);
CREATE INDEX idx_translations_timestamp ON public.translations(timestamp DESC);
CREATE INDEX idx_translations_search ON public.translations USING gin(search_vector);
CREATE INDEX idx_usage_user_id ON public.usage(user_id);
CREATE INDEX idx_usage_timestamp ON public.usage(timestamp DESC);
CREATE INDEX idx_languages_popular ON public.languages(is_popular, region);

-- RLS (Row Level Security) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Translations policies
CREATE POLICY "Users can view own translations" ON public.translations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own translations" ON public.translations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own translations" ON public.translations
    FOR DELETE USING (auth.uid() = user_id);

-- Usage policies
CREATE POLICY "Users can view own usage" ON public.usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON public.usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Languages table is public read-only
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Languages are viewable by everyone" ON public.languages
    FOR SELECT USING (true);

-- Functions
CREATE OR REPLACE FUNCTION public.increment_translation_usage(user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET translations_used = translations_used + 1,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.reset_usage_cycle(user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET translations_used = 0,
        cycle_start_date = NOW(),
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_profile();

-- Function to update subscription limits
CREATE OR REPLACE FUNCTION public.update_subscription_limits(
    user_id UUID,
    tier TEXT,
    new_limit INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET subscription_tier = tier,
        translations_limit = new_limit,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;