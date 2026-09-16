/**
 * Static catalogue used by the public (pre-login) pages.
 *
 * Shapes mirror the planned Prisma tables — `career_paths`, `dots`,
 * `resources` — so these helpers can be swapped for DB queries in build
 * step 2 without touching the pages. Content is admin/team curated only.
 */
import { pricing } from "@/lib/pricing";

export type DomainTag =
  | "cybersecurity"
  | "ethical-hacking"
  | "ai-ml"
  | "cloud-computing"
  | "data-engineering"
  | "data-analysis"
  | "blockchain"
  | "full-stack"
  | "iot"
  | "5g-technology"
  | "ar-vr";

export type ResourceType = "video" | "doc" | "project" | "quiz" | "link";

export interface Resource {
  title: string;
  type: ResourceType;
  duration: string;
  isPremium: boolean;
}

export interface Dot {
  order: number;
  title: string;
  description: string;
  hours: number;
  isFree: boolean;
  resourceCount: number;
  hasCheckpoint: boolean;
  /** Present when the milestone is a certification (links to cert guides). */
  certification?: string;
  /** Only the free dots expose their resource list to visitors. */
  resources?: Resource[];
}

export type Level = "Beginner" | "Intermediate" | "Advanced";

export interface CareerPath {
  slug: string;
  domainTag: DomainTag;
  title: string;
  summary: string;
  level: Level;
  duration: string;
  roles: string[];
  outcomes: string[];
  isPublished: boolean;
  dots: Dot[];
}

export interface Domain {
  tag: DomainTag;
  name: string;
  /** Compact label for chips, marquee and the 3D scene. */
  short: string;
  tagline: string;
  description: string;
  status: "live" | "coming-soon";
  certifications: string[];
}

export const domains: Domain[] = [
  {
    tag: "cybersecurity",
    name: "Cybersecurity",
    short: "Cyber",
    tagline: "Defend systems and hunt threats.",
    description:
      "Blue-team, security engineering and governance paths that end in the certifications employers actually ask for.",
    status: "live",
    certifications: ["CompTIA Security+", "CISSP", "ISO 27001"],
  },
  {
    tag: "ethical-hacking",
    name: "Ethical Hacking",
    short: "Hacking",
    tagline: "Break things — legally — before attackers do.",
    description:
      "Penetration testing and bug bounty paths built on hands-on labs, CTFs and responsible disclosure.",
    status: "live",
    certifications: ["CEH", "OSCP", "eJPT"],
  },
  {
    tag: "ai-ml",
    name: "AI & Machine Learning",
    short: "AI/ML",
    tagline: "Train models and ship intelligent products.",
    description:
      "From maths and scikit-learn to deep learning, MLOps and LLM-powered apps.",
    status: "live",
    certifications: ["AWS ML Engineer Associate", "Google Professional ML Engineer"],
  },
  {
    tag: "cloud-computing",
    name: "Cloud Computing",
    short: "Cloud",
    tagline: "Design, deploy and run infrastructure at scale.",
    description:
      "AWS, Azure, Google Cloud and DevOps paths — the domain with the most remote-first openings.",
    status: "live",
    certifications: ["AWS SAA-C03", "AZ-104", "Google ACE", "CKA"],
  },
  {
    tag: "data-engineering",
    name: "Data Engineering",
    short: "Data Eng",
    tagline: "Build the pipelines every data team depends on.",
    description:
      "Warehouses, Spark, orchestration and streaming — the plumbing behind analytics and AI.",
    status: "live",
    certifications: ["Databricks Data Engineer Associate", "Google Professional Data Engineer"],
  },
  {
    tag: "data-analysis",
    name: "Data Analysis",
    short: "Analytics",
    tagline: "Turn raw data into decisions.",
    description:
      "Spreadsheets, SQL, Python and Power BI paths for analyst and business-analyst roles.",
    status: "live",
    certifications: ["Microsoft PL-300", "Google Data Analytics"],
  },
  {
    tag: "blockchain",
    name: "Blockchain",
    short: "Web3",
    tagline: "Smart contracts and decentralised apps.",
    description:
      "Solidity, smart-contract security and Web3 frontends — built around testnets and real deployments.",
    status: "live",
    certifications: [],
  },
  {
    tag: "full-stack",
    name: "Full Stack Development",
    short: "Full Stack",
    tagline: "Build products people use every day.",
    description:
      "Job-oriented frontend, backend and full-stack paths — curated, not just aggregated.",
    status: "live",
    certifications: ["Meta Front-End Developer"],
  },
  {
    tag: "iot",
    name: "Internet of Things",
    short: "IoT",
    tagline: "Connect sensors, devices and the cloud.",
    description:
      "Electronics, microcontrollers, wireless protocols and cloud dashboards for connected products.",
    status: "live",
    certifications: [],
  },
  {
    tag: "5g-technology",
    name: "5G Technology",
    short: "5G",
    tagline: "Engineer the networks of the next decade.",
    description:
      "Mobile network architecture, 5G core, RAN and network automation for telecom careers.",
    status: "live",
    certifications: ["Nokia Bell Labs 5G Professional"],
  },
  {
    tag: "ar-vr",
    name: "AR / VR",
    short: "AR/VR",
    tagline: "Build immersive worlds and mixed reality.",
    description:
      "Unity, 3D fundamentals, interaction design and XR deployment for games, training and retail.",
    status: "live",
    certifications: ["Unity Certified User: VR Developer"],
  },
];

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

const r = (type: ResourceType, title: string, duration: string, isPremium = false): Resource => ({
  type,
  title,
  duration,
  isPremium,
});

type DotInput = {
  title: string;
  description: string;
  hours: number;
  resourceCount: number;
  hasCheckpoint?: boolean;
  certification?: string;
  resources?: Resource[];
};

function dots(list: DotInput[]): Dot[] {
  return list.map((d, i) => ({
    order: i + 1,
    title: d.title,
    description: d.description,
    hours: d.hours,
    isFree: i < pricing.freeDotsPerPath,
    resourceCount: d.resources?.length ?? d.resourceCount,
    hasCheckpoint: d.hasCheckpoint ?? true,
    certification: d.certification,
    resources: i < pricing.freeDotsPerPath ? d.resources : undefined,
  }));
}

const upcoming = (
  domainTag: DomainTag,
  slug: string,
  title: string,
  summary: string,
  level: Level,
): CareerPath => ({
  slug,
  domainTag,
  title,
  summary,
  level,
  duration: "—",
  roles: [],
  outcomes: [],
  isPublished: false,
  dots: [],
});

/* ------------------------------------------------------------------ */
/* Paths                                                               */
/* ------------------------------------------------------------------ */

