// ===============================================================
// General English Question Banks (July 2026)
// ---------------------------------------------------------------
// Two courses, each with three sections:
//
//   geneng1 — General English 1 (HASS 102, CEFR A2)
//     reading    20 questions across 2 passages (10 each)
//     grammar    20 questions
//     vocabulary 20 questions
//
//   geneng2 — General English 2
//     reading    20 questions across 2 passages (10 each)
//     grammar    20 questions
//     vocabulary 20 questions
//
// Sourced verbatim from the instructor-supplied Version A / Version B
// exam papers, including their answer keys. Question wording, option
// wording and option ORDER are preserved exactly as printed so the
// digital exam matches the paper original.
//
// ---------------------------------------------------------------
// DEVIATIONS FROM THE SOURCE PAPERS
// ---------------------------------------------------------------
// Exactly one item differs from the printed paper. Recorded here so
// the change is traceable and nothing silently drifts from the source.
//
//   General English 2 · Version A · Vocabulary Q29
//     Printed:  "Emma was very ______ after she received the wonderful
//                gift."  (disappointed / tired / tiring, key: A)
//     Problem:  none of the three options fits the sentence, so the
//               item could not be answered correctly as printed.
//     Fixed:    the STEM was rewritten to
//               "Emma was very ______ when she did not receive the
//                gift she wanted."
//               The answer key identifies "disappointed" as the tested
//               word, so the options and the answer letter (A) are
//               unchanged — only the context was repaired.
//
// Every other question, option, option order and answer key in this
// file matches its source paper exactly.
//
// ---------------------------------------------------------------
// ENGLISH-ONLY BY DESIGN
// ---------------------------------------------------------------
// These are English-language exams: translating the questions into
// Uzbek or Russian would give away vocabulary and grammar answers.
// So every item here carries English text only. The normalizer at the
// bottom of this file mirrors `en` into `uz` and `ru` purely so that
// downstream consumers written against the trilingual C++ banks
// (pdf-generator.js in particular) keep working unchanged — they all
// skip a secondary language when it is identical to the English.
//
// app.js additionally renders these exams English-only on screen and
// suppresses the language switcher (see isEnglishCourse / examIsEnglishOnly).
// The trilingual behaviour of Programming 1 with C++ is untouched.
//
// ---------------------------------------------------------------
// SHAPE
// ---------------------------------------------------------------
// Question objects intentionally match the MC_BANK shape so the
// existing renderer, scorer and PDF code need no special-casing:
//
//   {
//     en:      "question text (HTML allowed)",
//     opts:    [ { en: "option text" }, ... ],   // 2, 3 or 4 options
//     correct: 0-based index into opts,
//     section: "reading" | "grammar" | "vocabulary",
//     passage: "<passage id>",   // reading questions only
//     fixedOrder: true           // optional — never shuffle the options
//   }
//
// `fixedOrder` is set on True/False items: shuffling a two-option
// True/False question serves no anti-cheating purpose and reads as a
// typo to students.
// ===============================================================

