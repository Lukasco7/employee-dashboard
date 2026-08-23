// The dependency may be unavailable to the editor's TypeScript resolver while
// the package is being installed in the project.
// @ts-ignore TS2307: resolved at runtime when @supabase/supabase-js is installed.
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);