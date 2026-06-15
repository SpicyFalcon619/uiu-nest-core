const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yhhaczsavefrrhpdcpwm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaGFjenNhdmVmcnJocGRjcHdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ1OTk5OSwiZXhwIjoyMDk3MDM1OTk5fQ.qOwRVPWWcydF8Ty7yLBAsS4nKckknlCuqvSVGJ0qtVs'
);

async function check() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'verifications' });
  console.log("RPC result:", data, error);
}
check();
