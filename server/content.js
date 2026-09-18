/* Content for all six modes. Easy items first, harder items later. */

const DATA = {
  speaking: [
    { prompt: "Tell me about your university. What do you study?", hint: "Speak or write 2-3 sentences.", keywords: ["study","university","class","major","course"] },
    { prompt: "How often do you go to the gym? What do you do there?", hint: "Use: I usually / I always / twice a week.", keywords: ["gym","week","train","workout","exercise"] },
    { prompt: "Describe your best friend. Why do you like this person?", hint: "Use: because, funny, kind, helpful.", keywords: ["friend","because","kind","funny","help"] },
    { prompt: "What food do you eat most days? Is it healthy?", hint: "Use: I eat / I cook / healthy / unhealthy.", keywords: ["eat","food","cook","healthy","rice","chicken"] },
    { prompt: "You want an internship. Tell the manager why they should choose you.", hint: "Use: I am good at / I can / I learn fast.", keywords: ["internship","learn","work","skill","team","good at"] },
    { prompt: "Tell me about a trip you want to take. Where and why?", hint: "Use: I would like to / because.", keywords: ["travel","go","country","because","visit","trip"] },
    { prompt: "Do you use AI tools? How do they help you study or work?", hint: "Use: I use it to / it helps me.", keywords: ["ai","help","use","study","tool","work"] },
    { prompt: "Your friend is sad about an exam. What do you say to help them?", hint: "Be kind. Use: don't worry / next time / you can.", keywords: ["worry","next time","can","try","help","ok"] },
    { prompt: "Nice to meet you. Tell me about yourself and what you do in your free time.", hint: "3-5 sentences.", keywords: ["my name","i am","free time","like","study"] },
    { prompt: "Tell me about your last gym workout. What did you train and how did you feel?", hint: "Use past simple: I trained / I felt.", keywords: ["train","gym","felt","tired","legs","strong"] }
  ],
  listening: [
    { audio: "I go to university by bus every morning.", question: "Type what you heard.", answer: "i go to university by bus every morning" },
    { audio: "She is training at the gym three times a week.", question: "Type what you heard.", answer: "she is training at the gym three times a week" },
    { audio: "My internship starts on Monday at nine o'clock.", question: "Type what you heard.", answer: "my internship starts on monday at nine o'clock" },
    { audio: "We usually cook dinner together on Friday night.", question: "Type what you heard.", answer: "we usually cook dinner together on friday night" },
    { audio: "I am saving money because I want to travel next summer.", question: "Type what you heard.", answer: "i am saving money because i want to travel next summer" },
    { audio: "The teacher said the report is due before the weekend.", question: "Type what you heard.", answer: "the teacher said the report is due before the weekend" }
  ],
  reading: [
    { text: "Maya studies computer science. Every Monday she has class at 8 a.m. After class she works at a small cafe near the university. She likes the job because she meets many people.",
      question: "Why does Maya like her job?", answer: "she meets many people", keywords: ["meet","people"] },
    { text: "Tom started going to the gym in January. At first he was very tired after ten minutes. Now, six months later, he can run for half an hour without stopping.",
      question: "How long can Tom run now?", answer: "half an hour", keywords: ["half","hour","30","thirty"] },
    { text: "Lina sent an email to apply for an internship. She did not get a reply for two weeks, so she wrote again politely. The next day the company invited her to an interview.",
      question: "What happened after Lina wrote the second email?", answer: "the company invited her to an interview", keywords: ["interview","invited","company"] },
    { text: "Many students now use AI tools to check their grammar. This saves time, but teachers say students should still read their own work, because AI can make mistakes too.",
      question: "Why should students still read their own work?", answer: "because ai can make mistakes", keywords: ["mistake","ai","wrong","error"] }
  ],
  writing: [
    { prompt: "Write a WhatsApp message to a friend. Say you are late 15 minutes and say sorry.", hint: "Short and friendly.", keywords: ["sorry","late","minutes","coming","be there"] },
    { prompt: "Write a short email to your professor to ask for one more day for your homework.", hint: "Use: Dear Professor / Could I / Thank you.", keywords: ["dear","professor","could","thank","homework","day"] },
    { prompt: "Write 3 sentences about your day today.", hint: "Use past simple: I woke up / I went / I studied.", keywords: ["i","today","went","did","studied"] },
    { prompt: "Write a short message to a company to ask if they have an internship for students.", hint: "Use: Hello / I am a student / I am interested in.", keywords: ["hello","student","internship","interested","thank"] },
    { prompt: "Write a message inviting your friend to the gym tomorrow at 6 p.m.", hint: "Use: Do you want to / Are you free.", keywords: ["gym","tomorrow","want","free","come"] },
    { prompt: "Write a short paragraph about one skill you want to improve at university.", hint: "Use: I want to improve / because.", keywords: ["improve","skill","because","want","better"] },
    { prompt: "Write a professional message to your internship supervisor about what you finished today.", hint: "Use: Hello / Today I finished / Please let me know.", keywords: ["hello","today","finished","report","please","thank"] }
  ],
  vocabulary: [
    { word: "look forward to", meaning: "to feel happy about something in the future", example: "I look forward to my internship next month.", task: "Write your own sentence with: look forward to" },
    { word: "get used to", meaning: "to slowly feel normal about something new", example: "I got used to waking up early for university.", task: "Write your own sentence with: get used to" },
    { word: "on my way", meaning: "I am going there now", example: "Sorry, I'm on my way to the gym!", task: "Write your own sentence with: on my way" },
    { word: "keep in touch", meaning: "to continue talking to someone", example: "Let's keep in touch after the course.", task: "Write your own sentence with: keep in touch" },
    { word: "come up with", meaning: "to think of an idea", example: "She came up with a good plan for the project.", task: "Write your own sentence with: come up with" },
    { word: "run out of", meaning: "to have no more of something", example: "We ran out of time in the meeting.", task: "Write your own sentence with: run out of" }
  ],
  speed: [
    { prompt: "Say the opposite of: cheap", answer: "expensive", keywords: ["expensive","costly"] },
    { prompt: "Past tense of: go", answer: "went", keywords: ["went"] },
    { prompt: "One word: a place where you buy food", answer: "supermarket", keywords: ["supermarket","shop","store","market"] },
    { prompt: "Finish fast: I am interested ___ AI.", answer: "in", keywords: ["in"] },
    { prompt: "Opposite of: difficult", answer: "easy", keywords: ["easy","simple"] },
    { prompt: "Past tense of: write", answer: "wrote", keywords: ["wrote"] },
    { prompt: "Finish fast: She is good ___ English.", answer: "at", keywords: ["at"] },
    { prompt: "One word: the meal you eat in the morning", answer: "breakfast", keywords: ["breakfast"] }
  ]
};

const MODES = [
  { id: "speaking",   name: "Speaking",   emoji: "🗣️", tag: "Talk about real life" },
  { id: "listening",  name: "Listening",  emoji: "👂", tag: "Hear and type" },
  { id: "reading",    name: "Reading",    emoji: "📖", tag: "Read and answer" },
  { id: "writing",    name: "Writing",    emoji: "✍️", tag: "Messages & email" },
  { id: "vocabulary", name: "Vocabulary", emoji: "💡", tag: "New words" },
  { id: "speed",      name: "Speed",      emoji: "⚡", tag: "Think fast" }
];

/* Export for the Node backend; in the browser these stay as globals. */
if (typeof module !== "undefined" && module.exports) module.exports = { DATA, MODES };
