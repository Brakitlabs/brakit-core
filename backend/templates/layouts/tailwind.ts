import type { LayoutId, TemplateContext } from "../types";
import { generateFormCode, getFormSpec } from "../../services/shared/formSpecs";
import { tokenService } from "../../services/shared/tokens";

// Helper to get fresh tokens per render (so edits are reflected)
const getTokens = () => tokenService.getResolvedTokens();

export interface TailwindLayout {
  body: string;
  imports?: string[];
  hoistedCode?: string[];
  setupCode?: string[];
  shadcnComponents?: string[];
  requiresFormDependencies?: boolean;
}

export function renderTailwindLayout(
  layout: LayoutId,
  ctx: TemplateContext
): TailwindLayout {
  switch (layout) {
    case "hero":
      return heroLayout(ctx);
    case "twoColumn":
      return twoColumnLayout(ctx);
    case "contentSplit":
      return contentSplitLayout(ctx);
    case "dashboard":
      return dashboardLayout(ctx);
    case "form":
      return formLayout(ctx);
    case "pricing":
      return pricingLayout(ctx);
    case "sidebarLeft":
      return sidebarLayout(ctx);
    case "docs":
      return docsLayout(ctx);
    case "blank":
    default:
      return blankLayout(ctx);
  }
}

function blankLayout(ctx: TemplateContext): TailwindLayout {
  const tokens = getTokens();
  return {
    body: `
<main
  data-brakit-canvas-root="canvas"
  className="relative min-h-screen ${tokens.color["surface-alt"]}"
>
</main>
`.trim(),
  };
}

function heroLayout(ctx: TemplateContext): TailwindLayout {
  const pageTitle = ctx.pageName || "Untitled page";
  const highlightStats = [
    { label: "Average satisfaction", value: "4.9/5" },
    { label: "Growth YoY", value: "+120%" },
    { label: "Teams onboarded", value: "32k" },
  ];

  const tokens = getTokens();

  return {
    body: `
<main data-brakit-canvas-root="canvas" className="relative min-h-screen ${tokens.color["surface-alt"]}">
  <header data-section="header" className="${tokens.layout.content} ${tokens.spacing["section-x"]} ${tokens.spacing["section-y"]} text-center">
    <p className="${tokens.typography.label} ${tokens.color["text-muted"]}">
      Launch update
    </p>
    <h1 className="mt-4 ${tokens.typography.h1} ${tokens.color["text-main"]} sm:text-5xl">${pageTitle}</h1>
    <p className="mt-4 text-lg ${tokens.color["text-muted"]}">
      Introduce a new product line, feature, or campaign with plenty of room for supporting copy.
    </p>
  </header>

  <section data-section="hero" className="${tokens.layout.content} ${tokens.spacing["section-x"]} grid ${tokens.spacing["space-lg"]} pb-12 lg:grid-cols-[2fr_1fr]">
    <div className="space-y-6 ${tokens.radius.default} border ${tokens.color["border-subtle"]} ${tokens.color.surface} ${tokens.spacing["space-lg"]} ${tokens.shadow.default}">
      <h2 className="${tokens.typography.h2} ${tokens.color["text-main"]}">Lead with clarity</h2>
      <p className="${tokens.color["text-muted"]}">
        Pin the key narrative here. Swap this copy for onboarding checklists, product visuals, or customer wins.
      </p>
      <ul className="space-y-3 ${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
        <li className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 rounded-full ${tokens.color["text-main"]}"></span>
          Pair strong messaging with a supporting feature grid or testimonial rail.
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 rounded-full ${tokens.color["text-main"]}"></span>
          Add imagery, charts, or embeds directly inside this section.
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 rounded-full ${tokens.color["text-main"]}"></span>
          Keep your CTA above the fold for faster conversions.
        </li>
      </ul>
    </div>
    <div className="space-y-4">
      <div className="${tokens.radius.default} border ${tokens.color["border-subtle"]} ${tokens.color.surface} ${tokens.shadow.default} p-6">
        <p className="${tokens.typography.label} ${tokens.color["text-muted"]}">
          Feature grid
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          ${highlightStats
            .map(
              (stat) => `
          <div className="rounded-2xl border ${tokens.color["border-subtle"]} ${tokens.color.surface} p-4">
            <p className="${tokens.typography.h2}">${stat.value}</p>
            <p className="${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">${stat.label}</p>
          </div>`
            )
            .join("")}
        </div>
      </div>
      <div className="${tokens.radius.default} border border-dashed ${tokens.color["border-subtle"]} ${tokens.color.surface} p-6 ${tokens.shadow.default}">
        <h3 className="text-base font-semibold ${tokens.color["text-main"]}">Secondary story</h3>
        <p className="mt-2 ${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
          Link to patch notes, documentation, or another supporting section.
        </p>
      </div>
    </div>
  </section>

  <section data-section="cta" className="${tokens.layout.content} ${tokens.spacing["section-x"]} pb-12">
    <div className="flex flex-col gap-4 ${tokens.radius.default} border ${tokens.color["border-subtle"]} ${tokens.color.surface} ${tokens.spacing["space-lg"]} ${tokens.shadow.default} sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-xl font-semibold">Ship with confidence</h3>
        <p className="${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
          Keep your hero CTA tight, with a supporting secondary action.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a className="inline-flex items-center justify-center ${tokens.radius.default} ${tokens.color.primary} px-6 py-3 ${tokens.typography["body-sm"]} font-semibold ${tokens.shadow.default} transition hover:-translate-y-0.5 hover:${tokens.shadow.hover}" href="#">
          Get started
        </a>
        <a className="inline-flex items-center justify-center ${tokens.radius.default} border ${tokens.color["border-subtle"]} px-6 py-3 ${tokens.typography["body-sm"]} font-semibold ${tokens.color["text-main"]} transition hover:${tokens.color["border-subtle"]} hover:${tokens.color["surface-alt"]}" href="#">
          View docs
        </a>
      </div>
    </div>
  </section>

  <footer data-section="footer" className="${tokens.layout.content} ${tokens.spacing["section-x"]} border-t ${tokens.color["border-subtle"]} py-10 text-center ${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
    Built with Tailwind + Brakit
  </footer>
</main>
`.trim(),
  };
}

