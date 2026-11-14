const localVideo = (title, description) => ({
  title,
  source: 'Local animated lesson',
  embedUrl: null,
  watchUrl: null,
  description,
});

export const lessons = [
  {
    id: 'first-hello', title: 'Start with a hello', subtitle: 'Small words. A new connection.', category: 'First conversations', level: 'HSK 1', duration: 8, accent: 'sage', hanzi: '你好', pinyin: 'Nǐ hǎo', description: 'Say hello, introduce yourself, and make your first connection in Chinese.', objectives: ['Greet someone naturally', 'Introduce yourself with 我叫', 'Choose a polite greeting for the situation'],
    phrases: [{hanzi:'你好！',pinyin:'Nǐ hǎo!',english:'Hello!'},{hanzi:'我叫 Alex。',pinyin:'Wǒ jiào Alex.',english:'My name is Alex.'},{hanzi:'你叫什么名字？',pinyin:'Nǐ jiào shénme míngzi?',english:'What is your name?'},{hanzi:'很高兴认识你。',pinyin:'Hěn gāoxìng rènshi nǐ.',english:'Nice to meet you.'}],
    vocabulary: [{hanzi:'你',pinyin:'nǐ',english:'you'},{hanzi:'好',pinyin:'hǎo',english:'good; well'},{hanzi:'叫',pinyin:'jiào',english:'to be called'},{hanzi:'名字',pinyin:'míngzi',english:'name'},{hanzi:'您',pinyin:'nín',english:'you, respectful form'}],
    writingPrompt:{title:'Your first introduction',instruction:'Write 2–4 short Chinese sentences. Say hello, give your name, and ask the other person their name.',starter:'你好！我叫 Alex。',tip:'Use 我叫 + name. A Chinese question mark is written as ？.'},
    video:localVideo('Your first Chinese conversation','A short captioned animation with Chinese, pinyin, and English. Play phrase audio separately.'), videoFrames:[{hanzi:'你好！',pinyin:'Nǐ hǎo!',english:'Hello!',note:'A simple way to begin.'},{hanzi:'我叫 Alex。',pinyin:'Wǒ jiào Alex.',english:'My name is Alex.',note:'我叫 + your name'},{hanzi:'你叫什么名字？',pinyin:'Nǐ jiào shénme míngzi?',english:'What is your name?',note:'Start a conversation.'},{hanzi:'很高兴认识你。',pinyin:'Hěn gāoxìng rènshi nǐ.',english:'Nice to meet you.',note:'Try your own introduction.'}],
    quizzes:[{id:'hello-1',conceptId:'greeting',question:'Which phrase means “Hello”?',options:['你好','谢谢','再见','请问'],answer:0,explanation:'你好 (nǐ hǎo) is a common greeting.'},{id:'hello-2',conceptId:'introduction',question:'How do you say “My name is Alex”?',options:['你叫 Alex','我叫 Alex','我好 Alex','认识 Alex'],answer:1,explanation:'我叫 + name means “My name is …”.'}],
  },
  {
    id:'coffee-order',title:'A coffee, please',subtitle:'Make your next café visit count.',category:'Everyday Chinese',level:'HSK 1–2',duration:10,accent:'peach',hanzi:'咖啡',pinyin:'Kāfēi',description:'Order a drink, choose hot or iced, and ask the price with confidence.',objectives:['Order with 我想要','Use the measure word 杯','Ask how much something costs'],
    phrases:[{hanzi:'我想要一杯咖啡。',pinyin:'Wǒ xiǎng yào yì bēi kāfēi.',english:'I would like a cup of coffee.'},{hanzi:'要热的，还是冰的？',pinyin:'Yào rè de, háishi bīng de?',english:'Would you like it hot or iced?'},{hanzi:'热的，谢谢。',pinyin:'Rè de, xièxie.',english:'Hot, thank you.'},{hanzi:'多少钱？',pinyin:'Duōshao qián?',english:'How much is it?'}],
    vocabulary:[{hanzi:'咖啡',pinyin:'kāfēi',english:'coffee'},{hanzi:'杯',pinyin:'bēi',english:'cup; measure word'},{hanzi:'热',pinyin:'rè',english:'hot'},{hanzi:'冰',pinyin:'bīng',english:'ice; iced'},{hanzi:'钱',pinyin:'qián',english:'money'}],
    writingPrompt:{title:'Your café conversation',instruction:'Write a short conversation between you and a café worker. Order a drink, choose hot or iced, and ask the price.',starter:'我：你好！我想要一杯咖啡。\n店员：',tip:'Use 一杯 for a cup. 我想要 makes a useful request.'},
    video:localVideo('Order a coffee in Chinese','Four captioned scenes for a café exchange. Mandarin phrase audio is available below.'),videoFrames:[{hanzi:'我想要一杯咖啡。',pinyin:'Wǒ xiǎng yào yì bēi kāfēi.',english:'I would like a cup of coffee.',note:'我想要 + what you would like'},{hanzi:'热的，还是冰的？',pinyin:'Rè de, háishi bīng de?',english:'Hot or iced?',note:'还是 offers a choice.'},{hanzi:'热的，谢谢。',pinyin:'Rè de, xièxie.',english:'Hot, thank you.',note:'A short answer works here.'},{hanzi:'多少钱？',pinyin:'Duōshao qián?',english:'How much is it?',note:'Try swapping coffee for tea: 茶.'}],
    quizzes:[{id:'coffee-1',conceptId:'measure-word',question:'Which word means “cup” in 一杯咖啡?',options:['杯','钱','冰','热'],answer:0,explanation:'杯 (bēi) is the measure word for a cup.'},{id:'coffee-2',conceptId:'price-question',question:'What does 多少钱？ ask?',options:['Where is it?','Is it hot?','How much is it?','What is your name?'],answer:2,explanation:'多少钱？ means “How much is it?”'}],
  },
  {
    id:'finding-your-way',title:'Find your way',subtitle:'A few words can take you places.',category:'Out and about',level:'HSK 2',duration:12,accent:'blue',hanzi:'往哪儿',pinyin:'Wǎng nǎr',description:'Ask for directions, recognise key words, and check what you heard.',objectives:['Ask where a place is','Recognise straight, left, and right','Use 请问 to open a polite question'],
    phrases:[{hanzi:'请问，地铁站在哪儿？',pinyin:'Qǐngwèn, dìtiě zhàn zài nǎr?',english:'Excuse me, where is the subway station?'},{hanzi:'一直走，然后左转。',pinyin:'Yìzhí zǒu, ránhòu zuǒ zhuǎn.',english:'Go straight, then turn left.'},{hanzi:'在右边。',pinyin:'Zài yòubian.',english:'It is on the right.'},{hanzi:'离这里远吗？',pinyin:'Lí zhèlǐ yuǎn ma?',english:'Is it far from here?'}],
    vocabulary:[{hanzi:'地铁站',pinyin:'dìtiě zhàn',english:'subway station'},{hanzi:'一直',pinyin:'yìzhí',english:'straight on'},{hanzi:'左',pinyin:'zuǒ',english:'left'},{hanzi:'右',pinyin:'yòu',english:'right'},{hanzi:'远',pinyin:'yuǎn',english:'far'}],
    writingPrompt:{title:'Give a friend directions',instruction:'Write 3–5 short sentences giving directions. Include straight ahead and at least one turn.',starter:'从这里一直走，',tip:'Use 然后 to connect the next step. 左转 means turn left; 右转 means turn right.'},
    video:localVideo('Ask for directions','An animated phrase lesson with readable bilingual captions.'),videoFrames:[{hanzi:'请问，地铁站在哪儿？',pinyin:'Qǐngwèn, dìtiě zhàn zài nǎr?',english:'Excuse me, where is the subway station?',note:'请问 is a polite opener.'},{hanzi:'一直走。',pinyin:'Yìzhí zǒu.',english:'Go straight.',note:'Listen for the direction word.'},{hanzi:'然后左转。',pinyin:'Ránhòu zuǒ zhuǎn.',english:'Then turn left.',note:'右转 means turn right.'},{hanzi:'离这里远吗？',pinyin:'Lí zhèlǐ yuǎn ma?',english:'Is it far from here?',note:'吗 asks a yes-or-no question.'}],
    quizzes:[{id:'way-1',conceptId:'directions',question:'What does 左转 mean?',options:['Turn right','Go straight','Turn left','Stop here'],answer:2,explanation:'左 means left and 转 means turn.'},{id:'way-2',conceptId:'polite-opener',question:'Which phrase politely means “Excuse me” before a question?',options:['请问','谢谢','没关系','再见'],answer:0,explanation:'请问 (qǐngwèn) is a polite question opener.'}],
  },
  {
    id:'past-experiences',title:'Have you been there?',subtitle:'Tell a story with 了 and 过.',category:'Grammar in context',level:'HSK 2–3',duration:12,accent:'lavender',hanzi:'了 · 过',pinyin:'Le · guo',description:'Explore the difference between a completed event and a past experience.',objectives:['Use 过 for experience','Use verb + 了 in a completed-event example','Avoid treating either particle as a general past-tense ending'],
    phrases:[{hanzi:'你去过北京吗？',pinyin:'Nǐ qùguo Běijīng ma?',english:'Have you been to Beijing?'},{hanzi:'我去过北京。',pinyin:'Wǒ qùguo Běijīng.',english:'I have been to Beijing.'},{hanzi:'我昨天去了书店。',pinyin:'Wǒ zuótiān qù le shūdiàn.',english:'I went to the bookshop yesterday.'},{hanzi:'我没去过上海。',pinyin:'Wǒ méi qùguo Shànghǎi.',english:'I have not been to Shanghai.'}],
    vocabulary:[{hanzi:'过',pinyin:'guo',english:'particle indicating an experience'},{hanzi:'了',pinyin:'le',english:'particle used for a completed event or changed situation'},{hanzi:'昨天',pinyin:'zuótiān',english:'yesterday'},{hanzi:'书店',pinyin:'shūdiàn',english:'bookshop'},{hanzi:'没',pinyin:'méi',english:'not; negates an experience here'}],
    writingPrompt:{title:'Something you have tried',instruction:'Write 3–5 sentences about a place you have visited or a food you have tried. Include 过 and a specific completed event with 了.',starter:'我去过……\n上个星期，',tip:'过 highlights an experience. Here, verb + 了 presents a completed event.'},
    video:localVideo('了 and 过 in context','Compare experience and completed-event examples through a captioned animation.'),videoFrames:[{hanzi:'你去过北京吗？',pinyin:'Nǐ qùguo Běijīng ma?',english:'Have you been to Beijing?',note:'过 asks about an experience.'},{hanzi:'我去过北京。',pinyin:'Wǒ qùguo Běijīng.',english:'I have been to Beijing.',note:'The focus is the experience.'},{hanzi:'我昨天去了书店。',pinyin:'Wǒ zuótiān qù le shūdiàn.',english:'I went to the bookshop yesterday.',note:'Here, 了 presents a completed event.'},{hanzi:'我没去过上海。',pinyin:'Wǒ méi qùguo Shànghǎi.',english:'I have not been to Shanghai.',note:'Negate with 没 + verb + 过.'}],
    quizzes:[{id:'past-1',conceptId:'experience-particle',question:'Which particle highlights having an experience?',options:['过','了','吗','的'],answer:0,explanation:'过 is used for an experience such as “have been”.'},{id:'past-2',conceptId:'completed-event',question:'In 我昨天去了书店, what does the example present?',options:['A future plan','A completed event yesterday','A question about experience','A polite request'],answer:1,explanation:'The time word 昨天 and verb + 了 present a completed event in this context.'}],
  },
  {
    id:'at-the-table',title:'A place at the table',subtitle:'Good food starts with a conversation.',category:'Language & culture',level:'HSK 2',duration:10,accent:'sand',hanzi:'请坐',pinyin:'Qǐng zuò',description:'Ask for a menu, explain a food preference, and practise polite requests at a restaurant.',objectives:['Make a polite request with 请 or 麻烦您','Describe a food preference','Recognise that politeness depends on people and context'],
    phrases:[{hanzi:'请给我菜单。',pinyin:'Qǐng gěi wǒ càidān.',english:'Please give me the menu.'},{hanzi:'我不吃辣。',pinyin:'Wǒ bù chī là.',english:'I do not eat spicy food.'},{hanzi:'麻烦您给我一杯水。',pinyin:'Máfan nín gěi wǒ yì bēi shuǐ.',english:'Could you please bring me a glass of water?'},{hanzi:'谢谢，很好吃！',pinyin:'Xièxie, hěn hǎochī!',english:'Thank you, it is delicious!'}],
    vocabulary:[{hanzi:'菜单',pinyin:'càidān',english:'menu'},{hanzi:'辣',pinyin:'là',english:'spicy'},{hanzi:'水',pinyin:'shuǐ',english:'water'},{hanzi:'麻烦您',pinyin:'máfan nín',english:'polite request opener'},{hanzi:'好吃',pinyin:'hǎochī',english:'delicious, of food'}],
    writingPrompt:{title:'A polite restaurant request',instruction:'Write a short restaurant dialogue. Ask for a menu, state a food preference, and request a drink. Use 请 or 麻烦您.',starter:'你好！请给我菜单。\n',tip:'Specific requests help people understand you. Tell staff clearly if you have an allergy.'},
    video:localVideo('Polite requests at a restaurant','Read along with practical restaurant phrases, then listen below.'),videoFrames:[{hanzi:'请给我菜单。',pinyin:'Qǐng gěi wǒ càidān.',english:'Please give me the menu.',note:'请 introduces a polite request.'},{hanzi:'我不吃辣。',pinyin:'Wǒ bù chī là.',english:'I do not eat spicy food.',note:'State a preference clearly.'},{hanzi:'麻烦您给我一杯水。',pinyin:'Máfan nín gěi wǒ yì bēi shuǐ.',english:'Could you please bring me water?',note:'麻烦您 softens a request.'},{hanzi:'谢谢，很好吃！',pinyin:'Xièxie, hěn hǎochī!',english:'Thank you, it is delicious!',note:'Politeness depends on context.'}],
    quizzes:[{id:'table-1',conceptId:'polite-request',question:'Which phrase introduces a polite request?',options:['麻烦您','多少钱','在哪儿','过'],answer:0,explanation:'麻烦您 is a polite way to introduce a request.'},{id:'table-2',conceptId:'food-preference',question:'What does 我不吃辣 mean?',options:['I like spicy food.','I do not eat spicy food.','Please add water.','The food is delicious.'],answer:1,explanation:'不吃 means do not eat, and 辣 means spicy.'}],
  },
  {
    id:'daily-rhythm',title:'Your everyday rhythm',subtitle:'Put a little Chinese into your day.',category:'Everyday Chinese',level:'HSK 1–2',duration:9,accent:'sage',hanzi:'每天',pinyin:'Měitiān',description:'Talk about your daily routine, say the time, and put events in a natural order.',objectives:['Put a time expression before the verb','Describe everyday activities','Connect actions with 然后'],
    phrases:[{hanzi:'我每天七点起床。',pinyin:'Wǒ měitiān qī diǎn qǐchuáng.',english:'I get up at seven every day.'},{hanzi:'我先吃早饭，然后去学校。',pinyin:'Wǒ xiān chī zǎofàn, ránhòu qù xuéxiào.',english:'I have breakfast first, then go to school.'},{hanzi:'你几点下班？',pinyin:'Nǐ jǐ diǎn xiàbān?',english:'What time do you finish work?'},{hanzi:'我晚上学习中文。',pinyin:'Wǒ wǎnshang xuéxí Zhōngwén.',english:'I study Chinese in the evening.'}],
    vocabulary:[{hanzi:'每天',pinyin:'měitiān',english:'every day'},{hanzi:'起床',pinyin:'qǐchuáng',english:'to get up'},{hanzi:'早饭',pinyin:'zǎofàn',english:'breakfast'},{hanzi:'然后',pinyin:'ránhòu',english:'then; after that'},{hanzi:'晚上',pinyin:'wǎnshang',english:'evening'}],
    writingPrompt:{title:'A day in your life',instruction:'Write 4–6 sentences about a typical day. Include two times and connect two activities using 先……然后…….',starter:'我每天……点起床。\n',tip:'Place time before the action: 我 + 七点 + 起床.'},
    video:localVideo('Talk about your daily routine','A short animation about daily activities and word order, with pinyin and English captions.'),videoFrames:[{hanzi:'我每天七点起床。',pinyin:'Wǒ měitiān qī diǎn qǐchuáng.',english:'I get up at seven every day.',note:'Time goes before the action.'},{hanzi:'我先吃早饭。',pinyin:'Wǒ xiān chī zǎofàn.',english:'I have breakfast first.',note:'先 introduces the first action.'},{hanzi:'然后去学校。',pinyin:'Ránhòu qù xuéxiào.',english:'Then I go to school.',note:'然后 introduces what comes next.'},{hanzi:'我晚上学习中文。',pinyin:'Wǒ wǎnshang xuéxí Zhōngwén.',english:'I study Chinese in the evening.',note:'Describe your own day.'}],
    quizzes:[{id:'daily-1',conceptId:'time-order',question:'Where does 七点 go in 我每天七点起床？',options:['After the action','Before the action','At the end of a question','It is omitted'],answer:1,explanation:'Time expressions commonly come before the action.'},{id:'daily-2',conceptId:'sequence',question:'What does 然后 mean?',options:['Before','Then; after that','Every day','At night'],answer:1,explanation:'然后 links to the next action.'}],
  },
];

