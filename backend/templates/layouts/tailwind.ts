import type { LayoutId, TemplateContext } from "../types";
import { generateFormCode, getFormSpec } from "../../services/shared/formSpecs";

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
  return {
    body: `
<main
  data-brakit-canvas-root="canvas"
  className="relative min-h-screen"
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

  return {
    body: `
<main data-brakit-canvas-root="canvas" className="relative min-h-screen">
  <header data-section="header" className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
    <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">
      Launch update
    </p>
    <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">${pageTitle}</h1>
    <p className="mt-4 text-lg text-slate-600">
      Introduce a new product line, feature, or campaign with plenty of room for supporting copy.
    </p>
  </header>

  <section data-section="hero" className="mx-auto w-full max-w-6xl px-6 grid gap-10 pb-12 lg:grid-cols-[2fr_1fr]">
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Lead with clarity</h2>
      <p className="text-slate-600">
        Pin the key narrative here. Swap this copy for onboarding checklists, product visuals, or customer wins.
      </p>
      <ul className="space-y-3 text-sm text-slate-600">
        <li className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 rounded-full bg-slate-900"></span>
          Pair strong messaging with a supporting feature grid or testimonial rail.
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 rounded-full bg-slate-900"></span>
          Add imagery, charts, or embeds directly inside this section.
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 rounded-full bg-slate-900"></span>
          Keep your CTA above the fold for faster conversions.
        </li>
      </ul>
    </div>
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Feature grid
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          ${highlightStats
            .map(
              (stat) => `
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-semibold">${stat.value}</p>
            <p className="text-sm text-slate-500">${stat.label}</p>
          </div>`
            )
            .join("")}
        </div>
      </div>
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Secondary story</h3>
        <p className="mt-2 text-sm text-slate-600">
          Link to patch notes, documentation, or another supporting section.
        </p>
      </div>
    </div>
  </section>

  <section data-section="cta" className="mx-auto w-full max-w-6xl px-6 pb-12">
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-xl font-semibold">Ship with confidence</h3>
        <p className="text-sm text-slate-600">
          Keep your hero CTA tight, with a supporting secondary action.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-900/20 transition hover:-translate-y-0.5 hover:shadow-lg" href="#">
          Get started
        </a>
        <a className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" href="#">
          View docs
        </a>
      </div>
    </div>
  </section>

  <footer data-section="footer" className="mx-auto w-full max-w-6xl px-6 border-t border-slate-100 py-10 text-center text-sm text-slate-500">
    Built with Tailwind + Brakit
  </footer>
</main>
`.trim(),
  };
}

function twoColumnLayout(ctx: TemplateContext): TailwindLayout {
  const pageTitle = ctx.pageName || "Untitled page";
  const quickLinks = ["Download brief", "Roadmap", "Changelog"];

  return {
    body: `
<main data-brakit-canvas-root="canvas" className="relative min-h-screen">
  <header data-section="header" className="mx-auto w-full max-w-6xl px-6 py-16">
    <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">
      Two column layout
    </p>
    <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">${pageTitle}</h1>
    <p className="mt-4 text-lg text-slate-600">
      Tell a story on the left while keeping supporting actions and summaries on the right.
    </p>
  </header>

  <section data-section="split" className="mx-auto w-full max-w-6xl px-6 grid gap-10 pb-12 lg:grid-cols-[2fr_1fr]">
    <article className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold">Primary content</h2>
      <p className="text-slate-600">
        Swap this block for long-form copy, product updates, or educational content. Drop in media, tables, or feature callouts.
      </p>
      <div className="grid gap-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 sm:grid-cols-2">
        <div>
          <h3 className="font-semibold text-slate-900">Use cases</h3>
          <p className="mt-2 text-sm text-slate-600">
            Perfect for launch notes, changelog entries, or customer success stories.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Drop-ins</h3>
          <p className="mt-2 text-sm text-slate-600">
            Embed charts, quotes, or code blocks—spacing is already tuned for readability.
          </p>
        </div>
      </div>
    </article>
    <aside className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
          Sidebar
        </h3>
        <p className="mt-3 text-sm text-slate-600">
          Pair summaries, quick actions, or related resources with the main narrative.
        </p>
        <div className="mt-5 grid gap-3">
          ${quickLinks
            .map(
              (link) => `
          <a className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" href="#">
            ${link}
          </a>`
            )
            .join("")}
        </div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <h4 className="font-semibold text-slate-900">Sticky ideas</h4>
        <p className="mt-2 text-sm text-slate-600">
          Replace this with a contact module, newsletter signup, or anchor navigation.
        </p>
      </div>
    </aside>
  </section>

  <section data-section="cta" className="mx-auto w-full max-w-6xl px-6 pb-12">
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h3 className="text-xl font-semibold">Ready for a CTA?</h3>
        <p className="text-sm text-slate-600">
          Use this row for bottom-of-page actions or links to documentation.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg" href="#">
          Primary action
        </a>
        <a className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" href="#">
          Secondary
        </a>
      </div>
    </div>
  </section>

  <footer data-section="footer" className="border-t border-slate-100 px-6 py-10 text-center text-sm text-slate-500">
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

  return {
    body: `
<main data-brakit-canvas-root="canvas" className="relative min-h-screen">
  <header data-section="header" className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
    <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">
      Split content
    </p>
    <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">${pageTitle}</h1>
    <p className="mt-4 text-lg text-slate-600">
      Compare two ideas, show dual messaging, or pair copy with imagery side by side.
    </p>
  </header>

  <section data-section="contentSplit" className="mx-auto w-full max-w-6xl px-6 grid gap-8 pb-12 lg:grid-cols-2">
    <article className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold">Left column</h2>
      <p className="text-slate-600">
        Replace with feature descriptions, product pillars, or long-form copy. The card grid is perfect for highlights.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            Highlight
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Call out wins, product differentiators, or upcoming milestones.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            Tip
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Swap for metrics, testimonials, or embedded media.
          </p>
        </div>
      </div>
    </article>
    <article className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold">Right column</h2>
      <p className="text-slate-600">
        Ideal for timelines, how-to steps, or supporting visuals. Keep each step tight for fast scanning.
      </p>
      <div className="space-y-4">
        ${steps
          .map(
            (copy, index) => `
        <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 shadow">
            0${index + 1}
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">Step ${index + 1}</h3>
            <p className="mt-1 text-sm text-slate-600">
              ${copy}
            </p>
          </div>
        </div>`
          )
          .join("")}
      </div>
    </article>
  </section>

  <section data-section="cta" className="mx-auto w-full max-w-6xl px-6 pb-12">
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
        CTA
      </p>
      <h3 className="mt-2 text-2xl font-semibold">Add a final action</h3>
      <p className="mt-2 text-sm text-slate-600">
        Use this row for downloads, demos, or contact modules once readers finish the split content.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg" href="#">
          Talk to sales
        </a>
        <a className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" href="#">
          Explore docs
        </a>
      </div>
    </div>
  </section>

  <footer data-section="footer" className="border-t border-slate-100 px-6 py-10 text-center text-sm text-slate-500">
    Footer content or legal copy lives here.
  </footer>
</main>
`.trim(),
  };
}

