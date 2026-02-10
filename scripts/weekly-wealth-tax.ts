/**
 * Weekly Wealth Tax Script
 * Applies a 5% tax on wallets > 200,000 JC
 * Should be run once per week (via cron or manual execution)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const WEALTH_TAX_THRESHOLD = 200000; // 200k JC
const WEALTH_TAX_RATE = 0.05; // 5%

interface Profile {
  id: string;
  pseudo: string;
  credits: number;
}

async function applyWeeklyWealthTax(): Promise<void> {
  console.log('🏦 Starting weekly wealth tax collection...');
  console.log(`📊 Threshold: ${WEALTH_TAX_THRESHOLD.toLocaleString()} JC`);
  console.log(`💰 Tax rate: ${WEALTH_TAX_RATE * 100}%`);
  console.log('');

  // Fetch all users with credits above threshold
  const { data: richUsers, error: fetchError } = await supabase
    .from('profiles')
    .select('id, pseudo, credits')
    .gt('credits', WEALTH_TAX_THRESHOLD)
    .order('credits', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching profiles:', fetchError);
    return;
  }

  if (!richUsers || richUsers.length === 0) {
    console.log('✅ No users above wealth tax threshold. Nothing to do.');
    return;
  }

  console.log(`Found ${richUsers.length} users above ${WEALTH_TAX_THRESHOLD.toLocaleString()} JC:`);
  console.log('');

  let totalTaxCollected = 0;
  let usersProcessed = 0;
  let errors = 0;

  for (const user of richUsers as Profile[]) {
    const taxAmount = Math.floor(user.credits * WEALTH_TAX_RATE);
    const newCredits = user.credits - taxAmount;

    console.log(`  👤 ${user.pseudo}:`);
    console.log(`     Current: ${user.credits.toLocaleString()} JC`);
    console.log(`     Tax (${WEALTH_TAX_RATE * 100}%): -${taxAmount.toLocaleString()} JC`);
    console.log(`     After tax: ${newCredits.toLocaleString()} JC`);

    // Update user credits
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', user.id);

    if (updateError) {
      console.error(`     ❌ Error updating ${user.pseudo}:`, updateError);
      errors++;
    } else {
      console.log(`     ✅ Tax applied successfully`);
      totalTaxCollected += taxAmount;
      usersProcessed++;
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════');
  console.log('📊 WEEKLY WEALTH TAX SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`Users taxed: ${usersProcessed}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total tax collected: ${totalTaxCollected.toLocaleString()} JC`);
  console.log('═══════════════════════════════════════');
}

// Run the tax collection
applyWeeklyWealthTax()
  .then(() => {
    console.log('');
    console.log('🏦 Weekly wealth tax collection complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
