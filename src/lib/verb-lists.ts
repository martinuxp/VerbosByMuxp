
export type VerbList = {
  name: string;
  description: string;
  verbs: string[];
};

export const verbLists: VerbList[] = [
  {
    name: "Quiz 1 | 2°K",
    description: "40 verbos (20 regulares + 20 irregulares) para el Quiz 1 de 2°K.",
    verbs: [
      // Regulars
      'accept', 'add', 'agree', 'appear', 'arrive', 'ask', 'believe', 'borrow', 'call', 'cancel',
      'change', 'clean', 'climb', 'close', 'compare', 'complain', 'continue', 'cook', 'dance', 'decide',
      // Irregulars
      'be', 'become', 'begin', 'break', 'bring', 'build', 'buy', 'catch', 'choose', 'come',
      'cut', 'do', 'draw', 'drink', 'drive', 'eat', 'fall', 'feel', 'find', 'fly'
    ]
  },
  {
    name: "Los 20 más comunes",
    description: "Una selección de los verbos irregulares más frecuentes.",
    verbs: [
      'be', 'have', 'do', 'say', 'go', 'get', 'make', 'know', 'think', 'take',
      'see', 'come', 'want', 'look', 'use', 'find', 'give', 'tell', 'work', 'call'
    ]
  },
  {
    name: "Verbos para Viajes",
    description: "Verbos útiles para tus aventuras y viajes.",
    verbs: [
      'go', 'travel', 'see', 'buy', 'eat', 'drink', 'take', 'understand', 'ask', 'book',
      'arrive', 'leave', 'drive', 'fly', 'find', 'help', 'pay', 'stay', 'visit'
    ]
  },
  {
    name: "Esenciales para Principiantes",
    description: "Los primeros verbos que todo estudiante debe aprender.",
    verbs: [
      'be', 'have', 'do', 'like', 'work', 'live', 'study', 'play', 'eat', 'drink',
      'want', 'need', 'go', 'read', 'write', 'speak', 'listen', 'open', 'close', 'start'
    ]
  },
  {
    name: "Quiz de inglés 1°K 26/09",
    description: "Verbos irregulares y regulares para el quiz del 1°K.",
    verbs: [
      'awake', 'be', 'build', 'become', 'bring', 'break', 'be able', 'begin', 'bite', 'breed', 'burn',
      'can', 'catch', 'come', 'cost', 'cut', 'choose', 'do', 'draw',
      'open', 'own', 'pack', 'paint', 'pass', 'pick', 'plan', 'plant', 'play', 'practice',
      'prefer', 'prepare', 'present', 'print', 'publish', 'pull', 'push', 'punish', 'purify', 'provide'
    ]
  },
  {
    name: "Quiz de Ingles 1K ultimo",
    description: "La última lista de verbos irregulares y regulares para el quiz.",
    verbs: [
      'get up', 'hang', 'have', 'have to', 'hear', 'hide', 'hit', 'hold', 'hurt', 'keep',
      'know', 'lead', 'learn', 'leave', 'lend', 'let', 'light', 'lose', 'make', 'mean',
      'serve', 'shout', 'smile', 'smoke', 'snow', 'start', 'stay', 'step', 'stop', 'study',
      'surprise', 'sign', 'sound', 'share', 'talk', 'thank', 'touch', 'trade', 'travel', 'treat'
    ]
  },
  {
    name: "Quiz 2 | 2°K | 21-40",
    description: "Lista de 40 verbos regulares e irregulares para el Quiz 2. Hecha para el nuevo modo DUELO.",
    verbs: [
      'forget', 'forgive', 'get', 'give', 'go', 'grow', 'have', 'hear', 'hide', 'hold',
      'keep', 'know', 'leave', 'lend', 'let', 'lose', 'make', 'meet', 'pay', 'put',
      'deliver', 'depend', 'describe', 'develop', 'disagree', 'discover', 'earn', 'enter',
      'enjoy', 'expect', 'explain', 'finish', 'follow', 'happen', 'help', 'hope',
      'imagine', 'include', 'introduce', 'invite'
    ]
  },
  {
    name: "Quiz 3 | 2°K | 41-60",
    description: "Lista de 40 verbos regulares e irregulares para el Quiz 3. Hecha para el nuevo modo DUELO.",
    verbs: [
      // Irregulares
      "read", "ride", "ring", "run", "say", "see", "sell", "send", "sit", "sleep", "speak", "spend", "stand", "swim", "take",
      "teach", "tell", "think", "throw", "understand",
      // Regulares
      "join", "learn", "like", "listen", "live", "look", "love", "manage", "mention",
      "move", "need", "notice", "offer", "open", "organize", "paint", "plan", "prepare", "promise", "protect"
    ]
  }
];