const additionalQuizzes = {
  'first-hello': [
    { id: 'hello-3', question: 'Which word is a respectful form of “you”?', options: ['我', '您', '名字', '叫'], answer: 1, explanation: '您 (nín) is a respectful form of 你. The appropriate form depends on the relationship and context.' },
    { id: 'hello-4', question: 'Someone asks 你叫什么名字？ What are they asking?', options: ['How are you?', 'Where are you going?', 'What is your name?', 'How much is it?'], answer: 2, explanation: '你叫什么名字？ asks “What is your name?” Reply with 我叫 + your name.' },
  ],
  'coffee-order': [
    { id: 'coffee-3', question: 'The worker asks 热的，还是冰的？ What choice are they offering?', options: ['Large or small', 'Coffee or tea', 'Cash or card', 'Hot or iced'], answer: 3, explanation: '热 means hot and 冰 means iced here. 还是 presents the choice in a question.' },
    { id: 'coffee-4', question: 'How would you change your order to “I would like a cup of tea”?', options: ['我想要一杯茶。', '多少钱茶？', '我冰茶名字。', '你叫什么茶？'], answer: 0, explanation: 'Keep the pattern 我想要一杯 + drink and replace 咖啡 with 茶 (chá, tea).' },
  ],
  'finding-your-way': [
    { id: 'way-3', question: 'In 地铁站在哪儿？, what information are you asking for?', options: ['The ticket price', 'The location of the subway station', 'The arrival time', 'The name of a passenger'], answer: 1, explanation: '在哪儿？ means “Where is …?” 地铁站 is the subway station.' },
    { id: 'way-4', question: 'You hear 在右边。 Where should you look?', options: ['On the left', 'Straight ahead', 'On the right', 'Behind you'], answer: 2, explanation: '右边 (yòubian) means the right-hand side. 左边 is the left-hand side.' },
  ],
  'past-experiences': [
    { id: 'past-3', question: 'Which sentence says “I have not been to Shanghai”?', options: ['我去了上海。', '我去过上海。', '我想去上海。', '我没去过上海。'], answer: 3, explanation: 'Negate an experience with 没 + verb + 过: 我没去过上海。' },
    { id: 'past-4', question: 'Which explanation best describes 了 and 过?', options: ['Both are general past-tense endings.', 'They always have the same meaning.', '过 can mark experience; 了 has uses including completed events and changed situations.', 'They are only used in questions.'], answer: 2, explanation: 'Chinese does not simply add an English-style past-tense ending. Meaning depends on the particle and the whole sentence.' },
  ],
  'at-the-table': [
    { id: 'table-3', question: 'You enjoy your meal and say 很好吃！ What are you saying?', options: ['It is delicious!', 'It is too spicy!', 'The menu, please.', 'I would like water.'], answer: 0, explanation: '好吃 (hǎochī) means delicious when talking about food. 很好吃 is a natural positive comment.' },
    { id: 'table-4', question: 'Which sentence politely requests a glass of water?', options: ['我不吃辣。', '麻烦您给我一杯水。', '水在哪里工作？', '你叫什么水？'], answer: 1, explanation: '麻烦您 politely introduces the request, and 一杯水 means a glass of water.' },
  ],
  'daily-rhythm': [
    { id: 'daily-3', question: 'In 我先吃早饭，然后去学校。, which action happens first?', options: ['Going to school', 'Finishing work', 'Having breakfast', 'Studying Chinese'], answer: 2, explanation: '先 means first. The sentence says “I have breakfast first, then go to school.”' },
    { id: 'daily-4', question: 'A friend asks 你几点下班？ What do they want to know?', options: ['Your name', 'What time you get up', 'Where you study', 'What time you finish work'], answer: 3, explanation: '几点 asks what time; 下班 means to finish work. 起床 would mean to get up.' },
  ],
};

