-- Starter study material for the interview prep area.
-- Everything links to its source; nothing is re-hosted. Admins edit or remove
-- these in Admin → Interview bank.

INSERT INTO "InterviewMaterial" ("id", "round", "kind", "title", "description", "source", "url", "domainTags", "order", "isActive", "createdAt", "updatedAt") VALUES
  ('mat-apt-careerride-videos', 'APTITUDE'::"InterviewRound", 'VIDEO'::"InterviewMaterialKind",
   'Quantitative aptitude — full video course',
   'Topic-by-topic walkthroughs for placement tests: time and work, speed and distance, averages, percentages and more.',
   'CareerRide', 'https://www.youtube.com/playlist?list=PLpyc33gOcbVA4qXMoQ5vmhefTruk5t9lt',
   ARRAY[]::text[], 1, true, now(), now()),

  ('mat-apt-careerride-tests', 'APTITUDE'::"InterviewRound", 'PRACTICE'::"InterviewMaterialKind",
   'Aptitude practice tests with solutions',
   'Free topic-wise practice sets with worked solutions — the closest thing to a real placement paper.',
   'CareerRide', 'https://www.careerride.com/subject/aptitude.aspx',
   ARRAY[]::text[], 2, true, now(), now()),

  ('mat-apt-indiabix', 'APTITUDE'::"InterviewRound", 'PRACTICE'::"InterviewMaterialKind",
   'IndiaBix aptitude question bank',
   'Thousands of questions with explanations, grouped by topic. Good for drilling weak areas.',
   'IndiaBix', 'https://www.indiabix.com/aptitude/questions-and-answers/',
   ARRAY[]::text[], 3, true, now(), now()),

  ('mat-apt-gfg', 'APTITUDE'::"InterviewRound", 'DOC'::"InterviewMaterialKind",
   'Aptitude questions and answers',
   'Written notes and solved examples across quantitative, logical and verbal sections.',
   'GeeksforGeeks', 'https://www.geeksforgeeks.org/aptitude/aptitude-questions-and-answers/',
   ARRAY[]::text[], 4, true, now(), now()),

  ('mat-tech-gfg-corner', 'TECHNICAL'::"InterviewRound", 'DOC'::"InterviewMaterialKind",
   'Interview preparation corner',
   'Company-wise questions, core computer science subjects and experience write-ups.',
   'GeeksforGeeks', 'https://www.geeksforgeeks.org/interview-corner/',
   ARRAY[]::text[], 1, true, now(), now()),

  ('mat-code-striver-sde', 'CODING'::"InterviewRound", 'PRACTICE'::"InterviewMaterialKind",
   'Striver SDE Sheet — top coding interview problems',
   'The widely used structured list of interview problems, ordered so each day builds on the last.',
   'takeuforward', 'https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/',
   ARRAY[]::text[], 1, true, now(), now()),

  ('mat-code-leetcode-150', 'CODING'::"InterviewRound", 'PRACTICE'::"InterviewMaterialKind",
   'LeetCode Top Interview 150',
   'A curated study plan covering the patterns that come up most often in interviews.',
   'LeetCode', 'https://leetcode.com/studyplan/top-interview-150/',
   ARRAY[]::text[], 2, true, now(), now()),

  ('mat-code-neetcode', 'CODING'::"InterviewRound", 'PRACTICE'::"InterviewMaterialKind",
   'NeetCode practice roadmap',
   'Problems grouped by pattern, each with a video explanation — useful when a problem type keeps catching you out.',
   'NeetCode', 'https://neetcode.io/practice',
   ARRAY[]::text[], 3, true, now(), now())
ON CONFLICT ("id") DO NOTHING;
