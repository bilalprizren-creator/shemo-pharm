import { ImageResponse } from "next/og";

export const alt = "SHEMO PHARM — Produkte dhe pajisje mjekësore në Kosovë";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Brand-colored social preview card generated at build time. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f2faf7 0%, #ffffff 50%, #f8f5fa 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ fontSize: 110, fontWeight: 800, color: "#2c2c30", letterSpacing: -4 }}>
            SHEMO
          </span>
          <span
            style={{
              fontSize: 110,
              fontWeight: 800,
              color: "#14b590",
              letterSpacing: -4,
              marginLeft: 24,
            }}
          >
            PHARM
          </span>
        </div>
        <div
          style={{
            marginTop: 8,
            width: 220,
            height: 10,
            borderRadius: 5,
            background: "linear-gradient(90deg, #14b590, #834b9b)",
          }}
        />
        <span style={{ marginTop: 32, fontSize: 34, color: "#606062" }}>
          Distributor me shumicë i pajisjeve dhe produkteve mjekësore
        </span>
        <span style={{ marginTop: 12, fontSize: 26, color: "#834b9b", fontWeight: 700 }}>
          Prizren, Kosovë
        </span>
      </div>
    ),
    size
  );
}
