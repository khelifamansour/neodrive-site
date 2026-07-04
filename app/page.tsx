const hero: React.CSSProperties = {
  minHeight: 720,
  display: "flex",
  alignItems: "center",
  padding: "0 10%",
  backgroundImage:
    "linear-gradient(to right, rgba(4,12,20,0.92) 0%, rgba(4,12,20,0.75) 35%, rgba(4,12,20,0.25) 60%, rgba(4,12,20,0.05) 100%), url('/hero.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  color: "white",
};

const heroText: React.CSSProperties = {
  width: "48%",
  maxWidth: 650,
  zIndex: 2,
};

const badge: React.CSSProperties = {
  display: "inline-block",
  background: "white",
  color: "#111",
  padding: "10px 18px",
  borderRadius: 999,
  fontWeight: 900,
  marginBottom: 24,
};

const title: React.CSSProperties = {
  fontSize: 72,
  lineHeight: 1,
  fontWeight: 950,
  margin: 0,
};

const priceHero: React.CSSProperties = {
  color: "#ff8a00",
  fontSize: 56,
  fontWeight: 950,
  margin: "18px 0",
};

const subtitle: React.CSSProperties = {
  fontSize: 23,
  lineHeight: 1.5,
  maxWidth: 580,
  color: "#f4f4f4",
};

const heroIcons: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 16,
  marginTop: 35,
  maxWidth: 680,
};

const heroIcon: React.CSSProperties = {
  background: "rgba(255,255,255,0.16)",
  backdropFilter: "blur(8px)",
  padding: "16px 12px",
  borderRadius: 18,
  fontWeight: 900,
  textAlign: "center",
  fontSize: 14,
};