const prerequisiteMap = {
  'first-hello': [],
  'coffee-order': ['first-hello'],
  'finding-your-way': ['first-hello'],
  'past-experiences': ['daily-rhythm'],
  'at-the-table': ['coffee-order'],
  'daily-rhythm': ['first-hello'],
};
for (const lesson of lessons) {
  lesson.prerequisites = prerequisiteMap[lesson.id];
  lesson.quizzes.push(...additionalQuizzes[lesson.id]);
  for (const quiz of lesson.quizzes) quiz.conceptId = lesson.id;
}

export const writingPrompts = lessons.map((lesson) => ({ id: lesson.id, lessonId: lesson.id, level: lesson.level, ...lesson.writingPrompt }));
export const findLesson = (id) => lessons.find((lesson) => lesson.id === id) || lessons[0];

// UI translations only: lesson IDs, answer order, pinyin and English reference
// translations remain stable across languages and for backend assessment.
export const lessonTranslations = {
  'first-hello': {
    title: '从一句你好开始',
    subtitle: '简单的话语，开启新的交流。',
    category: '初次交谈',
    description: '学习打招呼、自我介绍，用中文迈出交流的第一步。',
    objectives: ['自然地打招呼', '用“我叫”介绍自己', '根据交谈场合选择合适的称呼'],
    writingPrompt: {
      title: '写一段自我介绍',
      instruction: '用中文写2—4个短句：打个招呼，介绍自己的名字，再问问对方叫什么。',
      tip: '用“我叫＋名字”介绍自己。中文问号写作“？”。',
    },
    video: { title: '你的第一段中文对话', description: '配有中文、拼音和英文的短动画。点击下方例句按钮，可单独收听普通话发音。' },
    videoNotes: ['用一句简单的问候开始。', '我叫＋你的名字', '开启一段对话。', '试着介绍一下自己。'],
    quizQuestions: {
      'hello-1': { question: '哪句话表示“Hello”？', explanation: '“你好”（nǐ hǎo）是常用的问候语。' },
      'hello-2': { question: '怎样用中文说“My name is Alex”？', explanation: '“我叫＋名字”用来介绍自己的姓名。' },
      'hello-3': { question: '哪个词是“你”的尊称？', explanation: '“您”（nín）是“你”的尊称。具体用法取决于交谈关系和场合。' },
      'hello-4': { question: '别人问“你叫什么名字？”，想知道什么？', options: ['你的近况怎么样', '你要去哪里', '你的名字是什么', '东西多少钱'], explanation: '这句话是在询问姓名，可以用“我叫＋名字”回答。' },
    },
  },
  'coffee-order': {
    title: '请给我一杯咖啡',
    subtitle: '让下一次咖啡店之行多一点中文。',
    category: '日常中文',
    description: '学习点饮品、选择冷热、询问价格，自信完成一次简单点单。',
    objectives: ['用“我想要”点单', '使用量词“杯”', '询问商品价格'],
    writingPrompt: {
      title: '写一段咖啡店对话',
      instruction: '写一段你与店员的简短对话：点一杯饮品，说明要热的还是冰的，再询问价格。',
      tip: '一杯饮品可以用“一杯”来表达。“我想要”是实用的请求句式。',
    },
    video: { title: '用中文点一杯咖啡', description: '通过四个带字幕的场景学习咖啡店对话。下方可收听普通话例句。' },
    videoNotes: ['我想要＋你想点的东西', '“还是”用于提出选择。', '这里可以简短作答。', '试试把“咖啡”换成“茶”。'],
    quizQuestions: {
      'coffee-1': { question: '“一杯咖啡”中，哪个字是表示杯子的量词？', explanation: '“杯”（bēi）可以作量词，用于按杯计量的饮品。' },
      'coffee-2': { question: '“多少钱？”是在询问什么？', options: ['东西在哪里', '饮品是不是热的', '东西的价格', '对方的名字'], explanation: '“多少钱？”用于询问价格。' },
      'coffee-3': { question: '店员问“热的，还是冰的？”，是在让你选择什么？', options: ['大杯还是小杯', '咖啡还是茶', '现金还是刷卡', '热饮还是冰饮'], explanation: '“热”表示温度高，“冰”在这里表示冰饮。“还是”用于选择问句。' },
      'coffee-4': { question: '如果想把订单改成“I would like a cup of tea”，应该怎么说？', explanation: '保留“我想要一杯＋饮品”的句式，把“咖啡”换成“茶”（chá）即可。' },
    },
  },
  'finding-your-way': {
    title: '问路不迷路',
    subtitle: '学会几个词，就能走得更远。',
    category: '出行交流',
    description: '学习问路、听懂方向关键词，并确认自己理解的信息。',
    objectives: ['询问某个地方在哪里', '识别直行、左转和右转', '用“请问”礼貌地提问'],
    writingPrompt: {
      title: '给朋友指路',
      instruction: '用3—5个中文短句为朋友指路。包含“一直走”，并至少说明一次转弯。',
      tip: '用“然后”连接下一步。“左转”是向左拐，“右转”是向右拐。',
    },
    video: { title: '用中文问路', description: '带有中英字幕和拼音的问路短动画。点击下方例句练习听说。' },
    videoNotes: ['“请问”是礼貌的提问开头。', '注意听方向关键词。', '“右转”表示向右拐。', '“吗”用于是非问句。'],
    quizQuestions: {
      'way-1': { question: '“左转”是什么意思？', options: ['向右拐', '一直走', '向左拐', '在这里停下'], explanation: '“左”表示左边，“转”在这里表示转弯。' },
      'way-2': { question: '提问前，哪句话可以礼貌地表示“Excuse me”？', explanation: '“请问”（qǐngwèn）常用于礼貌地引出问题。' },
      'way-3': { question: '问“地铁站在哪儿？”，是在询问什么信息？', options: ['车票价格', '地铁站的位置', '到站时间', '乘客姓名'], explanation: '“在哪儿？”用于询问位置。“地铁站”指乘坐地铁的车站。' },
      'way-4': { question: '听到“在右边。”，你应该看向哪里？', options: ['左边', '正前方', '右边', '身后'], explanation: '“右边”（yòubian）表示右手一侧，另一侧是“左边”。' },
    },
  },
  'past-experiences': {
    title: '你去过那里吗？',
    subtitle: '用“了”和“过”讲述经历。',
    category: '情境语法',
    description: '通过日常例句，理解已完成的事件与过去经历之间的表达区别。',
    objectives: ['用“过”表达经历', '理解“动词＋了”表示已完成事件的例句', '避免把“了”或“过”直接等同于英语过去时词尾'],
    writingPrompt: {
      title: '写一段你的经历',
      instruction: '用3—5句话写一个去过的地方或尝试过的食物。用“过”表达经历，再用“了”写一个具体完成的事件。',
      tip: '“过”突出曾经有过的经历。本课例句中，“动词＋了”突出已完成的事件。',
    },
    video: { title: '在语境中理解“了”和“过”', description: '通过带字幕的短动画，对比经历表达与已完成事件的表达。' },
    videoNotes: ['“过”用于询问经历。', '重点是有没有这段经历。', '本句中的“了”表示已完成的事件。', '否定经历：没＋动词＋过。'],
    quizQuestions: {
      'past-1': { question: '哪个助词可以突出“曾有过某种经历”？', explanation: '“过”可以表示经历，例如“去过”表示曾经到过。' },
      'past-2': { question: '“我昨天去了书店。”这句话在本课语境中表达什么？', options: ['未来的计划', '昨天发生并完成的事件', '对经历的提问', '礼貌的请求'], explanation: '时间词“昨天”和“动词＋了”在这个语境中共同表达已完成的事件。' },
      'past-3': { question: '哪句话表示“I have not been to Shanghai”？', explanation: '否定经历可以用“没＋动词＋过”：我没去过上海。' },
      'past-4': { question: '关于“了”和“过”，下面哪种解释最恰当？', options: ['它们都是通用的过去时词尾。', '它们的意思始终相同。', '“过”可表示经历；“了”可表示已完成事件或情况变化等。', '它们只能用于问句。'], explanation: '中文并不直接添加英语式的过去时词尾，含义取决于助词及整句话的语境。' },
    },
  },
  'at-the-table': {
    title: '一起坐下来吃饭',
    subtitle: '一次愉快的用餐，从交流开始。',
    category: '语言与文化',
    description: '学习要菜单、表达饮食偏好，在餐厅里练习礼貌请求。',
    objectives: ['用“请”或“麻烦您”提出礼貌请求', '表达饮食偏好', '理解礼貌表达与交谈对象、语境的关系'],
    writingPrompt: {
      title: '写一段餐厅里的礼貌对话',
      instruction: '写一段简短的餐厅对话：要一份菜单，说明饮食偏好，再点一杯饮品。至少使用一次“请”或“麻烦您”。',
      tip: '具体表达需求有助于沟通。如果存在食物过敏，请明确告诉餐厅工作人员。',
    },
    video: { title: '在餐厅礼貌地提出请求', description: '跟读实用的餐厅短句，再点击下方发音按钮收听普通话示范。' },
    videoNotes: ['“请”用于引出礼貌请求。', '清楚地表达自己的偏好。', '“麻烦您”让请求更委婉。', '礼貌表达取决于具体语境。'],
    quizQuestions: {
      'table-1': { question: '哪句话适合用来引出礼貌请求？', explanation: '“麻烦您”是礼貌地引出请求的一种表达方式。' },
      'table-2': { question: '“我不吃辣。”是什么意思？', options: ['我喜欢辣的食物。', '我不吃辣的食物。', '请加一点水。', '食物很好吃。'], explanation: '“不吃”表示不食用，“辣”在这里指辣味食物。' },
      'table-3': { question: '用餐时说“很好吃！”，是在表达什么？', options: ['食物很美味', '食物太辣了', '想要一份菜单', '想要一杯水'], explanation: '“好吃”（hǎochī）表示食物美味，“很好吃”是自然的赞美表达。' },
      'table-4': { question: '哪句话是在礼貌地要一杯水？', explanation: '“麻烦您”礼貌地引出请求，“一杯水”说明想要的东西。' },
    },
  },
  'daily-rhythm': {
    title: '说说你的每一天',
    subtitle: '给日常生活加一点中文。',
    category: '日常中文',
    description: '学习描述日常安排、表达时间，并自然地组织事件顺序。',
    objectives: ['把时间词放在动作之前', '描述日常活动', '用“然后”连接动作'],
    writingPrompt: {
      title: '写写你的一天',
      instruction: '用4—6句话描述平常的一天。至少写出两个时间，并用“先……然后……”连接两个活动。',
      tip: '时间通常放在动作之前：我＋七点＋起床。',
    },
    video: { title: '用中文描述日常安排', description: '通过带有中文、拼音和英文字幕的短动画，学习日常活动与时间词语序。' },
    videoNotes: ['时间放在动作之前。', '“先”引出第一个动作。', '“然后”引出接下来的动作。', '试着描述你自己的一天。'],
    quizQuestions: {
      'daily-1': { question: '在“我每天七点起床。”中，“七点”放在哪里？', options: ['动作之后', '动作之前', '问句末尾', '省略不写'], explanation: '时间表达通常放在动作之前。' },
      'daily-2': { question: '“然后”是什么意思？', options: ['在……之前', '接着；在那之后', '每一天', '在夜里'], explanation: '“然后”用来引出接下来的动作。' },
      'daily-3': { question: '“我先吃早饭，然后去学校。”中，哪个活动先发生？', options: ['去学校', '下班', '吃早饭', '学习中文'], explanation: '“先”引出先发生的动作，这句话先吃早饭，再去学校。' },
      'daily-4': { question: '朋友问“你几点下班？”，想知道什么？', options: ['你的名字', '你几点起床', '你在哪里学习', '你几点结束工作'], explanation: '“几点”询问时间，“下班”表示结束工作。“起床”则表示从床上起来。' },
    },
  },
};

