
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const coaches = [
    {
      nome: 'PIKACHU TEAM',
      slug: 'pikachu-team',
      tagline: 'HIPERTROFIA & ESTÉTICA',
      bio: 'Treinos cinematográficos pra quem quer crescer.',
      cidade: 'Serra',
      estado: 'ES',
      status: 'approved',
      owner_user_id: '757a6538-bccb-4a23-b098-4b69cb4d1b1a',
      especialidades: ['Hipertrofia', 'Estética'],
      hero_url: 'https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777474299562_rgnobx_Treino_de_b_ceps____....._reels__gym__workout__academia__treino.mp4'
    },
    {
      nome: 'TEAM JACKSON',
      slug: 'team-jackson',
      tagline: 'HIPERTROFIA & EMAGRECIMENTO',
      bio: 'Performance e estética com método Team Jackson.',
      cidade: 'Serra',
      estado: 'ES',
      status: 'approved',
      owner_user_id: '757a6538-bccb-4a23-b098-4b69cb4d1b1a',
      especialidades: ['Hipertrofia', 'Emagrecimento'],
      hero_url: 'https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777468713644_di4x57_WhatsApp_Video_2026-04-24_at_22.37.07__1_.mp4'
    },
    {
      nome: 'BADBOY TEAM',
      slug: 'badboy-team',
      tagline: 'ESTÉTICA & PERFORMANCE',
      bio: 'Metodologia Badboy para resultados extremos.',
      cidade: 'São Paulo',
      estado: 'SP',
      status: 'approved',
      owner_user_id: '757a6538-bccb-4a23-b098-4b69cb4d1b1a',
      especialidades: ['Estética', 'Performance'],
      hero_url: 'https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777474964273_njic9i_Testado_e_aprovado__oficialjeffersonbadboy____ARNOLD_SPORTS_SOUTH_AMERICA_2026.mp4'
    },
    {
      nome: 'NUTRI SAMILA DIAS',
      slug: 'samila-dias',
      tagline: 'NUTRIÇÃO ESPORTIVA',
      bio: 'Especialista em emagrecimento e saúde.',
      cidade: 'Serra',
      estado: 'ES',
      status: 'approved',
      owner_user_id: '757a6538-bccb-4a23-b098-4b69cb4d1b1a',
      especialidades: ['Nutrição Esportiva', 'Saúde'],
      hero_url: 'https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777474463996_dxa3r7_Make_notes_look_202604250428.mp4'
    }
  ];

  for (const coach of coaches) {
    const { error } = await supabase
      .from('tenants')
      .upsert(coach, { onConflict: 'slug' });
    
    if (error) console.error(`Error seeding ${coach.nome}:`, error.message);
    else console.log(`Seeded ${coach.nome}`);
  }
}

seed();
