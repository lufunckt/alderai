import { LucianaPersona, MeetingRecord, MemberProfile } from "../types";

export const defaultPersona: LucianaPersona = {
  nome: "Luciana",
  papel: "Assistente interna de reunioes e organizacao de equipe",
  fotoUrl: "/luciana-persona.jpg",
  bio: "Luciana e uma assistente muito competente, com humor afiado e um jeitinho levemente atrapalhado no charme, nunca na entrega. Ela escuta, organiza, traduz a reuniao em clareza e ainda solta um comentario espirituoso quando cabe.",
  greeting: "Oi, eu sou a Luciana. Me passa a reuniao que eu transformo conversa em alguma coisa util, o que ja e um feito bonito.",
  processingLine: "Estou organizando tudo com cuidado. Se a conversa veio torta, eu devolvo em linha reta.",
  successLine: "Pronto. Peguei a reuniao, separei o que importa e deixei o time sem desculpa para dizer que nao viu.",
  emptyStateLine: "Ainda nao tenho material suficiente. E muito facil falar de uma reuniao que eu ainda nem recebi, ne?",
  signoff: "Com carinho operacional, Luciana.",
  traits: ["engracada", "presente", "clara", "competente", "ligeiramente atrapalhada"],
  humorLines: [
    "E muito facil falar quando se esta dizendo alguma coisa, ne?",
    "E muito facil acertar dando a resposta certa.",
    "E muito facil escolher uma letra que seja do alfabeto.",
    "E muito facil errar quando nunca se errou.",
    "E muito facil falar que nao se gosta de uma coisa sem conhecer.",
    "E muito facil falar que se le uma coisa que nao esta escrita."
  ],
  teamMoments: [
    "Luisa, Luiza e Miguel: me entreguem a reuniao inteira que eu devolvo isso com nome, prazo e um minimo de vergonha na cara organizacional.",
    "Se algum de voces disser que estava tudo claro, eu acredito por educacao e documento por sobrevivencia.",
    "Eu estou aqui para ouvir, organizar e evitar que Luisa, Luiza e Miguel finjam surpresa depois."
  ],
  memberMoments: {
    Luisa: [
      "Luisa, eu organizei seu rastro direitinho. Agora fica facil ate parecer que estava tudo sob controle.",
      "Luisa, se voce sumir da reuniao eu ainda tento te achar nas entrelinhas, mas preferia nao precisar."
    ],
    Luiza: [
      "Luiza, eu deixei as tarefas com seu nome bem visiveis. Depois nao me venha dizer que eu falei baixo.",
      "Luiza, eu consigo organizar a reuniao inteira, mas fazer milagre de memoria coletiva ainda esta em beta."
    ],
    Miguel: [
      "Miguel, eu registrei o que e seu. E muito facil parecer inocente quando a ata ainda nao abriu.",
      "Miguel, se voce trouxer contexto eu devolvo clareza. Se trouxer caos eu devolvo clareza tambem, mas com mais trabalho."
    ]
  }
};

export const initialMembers: MemberProfile[] = [
  {
    id: "membro_1",
    nome: "Luisa",
    cargo: "Comercial",
    foto: "LU",
    cor: "#ff8a57",
    anotacoes: ["Costuma puxar follow-up e nao deixa cliente sem resposta."],
    historicoResumido: "Organiza o lado comercial, conduz combinados externos e pressiona os proximos passos."
  },
  {
    id: "membro_2",
    nome: "Luiza",
    cargo: "Operacoes",
    foto: "LZ",
    cor: "#4c8f7b",
    anotacoes: ["Centraliza checklist, prazos e organizacao interna do time."],
    historicoResumido: "Segura a operacao, acompanha prazos e ajuda a transformar ideia em execucao."
  },
  {
    id: "membro_3",
    nome: "Miguel",
    cargo: "Produto",
    foto: "MI",
    cor: "#3856d6",
    anotacoes: ["Ajuda a transformar discussao em escopo e priorizacao."],
    historicoResumido: "Puxa contexto de produto, estrutura escopo e amarra o que vira entrega."
  }
];

