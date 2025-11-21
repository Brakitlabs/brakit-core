import type { LayoutId, TemplateContext } from "../types";

interface PlainLayout {
  helpers: string;
  markup: string;
}

export function renderPlainLayout(
  layout: LayoutId,
  ctx: TemplateContext
): PlainLayout {
  const pageTitle = ctx.pageName || "Untitled page";

  switch (layout) {
    case "hero":
      return heroLayout(pageTitle);
    case "twoColumn":
      return twoColumnLayout(pageTitle);
    case "contentSplit":
      return contentSplitLayout(pageTitle);
    case "dashboard":
      return dashboardLayout(pageTitle);
    case "form":
      return formLayout(pageTitle);
    case "pricing":
      return pricingLayout(pageTitle);
    case "sidebarLeft":
      return sidebarLayout(pageTitle);
    case "docs":
      return docsLayout(pageTitle);
    case "blank":
    default:
      return blankLayout(pageTitle);
  }
}

function blankLayout(pageTitle: string): PlainLayout {
  return {
    helpers: `
  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    padding: "64px 24px",
    color: "#0f172a",
  };

  const cardGridStyle = {
    display: "grid",
    gap: "24px",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    border: "1px dashed #bfdbfe",
    padding: "24px",
    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
  };
`,
    markup: `
  <main style={pageStyle}>
    <section style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center", display: "grid", gap: "32px" }}>
      <header style={{ display: "grid", gap: "12px" }}>
        <p style={{ fontSize: "12px", letterSpacing: "6px", textTransform: "uppercase", color: "#64748b" }}>
          New page
        </p>
        <h1 style={{ fontSize: "40px", fontWeight: 600 }}>
          ${pageTitle}
        </h1>
      </header>
      <p style={{ fontSize: "18px", lineHeight: 1.6, color: "#475569" }}>
        Start shaping your layout. This scaffold highlights key content zones so you can quickly populate real components.
      </p>
      <div style={cardGridStyle}>
        {["Hero / headline", "Content zone", "Highlights"].map((heading) => (
          <article key={heading} style={cardStyle}>
            <h2 style={{ fontSize: "16px", fontWeight: 600 }}>{heading}</h2>
            <p style={{ marginTop: "8px", fontSize: "14px", lineHeight: 1.6, color: "#475569" }}>
              Replace with your own components, media, or data widgets. All spacing is handled with simple CSS.
            </p>
          </article>
        ))}
      </div>
      <footer style={{ fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase", color: "#94a3b8" }}>
        Powered by Brakit
      </footer>
    </section>
  </main>
`,
  };
}