// ---------------------------------------------------------------
// Reading passages. Keyed by course, then by passage id.
// `parts` is an ordered list of paragraphs; `label` is the speaker
// name for multi-voice texts and is omitted for continuous prose.
// ---------------------------------------------------------------
window.ENGLISH_PASSAGES = {
  geneng1: {
    ge1_tennis: {
      id: "ge1_tennis",
      title: "How I Became a Tennis Coach",
      parts: [
        {
          label: "Petra",
          text: "I grew up in Germany, but when I was 17, I moved to Spain so I could go to a tennis centre there. It was hard to be without my family and friends, especially when I hurt myself or got ill. However, my tennis improved a lot. After three years, I left the centre and began my career. I started playing in big competitions around the world. I did OK, but wasn't earning enough money, so I quickly decided to become a tennis coach instead. I now teach children who are just starting the game, which is fun.",
        },
        {
          label: "Bea",
          text: "When I was 14, my dad sent me to a tennis centre near my home in Italy. He thought I might become a top player like him, but I saw how much time he spent going from one country to another during his career, and I've never wanted that for myself. My favourite things at the tennis centre were spending time at the pool or having barbecues with friends in the evenings. I'm now a coach, and teach young tennis stars at summer camps in Italy.",
        },
        {
          label: "Sara",
          text: "When I went to live in Spain so I could go to a famous tennis centre there, my dad came with me, and my mum stayed at home in Scotland. My tennis really improved during my two years there, but when I broke my foot it became clear that a career as a tennis player wasn't going to be possible. I went home for a year and then returned to the centre to do a coaching course. I now teach the best young players in Scotland.",
        },
      ],
    },
    ge1_freetime: {
      id: "ge1_freetime",
      title: "Our Free-time Activities",
      parts: [
        {
          label: "Lei Wei",
          text: "I've been a member of the school cooking club since I was ten. I'm best known as a brilliant cake maker. Last year, I made 100 cupcakes for my cousin's 18th birthday party and everyone said they were delicious. Cooking is only expensive if you buy unusual food, like Chinese vegetables that you can't find in a supermarket. I did this and made a special dinner for my dad when he was 50.",
        },
        {
          label: "Deepak",
          text: "When I was younger, I became interested in photography when my uncle let me take photos on his big digital camera. I've got my own camera now — I saved my pocket money for a year to buy it. I love taking photos of people playing sport. It's really difficult to catch them at the right moment, so I take several photos. The headteacher has asked me to take photos at the school fashion show.",
        },
        {
          label: "Romeo",
          text: "My aunt works for a fashion magazine and wears really cool clothes. I'm different from most boys because I love making clothes for me and my sisters, so I want to study fashion at college. I've already got some experience in the fashion world. With my aunt's help, I won a competition to help get clothes ready when a famous American photographer came to take photos of models wearing winter clothes. It was a really interesting day and I could earn some money.",
        },
      ],
    },
  },

  geneng2: {
    ge2_technology: {
      id: "ge2_technology",
      title: "Development of Technology",
      parts: [
        {
          text: "Technology has changed the way people live, work and communicate. Many years ago, people wrote letters to friends and family and waited several days or even weeks for a reply. Today, messages can be sent instantly using smartphones and computers.",
        },
        {
          text: "Technology has also changed education. Students can attend online classes, watch educational videos and find information on the internet in just a few minutes. However, some teachers believe that students spend too much time looking at screens instead of reading books or talking to each other.",
        },
        {
          text: "Many workplaces have become more digital. Some people now work from home using video calls and online documents instead of travelling to an office every day. This saves time and money, but some workers say they miss meeting their colleagues face to face.",
        },
        {
          text: "Technology has improved healthcare as well. Doctors can use modern equipment to find illnesses more quickly, and patients can even speak to a doctor online without leaving home.",
        },
        {
          text: "Although technology makes life easier in many ways, experts believe people should also spend time away from screens. Walking outside, doing sports and talking with family and friends are still important for a healthy lifestyle.",
        },
      ],
    },
    ge2_culture: {
      id: "ge2_culture",
      title: "Culture Around the World",
      parts: [
        {
          text: "Culture is an important part of people's lives. It includes traditions, languages, music, art, food and celebrations. Every country has its own culture, and learning about different cultures helps people understand each other better.",
        },
        {
          text: "Many people enjoy travelling because they can experience new cultures. They can try traditional food, visit museums, watch local performances and learn about the history of a place. Even if people cannot travel, they can still discover different cultures by reading books, watching films or using the internet.",
        },
        {
          text: "Festivals are an important part of culture. Some festivals celebrate historical events, while others are connected with religion or the changing seasons. During these celebrations, people often wear traditional clothes, prepare special meals and spend time with family and friends.",
        },
        {
          text: "Although cultures are different, they also have many similarities. People everywhere enjoy music, food, sports and spending time with loved ones. Respecting other cultures helps build friendships and makes the world a more peaceful place.",
        },
      ],
    },
  },
};

