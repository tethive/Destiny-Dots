/**
 * Development seed content. Everything here is flagged `isSample` so the team
 * can find and replace it from the admin panel before launch. Certification
 * details are summaries — always confirm against the official exam page.
 */
import type { Difficulty, ExperienceLevel, WorkMode } from "../src/generated/prisma/client";

export const quizzes: Record<string, { order: number; questions: { prompt: string; options: string[]; answerIndex: number; explanation: string }[] }[]> = {
  "data-analyst": [
    {
      order: 1,
      questions: [
        {
          prompt: "Which spreadsheet feature is best for summarising sales by region and month without writing formulas?",
          options: ["Conditional formatting", "Pivot table", "Data validation", "Freeze panes"],
          answerIndex: 1,
          explanation: "Pivot tables group and aggregate rows interactively.",
        },
        {
          prompt: "What does XLOOKUP (or VLOOKUP) primarily do?",
          options: ["Sorts a range", "Finds a value in one range and returns a related value", "Removes duplicates", "Creates charts"],
          answerIndex: 1,
          explanation: "Lookups match a key and return a value from the same row.",
        },
        {
          prompt: "A cell contains =A2*$B$1. What happens to $B$1 when the formula is copied down?",
          options: ["It becomes B2", "It becomes $B$2", "It stays $B$1", "It causes an error"],
          answerIndex: 2,
          explanation: "The $ signs make the reference absolute.",
        },
      ],
    },
    {
      order: 2,
      questions: [
        {
          prompt: "Which clause filters rows after aggregation in SQL?",
          options: ["WHERE", "HAVING", "ORDER BY", "LIMIT"],
          answerIndex: 1,
          explanation: "WHERE filters rows before grouping; HAVING filters groups.",
        },
        {
          prompt: "What does SELECT COUNT(*) FROM orders return?",
          options: ["The first order", "The number of rows in orders", "The number of columns", "All orders"],
          answerIndex: 1,
          explanation: "COUNT(*) counts rows.",
        },
        {
          prompt: "Which keyword removes duplicate rows from a result?",
          options: ["UNIQUE", "DISTINCT", "GROUP", "FILTER"],
          answerIndex: 1,
          explanation: "SELECT DISTINCT returns unique rows.",
        },
      ],
    },
  ],
  "soc-analyst": [
    {
      order: 1,
      questions: [
        {
          prompt: "Which protocol resolves domain names to IP addresses?",
          options: ["DHCP", "DNS", "ARP", "SMTP"],
          answerIndex: 1,
          explanation: "DNS translates names like example.com into IP addresses.",
        },
        {
          prompt: "HTTPS uses which port by default?",
          options: ["80", "22", "443", "3389"],
          answerIndex: 2,
          explanation: "HTTP is 80; HTTPS is 443.",
        },
        {
          prompt: "At which OSI layer does IP operate?",
          options: ["Layer 2 — Data link", "Layer 3 — Network", "Layer 4 — Transport", "Layer 7 — Application"],
          answerIndex: 1,
          explanation: "IP is a network-layer protocol.",
        },
      ],
    },
    {
      order: 2,
      questions: [
        {
          prompt: "Which Linux command shows running processes?",
          options: ["ls", "ps", "cd", "chmod"],
          answerIndex: 1,
          explanation: "ps lists processes; top shows them live.",
        },
        {
          prompt: "Windows Event ID 4625 indicates…",
          options: ["A successful logon", "A failed logon", "A service install", "A system shutdown"],
          answerIndex: 1,
          explanation: "4624 is a successful logon, 4625 a failed one.",
        },
        {
          prompt: "What does chmod 600 file do?",
          options: ["Owner read/write only", "Everyone can read", "Makes it executable for all", "Deletes the file"],
          answerIndex: 0,
          explanation: "6 = read+write for the owner, 0 for group and others.",
        },
      ],
    },
  ],
  "full-stack-developer": [
    {
      order: 1,
      questions: [
        {
          prompt: "Which CSS layout is best for arranging items in a single row or column?",
          options: ["Grid", "Flexbox", "Float", "Table"],
          answerIndex: 1,
          explanation: "Flexbox is one-dimensional; Grid is two-dimensional.",
        },
        {
          prompt: "Which element is most appropriate for the main navigation?",
          options: ["<div>", "<nav>", "<section>", "<span>"],
          answerIndex: 1,
          explanation: "<nav> conveys navigation semantics to assistive tech.",
        },
        {
          prompt: "A mobile-first stylesheet usually adds desktop styles with…",
          options: ["max-width media queries", "min-width media queries", "!important", "JavaScript"],
          answerIndex: 1,
          explanation: "Base styles target small screens; min-width queries layer on larger ones.",
        },
      ],
    },
    {
      order: 2,
      questions: [
        {
          prompt: "What does `await` do inside an async function?",
          options: ["Blocks the whole page", "Pauses the function until a promise settles", "Creates a new thread", "Retries a request"],
          answerIndex: 1,
          explanation: "await yields until the promise resolves or rejects.",
        },
        {
          prompt: "Which method creates a new array with transformed items?",
          options: ["forEach", "map", "push", "find"],
          answerIndex: 1,
          explanation: "map returns a new array; forEach returns undefined.",
        },
        {
          prompt: "`const` in JavaScript means…",
          options: ["The value can never change", "The binding can't be reassigned", "It's global", "It's hoisted with a value"],
          answerIndex: 1,
          explanation: "Objects assigned to const can still be mutated.",
        },
      ],
    },
  ],
};

