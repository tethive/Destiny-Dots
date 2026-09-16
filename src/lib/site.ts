export const siteConfig = {
  name: "Destiny Dots",
  tagline: "Find your path. Connect the dots.",
  description:
    "Structured career roadmaps with hand-picked resources for Cybersecurity, Ethical Hacking, AI/ML, Cloud, Data, Blockchain, Full Stack, IoT, 5G and AR/VR.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  legalEntity: "Destiny Dots",
};

/**
 * Public contact details. Empty strings hide that item on the site.
 * Add social profile URLs here when they exist.
 */
export const contactConfig = {
  isPlaceholder: false,
  email: "info.destinydots@gmail.com",
  phone: "+91 72009 66468",
  whatsapp: "917200966468", // digits only, used for wa.me links
  address: "Chennai, Tamil Nadu, India",
  hours: "",
  socials: {
    instagram: "",
    linkedin: "",
    youtube: "",
    x: "",
    discord: "",
  },
};

export const marketingNav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/resources", label: "Resources" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact Us" },
] as const;

export const footerNav = [
  {
    title: "Explore",
    links: [
      { href: "/", label: "Home" },
      { href: "/resources", label: "Resources" },
      { href: "/pricing", label: "Pricing" },
      { href: "/signup", label: "Get started free" },
    ],
  },
  {
    title: "Popular domains",
    links: [
      { href: "/resources/cybersecurity", label: "Cybersecurity" },
      { href: "/resources/ai-ml", label: "AI & ML" },
      { href: "/resources/cloud-computing", label: "Cloud Computing" },
      { href: "/resources/full-stack", label: "Full Stack" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact Us" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/refund-policy", label: "Refunds & cancellation" },
    ],
  },
] as const;
