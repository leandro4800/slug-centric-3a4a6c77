import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const APP_URL = 'https://alpha-coach.app'

interface AlunoCredenciaisProps {
  nome?: string
  email?: string
  password?: string
  coachNome?: string
  slug?: string
}

const AlunoCredenciaisEmail = ({ nome, email, password, coachNome, slug }: AlunoCredenciaisProps) => {
  const loginUrl = slug ? `${APP_URL}/${slug}/app` : `${APP_URL}/login`
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>Seu acesso ao app {coachNome || 'AlphaCoach'} está liberado</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Olá{nome ? `, ${nome}` : ''}! 💪</Heading>
          <Text style={text}>
            Seu cadastro foi feito por <strong>{coachNome || 'seu coach'}</strong>. Agora você tem
            acesso ao aplicativo para acompanhar treinos, dieta, evolução e muito mais.
          </Text>

          <Section style={credBox}>
            <Text style={credLabel}>SEUS DADOS DE ACESSO</Text>
            <Text style={credRow}><strong>Usuário:</strong> {email}</Text>
            <Text style={credRow}><strong>Senha temporária:</strong> {password}</Text>
          </Section>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={loginUrl} style={button}>ENTRAR NO APP</Button>
          </Section>

          <Hr style={hr} />

          <Heading as="h2" style={h2}>Como começar</Heading>
          <Text style={text}>1. Baixe o aplicativo ou acesse pelo link acima.</Text>
          <Text style={text}>2. Faça login com o e-mail e a senha desta mensagem.</Text>
          <Text style={text}>3. Altere sua senha em <strong>Perfil → Segurança</strong>.</Text>
          <Text style={text}>4. Complete seu onboarding para liberar treino e dieta personalizados.</Text>

          <Text style={footer}>Bons treinos! Equipe {coachNome || 'AlphaCoach'}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AlunoCredenciaisEmail,
  subject: 'Seus dados de acesso ao app',
  displayName: 'Credenciais do aluno',
  previewData: {
    nome: 'João Silva',
    email: 'joao@email.com',
    password: 'Abc12345',
    coachNome: 'AlphaCoach',
    slug: 'alphateam',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#000000', margin: '0 0 16px' }
const h2 = { fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '24px 0 12px' }
const text = { fontSize: '14px', color: '#333333', lineHeight: '1.6', margin: '0 0 12px' }
const credBox = { backgroundColor: '#f5f5f5', padding: '16px', borderLeft: '4px solid #E50914', margin: '20px 0' }
const credLabel = { fontSize: '10px', letterSpacing: '2px', color: '#E50914', fontWeight: 'bold' as const, margin: '0 0 8px' }
const credRow = { fontSize: '14px', color: '#000000', margin: '4px 0', fontFamily: 'monospace' }
const button = { backgroundColor: '#E50914', color: '#ffffff', padding: '14px 28px', textDecoration: 'none', fontWeight: 'bold', textTransform: 'uppercase' as const, fontSize: '13px', letterSpacing: '1px' }
const hr = { border: 'none', borderTop: '1px solid #eaeaea', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