export const certifications: {
  slug: string;
  name: string;
  provider: string;
  domainTags: string[];
  overview: string;
  examFormat: string;
  difficulty: Difficulty;
  prepTime: string;
  officialUrl: string;
  topics: string[];
  pathSlugs: string[];
}[] = [
  {
    slug: "comptia-security-plus",
    name: "CompTIA Security+",
    provider: "CompTIA",
    domainTags: ["cybersecurity"],
    overview: "A vendor-neutral baseline certification covering core security concepts, threats, architecture, operations and governance. Commonly requested for entry-level security and SOC roles.",
    examFormat: "Multiple-choice and performance-based questions in a timed exam (currently up to 90 questions in 90 minutes). Confirm the current exam code and format on CompTIA's site.",
    difficulty: "ASSOCIATE",
    prepTime: "2–3 months part-time",
    officialUrl: "https://www.comptia.org/certifications/security",
    topics: ["Threats & vulnerabilities", "Security architecture", "Security operations", "Governance & risk"],
    pathSlugs: ["soc-analyst", "security-engineer"],
  },
  {
    slug: "aws-solutions-architect-associate",
    name: "AWS Certified Solutions Architect – Associate (SAA-C03)",
    provider: "Amazon Web Services",
    domainTags: ["cloud-computing"],
    overview: "Validates the ability to design secure, resilient, high-performing and cost-optimised architectures on AWS.",
    examFormat: "Multiple-choice and multiple-response questions (65 questions, 130 minutes at the time of writing). Check AWS for the current exam guide.",
    difficulty: "ASSOCIATE",
    prepTime: "2–4 months part-time",
    officialUrl: "https://aws.amazon.com/certification/certified-solutions-architect-associate/",
    topics: ["Secure architectures", "Resilient architectures", "High-performing architectures", "Cost optimisation"],
    pathSlugs: ["aws-solutions-architect"],
  },
  {
    slug: "azure-administrator-az-104",
    name: "Microsoft Azure Administrator (AZ-104)",
    provider: "Microsoft",
    domainTags: ["cloud-computing"],
    overview: "For administrators who implement, manage and monitor identity, governance, storage, compute and virtual networks in Azure.",
    examFormat: "Proctored exam with mixed question types, which can include case studies and hands-on labs. See Microsoft Learn for the current skills outline.",
    difficulty: "ASSOCIATE",
    prepTime: "2–3 months part-time",
    officialUrl: "https://learn.microsoft.com/credentials/certifications/azure-administrator/",
    topics: ["Identity & governance", "Storage", "Compute", "Networking", "Monitoring"],
    pathSlugs: ["azure-administrator"],
  },
  {
    slug: "google-associate-cloud-engineer",
    name: "Google Associate Cloud Engineer",
    provider: "Google Cloud",
    domainTags: ["cloud-computing"],
    overview: "Validates the ability to deploy applications, monitor operations and manage enterprise solutions on Google Cloud.",
    examFormat: "Multiple-choice and multiple-select questions in a timed, proctored exam. Confirm details on Google Cloud's certification page.",
    difficulty: "ASSOCIATE",
    prepTime: "6–10 weeks part-time",
    officialUrl: "https://cloud.google.com/learn/certification/cloud-engineer",
    topics: ["Setting up a cloud environment", "Planning & configuring", "Deploying & implementing", "Operations", "Access & security"],
    pathSlugs: ["gcp-cloud-engineer"],
  },
  {
    slug: "cka",
    name: "Certified Kubernetes Administrator (CKA)",
    provider: "The Linux Foundation / CNCF",
    domainTags: ["cloud-computing"],
    overview: "A performance-based certification demonstrating the skills to run and troubleshoot production Kubernetes clusters.",
    examFormat: "Hands-on, command-line tasks in a live environment within a time limit. See the Linux Foundation for the current curriculum.",
    difficulty: "PROFESSIONAL",
    prepTime: "2–3 months part-time",
    officialUrl: "https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/",
    topics: ["Cluster architecture", "Workloads & scheduling", "Services & networking", "Storage", "Troubleshooting"],
    pathSlugs: ["devops-engineer"],
  },
  {
    slug: "oscp",
    name: "OffSec Certified Professional (OSCP)",
    provider: "OffSec",
    domainTags: ["ethical-hacking"],
    overview: "A demanding hands-on penetration testing certification that requires compromising machines in a lab exam and writing a professional report.",
    examFormat: "Practical, time-boxed hacking exam followed by a written report. Check OffSec for current exam structure and requirements.",
    difficulty: "PROFESSIONAL",
    prepTime: "4–8 months",
    officialUrl: "https://www.offsec.com/courses/pen-200/",
    topics: ["Enumeration", "Exploitation", "Privilege escalation", "Active Directory", "Reporting"],
    pathSlugs: ["penetration-tester"],
  },
  {
    slug: "ejpt",
    name: "eLearnSecurity Junior Penetration Tester (eJPT)",
    provider: "INE",
    domainTags: ["ethical-hacking"],
    overview: "An entry-level, practical penetration testing certification — a common stepping stone before OSCP.",
    examFormat: "Hands-on lab environment with questions answered from what you find. Confirm the current version on INE's site.",
    difficulty: "FOUNDATIONAL",
    prepTime: "1–2 months",
    officialUrl: "https://ine.com/security/certifications/ejpt-certification",
    topics: ["Assessment methodology", "Host & network auditing", "Web app testing", "Exploitation basics"],
    pathSlugs: ["bug-bounty-hunter"],
  },
  {
    slug: "microsoft-pl-300",
    name: "Microsoft Power BI Data Analyst (PL-300)",
    provider: "Microsoft",
    domainTags: ["data-analysis"],
    overview: "Validates preparing, modelling, visualising and analysing data with Power BI.",
    examFormat: "Proctored exam with mixed question types, which may include case studies. See Microsoft Learn for the current study guide.",
    difficulty: "ASSOCIATE",
    prepTime: "6–10 weeks part-time",
    officialUrl: "https://learn.microsoft.com/credentials/certifications/data-analyst-associate/",
    topics: ["Prepare data", "Model data", "Visualise & analyse", "Deploy & maintain"],
    pathSlugs: ["data-analyst"],
  },
  {
    slug: "databricks-data-engineer-associate",
    name: "Databricks Certified Data Engineer Associate",
    provider: "Databricks",
    domainTags: ["data-engineering"],
    overview: "Validates the ability to build data pipelines with the Databricks Lakehouse Platform.",
    examFormat: "Multiple-choice, proctored exam. Confirm the current exam guide on Databricks' certification page.",
    difficulty: "ASSOCIATE",
    prepTime: "6–8 weeks part-time",
    officialUrl: "https://www.databricks.com/learn/certification/data-engineer-associate",
    topics: ["Lakehouse platform", "ELT with Spark SQL & Python", "Incremental processing", "Production pipelines", "Data governance"],
    pathSlugs: ["data-engineer"],
  },
  {
    slug: "meta-front-end-developer",
    name: "Meta Front-End Developer Professional Certificate",
    provider: "Meta (via Coursera)",
    domainTags: ["full-stack"],
    overview: "A multi-course professional certificate covering HTML, CSS, JavaScript, React and front-end portfolio projects.",
    examFormat: "Course-based certificate with graded assignments and a capstone project rather than a single exam.",
    difficulty: "FOUNDATIONAL",
    prepTime: "5–7 months at a few hours a week",
    officialUrl: "https://www.coursera.org/professional-certificates/meta-front-end-developer",
    topics: ["HTML & CSS", "JavaScript", "React", "UX/UI principles", "Capstone"],
    pathSlugs: ["full-stack-developer", "frontend-developer"],
  },
  {
    slug: "unity-certified-user-vr-developer",
    name: "Unity Certified User: VR Developer",
    provider: "Unity",
    domainTags: ["ar-vr"],
    overview: "An entry-level credential validating core skills for building VR experiences in Unity.",
    examFormat: "Timed exam with multiple-choice and interactive questions. Check Unity's certification page for current details.",
    difficulty: "FOUNDATIONAL",
    prepTime: "1–2 months",
    officialUrl: "https://unity.com/products/unity-certifications",
    topics: ["Unity editor", "XR interaction", "3D fundamentals", "Optimisation basics"],
    pathSlugs: ["ar-vr-developer"],
  },
  {
    slug: "nokia-bell-labs-5g",
    name: "Nokia Bell Labs 5G Certification",
    provider: "Nokia Bell Labs",
    domainTags: ["5g-technology"],
    overview: "A tiered programme covering end-to-end 5G foundations through professional-level network architecture.",
    examFormat: "Course-based learning with assessments per level. Confirm levels and format on Nokia's site.",
    difficulty: "ASSOCIATE",
    prepTime: "2–4 months",
    officialUrl: "https://www.nokia.com/networks/training/bell-labs-end-to-end-5g-certification-program/",
    topics: ["5G architecture", "RAN", "5G core", "Network slicing", "Edge computing"],
    pathSlugs: ["5g-network-engineer"],
  },
  {
    slug: "iso-27001-lead-implementer",
    name: "ISO/IEC 27001 Lead Implementer",
    provider: "Various accredited bodies (e.g. PECB)",
    domainTags: ["cybersecurity"],
    overview: "Training and certification in planning, implementing and maintaining an information security management system (ISMS).",
    examFormat: "Course followed by a written exam; format varies by certification body.",
    difficulty: "PROFESSIONAL",
    prepTime: "1–2 months",
    officialUrl: "https://pecb.com/en/education-and-certification-for-individuals/iso-iec-27001",
    topics: ["ISMS scope", "Risk assessment", "Annex A controls", "Internal audit", "Continual improvement"],
    pathSlugs: ["grc-analyst"],
  },
  {
    slug: "ceh",
    name: "Certified Ethical Hacker (CEH)",
    provider: "EC-Council",
    domainTags: ["ethical-hacking", "cybersecurity"],
    overview: "A widely recognised certification covering attack techniques and tools across the ethical hacking lifecycle.",
    examFormat: "Multiple-choice knowledge exam, with an optional practical exam. Confirm details with EC-Council.",
    difficulty: "ASSOCIATE",
    prepTime: "2–3 months part-time",
    officialUrl: "https://www.eccouncil.org/train-certify/certified-ethical-hacker-ceh/",
    topics: ["Footprinting & scanning", "System hacking", "Web applications", "Wireless", "Cryptography"],
    pathSlugs: ["penetration-tester"],
  },
];

