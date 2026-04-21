const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const serviceRoleKey = 'f9gXiY2OFFJibuyKG1bBZg_zWimNeAD'; // From user log

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

(async () => {
  const email = 'test_real_' + Date.now() + '@example.com';
  const password = 'Password123!';
  
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  if (authError) {
    console.error('Admin create user error:', authError);
    return;
  }
  
  console.log('User created & confirmed:', authData.user.id);
  
  // Now login with this user using ANON key
  // wait, anon key is needed to test RLS
  const anonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
  const supabase = createClient(supabaseUrl, anonKey);
  
  const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({ email, password });
  if (sessionError) {
     console.error('Login error', sessionError);
     return;
  }
  
  console.log('Logged in! Session:', sessionData.session ? 'OK' : 'NULL');
  
  // Test project insert
  const { data: projData, error: projError } = await supabase
    .from('projects')
    .insert([{ user_id: authData.user.id, title: 'API Test Project' }])
    .select()
    .single();
    
  if (projError) { console.error('Project Create Error:', projError); return; }
  console.log('Project created:', projData.id);
  
  // Test chapter insert
  const { data: chapData, error: chapError } = await supabase
    .from('chapters')
    .insert([{ project_id: projData.id, title: 'Chapter 1', order_index: 0 }])
    .select();
    
  if (chapError) { console.error('Chapter Create Error:', chapError); return; }
  console.log('Chapter created:', chapData[0].id);
  
  // Clean up
  await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
  console.log('Test successful & cleaned up.');
})();
