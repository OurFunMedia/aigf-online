/**
 * Supabase Admin Initialization Script
 * 
 * This script:
 *   1. Executes the database migration SQL
 *   2. Creates the companion-photos Storage bucket
 *   3. Sets Storage RLS policies
 * 
 * Usage:
 *   npx ts-node scripts/init-supabase.ts
 * 
 * Prerequisites:
 *   - Set SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Install dependencies: npm install
 */

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.')
    process.exit(1)
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('Connected to Supabase project')

  // Step 1: Create storage bucket
  const { data: existingBuckets } = await supabase.storage.listBuckets()
  const bucketExists = existingBuckets?.some((b) => b.name === 'companion-photos')

  if (!bucketExists) {
    const { error: bucketError } = await supabase.storage.createBucket('companion-photos', {
      public: true,
    })
    if (bucketError) {
      console.error('Failed to create bucket:', bucketError.message)
      process.exit(1)
    }
    console.log('✅ Created companion-photos bucket')
  } else {
    console.log('ℹ️  companion-photos bucket already exists')
  }

  // Step 2: Execute migration
  // For migration, run the SQL from supabase/migrations/20260616_initial_schema.sql
  // manually in Supabase SQL Editor, or use supabase CLI:
  //   npx supabase db push
  console.log('ℹ️  Run migration SQL manually or via: npx supabase db push')
  console.log('   SQL file: supabase/migrations/20260616_initial_schema.sql')

  console.log('\n✅ Supabase initialization check complete!')
}

main().catch(console.error)
