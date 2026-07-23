import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export function EmailLayout({
  preview,
  heading,
  intro,
  children,
}: {
  preview: string;
  heading: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={topBar} />
          <Section style={header}>
            <Text style={eyebrow}>LIVING PRAYER</Text>
            <Text style={signature}>Pedro Morais</Text>
          </Section>
          <Hr style={divider} />
          <Section style={content}>
            <Heading as="h1" style={title}>
              {heading}
            </Heading>
            {intro ? <Text style={paragraph}>{intro}</Text> : null}
            {children}
          </Section>
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerTitle}>Living Prayer</Text>
            <Text style={footerCopy}>Asana como prática sagrada</Text>
            <Text style={footerCopy}>4–6 September 2026 · Shamballah Yoga Retreats</Text>
            <Link href="https://livingprayer.pt" style={footerLink}>
              livingprayer.pt
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <Section style={callout}>
      <Text style={{ ...paragraph, margin: 0 }}>{children}</Text>
    </Section>
  );
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={paragraph}>{children}</Text>;
}

const body = {
  margin: 0,
  padding: "40px 16px",
  backgroundColor: "#EDE8E2",
  color: "#2D2D2D",
  fontFamily: "Inter, Helvetica, Arial, sans-serif",
};

const container = {
  maxWidth: "600px",
  backgroundColor: "#FEFCF9",
  borderRadius: "4px",
  overflow: "hidden",
  border: "1px solid #E2D9CE",
};

const topBar = { height: "3px", backgroundColor: "#4A5D4F" };

const header = { padding: "42px 48px 28px" };
const eyebrow = {
  margin: "0 0 8px",
  color: "#4A5D4F",
  fontSize: "11px",
  letterSpacing: "0.3em",
  textTransform: "uppercase" as const,
  fontFamily: "Georgia, serif",
};
const signature = {
  margin: 0,
  color: "#8B7355",
  fontSize: "10px",
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
  fontFamily: "Georgia, serif",
};
const divider = { borderColor: "#E2D9CE", margin: 0 };
const content = { padding: "42px 48px 28px" };
const title = {
  margin: "0 0 18px",
  color: "#2D2D2D",
  fontSize: "28px",
  lineHeight: "1.1",
  fontWeight: "500",
  fontFamily: "Georgia, serif",
};
const paragraph = {
  margin: "0 0 18px",
  fontSize: "15px",
  lineHeight: "1.8",
  color: "#3D3D3D",
};
const callout = {
  marginBottom: "24px",
  padding: "18px 20px",
  borderLeft: "3px solid #4A5D4F",
  backgroundColor: "#F5F0EB",
};
const footer = { padding: "32px 48px 40px" };
const footerTitle = {
  margin: "0 0 6px",
  color: "#4A5D4F",
  fontSize: "11px",
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
  fontFamily: "Georgia, serif",
};
const footerCopy = {
  margin: "0 0 6px",
  color: "#8B7355",
  fontSize: "12px",
  lineHeight: "1.6",
};
const footerLink = {
  color: "#4A5D4F",
  fontSize: "12px",
  textDecoration: "none",
};
