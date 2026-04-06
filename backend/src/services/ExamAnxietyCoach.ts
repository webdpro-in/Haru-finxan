/**
 * Exam Anxiety Coach Service
 * Detects anxiety-related keywords and patterns in student messages
 * Provides support for exam-related stress and anxiety
 * 
 * Detection methods:
 * 1. Anxiety keyword detection (exam, test, nervous, scared, worried, etc.)
 * 2. Multi-language support (English, Hindi, Tamil, Telugu, Kannada)
 * 3. Confidence scoring based on keyword frequency and severity
 * 4. Contextual analysis for exam-related stress
 */

export interface AnxietyDetectionResult {
  isAnxious: boolean;
  confidence: number; // 0-1
  keywords: string[];
  severity: 'low' | 'medium' | 'high';
  language: string;
}

export interface CalmingResponseOptions {
  studentName?: string;
  pastSuccesses?: string[]; // list of concepts/topics the student has mastered
  topicToBreakDown?: string; // current topic being studied
  includeBreathingExercise?: boolean;
}

export class ExamAnxietyCoach {
  // English anxiety keywords with severity weights
  private static readonly ANXIETY_KEYWORDS_EN = {
    // High severity (weight: 1.0)
    high: [
      'panic', 'panicking', 'terrified', 'scared', 'fear', 'afraid',
      'can\'t sleep', 'nightmare', 'breakdown', 'crying', 'hopeless',
      'give up', 'fail', 'failing', 'failure'
    ],
    // Medium severity (weight: 0.7)
    medium: [
      'nervous', 'worried', 'anxious', 'anxiety', 'stress', 'stressed',
      'pressure', 'overwhelmed', 'tense', 'uneasy', 'restless',
      'difficult', 'hard', 'struggling', 'trouble'
    ],
    // Low severity (weight: 0.4)
    low: [
      'exam', 'test', 'quiz', 'assessment', 'evaluation',
      'tomorrow', 'next week', 'coming up', 'preparation',
      'unsure', 'uncertain', 'doubt', 'concern', 'concerned'
    ]
  };

  // Hindi anxiety keywords (Romanized)
  private static readonly ANXIETY_KEYWORDS_HI = {
    high: ['dar', 'ghabra', 'bhay', 'pareshan', 'tension'],
    medium: ['chinta', 'fikar', 'mushkil', 'kathin', 'problem'],
    low: ['pariksha', 'exam', 'test', 'kal', 'taiyari']
  };

  // Tamil anxiety keywords (Romanized)
  private static readonly ANXIETY_KEYWORDS_TA = {
    high: ['bayam', 'padi', 'kashta', 'tension'],
    medium: ['kavala', 'kashtam', 'kadinam', 'problem'],
    low: ['thodal', 'exam', 'test', 'naalai', 'tayar']
  };

  // Telugu anxiety keywords (Romanized)
  private static readonly ANXIETY_KEYWORDS_TE = {
    high: ['bhayam', 'bayapadutunna', 'tension', 'kastam'],
    medium: ['aavesham', 'badha', 'kashtam', 'problem'],
    low: ['pariksha', 'exam', 'test', 'repu', 'tayari']
  };

  // Kannada anxiety keywords (Romanized)
  private static readonly ANXIETY_KEYWORDS_KA = {
    high: ['bhaya', 'beda', 'tension', 'kashta'],
    medium: ['chinte', 'kashtada', 'problem', 'badha'],
    low: ['pariksha', 'exam', 'test', 'nale', 'tayari']
  };

  // Exam-related context phrases
  private static readonly EXAM_CONTEXT_PHRASES = [
    'exam tomorrow',
    'test tomorrow',
    'exam next week',
    'test coming up',
    'exam preparation',
    'test prep',
    'exam anxiety',
    'test anxiety',
    'exam stress',
    'test stress',
    'before exam',
    'before test',
    'during exam',
    'during test'
  ];

