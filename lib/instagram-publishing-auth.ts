const FACEBOOK_GRAPH_VERSION = "v26.0";

export type InstagramPublishingAuth = {
  accountId: string;
  username: string | null;
  token: string;
  graphBase: string;
  source: "instagram-login" | "facebook-page";
};

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

async function directInstagramAuth(token: string): Promise<InstagramPublishingAuth> {
  const url = new URL("https://graph.instagram.com/me");
  url.searchParams.set("fields", "id,username,account_type");
  url.searchParams.set("access_token", token);
  const response = await fetch(url, { cache: "no-store" });
  const data = await readJson(response);
  if (!response.ok || !data?.id) {
    throw new Error(data?.error?.message || "Instagram access token rejected");
  }
  return {
    accountId: String(data.id),
    username: data.username ? String(data.username) : null,
    token,
    graphBase: "https://graph.instagram.com",
    source: "instagram-login",
  };
}

async function resolvePageToken(token: string, pageId: string) {
  const me = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me`);
  me.searchParams.set("fields", "id");
  me.searchParams.set("access_token", token);
  const meResponse = await fetch(me, { cache: "no-store" });
  const meData = await readJson(meResponse);
  if (meResponse.ok && String(meData?.id) === pageId) return token;

  const accounts = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me/accounts`);
  accounts.searchParams.set("fields", "id,access_token");
  accounts.searchParams.set("access_token", token);
  const accountsResponse = await fetch(accounts, { cache: "no-store" });
  const accountsData = await readJson(accountsResponse);
  const page = Array.isArray(accountsData?.data)
    ? accountsData.data.find((item: { id?: string | number }) => String(item?.id) === pageId)
    : null;
  if (accountsResponse.ok && page?.access_token) return String(page.access_token);
  throw new Error(accountsData?.error?.message || meData?.error?.message || "Facebook Page token rejected");
}

async function facebookPageAuth(token: string, pageId: string): Promise<InstagramPublishingAuth> {
  const pageToken = await resolvePageToken(token, pageId);
  const url = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${pageId}`);
  url.searchParams.set("fields", "instagram_business_account{id,username}");
  url.searchParams.set("access_token", pageToken);
  const response = await fetch(url, { cache: "no-store" });
  const data = await readJson(response);
  const account = data?.instagram_business_account;
  if (!response.ok || !account?.id) {
    throw new Error(data?.error?.message || "Aucun compte Instagram professionnel relié à la Page Facebook");
  }
  return {
    accountId: String(account.id),
    username: account.username ? String(account.username) : null,
    token: pageToken,
    graphBase: `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}`,
    source: "facebook-page",
  };
}

export async function resolveInstagramPublishingAuth(): Promise<InstagramPublishingAuth> {
  const instagramToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const facebookToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const facebookPageId = process.env.FACEBOOK_PAGE_ID;
  let directError = "INSTAGRAM_ACCESS_TOKEN absent";

  if (instagramToken) {
    try {
      return await directInstagramAuth(instagramToken);
    } catch (error) {
      directError = error instanceof Error ? error.message : "Jeton Instagram refusé";
    }
  }

  if (facebookToken && facebookPageId) {
    try {
      return await facebookPageAuth(facebookToken, facebookPageId);
    } catch (error) {
      const fallbackError = error instanceof Error ? error.message : "Connexion Meta refusée";
      throw new Error(`Instagram direct indisponible (${directError}). Secours Meta indisponible (${fallbackError}).`);
    }
  }

  throw new Error(`Instagram direct indisponible (${directError}) et connexion Meta de secours non configurée.`);
}
