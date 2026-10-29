/**
 * POST /api/support-email — Vercel Function (Node.js runtime, Web Request/Response).
 * Secrets come only from server-side environment variables:
 *   RESEND_API_KEY      Resend API key
 *   SUPPORT_FROM_EMAIL  verified sender, e.g. "IYS Mail <support@your-verified-domain>"
 *   SUPPORT_TO_EMAIL    only with SUPPORT_TEST_MODE=1: a designated test inbox (subject marked [TEST]);
 *                       otherwise every message goes to orders@inyourshoe.com
 */
import { handleSupport, resendSender } from './_lib/support.js';

declare const process: { env: Record<string, string | undefined> };

const handler = (request: Request) =>
  handleSupport(
    request,
    { RESEND_API_KEY: process.env.RESEND_API_KEY, SUPPORT_FROM_EMAIL: process.env.SUPPORT_FROM_EMAIL, SUPPORT_TO_EMAIL: process.env.SUPPORT_TO_EMAIL, SUPPORT_TEST_MODE: process.env.SUPPORT_TEST_MODE },
    resendSender,
  );

export const POST = handler;
export const GET = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