function dashboardLayout(ctx: TemplateContext): TailwindLayout {
  const pageTitle = ctx.pageName || "Untitled page";
  const metrics = [
    {
      label: "Active users",
      value: "18,245",
      delta: "+12% vs last period",
      deltaColor: "text-emerald-600",
    },
    {
      label: "MRR growth",
      value: "$124k",
      delta: "+8% vs last period",
      deltaColor: "text-emerald-600",
    },
    {
      label: "Churn rate",
      value: "1.8%",
      delta: "-0.4% vs last period",
      deltaColor: "text-rose-600",
    },
    {
      label: "NPS score",
      value: "62",
      delta: "+6% vs last period",
      deltaColor: "text-emerald-600",
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
<main data-brakit-canvas-root="canvas" className="relative min-h-screen">
  <header data-section="header" className="mx-auto w-full max-w-6xl px-6 flex flex-col gap-6 py-16 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">
        Analytics
      </p>
      <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">${pageTitle}</h1>
    </div>
    <div className="flex gap-3">
      <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
        Download report
      </button>
      <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-slate-900/20 transition hover:-translate-y-0.5 hover:shadow-md">
        Create snapshot
      </button>
    </div>
  </header>

  <section data-section="hero" className="mx-auto w-full max-w-6xl px-6 pb-10">
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Weekly summary
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Momentum keeps climbing</h2>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-600 shadow">
          +18% WoW
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-600">
        Drop in snapshot copy, embed saved views, or link out to detailed dashboards.
      </p>
    </div>
  </section>

  <section data-section="stats" className="mx-auto w-full max-w-6xl px-6 grid gap-6 pb-12 sm:grid-cols-2 lg:grid-cols-4">
    ${metrics
      .map(
        (metric) => `
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">${metric.label}</p>
      <p className="mt-3 text-3xl font-semibold">${metric.value}</p>
      <p className="mt-2 text-sm font-medium ${metric.deltaColor}">${metric.delta}</p>
    </div>`
      )
      .join("")}
  </section>

  <section data-section="featureGrid" className="mx-auto w-full max-w-6xl px-6 grid gap-6 pb-12 lg:grid-cols-[2fr_1fr]">
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900">Highlights</h3>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Snapshot
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-3xl font-semibold text-emerald-700">+28%</p>
          <p className="mt-2 text-sm text-emerald-700">Feature adoption</p>
          <p className="mt-1 text-xs text-emerald-600">vs last week</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-3xl font-semibold text-slate-900">3.2 hrs</p>
          <p className="mt-2 text-sm text-slate-600">Avg. resolution</p>
          <p className="mt-1 text-xs text-slate-500">down 14%</p>
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
        ${notifications
          .map(
            (note) => `
        <p className="text-sm text-slate-600">
          ${note}
        </p>`
          )
          .join("")}
      </div>
    </div>
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900">Next steps</h3>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Actions
        </span>
      </div>
      <p className="text-sm text-slate-600">
        Provide jump links, quick filters, or saved queries here.
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        ${nextSteps
          .map(
            (item) => `
        <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          ${item}
        </li>`
          )
          .join("")}
      </ul>
    </div>
  </section>

  <footer data-section="footer" className="border-t border-slate-100 px-6 py-10 text-center text-sm text-slate-500">
    Tie this layout to live data sources to keep teams aligned.
  </footer>
</main>
`.trim(),
  };
}

function formLayout(ctx: TemplateContext): TailwindLayout {
  const pageTitle = ctx.pageName || "Untitled page";
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
<main data-brakit-canvas-root="canvas" className="relative min-h-screen">
  <header data-section="header" className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
    <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">
      Signup
    </p>
    <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">${pageTitle}</h1>
    <p className="mt-4 text-lg text-slate-600">
      Pair a modern hero with a high-converting signup form. All inputs are wired up with zod + react-hook-form.
    </p>
  </header>

  <section data-section="split" className="mx-auto w-full max-w-6xl px-6 flex flex-col gap-10 pb-12 lg:flex-row">
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:w-3/5">
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
        Why join?
      </p>
      <ul className="space-y-4 text-sm text-slate-600">
        <li className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500"></span>
          Outline value props, onboarding milestones, or social proof.
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500"></span>
          Embed testimonials, logos, or badges below the list.
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500"></span>
          Swap the form card for multi-step flows when needed.
        </li>
      </ul>
    </div>
    <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:w-2/5">
      ${signupForm.markup}
    </div>
  </section>

  <section data-section="faq" className="mx-auto w-full max-w-6xl px-6 pb-12">
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-2xl font-semibold">Frequently asked</h3>
      <dl className="mt-6 space-y-4">
        ${faqs
          .map(
            (item) => `
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <dt className="text-sm font-semibold text-slate-900">${item.question}</dt>
          <dd className="mt-1 text-sm text-slate-600">${item.answer}</dd>
        </div>`
          )
          .join("")}
      </dl>
    </div>
  </section>

  <footer data-section="footer" className="border-t border-slate-100 px-6 py-10 text-center text-sm text-slate-500">
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
<main data-brakit-canvas-root="canvas" className="relative min-h-screen">
  <header data-section="header" className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">
      Pricing
    </p>
    <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">${pageTitle}</h1>
    <p className="mt-4 text-lg text-slate-600">
      Swap in live pricing tiers, feature grids, or usage-based calculators. Each card is ready to hook into your billing data.
    </p>
  </header>

  <section data-section="hero" className="mx-auto w-full max-w-6xl px-6 pb-10">
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 text-center shadow-sm">
      <h2 className="text-2xl font-semibold">Transparent pricing for every stage</h2>
      <p className="mt-3 text-sm text-slate-600">
        Mention billing cadence, usage tiers, or your money-back guarantee here.
      </p>
    </div>
  </section>

  <section data-section="pricing" className="mx-auto w-full max-w-6xl px-6 grid gap-8 pb-12 lg:grid-cols-3">
    ${tiers
      .map(
        (tier) => `
    <article className="relative flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-3">
        <h3 className="text-xl font-semibold">${tier.title}</h3>
        <p className="text-3xl font-semibold">${tier.price}</p>
        <p className="text-sm text-slate-600">${tier.description}</p>
      </div>
      <ul className="mt-6 space-y-2 text-sm text-slate-600">
        ${tier.features
          .map(
            (feature) => `
        <li className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-600">
            ✓
          </span>
          ${feature}
        </li>`
          )
          .join("")}
      </ul>
      <button className="mt-auto rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-slate-900/15 transition hover:-translate-y-0.5 hover:shadow-md">
        Choose plan
      </button>
    </article>`
      )
      .join("")}
  </section>

  <section data-section="testimonials" className="mx-auto w-full max-w-6xl px-6 grid gap-6 pb-12 md:grid-cols-2">
    ${testimonials
      .map(
        (item) => `
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm italic text-slate-700">“${item.quote}”</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        ${item.author}
      </p>
    </article>`
      )
      .join("")}
  </section>

  <section data-section="cta" className="mx-auto w-full max-w-6xl px-6 pb-12">
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h3 className="text-2xl font-semibold">Need enterprise?</h3>
      <p className="mt-2 text-sm text-slate-600">
        Outline custom pricing workflows, procurement steps, or solution engineering support.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg" href="#">
          Talk to sales
        </a>
        <a className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" href="#">
          Download overview
        </a>
      </div>
    </div>
  </section>

  <footer data-section="footer" className="border-t border-slate-100 px-6 py-10 text-center text-sm text-slate-500">
    Note VAT/tax requirements or billing support contacts here.
  </footer>
</main>
`.trim(),
  };
}

function sidebarLayout(ctx: TemplateContext): TailwindLayout {
  const pageTitle = ctx.pageName || "Untitled page";
  const navItems = [
    "Overview",
    "Getting started",
    "Components",
    "Playbooks",
    "Guides",
  ];

  return {
    body: `
<main data-brakit-canvas-root="canvas" className="relative min-h-screen">
  <header data-section="header" className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">
      Navigation layout
    </p>
    <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">${pageTitle}</h1>
    <p className="mt-4 text-lg text-slate-600">
      Ideal for docs, onboarding, or wikis. Keep navigation pinned while content scrolls on the right.
    </p>
  </header>

  <section data-section="split" className="mx-auto w-full max-w-6xl px-6 grid gap-10 pb-12 lg:grid-cols-[260px_minmax(0,1fr)]">
    <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
          Navigation
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Swap this list for docs nav, product menus, or onboarding steps.
        </p>
      </div>
      <nav className="space-y-2 text-sm font-semibold text-slate-700">
        ${navItems
          .map(
            (item, index) => `
        <a className="flex items-center justify-between rounded-xl px-4 py-3 transition hover:bg-slate-100 ${index === 0 ? "bg-slate-100" : ""}" href="#">
          <span>${item}</span>
          <span className="text-xs text-slate-400">→</span>
        </a>`
          )
          .join("")}
      </nav>
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Tip: replace this block with status callouts, product updates, or support links.
      </div>
    </aside>
    <article className="space-y-10">
      <section className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">
          Knowledge base
        </p>
        <h2 className="text-2xl font-semibold">Section headline</h2>
        <p className="text-slate-600">
          Replace with documentation or feature explanations. Pair with alerts, code examples, or imagery.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-800">Use cases</h3>
            <p className="mt-2 text-sm text-slate-600">
              How customers apply this concept in workflows.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-800">Resources</h3>
            <p className="mt-2 text-sm text-slate-600">
              Link to help center articles, videos, or community threads.
            </p>
          </div>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-800">Call to action</h3>
        <p className="mt-2 text-sm text-slate-600">
          Encourage next steps—book demos, contact support, or explore adjacent docs.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5" href="#">
            Contact support
          </a>
          <a className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400" href="#">
            Browse tutorials
          </a>
        </div>
      </section>
    </article>
  </section>

  <footer data-section="footer" className="border-t border-slate-100 px-6 py-10 text-center text-sm text-slate-500">
    Add global links or legal copy down here.
  </footer>
</main>
`.trim(),
  };
}

function docsLayout(ctx: TemplateContext): TailwindLayout {
  const pageTitle = ctx.pageName || "Untitled page";
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
<main data-brakit-canvas-root="canvas" className="relative min-h-screen bg-white text-slate-900">
  <header data-section="header" className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
    <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">
      Documentation
    </p>
    <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">${pageTitle}</h1>
    <p className="mt-4 text-lg text-slate-600">
      Kick off a long-form docs page. Swap in alerts, code samples, or embed demos anywhere in the content column.
    </p>
  </header>

  <section data-section="split" className="mx-auto w-full max-w-6xl px-6 gap-12 pb-12 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
    <aside className="mb-8 hidden lg:block">
      <nav className="sticky top-24 space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            Docs menu
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Replace with your navigation tree or MDX-generated toc.
          </p>
        </div>
        <ul className="space-y-2 text-sm font-medium text-slate-700">
          ${navItems
            .map(
              (item, index) => `
          <li>
            <a className="flex items-center justify-between rounded-lg px-3 py-2 transition hover:bg-white ${index === 0 ? "bg-white shadow-sm" : ""}" href="#">
              <span>${item}</span>
              <span className="text-xs text-slate-400">⌘${index + 1}</span>
            </a>
          </li>`
            )
            .join("")}
        </ul>
      </nav>
    </aside>
    <article className="space-y-10">
      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-800">Concept overview</h2>
        <p className="text-slate-600">
          Explain the concept in detail. Add inline code, admonitions, or embed interactive demos.
        </p>
        <pre className="rounded-2xl bg-slate-900 p-6 text-sm text-slate-100 shadow-inner">
          <code>{\`// Replace with real code samples
import { useAwesome } from "@your/library";

export function Example() {
  const data = useAwesome();
  return <div>{data}</div>;
}\`}</code>
        </pre>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6">
          <h3 className="font-semibold text-slate-800">Callout</h3>
          <p className="mt-2 text-sm text-slate-600">
            Highlight migration notes, gotchas, or upgrade paths. Swap with Alert components if you prefer.
          </p>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-800">Next steps</h3>
        <p className="mt-2 text-sm text-slate-600">
          Link out to deeper guides, video walkthroughs, or related topics to keep readers moving.
        </p>
      </section>
    </article>
  </section>

  <section data-section="faq" className="mx-auto w-full max-w-6xl px-6 pb-12">
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-2xl font-semibold">Frequently asked</h3>
      <dl className="mt-6 space-y-4">
        ${faqs
          .map(
            (item) => `
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <dt className="text-sm font-semibold text-slate-900">${item.question}</dt>
          <dd className="mt-1 text-sm text-slate-600">${item.answer}</dd>
        </div>`
          )
          .join("")}
      </dl>
    </div>
  </section>

  <footer data-section="footer" className="border-t border-slate-100 px-6 py-10 text-center text-sm text-slate-500">
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
  const spec = getFormSpec("signup-form");
  if (!spec) {
    return {
      markup: `
<div className="space-y-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
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
