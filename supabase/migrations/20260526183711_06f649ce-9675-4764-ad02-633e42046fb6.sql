-- Table for Coach Marketing Config
CREATE TABLE public.coach_marketing_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instagram_handle TEXT,
    topic1_label TEXT DEFAULT 'Experiência',
    topic1_icon TEXT DEFAULT 'Award',
    topic2_label TEXT DEFAULT 'Foco de Público',
    topic2_icon TEXT DEFAULT 'Users',
    topic3_label TEXT DEFAULT 'Atendimento Online',
    topic3_icon TEXT DEFAULT 'Globe',
    topic4_label TEXT DEFAULT 'Metodologia Própria',
    topic4_icon TEXT DEFAULT 'Zap',
    branding_color TEXT DEFAULT '#ff0000',
    background_style TEXT DEFAULT 'dark_metal',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_marketing_config TO authenticated;
GRANT ALL ON public.coach_marketing_config TO service_role;
ALTER TABLE public.coach_marketing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own marketing config"
ON public.coach_marketing_config
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Table for Coach Sales Links
CREATE TABLE public.coach_sales_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checkout_url TEXT,
    landing_page_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_sales_links TO authenticated;
GRANT ALL ON public.coach_sales_links TO service_role;
ALTER TABLE public.coach_sales_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own sales links"
ON public.coach_sales_links
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Table for Automated Plan Delivery
CREATE TABLE public.coach_automated_delivery (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    plan_id UUID, -- Reference to a workout plan template (adjust based on actual plan table)
    diet_id UUID, -- Reference to a diet plan template
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_automated_delivery TO authenticated;
GRANT ALL ON public.coach_automated_delivery TO service_role;
ALTER TABLE public.coach_automated_delivery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their automated delivery links"
ON public.coach_automated_delivery
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view delivery links for redemption"
ON public.coach_automated_delivery
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Add updated_at triggers
CREATE TRIGGER update_coach_marketing_config_updated_at
BEFORE UPDATE ON public.coach_marketing_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coach_sales_links_updated_at
BEFORE UPDATE ON public.coach_sales_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coach_automated_delivery_updated_at
BEFORE UPDATE ON public.coach_automated_delivery
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