export const paths: CareerPath[] = [
  // ---------------------------------------------------------------- Data & AI
  {
    slug: "data-analyst",
    domainTag: "data-analysis",
    title: "Data Analyst",
    summary: "Turn raw data into decisions with spreadsheets, SQL, Python and Power BI.",
    level: "Beginner",
    duration: "4–6 months",
    roles: ["Data Analyst", "MIS Analyst", "Reporting Analyst"],
    outcomes: [
      "Query and join real datasets confidently in SQL",
      "Clean and analyse data with Python and pandas",
      "Build interactive Power BI dashboards",
      "Present a portfolio project to recruiters",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Spreadsheet fundamentals",
        description: "Formulas, lookups, pivot tables and charts — the analyst's everyday toolkit.",
        hours: 12,
        resourceCount: 3,
        resources: [
          r("video", "Spreadsheet essentials — guided video series", "2h 10m"),
          r("doc", "Formula & lookup cheat sheet", "PDF"),
          r("project", "Sales data practice workbook", "3h", true),
        ],
      },
      {
        title: "SQL basics",
        description: "SELECT, filtering, aggregation and grouping on real business tables.",
        hours: 16,
        resourceCount: 4,
        resources: [
          r("video", "SQL for beginners", "2h 30m"),
          r("doc", "SQL cheat sheet", "PDF"),
          r("link", "Interactive SQL sandbox", "Practice"),
          r("project", "50 graded practice queries", "5h", true),
        ],
      },
      { title: "Joins, subqueries & window functions", description: "Combine tables and answer multi-step questions.", hours: 18, resourceCount: 5 },
      { title: "Python for data", description: "Python syntax, notebooks and the pandas library.", hours: 24, resourceCount: 6 },
      { title: "Statistics essentials", description: "Distributions, sampling, hypothesis tests and A/B testing.", hours: 16, resourceCount: 5 },
      { title: "Data cleaning & wrangling", description: "Handle missing values, messy formats and reshaping.", hours: 14, resourceCount: 4 },
      { title: "Power BI dashboards", description: "Data models, DAX basics and dashboard design.", hours: 20, resourceCount: 6 },
      { title: "Storytelling with data", description: "Choose the right chart and present insights clearly.", hours: 8, resourceCount: 3 },
      { title: "Portfolio capstone", description: "An end-to-end analysis you can show in interviews.", hours: 24, resourceCount: 3, hasCheckpoint: false },
      { title: "Get certified: Microsoft PL-300", description: "Exam guide, practice tests and a revision plan.", hours: 20, resourceCount: 4, certification: "Microsoft PL-300" },
    ]),
  },
  {
    slug: "ml-engineer",
    domainTag: "ai-ml",
    title: "ML Engineer",
    summary: "Build, evaluate and deploy machine-learning models that run in production.",
    level: "Intermediate",
    duration: "8–10 months",
    roles: ["ML Engineer", "Applied Scientist", "Data Scientist"],
    outcomes: [
      "Train and evaluate classical ML models",
      "Build deep-learning models in PyTorch",
      "Track experiments and deploy models behind APIs",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Python & NumPy foundations",
        description: "Vectorised computation and the scientific Python stack.",
        hours: 16,
        resourceCount: 3,
        resources: [
          r("video", "NumPy from scratch", "1h 45m"),
          r("doc", "Array operations reference", "PDF"),
          r("project", "Implement linear regression with NumPy", "4h", true),
        ],
      },
      {
        title: "Maths for machine learning",
        description: "The linear algebra, calculus and probability you actually need.",
        hours: 20,
        resourceCount: 3,
        resources: [
          r("video", "Linear algebra, visually explained", "3h"),
          r("doc", "Probability refresher notes", "PDF"),
          r("quiz", "Maths readiness check", "20 min"),
        ],
      },
      { title: "Classical ML with scikit-learn", description: "Regression, classification, trees and ensembles.", hours: 24, resourceCount: 6 },
      { title: "Evaluation & feature engineering", description: "Metrics, validation strategy and leakage.", hours: 16, resourceCount: 5 },
      { title: "Deep learning fundamentals", description: "Neural networks, backpropagation and optimisation.", hours: 20, resourceCount: 5 },
      { title: "PyTorch in practice", description: "Training loops, datasets and GPU workflows.", hours: 24, resourceCount: 6 },
      { title: "MLOps: tracking & reproducibility", description: "Experiment tracking, versioning and pipelines.", hours: 16, resourceCount: 4 },
      { title: "Serving models", description: "Package models behind APIs and monitor drift.", hours: 16, resourceCount: 4 },
      { title: "Capstone: end-to-end ML system", description: "From dataset to deployed, monitored model.", hours: 30, resourceCount: 3, hasCheckpoint: false },
    ]),
  },
  {
    slug: "data-engineer",
    domainTag: "data-engineering",
    title: "Data Engineer",
    summary: "Design the pipelines and warehouses that every data team depends on.",
    level: "Intermediate",
    duration: "6–8 months",
    roles: ["Data Engineer", "Analytics Engineer", "ETL Developer"],
    outcomes: [
      "Model data for analytics warehouses",
      "Build batch pipelines with Spark and Airflow",
      "Run data workloads on a cloud platform",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "SQL & data modelling",
        description: "Normalisation, star schemas and slowly changing dimensions.",
        hours: 18,
        resourceCount: 3,
        resources: [
          r("video", "Dimensional modelling explained", "1h 50m"),
          r("doc", "Star vs snowflake schema guide", "PDF"),
          r("project", "Model an e-commerce warehouse", "4h", true),
        ],
      },
      {
        title: "Python for pipelines",
        description: "Files, APIs, testing and packaging for data code.",
        hours: 16,
        resourceCount: 3,
        resources: [
          r("video", "Python for data engineering", "2h 20m"),
          r("link", "Working with REST APIs — tutorial", "Article"),
          r("quiz", "Python pipeline check", "15 min"),
        ],
      },
      { title: "Warehousing concepts", description: "OLAP, columnar storage and the modern data stack.", hours: 12, resourceCount: 4 },
      { title: "Batch processing with Spark", description: "DataFrames, partitioning and performance tuning.", hours: 24, resourceCount: 6 },
      { title: "Orchestration with Airflow", description: "DAGs, scheduling, retries and alerting.", hours: 16, resourceCount: 4 },
      { title: "Streaming fundamentals", description: "Event streams, Kafka concepts and exactly-once.", hours: 16, resourceCount: 4 },
      { title: "Cloud data platforms", description: "Lakehouses and managed warehouses on AWS, GCP or Azure.", hours: 18, resourceCount: 5 },
      { title: "Capstone pipeline", description: "Ingest, transform and serve a real dataset.", hours: 28, resourceCount: 3, hasCheckpoint: false },
      { title: "Get certified: Databricks Data Engineer Associate", description: "Exam blueprint and practice sets.", hours: 16, resourceCount: 4, certification: "Databricks Data Engineer Associate" },
    ]),
  },
  {
    slug: "ai-llm-engineer",
    domainTag: "ai-ml",
    title: "AI / LLM Engineer",
    summary: "Ship reliable applications on top of large language models.",
    level: "Intermediate",
    duration: "5–7 months",
    roles: ["AI Engineer", "LLM Application Developer"],
    outcomes: [
      "Design and evaluate prompts systematically",
      "Build retrieval-augmented and tool-using apps",
      "Add guardrails, monitoring and cost controls",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Python & APIs",
        description: "HTTP, JSON, async code and environment management.",
        hours: 12,
        resourceCount: 3,
        resources: [
          r("video", "Calling web APIs from Python", "1h 20m"),
          r("doc", "Async Python primer", "PDF"),
          r("project", "Build a CLI chat client", "3h", true),
        ],
      },
      {
        title: "How LLMs work",
        description: "Tokens, embeddings, attention and context windows — intuitively.",
        hours: 10,
        resourceCount: 3,
        resources: [
          r("video", "Transformers without the maths overload", "1h 40m"),
          r("doc", "Glossary of LLM terms", "PDF"),
          r("quiz", "Concepts checkpoint", "15 min"),
        ],
      },
      { title: "Prompt design & evaluation", description: "Structured prompts, test sets and graders.", hours: 14, resourceCount: 5 },
      { title: "Retrieval-augmented generation", description: "Chunking, embeddings, vector search and citations.", hours: 18, resourceCount: 5 },
      { title: "Tool use & agents", description: "Function calling, planning loops and failure handling.", hours: 18, resourceCount: 5 },
      { title: "Fine-tuning basics", description: "When to fine-tune, data prep and evaluation.", hours: 12, resourceCount: 4 },
      { title: "Guardrails & monitoring", description: "Safety filters, tracing, latency and cost.", hours: 10, resourceCount: 4 },
      { title: "Capstone: ship an AI app", description: "Deploy a production-grade assistant with evals.", hours: 30, resourceCount: 3, hasCheckpoint: false },
    ]),
  },
  {
    slug: "business-analyst",
    domainTag: "data-analysis",
    title: "Business Analyst",
    summary: "Bridge business teams and data — requirements, processes and insight.",
    level: "Beginner",
    duration: "3–5 months",
    roles: ["Business Analyst", "Product Analyst"],
    outcomes: [
      "Gather and document requirements",
      "Model processes and propose improvements",
      "Answer business questions with SQL and dashboards",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "BA fundamentals",
        description: "The BA role, stakeholders and the project lifecycle.",
        hours: 8,
        resourceCount: 3,
        resources: [
          r("video", "What a business analyst really does", "55m"),
          r("doc", "Stakeholder mapping template", "Template"),
          r("quiz", "BA basics checkpoint", "10 min"),
        ],
      },
      {
        title: "Excel for analysis",
        description: "Pivot tables, scenarios and quick modelling.",
        hours: 10,
        resourceCount: 3,
        resources: [
          r("video", "Excel for business analysis", "1h 30m"),
          r("doc", "Pivot table recipes", "PDF"),
          r("project", "Budget variance workbook", "3h", true),
        ],
      },
      { title: "Requirements & user stories", description: "Elicitation, acceptance criteria and backlogs.", hours: 12, resourceCount: 4 },
      { title: "Process modelling", description: "BPMN diagrams and finding bottlenecks.", hours: 10, resourceCount: 4 },
      { title: "SQL for business questions", description: "Pull the numbers yourself.", hours: 14, resourceCount: 5 },
      { title: "Dashboards in Power BI", description: "KPIs and reports stakeholders use.", hours: 14, resourceCount: 5 },
      { title: "Case-study capstone", description: "Solve a realistic business problem end to end.", hours: 16, resourceCount: 2, hasCheckpoint: false },
    ]),
  },

  // ------------------------------------------------------------ Cybersecurity
  {
    slug: "soc-analyst",
    domainTag: "cybersecurity",
    title: "SOC Analyst",
    summary: "Monitor, detect and respond to threats as a security operations analyst.",
    level: "Beginner",
    duration: "5–7 months",
    roles: ["SOC Analyst L1/L2", "Security Monitoring Analyst"],
    outcomes: [
      "Read logs and triage alerts in a SIEM",
      "Map attacker behaviour to MITRE ATT&CK",
      "Follow and write incident response playbooks",
      "Earn CompTIA Security+",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Networking fundamentals",
        description: "OSI/TCP-IP, ports, DNS, HTTP and packet basics.",
        hours: 18,
        resourceCount: 3,
        resources: [
          r("video", "Networking for security beginners", "3h"),
          r("doc", "Common ports & protocols sheet", "PDF"),
          r("project", "Packet capture analysis lab", "3h", true),
        ],
      },
      {
        title: "Linux & Windows basics",
        description: "Command lines, permissions, services and event logs.",
        hours: 16,
        resourceCount: 3,
        resources: [
          r("video", "Linux command line crash course", "2h"),
          r("link", "Windows Event Log reference", "Article"),
          r("quiz", "OS basics checkpoint", "15 min"),
        ],
      },
      { title: "Security concepts", description: "CIA triad, authentication, crypto and controls.", hours: 12, resourceCount: 4 },
      { title: "Threat landscape & MITRE ATT&CK", description: "How real attacks unfold, tactic by tactic.", hours: 12, resourceCount: 4 },
      { title: "Log analysis & SIEM", description: "Search, correlate and build detections.", hours: 20, resourceCount: 6 },
      { title: "Incident response", description: "Playbooks, containment and communication.", hours: 14, resourceCount: 5 },
      { title: "Endpoint detection & triage", description: "EDR alerts, process trees and verdicts.", hours: 14, resourceCount: 4 },
      { title: "Home lab: build a mini SOC", description: "A portfolio-ready lab you can talk through.", hours: 20, resourceCount: 3, hasCheckpoint: false },
      { title: "Get certified: CompTIA Security+", description: "Exam objectives, practice tests and plan.", hours: 30, resourceCount: 5, certification: "CompTIA Security+" },
    ]),
  },
  {
    slug: "penetration-tester",
    domainTag: "ethical-hacking",
    title: "Penetration Tester",
    summary: "Find and responsibly report vulnerabilities before attackers do.",
    level: "Intermediate",
    duration: "8–12 months",
    roles: ["Penetration Tester", "Red Team Associate", "VAPT Analyst"],
    outcomes: [
      "Test web apps against the OWASP Top 10",
      "Enumerate, exploit and escalate in lab networks",
      "Write professional pentest reports",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Networking & protocols deep dive",
        description: "Everything you'll enumerate later, understood properly.",
        hours: 18,
        resourceCount: 3,
        resources: [
          r("video", "Protocols every pentester must know", "2h 40m"),
          r("doc", "Nmap scanning reference", "PDF"),
          r("project", "Scan and map a lab network", "3h", true),
        ],
      },
      {
        title: "Linux & scripting",
        description: "Bash and Python for automating recon and exploitation.",
        hours: 18,
        resourceCount: 3,
        resources: [
          r("video", "Bash scripting for hackers", "1h 50m"),
          r("doc", "Python snippets for security tooling", "PDF"),
          r("quiz", "Scripting checkpoint", "15 min"),
        ],
      },
      { title: "Web apps & OWASP Top 10", description: "Injection, access control, SSRF and more.", hours: 24, resourceCount: 6 },
      { title: "Recon & enumeration", description: "Methodical information gathering.", hours: 14, resourceCount: 4 },
      { title: "Exploitation fundamentals", description: "Public exploits, payloads and shells.", hours: 20, resourceCount: 5 },
      { title: "Privilege escalation", description: "Linux and Windows escalation techniques.", hours: 20, resourceCount: 5 },
      { title: "Active Directory attacks", description: "Kerberos, lateral movement and domain compromise.", hours: 22, resourceCount: 5 },
      { title: "Reporting findings", description: "Severity, evidence and remediation advice.", hours: 8, resourceCount: 3 },
      { title: "CTF practice ladder", description: "Graded boxes from easy to exam-level.", hours: 40, resourceCount: 4, hasCheckpoint: false },
      { title: "Get certified: OSCP", description: "Exam strategy, time management and prep plan.", hours: 60, resourceCount: 4, certification: "OSCP" },
    ]),
  },
  {
    slug: "security-engineer",
    domainTag: "cybersecurity",
    title: "Security Engineer",
    summary: "Build secure systems — identity, networks, cloud and code.",
    level: "Intermediate",
    duration: "7–9 months",
    roles: ["Security Engineer", "Cloud Security Engineer", "AppSec Engineer"],
    outcomes: [
      "Design identity and network security controls",
      "Secure cloud workloads and CI pipelines",
      "Write detections and automate response",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Security foundations",
        description: "Threat modelling, controls and defence in depth.",
        hours: 12,
        resourceCount: 3,
        resources: [
          r("video", "Threat modelling in practice", "1h 30m"),
          r("doc", "STRIDE worksheet", "Template"),
          r("quiz", "Foundations checkpoint", "15 min"),
        ],
      },
      {
        title: "Python for security automation",
        description: "Scripts that parse logs, call APIs and fix things.",
        hours: 16,
        resourceCount: 3,
        resources: [
          r("video", "Automating security tasks with Python", "2h"),
          r("link", "Working with security APIs", "Article"),
          r("project", "Build a log-parsing alert bot", "4h", true),
        ],
      },
      { title: "Identity & access management", description: "SSO, MFA, least privilege and secrets.", hours: 14, resourceCount: 5 },
      { title: "Network security architecture", description: "Segmentation, firewalls and zero trust.", hours: 14, resourceCount: 4 },
      { title: "Cloud security", description: "Misconfigurations, IAM policies and posture tools.", hours: 18, resourceCount: 5 },
      { title: "Secure SDLC & AppSec", description: "SAST, DAST, dependency scanning and reviews.", hours: 16, resourceCount: 5 },
      { title: "Detection engineering", description: "Write, test and tune detections as code.", hours: 16, resourceCount: 4 },
      { title: "Certification milestone: Security+ → CISSP", description: "Start with Security+; plan CISSP as you gain experience.", hours: 30, resourceCount: 4, certification: "CompTIA Security+" },
    ]),
  },
  {
    slug: "grc-analyst",
    domainTag: "cybersecurity",
    title: "GRC Analyst",
    summary: "Governance, risk and compliance — the business side of security.",
    level: "Beginner",
    duration: "4–6 months",
    roles: ["GRC Analyst", "IT Auditor", "Compliance Analyst"],
    outcomes: [
      "Run risk assessments and maintain a risk register",
      "Map controls to ISO 27001",
      "Prepare evidence for audits",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "GRC fundamentals",
        description: "What governance, risk and compliance teams do.",
        hours: 8,
        resourceCount: 3,
        resources: [
          r("video", "GRC careers explained", "50m"),
          r("doc", "Key frameworks at a glance", "PDF"),
          r("quiz", "Fundamentals checkpoint", "10 min"),
        ],
      },
      {
        title: "Risk management basics",
        description: "Identify, score and treat risk.",
        hours: 10,
        resourceCount: 3,
        resources: [
          r("video", "Risk assessment walkthrough", "1h 10m"),
          r("doc", "Risk register template", "Template"),
          r("project", "Assess a sample company", "3h", true),
        ],
      },
      { title: "ISO 27001 controls", description: "Annex A controls and the ISMS.", hours: 16, resourceCount: 5 },
      { title: "Policies & procedures", description: "Write policies people actually follow.", hours: 8, resourceCount: 3 },
      { title: "Audits & evidence", description: "Prepare for internal and external audits.", hours: 10, resourceCount: 4 },
      { title: "Vendor risk", description: "Third-party assessments and questionnaires.", hours: 8, resourceCount: 3 },
      { title: "India's DPDP Act essentials", description: "Data protection obligations for Indian companies.", hours: 6, resourceCount: 3 },
      { title: "Get certified: ISO 27001 Lead Implementer", description: "Course options and exam prep.", hours: 24, resourceCount: 3, certification: "ISO 27001" },
    ]),
  },

  // -------------------------------------------------------------------- Cloud
  {
    slug: "aws-solutions-architect",
    domainTag: "cloud-computing",
    title: "AWS Solutions Architect",
    summary: "Design secure, scalable and cost-aware architectures on AWS.",
    level: "Beginner",
    duration: "4–6 months",
    roles: ["Cloud Engineer", "Solutions Architect Associate"],
    outcomes: [
      "Build networks, compute and storage on AWS",
      "Design for high availability and scale",
      "Pass the AWS SAA-C03 exam",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Cloud computing fundamentals",
        description: "IaaS/PaaS/SaaS, regions, pricing and shared responsibility.",
        hours: 8,
        resourceCount: 3,
        resources: [
          r("video", "Cloud concepts in plain English", "1h 15m"),
          r("doc", "Shared responsibility model explained", "PDF"),
          r("quiz", "Cloud basics checkpoint", "10 min"),
        ],
      },
      {
        title: "Linux & networking for cloud",
        description: "SSH, IP addressing, subnets and routing.",
        hours: 14,
        resourceCount: 3,
        resources: [
          r("video", "Subnetting without tears", "1h 30m"),
          r("doc", "CIDR quick reference", "PDF"),
          r("project", "Set up a Linux web server", "3h", true),
        ],
      },
      { title: "AWS core: IAM, EC2 & S3", description: "Identities, instances and object storage.", hours: 18, resourceCount: 6 },
      { title: "VPC design", description: "Public/private subnets, gateways and security groups.", hours: 14, resourceCount: 5 },
      { title: "Databases on AWS", description: "RDS, DynamoDB and choosing the right store.", hours: 12, resourceCount: 4 },
      { title: "High availability & scaling", description: "Load balancers, auto scaling and multi-AZ.", hours: 14, resourceCount: 5 },
      { title: "Well-Architected Framework", description: "The six pillars applied to real designs.", hours: 8, resourceCount: 3 },
      { title: "Hands-on architecture project", description: "Deploy a three-tier app with IaC.", hours: 20, resourceCount: 3, hasCheckpoint: false },
      { title: "Get certified: AWS SAA-C03", description: "Domain weightings, practice exams and plan.", hours: 30, resourceCount: 5, certification: "AWS SAA-C03" },
    ]),
  },
  {
    slug: "gcp-cloud-engineer",
    domainTag: "cloud-computing",
    title: "Google Cloud Engineer",
    summary: "Deploy and operate workloads on Google Cloud.",
    level: "Beginner",
    duration: "4–5 months",
    roles: ["Cloud Engineer", "GCP Associate"],
    outcomes: [
      "Manage projects, IAM and billing on GCP",
      "Run workloads on Compute Engine and GKE",
      "Pass the Associate Cloud Engineer exam",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Cloud computing fundamentals",
        description: "Core cloud concepts and how Google Cloud is organised.",
        hours: 8,
        resourceCount: 3,
        resources: [
          r("video", "Google Cloud in one hour", "1h"),
          r("doc", "Resource hierarchy diagram", "PDF"),
          r("quiz", "Fundamentals checkpoint", "10 min"),
        ],
      },
      {
        title: "Linux & networking basics",
        description: "Shell, SSH and IP networking for cloud work.",
        hours: 12,
        resourceCount: 3,
        resources: [
          r("video", "Linux essentials for cloud", "1h 40m"),
          r("doc", "Networking cheat sheet", "PDF"),
          r("project", "Deploy a VM and web server", "2h", true),
        ],
      },
      { title: "Projects, IAM & billing", description: "Organise resources and control access.", hours: 10, resourceCount: 4 },
      { title: "Compute Engine & GKE", description: "VMs, instance groups and Kubernetes.", hours: 18, resourceCount: 5 },
      { title: "Storage & databases", description: "Cloud Storage, Cloud SQL and BigQuery basics.", hours: 12, resourceCount: 4 },
      { title: "Networking on GCP", description: "VPCs, firewall rules and load balancing.", hours: 12, resourceCount: 4 },
      { title: "Monitoring & operations", description: "Logging, alerting and troubleshooting.", hours: 10, resourceCount: 3 },
      { title: "Get certified: Google ACE", description: "Exam guide and practice sets.", hours: 24, resourceCount: 4, certification: "Google Associate Cloud Engineer" },
    ]),
  },
  {
    slug: "azure-administrator",
    domainTag: "cloud-computing",
    title: "Azure Administrator",
    summary: "Run identity, compute, storage and networking on Microsoft Azure.",
    level: "Beginner",
    duration: "4–5 months",
    roles: ["Azure Administrator", "Cloud Support Engineer"],
    outcomes: [
      "Administer Entra ID users and access",
      "Deploy and secure Azure resources",
      "Pass AZ-104",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Azure fundamentals",
        description: "Core services, subscriptions and pricing.",
        hours: 8,
        resourceCount: 3,
        resources: [
          r("video", "Azure fundamentals walkthrough", "1h 20m"),
          r("doc", "AZ-900 concepts summary", "PDF"),
          r("quiz", "Fundamentals checkpoint", "10 min"),
        ],
      },
      {
        title: "Linux & PowerShell basics",
        description: "Scripting the tools admins use daily.",
        hours: 12,
        resourceCount: 3,
        resources: [
          r("video", "PowerShell for cloud admins", "1h 30m"),
          r("doc", "Azure CLI quick reference", "PDF"),
          r("project", "Automate resource creation", "2h", true),
        ],
      },
      { title: "Identity with Entra ID", description: "Users, groups, RBAC and conditional access.", hours: 12, resourceCount: 4 },
      { title: "Compute & storage", description: "VMs, App Service and storage accounts.", hours: 16, resourceCount: 5 },
      { title: "Virtual networking", description: "VNets, peering, NSGs and load balancers.", hours: 14, resourceCount: 4 },
      { title: "Governance & cost", description: "Policy, tags, budgets and resource locks.", hours: 8, resourceCount: 3 },
      { title: "Monitoring & backup", description: "Azure Monitor, alerts and recovery.", hours: 10, resourceCount: 3 },
      { title: "Get certified: AZ-104", description: "Exam skills outline and practice labs.", hours: 24, resourceCount: 4, certification: "AZ-104" },
    ]),
  },
  {
    slug: "devops-engineer",
    domainTag: "cloud-computing",
    title: "DevOps / Platform Engineer",
    summary: "Automate delivery and run the platforms developers build on.",
    level: "Intermediate",
    duration: "6–9 months",
    roles: ["DevOps Engineer", "Platform Engineer", "SRE Associate"],
    outcomes: [
      "Build CI/CD pipelines",
      "Run containers on Kubernetes",
      "Manage infrastructure as code with Terraform",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Linux & shell scripting",
        description: "Processes, services, networking and Bash.",
        hours: 16,
        resourceCount: 3,
        resources: [
          r("video", "Linux for DevOps", "2h 30m"),
          r("doc", "Bash scripting reference", "PDF"),
          r("project", "Automate server setup with Bash", "3h", true),
        ],
      },
      {
        title: "Git & collaboration",
        description: "Branching, pull requests and trunk-based development.",
        hours: 8,
        resourceCount: 3,
        resources: [
          r("video", "Git beyond the basics", "1h 10m"),
          r("link", "Interactive branching exercises", "Practice"),
          r("quiz", "Git checkpoint", "10 min"),
        ],
      },
      { title: "CI/CD pipelines", description: "Build, test and deploy automatically.", hours: 14, resourceCount: 5 },
      { title: "Containers with Docker", description: "Images, networking and compose.", hours: 14, resourceCount: 5 },
      { title: "Kubernetes", description: "Deployments, services, config and scaling.", hours: 24, resourceCount: 6 },
      { title: "Infrastructure as code", description: "Terraform modules, state and workflows.", hours: 16, resourceCount: 5 },
      { title: "Observability", description: "Metrics, logs, traces and on-call basics.", hours: 12, resourceCount: 4 },
      { title: "Platform capstone", description: "Ship a service with a full delivery pipeline.", hours: 24, resourceCount: 3, hasCheckpoint: false },
      { title: "Get certified: CKA", description: "Exam curriculum and hands-on practice.", hours: 30, resourceCount: 4, certification: "Certified Kubernetes Administrator" },
    ]),
  },

  // ---------------------------------------------------------- Ethical hacking
  {
    slug: "bug-bounty-hunter",
    domainTag: "ethical-hacking",
    title: "Bug Bounty Hunter",
    summary: "Find real vulnerabilities in web apps and report them responsibly for rewards.",
    level: "Intermediate",
    duration: "6–8 months",
    roles: ["Bug Bounty Researcher", "Web Application Security Tester", "AppSec Analyst"],
    outcomes: [
      "Map attack surface with recon automation",
      "Find and chain OWASP Top 10 vulnerabilities",
      "Write reports that get triaged and paid",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "How the web works",
        description: "HTTP, cookies, sessions, CORS and browsers — the bug hunter's foundation.",
        hours: 12,
        resourceCount: 3,
        resources: [
          r("video", "HTTP & browsers for hackers", "1h 50m"),
          r("doc", "Request/response anatomy sheet", "PDF"),
          r("project", "Intercept traffic with a proxy lab", "3h", true),
        ],
      },
      {
        title: "Bug bounty rules & ethics",
        description: "Scope, safe harbour, disclosure and staying on the right side of the law.",
        hours: 4,
        resourceCount: 3,
        resources: [
          r("video", "Reading a programme policy", "40m"),
          r("doc", "Responsible disclosure checklist", "PDF"),
          r("quiz", "In scope or out of scope?", "10 min"),
        ],
      },
      { title: "Recon & asset discovery", description: "Subdomains, endpoints, JS files and automation.", hours: 16, resourceCount: 5 },
      { title: "Injection vulnerabilities", description: "SQLi, command injection and template injection.", hours: 18, resourceCount: 5 },
      { title: "XSS & client-side bugs", description: "Reflected, stored and DOM XSS; CSP bypass basics.", hours: 16, resourceCount: 5 },
      { title: "Access control & IDOR", description: "Broken authorisation — the most-paid bug class.", hours: 14, resourceCount: 4 },
      { title: "SSRF, file upload & logic flaws", description: "High-impact bugs scanners miss.", hours: 16, resourceCount: 4 },
      { title: "Writing winning reports", description: "Impact, reproduction steps and PoCs.", hours: 6, resourceCount: 3 },
      { title: "Get certified: eJPT → OSCP", description: "Structured certs that back up your bounty profile.", hours: 40, resourceCount: 4, certification: "eJPT" },
    ]),
  },

  // --------------------------------------------------------- Data engineering
  {
    slug: "analytics-engineer",
    domainTag: "data-engineering",
    title: "Analytics Engineer",
    summary: "Model clean, tested data in the warehouse so analysts can trust every number.",
    level: "Intermediate",
    duration: "4–6 months",
    roles: ["Analytics Engineer", "BI Engineer", "Data Modeller"],
    outcomes: [
      "Transform raw data with dbt and SQL",
      "Test and document data models",
      "Serve reliable metrics to BI tools",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Advanced SQL",
        description: "CTEs, window functions and performance-minded queries.",
        hours: 16,
        resourceCount: 3,
        resources: [
          r("video", "Window functions deep dive", "2h"),
          r("doc", "Query optimisation checklist", "PDF"),
          r("project", "Rewrite slow queries challenge", "3h", true),
        ],
      },
      {
        title: "Dimensional modelling",
        description: "Facts, dimensions and designing for analytics.",
        hours: 12,
        resourceCount: 3,
        resources: [
          r("video", "Kimball modelling in practice", "1h 40m"),
          r("doc", "Model design worksheet", "Template"),
          r("quiz", "Facts vs dimensions check", "10 min"),
        ],
      },
      { title: "Transformations with dbt", description: "Models, refs, materialisations and packages.", hours: 18, resourceCount: 5 },
      { title: "Testing & documentation", description: "Data tests, contracts and lineage.", hours: 10, resourceCount: 4 },
      { title: "Version control & CI for data", description: "Git workflows and automated checks.", hours: 8, resourceCount: 3 },
      { title: "Semantic layer & metrics", description: "One definition of revenue for everyone.", hours: 10, resourceCount: 3 },
      { title: "BI delivery", description: "Serve models to Power BI, Looker or Metabase.", hours: 10, resourceCount: 4 },
      { title: "Capstone: modern data stack", description: "Ingest → dbt → dashboard, fully tested.", hours: 24, resourceCount: 3, hasCheckpoint: false },
    ]),
  },

  // --------------------------------------------------------------- Blockchain
  {
    slug: "solidity-developer",
    domainTag: "blockchain",
    title: "Solidity Developer",
    summary: "Write, test and deploy secure smart contracts on Ethereum-compatible chains.",
    level: "Intermediate",
    duration: "5–7 months",
    roles: ["Smart Contract Developer", "Blockchain Engineer"],
    outcomes: [
      "Explain how blocks, gas and wallets work",
      "Build and test contracts with modern tooling",
      "Avoid the most common contract vulnerabilities",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Blockchain fundamentals",
        description: "Hashes, blocks, consensus and why decentralisation matters.",
        hours: 10,
        resourceCount: 3,
        resources: [
          r("video", "Blockchain from first principles", "1h 30m"),
          r("doc", "Consensus mechanisms compared", "PDF"),
          r("quiz", "Fundamentals checkpoint", "10 min"),
        ],
      },
      {
        title: "Ethereum & wallets",
        description: "Accounts, transactions, gas and testnets.",
        hours: 8,
        resourceCount: 3,
        resources: [
          r("video", "Your first testnet transaction", "50m"),
          r("link", "Block explorer walkthrough", "Article"),
          r("project", "Trace a transaction end to end", "2h", true),
        ],
      },
      { title: "Solidity language basics", description: "Types, functions, modifiers and events.", hours: 18, resourceCount: 5 },
      { title: "Tooling: Hardhat & Foundry", description: "Compile, test and script deployments.", hours: 14, resourceCount: 4 },
      { title: "Token standards", description: "ERC-20, ERC-721 and ERC-1155 in practice.", hours: 12, resourceCount: 4 },
      { title: "Smart contract security", description: "Reentrancy, access control and audits.", hours: 16, resourceCount: 5 },
      { title: "Gas optimisation & upgrades", description: "Storage patterns and proxy contracts.", hours: 10, resourceCount: 3 },
      { title: "Capstone: launch a dApp contract", description: "Tested, verified and deployed to testnet.", hours: 24, resourceCount: 3, hasCheckpoint: false },
    ]),
  },
  {
    slug: "web3-frontend-developer",
    domainTag: "blockchain",
    title: "Web3 Frontend Developer",
    summary: "Build dApp interfaces that connect wallets and talk to smart contracts.",
    level: "Intermediate",
    duration: "4–6 months",
    roles: ["Web3 Frontend Developer", "dApp Developer"],
    outcomes: [
      "Build React apps with wallet connections",
      "Read and write contract data from the browser",
      "Ship polished, secure dApp UX",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Modern JavaScript & React",
        description: "Components, hooks and state for dApp UIs.",
        hours: 20,
        resourceCount: 3,
        resources: [
          r("video", "React essentials in one sitting", "2h 30m"),
          r("doc", "Hooks cheat sheet", "PDF"),
          r("project", "Build a crypto price tracker", "4h", true),
        ],
      },
      {
        title: "How dApps work",
        description: "Wallets, RPCs, ABIs and the request lifecycle.",
        hours: 8,
        resourceCount: 3,
        resources: [
          r("video", "dApp architecture explained", "1h"),
          r("doc", "ABI & RPC glossary", "PDF"),
          r("quiz", "Architecture checkpoint", "10 min"),
        ],
      },
      { title: "Wallet connections", description: "Connect, switch networks and sign messages.", hours: 10, resourceCount: 4 },
      { title: "Reading & writing contracts", description: "Typed contract calls and transaction states.", hours: 14, resourceCount: 4 },
      { title: "Indexing & data", description: "Events, subgraphs and caching.", hours: 10, resourceCount: 3 },
      { title: "dApp UX & security", description: "Clear signing, errors and phishing defence.", hours: 8, resourceCount: 3 },
      { title: "Capstone: NFT mint site", description: "Full dApp from wallet to confirmation.", hours: 20, resourceCount: 3, hasCheckpoint: false },
    ]),
  },
  upcoming("blockchain", "smart-contract-auditor", "Smart Contract Auditor", "Find vulnerabilities in on-chain code.", "Advanced"),

  // --------------------------------------------------------------- Full stack
  {
    slug: "full-stack-developer",
    domainTag: "full-stack",
    title: "Full Stack Developer (MERN)",
    summary: "Ship complete web products with MongoDB, Express, React and Node.js.",
    level: "Beginner",
    duration: "6–9 months",
    roles: ["Full Stack Developer", "Software Engineer (Web)", "MERN Developer"],
    outcomes: [
      "Build responsive UIs with React",
      "Design REST APIs with Node and Express",
      "Deploy authenticated, database-backed apps",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "HTML, CSS & responsive design",
        description: "Semantic markup, flexbox, grid and mobile-first layouts.",
        hours: 20,
        resourceCount: 3,
        resources: [
          r("video", "Responsive web design crash course", "3h"),
          r("doc", "Flexbox & grid visual guide", "PDF"),
          r("project", "Clone a landing page pixel-perfect", "5h", true),
        ],
      },
      {
        title: "JavaScript fundamentals",
        description: "Variables, functions, the DOM, async and fetch.",
        hours: 24,
        resourceCount: 3,
        resources: [
          r("video", "JavaScript for beginners", "4h"),
          r("link", "Interactive JS exercises", "Practice"),
          r("quiz", "JS fundamentals checkpoint", "20 min"),
        ],
      },
      { title: "Git & GitHub", description: "Branches, pull requests and collaboration.", hours: 6, resourceCount: 3 },
      { title: "React", description: "Components, state, routing and data fetching.", hours: 28, resourceCount: 6 },
      { title: "Node.js & Express APIs", description: "REST design, middleware and validation.", hours: 22, resourceCount: 5 },
      { title: "MongoDB & data modelling", description: "Schemas, queries and indexing.", hours: 14, resourceCount: 4 },
      { title: "Auth & security", description: "Sessions, JWT, hashing and OWASP basics.", hours: 12, resourceCount: 4 },
      { title: "Testing & deployment", description: "Unit tests, CI and deploying to the cloud.", hours: 12, resourceCount: 4 },
      { title: "Capstone: SaaS-style product", description: "A portfolio app with real users in mind.", hours: 40, resourceCount: 3, hasCheckpoint: false },
      { title: "Get certified: Meta Front-End Developer", description: "Certificate guide and portfolio tips.", hours: 20, resourceCount: 3, certification: "Meta Front-End Developer" },
    ]),
  },
  {
    slug: "frontend-developer",
    domainTag: "full-stack",
    title: "Frontend Developer",
    summary: "Craft fast, accessible and beautiful interfaces with React and TypeScript.",
    level: "Beginner",
    duration: "5–7 months",
    roles: ["Frontend Developer", "UI Engineer", "React Developer"],
    outcomes: [
      "Build accessible, responsive components",
      "Write type-safe React with TypeScript",
      "Optimise performance and ship to production",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "HTML & CSS foundations",
        description: "Semantic structure, layout systems and modern CSS.",
        hours: 18,
        resourceCount: 3,
        resources: [
          r("video", "Modern CSS in practice", "2h 40m"),
          r("doc", "Semantic HTML reference", "PDF"),
          r("project", "Build a responsive portfolio", "4h", true),
        ],
      },
      {
        title: "JavaScript essentials",
        description: "The language features you'll use every day.",
        hours: 22,
        resourceCount: 3,
        resources: [
          r("video", "Modern JavaScript (ES2015+)", "3h"),
          r("doc", "Array methods cheat sheet", "PDF"),
          r("quiz", "JS essentials checkpoint", "15 min"),
        ],
      },
      { title: "TypeScript", description: "Types, generics and typing React props.", hours: 12, resourceCount: 4 },
      { title: "React & Next.js", description: "Components, routing, server rendering.", hours: 28, resourceCount: 6 },
      { title: "Styling systems", description: "Tailwind, design tokens and component libraries.", hours: 10, resourceCount: 4 },
      { title: "Accessibility", description: "WCAG, keyboard navigation and screen readers.", hours: 8, resourceCount: 3 },
      { title: "Performance & testing", description: "Core Web Vitals, unit and e2e tests.", hours: 12, resourceCount: 4 },
      { title: "Capstone: production web app", description: "Deployed, tested and Lighthouse-green.", hours: 30, resourceCount: 3, hasCheckpoint: false },
    ]),
  },
  upcoming("full-stack", "backend-developer", "Backend Developer", "APIs, databases and services with Node or Python.", "Intermediate"),

  // ---------------------------------------------------------------------- IoT
  {
    slug: "iot-developer",
    domainTag: "iot",
    title: "IoT Developer",
    summary: "Build connected devices — from sensors and microcontrollers to cloud dashboards.",
    level: "Beginner",
    duration: "5–7 months",
    roles: ["IoT Developer", "Embedded Systems Engineer", "IoT Solutions Engineer"],
    outcomes: [
      "Wire sensors and program microcontrollers",
      "Send device data over MQTT and Wi-Fi/BLE",
      "Build cloud dashboards and alerts",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Electronics basics",
        description: "Voltage, current, circuits and reading datasheets.",
        hours: 12,
        resourceCount: 3,
        resources: [
          r("video", "Electronics for makers", "2h"),
          r("doc", "Ohm's law & components sheet", "PDF"),
          r("project", "Breadboard sensor circuit (simulator)", "2h", true),
        ],
      },
      {
        title: "Microcontrollers: Arduino & ESP32",
        description: "GPIO, analog input and your first firmware.",
        hours: 16,
        resourceCount: 3,
        resources: [
          r("video", "ESP32 getting started", "1h 45m"),
          r("link", "Online microcontroller simulator", "Practice"),
          r("quiz", "Microcontroller checkpoint", "10 min"),
        ],
      },
      { title: "Sensors & actuators", description: "Temperature, motion, relays and motors.", hours: 14, resourceCount: 4 },
      { title: "Embedded C/C++ & MicroPython", description: "Firmware structure, timing and interrupts.", hours: 18, resourceCount: 5 },
      { title: "Connectivity protocols", description: "Wi-Fi, BLE, LoRa and when to use each.", hours: 12, resourceCount: 4 },
      { title: "MQTT & cloud IoT platforms", description: "Publish/subscribe and device management.", hours: 14, resourceCount: 4 },
      { title: "Dashboards & data", description: "Visualise telemetry and trigger alerts.", hours: 10, resourceCount: 3 },
      { title: "IoT security", description: "Secure boot, OTA updates and credentials.", hours: 8, resourceCount: 3 },
      { title: "Capstone: smart device", description: "A connected product from sensor to app.", hours: 24, resourceCount: 3, hasCheckpoint: false },
    ]),
  },
  upcoming("iot", "industrial-iot-engineer", "Industrial IoT Engineer", "PLCs, SCADA and IIoT for factories and utilities.", "Intermediate"),

  // ----------------------------------------------------------- 5G technology
  {
    slug: "5g-network-engineer",
    domainTag: "5g-technology",
    title: "5G Network Engineer",
    summary: "Understand, deploy and operate 5G radio and core networks.",
    level: "Intermediate",
    duration: "6–8 months",
    roles: ["5G Network Engineer", "RAN Engineer", "Telecom Core Engineer"],
    outcomes: [
      "Explain 5G architecture from RAN to core",
      "Work with cloud-native 5G core functions",
      "Automate and monitor telecom networks",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "Networking fundamentals",
        description: "IP, routing, switching and the TCP/IP stack.",
        hours: 16,
        resourceCount: 3,
        resources: [
          r("video", "Computer networking essentials", "3h"),
          r("doc", "Subnetting quick reference", "PDF"),
          r("project", "Build a small routed network (simulator)", "3h", true),
        ],
      },
      {
        title: "Evolution of mobile networks",
        description: "2G to 5G — what changed and why it matters.",
        hours: 8,
        resourceCount: 3,
        resources: [
          r("video", "From GSM to 5G NR", "1h 20m"),
          r("doc", "Generations comparison chart", "PDF"),
          r("quiz", "Mobile generations checkpoint", "10 min"),
        ],
      },
      { title: "RF & radio fundamentals", description: "Spectrum, modulation, MIMO and beamforming.", hours: 16, resourceCount: 5 },
      { title: "5G NR & RAN architecture", description: "gNB, CU/DU split and Open RAN.", hours: 16, resourceCount: 5 },
      { title: "5G core (SBA)", description: "AMF, SMF, UPF and service-based architecture.", hours: 16, resourceCount: 5 },
      { title: "Network slicing & edge computing", description: "Slices, MEC and use cases.", hours: 10, resourceCount: 4 },
      { title: "Cloud-native telecom", description: "Kubernetes, CNFs and NFV.", hours: 14, resourceCount: 4 },
      { title: "Network automation", description: "Python, APIs and observability for telecom.", hours: 12, resourceCount: 4 },
      { title: "Get certified: Nokia Bell Labs 5G", description: "Certification tracks and prep plan.", hours: 20, resourceCount: 3, certification: "Nokia Bell Labs 5G Professional" },
    ]),
  },
  upcoming("5g-technology", "open-ran-engineer", "Open RAN Engineer", "Disaggregated, software-defined radio access networks.", "Advanced"),

  // -------------------------------------------------------------------- AR/VR
  {
    slug: "ar-vr-developer",
    domainTag: "ar-vr",
    title: "AR / VR Developer",
    summary: "Build immersive AR and VR experiences with Unity for headsets and phones.",
    level: "Beginner",
    duration: "5–7 months",
    roles: ["XR Developer", "Unity Developer", "AR Developer"],
    outcomes: [
      "Build 3D scenes and interactions in Unity",
      "Create AR apps for phones and VR apps for headsets",
      "Optimise and publish XR experiences",
    ],
    isPublished: true,
    dots: dots([
      {
        title: "3D fundamentals",
        description: "Coordinates, meshes, materials, lighting and cameras.",
        hours: 10,
        resourceCount: 3,
        resources: [
          r("video", "3D graphics concepts for developers", "1h 30m"),
          r("doc", "Transforms & coordinate systems", "PDF"),
          r("quiz", "3D basics checkpoint", "10 min"),
        ],
      },
      {
        title: "Unity & C# basics",
        description: "Editor, GameObjects, scripts and physics.",
        hours: 20,
        resourceCount: 3,
        resources: [
          r("video", "Unity for complete beginners", "3h"),
          r("doc", "C# in Unity cheat sheet", "PDF"),
          r("project", "Build a roll-a-ball mini game", "4h", true),
        ],
      },
      { title: "XR interaction design", description: "Comfort, locomotion and spatial UI.", hours: 10, resourceCount: 4 },
      { title: "VR development", description: "XR Interaction Toolkit, grabbing and teleporting.", hours: 18, resourceCount: 5 },
      { title: "AR development", description: "AR Foundation, plane detection and anchors.", hours: 16, resourceCount: 5 },
      { title: "Performance optimisation", description: "Frame rates, draw calls and profiling.", hours: 10, resourceCount: 3 },
      { title: "Publishing XR apps", description: "Build, test on device and release.", hours: 8, resourceCount: 3 },
      { title: "Capstone: immersive experience", description: "A polished AR or VR portfolio piece.", hours: 30, resourceCount: 3, hasCheckpoint: false },
      { title: "Get certified: Unity VR Developer", description: "Exam objectives and practice.", hours: 16, resourceCount: 3, certification: "Unity Certified User: VR Developer" },
    ]),
  },
  upcoming("ar-vr", "webxr-developer", "WebXR Developer", "Immersive experiences that run right in the browser.", "Intermediate"),

  // ------------------------------------------------------------- AI/ML extra
  upcoming("ai-ml", "computer-vision-engineer", "Computer Vision Engineer", "Teach machines to see — detection, segmentation and tracking.", "Advanced"),
];

