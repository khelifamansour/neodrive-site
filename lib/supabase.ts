import { createClient }
from "@supabase/supabase-js";

const supabaseUrl =
"https://tzlsdjzcxdjaatcpwqwn.supabase.co";

const supabaseKey =
"TA_CLE_PUBLISHABLE";

export const supabase =
createClient(
  supabaseUrl,
  supabaseKey
);