export function getLocalizedLessons(language = 'en') {
  return lessons.map((lesson) => {
    const localized = language === 'zh' ? lessonTranslations[lesson.id] : null;
    const copy = {
      ...lesson,
      objectives: [...lesson.objectives],
      prerequisites: [...lesson.prerequisites],
      phrases: lesson.phrases.map((phrase) => ({ ...phrase })),
      vocabulary: lesson.vocabulary.map((word) => ({ ...word })),
      writingPrompt: { ...lesson.writingPrompt },
      video: { ...lesson.video },
      videoFrames: lesson.videoFrames.map((frame) => ({ ...frame })),
      quizzes: lesson.quizzes.map((quiz) => ({ ...quiz, options: [...quiz.options] })),
    };
    if (!localized) return copy;
    for (const key of ['title', 'subtitle', 'category', 'description']) copy[key] = localized[key];
    copy.objectives = [...localized.objectives];
    copy.writingPrompt = { ...copy.writingPrompt, ...localized.writingPrompt };
    copy.video = { ...copy.video, ...localized.video };
    copy.videoFrames = copy.videoFrames.map((frame, index) => ({ ...frame, note: localized.videoNotes[index] || frame.note }));
    copy.quizzes = copy.quizzes.map((quiz) => {
      const translation = localized.quizQuestions[quiz.id];
      if (!translation) return quiz;
      return { ...quiz, ...translation, options: [...(translation.options || quiz.options)] };
    });
    return copy;
  });
}
