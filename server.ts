import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

import fs from 'fs';

// Manually load .env variables
const envPath = path.join(process.cwd(), '.env');
console.log('[.env Loader] Checking .env at:', envPath);
if (fs.existsSync(envPath)) {
  console.log('[.env Loader] File found, parsing...');
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      
      console.log(`[.env Loader] Key matched: ${key}, value length: ${value.length}`);
      
      // Update process.env if not set or if it's a blank placeholder
      if (!process.env[key] || process.env[key] === '') {
        process.env[key] = value;
      } else if (value !== '') {
        // If we have a new value in .env, prioritize it
        process.env[key] = value;
      }
    }
  });
} else {
  console.log('[.env Loader] File NOT found at:', envPath);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Admin Client (Bypasses RLS)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('WARNING: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. Backend database operations will fail.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const isStripeKeyValid = stripeKey.startsWith('sk_') || stripeKey.startsWith('rk_');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('WARNING: STRIPE_SECRET_KEY is not set. Payments will not work, but the server will start.');
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-02-11' as any,
});

// Initialize Mercado Pago
const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: { timeout: 5000 }
});
const mpPreference = new Preference(mpClient);
const mpPayment = new Payment(mpClient);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Create Checkout Session
  app.post('/api/create-checkout-session', express.json(), async (req, res) => {
    if (!isStripeKeyValid) {
      console.error('Stripe Error: Invalid API Key format. Must start with sk_ or rk_. Current key:', stripeKey);
      return res.status(500).json({ 
        error: 'Configuração do Stripe incompleta. A chave de API fornecida é inválida.' 
      });
    }

    const { plan, billingCycle, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const priceMap: Record<string, string> = {
      'basic_monthly': process.env.STRIPE_PRICE_BASIC_MONTHLY || '',
      'basic_annual': process.env.STRIPE_PRICE_BASIC_ANNUAL || '',
      'intermediate_annual': process.env.STRIPE_PRICE_INTERMEDIATE_ANNUAL || '',
      'premium_annual': process.env.STRIPE_PRICE_PREMIUM_ANNUAL || '',
    };

    const priceKey = `${plan}_${billingCycle}`;
    const priceId = priceMap[priceKey];

    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan or price ID not configured' });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/pricing`,
        client_reference_id: userId,
        metadata: {
          plan: plan,
          billingCycle: billingCycle,
        },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create Mercado Pago Preference
  app.post('/api/create-preference', express.json(), async (req, res) => {
    const { plan, billingCycle, userId, price } = req.body;

    if (!userId || !plan || !price) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
      const response = await mpPreference.create({
        body: {
          items: [
            {
              id: plan,
              title: `Plano ${plan.charAt(0).toUpperCase() + plan.slice(1)} - Mockups.AI`,
              quantity: 1,
              unit_price: Number(price),
              currency_id: 'BRL',
            }
          ],
          metadata: {
            userId: userId,
            plan: plan,
            billingCycle: billingCycle || 'monthly'
          },
          back_urls: {
            success: `${origin}/success`,
            failure: `${origin}/pricing`,
            pending: `${origin}/pricing`,
          },
          auto_return: 'approved',
          notification_url: `${process.env.WEBHOOK_URL || origin}/api/webhooks/mercadopago`
        }
      });

      res.json({ id: response.id, init_point: response.init_point });
    } catch (err: any) {
      console.error('Error creating MP preference:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Mercado Pago Webhook endpoint
  app.post('/api/webhooks/mercadopago', express.json(), async (req, res) => {
    const { action, data } = req.body;

    // Handle payment created or updated
    if (action === 'payment.created' || action === 'payment.updated' || req.query.topic === 'payment') {
      const paymentId = data?.id || req.query.id;
      
      try {
        const payment = await mpPayment.get({ id: paymentId });
        
        if (payment.status === 'approved') {
          const userId = payment.metadata?.user_id;
          const plan = payment.metadata?.plan;
          const billingCycle = payment.metadata?.billing_cycle;

          if (userId && plan) {
            console.log(`[Mercado Pago Webhook] Updating user ${userId} to plan ${plan}`);
            
            const updateData: any = {
              plan: plan,
              billing_cycle: billingCycle || 'monthly',
              last_use_date: new Date().toISOString().split('T')[0],
              stripe_status: 'active', // Reuse the field for consistency or rename in future
            };

            const renewalDate = new Date();
            if (billingCycle === 'annual') renewalDate.setFullYear(renewalDate.getFullYear() + 1);
            else renewalDate.setMonth(renewalDate.getMonth() + 1);
            
            updateData.renewal_date = renewalDate.toISOString();
            updateData.monthly_uses = 0;

            await supabase.from('customers').update(updateData).eq('id', userId);
          }
        }
      } catch (err) {
        console.error('Error fetching MP payment:', err);
      }
    }

    res.sendStatus(200);
  });

  // Stripe Webhook endpoint
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (!sig || !webhookSecret) {
        throw new Error('Missing stripe-signature or STRIPE_WEBHOOK_SECRET');
      }
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.client_reference_id;
          const plan = session.metadata?.plan;
          const billingCycle = session.metadata?.billingCycle;

          if (userId && plan) {
            console.log(`[Stripe Webhook] Updating user ${userId} to plan ${plan}`);
            
            const updateData: any = {
              plan: plan,
              billing_cycle: billingCycle || 'monthly',
              last_use_date: new Date().toISOString().split('T')[0],
              stripe_customer_id: session.customer,
            };

            if (session.subscription) {
              const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
              const mainItem = subscription.items.data[0];
              updateData.stripe_subscription_id = subscription.id;
              updateData.current_period_start = new Date((mainItem?.current_period_start || subscription.created) * 1000).toISOString();
              updateData.current_period_end = new Date((mainItem?.current_period_end || subscription.created) * 1000).toISOString();
              updateData.stripe_status = subscription.status;
              updateData.monthly_uses = 0;
            } else {
              const renewalDate = new Date();
              if (billingCycle === 'annual') renewalDate.setFullYear(renewalDate.getFullYear() + 1);
              else renewalDate.setMonth(renewalDate.getMonth() + 1);
              updateData.renewal_date = renewalDate.toISOString();
              updateData.monthly_uses = 0;
            }

            await supabase.from('customers').update(updateData).eq('id', userId);
          }
          break;
        }
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          
          const { data: userDoc, error: fetchErr } = await supabase
            .from('customers')
            .select('*')
            .eq('stripe_customer_id', customerId)
            .single();
          
          if (userDoc && !fetchErr) {
            const mainItem = subscription.items.data[0];
            const newPeriodStart = new Date((mainItem?.current_period_start || subscription.created) * 1000);
            const oldPeriodStart = userDoc.current_period_start ? new Date(userDoc.current_period_start) : null;
            
            const updateData: any = {
              stripe_subscription_id: subscription.id,
              current_period_start: newPeriodStart.toISOString(),
              current_period_end: new Date((mainItem?.current_period_end || subscription.created) * 1000).toISOString(),
              stripe_status: subscription.status,
            };

            if (!oldPeriodStart || newPeriodStart.getTime() > oldPeriodStart.getTime()) {
               console.log(`[Stripe Webhook] Cycle renewed for user ${userDoc.id}. Resetting monthly uses.`);
               updateData.monthly_uses = 0;
            }

            if (subscription.status !== 'active' && subscription.status !== 'trialing') {
               console.log(`[Stripe Webhook] Subscription isn't active anymore. Downgrading to free.`);
               updateData.plan = 'free';
            }
             
            await supabase.from('customers').update(updateData).eq('id', userDoc.id);
          }
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          
          const { data: userDoc, error: fetchErr } = await supabase
            .from('customers')
            .select('*')
            .eq('stripe_customer_id', customerId)
            .single();
          
          if (userDoc && !fetchErr) {
            console.log(`[Stripe Webhook] Subscription deleted for user ${userDoc.id}. Downgrading to free.`);
            await supabase.from('customers').update({
              plan: 'free',
              stripe_status: subscription.status,
            }).eq('id', userDoc.id);
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error processing webhook event:', err);
      return res.status(500).send('Internal Server Error');
    }

    res.json({ received: true });
  });

  app.use(express.json({ limit: '50mb' }));
  
  app.get('/api/health', (req, res) => {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API || process.env.API_KEY || '';
    res.json({ 
      status: 'ok', 
      geminiConfigured: !!geminiKey && geminiKey !== 'undefined' 
    });
  });

  const { GoogleGenAI } = await import('@google/genai');

  app.post('/api/generate', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized. Auth header missing.' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !sessionUser) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = sessionUser.id;
    const { images, prompt } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Missing images payload' });
    }

    if (!supabaseServiceKey) {
      return res.status(500).json({ 
        error: 'Configuração Incompleta: A variável SUPABASE_SERVICE_ROLE_KEY não está configurada.' 
      });
    }

    try {
      // Use the RPC to securely check and increment usage in a transaction
      const { data: checkData, error: rpcError } = await supabase.rpc('check_and_reserve_usage', { user_id: userId });
      
      if (rpcError) {
        console.log(`[Usage Blocked] User: ${userId}, Reason: ${rpcError.message}`);
        return res.status(403).json({ error: rpcError.message });
      }

      console.log(`[Usage Reserved] User: ${userId}, Plan: ${checkData.plan}, Daily: ${checkData.dailyUses}, Monthly: ${checkData.monthlyUses}`);

      // Perform AI Generation
      const rawKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API || process.env.API_KEY || '';
      const apiKey = rawKey.replace(/['"]/g, '').trim();
      
      if (!apiKey || apiKey === 'undefined') {
        throw new Error("Chave de API do Gemini não configurada no servidor ou é inválida.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = 'gemini-2.5-flash-image';
      
      const imageParts = images.map(base64 => {
        const payloadStr = typeof base64 === 'string' ? base64 : '';
        const base64Data = payloadStr.includes(',') ? payloadStr.split(',')[1] : payloadStr;
        return {
          inlineData: { data: base64Data, mimeType: 'image/png' }
        };
      });
      
      const textPart = { 
        text: `Task: Create a photorealistic product mockup. Instruction: ${prompt}. 
        CRITICAL INSTRUCTIONS FOR THE PROVIDED GRAPHICS:
        1. Treat the provided image as a DECAL or WATERMARK.
        2. You MUST paste the exact provided image onto the product. DO NOT redraw, re-interpret, or change any text, fonts, colors, or layout.
        3. The typography and shapes must be a 1:1 pixel-perfect match to the uploaded image.
        4. Apply it onto the fabric to follow the realistic lighting and folds, but the content itself MUST NOT be modified in any way.
        5. Strictly respect PNG transparency.` 
      };

      const response = await ai.models.generateContent({
        model,
        contents: { parts: [textPart, ...imageParts] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      const candidate = response?.candidates?.[0];
      if (!candidate || candidate.finishReason === 'SAFETY') {
        throw new Error(candidate?.finishReason === 'SAFETY' ? "Geração bloqueada por filtros de segurança do Google." : "Falha na geração: Nenhum resultado.");
      }

      const part = candidate.content?.parts?.find(p => p.inlineData);
      if (!part?.inlineData?.data) {
        throw new Error("A IA não gerou dados de imagem válidos.");
      }

      const outputBase64 = `data:image/png;base64,${part.inlineData.data}`;
      
      return res.json({ result: outputBase64 });

    } catch (err: any) {
      console.error('Error generating image via backend:', err);
      
      const errorMessage = err.message || "Erro desconhecido";
      const isGeminiError = errorMessage.includes('API key') || errorMessage.includes('fetch');

      // Attempt rollback on failure
      try {
        const { data: rollbackUser } = await supabase.from('customers').select('*').eq('id', userId).single();
        if (rollbackUser) {
          const plan = rollbackUser.plan || 'free';
          if (plan === 'free') {
             await supabase.from('customers').update({ trial_uses: (rollbackUser.trial_uses || 0) + 1 }).eq('id', userId);
             console.log(`[Usage Rollback] User: ${userId}. Restored 1 evaluation credit.`);
          } else {
             await supabase.from('customers').update({ 
               daily_uses: Math.max(0, (rollbackUser.daily_uses || 0) - 1),
               monthly_uses: Math.max(0, (rollbackUser.monthly_uses || 0) - 1)
             }).eq('id', userId);
             console.log(`[Usage Rollback] User: ${userId}. Decremented daily/monthly credit because of API failure.`);
          }
        }
      } catch (rollbackErr) {
         console.error("Rollback failed:", rollbackErr);
      }

      return res.status(500).json({ error: isGeminiError ? "Erro no Gemini: " + errorMessage : errorMessage });
    }
  });

  // Bulletproof search for the compiled "dist" directory relative to this file's folder (__dirname)
  let distPath = path.join(__dirname, 'dist');
  let isProduction = fs.existsSync(path.join(distPath, 'index.html'));

  if (!isProduction) {
    // If running from inside the dist/ folder itself (standard for built output), dist is the parent folder
    distPath = path.join(__dirname, '..', 'dist');
    isProduction = fs.existsSync(path.join(distPath, 'index.html'));
    
    if (!isProduction) {
      // Final fallback to process.cwd()
      distPath = path.join(process.cwd(), 'dist');
      isProduction = fs.existsSync(path.join(distPath, 'index.html'));
    }
  }

  if (!isProduction) {
    console.log("[Server Mode] Starting in DEVELOPMENT mode (Vite middleware)");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server Mode] Starting in PRODUCTION mode (serving pre-compiled dist folder)");
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