export const jobs: {
  title: string;
  company: string;
  location: string;
  workMode: WorkMode;
  level: ExperienceLevel;
  domainTags: string[];
  pathSlugs: string[];
  salary?: string;
  description: string;
  daysAgo: number;
}[] = [
  { title: "SOC Analyst L1", company: "Sample Security Co.", location: "Chennai", workMode: "HYBRID", level: "ENTRY", domainTags: ["cybersecurity"], pathSlugs: ["soc-analyst"], description: "Monitor SIEM alerts, triage incidents and escalate per playbooks.", daysAgo: 1 },
  { title: "Junior Penetration Tester", company: "Sample Offensive Labs", location: "Bengaluru", workMode: "ONSITE", level: "ENTRY", domainTags: ["ethical-hacking"], pathSlugs: ["penetration-tester"], description: "Assist with web and network assessments and write findings.", daysAgo: 3 },
  { title: "Data Analyst Intern", company: "Sample Analytics Pvt Ltd", location: "Remote", workMode: "REMOTE", level: "INTERNSHIP", domainTags: ["data-analysis"], pathSlugs: ["data-analyst"], salary: "Stipend", description: "Build dashboards and answer business questions with SQL.", daysAgo: 2 },
  { title: "Cloud Support Associate", company: "Sample Cloud Services", location: "Hyderabad", workMode: "HYBRID", level: "ENTRY", domainTags: ["cloud-computing"], pathSlugs: ["aws-solutions-architect", "azure-administrator"], description: "Help customers troubleshoot compute, storage and networking issues.", daysAgo: 5 },
  { title: "Machine Learning Engineer", company: "Sample AI Studio", location: "Remote", workMode: "REMOTE", level: "MID", domainTags: ["ai-ml"], pathSlugs: ["ml-engineer"], description: "Train, evaluate and deploy models behind production APIs.", daysAgo: 4 },
  { title: "Frontend Developer (React)", company: "Sample Product Labs", location: "Chennai", workMode: "ONSITE", level: "ENTRY", domainTags: ["full-stack"], pathSlugs: ["frontend-developer", "full-stack-developer"], description: "Build accessible UI components with React and TypeScript.", daysAgo: 6 },
  { title: "IoT Firmware Trainee", company: "Sample Devices Inc.", location: "Coimbatore", workMode: "ONSITE", level: "INTERNSHIP", domainTags: ["iot"], pathSlugs: ["iot-developer"], description: "Write and test ESP32 firmware for sensor products.", daysAgo: 8 },
  { title: "5G RAN Engineer", company: "Sample Telecom Networks", location: "Noida", workMode: "HYBRID", level: "MID", domainTags: ["5g-technology"], pathSlugs: ["5g-network-engineer"], description: "Integrate and optimise 5G radio access network sites.", daysAgo: 9 },
  { title: "Unity XR Developer", company: "Sample Immersive", location: "Remote", workMode: "REMOTE", level: "ENTRY", domainTags: ["ar-vr"], pathSlugs: ["ar-vr-developer"], description: "Prototype AR training experiences for mobile and headsets.", daysAgo: 10 },
  { title: "Smart Contract Developer", company: "Sample Chain Labs", location: "Remote", workMode: "REMOTE", level: "MID", domainTags: ["blockchain"], pathSlugs: ["solidity-developer"], description: "Write, test and audit Solidity contracts.", daysAgo: 12 },
];

