// Frontend -> Backend mail proxy
// This calls our Node server endpoint to send emails via Nodemailer
export interface MailApiError {
  ok?: boolean;
  error?: string;
  configured?: boolean;
  host?: string;
  id?: string;
}

export async function sendMailViaServer(params: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  const base = import.meta.env.VITE_MAIL_API_BASE || '';
  const apiKey = import.meta.env.VITE_MAIL_API_KEY as string | undefined;
  const res = await fetch(`${base}/api/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    let data: MailApiError | undefined = undefined;
    try {
      data = (await res.json()) as MailApiError;
    } catch {
      // ignore
    }
    const details = data ? JSON.stringify(data) : '';
    if (res.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error((data && data.error) || `HTTP ${res.status}${details ? `: ${details}` : ''}`);
  }
  return (await res.json()) as { ok: true; id: string };
}