function heroLayout(pageTitle: string): PlainLayout {
  return {
    helpers: `
  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    padding: "72px 24px",
  };

  const containerStyle = {
    display: "grid",
    gap: "32px",
    maxWidth: "1040px",
    margin: "0 auto",
    alignItems: "center",
  };

  const badgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "9999px",
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    fontSize: "12px",
    letterSpacing: "5px",
    textTransform: "uppercase",
    padding: "8px 12px",
    fontWeight: 600,
  };

  const heroActionsStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
  };

  const actionPrimaryStyle = {
    borderRadius: "12px",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    fontWeight: 600,
    padding: "12px 20px",
    border: "none",
    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.18)",
    cursor: "pointer",
    transition: "transform 150ms ease, box-shadow 150ms ease",
  };

  const actionSecondaryStyle = {
    borderRadius: "12px",
    border: "1px solid #cbd5f5",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontWeight: 600,
    padding: "12px 20px",
    cursor: "pointer",
    transition: "background-color 150ms ease, border-color 150ms ease",
  };

  const cardsGridStyle = {
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  };

  const highlightCardStyle = {
    borderRadius: "24px",
    padding: "24px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
  };

  const highlightHeadingStyle = {
    fontSize: "16px",
    fontWeight: 600,
    color: "#0f172a",
  };

  const highlightTextStyle = {
    marginTop: "12px",
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#475569",
  };
`,
    markup: `
  <main style={pageStyle}>
    <section style={containerStyle}>
      <header style={{ display: "grid", gap: "18px", maxWidth: "520px" }}>
        <span style={badgeStyle}>Launch</span>
        <h1 style={{ fontSize: "48px", fontWeight: 600, lineHeight: 1.2 }}>
          ${pageTitle}
        </h1>
        <p style={{ fontSize: "18px", lineHeight: 1.6, color: "#475569" }}>
          Kickstart a clean hero section that centers your product story and supports a fast CTA. Swap copy, add imagery, or plug in metrics with ease.
        </p>
        <div style={heroActionsStyle}>
          <button
            style={actionPrimaryStyle}
            onMouseEnter={(event) => {
              event.currentTarget.style.transform = "translateY(-2px)";
              event.currentTarget.style.boxShadow = "0 20px 32px rgba(15, 23, 42, 0.18)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = "translateY(0)";
              event.currentTarget.style.boxShadow = "0 12px 24px rgba(15, 23, 42, 0.18)";
            }}
          >
            Get started
          </button>
          <button
            style={actionSecondaryStyle}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "#f8fafc";
              event.currentTarget.style.borderColor = "#94a3b8";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "#ffffff";
              event.currentTarget.style.borderColor = "#cbd5f5";
            }}
          >
            View docs
          </button>
        </div>
      </header>
      <div style={cardsGridStyle}>
        {["Highlights", "Feature spotlight"].map((heading, index) => (
          <div key={heading} style={highlightCardStyle}>
            <h2 style={highlightHeadingStyle}>{heading}</h2>
            <p style={highlightTextStyle}>
              {index === 0
                ? "Highlight key wins or metrics to support your headline."
                : "Swap this block for imagery, video, or supporting detail."}
            </p>
          </div>
        ))}
      </div>
    </section>
  </main>
`,
  };
}


function twoColumnLayout(pageTitle: string): PlainLayout {
  return {
    helpers: `
  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    padding: "72px 24px",
    color: "#0f172a",
  };

  const containerStyle = {
    margin: "0 auto",
    maxWidth: "1080px",
    display: "grid",
    gap: "32px",
    alignItems: "start",
  };

  const sidebarStyle = {
    position: "sticky",
    top: "96px",
    display: "grid",
    gap: "16px",
  };
`,
    markup: `
  <main style={pageStyle}>
    <section
      style={{
        ...containerStyle,
        gridTemplateColumns: "minmax(0, 1fr)",
      }}
    >
      <article
        style={{
          display: "grid",
          gap: "24px",
          maxWidth: "640px",
        }}
      >
        <header style={{ display: "grid", gap: "16px" }}>
          <h1 style={{ fontSize: "40px", fontWeight: 600 }}>
            ${pageTitle}
          </h1>
          <p style={{ fontSize: "18px", lineHeight: 1.6, color: "#475569" }}>
            Build a narrative-friendly layout with a dedicated sidebar. Great for product storytelling, blogs, or release notes.
          </p>
        </header>
        <section style={{ display: "grid", gap: "18px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 600 }}>Primary content</h2>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Swap in rich blocks: multi-step explanations, image galleries, or embedded demos. This zone stretches the full column for deep content.
          </p>
          <div
            style={{
              display: "grid",
              gap: "18px",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            {["Use cases", "Drop-ins"].map((heading) => (
              <div
                key={heading}
                style={{
                  borderRadius: "20px",
                  backgroundColor: "#f8fafc",
                  border: "1px dashed #cbd5f5",
                  padding: "20px",
                }}
              >
                <h3 style={{ fontSize: "14px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "3px", color: "#475569" }}>
                  {heading}
                </h3>
                <p style={{ marginTop: "12px", fontSize: "14px", color: "#475569" }}>
                  Replace with examples, component callouts, or helpful references.
                </p>
              </div>
            ))}
          </div>
        </section>
      </article>
      <aside style={sidebarStyle}>
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            border: "1px solid #e2e8f0",
            padding: "24px",
            boxShadow: "0 12px 24px rgba(15, 23, 42, 0.04)",
          }}
        >
          <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "5px", color: "#64748b" }}>
            Sidebar
          </h3>
          <p style={{ marginTop: "12px", fontSize: "14px", lineHeight: 1.6, color: "#475569" }}>
            Use this space for calls to action, summaries, or related resources.
          </p>
          <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
            {["Download brief", "View changelog"].map((label) => (
              <button
                key={label}
                style={{
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  padding: "12px 16px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </section>
  </main>
`,
  };
}

