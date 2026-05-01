-- Add identity verification fields to profissionais
ALTER TABLE public.profissionais 
ADD COLUMN IF NOT EXISTS status_identidade TEXT DEFAULT 'pendente' CHECK (status_identidade IN ('pendente', 'em_analise', 'aprovado', 'rejeitado')),
ADD COLUMN IF NOT EXISTS foto_identidade_url TEXT;

-- Create saques table
CREATE TABLE IF NOT EXISTS public.saques (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profissional_id UUID NOT NULL REFERENCES public.profissionais(id),
    valor_centavos INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
    chave_pix TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saques ENABLE ROW LEVEL SECURITY;

-- Create policies for saques
CREATE POLICY "Profissionais can view their own saques" 
ON public.saques 
FOR SELECT 
USING (auth.uid() = profissional_id);

CREATE POLICY "Profissionais can create their own saques" 
ON public.saques 
FOR INSERT 
WITH CHECK (auth.uid() = profissional_id);

-- Create trigger for updated_at
CREATE TRIGGER update_saques_updated_at
BEFORE UPDATE ON public.saques
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();