// ---------------------------------------------------------------
// Question banks
// ---------------------------------------------------------------
window.ENGLISH_BANK = {
  // =============================================================
  // GENERAL ENGLISH 1 (HASS 102 · CEFR A2)
  // =============================================================
  geneng1: {
    // ---- READING (20) -----------------------------------------
    reading: [
      // -- Passage 1: "How I Became a Tennis Coach" (Version A) --
      {
        section: "reading",
        passage: "ge1_tennis",
        en: "Who didn't enjoy tennis as much as other activities at the tennis centre?",
        opts: [{ en: "Petra" }, { en: "Bea" }, { en: "Sara" }],
        correct: 1,
      },
      {
        section: "reading",
        passage: "ge1_tennis",
        en: "Who had to change her plans for the future after an accident?",
        opts: [{ en: "Petra" }, { en: "Bea" }, { en: "Sara" }],
        correct: 2,
      },
      {
        section: "reading",
        passage: "ge1_tennis",
        en: "Who says she missed people from home while she was at the tennis centre?",
        opts: [{ en: "Petra" }, { en: "Bea" }, { en: "Sara" }],
        correct: 0,
      },
      {
        section: "reading",
        passage: "ge1_tennis",
        en: "Who went back to the tennis centre to learn to become a coach?",
        opts: [{ en: "Petra" }, { en: "Bea" }, { en: "Sara" }],
        correct: 2,
      },
      {
        section: "reading",
        passage: "ge1_tennis",
        en: "Who doesn't like the idea of travelling a lot for her job?",
        opts: [{ en: "Petra" }, { en: "Bea" }, { en: "Sara" }],
        correct: 1,
      },
      {
        section: "reading",
        passage: "ge1_tennis",
        en: "Who moved to a different country with a member of her family?",
        opts: [{ en: "Petra" }, { en: "Bea" }, { en: "Sara" }],
        correct: 2,
      },
      {
        section: "reading",
        passage: "ge1_tennis",
        en: "Who teaches tennis to young people who haven't played before?",
        opts: [{ en: "Petra" }, { en: "Bea" }, { en: "Sara" }],
        correct: 0,
      },
      {
        section: "reading",
        passage: "ge1_tennis",
        en: "Who lived in Scotland before moving away?",
        opts: [{ en: "Petra" }, { en: "Bea" }, { en: "Sara" }],
        correct: 2,
      },
      {
        section: "reading",
        passage: "ge1_tennis",
        en: "Who spent three years at a tennis centre before leaving?",
        opts: [{ en: "Petra" }, { en: "Bea" }, { en: "Sara" }],
        correct: 0,
      },
      {
        section: "reading",
        passage: "ge1_tennis",
        en: "Who works as a coach during summer camps?",
        opts: [{ en: "Petra" }, { en: "Bea" }, { en: "Sara" }],
        correct: 1,
      },

      // -- Passage 2: "Our Free-time Activities" (Version B) --
      {
        section: "reading",
        passage: "ge1_freetime",
        en: "Who got some help with their hobby from a family member?",
        opts: [{ en: "Lei Wei" }, { en: "Deepak" }, { en: "Romeo" }],
        correct: 2,
      },
      {
        section: "reading",
        passage: "ge1_freetime",
        en: "Who had success with something they did for their family?",
        opts: [{ en: "Lei Wei" }, { en: "Deepak" }, { en: "Romeo" }],
        correct: 0,
      },
      {
        section: "reading",
        passage: "ge1_freetime",
        en: "Who used their own money to buy something for their hobby?",
        opts: [{ en: "Lei Wei" }, { en: "Deepak" }, { en: "Romeo" }],
        correct: 1,
      },
      {
        section: "reading",
        passage: "ge1_freetime",
        en: "Whose hobby could become their future career?",
        opts: [{ en: "Lei Wei" }, { en: "Deepak" }, { en: "Romeo" }],
        correct: 2,
      },
      {
        section: "reading",
        passage: "ge1_freetime",
        en: "Whose hobby has helped them earn money?",
        opts: [{ en: "Lei Wei" }, { en: "Deepak" }, { en: "Romeo" }],
        correct: 2,
      },
      {
        section: "reading",
        passage: "ge1_freetime",
        en: "Whose hobby can sometimes be expensive?",
        opts: [{ en: "Lei Wei" }, { en: "Deepak" }, { en: "Romeo" }],
        correct: 0,
      },
      {
        section: "reading",
        passage: "ge1_freetime",
        en: "Whose hobby is sometimes difficult to do well?",
        opts: [{ en: "Lei Wei" }, { en: "Deepak" }, { en: "Romeo" }],
        correct: 1,
      },
      {
        section: "reading",
        passage: "ge1_freetime",
        en: "Who will take photos at the school fashion show?",
        opts: [{ en: "Lei Wei" }, { en: "Deepak" }, { en: "Romeo" }],
        correct: 1,
      },
      {
        section: "reading",
        passage: "ge1_freetime",
        en: "Who likes making clothes for his sisters?",
        opts: [{ en: "Lei Wei" }, { en: "Deepak" }, { en: "Romeo" }],
        correct: 2,
      },
      {
        section: "reading",
        passage: "ge1_freetime",
        en: "Who has belonged to a cooking club since the age of ten?",
        opts: [{ en: "Lei Wei" }, { en: "Deepak" }, { en: "Romeo" }],
        correct: 0,
      },
    ],

    // ---- GRAMMAR (20) -----------------------------------------
    grammar: [
      // -- Version A --
      {
        section: "grammar",
        en: "_____ you like coffee?",
        opts: [{ en: "Does" }, { en: "Do" }, { en: "Are" }, { en: "Is" }],
        correct: 1,
      },
      {
        section: "grammar",
        en: "She _____ to school on Sundays.",
        opts: [
          { en: "don't go" },
          { en: "doesn't goes" },
          { en: "doesn't go" },
          { en: "isn't go" },
        ],
        correct: 2,
      },
      {
        section: "grammar",
        en: "_____ your brother play football every weekend?",
        opts: [{ en: "Do" }, { en: "Does" }, { en: "Is" }, { en: "Can" }],
        correct: 1,
      },
      {
        section: "grammar",
        en: "What _____ they doing now?",
        opts: [{ en: "do" }, { en: "does" }, { en: "are" }, { en: "is" }],
        correct: 2,
      },
      {
        section: "grammar",
        en: "I _____ watching TV at the moment.",
        opts: [
          { en: "don't" },
          { en: "am not" },
          { en: "isn't" },
          { en: "doesn't" },
        ],
        correct: 1,
      },
      {
        section: "grammar",
        en: "He _____ studying for the exam right now.",
        opts: [
          { en: "doesn't" },
          { en: "isn't" },
          { en: "aren't" },
          { en: "don't" },
        ],
        correct: 1,
      },
      {
        section: "grammar",
        en: "They _____ my classmates.",
        opts: [{ en: "is" }, { en: "are" }, { en: "am" }, { en: "be" }],
        correct: 1,
      },
      {
        section: "grammar",
        en: "_____ she your teacher?",
        opts: [{ en: "Does" }, { en: "Do" }, { en: "Is" }, { en: "Are" }],
        correct: 2,
      },
      {
        section: "grammar",
        en: "_____ you swim?",
        opts: [{ en: "Do" }, { en: "Are" }, { en: "Can" }, { en: "Could" }],
        correct: 2,
      },
      {
        section: "grammar",
        en: "When I was five, I _____ ride a bicycle.",
        opts: [{ en: "can" }, { en: "could" }, { en: "am" }, { en: "do" }],
        correct: 1,
      },

      // -- Version B --
      {
        section: "grammar",
        en: "______ your parents live in London?",
        opts: [{ en: "Does" }, { en: "Do" }, { en: "Are" }, { en: "Is" }],
        correct: 1,
      },
      {
        section: "grammar",
        en: "He ______ meat because he is a vegetarian.",
        opts: [
          { en: "doesn't eat" },
          { en: "don't eat" },
          { en: "doesn't eats" },
          { en: "isn't eat" },
        ],
        correct: 0,
      },
      {
        section: "grammar",
        en: "______ Maria speak English fluently?",
        opts: [{ en: "Do" }, { en: "Does" }, { en: "Is" }, { en: "Can" }],
        correct: 1,
      },
      {
        section: "grammar",
        en: "Where ______ you going right now?",
        opts: [{ en: "do" }, { en: "does" }, { en: "are" }, { en: "is" }],
        correct: 2,
      },
      {
        section: "grammar",
        en: "I ______ to music at the moment. I am studying.",
        opts: [
          { en: "aren't listening" },
          { en: "isn't listening" },
          { en: "am not listening" },
          { en: "don't listen" },
        ],
        correct: 2,
      },
      {
        section: "grammar",
        en: "Look outside! It ______ raining anymore.",
        opts: [
          { en: "doesn't" },
          { en: "aren't" },
          { en: "don't" },
          { en: "isn't" },
        ],
        correct: 3,
      },
      {
        section: "grammar",
        en: "My sister ______ a doctor at the local hospital.",
        opts: [{ en: "am" }, { en: "are" }, { en: "is" }, { en: "be" }],
        correct: 2,
      },
      {
        section: "grammar",
        en: "______ you ready for the presentation?",
        opts: [{ en: "Does" }, { en: "Do" }, { en: "Is" }, { en: "Are" }],
        correct: 3,
      },
      {
        section: "grammar",
        en: "______ you please help me carry these heavy bags?",
        opts: [{ en: "Do" }, { en: "Are" }, { en: "Could" }, { en: "Am" }],
        correct: 2,
      },
      {
        section: "grammar",
        en: "She ______ speak three different languages when she was ten years old.",
        opts: [{ en: "can" }, { en: "could" }, { en: "is" }, { en: "does" }],
        correct: 1,
      },
    ],

    // ---- VOCABULARY (20) --------------------------------------
    vocabulary: [
      // -- Version A --
      {
        section: "vocabulary",
        en: "Let me _____ my friend Anna to you.",
        opts: [{ en: "sleep" }, { en: "introduce" }, { en: "drive" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "People use phones to _____ with their family.",
        opts: [{ en: "cook" }, { en: "communicate" }, { en: "swim" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "If your tooth hurts, you go to the _____.",
        opts: [{ en: "dentist" }, { en: "painter" }, { en: "singer" }],
        correct: 0,
      },
      {
        section: "vocabulary",
        en: "A job where you get a lot of money is _____.",
        opts: [{ en: "wet" }, { en: "well-paid" }, { en: "loud" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "Can you _____ a good film to watch?",
        opts: [{ en: "fly" }, { en: "jump" }, { en: "recommend" }],
        correct: 2,
      },
      {
        section: "vocabulary",
        en: "What time do you _____ home from school?",
        opts: [{ en: "return" }, { en: "laugh" }, { en: "paint" }],
        correct: 0,
      },
      {
        section: "vocabulary",
        en: "This pizza is so _____! I want another piece.",
        opts: [{ en: "delicious" }, { en: "empty" }, { en: "dark" }],
        correct: 0,
      },
      {
        section: "vocabulary",
        en: "Let's _____ lunch for the picnic.",
        opts: [{ en: "shout" }, { en: "prepare" }, { en: "wash" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "An elephant is a very _____ animal.",
        opts: [{ en: "clean" }, { en: "large" }, { en: "sweet" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "Can I _____ your pen, please?",
        opts: [{ en: "borrow" }, { en: "ride" }, { en: "cry" }],
        correct: 0,
      },

      // -- Version B --
      {
        section: "vocabulary",
        en: "She wants to ______ a question about the homework.",
        opts: [{ en: "ask" }, { en: "run" }, { en: "sit" }],
        correct: 0,
      },
      {
        section: "vocabulary",
        en: "We didn't ______ on the best place to eat.",
        opts: [{ en: "jump" }, { en: "agree" }, { en: "swim" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "He likes to live ______ in a small house by the sea.",
        opts: [{ en: "alone" }, { en: "read" }, { en: "walk" }],
        correct: 0,
      },
      {
        section: "vocabulary",
        en: "Please ______ to the teacher when she talks.",
        opts: [{ en: "listen" }, { en: "sleep" }, { en: "open" }],
        correct: 0,
      },
      {
        section: "vocabulary",
        en: "How much do you need to ______ for this book?",
        opts: [{ en: "write" }, { en: "pay" }, { en: "fly" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "It is ______ to drink water every day.",
        opts: [{ en: "important" }, { en: "cold" }, { en: "tall" }],
        correct: 0,
      },
      {
        section: "vocabulary",
        en: "My hair is too long. I need to see a ______.",
        opts: [{ en: "hairdresser" }, { en: "driver" }, { en: "singer" }],
        correct: 0,
      },
      {
        section: "vocabulary",
        en: "She is happy because her new job pays a good ______.",
        opts: [{ en: "salary" }, { en: "game" }, { en: "door" }],
        correct: 0,
      },
      {
        section: "vocabulary",
        en: "What time do you ______ school every day?",
        opts: [{ en: "finish" }, { en: "eat" }, { en: "sing" }],
        correct: 0,
      },
      {
        section: "vocabulary",
        en: "Be ______ with that hot cup of tea!",
        opts: [{ en: "careful" }, { en: "loud" }, { en: "fast" }],
        correct: 0,
      },
    ],
  },

  // =============================================================
  // GENERAL ENGLISH 2
  // =============================================================
  geneng2: {
    // ---- READING (20) -----------------------------------------
    reading: [
      // -- Passage 1: "Development of Technology" (Version A) --
      {
        section: "reading",
        passage: "ge2_technology",
        en: "How did people usually communicate many years ago?",
        opts: [
          { en: "By sending letters." },
          { en: "By making video calls." },
          { en: "By using smartphones." },
        ],
        correct: 0,
      },
      {
        section: "reading",
        passage: "ge2_technology",
        en: "What do some teachers worry about?",
        opts: [
          { en: "Students read too many books." },
          { en: "Students spend too much time looking at screens." },
          { en: "Students do not use computers enough." },
        ],
        correct: 1,
      },
      {
        section: "reading",
        passage: "ge2_technology",
        en: "What is one advantage of working from home?",
        opts: [
          { en: "People travel more often." },
          { en: "It saves time and money." },
          { en: "Workers meet colleagues every day." },
        ],
        correct: 1,
      },
      {
        section: "reading",
        passage: "ge2_technology",
        en: "According to the text, what can patients do today?",
        opts: [
          { en: "Buy medicine without doctors." },
          { en: "Speak to a doctor online." },
          { en: "Repair medical equipment." },
        ],
        correct: 1,
      },
      {
        section: "reading",
        passage: "ge2_technology",
        en: "<b>True or False:</b> People had instant messaging many years ago.",
        opts: [{ en: "True" }, { en: "False" }],
        correct: 1,
        fixedOrder: true,
      },
      {
        section: "reading",
        passage: "ge2_technology",
        en: "<b>True or False:</b> Online learning has become possible because of technology.",
        opts: [{ en: "True" }, { en: "False" }],
        correct: 0,
        fixedOrder: true,
      },
      {
        section: "reading",
        passage: "ge2_technology",
        en: "<b>True or False:</b> Some workers miss seeing their colleagues in person.",
        opts: [{ en: "True" }, { en: "False" }],
        correct: 0,
        fixedOrder: true,
      },
      {
        section: "reading",
        passage: "ge2_technology",
        en: "<b>True or False:</b> Technology has helped doctors find illnesses faster.",
        opts: [{ en: "True" }, { en: "False" }],
        correct: 0,
        fixedOrder: true,
      },
      {
        section: "reading",
        passage: "ge2_technology",
        en: "<b>True or False:</b> The text says people should spend all their free time using technology.",
        opts: [{ en: "True" }, { en: "False" }],
        correct: 1,
        fixedOrder: true,
      },
      {
        section: "reading",
        passage: "ge2_technology",
        en: "<b>True or False:</b> The writer believes outdoor activities are still important.",
        opts: [{ en: "True" }, { en: "False" }],
        correct: 0,
        fixedOrder: true,
      },

      // -- Passage 2: "Culture Around the World" (Version B) --
      {
        section: "reading",
        passage: "ge2_culture",
        en: "According to the text, culture includes...",
        opts: [
          { en: "only music and food." },
          { en: "traditions, languages, art and celebrations." },
          { en: "only history." },
          { en: "only festivals." },
        ],
        correct: 1,
      },
      {
        section: "reading",
        passage: "ge2_culture",
        en: "Learning about different cultures helps people...",
        opts: [
          { en: "become famous." },
          { en: "understand each other better." },
          { en: "travel for free." },
          { en: "speak every language." },
        ],
        correct: 1,
      },
      {
        section: "reading",
        passage: "ge2_culture",
        en: "People can learn about other cultures without travelling by...",
        opts: [
          { en: "reading books, watching films and using the internet." },
          { en: "buying expensive clothes." },
          { en: "moving to another country." },
          { en: "learning another language only." },
        ],
        correct: 0,
      },
      {
        section: "reading",
        passage: "ge2_culture",
        en: "During many festivals, people often...",
        opts: [
          { en: "stay at work all day." },
          { en: "wear traditional clothes and prepare special meals." },
          { en: "avoid spending time with family." },
          { en: "study history." },
        ],
        correct: 1,
      },
      {
        section: "reading",
        passage: "ge2_culture",
        en: "According to the text, people around the world...",
        opts: [
          { en: "have nothing in common." },
          { en: "enjoy spending time with family and friends." },
          { en: "celebrate the same festivals." },
          { en: "eat the same food." },
        ],
        correct: 1,
      },
      {
        section: "reading",
        passage: "ge2_culture",
        en: "What is the best title for this text?",
        opts: [
          { en: "Why People Like Travelling" },
          { en: "Festivals Around the World" },
          { en: "Culture Around the World" },
          { en: "Learning Foreign Languages" },
        ],
        correct: 2,
      },
      {
        section: "reading",
        passage: "ge2_culture",
        en: "<b>True or False:</b> Culture includes traditions, languages and music.",
        opts: [{ en: "True" }, { en: "False" }],
        correct: 0,
        fixedOrder: true,
      },
      {
        section: "reading",
        passage: "ge2_culture",
        en: "<b>True or False:</b> People can only learn about culture by travelling abroad.",
        opts: [{ en: "True" }, { en: "False" }],
        correct: 1,
        fixedOrder: true,
      },
      {
        section: "reading",
        passage: "ge2_culture",
        en: "<b>True or False:</b> Many festivals include traditional food and clothing.",
        opts: [{ en: "True" }, { en: "False" }],
        correct: 0,
        fixedOrder: true,
      },
      {
        section: "reading",
        passage: "ge2_culture",
        en: "<b>True or False:</b> The writer believes respecting other cultures is important.",
        opts: [{ en: "True" }, { en: "False" }],
        correct: 0,
        fixedOrder: true,
      },
    ],

    // ---- GRAMMAR (20) -----------------------------------------
    grammar: [
      // -- Version A --
      {
        section: "grammar",
        en: "Where ___ your parents work?",
        opts: [{ en: "do" }, { en: "does" }, { en: "did" }, { en: "are" }],
        correct: 0,
      },
      {
        section: "grammar",
        en: "Why ___ she crying now?",
        opts: [{ en: "does" }, { en: "is" }, { en: "did" }, { en: "has" }],
        correct: 1,
      },
      {
        section: "grammar",
        en: "They ___ football when it started to rain.",
        opts: [
          { en: "played" },
          { en: "were playing" },
          { en: "have played" },
          { en: "play" },
        ],
        correct: 1,
      },
      {
        section: "grammar",
        en: "Last weekend we ______ to Samarkand. It ______ fantastic.",
        opts: [{ en: "went / was" }, { en: "go / is" }, { en: "were / went" }],
        correct: 0,
      },
      {
        section: "grammar",
        en: "They ___ at school yesterday because it was a holiday.",
        opts: [
          { en: "weren't" },
          { en: "didn't" },
          { en: "aren't" },
          { en: "haven't" },
        ],
        correct: 0,
      },
      {
        section: "grammar",
        en: "Listen! The baby ___.",
        opts: [
          { en: "cries" },
          { en: "is crying" },
          { en: "cried" },
          { en: "has cried" },
        ],
        correct: 1,
      },
      {
        section: "grammar",
        en: "He ___ enough time to finish his homework.",
        opts: [
          { en: "didn't have" },
          { en: "doesn't had" },
          { en: "hasn't" },
          { en: "wasn't having" },
        ],
        correct: 0,
      },
      {
        section: "grammar",
        en: "My brother ___ usually drink coffee in the morning.",
        opts: [
          { en: "isn't" },
          { en: "don't" },
          { en: "doesn't" },
          { en: "wasn't" },
        ],
        correct: 2,
      },
      {
        section: "grammar",
        en: "She ___ never ___ sushi before.",
        opts: [
          { en: "did / eat" },
          { en: "has / eaten" },
          { en: "have / eaten" },
          { en: "has / eat" },
        ],
        correct: 1,
      },
      {
        section: "grammar",
        en: "What ___ they doing at this moment?",
        opts: [{ en: "do" }, { en: "are" }, { en: "were" }, { en: "did" }],
        correct: 1,
      },

      // -- Version B --
      {
        section: "grammar",
        en: "Yesterday, my friends _________ basketball after school.",
        opts: [
          { en: "play" },
          { en: "played" },
          { en: "playing" },
          { en: "plays" },
        ],
        correct: 1,
      },
      {
        section: "grammar",
        en: "Listen! The children _________ in the playground now.",
        opts: [
          { en: "play" },
          { en: "are playing" },
          { en: "played" },
          { en: "plays" },
        ],
        correct: 1,
      },
      {
        section: "grammar",
        en: "My parents _________ already _________ that new film.",
        opts: [
          { en: "have / seen" },
          { en: "has / seen" },
          { en: "have / saw" },
          { en: "has / saw" },
        ],
        correct: 0,
      },
      {
        section: "grammar",
        en: "I _________ my room when my cousin _________.",
        opts: [
          { en: "cleaned / arrived" },
          { en: "was cleaning / arrived" },
          { en: "cleaned / was arriving" },
          { en: "was cleaning / was arriving" },
        ],
        correct: 1,
      },
      {
        section: "grammar",
        en: "My father _________ coffee because he prefers tea.",
        opts: [
          { en: "doesn't like" },
          { en: "don't like" },
          { en: "isn't like" },
          { en: "hasn't like" },
        ],
        correct: 0,
      },
      {
        section: "grammar",
        en: "Where _________ your brother usually study?",
        opts: [{ en: "do" }, { en: "does" }, { en: "did" }, { en: "is" }],
        correct: 1,
      },
      {
        section: "grammar",
        en: "We _________ to Samarkand last spring.",
        opts: [
          { en: "have been" },
          { en: "went" },
          { en: "go" },
          { en: "were gone" },
        ],
        correct: 1,
      },
      {
        section: "grammar",
        en: "Look! It _________ outside.",
        opts: [
          { en: "snows" },
          { en: "is snowing" },
          { en: "snowed" },
          { en: "snow" },
        ],
        correct: 1,
      },
      {
        section: "grammar",
        en: "She _________ go to the cinema yesterday because she was ill.",
        opts: [
          { en: "didn't" },
          { en: "doesn't" },
          { en: "wasn't" },
          { en: "hasn't" },
        ],
        correct: 0,
      },
      {
        section: "grammar",
        en: "They _________ in this city since 2018.",
        opts: [
          { en: "live" },
          { en: "lived" },
          { en: "have lived" },
          { en: "are living" },
        ],
        correct: 2,
      },
    ],

    // ---- VOCABULARY (20) --------------------------------------
    vocabulary: [
      // -- Version A --
      {
        section: "vocabulary",
        en: "We are going to ________ Italy next summer.",
        opts: [
          { en: "go away on" },
          { en: "check into" },
          { en: "delay" },
        ],
        correct: 0,
      },
      {
        section: "vocabulary",
        en: "I need to ______ our hotel before we travel.",
        opts: [{ en: "unpack" }, { en: "book" }, { en: "stay on" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "The shop gave us a 20% ______ on these shoes.",
        opts: [
          { en: "save up for" },
          { en: "breakdown" },
          { en: "discount" },
        ],
        correct: 2,
      },
      {
        section: "vocabulary",
        en: "A ______ designs houses and other buildings.",
        opts: [{ en: "lawyer" }, { en: "architect" }, { en: "plumber" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "She didn't have enough ______ to pay for lunch.",
        opts: [{ en: "cost" }, { en: "cash" }, { en: "in sales" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "We ______ from the airport very early in the morning.",
        opts: [{ en: "took off" }, { en: "got to" }, { en: "set off" }],
        correct: 2,
      },
      {
        section: "vocabulary",
        en: "He carries his clothes in a ______ when he goes hiking.",
        opts: [{ en: "guidebook" }, { en: "raincoat" }, { en: "backpack" }],
        correct: 2,
      },
      {
        section: "vocabulary",
        en: "They ______ buy the tickets because they were too expensive.",
        opts: [
          { en: "paid back" },
          { en: "couldn't afford" },
          { en: "saved up for" },
        ],
        correct: 1,
      },
      {
        section: "vocabulary",
        // AUTHORING FIX (see "Deviations from the source papers" in the
        // file header). The printed stem read:
        //   "Emma was very ______ after she received the wonderful gift."
        // with options disappointed / tired / tiring, keyed A
        // (disappointed). None of the three options fits a wonderful
        // gift, so the item was unanswerable as printed. The answer key
        // identifies "disappointed" as the tested word, so the stem —
        // not the option list — is what was wrong. Rewritten to a
        // context where "disappointed" is correct. Options and answer
        // letter are unchanged from the paper.
        en: "Emma was very ______ when she did not receive the gift she wanted.",
        opts: [{ en: "disappointed" }, { en: "tired" }, { en: "tiring" }],
        correct: 0,
      },
      {
        section: "vocabulary",
        en: "That was a ______ idea. Everyone enjoyed it.",
        opts: [{ en: "lovely" }, { en: "silly" }, { en: "serious" }],
        correct: 0,
      },

      // -- Version B --
      {
        section: "vocabulary",
        en: "I want to open a _________ to keep my money safe.",
        opts: [{ en: "cash" }, { en: "bank account" }, { en: "the sales" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "My uncle is a _________ and writes software for a large company.",
        opts: [
          { en: "builder" },
          { en: "computer programmer" },
          { en: "shop assistant" },
        ],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "Tom felt very _________ when he forgot his teacher's name.",
        opts: [{ en: "interested" }, { en: "embarrassed" }, { en: "excited" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "Can you _________ me &pound;10 until tomorrow?",
        opts: [{ en: "borrow" }, { en: "lend" }, { en: "afford" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "We took our sick dog to the _________ yesterday.",
        opts: [{ en: "journalist" }, { en: "actor" }, { en: "vet" }],
        correct: 2,
      },
      {
        section: "vocabulary",
        en: "The homework was so difficult that I became completely _________.",
        opts: [{ en: "amazed" }, { en: "confused" }, { en: "tired" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "We can't _________ a new car this year because it is too expensive.",
        opts: [{ en: "cost" }, { en: "spend money on" }, { en: "afford" }],
        correct: 2,
      },
      {
        section: "vocabulary",
        en: "The _________ drove us safely to the train station.",
        opts: [{ en: "architect" }, { en: "politician" }, { en: "taxi driver" }],
        correct: 2,
      },
      {
        section: "vocabulary",
        en: "I was _________ when I heard that our school had won the national competition.",
        opts: [{ en: "shocked" }, { en: "surprised" }, { en: "annoyed" }],
        correct: 1,
      },
      {
        section: "vocabulary",
        en: "Emma wants to _________ a holiday in Italy, so she saves a little money every month.",
        opts: [{ en: "lend" }, { en: "save up for" }, { en: "borrow" }],
        correct: 1,
      },
    ],
  },
};

// ---------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------
// Mirrors `en` into `uz` / `ru` on every question and option, and
// stamps the section name onto each item. Consumers written for the
// trilingual C++ banks (notably the PDF generator, which prints a
// secondary language only when it differs from the English) then work
// against these banks without a single conditional.
//
// This is deliberately NOT a translation: General English questions
// stay in English everywhere. See the header note.
// ---------------------------------------------------------------
(function normalizeEnglishBanks() {
  const banks = window.ENGLISH_BANK || {};
  Object.keys(banks).forEach(function (courseKey) {
    const course = banks[courseKey];
    Object.keys(course).forEach(function (sectionKey) {
      const list = course[sectionKey];
      if (!Array.isArray(list)) return;
      list.forEach(function (q) {
        q.section = q.section || sectionKey;
        // English-only: mirror rather than translate.
        q.uz = q.en;
        q.ru = q.en;
        (q.opts || []).forEach(function (o) {
          o.uz = o.en;
          o.ru = o.en;
        });
      });
    });
  });
})();

// ---------------------------------------------------------------
// Metadata consumed by admin.js (section labels + bank capacity so
// the exam form can cap the per-section question counts) and by
// app.js (English-course detection).
// ---------------------------------------------------------------
window.ENGLISH_COURSE_IDS = ["geneng1", "geneng2"];

window.ENGLISH_SECTION_DEFS = [
  { key: "reading", label: "Reading" },
  { key: "grammar", label: "Grammar" },
  { key: "vocabulary", label: "Vocabulary" },
];

// Returns { reading: n, grammar: n, vocabulary: n } — how many
// questions the bank actually holds for a course. Used to validate
// the instructor's per-section counts so an exam can never be
// configured to demand more questions than exist.
window.englishBankCapacity = function (course) {
  const bank = (window.ENGLISH_BANK || {})[course];
  const out = { reading: 0, grammar: 0, vocabulary: 0 };
  if (!bank) return out;
  Object.keys(out).forEach(function (k) {
    out[k] = Array.isArray(bank[k]) ? bank[k].length : 0;
  });
  return out;
};

// True when the given course code is one of the General English
// courses. Single source of truth — admin.js, app.js and
// pdf-generator.js all defer to this when the file is loaded, and
// fall back to a local mirror of the same list when it isn't.
window.isEnglishCourse = function (course) {
  return (window.ENGLISH_COURSE_IDS || []).indexOf(course) !== -1;
};
