import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'AlphaCoach'
const APP_URL = 'https://alpha-coach.app'

interface CoachApprovedProps {
  name?: string
  slug?: string
}

const CoachApprovedEmail = ({ name, slug }: CoachApprovedProps) => {
  const url = slug ? `${APP_URL}/${slug}/admin` : `${APP_URL}/login`
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>Sua conta de coach foi aprovada</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? `Bem-vindo(a), ${name}!` : 'Bem-vindo(a)!'}</Heading>
          <Text style={text}>
            Sua conta de coach na {SITE_NAME} foi aprovada. Agora você já pode acessar o painel,
            cadastrar seus atletas e configurar sua landing.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={url} style={button}>Acessar meu painel</Button>
          </Section>
          <Text style={footer}>Equipe {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CoachApprovedEmail,
  subject: 'Sua conta de coach foi aprovada 🎉',
  displayName: 'Coach aprovado',
  previewData: { name: 'Samila', slug: 'nutrisamiladias' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#000000', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: '#E50914', color: '#ffffff', padding: '14px 28px', textDecoration: 'none', fontWeight: 'bold', textTransform: 'uppercase' as const, fontSize: '13px', letterSpacing: '1px' }
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