function twoColumnLayout(ctx: TemplateContext): TailwindLayout {
  const pageTitle = ctx.pageName || "Untitled page";
  const quickLinks = ["Download brief", "Roadmap", "Changelog"];
  const tokens = getTokens();

  return {
    body: `
<main data-brakit-canvas-root="canvas" className="relative min-h-screen ${tokens.color["surface-alt"]}">
  <header data-section="header" className="${tokens.layout.content} ${tokens.spacing["section-x"]} ${tokens.spacing["section-y"]}">
    <p className="${tokens.typography.label} ${tokens.color["text-muted"]}">
      Two column layout
    </p>
    <h1 className="mt-4 ${tokens.typography.h1} ${tokens.color["text-main"]}">${pageTitle}</h1>
    <p className="mt-4 ${tokens.typography.body} ${tokens.color["text-muted"]}">
      Tell a story on the left while keeping supporting actions and summaries on the right.
    </p>
  </header>

  <section data-section="split" className="${tokens.layout.content} ${tokens.spacing["section-x"]} grid ${tokens.spacing["space-lg"]} pb-12 lg:grid-cols-[2fr_1fr]">
    <article className="space-y-8 ${tokens.radius.default} border ${tokens.color["border-subtle"]} ${tokens.color.surface} ${tokens.spacing["space-lg"]} ${tokens.shadow.default}">
      <h2 className="${tokens.typography.h2} ${tokens.color["text-main"]}">Primary content</h2>
      <p className="${tokens.typography.body} ${tokens.color["text-muted"]}">
        Swap this block for long-form copy, product updates, or educational content. Drop in media, tables, or feature callouts.
      </p>
      <div className="grid gap-6 ${tokens.radius.default} border border-dashed ${tokens.color["border-subtle"]} ${tokens.color["primary-soft"]} p-6 sm:grid-cols-2">
        <div>
          <h3 className="${tokens.typography.h3} ${tokens.color["text-main"]}">Use cases</h3>
          <p className="mt-2 ${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
            Perfect for launch notes, changelog entries, or customer success stories.
          </p>
        </div>
        <div>
          <h3 className="${tokens.typography.h3} ${tokens.color["text-main"]}">Drop-ins</h3>
          <p className="mt-2 ${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
            Embed charts, quotes, or code blocks—spacing is already tuned for readability.
          </p>
        </div>
      </div>
    </article>
    <aside className="space-y-6">
      <div className="${tokens.radius.default} border ${tokens.color["border-subtle"]} ${tokens.color.surface} ${tokens.spacing["space-lg"]} ${tokens.shadow.default}">
        <h3 className="${tokens.typography.label} ${tokens.color["text-muted"]}">
          Sidebar
        </h3>
        <p className="mt-3 ${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
          Pair summaries, quick actions, or related resources with the main narrative.
        </p>
        <div className="mt-5 grid gap-3">
          ${quickLinks
            .map(
              (link) => `
          <a className="${tokens.radius.default} border ${tokens.color["border-subtle"]} px-4 py-3 ${tokens.typography["body-sm"]} font-semibold ${tokens.color["text-main"]} transition hover:-translate-y-0.5 hover:${tokens.shadow.hover}" href="#">
            ${link}
          </a>`
            )
            .join("")}
        </div>
      </div>
      <div className="${tokens.radius.default} border ${tokens.color["border-subtle"]} ${tokens.color["primary-soft"]} ${tokens.spacing["space-lg"]}">
        <h4 className="${tokens.typography.h3} ${tokens.color["text-main"]}">Sticky ideas</h4>
        <p className="mt-2 ${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
          Replace this with a contact module, newsletter signup, or anchor navigation.
        </p>
      </div>
    </aside>
  </section>

  <section data-section="cta" className="${tokens.layout.content} ${tokens.spacing["section-x"]} pb-12">
    <div className="flex flex-col gap-4 ${tokens.radius.default} border ${tokens.color["border-subtle"]} ${tokens.color.surface} ${tokens.spacing["space-lg"]} ${tokens.shadow.default} lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h3 className="${tokens.typography.h2} ${tokens.color["text-main"]}">Ready for a CTA?</h3>
        <p className="${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
          Use this row for bottom-of-page actions or links to documentation.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a className="inline-flex items-center justify-center ${tokens.radius.default} ${tokens.color.primary} px-5 py-3 ${tokens.typography["body-sm"]} font-semibold text-white ${tokens.shadow.default} transition hover:-translate-y-0.5 hover:${tokens.shadow.hover}" href="#">
          Primary action
        </a>
        <a className="inline-flex items-center justify-center ${tokens.radius.default} border ${tokens.color["border-subtle"]} px-5 py-3 ${tokens.typography["body-sm"]} font-semibold ${tokens.color["text-main"]} transition hover:${tokens.color["surface-alt"]}" href="#">
          Secondary
        </a>
      </div>
    </div>
  </section>

  <footer data-section="footer" className="border-t ${tokens.color["border-subtle"]} ${tokens.spacing["section-x"]} py-10 text-center ${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
    Footer content or legal copy lives here.
  </footer>
</main>
`.trim(),
  };
}