  /**
   * Detect anxiety in student message
   * @param message - Student's message
   * @param language - Language code (en, hi, ta, te, ka)
   * @returns AnxietyDetectionResult with confidence score and matched keywords
   */
  static detectAnxiety(
    message: string,
    language: string = 'en'
  ): AnxietyDetectionResult {
    if (!message || message.trim().length === 0) {
      return {
        isAnxious: false,
        confidence: 0,
        keywords: [],
        severity: 'low',
        language
      };
    }

    const lowerMessage = message.toLowerCase();
    const matchedKeywords: string[] = [];
    let totalWeight = 0;
    let keywordCount = 0;

    // Get keywords for the specified language
    const keywords = this.getKeywordsForLanguage(language);

    // Check high severity keywords (weight: 1.0)
    for (const keyword of keywords.high) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        totalWeight += 1.0;
        keywordCount++;
      }
    }

    // Check medium severity keywords (weight: 0.7)
    for (const keyword of keywords.medium) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        totalWeight += 0.7;
        keywordCount++;
      }
    }

    // Check low severity keywords (weight: 0.4)
    for (const keyword of keywords.low) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        totalWeight += 0.4;
        keywordCount++;
      }
    }

    // Check for exam context phrases (bonus weight)
    for (const phrase of this.EXAM_CONTEXT_PHRASES) {
      if (lowerMessage.includes(phrase)) {
        totalWeight += 0.3;
        if (!matchedKeywords.includes(phrase)) {
          matchedKeywords.push(phrase);
        }
      }
    }

    // Calculate confidence score (0-1)
    // Formula: min(1.0, totalWeight / 3) to normalize
    const confidence = keywordCount > 0 ? Math.min(1.0, totalWeight / 3) : 0;

    // Determine if anxious (threshold: 0.3)
    const isAnxious = confidence >= 0.3;

    // Determine severity based on confidence
    let severity: 'low' | 'medium' | 'high' = 'low';
    if (confidence >= 0.7) {
      severity = 'high';
    } else if (confidence >= 0.5) {
      severity = 'medium';
    }

    return {
      isAnxious,
      confidence,
      keywords: matchedKeywords,
      severity,
      language
    };
  }

  /**
   * Get keywords for specified language
   */
  private static getKeywordsForLanguage(language: string): {
    high: string[];
    medium: string[];
    low: string[];
  } {
    switch (language.toLowerCase()) {
      case 'hi':
      case 'hindi':
        return this.ANXIETY_KEYWORDS_HI;
      case 'ta':
      case 'tamil':
        return this.ANXIETY_KEYWORDS_TA;
      case 'te':
      case 'telugu':
        return this.ANXIETY_KEYWORDS_TE;
      case 'ka':
      case 'kannada':
        return this.ANXIETY_KEYWORDS_KA;
      case 'en':
      case 'english':
      default:
        return this.ANXIETY_KEYWORDS_EN;
    }
  }

  /**
   * Detect anxiety across multiple languages
   * Useful when language is unknown or mixed
   */
  static detectAnxietyMultiLanguage(message: string): AnxietyDetectionResult {
    const languages = ['en', 'hi', 'ta', 'te', 'ka'];
    const results = languages.map(lang => this.detectAnxiety(message, lang));
    
    // Return result with highest confidence
    return results.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
  }

  /**
   * Check if message contains exam-related context
   */
  static hasExamContext(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return this.EXAM_CONTEXT_PHRASES.some(phrase => 
      lowerMessage.includes(phrase)
    );
  }

  /**
   * Get anxiety level description
   */
  static getAnxietyLevelDescription(confidence: number): string {
    if (confidence >= 0.7) {
      return 'High anxiety detected - immediate support recommended';
    } else if (confidence >= 0.5) {
      return 'Moderate anxiety detected - provide calming techniques';
    } else if (confidence >= 0.3) {
      return 'Mild anxiety detected - offer reassurance';
    } else {
      return 'No significant anxiety detected';
    }
  }

  /**
   * Calculate anxiety trend over multiple messages
   */
  static calculateAnxietyTrend(
    recentResults: AnxietyDetectionResult[]
  ): {
    trend: 'increasing' | 'stable' | 'decreasing';
    averageConfidence: number;
    concernLevel: 'low' | 'medium' | 'high';
  } {
    if (recentResults.length === 0) {
      return {
        trend: 'stable',
        averageConfidence: 0,
        concernLevel: 'low'
      };
    }

    // Calculate average confidence
    const totalConfidence = recentResults.reduce(
      (sum, result) => sum + result.confidence,
      0
    );
    const averageConfidence = totalConfidence / recentResults.length;

    // Determine trend (compare first half vs second half)
    if (recentResults.length >= 4) {
      const midpoint = Math.floor(recentResults.length / 2);
      const firstHalf = recentResults.slice(0, midpoint);
      const secondHalf = recentResults.slice(midpoint);

      const firstAvg = firstHalf.reduce((sum, r) => sum + r.confidence, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, r) => sum + r.confidence, 0) / secondHalf.length;

      const difference = secondAvg - firstAvg;
      
      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (difference > 0.15) {
        trend = 'increasing';
      } else if (difference < -0.15) {
        trend = 'decreasing';
      }

      // Determine concern level
      let concernLevel: 'low' | 'medium' | 'high' = 'low';
      if (averageConfidence >= 0.6 || trend === 'increasing') {
        concernLevel = 'high';
      } else if (averageConfidence >= 0.4) {
        concernLevel = 'medium';
      }

      return { trend, averageConfidence, concernLevel };
    }

    // Not enough data for trend analysis
    let concernLevel: 'low' | 'medium' | 'high' = 'low';
    if (averageConfidence >= 0.6) {
      concernLevel = 'high';
    } else if (averageConfidence >= 0.4) {
      concernLevel = 'medium';
    }

    return {
      trend: 'stable',
      averageConfidence,
      concernLevel
    };
  }

  /**
   * Generate calming response based on anxiety detection result
   * Provides empathetic, supportive responses with practical coping strategies
   * 
   * @param detectionResult - Result from anxiety detection
   * @param studentName - Optional student name for personalization
   * @returns Calming response string
   */
  static generateCalmingResponse(
    detectionResult: AnxietyDetectionResult,
    studentName?: string
  ): string {
    const { severity, language } = detectionResult;

    // Get response templates for the language
    const templates = this.getResponseTemplates(language);

    // Select appropriate response based on severity
    let response: string;
    switch (severity) {
      case 'high':
        response = this.selectRandomTemplate(templates.high);
        break;
      case 'medium':
        response = this.selectRandomTemplate(templates.medium);
        break;
      case 'low':
      default:
        response = this.selectRandomTemplate(templates.low);
        break;
    }

    // Personalize with student name if provided
    if (studentName) {
      response = response.replace('{name}', studentName);
    } else {
      // Remove name placeholder if no name provided
      response = response.replace('{name}, ', '').replace('{name}', '');
    }

    return response;
  }

  /**
   * Get response templates for a specific language
   */
  private static getResponseTemplates(language: string): {
    high: string[];
    medium: string[];
    low: string[];
  } {
    switch (language.toLowerCase()) {
      case 'hi':
      case 'hindi':
        return this.RESPONSE_TEMPLATES_HI;
      case 'ta':
      case 'tamil':
        return this.RESPONSE_TEMPLATES_TA;
      case 'te':
      case 'telugu':
        return this.RESPONSE_TEMPLATES_TE;
      case 'ka':
      case 'kannada':
        return this.RESPONSE_TEMPLATES_KA;
      case 'en':
      case 'english':
      default:
        return this.RESPONSE_TEMPLATES_EN;
    }
  }

  /**
   * Select random template from array
   */
  private static selectRandomTemplate(templates: string[]): string {
    const index = Math.floor(Math.random() * templates.length);
    return templates[index];
  }

  // English response templates
  private static readonly RESPONSE_TEMPLATES_EN = {
    high: [
      "{name}, I can see you're feeling really anxious right now. Take a deep breath with me - breathe in for 4 counts, hold for 4, and out for 4. You've overcome challenges before, and you can do this too. Let's break this down into smaller, manageable steps together.",
      "{name}, it's completely normal to feel this way before an exam. Many students experience this. Let's try a quick calming technique: close your eyes and think of a place where you feel safe and happy. Now, let's tackle this one small piece at a time.",
      "I hear you, {name}. Exam anxiety is real, but remember - you've been preparing for this. Take a moment to breathe deeply. Tell yourself: 'I am capable, I am prepared, I can handle this.' Let's focus on what you know, not what you fear."
    ],
    medium: [
      "{name}, feeling nervous before a test is natural - it shows you care! Let's channel that energy positively. Try this: take three deep breaths, then list three things you're confident about. You've got this!",
      "I understand you're worried, {name}. Here's what helps: break your study into small chunks, take regular breaks, and remember past successes. You're more prepared than you think!",
      "{name}, anxiety is just your mind trying to protect you. Let's work with it, not against it. Take a few deep breaths, remind yourself of topics you've mastered, and let's tackle this step by step."
    ],
    low: [
      "{name}, I see you have an exam coming up. That's great that you're thinking ahead! Let's make sure you're well-prepared. What topic would you like to review?",
      "Exams can feel challenging, {name}, but they're also opportunities to show what you've learned. Let's go through the material together and build your confidence!",
      "{name}, preparation is key to feeling confident. Let's create a study plan together and make sure you're ready. What areas would you like to focus on?"
    ]
  };

  // Hindi response templates (Romanized)
  private static readonly RESPONSE_TEMPLATES_HI = {
    high: [
      "{name}, main samajh sakta hoon ki aap bahut tension mein hain. Mere saath gehri saans lijiye - 4 tak andar, 4 tak rokiye, aur 4 tak bahar. Aapne pehle bhi mushkilon ko paar kiya hai, aur aap yeh bhi kar sakte hain. Chaliye isko chhote steps mein tod lete hain.",
      "{name}, exam se pehle aisa feel karna bilkul normal hai. Bahut students ko yeh hota hai. Ek calming technique try karte hain: apni aankhein band kariye aur ek aisi jagah ke baare mein sochiye jahan aap safe aur khush feel karte hain. Ab chaliye isko ek chhote piece se shuru karte hain.",
      "Main sun raha hoon, {name}. Exam anxiety real hai, lekin yaad rakhiye - aapne preparation ki hai. Ek moment lijiye aur gehri saans lijiye. Apne aap se kahiye: 'Main capable hoon, main prepared hoon, main yeh kar sakta hoon.' Chaliye focus karte hain jo aap jaante hain, na ki jo aap darte hain."
    ],
    medium: [
      "{name}, test se pehle nervous feel karna natural hai - yeh dikhata hai ki aapko care hai! Chaliye is energy ko positive direction mein use karte hain. Yeh try kijiye: teen gehri saans lijiye, phir teen cheezein list kijiye jinke baare mein aap confident hain. Aap kar sakte hain!",
      "Main samajhta hoon aap worried hain, {name}. Yeh help karta hai: apni study ko chhote chunks mein tod dijiye, regular breaks lijiye, aur past successes yaad kijiye. Aap jitna sochte hain usse zyada prepared hain!",
      "{name}, anxiety sirf aapka mind aapko protect karne ki koshish kar raha hai. Chaliye iske saath kaam karte hain, iske against nahi. Kuch gehri saans lijiye, un topics ko yaad kijiye jo aapne master kar liye hain, aur chaliye step by step tackle karte hain."
    ],
    low: [
      "{name}, main dekh raha hoon ki aapka exam aa raha hai. Bahut accha hai ki aap pehle se soch rahe hain! Chaliye sure karte hain ki aap well-prepared hain. Aap kaunsa topic review karna chahenge?",
      "Exams challenging lag sakte hain, {name}, lekin yeh opportunities bhi hain dikhane ke liye ki aapne kya seekha hai. Chaliye material ko saath mein dekhte hain aur aapka confidence build karte hain!",
      "{name}, preparation confident feel karne ki key hai. Chaliye ek study plan banate hain aur sure karte hain ki aap ready hain. Aap kaunse areas par focus karna chahenge?"
    ]
  };

  // Tamil response templates (Romanized)
  private static readonly RESPONSE_TEMPLATES_TA = {
    high: [
      "{name}, neenga romba tension la irukeenga nu enakku theriyum. Ennoda kooda azhama moochchu vidunga - 4 count ullae, 4 count hold pannunga, 4 count veliyae. Neenga munnadiyae kashtangalai overcome pannirkeenga, idhaiyum panna mudiyum. Vanga idhai chinna chinna steps ah break pannalam.",
      "{name}, exam munnadiyae ippadiyae feel panradhu romba normal dhan. Neraya students ku ippadidhan irukum. Oru calming technique try pannalam: ungal kannaiyae moodi, neenga safe ah happy ah feel panra edathae pathi yosinga. Ippo vanga idhai oru chinna piece ah start pannalam.",
      "Naan kekkuraen, {name}. Exam anxiety unmai dhan, aana niyabagam vachukonga - neenga preparation pannirkeenga. Oru moment edunga azhama moochchu vidunga. Ungalukku sollukonga: 'Naan capable, naan prepared, naan idhai handle panna mudiyum.' Vanga focus pannalam neenga enna therinjurkeenga, bayapadradhai illa."
    ],
    medium: [
      "{name}, test munnadiyae nervous feel panradhu natural dhan - adhu neenga care panreenga nu kaatudhu! Vanga indha energy positive ah use pannalam. Idhai try pannunga: moonu azhama moochchu vidunga, aprom moonu vishayangal list pannunga neenga confident ah irukkura. Neenga panna mudiyum!",
      "Naan purinjukuraen neenga worried irukeenga, {name}. Idhu help pannum: ungal study ah chinna chunks ah break pannunga, regular breaks edunga, past successes niyabagam vachukonga. Neenga nenaikuradhai vida romba prepared ah irukeenga!",
      "{name}, anxiety ungal mind ungalai protect panna try panradhu dhan. Vanga adhooda work pannalam, against ah illa. Konjam azhama moochchu vidunga, neenga master pannina topics niyabagam vachukonga, vanga step by step tackle pannalam."
    ],
    low: [
      "{name}, ungalukku exam varudhu nu naan paakkuraen. Neenga munnadiyae yosikuradhu romba nalla vishayam! Vanga neenga well-prepared ah irukkeenga nu sure pannalam. Enna topic review panna virumburenga?",
      "Exams challenging ah theriyalam, {name}, aana avai opportunities kooda neenga enna kathukiteenga nu kaatradharku. Vanga material ah kooda paakkalam ungal confidence build pannalam!",
      "{name}, preparation confident feel panradharku key. Vanga oru study plan create pannalam neenga ready nu sure pannalam. Enna areas la focus panna virumburenga?"
    ]
  };

  // Telugu response templates (Romanized)
  private static readonly RESPONSE_TEMPLATES_TE = {
    high: [
      "{name}, meeru chaala tension lo unnaru ani naku telsu. Naa tho paatu gattiga oopu pattandi - 4 count lopalaki, 4 count aapu, 4 count bayataki. Meeru mundu kashtaalanu overcome chesaru, idhi kuda cheyagalaru. Randi idhi chinna chinna steps ga break cheseddam.",
      "{name}, exam mundu ilaa feel avvadam chaala normal. Chaala students ki idhe untundi. Oka calming technique try cheddam: mee kallanu musi, meeru safe ga happy ga feel ayye place gurinchi alochinchandi. Ippudu randi idhi oka chinna piece tho start cheddam.",
      "Nenu vintunnanu, {name}. Exam anxiety nijam, kaani gurtunchukandi - meeru preparation chesaru. Oka moment teesukondi gattiga oopu pattandi. Mee kosam cheppukandi: 'Nenu capable ni, nenu prepared ni, nenu idhi handle cheyagalanu.' Randi focus cheddam meeku emi telsu, bayapadedi kaadu."
    ],
    medium: [
      "{name}, test mundu nervous feel avvadam natural - adi meeru care chestunnaru ani chupistundi! Randi ee energy ni positive direction lo use cheddam. Idhi try cheyandi: moodu gattiga oopu pattandi, taruvata moodu vishayalu list cheyandi meeru confident ga unna. Meeru cheyagalaru!",
      "Nenu artham chesukuntunnanu meeru worried unnaru, {name}. Idhi help chestundi: mee study ni chinna chunks ga break cheyandi, regular breaks teesukondi, past successes gurtunchukandi. Meeru anukunna kante ekkuva prepared ga unnaru!",
      "{name}, anxiety meeru mind mimmalni protect cheyadaniki try chestundi. Randi danitho paatu pani cheddam, daniki against kaadu. Kontha gattiga oopu pattandi, meeru master chesina topics gurtunchukandi, randi step by step tackle cheddam."
    ],
    low: [
      "{name}, mee exam vastundi ani nenu chustunnanu. Meeru mundu nundi alochistunnaru adi chaala manchidi! Randi meeru well-prepared ga unnaru ani sure cheddam. Meeru emi topic review cheyyalani anukuntunnaru?",
      "Exams challenging ga anipinchavachu, {name}, kaani avi opportunities kuda meeru emi nerchukunaru ani chupinchadaniki. Randi material ni kalisi chuddam mee confidence build cheddam!",
      "{name}, preparation confident feel avvadaniki key. Randi oka study plan create cheddam meeru ready ani sure cheddam. Meeru emi areas meeda focus cheyyalani anukuntunnaru?"
    ]
  };

  /**
   * Generate an enhanced calming response with optional breathing exercises,
   * past success reminders, and topic breakdown offers.
   *
   * REQ-3.2.2: Empathetic calming responses
   * REQ-3.2.3: Concrete calming techniques (breathing exercises, positive self-talk)
   * REQ-3.2.4: Offer to break down topics into smaller pieces
   * REQ-3.2.5: Remind students of past successes
   */
  static generateEnhancedCalmingResponse(
    detectionResult: AnxietyDetectionResult,
    options?: CalmingResponseOptions
  ): string {
    // Start with the base calming response
    let response = this.generateCalmingResponse(detectionResult, options?.studentName);

    // Append 4-7-8 breathing technique for high severity or when explicitly requested
    if (options?.includeBreathingExercise || detectionResult.severity === 'high') {
      response += ' Try the 4-7-8 breathing technique: breathe in for 4 counts, hold for 7 counts, then breathe out for 8 counts. Repeat this 3 times.';
    }

    // Remind of past successes (up to 3)
    if (options?.pastSuccesses && options.pastSuccesses.length > 0) {
      const successes = options.pastSuccesses.slice(0, 3);
      response += ` Remember, you've already mastered: ${successes.join(', ')}.`;
    }

    // Offer to break down the topic
    if (options?.topicToBreakDown) {
      response += ` Would you like me to break ${options.topicToBreakDown} into smaller, easier steps?`;
    }

    return response;
  }

  /**
   * Get an array of calming techniques appropriate for the given severity level.
   *
   * REQ-3.2.3: Provide concrete calming techniques
   */
  static getCalmingTechniques(severity: 'low' | 'medium' | 'high'): string[] {
    switch (severity) {
      case 'high':
        return [
          '4-7-8 breathing: breathe in 4 counts, hold 7, out 8',
          'Progressive muscle relaxation',
          'Positive affirmations: "I am prepared, I can do this"',
          'Visualize success'
        ];
      case 'medium':
        return [
          'Box breathing: 4 counts in, hold 4, out 4',
          'Write down 3 things you know well',
          'Take a 5-minute break and stretch'
        ];
      case 'low':
      default:
        return [
          'Review your notes for 10 minutes',
          'Create a quick study checklist',
          'Practice one example problem'
        ];
    }
  }

  // Kannada response templates (Romanized)
  private static readonly RESPONSE_TEMPLATES_KA = {
    high: [
      "{name}, neevu thumba tension alli iddiri antha nanage gothu. Nanna jothe gattiyagi shwaasa hidi - 4 count olage, 4 count nillisi, 4 count horage. Neevu munche kashtangalannu overcome madiddiri, idannu kuda maadabahadu. Banni idannu chikka chikka steps alli break maadona.",
      "{name}, exam munche hinge feel aaguvudu thumba normal. Thumba students ge ide aagutthe. Ondu calming technique try maadona: nimma kannu muchchi, neevu safe aagi happy aagi feel aaguvva jagaha bagge aalochisi. Ippudu banni idannu ondu chikka piece inda start maadona.",
      "Naanu keluthiddene, {name}. Exam anxiety nijavaada vishaya, aadare nyaapaka maadi - neevu preparation madiddiri. Ondu moment tegedukoli gattiyagi shwaasa hidi. Nimmannu heeli: 'Naanu capable, naanu prepared, naanu idannu handle maadabahadu.' Banni focus maadona neevu enu gottidiri, bayapaduvudu alla."
    ],
    medium: [
      "{name}, test munche nervous feel aaguvudu natural - adu neevu care maaduthiddiri antha torusthu! Banni ee energy yannu positive direction alli use maadona. Idannu try maadi: mooru gattiyagi shwaasa hidi, amele mooru vishayagalannu list maadi neevu confident aagi iruva. Neevu maadabahadu!",
      "Naanu artha maadikondene neevu worried iddiri, {name}. Idu help maadutthe: nimma study yannu chikka chunks alli break maadi, regular breaks tegedukoli, past successes nyaapaka maadi. Neevu nenesiruva kante thumba prepared aagi iddiri!",
      "{name}, anxiety nimma mind nimmanna protect maadakke try maaduthide. Banni adara jothe kelasa maadona, adara against alla. Swalpa gattiyagi shwaasa hidi, neevu master madida topics nyaapaka maadi, banni step by step tackle maadona."
    ],
    low: [
      "{name}, nimma exam barthide antha naanu noduthiddene. Neevu munche aalochisuthiddiri adu thumba chennagide! Banni neevu well-prepared aagi iddiri antha sure maadona. Neevu yaava topic review maadabeku antha ansuththiri?",
      "Exams challenging aagi kansubahadu, {name}, aadare avu opportunities kooda neevu enu kalithiddiri antha torsuva. Banni material annu kooda nodona nimma confidence build maadona!",
      "{name}, preparation confident feel aagakke key. Banni ondu study plan create maadona neevu ready antha sure maadona. Neevu yaava areas mele focus maadabeku antha ansuththiri?"
    ]
  };

  /**
   * Record anxiety event in student's mood history
   * REQ-3.2.6: System SHALL record anxiety events in mood check-ins
   * 
   * @param detectionResult - Result from anxiety detection
   * @param studentProfile - Student profile to update
   * @param additionalNotes - Optional additional notes about the anxiety event
   */
  static recordAnxietyEvent(
    detectionResult: AnxietyDetectionResult,
    studentProfile: any,
    additionalNotes?: string
  ): void {
    // Only record if anxiety is detected (confidence >= 0.3)
    if (!detectionResult.isAnxious || detectionResult.confidence < 0.3) {
      return;
    }

    // Create mood check-in entry for anxiety event
    const moodCheckIn = {
      timestamp: new Date(),
      mood: 'anxious' as const,
      energyLevel: this.mapSeverityToEnergyLevel(detectionResult.severity),
      notes: this.buildAnxietyEventNotes(detectionResult, additionalNotes)
    };

    // Add to mood history
    if (!studentProfile.moodHistory) {
      studentProfile.moodHistory = [];
    }
    studentProfile.moodHistory.push(moodCheckIn);

    // Keep only last 100 mood check-ins to prevent unbounded growth
    if (studentProfile.moodHistory.length > 100) {
      studentProfile.moodHistory = studentProfile.moodHistory.slice(-100);
    }
  }

  /**
   * Map anxiety severity to energy level (1-5 scale)
   * High anxiety = low energy (1-2)
   * Medium anxiety = moderate energy (3)
   * Low anxiety = higher energy (4-5)
   */
  private static mapSeverityToEnergyLevel(severity: 'low' | 'medium' | 'high'): number {
    switch (severity) {
      case 'high':
        return 1;
      case 'medium':
        return 3;
      case 'low':
        return 4;
      default:
        return 3;
    }
  }

  /**
   * Build notes string for anxiety event
   * Includes severity, confidence, and keywords that triggered detection
   */
  private static buildAnxietyEventNotes(
    detectionResult: AnxietyDetectionResult,
    additionalNotes?: string
  ): string {
    const parts: string[] = [];

    // Add severity and confidence
    parts.push(`Anxiety detected: ${detectionResult.severity} severity (confidence: ${(detectionResult.confidence * 100).toFixed(0)}%)`);

    // Add keywords that triggered detection
    if (detectionResult.keywords.length > 0) {
      const keywordList = detectionResult.keywords.slice(0, 5).join(', ');
      parts.push(`Keywords: ${keywordList}`);
    }

    // Add language if not English
    if (detectionResult.language !== 'en') {
      parts.push(`Language: ${detectionResult.language}`);
    }

    // Add additional notes if provided
    if (additionalNotes) {
      parts.push(additionalNotes);
    }

    return parts.join(' | ');
  }
}