function contentSplitLayout(pageTitle: string): PlainLayout {
  return {
    helpers: `
  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    padding: "72px 24px",
    color: "#0f172a",
  };

  const containerStyle = {
    margin: "0 auto",
    maxWidth: "1080px",
    display: "grid",
    gap: "24px",
  };
`,
    markup: `
  <main style={pageStyle}>
    <section style={containerStyle}>
      <header style={{ textAlign: "center", display: "grid", gap: "16px" }}>
        <h1 style={{ fontSize: "40px", fontWeight: 600 }}>
          ${pageTitle}
        </h1>
        <p style={{ maxWidth: "720px", margin: "0 auto", fontSize: "18px", lineHeight: 1.6, color: "#475569" }}>
          Perfect for feature comparisons, dual messaging, or pairing copy with imagery. Swap in any content blocks you need.
        </p>
      </header>
      <div
        style={{
          display: "grid",
          gap: "24px",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        <article
          style={{
            display: "grid",
            gap: "18px",
            borderRadius: "24px",
            backgroundColor: "#ffffff",
            border: "1px dashed #dbeafe",
            padding: "32px",
            boxShadow: "0 16px 32px rgba(15, 23, 42, 0.04)",
          }}
        >
          <h2 style={{ fontSize: "24px", fontWeight: 600 }}>Left column</h2>
          <p style={{ color: "#475569" }}>
            Replace with detailed explanations, copy decks, or feature stories. Use stacked cards, accordions, or media embeds.
          </p>
          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            {["Highlight", "Tip"].map((heading) => (
              <div
                key={heading}
                style={{
                  borderRadius: "18px",
                  backgroundColor: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  padding: "18px",
                }}
              >
                <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "4px", color: "#475569" }}>
                  {heading}
                </h3>
                <p style={{ marginTop: "10px", fontSize: "14px", color: "#475569" }}>
                  Replace with supporting bullet points, FAQs, or previews.
                </p>
              </div>
            ))}
          </div>
        </article>
        <article
          style={{
            display: "grid",
            gap: "18px",
            borderRadius: "24px",
            backgroundColor: "#ffffff",
            border: "1px dashed #dbeafe",
            padding: "32px",
            boxShadow: "0 16px 32px rgba(15, 23, 42, 0.04)",
          }}
        >
          <h2 style={{ fontSize: "24px", fontWeight: 600 }}>Right column</h2>
          <p style={{ color: "#475569" }}>
            Ideal for timelines, quick-start guides, or supporting visuals. Pair with callouts or step-by-step breakdowns.
          </p>
          <div style={{ display: "grid", gap: "12px" }}>
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "flex-start",
                  borderRadius: "18px",
                  backgroundColor: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  padding: "18px",
                }}
              >
                <span
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "9999px",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 8px 16px rgba(15, 23, 42, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                  }}
                >
                  0{step}
                </span>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Step {step}</h3>
                  <p style={{ marginTop: "6px", fontSize: "14px", color: "#475569" }}>
                    Replace with onboarding steps, feature walkthroughs, or upgrade paths.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  </main>
`,
  };
}