function contentSplitLayout(ctx: TemplateContext): TailwindLayout {
  const pageTitle = ctx.pageName || "Untitled page";
  const steps = [
    "Kickoff with context so readers know what to expect.",
    "Showcase supporting detail, charts, or timelines.",
    "Close with a takeaway or next step.",
  ];
  const tokens = getTokens();

  return {
    body: `
<main data-brakit-canvas-root="canvas" className="relative min-h-screen ${tokens.color["surface-alt"]}">
  <header data-section="header" className="${tokens.layout.content} ${tokens.spacing["section-x"]} ${tokens.spacing["section-y"]} text-center">
    <p className="${tokens.typography.label} ${tokens.color["text-muted"]}">
      Split content
    </p>
    <h1 className="mt-4 ${tokens.typography.h1} ${tokens.color["text-main"]} sm:text-5xl">${pageTitle}</h1>
    <p className="mt-4 ${tokens.typography.body} ${tokens.color["text-muted"]}">
      Compare two ideas, show dual messaging, or pair copy with imagery side by side.
    </p>
  </header>

  <section data-section="contentSplit" className="${tokens.layout.content} ${tokens.spacing["section-x"]} grid ${tokens.spacing["space-lg"]} pb-12 lg:grid-cols-2">
    <article className="space-y-6 ${tokens.radius.default} border ${tokens.color["border-subtle"]} ${tokens.color.surface} ${tokens.spacing["space-lg"]} ${tokens.shadow.default}">
      <h2 className="${tokens.typography.h2} ${tokens.color["text-main"]}">Left column</h2>
      <p className="${tokens.typography.body} ${tokens.color["text-muted"]}">
        Replace with feature descriptions, product pillars, or long-form copy. The card grid is perfect for highlights.
      </p>
      <div className="grid ${tokens.spacing["space-lg"]} md:grid-cols-2">
        <div className="rounded-2xl border ${tokens.color["border-subtle"]} ${tokens.color["primary-soft"]} p-5">
          <h3 className="${tokens.typography.label} ${tokens.color["text-muted"]}">
            Highlight
          </h3>
          <p className="mt-2 ${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
            Call out wins, product differentiators, or upcoming milestones.
          </p>
        </div>
        <div className="rounded-2xl border ${tokens.color["border-subtle"]} ${tokens.color["primary-soft"]} p-5">
          <h3 className="${tokens.typography.label} ${tokens.color["text-muted"]}">
            Tip
          </h3>
          <p className="mt-2 ${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
            Swap for metrics, testimonials, or embedded media.
          </p>
        </div>
      </div>
    </article>
    <article className="space-y-6 ${tokens.radius.default} border ${tokens.color["border-subtle"]} ${tokens.color.surface} ${tokens.spacing["space-lg"]} ${tokens.shadow.default}">
      <h2 className="${tokens.typography.h2} ${tokens.color["text-main"]}">Right column</h2>
      <p className="${tokens.typography.body} ${tokens.color["text-muted"]}">
        Ideal for timelines, how-to steps, or supporting visuals. Keep each step tight for fast scanning.
      </p>
      <div className="space-y-4">
        ${steps
          .map(
            (copy, index) => `
        <div className="flex items-start ${tokens.spacing["space-lg"]} rounded-2xl border ${tokens.color["border-subtle"]} ${tokens.color["primary-soft"]} p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full ${tokens.color.surface} text-sm font-semibold ${tokens.color["text-main"]} ${tokens.shadow.default}">
            0${index + 1}
          </span>
          <div>
            <h3 className="${tokens.typography.h3} ${tokens.color["text-main"]}">Step ${index + 1}</h3>
            <p className="mt-1 ${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
              ${copy}
            </p>
          </div>
        </div>`
          )
          .join("")}
      </div>
    </article>
  </section>

  <section data-section="cta" className="${tokens.layout.content} ${tokens.spacing["section-x"]} pb-12">
    <div className="rounded-3xl border ${tokens.color["border-subtle"]} ${tokens.color.surface} ${tokens.spacing["space-lg"]} text-center ${tokens.shadow.default}">
      <p className="${tokens.typography.label} ${tokens.color["text-muted"]}">
        CTA
      </p>
      <h3 className="mt-2 ${tokens.typography.h2} ${tokens.color["text-main"]}">Add a final action</h3>
      <p className="mt-2 ${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
        Use this row for downloads, demos, or contact modules once readers finish the split content.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a className="inline-flex items-center justify-center ${tokens.radius.default} ${tokens.color.primary} px-5 py-3 ${tokens.typography["body-sm"]} font-semibold text-white ${tokens.shadow.default} transition hover:-translate-y-0.5 hover:${tokens.shadow.hover}" href="#">
          Talk to sales
        </a>
        <a className="inline-flex items-center justify-center ${tokens.radius.default} border ${tokens.color["border-subtle"]} px-5 py-3 ${tokens.typography["body-sm"]} font-semibold ${tokens.color["text-main"]} transition hover:${tokens.color["surface-alt"]}" href="#">
          Explore docs
        </a>
      </div>
    </div>
  </section>

  <footer data-section="footer" className="${tokens.layout.content} ${tokens.spacing["section-x"]} border-t ${tokens.color["border-subtle"]} py-10 text-center ${tokens.typography["body-sm"]} ${tokens.color["text-muted"]}">
    Footer content or legal copy lives here.
  </footer>
</main>
`.trim(),
  };
}