export const updates: { slug: string; title: string; excerpt: string; body: string; domainTags: string[]; readMinutes: number; daysAgo: number }[] = [
  {
    slug: "how-to-follow-a-path-without-burning-out",
    title: "How to follow a career path without burning out",
    excerpt: "A simple weekly rhythm that keeps you moving dot by dot — even with college or a full-time job.",
    domainTags: [],
    readMinutes: 4,
    daysAgo: 1,
    body: `## Pick a realistic weekly budget\n\nDecide how many hours you can give each week and protect them in your calendar. Five focused hours beat fifteen distracted ones.\n\n## One dot at a time\n\nOnly keep one dot "in progress". Finish its resources, take the checkpoint, then mark it complete.\n\n## Review on Sundays\n\n- What did I finish?\n- What blocked me?\n- What's the next dot?\n\n*Sample post — replace with your team's content.*`,
  },
  {
    slug: "soc-analyst-first-90-days",
    title: "What your first 90 days as a SOC analyst look like",
    excerpt: "From alert triage to your first incident report — what to expect and how the SOC Analyst path prepares you.",
    domainTags: ["cybersecurity"],
    readMinutes: 5,
    daysAgo: 3,
    body: `## Month 1: learn the tooling\n\nExpect to shadow senior analysts and learn your SIEM, ticketing and escalation process.\n\n## Month 2: own the queue\n\nYou'll triage alerts independently and document every decision.\n\n## Month 3: improve detections\n\nSpot noisy rules and suggest tuning.\n\n*Sample post — replace with your team's content.*`,
  },
  {
    slug: "building-a-cloud-portfolio",
    title: "Building a cloud portfolio recruiters actually read",
    excerpt: "Three small projects that show real architecture thinking, not just console screenshots.",
    domainTags: ["cloud-computing"],
    readMinutes: 6,
    daysAgo: 6,
    body: `## 1. A three-tier app with infrastructure as code\n\nDeploy it, tear it down and redeploy with one command.\n\n## 2. A cost report\n\nShow what the app costs per month and how you reduced it.\n\n## 3. A failure drill\n\nBreak a component on purpose and document recovery.\n\n*Sample post — replace with your team's content.*`,
  },
  {
    slug: "sql-habits-for-analysts",
    title: "Five SQL habits every analyst should build early",
    excerpt: "Readable queries, CTEs, sanity checks and more — small habits that save hours.",
    domainTags: ["data-analysis", "data-engineering"],
    readMinutes: 4,
    daysAgo: 9,
    body: `1. **Name things clearly** — aliases that explain intent.\n2. **Use CTEs** to break problems into steps.\n3. **Check row counts** after every join.\n4. **Filter early** to keep scans small.\n5. **Comment the why**, not the what.\n\n*Sample post — replace with your team's content.*`,
  },
  {
    slug: "getting-started-with-xr",
    title: "Getting started with AR and VR development",
    excerpt: "What hardware you really need, which engine to learn first and how to ship your first scene.",
    domainTags: ["ar-vr"],
    readMinutes: 5,
    daysAgo: 12,
    body: `## You don't need a headset on day one\n\nStart with 3D fundamentals and Unity's simulator tools; test on a phone for AR.\n\n## Learn one engine well\n\nUnity has the largest learning community for XR beginners.\n\n## Ship small\n\nA single interactive room teaches more than a half-finished game.\n\n*Sample post — replace with your team's content.*`,
  },
];
