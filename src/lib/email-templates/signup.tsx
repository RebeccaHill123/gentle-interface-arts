import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

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
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {token ? `Your ${siteName} verification code: ${token}` : `Confirm your email for ${siteName}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your verification code</Heading>
        <Text style={text}>
          Enter this code in the {siteName} sign-up tab to finish setting up your account for{' '}
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          .
        </Text>
        {token && (
          <Section style={codeWrap}>
            <Text style={code}>{token}</Text>
          </Section>
        )}
        <Text style={smallMuted}>This code expires in 1 hour. If you request a new code, older codes stop working.</Text>
        <Section style={fallbackWrap}>
          <Text style={fallbackLabel}>Can't see the code clearly?</Text>
          <Button href={confirmationUrl} style={fallbackButton}>
            Verify instantly
          </Button>
          <Text style={fallbackHelp}>
            Opens {siteName} in a new tab and signs you in — no code needed.
          </Text>
        </Section>
        <Text style={footer}>
          Didn't sign up for{' '}
          <Link href={siteUrl} style={link}>
            {siteName}
          </Link>
          ? You can safely ignore this email.
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
const fallbackWrap = {
  borderTop: '1px solid #eeeeee',
  paddingTop: '20px',
  margin: '0 0 25px',
  textAlign: 'center' as const,
}
const fallbackLabel = {
  fontSize: '13px',
  color: '#55575d',
  margin: '0 0 12px',
}
const fallbackButton = {
  display: 'inline-block',
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
}
const fallbackHelp = {
  fontSize: '12px',
  color: '#888888',
  margin: '12px 0 0',
}
const link = { color: '#000000', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
