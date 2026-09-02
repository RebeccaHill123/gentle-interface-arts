import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  token,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {token ? `Your ${siteName} password reset code: ${token}` : `Reset your password for ${siteName}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your password reset code</Heading>
        <Text style={text}>
          Enter this code in the {siteName} password reset tab to choose a new password.
        </Text>
        {token && (
          <Section style={codeWrap}>
            <Text style={code}>{token}</Text>
          </Section>
        )}
        <Text style={smallMuted}>This code expires in 1 hour.</Text>
        <Text style={fallback}>
          Opening this email on a different device?{' '}
          <Link href={confirmationUrl} style={link}>
            Click here to reset instead
          </Link>
          .
        </Text>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this email.
          Your password will not be changed.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
const codeWrap = {
  textAlign: 'center' as const,
  margin: '24px 0',
}
const code = {
  display: 'inline-block',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  color: '#000000',
  backgroundColor: '#f4f4f5',
  padding: '14px 24px',
  borderRadius: '10px',
  fontFamily: 'Menlo, Consolas, monospace',
  margin: 0,
}
const smallMuted = {
  fontSize: '12px',
  color: '#888888',
  textAlign: 'center' as const,
  margin: '0 0 30px',
}
const fallback = {
  fontSize: '13px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: '#000000', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