function dashboardLayout(pageTitle: string): PlainLayout {
  return {
    helpers: `
  const metrics = [
    {
      label: "Active users",
      value: "18,245",
      delta: "+12% vs last period",
      deltaColor: "#047857",
    },
    {
      label: "MRR growth",
      value: "$124k",
      delta: "+8% vs last period",
      deltaColor: "#047857",
    },
    {
      label: "Churn rate",
      value: "1.8%",
      delta: "-0.4% vs last period",
      deltaColor: "#dc2626",
    },
    {
      label: "NPS score",
      value: "62",
      delta: "+6% vs last period",
      deltaColor: "#047857",
    },
  ];

  const notifications = [
    "New product adoption is up 42% week over week.",
    "18 enterprise leads qualified in the past 72 hours.",
    "Support resolution time dropped to 1.3 hours.",
  ];

  const nextSteps = [
    "Review adoption funnel",
    "Share weekly highlights",
    "Schedule roadmap review",
  ];

  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    padding: "72px 24px",
  };

  const headerStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "center",
  };

  const statGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "18px",
  };

  const statCardStyle = {
    borderRadius: "24px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    padding: "24px",
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.08)",
    display: "grid",
    gap: "12px",
  };

  const focusSectionStyle = {
    borderRadius: "24px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    padding: "24px",
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.08)",
  };

  const listItemStyle = {
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    padding: "18px",
  };
`,
    markup: `
  <main style={pageStyle}>
    <section style={{ maxWidth: "1080px", margin: "0 auto", display: "grid", gap: "32px" }}>
      <header style={headerStyle}>
        <div>
          <p style={{ fontSize: "12px", letterSpacing: "5px", textTransform: "uppercase", color: "#64748b" }}>
            Analytics
          </p>
          <h1 style={{ fontSize: "40px", fontWeight: 600 }}>
            ${pageTitle}
          </h1>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            style={{
              borderRadius: "12px",
              border: "1px solid #cbd5f5",
              backgroundColor: "#ffffff",
              color: "#475569",
              padding: "10px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Download report
          </button>
          <button
            style={{
              borderRadius: "12px",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              padding: "10px 16px",
              fontWeight: 600,
              border: "none",
              boxShadow: "0 18px 30px rgba(15,23,42,0.18)",
              cursor: "pointer",
            }}
          >
            Create snapshot
          </button>
        </div>
      </header>
      <section style={statGridStyle}>
        {metrics.map((stat) => (
          <div key={stat.label} style={statCardStyle}>
            <p style={{ fontSize: "12px", letterSpacing: "4px", textTransform: "uppercase", color: "#64748b" }}>
              {stat.label}
            </p>
            <p style={{ fontSize: "28px", fontWeight: 600 }}>{stat.value}</p>
            <p style={{ fontSize: "12px", color: stat.deltaColor }}>{stat.delta}</p>
          </div>
        ))}
      </section>
      <section
        style={{
          display: "grid",
          gap: "24px",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        <div style={focusSectionStyle}>
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Performance trends</h2>
          <p style={{ marginTop: "12px", fontSize: "14px", color: "#475569" }}>
            Replace with charts, visualizations, or real analytics widgets.
          </p>
          <div
            style={{
              marginTop: "24px",
              height: "240px",
              borderRadius: "18px",
              border: "1px dashed #cbd5f5",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: "14px",
            }}
          >
            Drop in a chart component or embed dashboards here.
          </div>
        </div>
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={focusSectionStyle}>
            <h3 style={{ fontSize: "18px", fontWeight: 600 }}>Notifications</h3>
            <ul style={{ marginTop: "16px", display: "grid", gap: "12px", fontSize: "14px", color: "#475569" }}>
              {notifications.map((item) => (
                <li key={item} style={listItemStyle}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div style={focusSectionStyle}>
            <h3 style={{ fontSize: "18px", fontWeight: 600 }}>Next steps</h3>
            <p style={{ marginTop: "10px", fontSize: "14px", color: "#475569" }}>
              Provide quick actions, crosslinks, or saved views for your team to keep momentum.
            </p>
            <ul style={{ marginTop: "12px", display: "grid", gap: "10px", fontSize: "14px", color: "#475569" }}>
              {nextSteps.map((item) => (
                <li key={item} style={{ borderRadius: "16px", border: "1px solid #e2e8f0", padding: "12px 18px" }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </section>
  </main>
`,
  };
}



