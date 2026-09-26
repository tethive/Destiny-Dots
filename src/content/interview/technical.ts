import type { BankQuestion } from "@/content/interview/types";

/** Role-specific questions. The AI grades answers against the model answer and asks a follow-up. */
export const technicalBank: BankQuestion[] = [
  /* ------------------------------------------------------------------ Cyber */
  {
    id: "tech-cyber-01",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "BEGINNER",
    topic: "Security fundamentals",
    domainTags: ["cybersecurity"],
    prompt: "What is the CIA triad, and can you give a real example of a control that protects each part?",
    modelAnswer:
      "Confidentiality, Integrity and Availability. Confidentiality keeps data secret — encryption at rest and in transit, least-privilege access, MFA. Integrity keeps data correct and unaltered — hashing, digital signatures, change control, file integrity monitoring. Availability keeps systems usable — backups, redundancy, DDoS protection, patching. A strong answer notes the trade-offs: heavy controls on confidentiality can hurt availability.",
    minutes: 3,
  },
  {
    id: "tech-cyber-02",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "BEGINNER",
    topic: "Networking",
    domainTags: ["cybersecurity", "5g-technology"],
    prompt: "Explain the difference between TCP and UDP, and walk me through the TCP three-way handshake.",
    modelAnswer:
      "TCP is connection-oriented and reliable: ordered delivery, retransmission, flow and congestion control — used for HTTP, SSH, email. UDP is connectionless with no delivery guarantee, so it is faster and used for DNS, VoIP, video and gaming. The handshake: client sends SYN with its sequence number, server replies SYN-ACK acknowledging it and sending its own, client sends ACK. Teardown uses FIN/ACK. Mentioning SYN floods and why they work shows depth.",
    minutes: 3,
  },
  {
    id: "tech-cyber-03",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Cryptography",
    domainTags: ["cybersecurity", "blockchain"],
    prompt: "When would you use symmetric encryption versus asymmetric encryption? How does HTTPS use both?",
    modelAnswer:
      "Symmetric (AES) uses one shared key: fast, good for bulk data, but key distribution is the problem. Asymmetric (RSA, ECC) uses a public/private key pair: solves key exchange and enables signatures, but is slow. HTTPS uses both — the TLS handshake authenticates the server with its certificate and agrees a shared secret (today usually ECDHE, giving forward secrecy), then the session itself is encrypted symmetrically with AES-GCM or ChaCha20. Hashing (SHA-256) covers integrity.",
    minutes: 4,
  },
  {
    id: "tech-cyber-04",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Incident response",
    domainTags: ["cybersecurity"],
    prompt: "A user reports a suspicious email and says they clicked the link. Walk me through your triage.",
    modelAnswer:
      "Contain first: isolate the host if there are signs of execution, reset the user's credentials and revoke sessions. Collect evidence: the full email with headers, the URL and any attachment hashes, proxy and EDR logs for that host and user. Analyse in a safe environment or with threat intel — is the domain known bad, was a payload downloaded, did credentials get submitted? Scope it: search mail logs for the same sender or URL across the organisation and pull those messages. Eradicate and recover, then close the loop: block the indicators, note detection gaps, tell the user what happened without blaming them.",
    minutes: 5,
  },
  {
    id: "tech-cyber-05",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Detection engineering",
    domainTags: ["cybersecurity"],
    prompt: "How would you tell a true positive from a false positive when an alert fires for PowerShell spawned by Word?",
    modelAnswer:
      "Look at the process tree and the command line: encoded commands, download cradles or references to remote URLs are strong signals. Check the parent document, where it came from and whether the user expected it. Correlate with network connections from that host, new persistence (run keys, scheduled tasks) and any child processes. Compare against a baseline — some finance or macro-heavy teams legitimately run scripts. Tune the rule with allowlists based on signed macros or specific paths rather than switching it off, and note the MITRE ATT&CK technique (T1059.001) for tracking.",
    minutes: 5,
  },

  /* ---------------------------------------------------------- Ethical hacking */
  {
    id: "tech-hack-01",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "BEGINNER",
    topic: "Web vulnerabilities",
    domainTags: ["ethical-hacking", "cybersecurity", "full-stack"],
    prompt: "Explain SQL injection to a developer, and tell them exactly how to fix it.",
    modelAnswer:
      "User input is concatenated into a SQL statement, so the input can change the query's meaning — reading other users' rows, bypassing login, or dumping tables. The fix is parameterised queries or prepared statements, where the query structure is fixed and input is only ever data. Supporting measures: an ORM used correctly, least-privilege database accounts, input validation and allowlists for things like sort columns that can't be parameterised, and WAF rules as a stopgap. Escaping by hand is not a reliable fix.",
    minutes: 3,
  },
  {
    id: "tech-hack-02",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Methodology",
    domainTags: ["ethical-hacking"],
    prompt: "What is the difference between a vulnerability scan and a penetration test? When is each appropriate?",
    modelAnswer:
      "A vulnerability scan is automated, broad and mostly signature-based: it lists known weaknesses with little context, is cheap, and suits continuous monthly or weekly coverage. A penetration test is human-led: it chains findings, tests business logic and access control that scanners miss, proves real impact, and produces prioritised, contextual recommendations — but it costs more and is point-in-time. Scans for routine hygiene and compliance; pentests before launches, after major changes, or annually for certification. Mentioning scope, rules of engagement and safe harbour earns extra credit.",
    minutes: 4,
  },
  {
    id: "tech-hack-03",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "ADVANCED",
    topic: "Privilege escalation",
    domainTags: ["ethical-hacking"],
    prompt: "You have a low-privileged shell on a Linux host. How do you look for a path to root?",
    modelAnswer:
      "Enumerate systematically: kernel and distribution version against known exploits; sudo -l for allowed commands and GTFOBins tricks; SUID/SGID binaries; writable files, scripts and directories in PATH; cron jobs running as root; capabilities; running services on localhost; credentials in config files, history and environment variables; group memberships such as docker, lxd or disk. Automate the sweep with LinPEAS but verify by hand. Pick the quietest reliable path, document each step for the report, and avoid anything that risks stability on a production host.",
    minutes: 5,
  },

  /* ------------------------------------------------------------------ AI/ML */
  {
    id: "tech-ml-01",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "BEGINNER",
    topic: "Model fundamentals",
    domainTags: ["ai-ml"],
    prompt: "What is overfitting? How do you detect it and what do you do about it?",
    modelAnswer:
      "The model learns noise specific to the training set, so training error keeps falling while validation error rises. Detect it by holding out validation data, watching the gap between training and validation metrics, and using cross-validation. Fixes: more or better data, augmentation, simpler models or fewer features, regularisation (L1/L2, dropout, early stopping), and cross-validated hyperparameter tuning. Also check for leakage, which looks like great validation scores and poor production performance.",
    minutes: 3,
  },
  {
    id: "tech-ml-02",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Evaluation",
    domainTags: ["ai-ml", "data-analysis"],
    prompt: "Precision or recall — which would you optimise for a fraud detection model, and why?",
    modelAnswer:
      "Recall matters more when missing a fraudulent transaction is costlier than reviewing a legitimate one, which is usually the case; but precision protects customer experience and analyst time. In practice you pick a threshold from the precision-recall curve to meet a business constraint — for example the maximum number of cases a review team can handle per day. Accuracy is useless here because the classes are heavily imbalanced. Mention PR-AUC over ROC-AUC for rare positives, and the cost matrix behind the decision.",
    minutes: 4,
  },
  {
    id: "tech-ml-03",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Training",
    domainTags: ["ai-ml"],
    prompt: "Explain gradient descent, and what learning rate and batch size actually change.",
    modelAnswer:
      "Gradient descent updates parameters in the direction that reduces the loss, step size set by the learning rate. Too high and training diverges or oscillates; too low and it crawls or gets stuck — hence schedules and warm-up. Batch size sets how many samples the gradient is estimated from: small batches are noisy but regularise and fit in memory; large batches are smoother and faster per epoch but can generalise worse and need a scaled learning rate. Variants like SGD with momentum, Adam and AdamW adapt the step per parameter.",
    minutes: 4,
  },
  {
    id: "tech-ml-04",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Data splits",
    domainTags: ["ai-ml", "data-engineering"],
    prompt: "What is data leakage, and how do you prevent it in a time-series problem?",
    modelAnswer:
      "Leakage is when information unavailable at prediction time slips into training, so offline scores look great and production fails. Classic causes: scaling or imputing before the split, target-derived features, duplicate rows across splits, and using future data. For time series, split chronologically rather than randomly, use walk-forward or rolling-origin validation, compute rolling features only from past windows, and respect any reporting lag in the source data. Fit all preprocessing inside the training fold, ideally in a pipeline.",
    minutes: 4,
  },
  {
    id: "tech-ml-05",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "ADVANCED",
    topic: "LLM applications",
    domainTags: ["ai-ml"],
    prompt: "A RAG chatbot keeps answering from the wrong document. How do you debug and improve it?",
    modelAnswer:
      "Separate retrieval from generation. Measure retrieval alone: for a labelled set of questions, is the right chunk in the top-k? If not, the problem is chunking (size, overlap, splitting mid-section), the embedding model, missing metadata filters, or the query itself — try query rewriting, hybrid keyword plus vector search, and a reranker. If retrieval is right but answers are wrong, fix the prompt: instruct the model to answer only from context, require citations, and handle 'not in the documents'. Add an eval set with scores you track per change, and log retrieved chunks in production so failures are reproducible.",
    minutes: 5,
  },

  /* ---------------------------------------------------------- Data analysis */
  {
    id: "tech-da-01",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "BEGINNER",
    topic: "SQL joins",
    domainTags: ["data-analysis", "data-engineering"],
    prompt: "Explain the difference between an INNER JOIN and a LEFT JOIN, with an example where the choice changes the answer.",
    modelAnswer:
      "INNER JOIN keeps only rows that match in both tables; LEFT JOIN keeps every row from the left table and fills unmatched right-hand columns with NULL. Counting orders per customer with an INNER JOIN silently drops customers with zero orders, understating the customer count; a LEFT JOIN keeps them and COUNT of the order id returns 0. A common trap is putting a filter on the right table in the WHERE clause, which turns a LEFT JOIN back into an inner join — that condition belongs in the ON clause.",
    minutes: 3,
  },
  {
    id: "tech-da-02",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "SQL window functions",
    domainTags: ["data-analysis", "data-engineering"],
    prompt: "Give a business question you would answer with a window function, and explain how it works.",
    modelAnswer:
      "Examples: rank products by revenue within each region, month-over-month growth with LAG, a running total of daily sales, or each customer's most recent order. A window function computes across a set of rows related to the current row without collapsing them, unlike GROUP BY: PARTITION BY defines the group, ORDER BY the sequence, and the frame clause the sliding window. So ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue DESC) numbers products inside each region while keeping every row visible.",
    minutes: 4,
  },
  {
    id: "tech-da-03",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "BEGINNER",
    topic: "Data cleaning",
    domainTags: ["data-analysis"],
    prompt: "A dataset has 15% missing values in an important column. What do you do?",
    modelAnswer:
      "First understand why they are missing — random, or related to something systematic like a form field added later or a sensor failure, because that decides what is safe. Options: drop rows only if few and missing at random; impute with median or mode for simple cases, or a model-based or grouped imputation when the column matters; add a 'was missing' indicator so the model can use that signal; or treat missing as its own category for categorical data. Whatever you choose, document it, apply it inside the pipeline so it can't leak, and check how much the result changes under different choices.",
    minutes: 3,
  },
  {
    id: "tech-da-04",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Statistics",
    domainTags: ["data-analysis", "ai-ml"],
    prompt: "Explain a p-value to a marketing manager who has no statistics background.",
    modelAnswer:
      "It answers: if the change really did nothing, how often would we see a result at least this big just by chance? A small p-value (say under 0.05) means the result would be unlikely from luck alone, so we treat it as real. It does not tell you the probability the change works, nor how big the effect is — pair it with the effect size and a confidence interval. Watch out for peeking at results early, testing many variants and small samples, all of which produce convincing-looking noise.",
    minutes: 4,
  },
  {
    id: "tech-da-05",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Dashboards",
    domainTags: ["data-analysis"],
    prompt: "A sales head asks for “a dashboard with everything”. How do you handle it?",
    modelAnswer:
      "Push back gently and start with decisions, not charts: what will you do differently depending on what this shows? Agree on three to five metrics tied to those decisions, their exact definitions and grain, and who looks at it how often. Design top-down — headline numbers with comparisons against target or last period, then a small number of breakdowns, then detail on drill-through. Keep one chart per question, label clearly, show data freshness, and agree what happens when a number looks wrong. Ship a small version, watch it being used, then iterate.",
    minutes: 4,
  },

  /* -------------------------------------------------------- Data engineering */
  {
    id: "tech-de-01",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "BEGINNER",
    topic: "Pipeline design",
    domainTags: ["data-engineering"],
    prompt: "When would you choose batch processing over streaming, and what does streaming cost you?",
    modelAnswer:
      "Batch suits work where minutes or hours of latency are fine: daily reporting, model training sets, heavy joins and backfills. It is simpler to test, cheaper, and easy to re-run. Streaming is for cases where the value decays fast — fraud checks, live dashboards, alerting. The cost is complexity: out-of-order and late events, watermarks, exactly-once semantics, state stores, harder testing and debugging, and always-on infrastructure. Many teams run a hybrid: streaming for the freshness-critical slice, batch for correctness and reprocessing.",
    minutes: 4,
  },
  {
    id: "tech-de-02",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Modelling",
    domainTags: ["data-engineering", "data-analysis"],
    prompt: "Why do analytics warehouses use star schemas instead of the normalised model an application uses?",
    modelAnswer:
      "Application databases normalise to avoid update anomalies and keep writes cheap. Warehouses are read-heavy, so a star schema — a fact table of events with foreign keys to descriptive dimension tables — means fewer joins, simpler queries for analysts, and better use of columnar storage and partition pruning. Dimensions are deliberately denormalised and use surrogate keys, with slowly changing dimension handling (usually type 2) so history is preserved. Mentioning grain — one row per what — is the sign of someone who has actually modelled data.",
    minutes: 4,
  },
  {
    id: "tech-de-03",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Reliability",
    domainTags: ["data-engineering"],
    prompt: "What does it mean for a pipeline to be idempotent, and how do you build one?",
    modelAnswer:
      "Running it twice with the same input leaves the same result — essential because retries, backfills and partial failures are normal. Techniques: write to a partition keyed by the run's logical date and overwrite it rather than appending; use MERGE or upserts on a natural key; stage output and swap atomically; deduplicate on an event id; make downstream consumers tolerant of replays. Avoid 'insert whatever arrived since last time' with no key, and avoid side effects such as emails that cannot be undone on retry.",
    minutes: 4,
  },
  {
    id: "tech-de-04",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Storage & performance",
    domainTags: ["data-engineering"],
    prompt: "A Spark job over Parquet in cloud storage is slow. What do you look at?",
    modelAnswer:
      "Check the data layout first: too many small files, or a few huge ones, both hurt — compact to a sensible file size and partition on a column that actually filters queries, without over-partitioning. Then the query: push filters and column pruning down, avoid wide shuffles and cartesian joins, broadcast the small side of a join, and look for skew on hot keys (salting or adaptive execution helps). Check the Spark UI for stage-level spill, GC time and straggler tasks, and confirm the cluster is not simply under-resourced or throttled by storage.",
    minutes: 5,
  },
  {
    id: "tech-de-05",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "ADVANCED",
    topic: "Data quality",
    domainTags: ["data-engineering", "data-analysis"],
    prompt: "An upstream team changes a column's meaning without telling you. How do you stop this hurting dashboards?",
    modelAnswer:
      "Treat the interface as a contract: agreed schema, types, nullability and semantics, versioned and checked in CI. Add tests at ingestion — schema checks, null and range expectations, accepted values, row-count and distribution drift — and fail or quarantine rather than silently loading. Track lineage so you can see which dashboards depend on the column, alert the owning team and consumers, and keep raw data immutable so you can reprocess once the meaning is clear. Longer term, agree change notification and deprecation windows with upstream owners.",
    minutes: 5,
  },

  /* ------------------------------------------------------------------ Cloud */
  {
    id: "tech-cloud-01",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "BEGINNER",
    topic: "Cloud basics",
    domainTags: ["cloud-computing"],
    prompt: "Explain IaaS, PaaS and SaaS with an example of each, and who is responsible for what.",
    modelAnswer:
      "IaaS gives raw building blocks — EC2, virtual networks, disks — and you manage the OS, runtime, patching and scaling. PaaS gives a managed platform such as App Service, App Engine or RDS: you bring code or data, the provider handles the OS and much of the operations. SaaS is finished software like Gmail or Salesforce, where you only manage users and data. The shared responsibility model is the thread running through it: the provider secures the cloud, you secure what you put in it — your data, identities and configuration — at every level.",
    minutes: 3,
  },
  {
    id: "tech-cloud-02",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "High availability",
    domainTags: ["cloud-computing"],
    prompt: "What is the difference between a region and an availability zone, and how does that shape a highly available design?",
    modelAnswer:
      "A region is a geographic location; an availability zone is an isolated datacentre (or group) within it, with independent power and cooling but low-latency links to its siblings. Standard HA: run instances in at least two AZs behind a load balancer, use multi-AZ managed databases with automatic failover, and keep state outside the instances in object storage or a managed store. Multi-region is for disaster recovery or global latency and costs much more — decide with an explicit RTO and RPO, and test failover rather than assuming it works.",
    minutes: 4,
  },
  {
    id: "tech-cloud-03",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Identity",
    domainTags: ["cloud-computing", "cybersecurity"],
    prompt: "How would you apply least privilege in a cloud account where developers keep asking for admin?",
    modelAnswer:
      "Start from roles, not people: define job-function roles with only the permissions their work needs, and attach them to groups. Give applications workload identities or instance roles rather than long-lived keys. Use temporary elevation with approval and an expiry for the rare admin task, and log it. Separate environments into different accounts, projects or subscriptions so a mistake in dev cannot touch production. Use the provider's access analyser and unused-permission reports to trim over time, and guardrails (SCPs, Azure Policy, org policies) to make dangerous actions impossible rather than merely discouraged.",
    minutes: 5,
  },
  {
    id: "tech-cloud-04",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Scaling",
    domainTags: ["cloud-computing"],
    prompt: "Traffic to a web app triples every evening. How do you handle it without paying for peak capacity all day?",
    modelAnswer:
      "Horizontal autoscaling behind a load balancer, driven by a signal that tracks user pain — request concurrency or latency, not just CPU. Set sensible minimums so a cold start does not meet the spike, use scheduled scaling for a known evening pattern, and keep instances stateless so they can come and go. Cache aggressively: CDN for static assets, application cache for hot reads, and connection pooling so the database is not the bottleneck. Queue work that does not need to be synchronous. Watch scale-in policies so you do not flap, and load test the pattern before it matters.",
    minutes: 4,
  },
  {
    id: "tech-cloud-05",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "ADVANCED",
    topic: "Cost",
    domainTags: ["cloud-computing"],
    prompt: "Your cloud bill doubled this quarter. Walk me through finding out why and fixing it.",
    modelAnswer:
      "Get visibility first: cost explorer grouped by service, account and tag, comparing against last quarter to find the delta rather than the biggest line. Usual culprits: idle or oversized instances, forgotten environments, storage class and snapshot sprawl, cross-AZ or egress traffic, logging volume, and a new feature's query pattern. Fix in order of effort: kill waste, right-size, move cold data to cheaper tiers, add autoscaling and schedules for non-production, then commit to savings plans or reserved capacity for the steady baseline. Prevent recurrence with tagging standards, budgets and alerts, and showback to the teams that spend.",
    minutes: 5,
  },

  /* ------------------------------------------------------------- Full stack */
  {
    id: "tech-fs-01",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "BEGINNER",
    topic: "API design",
    domainTags: ["full-stack"],
    prompt: "Design the REST endpoints for a blog with posts and comments. Which status codes do you return?",
    modelAnswer:
      "Nouns and plurals: GET /posts (list, paginated), POST /posts (create), GET /posts/:id, PATCH /posts/:id, DELETE /posts/:id, and nested GET/POST /posts/:id/comments. Status codes: 200 for success, 201 with a Location header for creation, 204 for a delete with no body, 400 for malformed input, 401 unauthenticated, 403 authenticated but not allowed, 404 not found, 409 conflict, 422 for validation failures, 429 rate limited, 500 for server faults. Mention pagination, filtering, sorting, consistent error shapes and versioning.",
    minutes: 4,
  },
  {
    id: "tech-fs-02",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Databases",
    domainTags: ["full-stack"],
    prompt: "How do you decide between a relational database and a document store for a new product?",
    modelAnswer:
      "Start from the data and the queries. Relational fits when entities have clear relationships, you need joins, multi-row transactions and strong constraints — which is most business software, and Postgres also handles JSON when you need it. Document stores fit flexible or evolving shapes, documents read and written whole, or very high write throughput where you can design around the access pattern. The honest answer names the trade-off: schema flexibility now versus integrity and ad-hoc querying later, and that migrating data models later is expensive either way.",
    minutes: 4,
  },
  {
    id: "tech-fs-03",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Authentication",
    domainTags: ["full-stack", "cybersecurity"],
    prompt: "Sessions or JWTs for a web app? Explain the trade-off and how you store them safely.",
    modelAnswer:
      "Server-side sessions with an opaque cookie are simpler and can be revoked instantly, at the cost of a lookup — fine for most apps, and the default choice for a browser product. JWTs are stateless and useful across services, but cannot be revoked before expiry without extra state, so you keep access tokens short-lived and pair them with refresh tokens. Either way: store the token in an HttpOnly, Secure, SameSite cookie rather than localStorage, protect against CSRF, hash passwords with bcrypt or argon2, rotate on privilege change, and never put sensitive data in a JWT payload since it is only signed, not encrypted.",
    minutes: 5,
  },
  {
    id: "tech-fs-04",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "React",
    domainTags: ["full-stack"],
    prompt: "A React list re-renders on every keystroke and feels sluggish. How do you diagnose and fix it?",
    modelAnswer:
      "Profile first with React DevTools to see what re-renders and why, rather than guessing. Common causes: state held too high so every keystroke re-renders the whole tree, new object or function identities passed as props each render, expensive work in the render path, and unstable keys forcing remounts. Fixes: move state down or keep the input local, memoise expensive computations, virtualise long lists, debounce the search itself, and split components so the typing path is small. Reach for memo and useCallback after measuring — they add cost and are not a blanket fix.",
    minutes: 4,
  },
  {
    id: "tech-fs-05",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "ADVANCED",
    topic: "Debugging",
    domainTags: ["full-stack"],
    prompt: "Users say the app is “slow”. You have no other information. What do you do?",
    modelAnswer:
      "Turn it into something measurable: which users, which pages, when it started, and slow to first byte or slow to interact? Split the request path — network and CDN, server time, database, and the browser. Check real-user metrics (Core Web Vitals) alongside server latency percentiles, especially p95 rather than averages, and look for a deploy or data-volume change that lines up with the start. Typical culprits: N+1 queries or a missing index, unbounded payloads, render-blocking assets, oversized images, cold starts, and chatty client calls. Fix the biggest contributor, verify with the same metric, then add an alert so the regression is caught next time.",
    minutes: 5,
  },

  /* ------------------------------------------------------------- Blockchain */
  {
    id: "tech-bc-01",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "BEGINNER",
    topic: "Ethereum basics",
    domainTags: ["blockchain"],
    prompt: "What is gas, and what practical things make a contract cheaper to use?",
    modelAnswer:
      "Gas prices the computation and storage a transaction consumes, paid in ETH; the fee is gas used times gas price, so wasteful code costs users real money. Cheaper contracts: minimise storage writes (by far the costliest operation) and read into memory first, pack variables into the same storage slot, use calldata for read-only arguments, avoid unbounded loops over arrays, emit events instead of storing data only needed off-chain, and use immutable or constant where possible. Batching and layer-2 deployment help more than micro-optimisation for most apps.",
    minutes: 4,
  },
  {
    id: "tech-bc-02",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Smart contract security",
    domainTags: ["blockchain", "ethical-hacking"],
    prompt: "Explain a reentrancy attack and the ways to prevent it.",
    modelAnswer:
      "If a contract sends ETH (or calls an external contract) before updating its own state, the receiving contract's fallback can call back in and repeat the withdrawal while the balance still looks unspent — the DAO hack. Prevention: checks-effects-interactions, so state is updated before the external call; a reentrancy guard such as OpenZeppelin's nonReentrant; preferring pull payments over push; and being careful with cross-function and read-only reentrancy, where a view function is queried mid-call. Audits and invariant tests catch the cases patterns miss.",
    minutes: 5,
  },
  {
    id: "tech-bc-03",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "BEGINNER",
    topic: "Token standards",
    domainTags: ["blockchain"],
    prompt: "What is the difference between ERC-20, ERC-721 and ERC-1155?",
    modelAnswer:
      "ERC-20 is fungible: every unit is identical and balances are numbers — currencies, governance and utility tokens. ERC-721 is non-fungible: each token id is unique with its own owner and metadata — art, collectibles, tickets. ERC-1155 is a multi-token standard where one contract holds many token types, fungible or not, with batch transfers — efficient for games and editions. A good answer mentions approval patterns (approve/transferFrom, setApprovalForAll) and the phishing risk of unlimited approvals.",
    minutes: 3,
  },

  /* -------------------------------------------------------------------- IoT */
  {
    id: "tech-iot-01",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "BEGINNER",
    topic: "Protocols",
    domainTags: ["iot"],
    prompt: "Why do IoT devices usually speak MQTT rather than plain HTTP?",
    modelAnswer:
      "MQTT is publish/subscribe over a long-lived TCP connection with a tiny header, so it suits constrained devices on flaky, low-bandwidth networks: no repeated connection setup, server-initiated push to devices, quality-of-service levels for delivery, retained messages and last-will notifications when a device drops. HTTP is request/response, heavier per message, and awkward for pushing commands down to a device behind NAT. HTTP still makes sense for firmware downloads and occasional large payloads, so many products use both.",
    minutes: 3,
  },
  {
    id: "tech-iot-02",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Power",
    domainTags: ["iot"],
    prompt: "A battery sensor must run for a year on a coin cell. What drives that, and what do you change?",
    modelAnswer:
      "Average current is what matters: the device should spend almost all its time in deep sleep at microamps, waking briefly to measure and transmit. Radio is the biggest consumer, so send less and less often — batch readings, only report on change or threshold, and shrink the payload. Choose the right radio (BLE or LoRa over Wi-Fi), lower transmit power where range allows, and cut peripheral draw with sensor duty cycling and efficient regulators. Then measure the real current profile with a power analyser instead of trusting the datasheet, and account for battery self-discharge and temperature.",
    minutes: 4,
  },
  {
    id: "tech-iot-03",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "ADVANCED",
    topic: "Firmware updates",
    domainTags: ["iot", "cybersecurity"],
    prompt: "How do you design over-the-air updates so a bad release does not brick thousands of devices?",
    modelAnswer:
      "Sign every image and verify the signature on-device with a key in secure storage, with rollback protection against downgrade attacks. Use A/B partitions or a bootloader that can fall back: write the new image to the spare slot, verify the checksum, boot once in trial mode and only mark it good after the device checks in. Roll out in stages — internal, then a small percentage, watching crash and check-in rates with an automatic halt — and keep a recovery path (a minimal known-good image) for the worst case. Resume interrupted downloads and never update on low battery.",
    minutes: 5,
  },

  /* --------------------------------------------------------------------- 5G */
  {
    id: "tech-5g-01",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "5G architecture",
    domainTags: ["5g-technology"],
    prompt: "What is the difference between 5G non-standalone and standalone, and why does it matter?",
    modelAnswer:
      "Non-standalone keeps the 4G EPC core and LTE anchor, adding 5G NR radio for capacity and speed — quick to deploy and how most operators started. Standalone uses the 5G core with its service-based architecture, so you get the features that actually differentiate 5G: lower latency, network slicing, edge integration, better device power saving and massive machine-type connectivity. Standalone needs core investment and device support, which is why rollouts are phased — enterprise and fixed wireless use cases usually justify it first.",
    minutes: 4,
  },
  {
    id: "tech-5g-02",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "Network slicing",
    domainTags: ["5g-technology"],
    prompt: "Explain network slicing and give a use case where it earns its keep.",
    modelAnswer:
      "Slicing runs multiple logical networks over shared physical infrastructure, each with its own performance and isolation guarantees, described by the slice identifier and enforced from RAN through transport to the core. A factory can have a low-latency, high-reliability slice for machine control that is unaffected by visitors streaming video on the public slice; a broadcaster can have a guaranteed uplink slice for live coverage at an event. It earns its keep where a customer will pay for a guarantee rather than best effort — and it demands end-to-end orchestration and per-slice assurance.",
    minutes: 4,
  },
  {
    id: "tech-5g-03",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "ADVANCED",
    topic: "Open RAN",
    domainTags: ["5g-technology"],
    prompt: "What is the CU/DU/RU split in Open RAN, and what do operators gain and lose from it?",
    modelAnswer:
      "The base station is split into the radio unit at the antenna, the distributed unit handling real-time lower layers, and the centralised unit for higher layers — connected by open fronthaul and midhaul interfaces, with the RIC adding programmable control. The gain: multi-vendor competition, cheaper hardware, centralised pooling, and features delivered as software. The cost: integration burden moves to the operator, strict fronthaul timing and transport requirements, a larger security surface across open interfaces, and end-to-end performance that nobody owns single-handedly — which is why system integrators matter.",
    minutes: 5,
  },

  /* ------------------------------------------------------------------ AR/VR */
  {
    id: "tech-xr-01",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "BEGINNER",
    topic: "Comfort",
    domainTags: ["ar-vr"],
    prompt: "Why is frame rate so much more important in VR than in a normal game, and what causes discomfort?",
    modelAnswer:
      "In VR the display is strapped to the head, so dropped frames and latency break the match between what the inner ear feels and what the eyes see — that mismatch causes nausea. Headsets target 72–120 Hz with consistent frame times; a stable 72 beats an uneven 90. Other comfort factors: never take control of the camera away from the user, avoid artificial acceleration, offer teleport or comfort-vignette locomotion options, keep UI at a comfortable focal distance, and maintain a stable horizon. Motion-to-photon latency and reprojection quality matter as much as raw frames per second.",
    minutes: 3,
  },
  {
    id: "tech-xr-02",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "INTERMEDIATE",
    topic: "AR tracking",
    domainTags: ["ar-vr"],
    prompt: "How does an AR app keep a virtual object stuck to a real table, and where does it go wrong?",
    modelAnswer:
      "The device runs SLAM: camera frames plus IMU build a map of feature points and track the device pose within it. Plane detection fits horizontal or vertical surfaces from those points, and you attach the object to an anchor so the platform keeps correcting its pose as the map improves. It breaks on blank or shiny surfaces with no features, in poor or changing light, with fast motion and motion blur, and when the environment itself moves. Mitigations: guide the user to scan the area, fall back gracefully when tracking is lost, re-localise against saved anchors, and keep virtual content plausibly lit and shadowed so small drift is less obvious.",
    minutes: 4,
  },
  {
    id: "tech-xr-03",
    round: "TECHNICAL",
    kind: "SHORT_ANSWER",
    level: "ADVANCED",
    topic: "Performance",
    domainTags: ["ar-vr"],
    prompt: "A Quest build drops to 50 fps in a busy scene. How do you get it back to target?",
    modelAnswer:
      "Profile before changing anything — decide whether you are CPU-bound or GPU-bound with the platform profiler. CPU side: cut draw calls by batching and instancing, reduce unique materials, limit physics and per-frame allocations that trigger garbage collection, and keep scripts off the hot path. GPU side: reduce overdraw and transparency, use mobile-friendly shaders, bake lighting instead of realtime lights, keep textures modest with compression and mipmaps, and use LODs and occlusion culling. Then platform tools: fixed foveated rendering, dynamic resolution and an appropriate MSAA level. Re-measure after each change and budget per frame rather than chasing the symptom.",
    minutes: 5,
  },
];