/* ------------------------------------------------------------------ */
/* Queries — replace with Prisma calls later                           */
/* ------------------------------------------------------------------ */

export function getDomain(tag: string) {
  return domains.find((d) => d.tag === tag);
}

export function getPathsByDomain(tag: DomainTag) {
  return paths.filter((p) => p.domainTag === tag);
}

export function getPath(domainTag: string, slug: string) {
  return paths.find((p) => p.domainTag === domainTag && p.slug === slug && p.isPublished);
}

export function getPublishedPaths() {
  return paths.filter((p) => p.isPublished);
}

export function pathHours(path: CareerPath) {
  return path.dots.reduce((sum, d) => sum + d.hours, 0);
}

export function pathHref(path: Pick<CareerPath, "domainTag" | "slug">) {
  return `/resources/${path.domainTag}/${path.slug}`;
}

export function domainHref(tag: DomainTag) {
  return `/resources/${tag}`;
}

/** Real numbers from the catalogue — used for the animated stats. */
export function catalogStats() {
  const published = getPublishedPaths();
  return {
    domains: domains.length,
    paths: published.length,
    dots: published.reduce((n, p) => n + p.dots.length, 0),
    certifications: new Set(published.flatMap((p) => p.dots.map((d) => d.certification).filter(Boolean))).size,
  };
}
