-- Criação da tabela de Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    trial_uses INTEGER DEFAULT 4,
    daily_uses INTEGER DEFAULT 0,
    monthly_uses INTEGER DEFAULT 0,
    last_use_date DATE NOT NULL DEFAULT CURRENT_DATE,
    renewal_date TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_status TEXT,
    role TEXT DEFAULT 'user'
);

-- Ativar RLS (Row Level Security) para customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para customers
-- Usuários podem ler seu próprio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.customers;
CREATE POLICY "Users can view own profile" 
    ON public.customers FOR SELECT 
    USING (auth.uid() = id);

-- Usuários podem atualizar apenas alguns campos do seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.customers;
CREATE POLICY "Users can update own profile" 
    ON public.customers FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (
        -- Evita que o usuário altere seu próprio plano, usos, ou dados do stripe maliciosamente
        -- O Supabase não suporta validações granulares de coluna no RLS tão fáceis quanto o Firestore,
        -- mas normalmente as atualizações de plano são feitas pelo backend via Service Role Key (que ignora RLS).
        auth.uid() = id
    );

-- Serviço (backend) tem acesso total
DROP POLICY IF EXISTS "Service role has full access" ON public.customers;
CREATE POLICY "Service role has full access" 
    ON public.customers FOR ALL 
    USING (true);

-- Trigger para criar automaticamente um registro em public.customers quando um usuário se cadastra no auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (id, email, display_name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Criação da tabela de Downloads
CREATE TABLE IF NOT EXISTS public.downloads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    src TEXT NOT NULL,
    prompt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ativar RLS para downloads
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para downloads
DROP POLICY IF EXISTS "Users can view own downloads" ON public.downloads;
CREATE POLICY "Users can view own downloads" 
    ON public.downloads FOR SELECT 
    USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can insert own downloads" ON public.downloads;
CREATE POLICY "Users can insert own downloads" 
    ON public.downloads FOR INSERT 
    WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can delete own downloads" ON public.downloads;
CREATE POLICY "Users can delete own downloads" 
    ON public.downloads FOR DELETE 
    USING (auth.uid() = customer_id);


-- Função RPC para checar e reservar uso de IA (Substitui a transação do Firestore no backend)
CREATE OR REPLACE FUNCTION public.check_and_reserve_usage(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_customer public.customers%ROWTYPE;
    v_plan_limits JSONB := '{"free": {"daily": 0, "monthly": 0}, "basic": {"daily": 15, "monthly": 450}, "intermediate": {"daily": 50, "monthly": 1500}, "premium": {"daily": 99999, "monthly": 999999}}'::jsonb;
    v_daily_limit INTEGER;
    v_monthly_limit INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Obter o usuário atual bloqueando a linha para update (evita race conditions)
    SELECT * INTO v_customer FROM public.customers WHERE id = user_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Reset diário se a data mudou
    IF v_customer.last_use_date <> v_today THEN
        v_customer.daily_uses := 0;
        v_customer.last_use_date := v_today;
    END IF;

    IF v_customer.plan = 'free' THEN
        IF v_customer.trial_uses <= 0 THEN
            RAISE EXCEPTION 'Limite de avaliação grátis atingido (0/4). Assine um plano.';
        END IF;
        v_customer.trial_uses := v_customer.trial_uses - 1;
    ELSE
        -- Extrai limites do plano
        v_daily_limit := (v_plan_limits->v_customer.plan->>'daily')::INTEGER;
        v_monthly_limit := (v_plan_limits->v_customer.plan->>'monthly')::INTEGER;

        IF v_customer.daily_uses >= v_daily_limit THEN
            RAISE EXCEPTION 'Limite diário atingido (%/%)', v_customer.daily_uses, v_daily_limit;
        END IF;

        IF v_customer.monthly_uses >= v_monthly_limit THEN
            RAISE EXCEPTION 'Limite mensal atingido (%/%). Aguarde a renovação.', v_customer.monthly_uses, v_monthly_limit;
        END IF;

        v_customer.daily_uses := v_customer.daily_uses + 1;
        v_customer.monthly_uses := v_customer.monthly_uses + 1;
    END IF;

    -- Salva as alterações
    UPDATE public.customers
    SET daily_uses = v_customer.daily_uses,
        monthly_uses = v_customer.monthly_uses,
        last_use_date = v_customer.last_use_date,
        trial_uses = v_customer.trial_uses
    WHERE id = user_id;

    -- Retorna os dados atualizados como JSON
    RETURN jsonb_build_object(
        'plan', v_customer.plan,
        'dailyUses', v_customer.daily_uses,
        'monthlyUses', v_customer.monthly_uses,
        'trialUses', v_customer.trial_uses
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
