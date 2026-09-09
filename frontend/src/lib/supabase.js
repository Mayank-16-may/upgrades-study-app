import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fnfqhehkdvzdwnrlchzq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZnFoZWhrZHZ6ZHducmxjaHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTYyMzgsImV4cCI6MjEwMjE5MjIzOH0.7Gu6d81jAEOpKZqwouxMPFIFlQVmZ_oKygpQXa57y7M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