function formLayout(pageTitle: string): PlainLayout {
  return {
    helpers: `
  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    padding: "72px 24px",
  };

  const containerStyle = {
    margin: "0 auto",
    maxWidth: "940px",
    display: "grid",
    gap: "32px",
  };

  const badgeStyle = {
    fontSize: "12px",
    letterSpacing: "5px",
    textTransform: "uppercase",
    color: "#64748b",
    borderRadius: "9999px",
    backgroundColor: "#f1f5f9",
    padding: "8px 12px",
    display: "inline-flex",
    fontWeight: 600,
  };

  const listItemStyle = {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    fontSize: "14px",
    color: "#475569",
  };

  const bulletStyle = {
    width: "8px",
    height: "8px",
    backgroundColor: "#34d399",
    borderRadius: "9999px",
    marginTop: "6px",
  };

  const formCardStyle = {
    borderRadius: "24px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.08)",
    padding: "32px",
    maxWidth: "400px",
  };

  const labelStyle = {
    fontSize: "13px",
    fontWeight: 600,
    color: "#0f172a",
  };

  const inputStyle = {
    borderRadius: "14px",
    border: "1px solid #dbeafe",
    backgroundColor: "#ffffff",
    padding: "12px 16px",
    fontSize: "14px",
    color: "#0f172a",
  };
`,
    markup: `
  <main style={pageStyle}>
    <section style={containerStyle}>
      <div style={{ display: "grid", gap: "16px", maxWidth: "520px" }}>
        <span style={badgeStyle}>Early access</span>
        <h1 style={{ fontSize: "40px", fontWeight: 600 }}>
          ${pageTitle}
        </h1>
        <p style={{ fontSize: "18px", lineHeight: 1.6, color: "#475569" }}>
          Pair storytelling with a high-converting signup module. Highlight benefits and social proof alongside the form.
        </p>
        <ul style={{ display: "grid", gap: "12px" }}>
          {["Outline clear value props or onboarding milestones.", "Embed testimonials or usage metrics directly below.", "Swap the card for a multi-step flow if you need advanced forms."].map((item) => (
            <li key={item} style={listItemStyle}>
              <span style={bulletStyle} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div style={formCardStyle}>
        <form style={{ display: "grid", gap: "16px" }}>
          {[
            { label: "Name", placeholder: "Ada Lovelace", type: "text" },
            { label: "Work email", placeholder: "you@team.com", type: "email" },
            { label: "Company", placeholder: "Acme Inc.", type: "text" },
          ].map((field) => (
            <div key={field.label} style={{ display: "grid", gap: "8px" }}>
              <label style={labelStyle}>{field.label}</label>
              <input style={inputStyle} placeholder={field.placeholder} type={field.type} />
            </div>
          ))}
          <div style={{ display: "grid", gap: "8px" }}>
            <label style={labelStyle}>Role</label>
            <select style={{ ...inputStyle, appearance: "none" }}>
              {['Developer', 'Designer', 'Product Manager', 'Founder'].map((option) => (
                <option key={option} value={option} style={{ color: "#0f172a" }}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <button
            style={{
              borderRadius: "14px",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              fontWeight: 600,
              padding: "12px 20px",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 14px 24px rgba(15, 23, 42, 0.18)",
            }}
          >
            Request access
          </button>
          <p style={{ fontSize: "12px", color: "#64748b" }}>
            We’ll reach out within 48 hours. No spam, ever.
          </p>
        </form>
      </div>
    </section>
  </main>
`,
  };
}



