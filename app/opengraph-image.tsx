import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "PayShield — predict who pays late, before you invoice.";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#faf8f3",
          color: "#0a0a0a",
          padding: "72px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "#0a0a0a",
              color: "#faf8f3",
              border: "3px solid #0a0a0a",
              boxShadow: "8px 8px 0 #e8593c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.01em" }}>
            PayShield
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "1000px",
          }}
        >
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.0,
              fontWeight: 800,
              letterSpacing: "-0.025em",
            }}
          >
            Predict who pays late,
          </div>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.0,
              fontStyle: "italic",
              fontWeight: 500,
              color: "#e8593c",
              letterSpacing: "-0.025em",
            }}
          >
            before you invoice.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "3px solid #0a0a0a",
            paddingTop: "24px",
            fontSize: 22,
          }}
        >
          <div>Public UK & Northern Ireland data · Companies House + PPR · Claude reasoning</div>
          <div style={{ fontWeight: 700 }}>HackBelfast 2026</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
