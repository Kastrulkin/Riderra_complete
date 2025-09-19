import { createClient } from '@supabase/supabase-js'

export default (context, inject) => {
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY
  const supabase = (url && anon) ? createClient(url, anon) : null
  inject('supabase', supabase)
}