function pricingLayout(pageTitle: string): PlainLayout {
  return {
    helpers: `
  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    padding: "72px 24px",
  };

  const tierGridStyle = {
    display: "grid",
    gap: "24px",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  };

  const tierCardStyle = {
    position: "relative",
    display: "grid",
    gap: "18px",
    borderRadius: "24px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    padding: "32px",
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.08)",
  };

  const featureListStyle = {
    display: "grid",
    gap: "10px",
    fontSize: "14px",
    color: "#475569",
  };

  const featureBadgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    borderRadius: "9999px",
    backgroundColor: "#d1fae5",
    color: "#047857",
    fontWeight: 600,
  };
`,
    markup: `
  <main style={pageStyle}>
    <section style={{ maxWidth: "1080px", margin: "0 auto", display: "grid", gap: "32px" }}>
      <header style={{ textAlign: "center", display: "grid", gap: "12px" }}>
        <p style={{ fontSize: "12px", letterSpacing: "5px", textTransform: "uppercase", color: "#64748b" }}>
          Pricing
        </p>
        <h1 style={{ fontSize: "44px", fontWeight: 600 }}>
          ${pageTitle}
        </h1>
        <p style={{ fontSize: "18px", lineHeight: 1.6, color: "#475569" }}>
          Swap in live pricing tiers, feature grids, or usage-based calculators. Each tier card is ready for quick customization.
        </p>
      </header>
      <div style={tierGridStyle}>
        {[
          {
            title: "Starter",
            price: "$29",
            description: "Perfect for individuals and small teams getting started.",
            features: ["Up to 3 projects", "Community support", "Basic analytics"],
          },
          {
            title: "Growth",
            price: "$79",
            description: "Scale collaboration with automation, teams, and insights.",
            features: ["Unlimited projects", "Team workspaces", "Advanced analytics", "Priority support"],
          },
          {
            title: "Enterprise",
            price: "Custom",
            description: "Security, compliance, and dedicated success for large orgs.",
            features: ["Dedicated CSM", "SAML/SSO", "Custom SLAs", "Audit logs"],
          },
        ].map((tier) => (
          <article key={tier.title} style={tierCardStyle}>
            <div style={{ display: "grid", gap: "8px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 600 }}>{tier.title}</h2>
              <p style={{ fontSize: "36px", fontWeight: 600 }}>{tier.price}</p>
              <p style={{ fontSize: "14px", color: "#475569" }}>{tier.description}</p>
            </div>
            <ul style={featureListStyle}>
              {tier.features.map((feature) => (
                <li key={feature} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={featureBadgeStyle}>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              style={{
                marginTop: "auto",
                borderRadius: "12px",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                padding: "10px 16px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 18px 30px rgba(15,23,42,0.18)",
              }}
            >
              Choose plan
            </button>
          </article>
        ))}
      </div>
    </section>
  </main>
`,
  };
}


function sidebarLayout(pageTitle: string): PlainLayout {
  return {
    helpers: `
  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    padding: "72px 24px",
  };

  const layoutStyle = {
    maxWidth: "1080px",
    margin: "0 auto",
    display: "grid",
    gap: "32px",
  };
`,
    markup: `
  <main style={pageStyle}>
    <section style={layoutStyle}>
      <aside
        style={{
          borderRadius: "24px",
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          padding: "24px",
          display: "grid",
          gap: "16px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "5px", color: "#64748b" }}>
            Navigation
          </h2>
          <p style={{ marginTop: "12px", fontSize: "14px", color: "#475569" }}>
            Replace this list with docs navigation, product menus, or onboarding steps.
          </p>
        </div>
        <nav style={{ display: "grid", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
          {["Overview", "Getting started", "Components", "Playbooks", "Guides"].map((item, index) => (
            <a
              key={item}
              style={{
                borderRadius: "12px",
                padding: "12px 16px",
                backgroundColor: index === 0 ? "#f1f5f9" : "transparent",
                border: "1px solid #e2e8f0",
                textDecoration: "none",
                color: "#1e293b",
                display: "flex",
                justifyContent: "space-between",
              }}
              href="#"
            >
              <span>{item}</span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>→</span>
            </a>
          ))}
        </nav>
        <div
          style={{
            borderRadius: "18px",
            border: "1px dashed #cbd5f5",
            backgroundColor: "#f8fafc",
            padding: "18px",
            fontSize: "13px",
            color: "#475569",
          }}
        >
          Tip: swap this for status callouts, product updates, or support links.
        </div>
      </aside>
      <article style={{ display: "grid", gap: "32px" }}>
        <header style={{ display: "grid", gap: "16px" }}>
          <p style={{ fontSize: "12px", letterSpacing: "5px", textTransform: "uppercase", color: "#64748b" }}>
            Knowledge base
          </p>
          <h1 style={{ fontSize: "40px", fontWeight: 600 }}>
            ${pageTitle}
          </h1>
          <p style={{ fontSize: "18px", lineHeight: 1.6, color: "#475569" }}>
            Structure longer-form content with modular sections. Introduce toggles, accordions, or embed media to enrich the page.
          </p>
        </header>
        <section
          style={{
            display: "grid",
            gap: "18px",
            borderRadius: "24px",
            backgroundColor: "#ffffff",
            border: "1px dashed #dbeafe",
            padding: "32px",
            boxShadow: "0 18px 28px rgba(15,23,42,0.04)",
          }}
        >
          <h2 style={{ fontSize: "24px", fontWeight: 600 }}>Section headline</h2>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Replace with your documentation or feature explanations. Pair with inline alerts, code examples, or image callouts as needed.
          </p>
          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {["Use cases", "Resources"].map((heading) => (
              <div
                key={heading}
                style={{
                  borderRadius: "18px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "18px",
                }}
              >
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{heading}</h3>
                <p style={{ marginTop: "10px", fontSize: "13px", color: "#475569" }}>
                  Replace with supporting links, references, or examples.
                </p>
              </div>
            ))}
          </div>
        </section>
        <section
          style={{
            borderRadius: "24px",
            backgroundColor: "#ffffff",
            border: "1px dashed #dbeafe",
            padding: "28px",
            boxShadow: "0 18px 28px rgba(15,23,42,0.04)",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 600 }}>Call to action</h2>
          <p style={{ marginTop: "10px", fontSize: "14px", color: "#475569" }}>
            Encourage next steps—book demos, contact support, or explore adjacent docs.
          </p>
        </section>
      </article>
    </section>
  </main>
`,
  };
}

