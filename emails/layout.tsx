import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

/** Brand-styled email shell shared by every transactional email. */
export const colors = {
  bg: "#F6EEE7",
  surface: "#FBF7F3",
  muted: "#EFE4DA",
  border: "#E6DAD0",
  text: "#1F1A17",
  subtle: "#6F6158",
  cognac: "#9C5A33",
};

const serif = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const sans = "'Jost', 'Helvetica Neue', Arial, sans-serif";

export const s = {
  h1: { fontFamily: serif, fontSize: "34px", fontWeight: 400, lineHeight: "1.15", margin: "0 0 12px", color: colors.text } as CSSProperties,
  h2: { fontFamily: serif, fontSize: "24px", fontWeight: 400, margin: "24px 0 8px", color: colors.text } as CSSProperties,
  p: { fontFamily: sans, fontSize: "15px", lineHeight: "1.65", color: colors.text, margin: "0 0 14px" } as CSSProperties,
  small: { fontFamily: sans, fontSize: "13px", lineHeight: "1.6", color: colors.subtle, margin: "0 0 8px" } as CSSProperties,
  button: {
    display: "inline-block",
    background: colors.text,
    color: colors.bg,
    fontFamily: sans,
    fontSize: "14px",
    letterSpacing: "0.04em",
    padding: "14px 26px",
    borderRadius: "6px",
    textDecoration: "none",
  } as CSSProperties,
  card: { background: colors.surface, borderRadius: "14px", padding: "28px", border: `1px solid ${colors.border}` } as CSSProperties,
  hr: { borderColor: colors.border, margin: "22px 0" } as CSSProperties,
};

export function EmailLayout({ preview, children, siteUrl }: { preview: string; children: ReactNode; siteUrl: string }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ background: colors.bg, margin: 0, padding: "32px 12px" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto" }}>
          <Section style={{ textAlign: "center", paddingBottom: "22px" }}>
            <Link href={siteUrl} style={{ textDecoration: "none", display: "inline-block" }}>
              <Img src={`${siteUrl.replace(/\/$/, "")}/images/logo/seicaselogo.png`} alt="seicase" width="155" height="48" style={{ margin: "0 auto" }} />
            </Link>
          </Section>
          <Section style={s.card}>{children}</Section>
          <Section style={{ textAlign: "center", padding: "26px 10px 0" }}>
            <Text style={{ ...s.small, fontFamily: serif, fontSize: "18px", color: colors.text }}>
              More than a bag. A part of your story.
            </Text>
            <Text style={s.small}>
              <Link href={`${siteUrl}/help`} style={{ color: colors.subtle }}>
                Help Centre
              </Link>{" "}
              ·{" "}
              <Link href={`${siteUrl}/returns-and-exchanges`} style={{ color: colors.subtle }}>
                Returns
              </Link>{" "}
              ·{" "}
              <Link href={`${siteUrl}/contact`} style={{ color: colors.subtle }}>
                Contact
              </Link>
            </Text>
            <Hr style={s.hr} />
            <Text style={{ ...s.small, fontSize: "12px" }}>seicase · 12, Fashion Street, Chennai 600001 · India</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function Btn({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={s.button}>
      {children}
    </Link>
  );
}
