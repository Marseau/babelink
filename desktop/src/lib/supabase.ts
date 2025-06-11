import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types
export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  subscription_tier: 'free' | 'basic' | 'pro' | 'unlimited';
  translations_used: number;
  translations_limit: number;
  cycle_start_date: string;
}

export interface Translation {
  id: string;
  user_id: string;
  original_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
  timestamp: string;
  image_url?: string;
  voice_settings?: {
    gender: string;
    speed: number;
    pitch: number;
  };
}

export interface Usage {
  id: string;
  user_id: string;
  action_type: 'translation' | 'tts' | 'ocr';
  timestamp: string;
  metadata?: Record<string, any>;
}

// Auth helpers
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

// Database helpers
export const saveTranslation = async (translation: Omit<Translation, 'id' | 'timestamp'>) => {
  const { data, error } = await supabase
    .from('translations')
    .insert([{
      ...translation,
      timestamp: new Date().toISOString(),
    }])
    .select()
    .single();
  
  return { data, error };
};

export const getTranslationHistory = async (userId: string, limit = 50) => {
  const { data, error } = await supabase
    .from('translations')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  return { data, error };
};

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  return { data, error };
};

export const updateUsage = async (userId: string, actionType: Usage['action_type'], metadata?: Record<string, any>) => {
  // Record usage
  const { error: usageError } = await supabase
    .from('usage')
    .insert([{
      user_id: userId,
      action_type: actionType,
      timestamp: new Date().toISOString(),
      metadata,
    }]);

  if (usageError) return { error: usageError };

  // Update user's usage counter
  if (actionType === 'translation') {
    const { error: profileError } = await supabase.rpc('increment_translation_usage', {
      user_id: userId,
    });
    return { error: profileError };
  }

  return { error: null };
};

export const checkUsageLimit = async (userId: string) => {
  const { data: profile, error } = await getUserProfile(userId);
  
  if (error || !profile) {
    return { canUse: false, usage: 0, limit: 0, error };
  }

  const canUse = profile.translations_used < profile.translations_limit;
  
  return {
    canUse,
    usage: profile.translations_used,
    limit: profile.translations_limit,
    error: null,
  };
};

// Real-time subscriptions
export const subscribeToTranslations = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel('translations')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'translations',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};

// Storage helpers for images
export const uploadCapturedImage = async (file: File, userId: string) => {
  const fileName = `${userId}/${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('captured-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) return { data: null, error };

  const { data: { publicUrl } } = supabase.storage
    .from('captured-images')
    .getPublicUrl(fileName);

  return { data: { ...data, publicUrl }, error: null };
};