function docsLayout(pageTitle: string): PlainLayout {
  return {
    helpers: `
  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    padding: "72px 24px",
  };

  const layoutStyle = {
    margin: "0 auto",
    maxWidth: "1100px",
    display: "grid",
    gap: "32px",
  };
`,
    markup: `
  <main style={pageStyle}>
    <section style={layoutStyle}>
      <aside
        style={{
          display: "none",
        }}
      >
        {/* Replace with doc navigation on desktop if desired */}
      </aside>
      <article style={{ display: "grid", gap: "32px" }}>
        <header style={{ display: "grid", gap: "16px" }}>
          <p style={{ fontSize: "12px", letterSpacing: "5px", textTransform: "uppercase", color: "#64748b" }}>
            Documentation
          </p>
          <h1 style={{ fontSize: "40px", fontWeight: 600 }}>
            ${pageTitle}
          </h1>
          <p style={{ fontSize: "18px", lineHeight: 1.6, color: "#475569" }}>
            Kick off a long-form documentation page. Swap in alerts, code snippets, callouts, or diff views anywhere in the content column.
          </p>
        </header>
        <section
          style={{
            borderRadius: "24px",
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            padding: "32px",
            boxShadow: "0 20px 40px rgba(15,23,42,0.05)",
            display: "grid",
            gap: "20px",
          }}
        >
          <h2 style={{ fontSize: "24px", fontWeight: 600 }}>Concept overview</h2>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Explain the concept in detail. Add inline code, admonitions, or embed interactive demos.
          </p>
          <pre
            style={{
              backgroundColor: "#0f172a",
              color: "#e2e8f0",
              borderRadius: "20px",
              padding: "24px",
              fontSize: "13px",
              overflowX: "auto",
            }}
          >
            <code>// Replace with real code samples or snippets here.</code>
          </pre>
          <div
            style={{
              borderRadius: "18px",
              backgroundColor: "#f8fafc",
              border: "1px dashed #cbd5f5",
              padding: "18px",
              fontSize: "14px",
              color: "#475569",
            }}
          >
            Highlight migration notes, gotchas, or upgrade paths in this callout.
          </div>
        </section>
        <section
          style={{
            borderRadius: "24px",
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            padding: "28px",
            boxShadow: "0 20px 40px rgba(15,23,42,0.05)",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 600 }}>Next steps</h2>
          <p style={{ marginTop: "10px", fontSize: "14px", color: "#475569" }}>
            Link out to deeper guides, video walkthroughs, or related topics to keep readers moving.
          </p>
        </section>
      </article>
    </section>
  </main>
`,
  };
}
