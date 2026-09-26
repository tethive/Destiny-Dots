import type { BankQuestion } from "@/content/interview/types";

const dev = ["full-stack", "ai-ml", "cybersecurity", "ethical-hacking", "cloud-computing", "blockchain", "iot", "ar-vr", "5g-technology"];
const data = ["data-analysis", "data-engineering", "ai-ml"];

/** Coding-round problems. Nothing is executed — the AI reviews the approach, correctness and complexity. */
export const codingBank: BankQuestion[] = [
  {
    id: "code-two-sum",
    round: "CODING",
    kind: "CODING",
    level: "BEGINNER",
    topic: "Arrays & hashing",
    domainTags: [...dev, ...data],
    language: "Any",
    prompt:
      "Given an array of integers and a target, return the indices of the two numbers that add up to the target. Assume exactly one solution and that you may not use the same element twice.\n\nExample: nums = [2, 7, 11, 15], target = 9 → [0, 1]\n\nWrite the function, then add a comment explaining the time and space complexity.",
    starterCode: "def two_sum(nums, target):\n    # your solution\n    pass\n",
    modelAnswer:
      "One pass with a hash map from value to index: for each number, check whether target − number has already been seen; if so return the stored index and the current one, otherwise store the number. O(n) time, O(n) space. The brute-force double loop is O(n²) and should be mentioned as the starting point. Edge cases worth naming: negative numbers, duplicates (works because the earlier index is stored), and the fact that sorting plus two pointers loses the original indices.",
    hints: ["What would you need to look up instantly while scanning once?", "Store what you have seen, not what you are looking for."],
    minutes: 12,
  },
  {
    id: "code-valid-parentheses",
    round: "CODING",
    kind: "CODING",
    level: "BEGINNER",
    topic: "Stacks",
    domainTags: dev,
    language: "Any",
    prompt:
      "Given a string containing only the characters ()[]{}, decide whether the brackets are balanced and correctly nested.\n\nExamples: \"([]{})\" → true, \"(]\" → false, \"([)]\" → false.",
    starterCode: "def is_valid(s):\n    # your solution\n    pass\n",
    modelAnswer:
      "Push opening brackets onto a stack; on a closing bracket, the stack must be non-empty and its top must be the matching opener, else return false. At the end the stack must be empty. O(n) time and O(n) space. A map of closing to opening brackets keeps it short. Edge cases: empty string (true), string of only closers, odd length (can never be valid).",
    hints: ["Which data structure naturally matches “most recently opened”?", "What must be true about the stack when the string ends?"],
    minutes: 12,
  },
  {
    id: "code-reverse-words",
    round: "CODING",
    kind: "CODING",
    level: "BEGINNER",
    topic: "Strings",
    domainTags: dev,
    language: "Any",
    prompt:
      "Reverse the order of words in a sentence, collapsing any extra whitespace.\n\nExample: \"  the sky   is blue \" → \"blue is sky the\"\n\nDo not rely on a single built-in that solves the whole problem; show the logic.",
    starterCode: "def reverse_words(s):\n    # your solution\n    pass\n",
    modelAnswer:
      "Split on whitespace discarding empties, reverse the list, join with single spaces — O(n) time and O(n) space. The in-place variant on a character array (reverse the whole string, then reverse each word) is the follow-up interviewers like, and is O(1) extra space where strings are mutable. Edge cases: leading, trailing and repeated spaces; an empty or whitespace-only string; a single word.",
    hints: ["What do you do about repeated spaces?", "What changes if strings are immutable in your language?"],
    minutes: 10,
  },
  {
    id: "code-first-unique",
    round: "CODING",
    kind: "CODING",
    level: "BEGINNER",
    topic: "Hash maps",
    domainTags: dev,
    language: "Any",
    prompt: "Return the first non-repeating character in a string, or null if every character repeats.\n\nExample: \"swiss\" → \"w\".",
    starterCode: "def first_unique(s):\n    # your solution\n    pass\n",
    modelAnswer:
      "Count characters in one pass, then scan the string again and return the first with count 1 — O(n) time, O(k) space where k is the alphabet size. An ordered map or storing first-seen indices avoids the second pass over the original string. Edge cases: empty string, all characters repeating, case sensitivity and whether whitespace counts — ask.",
    hints: ["Two passes are fine — what do you store in the first?", "Does the order of iteration matter when you look for the answer?"],
    minutes: 10,
  },
  {
    id: "code-merge-sorted",
    round: "CODING",
    kind: "CODING",
    level: "INTERMEDIATE",
    topic: "Two pointers",
    domainTags: dev,
    language: "Any",
    prompt:
      "Merge two sorted arrays into one sorted array without using a library sort.\n\nExample: [1, 3, 5] and [2, 3, 8] → [1, 2, 3, 3, 5, 8]\n\nThen explain how you would change it to merge k sorted arrays.",
    starterCode: "def merge(a, b):\n    # your solution\n    pass\n",
    modelAnswer:
      "Two pointers, always taking the smaller head, then append whatever remains: O(n + m) time and O(n + m) output space. For k arrays, a min-heap of the current heads gives O(N log k); repeatedly merging pairs is also acceptable and easier to explain. Edge cases: one array empty, duplicates across both, and the in-place variant where the first array has trailing space (fill from the back to avoid overwriting).",
    hints: ["Which element is definitely next in the output?", "For k arrays, what keeps the smallest candidate to hand?"],
    minutes: 15,
  },
  {
    id: "code-longest-substring",
    round: "CODING",
    kind: "CODING",
    level: "INTERMEDIATE",
    topic: "Sliding window",
    domainTags: dev,
    language: "Any",
    prompt:
      "Find the length of the longest substring without repeating characters.\n\nExample: \"abcabcbb\" → 3 (\"abc\"), \"bbbbb\" → 1, \"pwwkew\" → 3 (\"wke\").",
    starterCode: "def longest_unique(s):\n    # your solution\n    pass\n",
    modelAnswer:
      "Sliding window with a map of character to its last index: move the right edge forward, and when a repeat appears inside the window jump the left edge to one past the previous occurrence. Track the best length. O(n) time, O(k) space. The common bug is moving the left edge backwards — guard with max(left, previous + 1). Edge cases: empty string, all-unique string, all-identical string.",
    hints: ["Can the window ever need to shrink from the right?", "What do you store so the left edge can jump instead of crawl?"],
    minutes: 18,
  },
  {
    id: "code-group-anagrams",
    round: "CODING",
    kind: "CODING",
    level: "INTERMEDIATE",
    topic: "Hashing",
    domainTags: dev,
    language: "Any",
    prompt: "Group a list of words so that anagrams sit together.\n\nExample: [\"eat\", \"tea\", \"tan\", \"ate\", \"nat\", \"bat\"] → [[\"eat\",\"tea\",\"ate\"], [\"tan\",\"nat\"], [\"bat\"]]",
    starterCode: "def group_anagrams(words):\n    # your solution\n    pass\n",
    modelAnswer:
      "Key each word by a canonical form and bucket them in a hash map. Sorting the letters gives O(n · k log k); a 26-slot character count tuple gives O(n · k), which is the better answer for long words. Return the map's values. Edge cases: empty input, duplicate words, case and non-letter characters — clarify whether they matter.",
    hints: ["What is identical for every anagram of the same word?", "Can you avoid sorting each word?"],
    minutes: 15,
  },
  {
    id: "code-rotated-search",
    round: "CODING",
    kind: "CODING",
    level: "ADVANCED",
    topic: "Binary search",
    domainTags: dev,
    language: "Any",
    prompt:
      "A sorted array of distinct integers has been rotated at an unknown pivot, e.g. [4, 5, 6, 7, 0, 1, 2]. Find the index of a target in O(log n) time, or return −1.",
    starterCode: "def search_rotated(nums, target):\n    # your solution\n    pass\n",
    modelAnswer:
      "Modified binary search: at each step one half is guaranteed sorted. Compare nums[left] with nums[mid] to find which half that is, check whether the target lies inside its range, and recurse into that half, otherwise the other. O(log n) time, O(1) space. Edge cases: array of length 0 or 1, no rotation at all, target at either boundary, and the duplicate-values variant which degrades to O(n) — worth mentioning.",
    hints: ["After picking mid, what can you always say about one of the two halves?", "How do you decide which half can contain the target?"],
    minutes: 20,
  },
  {
    id: "code-lru-cache",
    round: "CODING",
    kind: "CODING",
    level: "ADVANCED",
    topic: "Design",
    domainTags: dev,
    language: "Any",
    prompt:
      "Design an LRU cache with get(key) and put(key, value), both in O(1) average time, evicting the least recently used entry when capacity is exceeded. Describe the data structures before writing code.",
    starterCode: "class LRUCache:\n    def __init__(self, capacity):\n        pass\n\n    def get(self, key):\n        pass\n\n    def put(self, key, value):\n        pass\n",
    modelAnswer:
      "Hash map from key to node, plus a doubly linked list ordered by recency with sentinel head and tail nodes. get: look up the node, move it to the front, return its value. put: update and move to front if present; otherwise insert at the front and, if over capacity, remove the tail node and delete its key from the map. Both O(1). Mention the ready-made options (Python's OrderedDict, Java's LinkedHashMap) but show you know why the linked list is needed. Edge cases: capacity of zero, updating an existing key, and thread safety if asked.",
    hints: ["Why is a plain array or map alone not enough?", "What has to happen on every read, not just on writes?"],
    minutes: 25,
  },
  {
    id: "code-sql-second-highest",
    round: "CODING",
    kind: "CODING",
    level: "BEGINNER",
    topic: "SQL",
    domainTags: data,
    language: "SQL",
    prompt:
      "Table employees(id, name, department_id, salary). Write SQL to return the second-highest salary overall. Return NULL if there is no second distinct salary, and explain how ties are handled.",
    starterCode: "-- your query\n",
    modelAnswer:
      "Either SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees), which returns NULL naturally when there is no second value, or a window-function version: SELECT MAX(salary) filtered on DENSE_RANK() OVER (ORDER BY salary DESC) = 2. DENSE_RANK treats tied salaries as one rank, which is usually what “second highest” means; ROW_NUMBER would pick an arbitrary row among ties, and LIMIT 1 OFFSET 1 without DISTINCT is wrong when the top salary is shared.",
    hints: ["What does your answer return when everyone earns the same?", "Which ranking function collapses ties?"],
    minutes: 12,
  },
  {
    id: "code-sql-top-n-per-group",
    round: "CODING",
    kind: "CODING",
    level: "INTERMEDIATE",
    topic: "SQL",
    domainTags: data,
    language: "SQL",
    prompt:
      "Tables orders(id, customer_id, amount, created_at) and customers(id, name, city). Write SQL for the top 3 customers by total spend in each city over the last 90 days, including customers with no orders as zero.",
    starterCode: "-- your query\n",
    modelAnswer:
      "Aggregate first, then rank inside the city: a CTE sums amount per customer with a LEFT JOIN from customers so non-buyers survive (COALESCE the sum to 0) and the date filter sits in the ON clause or a pre-filtered orders CTE — putting it in WHERE would drop the zero-order customers. Then ROW_NUMBER() or RANK() OVER (PARTITION BY city ORDER BY total DESC) and filter to ≤ 3 in an outer query, since window functions cannot appear in WHERE. Mention the tie-breaking choice and an index on orders(created_at, customer_id).",
    hints: ["Where must the date filter go so the LEFT JOIN still keeps everyone?", "Why can the ranking not be filtered in the same SELECT?"],
    minutes: 20,
  },
  {
    id: "code-js-debounce",
    round: "CODING",
    kind: "CODING",
    level: "INTERMEDIATE",
    topic: "JavaScript",
    domainTags: ["full-stack", "blockchain", "ar-vr"],
    language: "JavaScript",
    prompt:
      "Implement debounce(fn, delay): it returns a function that runs fn only after `delay` milliseconds have passed with no new calls. Preserve `this` and the arguments, and add a cancel method. Then explain when you would use throttle instead.",
    starterCode: "function debounce(fn, delay) {\n  // your solution\n}\n",
    modelAnswer:
      "Keep a timer id in closure; every call clears the pending timer and schedules a new one that invokes fn with the latest arguments. Use a normal function (not an arrow) and fn.apply(this, args) so the caller's `this` survives; expose cancel() to clear the timer, and optionally a leading-edge option. Debounce suits “wait until they stop” — search-as-you-type, resize, autosave. Throttle suits “at most once per interval” — scroll handlers, analytics, rate-limited APIs. Mention cleaning up the timer when a component unmounts.",
    hints: ["Where does the timer id have to live between calls?", "What breaks if you write the returned function as an arrow function?"],
    minutes: 15,
  },
];