export const initialMeetings: MeetingRecord[] = [
  {
    id: "reuniao_seed_1",
    titulo: "Alinhamento semanal da equipe",
    data: "2026-04-07T09:30",
    duracaoSegundos: 3120,
    transcricao:
      "Luisa: precisamos fechar o retorno para o cliente ate 10/04.\n" +
      "Luiza: eu fico responsavel por atualizar o checklist interno ainda hoje.\n" +
      "Miguel: ficou decidido simplificar a proposta do MVP e apresentar so o essencial.\n" +
      "Luisa: precisamos revisar juntos antes de enviar.\n" +
      "Miguel: proximo passo e consolidar o escopo e preparar o follow-up.",
    observacoes:
      "Reuniao para alinhar resposta ao cliente, escopo do MVP e organizacao interna do time.",
    ata: {
      resumo:
        "A equipe alinhou a resposta ao cliente, simplificou o escopo do MVP e distribuiu os encaminhamentos entre comercial, operacoes e produto.",
      participantes: ["Luisa", "Luiza", "Miguel"],
      temas: ["retorno ao cliente", "escopo do MVP", "checklist interno", "follow-up"],
      decisoes: [
        "Apresentar so o essencial do MVP nesta primeira proposta.",
        "Revisar a resposta em conjunto antes do envio."
      ],
      pendencias: [
        "Fechar o texto final de resposta ao cliente.",
        "Consolidar o escopo do MVP em uma versao mais enxuta."
      ],
      proximosPassos: [
        "Luisa envia o retorno final ao cliente ate 10/04.",
        "Luiza atualiza o checklist ainda hoje.",
        "Miguel organiza o escopo e o follow-up."
      ]
    },
    tarefas: [
      {
        id: "task_seed_1",
        titulo: "Fechar retorno para o cliente",
        descricao: "Preparar a resposta final e alinhar a mensagem antes do envio.",
        responsavelId: "membro_1",
        prazo: "2026-04-10",
        status: "pendente",
        prioridade: "alta",
        reuniaoId: "reuniao_seed_1"
      },
      {
        id: "task_seed_2",
        titulo: "Atualizar checklist interno",
        descricao: "Refletir os combinados da reuniao no checklist operacional do time.",
        responsavelId: "membro_2",
        prazo: "2026-04-08",
        status: "em andamento",
        prioridade: "alta",
        reuniaoId: "reuniao_seed_1"
      },
      {
        id: "task_seed_3",
        titulo: "Consolidar escopo do MVP",
        descricao: "Amarrar o que entra na proposta inicial e preparar o follow-up.",
        responsavelId: "membro_3",
        prazo: "2026-04-11",
        status: "pendente",
        prioridade: "media",
        reuniaoId: "reuniao_seed_1"
      }
    ],
    membrosRelacionados: ["membro_1", "membro_2", "membro_3"],
    sugestaoAcompanhamento:
      "Agendar checkpoint em 10/04 para revisar o retorno ao cliente, validar o escopo do MVP e confirmar o follow-up.",
    transcricaoBlocos: [
      {
        id: "seed1_block_1",
        speaker: "Luisa",
        text: "Precisamos fechar o retorno para o cliente ate 10/04.",
        type: "manual"
      },
      {
        id: "seed1_block_2",
        speaker: "Luiza",
        text: "Eu fico responsavel por atualizar o checklist interno ainda hoje.",
        type: "manual"
      },
      {
        id: "seed1_block_3",
        speaker: "Miguel",
        text: "Ficou decidido simplificar a proposta do MVP e apresentar so o essencial.",
        type: "manual"
      }
    ],
    updatedAt: "2026-04-07T10:22"
  },
  {
    id: "reuniao_seed_2",
    titulo: "Planejamento do MVP Luciana",
    data: "2026-04-05T15:00",
    duracaoSegundos: 2460,
    transcricao:
      "Miguel: vamos priorizar o fluxo de gravacao e ata automatica nesta sprint.\n" +
      "Luiza: preciso revisar o fluxo operacional e a persistencia local.\n" +
      "Luisa: ainda falta definir como vamos apresentar a Luciana de um jeito mais humano.\n" +
      "Miguel: proximo passo e voltar com a proposta consolidada na semana que vem.",
    observacoes:
      "Ritual interno para alinhar prioridades do MVP, foco da sprint e apresentacao da Luciana.",
    ata: {
      resumo:
        "A equipe alinhou a sprint do MVP com foco em gravacao, ata automatica, persistencia local e uma presenca mais humana da Luciana.",
      participantes: ["Luisa", "Luiza", "Miguel"],
      temas: ["gravacao", "ata automatica", "persistencia local", "presenca da Luciana"],
      decisoes: ["Priorizar gravacao e ata automatica na sprint atual."],
      pendencias: [
        "Definir melhor a apresentacao visual e verbal da Luciana.",
        "Revisar o fluxo operacional e a persistencia local."
      ],
      proximosPassos: [
        "Luiza revisa o fluxo operacional.",
        "Miguel consolida a proposta da sprint.",
        "Luisa aprofunda a apresentacao da Luciana."
      ]
    },
    tarefas: [
      {
        id: "task_seed_4",
        titulo: "Revisar fluxo operacional",
        descricao: "Refinar o caminho de gravacao, salvamento e historico local.",
        responsavelId: "membro_2",
        prazo: "2026-04-09",
        status: "pendente",
        prioridade: "media",
        reuniaoId: "reuniao_seed_2"
      },
      {
        id: "task_seed_5",
        titulo: "Consolidar proposta da sprint",
        descricao: "Preparar o recorte final do MVP com foco em gravacao e atas.",
        responsavelId: "membro_3",
        prazo: "2026-04-12",
        status: "pendente",
        prioridade: "media",
        reuniaoId: "reuniao_seed_2"
      },
      {
        id: "task_seed_6",
        titulo: "Definir a presenca da Luciana",
        descricao: "Aprofundar o jeito de falar, os momentos de presenca e a apresentacao visual da assistente.",
        responsavelId: "membro_1",
        prazo: "2026-04-11",
        status: "pendente",
        prioridade: "alta",
        reuniaoId: "reuniao_seed_2"
      }
    ],
    membrosRelacionados: ["membro_1", "membro_2", "membro_3"],
    sugestaoAcompanhamento:
      "Marcar revisao em 12/04 para fechar a proposta da sprint, validar a presenca da Luciana e revisar o fluxo operacional.",
    transcricaoBlocos: [
      {
        id: "seed2_block_1",
        speaker: "Miguel",
        text: "Vamos priorizar o fluxo de gravacao e ata automatica nesta sprint.",
        type: "manual"
      },
      {
        id: "seed2_block_2",
        speaker: "Luisa",
        text: "Ainda falta definir como vamos apresentar a Luciana de um jeito mais humano.",
        type: "manual"
      }
    ],
    updatedAt: "2026-04-05T16:01"
  }
];