function dashboardLayout(ctx: TemplateContext): TailwindLayout {
  const pageTitle = ctx.pageName || "Untitled page";
  const tokens = getTokens();
  const c = tokens.color;
  const t = tokens.typography;
  const s = tokens.spacing;
  const r = tokens.radius;
  const sh = tokens.shadow;
  const l = tokens.layout;
  const raw = tokenService.getRawTokens();
  const textColor = (key: keyof typeof raw.color) =>
    `text-[${raw.color[key].$value.replace(/\s+/g, "_")}]`;
  const metrics = [
    {
      label: "Active users",
      value: "18,245",
      delta: "+12% vs last period",
      deltaColor: textColor("success"),
    },
    {
      label: "MRR growth",
      value: "$124k",
      delta: "+8% vs last period",
      deltaColor: textColor("success"),
    },
    {
      label: "Churn rate",
      value: "1.8%",
      delta: "-0.4% vs last period",
      deltaColor: textColor("danger"),
    },
    {
      label: "NPS score",
      value: "62",
      delta: "+6% vs last period",
      deltaColor: textColor("success"),
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

  return {
    body: `
<main data-brakit-canvas-root="canvas" className="relative min-h-screen ${c["surface-alt"]}">
  <header data-section="header" className="${l.content} ${s["section-x"]} flex flex-col gap-6 ${s["section-y"]} sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="${t.label} ${c["text-muted"]} uppercase tracking-[0.25em]">
        Analytics
      </p>
      <h1 className="mt-3 ${t.h1} ${c["text-main"]}">${pageTitle}</h1>
    </div>
    <div className="flex gap-3">
      <button className="${r.default} border ${c["border-subtle"]} ${c.surface} px-4 py-2 ${t["body-sm"]} font-semibold ${c["text-main"]} ${sh.default} transition hover:-translate-y-0.5">
        Download report
      </button>
      <button className="${r.default} ${c.primary} px-4 py-2 ${t["body-sm"]} font-semibold text-white ${sh.default} transition hover:-translate-y-0.5">
        Create snapshot
      </button>
    </div>
  </header>

  <section data-section="hero" className="${l.content} ${s["section-x"]} pb-10">
    <div className="${r.default} border ${c["border-subtle"]} ${c.surface} p-8 ${sh.default}">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="${t.label} ${c["text-muted"]} uppercase tracking-[0.3em]">
            Weekly summary
          </p>
          <h2 className="mt-2 ${t.h2} ${c["text-main"]}">Momentum keeps climbing</h2>
        </div>
        <span className="${r.pill} ${c.surface} px-4 py-2 ${t["body-sm"]} font-semibold ${c.success} ${sh.default}">
          +18% WoW
        </span>
      </div>
      <p className="mt-4 ${t["body-sm"]} ${c["text-muted"]}">
        Drop in snapshot copy, embed saved views, or link out to detailed dashboards.
      </p>
    </div>
  </section>

  <section data-section="stats" className="${l.content} ${s["section-x"]} grid gap-6 pb-12 sm:grid-cols-2 lg:grid-cols-4">
    ${metrics
      .map(
        (metric) => `
    <div className="${r.default} border ${c["border-subtle"]} ${c.surface} p-6 ${sh.default}">
      <p className="${t.label} ${c["text-muted"]} uppercase tracking-[0.25em]">${metric.label}</p>
      <p className="mt-3 ${t.h2} ${c["text-main"]}">${metric.value}</p>
      <p className="mt-2 ${t["body-sm"]} font-medium ${metric.deltaColor}">${metric.delta}</p>
    </div>`
      )
      .join("")}
  </section>

  <section data-section="featureGrid" className="${l.content} ${s["section-x"]} grid gap-6 pb-12 lg:grid-cols-[2fr_1fr]">
    <div className="space-y-6 ${r.default} border ${c["border-subtle"]} ${c.surface} p-8 ${sh.default}">
      <div className="flex items-center justify-between">
        <h3 className="${t.h3} ${c["text-main"]}">Highlights</h3>
        <span className="${t.label} ${c["text-muted"]} uppercase tracking-[0.2em]">
          Snapshot
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="${r.default} border ${c.success} ${c["primary-soft"]} p-5">
          <p className="${t.h2} ${c.success}">+28%</p>
          <p className="mt-2 ${t["body-sm"]} ${c.success}">Feature adoption</p>
          <p className="mt-1 ${t["body-sm"]} ${c.success}">vs last week</p>
        </div>
        <div className="${r.default} border ${c["border-subtle"]} ${c["surface-alt"]} p-5">
          <p className="${t.h2} ${c["text-main"]}">3.2 hrs</p>
          <p className="mt-2 ${t["body-sm"]} ${c["text-muted"]}">Avg. resolution</p>
          <p className="mt-1 ${t["body-sm"]} ${c["text-muted"]}">down 14%</p>
        </div>
      </div>
      <div className="space-y-3 ${r.default} border border-dashed ${c["border-subtle"]} ${c["surface-alt"]} p-4">
        ${notifications
          .map(
            (note) => `
        <p className="${t["body-sm"]} ${c["text-muted"]}">
          ${note}
        </p>`
          )
          .join("")}
      </div>
    </div>
    <div className="space-y-4 ${r.default} border ${c["border-subtle"]} ${c.surface} p-8 ${sh.default}">
      <div className="flex items-center justify-between">
        <h3 className="${t.h3} ${c["text-main"]}">Next steps</h3>
        <span className="${t.label} ${c["text-muted"]} uppercase tracking-[0.25em]">
          Actions
        </span>
      </div>
      <p className="${t["body-sm"]} ${c["text-muted"]}">
        Provide jump links, quick filters, or saved queries here.
      </p>
      <ul className="mt-3 space-y-2 ${t["body-sm"]} ${c["text-muted"]}">
        ${nextSteps
          .map(
            (item) => `
        <li className="${r.default} border ${c["border-subtle"]} ${c.surface} px-4 py-3">
          ${item}
        </li>`
          )
          .join("")}
      </ul>
    </div>
  </section>

  <footer data-section="footer" className="border-t ${c["border-subtle"]} ${s["section-x"]} py-10 text-center ${t["body-sm"]} ${c["text-muted"]}">
    Tie this layout to live data sources to keep teams aligned.
  </footer>
</main>
`.trim(),
  };
}

function formLayout(ctx: TemplateContext): TailwindLayout {
  const pageTitle = ctx.pageName || "Untitled page";
  const tokens = getTokens();
  const c = tokens.color;
  const t = tokens.typography;
  const s = tokens.spacing;
  const r = tokens.radius;
  const sh = tokens.shadow;
  const l = tokens.layout;
  const faqs = [
    {
      question: "How quickly will I hear back?",
      answer: "Most requests receive a reply within one business day.",
    },
    {
      question: "Do you offer a trial?",
      answer: "Yes — swap this copy to detail your onboarding process.",
    },
    {
      question: "Can I customize the flow?",
      answer: "Absolutely. Tailwind + shadcn form controls make it easy.",
    },
  ];
  const signupForm = buildSignupForm(ctx);

  return {
    body: `
<main data-brakit-canvas-root="canvas" className="relative min-h-screen ${c["surface-alt"]}">
  <header data-section="header" className="${l.content} ${s["section-x"]} ${s["section-y"]} text-center">
    <p className="${t.label} ${c["text-muted"]} uppercase tracking-[0.35em]">
      Signup
    </p>
    <h1 className="mt-4 ${t.h1} ${c["text-main"]}">${pageTitle}</h1>
    <p className="mt-4 ${t.body} ${c["text-muted"]}">
      Pair a modern hero with a high-converting signup form. All inputs are wired up with zod + react-hook-form.
    </p>
  </header>

  <section data-section="split" className="${l.content} ${s["section-x"]} flex flex-col gap-10 pb-12 lg:flex-row">
    <div className="space-y-6 ${r.default} border ${c["border-subtle"]} ${c.surface} ${s["space-lg"]} ${sh.default} lg:w-3/5">
      <p className="${t.label} ${c["text-muted"]} uppercase tracking-[0.35em]">
        Why join?
      </p>
      <ul className="space-y-4 ${t["body-sm"]} ${c["text-muted"]}">
        <li className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 rounded-full ${c.success}"></span>
          Outline value props, onboarding milestones, or social proof.
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 rounded-full ${c.success}"></span>
          Embed testimonials, logos, or badges below the list.
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 rounded-full ${c.success}"></span>
          Swap the form card for multi-step flows when needed.
        </li>
      </ul>
    </div>
    <div className="w-full ${r.default} border ${c["border-subtle"]} ${c.surface} ${s["space-lg"]} ${sh.default} lg:w-2/5">
      ${signupForm.markup}
    </div>
  </section>

  <section data-section="faq" className="${l.content} ${s["section-x"]} pb-12">
    <div className="${r.default} border ${c["border-subtle"]} ${c.surface} ${s["space-lg"]} ${sh.default}">
      <h3 className="${t.h2} ${c["text-main"]}">Frequently asked</h3>
      <dl className="mt-6 space-y-4">
        ${faqs
          .map(
            (item) => `
        <div className="${r.default} border ${c["border-subtle"]} ${c["surface-alt"]} p-4">
          <dt className="${t["body-sm"]} font-semibold ${c["text-main"]}">${item.question}</dt>
          <dd className="mt-1 ${t["body-sm"]} ${c["text-muted"]}">${item.answer}</dd>
        </div>`
          )
          .join("")}
      </dl>
    </div>
  </section>

  <footer data-section="footer" className="border-t ${c["border-subtle"]} ${s["section-x"]} py-10 text-center ${t["body-sm"]} ${c["text-muted"]}">
    Footer text or compliance copy lives here.
  </footer>
</main>
`.trim(),
    imports: signupForm.imports,
    hoistedCode: signupForm.hoistedCode,
    setupCode: signupForm.setupCode,
    shadcnComponents: ["form", "button", "input", "checkbox"],
    requiresFormDependencies: true,
  };
}

function pricingLayout(ctx: TemplateContext): TailwindLayout {
  const pageTitle = ctx.pageName || "Untitled page";
  const tokens = getTokens();
  const c = tokens.color;
  const t = tokens.typography;
  const s = tokens.spacing;
  const r = tokens.radius;
  const sh = tokens.shadow;
  const l = tokens.layout;
  const tiers = [
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
      features: [
        "Unlimited projects",
        "Team workspaces",
        "Advanced analytics",
        "Priority support",
      ],
    },
    {
      title: "Enterprise",
      price: "Custom",
      description:
        "Security, compliance, and dedicated success for large orgs.",
      features: ["Dedicated CSM", "SAML/SSO", "Custom SLAs", "Audit logs"],
    },
  ];
  const testimonials = [
    {
      quote: "We launched on the Growth plan and shipped twice as fast.",
      author: "Leslie Alexander, Product",
    },
    {
      quote: "Enterprise support gave us confidence to migrate in a week.",
      author: "Devon Lane, CTO",
    },
  ];

  return {
    body: `
<main data-brakit-canvas-root="canvas" className="relative min-h-screen ${c["surface-alt"]}">
  <header data-section="header" className="${l.content} ${s["section-x"]} ${s["section-y"]} text-center">
    <p className="${t.label} ${c["text-muted"]} uppercase tracking-[0.35em]">
      Pricing
    </p>
    <h1 className="mt-4 ${t.h1} ${c["text-main"]}">${pageTitle}</h1>
    <p className="mt-4 ${t.body} ${c["text-muted"]}">
      Swap in live pricing tiers, feature grids, or usage-based calculators. Each card is ready to hook into your billing data.
    </p>
  </header>

  <section data-section="hero" className="${l.content} ${s["section-x"]} pb-10">
    <div className="${r.default} border ${c["border-subtle"]} ${c.surface} p-8 text-center ${sh.default}">
      <h2 className="${t.h2} ${c["text-main"]}">Transparent pricing for every stage</h2>
      <p className="mt-3 ${t["body-sm"]} ${c["text-muted"]}">
        Mention billing cadence, usage tiers, or your money-back guarantee here.
      </p>
    </div>
  </section>

  <section data-section="pricing" className="${l.content} ${s["section-x"]} grid gap-8 pb-12 lg:grid-cols-3">
    ${tiers
      .map(
        (tier) => `
    <article className="relative flex flex-col ${r.default} border ${c["border-subtle"]} ${c.surface} p-8 ${sh.default}">
      <div className="space-y-3">
        <h3 className="${t.h3} ${c["text-main"]}">${tier.title}</h3>
        <p className="${t.h2} ${c["text-main"]}">${tier.price}</p>
        <p className="${t["body-sm"]} ${c["text-muted"]}">${tier.description}</p>
      </div>
      <ul className="mt-6 space-y-2 ${t["body-sm"]} ${c["text-muted"]}">
        ${tier.features
          .map(
            (feature) => `
        <li className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center ${r.pill} ${c["primary-soft"]} ${t["body-sm"]} font-semibold ${c["text-main"]}">
            ✓
          </span>
          ${feature}
        </li>`
          )
          .join("")}
      </ul>
      <button className="mt-auto ${r.default} ${c.primary} px-4 py-2 ${t["body-sm"]} font-semibold text-white ${sh.default} transition hover:-translate-y-0.5">
        Choose plan
      </button>
    </article>`
      )
      .join("")}
  </section>

  <section data-section="testimonials" className="${l.content} ${s["section-x"]} grid gap-6 pb-12 md:grid-cols-2">
    ${testimonials
      .map(
        (item) => `
    <article className="${r.default} border ${c["border-subtle"]} ${c.surface} p-6 ${sh.default}">
      <p className="${t["body-sm"]} italic ${c["text-main"]}">“${item.quote}”</p>
      <p className="mt-4 ${t.label} ${c["text-muted"]} uppercase tracking-[0.3em]">
        ${item.author}
      </p>
    </article>`
      )
      .join("")}
  </section>

  <section data-section="cta" className="${l.content} ${s["section-x"]} pb-12">
    <div className="${r.default} border ${c["border-subtle"]} ${c.surface} p-8 text-center ${sh.default}">
      <h3 className="${t.h2} ${c["text-main"]}">Need enterprise?</h3>
      <p className="mt-2 ${t["body-sm"]} ${c["text-muted"]}">
        Outline custom pricing workflows, procurement steps, or solution engineering support.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a className="inline-flex items-center justify-center ${r.default} ${c.primary} px-5 py-3 ${t["body-sm"]} font-semibold text-white ${sh.default} transition hover:-translate-y-0.5" href="#">
          Talk to sales
        </a>
        <a className="inline-flex items-center justify-center ${r.default} border ${c["border-subtle"]} px-5 py-3 ${t["body-sm"]} font-semibold ${c["text-main"]} transition hover:-translate-y-0.5" href="#">
          Download overview
        </a>
      </div>
    </div>
  </section>

  <footer data-section="footer" className="border-t ${c["border-subtle"]} ${s["section-x"]} py-10 text-center ${t["body-sm"]} ${c["text-muted"]}">
    Note VAT/tax requirements or billing support contacts here.
  </footer>
</main>
`.trim(),
  };
}

function sidebarLayout(ctx: TemplateContext): TailwindLayout {
  const pageTitle = ctx.pageName || "Untitled page";
  const tokens = getTokens();
  const c = tokens.color;
  const t = tokens.typography;
  const s = tokens.spacing;
  const r = tokens.radius;
  const sh = tokens.shadow;
  const l = tokens.layout;
  const navItems = [
    "Overview",
    "Getting started",
    "Components",
    "Playbooks",
    "Guides",
  ];

  return {
    body: `
<main data-brakit-canvas-root="canvas" className="relative min-h-screen ${c["surface-alt"]}">
  <header data-section="header" className="${l.content} ${s["section-x"]} ${s["section-y"]} text-center">
    <p className="${t.label} ${c["text-muted"]} uppercase tracking-[0.35em]">
      Navigation layout
    </p>
    <h1 className="mt-4 ${t.h1} ${c["text-main"]}">${pageTitle}</h1>
    <p className="mt-4 ${t.body} ${c["text-muted"]}">
      Ideal for docs, onboarding, or wikis. Keep navigation pinned while content scrolls on the right.
    </p>
  </header>

  <section data-section="split" className="${l.content} ${s["section-x"]} grid gap-10 pb-12 lg:grid-cols-[260px_minmax(0,1fr)]">
    <aside className="space-y-6 ${r.default} border ${c["border-subtle"]} ${c.surface} ${s["space-lg"]} ${sh.default}">
      <div>
        <h2 className="${t.label} ${c["text-muted"]} uppercase tracking-[0.35em]">
          Navigation
        </h2>
        <p className="mt-2 ${t["body-sm"]} ${c["text-muted"]}">
          Swap this list for docs nav, product menus, or onboarding steps.
        </p>
      </div>
      <nav className="space-y-2 ${t["body-sm"]} font-semibold ${c["text-main"]}">
        ${navItems
          .map(
            (item, index) => `
        <a className="flex items-center justify-between ${r.default} px-4 py-3 transition ${c["surface-alt"]} ${index === 0 ? c["surface-alt"] : c.surface} hover:${c["surface-alt"]}" href="#">
          <span>${item}</span>
          <span className="${t["body-sm"]} ${c["text-muted"]}">→</span>
        </a>`
          )
          .join("")}
      </nav>
      <div className="${r.default} border border-dashed ${c["border-subtle"]} ${c["surface-alt"]} p-4 ${t["body-sm"]} ${c["text-muted"]}">
        Tip: replace this block with status callouts, product updates, or support links.
      </div>
    </aside>
    <article className="space-y-10">
      <section className="space-y-8 ${r.default} border ${c["border-subtle"]} ${c.surface} ${s["space-lg"]} ${sh.default}">
        <p className="${t.label} ${c["text-muted"]} uppercase tracking-[0.4em]">
          Knowledge base
        </p>
        <h2 className="${t.h2} ${c["text-main"]}">Section headline</h2>
        <p className="${t.body} ${c["text-muted"]}">
          Replace with documentation or feature explanations. Pair with alerts, code examples, or imagery.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="${r.default} border ${c["border-subtle"]} ${c["surface-alt"]} p-5">
            <h3 className="${t.h3} ${c["text-main"]}">Use cases</h3>
            <p className="mt-2 ${t["body-sm"]} ${c["text-muted"]}">
              How customers apply this concept in workflows.
            </p>
          </div>
          <div className="${r.default} border ${c["border-subtle"]} ${c["surface-alt"]} p-5">
            <h3 className="${t.h3} ${c["text-main"]}">Resources</h3>
            <p className="mt-2 ${t["body-sm"]} ${c["text-muted"]}">
              Link to help center articles, videos, or community threads.
            </p>
          </div>
        </div>
      </section>
      <section className="${r.default} border ${c["border-subtle"]} ${c.surface} ${s["space-lg"]} ${sh.default}">
        <h3 className="${t.h3} ${c["text-main"]}">Call to action</h3>
        <p className="mt-2 ${t["body-sm"]} ${c["text-muted"]}">
          Encourage next steps—book demos, contact support, or explore adjacent docs.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a className="${r.default} ${c.primary} px-4 py-2 ${t["body-sm"]} font-semibold text-white ${sh.default} transition hover:-translate-y-0.5" href="#">
            Contact support
          </a>
          <a className="${r.default} border ${c["border-subtle"]} px-4 py-2 ${t["body-sm"]} font-semibold ${c["text-main"]} transition hover:-translate-y-0.5" href="#">
            Browse tutorials
          </a>
        </div>
      </section>
    </article>
  </section>

  <footer data-section="footer" className="border-t ${c["border-subtle"]} ${s["section-x"]} py-10 text-center ${t["body-sm"]} ${c["text-muted"]}">
    Add global links or legal copy down here.
  </footer>
</main>
`.trim(),
  };
}

function docsLayout(ctx: TemplateContext): TailwindLayout {
  const pageTitle = ctx.pageName || "Untitled page";
  const tokens = getTokens();
  const c = tokens.color;
  const t = tokens.typography;
  const s = tokens.spacing;
  const r = tokens.radius;
  const sh = tokens.shadow;
  const l = tokens.layout;
  const navItems = [
    "Introduction",
    "Quick start",
    "API reference",
    "UI components",
    "Deployment",
  ];
  const faqs = [
    {
      question: "Where should I add alerts?",
      answer:
        "Swap any block for MDX callouts, inline warnings, or diff views.",
    },
    {
      question: "Can I embed live code?",
      answer:
        "Yes. Replace the code sample with Sandpack, CodeSandbox, or custom embeds.",
    },
  ];

  return {
    body: `
<main data-brakit-canvas-root="canvas" className="relative min-h-screen ${c.surface} ${t.body} ${c["text-main"]}">
  <header data-section="header" className="${l.content} ${s["section-x"]} ${s["section-y"]} text-center">
    <p className="${t.label} ${c["text-muted"]} uppercase tracking-[0.4em]">
      Documentation
    </p>
    <h1 className="mt-4 ${t.h1} ${c["text-main"]}">${pageTitle}</h1>
    <p className="mt-4 ${t.body} ${c["text-muted"]}">
      Kick off a long-form docs page. Swap in alerts, code samples, or embed demos anywhere in the content column.
    </p>
  </header>

  <section data-section="split" className="${l.content} ${s["section-x"]} gap-12 pb-12 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
    <aside className="mb-8 hidden lg:block">
      <nav className="sticky top-24 space-y-6 ${r.default} border ${c["border-subtle"]} ${c["surface-alt"]} p-6 ${sh.default}">
        <div>
          <h2 className="${t.label} ${c["text-muted"]} uppercase tracking-[0.35em]">
            Docs menu
          </h2>
          <p className="mt-2 ${t["body-sm"]} ${c["text-muted"]}">
            Replace with your navigation tree or MDX-generated toc.
          </p>
        </div>
        <ul className="space-y-2 ${t["body-sm"]} font-medium ${c["text-main"]}">
          ${navItems
            .map(
              (item, index) => `
          <li>
            <a className="flex items-center justify-between ${r.default} px-3 py-2 transition hover:${c.surface} ${index === 0 ? `${c.surface} ${sh.default}` : ""}" href="#">
              <span>${item}</span>
              <span className="${t["body-sm"]} ${c["text-muted"]}">⌘${index + 1}</span>
            </a>
          </li>`
            )
            .join("")}
        </ul>
      </nav>
    </aside>
    <article className="space-y-10">
      <section className="space-y-6 ${r.default} border ${c["border-subtle"]} ${c.surface} ${s["space-lg"]} ${sh.default}">
        <h2 className="${t.h2} ${c["text-main"]}">Concept overview</h2>
        <p className="${t.body} ${c["text-muted"]}">
          Explain the concept in detail. Add inline code, admonitions, or embed interactive demos.
        </p>
        <pre className="${r.default} ${c.overlay} p-6 ${t["body-sm"]} text-white shadow-inner">
          <code>{\`// Replace with real code samples
import { useAwesome } from "@your/library";

export function Example() {
  const data = useAwesome();
  return <div>{data}</div>;
}\`}</code>
        </pre>
        <div className="${r.default} border border-dashed ${c["border-subtle"]} ${c["surface-alt"]} p-6">
          <h3 className="${t.h3} ${c["text-main"]}">Callout</h3>
          <p className="mt-2 ${t["body-sm"]} ${c["text-muted"]}">
            Highlight migration notes, gotchas, or upgrade paths. Swap with Alert components if you prefer.
          </p>
        </div>
      </section>
      <section className="${r.default} border ${c["border-subtle"]} ${c.surface} ${s["space-lg"]} ${sh.default}">
        <h3 className="${t.h3} ${c["text-main"]}">Next steps</h3>
        <p className="mt-2 ${t["body-sm"]} ${c["text-muted"]}">
          Link out to deeper guides, video walkthroughs, or related topics to keep readers moving.
        </p>
      </section>
    </article>
  </section>

  <section data-section="faq" className="${l.content} ${s["section-x"]} pb-12">
    <div className="${r.default} border ${c["border-subtle"]} ${c.surface} ${s["space-lg"]} ${sh.default}">
      <h3 className="${t.h2} ${c["text-main"]}">Frequently asked</h3>
      <dl className="mt-6 space-y-4">
        ${faqs
          .map(
            (item) => `
        <div className="${r.default} border ${c["border-subtle"]} ${c["surface-alt"]} p-4">
          <dt className="${t["body-sm"]} font-semibold ${c["text-main"]}">${item.question}</dt>
          <dd className="mt-1 ${t["body-sm"]} ${c["text-muted"]}">${item.answer}</dd>
        </div>`
          )
          .join("")}
      </dl>
    </div>
  </section>

  <footer data-section="footer" className="border-t ${c["border-subtle"]} ${s["section-x"]} py-10 text-center ${t["body-sm"]} ${c["text-muted"]}">
    Invite readers to edit the page, file issues, or view release notes.
  </footer>
</main>
`.trim(),
  };
}

interface SignupFormParts {
  markup: string;
  imports: string[];
  hoistedCode: string[];
  setupCode: string[];
}

function buildSignupForm(ctx: TemplateContext): SignupFormParts {
  const tokens = getTokens();
  const c = tokens.color;
  const t = tokens.typography;
  const r = tokens.radius;
  const s = tokens.spacing;
  const spec = getFormSpec("signup-form");
  if (!spec) {
    return {
      markup: `
<div className="space-y-4 ${r.default} border border-dashed ${c["border-subtle"]} ${c["surface-alt"]} ${s["space-lg"]} ${t["body-sm"]} ${c["text-muted"]}">
  Replace this block with your signup form.
</div>
      `.trim(),
      imports: [],
      hoistedCode: [],
      setupCode: [],
    };
  }

  const componentName = ctx.componentName || "Page";
  const safeName = componentName.replace(/[^A-Za-z0-9]/g, "") || "Page";
  const camel = safeName.charAt(0).toLowerCase() + safeName.slice(1);

  const generated = generateFormCode(spec, {
    schemaName: `${safeName}Schema`,
    formVarName: `${camel}Form`,
    submitHandlerName: `handle${safeName}Submit`,
  });

  return {
    markup: generated.formJsx,
    imports: [
      `import { useForm } from "react-hook-form"`,
      `import { z } from "zod"`,
      `import { zodResolver } from "@hookform/resolvers/zod"`,
      `import { Button } from "@/components/ui/button"`,
      `import { Input } from "@/components/ui/input"`,
      `import { Checkbox } from "@/components/ui/checkbox"`,
      `import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"`,
    ],
    hoistedCode: [generated.schemaDeclaration],
    setupCode: [generated.setupCode],
  };
}
