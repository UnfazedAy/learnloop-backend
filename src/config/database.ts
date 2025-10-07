import { ENV } from './keys';
import { createClient } from '@supabase/supabase-js';

const {SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY} = ENV

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);