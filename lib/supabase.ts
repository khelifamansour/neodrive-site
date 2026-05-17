import { createClient }
from "@supabase/supabase-js";

const supabaseUrl =
"https://tzlsdjzcxdjaatcpwqwn.supabase.co";

const supabaseKey =
"sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd";

export const supabase =
createClient(
  supabaseUrl,
  supabaseKey
);
