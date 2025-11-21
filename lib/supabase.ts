import { createClient } from '@supabase/supabase-js';

// Support for Create React App (REACT_APP), Next.js (NEXT_PUBLIC), and Vite (VITE)
const getEnv = (key: string) => {
    // Check generic process.env
    if (typeof process !== 'undefined' && process.env) {
        if (process.env[`NEXT_PUBLIC_${key}`]) return process.env[`NEXT_PUBLIC_${key}`];
        if (process.env[`REACT_APP_${key}`]) return process.env[`REACT_APP_${key}`];
        if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
    }

    // Check Vite's import.meta.env
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
    }
    
    return '';
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = () => {
    return supabaseUrl && supabaseKey && supabaseUrl.length > 0 && supabaseKey.length > 0;
};

// Create a single supabase client for interacting with your database
export const supabase = isSupabaseConfigured() 
    ? createClient(supabaseUrl!, supabaseKey!) 
    : null;

/**
 * --- SETUP INSTRUCTIONS ---
 * 
 * To set up the database, please open the file `supabase_schema.sql` 
 * in this project, copy the content, and run it in the Supabase SQL Editor.
 */