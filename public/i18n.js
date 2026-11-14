// UI translations stay local; switching language never sends a model request.
let currentLanguage='en';
try{currentLanguage=localStorage.getItem('hanzi-interface-language')==='zh'?'zh':'en';}catch{}
export const getLanguage=()=>currentLanguage;
export function setLanguage(language){currentLanguage=language==='zh'?'zh':'en';try{localStorage.setItem('hanzi-interface-language',currentLanguage);}catch{}return currentLanguage;}
const zh={
 'The computer learning service is unavailable. Please try again later.':'电脑伴学服务暂时不可用，请稍后重试。',
 'This website cannot connect to the learning service.':'当前网页无法连接伴学服务。',
 'Your learning session is invalid. Refresh this page to start again.':'学习档案连接已失效，请刷新网页重试。',
 'The learning service is temporarily offline. Please try again shortly. Chinese pronunciation is still available.':'伴学服务暂时离线，请稍后重试。你仍可使用中文自由朗读。',
 'The learning service is not connected yet. You can use Chinese pronunciation now; guided lessons will be available when the service is connected.':'伴学服务尚未连接。现在可以使用中文自由朗读；课程指导将在服务连接后开放。',
 'Open pronunciation':'打开自由朗读','The learning service address is unavailable.':'伴学服务地址暂不可用。','Pronunciation available':'自由朗读可用',
 'The learning service is not configured. Please contact the site administrator.':'伴学服务尚未配置，请联系网站管理员。',
 'The learning service took too long to respond. Please try again.':'伴学助手响应超时，请重试。',
 'The learning service could not be reached. Check the network and try again.':'暂时无法连接伴学服务，请检查网络后重试。',
 'The learning service is temporarily unavailable. Please try again or contact the site administrator.':'伴学服务暂时不可用，请重试或联系网站管理员。',
 'The learning service returned an incomplete response. Please try again.':'伴学反馈不完整，请重试。',
 'The learning service returned an invalid plan step. Please try again.':'学习计划中有无效步骤，请重新生成。',
 'The learning service returned a plan that skips a prerequisite. Please try again.':'学习计划跳过了必要的基础内容，请重新生成。',
 'The learning service returned a plan exceeding the daily time budget. Please try again.':'计划超过了每日学习时长，请重新生成。',
 'The learning service returned an invalid exercise. Please prepare the practice again.':'习题内容不完整，请重新准备练习。',
 'The learning service returned incomplete exercise feedback. Please try again.':'习题反馈不完整，请重试。',
 'The learning service returned incomplete writing feedback. Please try again.':'写作反馈不完整，请重试。',
 'The learning companion could not prepare a response. Please try again.':'伴学助手暂未能完成回复，请重试。',
 'The learning service returned incomplete feedback. Please try again.':'学习反馈不完整，请重试。',
 "Your learning plan starts here":"从这里开启你的学习计划",
 "Your companion will choose your next steps from your learning evidence.":"伴学助手会根据学习记录为你安排下一步。",
 "Preparing your next step…":"正在为你准备下一步…",
 "Reviewing your practice…":"正在查看你的练习…",
 "Your learning companion · Check feedback as you learn.":"智能伴学助手 · 学习时请结合实际核对反馈。",
 "Get speaking feedback":"获取口语反馈",
 "Your writing is used to prepare feedback when you request it.":"你请求反馈时，伴学助手才会阅读你的写作。",
 "Personalised learning plan":"个性化学习计划",
 "Your companion creates your learning plan. Knowledge tracing, prerequisite relationships and spaced-review evidence inform its decisions.":"伴学助手结合知识掌握情况、学习顺序和间隔复习记录，为你安排学习计划。",
 "Companion feedback":"伴学反馈",
 "Saved personalised lesson":"已保存的个性化课程",
 "Personalised lesson":"个性化课程",
 "New personalised lesson":"换一节个性化课程",
 "YOUR LEARNING COMPANION":"智能伴学助手",
 "Your lesson, examples, writing prompt and video scenes are tailored to your current learning context.":"课程、例句、写作任务和视频场景会结合你当前的学习情况准备。",
 "Prepare my lesson":"准备我的课程",
 "Content is prepared on request. If the learning service is unavailable, retry when you are ready.":"点击后即可准备学习内容。暂时无法连接时，请稍后重试。",
 "The lesson is incomplete. Please try again.":"课程内容不完整，请重试。",
 "Companion practice":"伴学练习",
 "Create a new practice set":"换一组练习",
 "Your companion will create questions for this lesson using your learning context. It will review each answer and suggest your next step.":"伴学助手会结合你的学习情况为本课准备习题，逐题反馈并建议下一步。",
 "Create my practice":"准备我的练习",
 "The practice set is incomplete. Please try again.":"练习内容不完整，请重试。",
 "Companion feedback and attribution are provisional.":"伴学反馈和学习分析仅供参考。",
 "Create a practice set before checking your answers.":"请先准备练习，再提交答案。",
 "Companion setup needed":"伴学助手待配置",
 "Ready to connect when you request learning guidance.":"需要学习指导时，随时开始。",
 "Set up your learning companion to get started.":"请先完成伴学助手设置。",
 "LEARNING COMPANION":"智能伴学助手",
 "YOUR WORDS, ALOUD":"把中文读出来",
 "Read any Chinese aloud":"中文自由朗读",
 "Mandarin pronunciation":"普通话发音",
 "Type any Chinese character, word or sentence. Listen, slow it down and try it yourself.":"输入任意汉字、词语或句子，听示范、调语速，再试着自己读。",
 "Chinese to read aloud":"输入想朗读的中文",
 "For example: 你好！我想学习中文。":"例如：你好！我想学习中文。",
 "Playback speed":"朗读速度",
 "Slow":"慢速",
 "Natural":"自然",
 "Fluent":"流畅",
 "Read aloud":"朗读",
 "Stop playback":"停止朗读",
 "Clear text":"清空文字",
 "Hear a character, word or sentence at your own pace.":"按自己的节奏听汉字、词语或句子的发音。",
 "Enter at least one Chinese character to hear Mandarin pronunciation.":"请输入至少一个汉字，即可听普通话朗读。",
 "Preparing pronunciation…":"正在准备朗读…",
 "Playback finished.":"朗读完成。",
 "Playing Mandarin pronunciation.":"正在朗读中文。",
 "Your text is cleared. Enter Chinese to begin.":"文字已清空，请输入中文开始。",
 "Playback stopped.":"朗读已停止。",
 'Learning companion':'智能伴学助手','Learning companion ready':'伴学助手已就绪','Learning service unavailable':'伴学服务暂不可用',
 'Speech playback is not supported in this browser. Try a recent version of Chrome, Edge, or Safari.':'当前浏览器不支持语音朗读，请使用新版 Chrome、Edge 或 Safari。',
 'No Mandarin voice is installed. Add a Chinese (Mandarin) speech voice in your device settings, then reopen this page.':'设备尚未安装普通话语音，请在设备设置中添加中文语音后重新打开本页。',
 'DeepSeek will choose your next steps from your learning evidence.':'DeepSeek 将根据学习证据，为你安排下一步。',
 'DeepSeek is reviewing…':'DeepSeek 正在评阅…','DeepSeek-generated plan':'DeepSeek 生成的学习计划',
 'DeepSeek creates your learning plan. Knowledge tracing, prerequisite relationships and spaced-review evidence inform its decisions.':'DeepSeek 制订完整学习计划，知识追踪、先修关系和间隔复习记录为其提供判断依据。',
 'DeepSeek feedback':'DeepSeek 学习反馈','Saved DeepSeek lesson':'已保存的 DeepSeek 课程','DeepSeek-generated lesson':'DeepSeek 生成的课程',
 'DeepSeek took too long to respond. Please try again.':'DeepSeek 响应超时，请重试。','The server could not reach DeepSeek. Check the network and try again.':'服务暂时无法连接 DeepSeek，请检查网络后重试。',
 'DeepSeek returned an incomplete response. Please try again.':'DeepSeek 返回的内容不完整，请重试。','Generate a practice set for this lesson before submitting answers.':'请先为本课生成习题，再提交答案。',
 'Answer every question before checking this quiz.':'请完成所有题目后再提交。','DeepSeek returned an invalid answer key. Please generate the practice again.':'DeepSeek 返回的题目答案格式有误，请重新生成习题。',
 'DeepSeek returned incomplete exercise feedback. Please try again.':'DeepSeek 返回的批改反馈不完整，请重试。','DeepSeek returned an invalid plan step. Please try again.':'DeepSeek 返回的计划步骤无效，请重新生成。',
 'DeepSeek returned a plan that skips a prerequisite. Please try again.':'生成的计划跳过了必要的基础知识，请重新生成。','DeepSeek returned a plan exceeding the daily time budget. Please try again.':'生成的计划超过每日学习时长，请重新生成。',
 'This request took too long. Please try again.':'请求等待时间过长，请重试。','Your companion is thinking…':'伴学助手正在思考…',
 'PERSONALISED BY DEEPSEEK':'DEEPSEEK 个性化生成',
 'Your lesson, examples, writing prompt and video scenes are prepared by DeepSeek for your current learning context.':'DeepSeek 结合当前学习状态，为你准备课程、例句、写作任务与视频内容。',
 'A lesson made for this step.':'为当前这一步定制课程。',
 'Generate a lesson using your goals, learning memory and checked practice. Exercises are generated separately when you are ready.':'结合目标、学习记忆和测验结果生成课程。准备好后，可另外生成针对性习题。',
 'AI content is generated on request. If the model is unavailable, you can retry without replacing your learning data.':'点击后由大模型生成内容。若服务暂时不可用，可以重试，已有学习记录会保留。',
 'DeepSeek practice':'DeepSeek 个性化习题','Generate a new AI practice set':'生成一组新的 AI 习题','Fresh practice, shaped around you.':'根据你的学习情况，生成新练习。',
 'DeepSeek will create questions for this lesson using your learning context. It will review each answer and suggest your next step.':'DeepSeek 将结合本课和学习状态生成习题，逐题评阅，并给出下一步建议。',
 'Your learning update is saved.':'学习进展已保存。','Your lesson reflection':'本课学习反馈','Your learning profile':'学习画像建议','Your learning memory':'学习记忆反馈',
 'Prepare my lesson with AI':'用大模型准备本课','New AI lesson':'生成一版新课程','Generate my AI practice':'生成我的 AI 习题','New AI practice':'生成一组新习题',
 'Get AI speaking feedback':'获取 AI 口语反馈','DeepSeek is preparing…':'DeepSeek 正在准备…','DeepSeek is preparing your lesson…':'DeepSeek 正在为你准备课程…',
 'DeepSeek-generated':'DeepSeek 生成','Generated by DeepSeek':'由 DeepSeek 生成','AI-generated lesson':'AI 生成课程','AI-generated practice':'AI 生成习题','AI-generated plan':'AI 生成学习计划',
 'Your AI plan starts here':'从这里生成你的 AI 学习计划','Create my AI plan':'生成我的 AI 学习计划','Build a plan with DeepSeek':'让 DeepSeek 制订学习计划',
 'Your lesson is ready.':'课程已生成。','Your AI practice is ready.':'AI 习题已生成。','Preparing your lesson…':'正在生成课程…','Generating practice…':'正在生成习题…','Generating my practice…':'正在生成我的习题…',
 'Checking with DeepSeek…':'DeepSeek 正在批改…','Getting AI feedback…':'正在获取 AI 反馈…','Your next practice step':'下一步练习建议',
 'Generate new questions':'生成新题目','Generate exercises':'生成习题','AI lesson preparation':'AI 备课','Preparing with DeepSeek…':'DeepSeek 正在准备…',
 'This step needs a model response. Please try again.':'这一步需要大模型返回结果，请重试。','Retry AI lesson':'重新生成课程','Learning evidence for DeepSeek':'供 DeepSeek 参考的学习证据',
 'Course outline':'课程主题','Personalised with DeepSeek':'由 DeepSeek 个性化生成','Personalized with DeepSeek':'由 DeepSeek 个性化生成',
 'Start with a hello':'从一句你好开始','A coffee, please':'请给我一杯咖啡','Find your way':'问路不迷路','Have you been there?':'你去过那里吗？','A place at the table':'一起坐下来吃饭','Your everyday rhythm':'说说你的每一天',
 'Based on 2 checked practice answers; revisit this skill before moving on.':'根据 2 道已核对题目，建议先巩固本课再继续。',
 'Your spaced review is due.':'本课已到间隔复习时间。','Build the foundations for the next step.':'为下一步学习打好基础。','Start with a short check-in; there is not enough practice evidence yet.':'先完成一个小测验，目前的学习证据还不充分。',
 'Original implementations of published algorithms, informed by these open-source references. No third-party project code is bundled.':'本网页根据已发表算法独立实现，参考以下开源项目，未直接打包第三方项目代码。',
 'BM25 retrieval:':'BM25 记忆检索：','ranks memories with recency and confidence. Reference:':'结合相关性、时间与置信度对记忆排序。参考：',
 'Bayesian Knowledge Tracing:':'贝叶斯知识追踪：','updates skill estimates from checked answers. Reference:':'依据已核对的测验答案更新掌握度估计。参考：',
 'schedules reviews.':'安排间隔复习。','Published algorithm':'公开算法说明','Prerequisite graph:':'先修知识图：','orders foundation topics before dependent skills.':'先安排基础知识，再安排依赖它的技能。',
 'BKT parameters are starting assumptions, not calibrated proficiency measurements. AI feedback and attribution are provisional.':'BKT 参数是初始假设，尚未校准为能力测量标准。AI 反馈与偏差归因均有待验证。',
 'Skip to your learning space':'跳转到学习空间','Hanzi home':'Hanzi 首页','Main navigation':'主导航','Learning tools':'学习工具','YOUR LEARNING SPACE':'我的学习空间',
 'Overview':'学习首页','Learn & watch':'视频课堂','Speaking studio':'口语练习','Writing desk':'互动写作','My learning path':'学习计划','Learning memory':'学习记忆','AI':'AI',
 'A little every day.':'每天学一点。','Small steps.':'小步积累。','Lasting connections.':'长久相伴。','Your journey, remembered.':'记住每一步成长。','Local learning space':'本地学习空间','My space':'我的空间','DeepSeek ready':'DeepSeek 已就绪','AI setup needed':'需要配置 AI','Learner settings':'学习者设置','Open learner profile':'打开学习档案',
 'Choose interface language':'选择界面语言','Your learning space':'我的学习空间','Video lessons':'视频课堂','Writing workshop':'互动写作','Your learning path':'我的学习计划','Learning workspace':'学习工作区',
 'YOUR CHINESE JOURNEY':'我的中文学习之旅','A little practice today. A little more confidence tomorrow.':'今天练习一点，明天自信一点。','Grow at your own pace':'按照自己的节奏成长','A LANGUAGE. A CONNECTION.':'学习一门语言，连接更大的世界。','Real conversations.':'自在交流。','Learn Chinese for the moments that matter—with a companion that grows with you.':'为真实生活中的交流学习中文，让伴学助手陪你一起成长。',
 "Let's learn":'开始学习','Explore my path':'查看学习计划','FROM WORDS TO EVERYDAY LIFE':'让中文走进日常生活','Your next little adventure':'下一段学习旅程','All lessons':'全部课程','Start lesson':'开始课程','A blank page. Your own words.':'从空白开始，写下自己的故事。',
 "Turn what you've learned into a story, with a little guidance.":'在适当的引导下，把所学写成自己的故事。','Start writing':'开始写作','Lessons explored':'已探索课程','Speaking practices':'口语练习次数','Writing sessions':'写作练习次数','Your daily rhythm':'每日学习节奏','Every bit of practice counts.':'每一次练习，都是积累。','A fresh start. Make a little room for Chinese.':'从今天开始，为中文留一点时间。','Listen & discover':'聆听与发现','Say it out loud':'开口说中文','Make it your own':'写出自己的表达','A PHRASE TO KEEP':'值得记住的一句话','Take your time.':'慢慢来。','Progress has its own pace.':'成长有自己的节奏。','Hear màn màn lái':'听“慢慢来”的发音','Learning that remembers you.':'懂你，也记得你的学习。','Your goals, discoveries and practice will shape your next steps.':'你的目标、发现与练习，将共同决定下一步。','Meet your learning memory':'查看我的学习记忆',
 'LISTEN. NOTICE. DISCOVER.':'聆听、观察、发现','Chinese for the everyday.':'让中文融入每一天。','Short video lessons, useful phrases and a companion ready for your questions.':'观看短视频，学习实用表达，随时向伴学助手提问。','Choose a lesson':'选择课程','HANZI SHORT LESSON':'HANZI 微课堂','Play animated lesson':'播放教学动画','Captioned learning video · ready in about 15 seconds':'字幕教学视频 · 约 15 秒准备完成','Mark explored':'记录本课学习','Listen, then make it yours.':'先听一听，再试着表达。','Mandarin audio · tap to listen':'普通话朗读 · 点击收听','Practise speaking':'练习口语','Use it in writing':'用于写作练习','A LITTLE CHECK-IN':'小小测验','What stayed with you?':'你记住了哪些内容？','Learning evidence':'学习证据','Check my answers':'检查答案','Captioned animation · listen to Mandarin below':'字幕动画 · 在下方收听普通话发音','Preparing video…':'正在准备视频…',
 'Your Chinese companion':'中文伴学助手','Thoughtful guidance, one step at a time':'循序渐进，陪你掌握每一步','Learning with context':'结合学习经历提供指导','Your companion will build context as you learn.':'伴学助手会随学习逐步了解你。','HANZI COMPANION':'HANZI 伴学助手','YOU':'你','Explain this lesson':'讲解这节课','Give me a challenge':'给我一道练习题','Ask your Chinese companion':'向中文伴学助手提问','Ask a question, or try a sentence…':'提出问题，或试着写一句中文…','Send message':'发送消息','Your companion is thinking…':'伴学助手正在思考…','Thinking…':'正在思考…','Powered by DeepSeek · AI guidance can make mistakes.':'由 DeepSeek 提供支持 · AI 建议可能存在错误。',
 'FIND YOUR VOICE':'勇敢开口表达','A little braver, out loud.':'每一次开口，都更自信。','Listen to Mandarin, try a phrase, then compare what was recognised.':'听普通话示范，尝试说一句，再比较识别出的文字。','Practice topic':'练习主题','Listen':'听发音','Listen slowly':'慢速朗读','Start Mandarin speech recognition':'开始普通话语音识别','Stop speech recognition':'停止语音识别','Tap the microphone and give it a try.':'点击麦克风，试着说一句。','Microphone transcription is unavailable in this browser.':'当前浏览器不支持麦克风转写。','Recognition uses your browser’s speech service.':'识别由浏览器的语音服务提供。','Try Chrome or Edge, or enter your transcript below.':'请使用 Chrome 或 Edge，也可以在下方手动输入。','Try another phrase':'换一句练习','YOUR WORDS, HEARD BACK':'听见自己的表达',"Let's see what came through.":'看看识别到了什么。','Recognised words / manual transcript':'识别文字 / 手动输入','Your recognised Chinese appears here. You can also type it.':'识别到的中文会显示在这里，也可以手动输入。','Compare transcript':'比较文字','One phrase, a few small steps.':'一句话，分几步练习。','Listen once without reading.':'先不看文字，听一遍。','Listen again and follow the pinyin.':'再听一遍，结合拼音跟读。','Speak slowly, then try a natural rhythm.':'先慢慢说，再尝试自然的语速。','Transcript matching checks recognised characters. It does not measure tones or provide a pronunciation score.':'文字匹配只比较识别到的汉字，不评估声调，也不提供发音分数。','TRANSCRIPT MATCH':'识别文字匹配度','Ready when you are. You can edit the transcript before comparing.':'准备好后可以继续，也可以先修改识别文字。','Listening… speak your Chinese phrase.':'正在聆听，请说出中文句子。','Comparing…':'正在比较…',
 'YOUR IDEAS, IN CHINESE':'用中文表达自己的想法','Every story starts somewhere.':'每个故事，都有一个起点。','Try a sentence, build a paragraph, and find your own way to say it.':'从一句话到一段文字，找到属于自己的表达方式。','Writing topic':'写作主题',"TODAY'S INVITATION":'本次写作任务','Your writing space':'我的写作空间','Write your Chinese response':'写下你的中文回答','Start with a hint':'从提示开始','Draft saved in this browser':'草稿已保存在本浏览器','Feedback in English · corrections in Chinese':'反馈跟随界面语言 · 中文修改建议','Your text is sent to DeepSeek when you request feedback.':'点击获取反馈后，文章内容将发送给 DeepSeek。','Get feedback':'获取写作反馈','Need a word?':'需要词语提示？','A little guidance':'一点写作指导','Your words come first.':'先写下自己的想法。',"Write a little, then ask for feedback. We'll look at what works, explain useful changes, and suggest one next step.":'先写一点，再获取反馈。助手会肯定写得好的地方、解释修改原因，并建议下一步练习。','Grammar & word choice':'语法与用词','Clear explanations in English':'跟随界面语言清楚解释','Keep your own voice':'保留你的表达风格',"WHAT'S WORKING":'写得好的地方','SMALL CHANGES, CLEARER MEANING':'小小修改，表达更清楚','Apply this change':'应用此修改','Applied':'已应用','A SUGGESTED VERSION':'参考修改稿','Hear it':'朗读','Use this version':'采用这一版','YOUR NEXT SMALL STEP':'下一步小练习','Was the feedback useful?':'反馈对你有帮助吗？','Too advanced':'内容太难','Ready for more':'可以提高难度','Your writing feedback is ready.':'写作反馈已完成。','Reading your words…':'正在阅读你的文章…','Suggested version added to your draft.':'参考修改稿已应用到草稿。','Your draft has changed.':'草稿内容已更新。','Request fresh feedback when you are ready. Your new words are safely kept.':'准备好后请重新获取反馈，新草稿已保留。','Your draft changed while feedback was being prepared. Request fresh feedback for your new words.':'反馈生成期间草稿发生了变化。新草稿已保留，请重新获取反馈。',
 'A PATH THAT GROWS WITH YOU':'随学习一起成长的计划','Your next steps, thoughtfully chosen.':'为你安排合适的下一步。','A plan informed by your goals, checked practice and what comes before what.':'结合学习目标、测验结果与知识先修关系安排学习。','Refresh my plan':'更新学习计划','Build my learning plan':'生成学习计划','Everyday conversation':'日常交流','Your current learning plan':'当前学习计划','Start with a gentle check-in':'从轻量测验开始','A fresh path begins here.':'新的学习旅程，从这里开始。',"Tell us your goals in your profile, then build a plan. As you complete short check-ins, it will adapt to the evidence.":'在档案中填写学习目标，再生成计划。随着测验积累，计划会根据学习证据调整。',"Let's try it":'开始这一步','How is the pace?':'目前的节奏合适吗？','Tell your companion what needs to change.':'告诉伴学助手，你希望如何调整。','Adjust my path':'调整学习计划','For example: I need easier practice, and more time on word order.':'例如：我想先做简单一点的练习，多练一练语序。','EVIDENCE, NOT ASSUMPTIONS':'依据学习证据，持续了解你','Your skills in progress':'正在成长的技能','Estimates update from checked lesson answers. They are not exam scores.':'根据已核对的测验结果更新估计值，不代表考试成绩。','Not assessed yet':'尚未测评','How your path takes shape':'学习计划如何生成','Bayesian Knowledge Tracing estimates skills from practice. A prerequisite graph orders new topics. SM-2 schedules reviews.':'贝叶斯知识追踪根据练习估计掌握度；先修知识图安排顺序；SM-2 安排间隔复习。','Starting parameters are not calibrated to a learner population. More evidence makes a more useful picture.':'初始参数尚未针对真实学习群体校准，更多学习证据有助于改善判断。','Explore the methods':'了解使用的算法','Planning your next steps…':'正在规划下一步…','Your learning plan is ready.':'学习计划已生成。','Your algorithm-based plan is ready. AI explanations are temporarily unavailable.':'算法学习计划已生成，AI 解释暂时不可用。','Your learning path has been adjusted.':'学习计划已调整。','Adjusting your path…':'正在调整学习计划…','LESSON':'课程','REVIEW':'复习',
 'A COMPANION WITH CONTEXT':'记得你的学习经历','Your learning, remembered.':'记住学习，理解成长。','See the experiences and insights that help shape your next lesson.':'查看影响下一次学习的经历与长期学习特征。','Export my learning data':'导出学习数据','Active memories':'有效记忆','Longer-term insights':'长期学习特征','Learning experiences':'学习经历','Memories are visible and removable by you. New evidence may update an older insight; uncertain inferences stay labelled.':'你可以查看或删除记忆。新证据可能更新旧判断，尚不确定的推断会保留标注。',"Something you'd like your companion to remember?":'有什么想让伴学助手记住的吗？','For example: I want to order food confidently when I travel.':'例如：我想在旅行时，自信地用中文点餐。','Remember this':'记住这件事','A journal of your learning':'我的学习记录','Filter learning memories':'筛选学习记忆','All memories':'全部记忆','Long-term insights':'长期学习特征','Updated / archived':'已更新 / 已归档','Your story starts with your first step.':'第一步，开启自己的学习故事。','Practise a lesson, talk to your companion, or add a goal above. Your learning memories will appear here.':'学习一课、与助手对话，或添加一个目标，学习记忆就会出现在这里。','Explore a lesson':'探索一节课','Long-term insight':'长期学习特征','Learning experience':'学习经历','Delete this learning memory':'删除这条学习记忆','Memory removed.':'记忆已移除。','Your companion will remember that.':'伴学助手会记住这件事。','Remembering…':'正在保存记忆…','Learning interaction':'学习交互','Just added':'刚刚添加','active':'有效','superseded':'已更新','archived':'已归档','learner':'学习者提供','checked-quiz':'已核对测验','writing-review':'写作反馈','activity':'学习活动','confidence':'置信度',
 'MAKE IT YOURS':'打造自己的学习方式','Your learner profile':'我的学习档案','Close settings':'关闭设置','A few details help your companion find the right pace, examples, and next steps.':'这些信息有助于伴学助手选择合适的节奏、例句与下一步学习内容。','Your name':'你的名字','Support language':'母语 / 辅助语言','English':'英语','Current Chinese level':'当前中文水平','Daily practice':'每日练习时长','What would you like to achieve?':'你希望实现什么目标？','For example: feel comfortable ordering food and chatting with friends.':'例如：能够轻松用中文点餐，并和朋友聊天。','Cancel':'取消','Save my profile':'保存学习档案','Your data stays in your control':'学习数据，由你掌控','Manage the learning records stored in this local app.':'管理保存在本地网页中的学习记录。','Export my data':'导出我的数据','Reset learning data':'重置学习数据','Learning details':'学习详情','Close details':'关闭详情','Your learning profile is updated.':'学习档案已更新。','Saving…':'正在保存…','Lesson saved to your learning journal.':'本课已记入学习记录。','Your practice evidence has been saved.':'测验结果已保存为学习证据。','See my learning picture':'查看我的学习画像','✓ Nice work.':'✓ 答得很好。','A good thing to revisit.':'这个知识点值得再练一练。','This practice is one piece of evidence. Your companion won’t assume mastery from a single answer.':'本次测验只是学习证据的一部分，助手不会凭一道题就判断你已掌握。','These questions were already measured; repeating them will not inflate your skill estimate.':'这些题目已计入测评，重复练习不会人为提高掌握度估计值。','Working…':'正在处理…','Removing…':'正在移除…','Adjusting…':'正在调整…','Write a sentence first. A small start is enough.':'先写一句话吧，小小的开始就很好。','That phrase is no longer in your draft.':'草稿中已经没有这段原文。',
 'Start a fresh learning space?':'要重新开始学习吗？',"This removes your local memories, profile, practice evidence, plans and browser writing draft. Export your learning data first if you'd like to keep a copy.":'这会移除本地学习记忆、档案、测验证据、计划和浏览器草稿。如需保留，请先导出数据。','Keep my learning data':'保留学习数据','Remove my local learning data':'移除本地学习数据','Your local learning space has been reset.':'本地学习空间已重置。','A thoughtful adjustment':'调整建议','This is a provisional interpretation. Your next practice can help verify it.':'这是待验证的解释，下一次练习可以帮助检验调整效果。','HANZI LEARNING SPACE':'HANZI 学习空间','The methods behind your learning path':'学习计划背后的算法',
 'Making a little room for Chinese…':'正在准备你的中文学习空间…',"Let's reconnect.":'重新连接一下。','Start the local server, then refresh this page.':'请启动本地服务，然后刷新页面。','Try again':'重试','Made for a world of Chinese learners.':'为世界各地的中文学习者而设计。','Keep growing.':'持续成长。','Please enable JavaScript to use your Hanzi learning companion.':'请启用 JavaScript，以使用 Hanzi 中文伴学网页。',
 'HSK 1 · Just beginning':'HSK 1 · 刚刚起步','HSK 2 · Building foundations':'HSK 2 · 夯实基础','HSK 3 · Everyday confidence':'HSK 3 · 日常交流','HSK 4 · Independent learner':'HSK 4 · 独立学习','HSK 5 · Advanced':'HSK 5 · 进阶提升','HSK 6 · Proficient':'HSK 6 · 熟练运用',
};
export function translateText(value,language=currentLanguage){
 if(language!=='zh'||typeof value!=='string'||!value.trim())return value;
 const key=value.trim();let translated=zh[key];
 if(translated===undefined){
  const rules=[
   [/^The learning service returned (?:incomplete|invalid) .+\. Please try again\.$/,()=> '学习内容不完整，请重试。'],
   [/^Mandarin playback could not finish \(.+\)\.$/,()=> '朗读未能完成，请再次点击朗读。'],
   [/^Hello, (.+)\.$/,(_,name)=>`你好，${name}。`],
   [/^(\d+) min goal$/,(_,n)=>`每日 ${n} 分钟`],[/^(\d+) min$/,(_,n)=>`${n} 分钟`],[/^\/ (\d+) min$/,(_,n)=>`/ ${n} 分钟`],[/^(\d+) minutes$/,(_,n)=>`${n} 分钟`],
   [/^(HSK .+) · (\d+) minutes a day · Your pace$/,(_,level,n)=>`${level} · 每天 ${n} 分钟 · 自己的节奏`],
   [/^(\d+) Chinese characters$/,(_,n)=>`${n} 个汉字`],[/^Phrase (\d+) of (\d+)$/,(_,n,total)=>`第 ${n} / ${total} 句`],
   [/^(\d+) checked answers$/,(_,n)=>`${n} 道已核对题目`],[/^(\d+)% BKT estimate · (.+)$/,(_,n,status)=>`${n}% BKT 估计 · ${{'insufficient-evidence':'证据尚不足','likely-mastered':'可能已掌握','developing':'正在形成','needs-practice':'需要练习'}[status]||status}`],
   [/^Based on (\d+) checked practice answers; revisit this skill before moving on\.$/,(_,n)=>`根据 ${n} 道已核对题目，建议先巩固本课再继续。`],
   [/^(\d+)% confidence$/,(_,n)=>`${n}% 置信度`],
   [/^(\d+) learning memories help your companion understand your journey\.$/,(_,n)=>`${n} 条学习记忆，帮助助手理解你的学习经历。`],
   [/^Preparing your animated lesson… (\d+)%$/,(_,n)=>`正在准备教学动画… ${n}%`],
   [/^(\d+) learning memories · (\d+) checked answers$/,(_,n,m)=>`${n} 条学习记忆 · ${m} 道已核对题目`],
   [/^(\d+) minutes a day · (.+)$/,(_,n,suffix)=>`每天 ${n} 分钟 · ${zh[suffix]||suffix}`],
   [/^Open (.+)$/,(_,title)=>`打开${title}`],[/^Listen to (.+)$/,(_,phrase)=>`听发音：${phrase}`],
   [/^(\d+) \/ (\d+) target characters matched$/,(_,n,total)=>`目标汉字匹配 ${n} / ${total}`],
   [/^Hi (.+)! Ask me about a phrase, try your own sentence, or tell me what feels tricky\. We can take it step by step\.$/,(_,name)=>`你好，${name}！你可以询问表达方式、尝试写一句中文，或告诉我遇到的困难。我们一步一步来。`],
   [/^(\d+) memories · (.+) · (.+)$/,(_,n,level,goal)=>`${n} 条记忆 · ${level} · ${zh[goal]||goal}`],
   [/^(LESSON|REVIEW|lesson|review) · (\d+) MIN$/,(_,type,n)=>`${type.toLowerCase()==='review'?'复习':'课程'} · ${n} 分钟`],
  ];
  for(const[pattern,replace]of rules)if(pattern.test(key)){translated=key.replace(pattern,replace);break;}
 }
 return translated===undefined?value:value.replace(key,translated);
}
const textSources=new WeakMap(),attributeSources=new WeakMap();
export function applyTranslations(root=document.body){
 if(!root)return;
 document.documentElement.lang=currentLanguage==='zh'?'zh-CN':'en';
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let node;
 while((node=walker.nextNode())){
  if(node.parentElement?.closest('script,style,textarea,[data-no-translate]'))continue;
  const value=node.nodeValue;let record=textSources.get(node);
  if(!record||(value!==record.source&&value!==record.rendered))record={source:value,rendered:value};
  const translated=translateText(record.source);record.rendered=translated;textSources.set(node,record);if(value!==translated)node.nodeValue=translated;
 }
 for(const element of root.querySelectorAll('[placeholder],[aria-label],[title]')){
  let records=attributeSources.get(element);if(!records){records={};attributeSources.set(element,records);}
  for(const attr of ['placeholder','aria-label','title']){
   const value=element.getAttribute(attr);if(value===null)continue;let record=records[attr];
   if(!record||(value!==record.source&&value!==record.rendered))record={source:value,rendered:value};
   const translated=translateText(record.source);records[attr]={...record,rendered:translated};if(value!==translated)element.setAttribute(attr,translated);
  }
 }
 document.querySelectorAll('[data-language]').forEach(button=>{const active=button.dataset.language===currentLanguage;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
 document.title=currentLanguage==='zh'?'Hanzi 汉知 · 记得你的中文伴学助手':'Hanzi — Your Chinese, remembered.';
}
export function observeTranslations(){
 let pending=false;
 const observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;applyTranslations();});});
 observer.observe(document.body,{childList:true,subtree:true,characterData:true});applyTranslations();return observer;
}
