// Questions d'entraînement au format TOEIC Listening & Reading (questions originales).
// a = index de la bonne réponse ; why = explication en français.

const TOEIC = {
  // Partie 2 : question / réponse (3 choix, audio)
  p2: [
    { q: "When is the next safety training?", o: ["In the meeting room.", "Next Thursday morning.", "Yes, it was very useful."], a: 1, why: "« When » demande un moment : « Next Thursday morning »." },
    { q: "Who approved the repair scheme?", o: ["The structures engineer did.", "It was approved last week.", "A bonded patch."], a: 0, why: "« Who » demande une personne." },
    { q: "Why was the delivery delayed?", o: ["By truck, I think.", "Because the supplier ran out of resin.", "At gate twelve."], a: 1, why: "« Why » appelle une raison : « Because… »." },
    { q: "Would you like me to send you the report?", o: ["Yes, please, that would help.", "I reported it yesterday.", "It's a long report."], a: 0, why: "Proposition (« Would you like me to… ») → accepter ou refuser poliment. Piège : « reported » répète le son du mot." },
    { q: "Where should I store the prepreg rolls?", o: ["For six months.", "In the freezer next to the clean room.", "They're carbon fibre."], a: 1, why: "« Where » demande un lieu." },
    { q: "Haven't you finished the inspection yet?", o: ["Almost, I just need to sign the card.", "No, the inspector is French.", "In hangar three."], a: 0, why: "Question négative : on répond sur l'état d'avancement." },
    { q: "How long does the cure cycle take?", o: ["About four hours.", "At 180 degrees.", "In the autoclave."], a: 0, why: "« How long » demande une durée." },
    { q: "The meeting has been moved to Friday, hasn't it?", o: ["I moved to Paris last year.", "Yes, at 2 p.m.", "The meeting room is booked."], a: 1, why: "Question-tag : on confirme ou on corrige l'information. Piège : « moved » répété." },
    { q: "Should we order the parts now or wait for the quote?", o: ["Let's wait for the quote.", "They ordered pizza.", "Yes, we should."], a: 0, why: "Question à choix (A or B) : on ne répond pas par « yes/no »." },
    { q: "Could you check the torque values on panel C?", o: ["Sure, I'll do it right after lunch.", "He paid by check.", "The panel is blue."], a: 0, why: "Demande polie → « Sure… ». Piège : « check » (chèque)." },
    { q: "Which supplier offers the shortest lead time?", o: ["The one in Toulouse.", "It leads to the exit.", "Twelve hours ago."], a: 0, why: "« Which » demande un choix parmi plusieurs." },
    { q: "Why don't we automate the layup?", o: ["Because it's raining.", "That's a good idea, but it's expensive.", "I laid it on the table."], a: 1, why: "« Why don't we… » est une suggestion, pas une vraie question sur une raison." },
  ],

  // Partie 3 : conversations (audio) + 3 questions
  p3: [
    {
      lines: [
        ["W", "Hi Mark, the carbon panels for the Airbus order are still not here. Do you know what happened?"],
        ["M", "Yes, I called the supplier this morning. Their autoclave broke down, so production stopped for two days."],
        ["W", "That's a problem. Our customer expects the parts by the end of the month."],
        ["M", "I know. They promised to ship half of the order on Monday. I'll send the customer an update today."],
      ],
      qs: [
        { q: "What is the conversation mainly about?", o: ["A late delivery", "A job interview", "A new product design", "A training course"], a: 0, why: "Les panneaux ne sont « still not here » : livraison en retard." },
        { q: "What caused the problem?", o: ["A shipping error", "Equipment failure", "Bad weather", "A strike"], a: 1, why: "« Their autoclave broke down » = panne d'équipement." },
        { q: "What will the man do today?", o: ["Visit the supplier", "Repair the autoclave", "Contact the customer", "Cancel the order"], a: 2, why: "« I'll send the customer an update today »." },
      ],
    },
    {
      lines: [
        ["M", "Excuse me, I'm here for the quality audit. I was told to ask for Ms Diallo."],
        ["W", "That's me. Welcome! The auditors usually start with the documentation office. It's on the second floor."],
        ["M", "Great. Will I also be able to see the repair shop?"],
        ["W", "Yes, after lunch. But you'll need safety shoes. I'll get you a pair from the store."],
      ],
      qs: [
        { q: "Who most likely is the man?", o: ["A new technician", "An auditor", "A delivery driver", "A pilot"], a: 1, why: "« I'm here for the quality audit »." },
        { q: "Where will the man go first?", o: ["The repair shop", "The cafeteria", "The documentation office", "The store"], a: 2, why: "« The auditors usually start with the documentation office »." },
        { q: "What does the woman offer to do?", o: ["Get him safety shoes", "Book a hotel", "Call a taxi", "Print the report"], a: 0, why: "« I'll get you a pair » (de chaussures de sécurité)." },
      ],
    },
    {
      lines: [
        ["W", "Raj, how is the new laser projection system working on the layup line?"],
        ["M", "Really well. Operators position plies much faster, and we've had no orientation errors this month."],
        ["W", "Excellent. Could you put those figures in a short presentation for Thursday's management meeting?"],
        ["M", "Of course. I'll include the cycle time comparison too."],
      ],
      qs: [
        { q: "What are the speakers discussing?", o: ["A new piece of equipment", "A hiring plan", "A customer complaint", "A budget cut"], a: 0, why: "Ils parlent du « new laser projection system »." },
        { q: "What improvement does the man mention?", o: ["Lower energy costs", "Fewer errors", "Better training", "Cheaper materials"], a: 1, why: "« no orientation errors this month »." },
        { q: "What will the man prepare?", o: ["A purchase order", "A safety notice", "A presentation", "A job description"], a: 2, why: "« put those figures in a short presentation »." },
      ],
    },
  ],

  // Partie 4 : courts exposés (audio) + 3 questions
  p4: [
    {
      lines: [["M", "Attention all hangar staff. Due to the storm warning, the outdoor engine run scheduled for three o'clock is postponed until tomorrow morning. All aircraft must be moved inside before two p.m. Team leaders, please confirm with the shift manager once your aircraft are secured. Thank you."]],
      qs: [
        { q: "Why has the engine run been postponed?", o: ["A staff shortage", "Bad weather", "A missing part", "A system update"], a: 1, why: "« Due to the storm warning »." },
        { q: "What must be done before 2 p.m.?", o: ["Aircraft must be moved inside", "Engines must be started", "Reports must be sent", "Staff must leave"], a: 0, why: "« All aircraft must be moved inside before two p.m. »" },
        { q: "What are team leaders asked to do?", o: ["Call the airport", "Confirm with the shift manager", "Write a report", "Check the weather"], a: 1, why: "« please confirm with the shift manager »." },
      ],
    },
    {
      lines: [["W", "Hello, this is Laura Chen from Atlantic Composites, returning your call about the quotation. The price for the forty sandwich panels is twelve thousand euros, including transport. If you confirm the order by Friday, we can offer a five percent discount. Please call me back on 555 0192. Thank you."]],
      qs: [
        { q: "Why is the speaker calling?", o: ["To cancel an order", "To answer a request for a price", "To apply for a job", "To book a meeting room"], a: 1, why: "« returning your call about the quotation »." },
        { q: "What is included in the price?", o: ["Installation", "Transport", "Training", "Insurance"], a: 1, why: "« including transport »." },
        { q: "How can the listener get a discount?", o: ["By ordering more panels", "By paying in cash", "By confirming before Friday", "By visiting the factory"], a: 2, why: "« If you confirm the order by Friday… five percent discount »." },
      ],
    },
  ],

  // Partie 5 : phrases à compléter (grammaire / vocabulaire)
  p5: [
    { q: "All technicians must ------- the task card before starting work.", o: ["reading", "read", "reads", "to read"], a: 1, why: "Après un modal (must) : verbe à la base, sans « to »." },
    { q: "The inspection was completed ------- than expected.", o: ["quick", "quickest", "more quickly", "quickness"], a: 2, why: "Comparatif d'un adverbe : « more quickly than »." },
    { q: "Ms Kane is responsible ------- the quality department.", o: ["of", "for", "to", "at"], a: 1, why: "Expression fixe : « responsible for »." },
    { q: "The new mould has ------- reduced our cycle time.", o: ["significant", "significance", "significantly", "signify"], a: 2, why: "Un adverbe modifie le verbe « reduced »." },
    { q: "------- the delay, the project was delivered within budget.", o: ["Although", "Despite", "Because", "However"], a: 1, why: "« Despite » + nom ; « Although » serait suivi d'une phrase complète." },
    { q: "If the supplier ------- earlier, we would have met the deadline.", o: ["delivers", "delivered", "had delivered", "will deliver"], a: 2, why: "Conditionnel passé (3e type) : if + past perfect, would have + participe." },
    { q: "The report must be submitted ------- Friday at the latest.", o: ["by", "until", "since", "during"], a: 0, why: "« by » = au plus tard à (une échéance) ; « until » = jusqu'à (durée continue)." },
    { q: "Neither the manager ------- the engineers attended the briefing.", o: ["or", "and", "nor", "but"], a: 2, why: "Structure « neither … nor »." },
    { q: "We are looking forward to ------- your feedback.", o: ["receive", "receiving", "received", "be receiving"], a: 1, why: "« look forward to » est suivi de -ing (to est une préposition)." },
    { q: "The parts ------- in the warehouse since Monday.", o: ["are", "were", "have been", "being"], a: 2, why: "« since » + action qui continue → present perfect." },
    { q: "Please find ------- the updated drawing.", o: ["attach", "attached", "attaching", "attachment"], a: 1, why: "Formule fixe des e-mails : « Please find attached »." },
    { q: "The engineer ------- designed the jig received an award.", o: ["which", "who", "whom", "whose"], a: 1, why: "Pronom relatif sujet pour une personne : « who »." },
    { q: "Production will resume ------- the machine has been repaired.", o: ["once", "during", "despite", "unless"], a: 0, why: "« once » = dès que (une fois que)." },
    { q: "The company plans to ------- its production capacity next year.", o: ["expand", "expansion", "expansive", "expanding"], a: 0, why: "Après « to » : verbe à la base." },
    { q: "Only ------- employees may enter the clean room.", o: ["authorize", "authorizing", "authorized", "authorization"], a: 2, why: "Participe passé employé comme adjectif : « authorized employees »." },
    { q: "The results were ------- satisfactory that no further tests were needed.", o: ["such", "so", "very", "too"], a: 1, why: "« so + adjectif + that » ; « such » s'utilise avec un nom." },
    { q: "Each of the panels ------- inspected before shipping.", o: ["are", "is", "were", "have"], a: 1, why: "« Each » est singulier → « is »." },
    { q: "Mr Ito asked us to keep the meeting ------- .", o: ["brief", "briefly", "briefing", "briefness"], a: 0, why: "« keep + objet + adjectif »." },
    { q: "The training is mandatory for ------- working in the hangar.", o: ["anyone", "someone", "no one", "everyone's"], a: 0, why: "« anyone working… » = toute personne qui travaille…" },
    { q: "The budget was approved ------- the board's meeting last week.", o: ["at", "in", "on", "to"], a: 0, why: "« at the meeting » = lors de la réunion." },
  ],

  // Partie 6 : texte à trous
  p6: [
    {
      text: "To: All production staff\nSubject: New badge system\n\nStarting next Monday, a new badge system will be [1] at all entrances. Every employee will receive a personal badge [2] gives access only to the areas needed for their job. Please collect your badge from the security office [3] Friday. Thank you for your cooperation.",
      qs: [
        { q: "[1]", o: ["install", "installed", "installing", "installation"], a: 1, why: "Passif : « will be installed »." },
        { q: "[2]", o: ["who", "what", "that", "where"], a: 2, why: "Pronom relatif pour une chose : « that » (ou which)." },
        { q: "[3]", o: ["before", "between", "among", "while"], a: 0, why: "« before Friday » = avant vendredi." },
      ],
    },
    {
      text: "Dear Mr Lopez,\n\nThank you for your order of 200 honeycomb panels. Unfortunately, one of our presses is [1] maintenance, so we will not be able to ship the full quantity on time. We [2] send 120 panels on 3 May and the remaining 80 by 15 May. We [3] apologize for any inconvenience.\n\nBest regards,\nAnna Weber",
      qs: [
        { q: "[1]", o: ["under", "below", "over", "beneath"], a: 0, why: "Expression : « under maintenance » = en maintenance." },
        { q: "[2]", o: ["were", "can", "have", "being"], a: 1, why: "Modal + base verbale : « can send »." },
        { q: "[3]", o: ["sincere", "sincerely", "sincerity", "sincerest"], a: 1, why: "Adverbe devant le verbe : « sincerely apologize »." },
      ],
    },
  ],

  // Partie 7 : compréhension écrite
  p7: [
    {
      text: "NOTICE — Composite Shop\n\nThe clean room will be closed from 10 to 12 June for the annual filter replacement. During this period, all layup work will be carried out in Building B. Prepreg materials must remain in the freezer until 13 June. For questions, contact facilities manager Paul Ndiaye (ext. 4471).",
      qs: [
        { q: "What is the purpose of the notice?", o: ["To announce a temporary closure", "To introduce a new manager", "To advertise a job", "To change working hours"], a: 0, why: "La salle propre sera fermée du 10 au 12 juin." },
        { q: "Why will the clean room be closed?", o: ["For a safety inspection", "For filter replacement", "For a staff party", "For painting"], a: 1, why: "« for the annual filter replacement »." },
        { q: "Where will layup work take place during the closure?", o: ["In the freezer", "In Building B", "At the supplier", "It will stop"], a: 1, why: "« carried out in Building B »." },
      ],
    },
    {
      text: "JOB OFFER — Composite Repair Engineer (Hamburg)\n\nWe are seeking an engineer with at least three years of experience in aircraft structural repair. Knowledge of the SRM and of NDT methods is required. Fluency in English is essential; German is an advantage. The position includes occasional travel to customer sites. Send your CV and a cover letter to hr@example.com before 30 April.",
      qs: [
        { q: "What is a requirement for the job?", o: ["Fluent German", "Three years of experience", "A pilot licence", "Management experience"], a: 1, why: "« at least three years of experience »." },
        { q: "What does the job involve?", o: ["Teaching students", "Occasional travel", "Night shifts only", "Selling aircraft"], a: 1, why: "« occasional travel to customer sites »." },
        { q: "The word \"essential\" is closest in meaning to", o: ["optional", "necessary", "useful", "rare"], a: 1, why: "« essential » = indispensable, nécessaire." },
      ],
    },
  ],
};
