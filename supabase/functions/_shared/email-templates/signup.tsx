/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  token,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de confirmação para {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirme seu cadastro</Heading>
        <Text style={text}>
          Olá! Clique no botão abaixo para confirmar seu e-mail em{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          :
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar E-mail
        </Button>
        <Text style={textSmall}>
          Ou se preferir, use o código abaixo na tela de confirmação:
        </Text>
        <div style={codeBox}>{token || '------'}</div>
        <Text style={textSmall}>
          Este código expira em 1 hora.
        </Text>
        <Text style={footer}>
          Se você não criou uma conta, ignore este e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 20px',
}
const textSmall = {
  fontSize: '13px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const codeBox = {
  backgroundColor: '#f4f4f5',
  border: '1px solid #e4e4e7',
  borderRadius: '8px',
  padding: '20px',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  textAlign: 'center' as const,
  color: '#E50914',
  margin: '0 0 20px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
