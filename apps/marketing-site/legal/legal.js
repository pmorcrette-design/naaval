const legalSections = [
  {
    id: "cgu",
    eyebrow: "CGU",
    title: "Conditions Générales d’Utilisation",
    lead:
      "Les présentes CGU définissent le cadre d’utilisation de Naaval, plateforme SaaS destinée aux transporteurs et professionnels de la logistique pour piloter leurs opérations, optimiser leurs tournées, gérer leurs chauffeurs, leurs prix et leurs flux de livraison.",
    items: [
      {
        title: "Objet du service",
        subtitle: "Périmètre fonctionnel de la plateforme Naaval",
        body: [
          "Naaval met à disposition un environnement logiciel accessible en ligne permettant notamment l’optimisation de tournées, la gestion des chauffeurs, la gestion de transport, le pricing, le suivi opérationnel et l’accès à des applications mobiles professionnelles.",
          "La plateforme est fournie en mode SaaS avec un accès navigateur pour les dashboards et un accès applicatif mobile pour les usages terrain."
        ],
        chips: ["SaaS", "VRP", "Ops", "Applications mobiles professionnelles"]
      },
      {
        title: "Accès et comptes",
        subtitle: "Règles d’accès aux espaces Naaval",
        body: [
          "L’accès au service est réservé aux utilisateurs autorisés par Naaval ou par l’organisation cliente. Chaque compte est personnel, nominatif et placé sous la responsabilité de l’entité qui l’a créé ou administré.",
          "Les utilisateurs s’engagent à fournir des informations exactes, à maintenir la confidentialité de leurs identifiants et à signaler immédiatement toute suspicion d’accès non autorisé."
        ]
      },
      {
        title: "Naaval Carrier App",
        subtitle: "Application mobile professionnelle",
        body: [
          "Naaval Carrier App est une véritable application mobile professionnelle et ne doit pas être présentée comme un simple raccourci web ou une PWA.",
          "Sur iPhone, certaines installations peuvent nécessiter la validation du profil développeur via Réglages > Général > VPN et gestion de l’appareil, puis la confirmation du profil d’entreprise avant ouverture de l’application."
        ],
        chips: ["Application mobile", "iPhone", "Entreprise"]
      },
      {
        title: "Données opérationnelles",
        subtitle: "Géolocalisation, livraison et usage du service",
        body: [
          "Naaval peut traiter des données de géolocalisation, des données de livraison, des données d’itinéraire, des preuves de livraison, des données commerciales et d’autres éléments strictement nécessaires au fonctionnement des services.",
          "Ces données sont utilisées pour l’exécution du service, l’amélioration de la qualité opérationnelle, la traçabilité des missions et le support client."
        ]
      },
      {
        title: "Responsabilité et propriété intellectuelle",
        subtitle: "Cadre juridique de l’usage de la plateforme",
        body: [
          "Naaval est soumis à une obligation de moyens dans la fourniture de ses services, compte tenu de la nature logicielle, cloud et connectée de la plateforme.",
          "L’ensemble du logiciel, du branding, des algorithmes, des interfaces, de la documentation et des contenus associés demeure la propriété exclusive de Naaval ou de ses concédants."
        ],
        chips: ["Obligation de moyens", "Droit français", "Propriété intellectuelle"]
      }
    ]
  },
  {
    id: "cgv",
    eyebrow: "CGV",
    title: "Conditions Générales de Vente",
    lead:
      "Les présentes CGV encadrent la souscription, la facturation et la fourniture des services Naaval, incluant l’accès SaaS, les modules d’optimisation, le pricing engine, les interfaces clients et les applications mobiles professionnelles.",
    items: [
      {
        title: "Services couverts",
        subtitle: "Nature des prestations commercialisées",
        body: [
          "Les services commercialisés par Naaval comprennent notamment l’accès SaaS, le VRP, le pricing engine, la gestion opérationnelle, l’API, les applications mobiles et le support associé selon le plan souscrit.",
          "Certains modules peuvent être réservés à des plans spécifiques ou faire l’objet d’options et d’overrides contractuels particuliers."
        ]
      },
      {
        title: "Abonnements et renouvellement",
        subtitle: "Mensuel ou annuel avec reconduction",
        body: [
          "Les abonnements Naaval sont proposés sur une base mensuelle ou annuelle avec renouvellement automatique à l’échéance, sauf résiliation conforme aux conditions contractuelles applicables.",
          "Les limites, modules, algorithmes, droits d’accès et volumes inclus dépendent du plan souscrit par le client."
        ],
        chips: ["Starter", "Growth", "Scale", "Enterprise"]
      },
      {
        title: "Paiement et suspension",
        subtitle: "Facturation et incidents de paiement",
        body: [
          "Les prestations sont payables à échéance selon les modalités prévues sur la proposition commerciale, le bon de commande ou la facture.",
          "En cas d’impayé, Naaval se réserve le droit de suspendre tout ou partie des services après mise en demeure restée infructueuse, sans préjudice des sommes dues."
        ]
      },
      {
        title: "Responsabilité et limitation",
        subtitle: "Plafond contractuel",
        body: [
          "Sauf faute lourde ou disposition légale impérative contraire, la responsabilité globale de Naaval est limitée au montant effectivement payé par le client au cours des douze derniers mois précédant le fait générateur du dommage.",
          "En aucun cas Naaval ne saurait être tenu responsable des dommages indirects, pertes d’exploitation, pertes d’opportunité ou préjudices commerciaux consécutifs."
        ]
      },
      {
        title: "Force majeure",
        subtitle: "Événements externes et indisponibilités",
        body: [
          "Naaval ne peut être tenu responsable des interruptions ou dégradations de service liées à des événements de force majeure ou à des tiers, incluant notamment les incidents cloud, réseau, cyberattaques, catastrophes naturelles ou défaillances de fournisseurs externes.",
          "Les parties conviennent de coopérer de bonne foi afin de limiter les effets d’un tel événement sur la continuité des opérations."
        ],
        chips: ["Cloud", "Réseau", "Cyber", "Tiers"]
      }
    ]
  },
  {
    id: "privacy",
    eyebrow: "RGPD",
    title: "Politique de confidentialité",
    lead:
      "Cette politique résume la manière dont Naaval collecte, utilise, sécurise et conserve les données nécessaires à la fourniture de ses services, dans le respect de ses engagements de sécurité et des principes RGPD.",
    items: [
      {
        title: "Données collectées",
        subtitle: "Catégories principales",
        body: [
          "Naaval peut collecter des données d’identification, de compte, de société, d’opérations, de géolocalisation, de livraison, de preuve, de facturation, d’usage produit et de support.",
          "Les cookies et technologies analogues peuvent être utilisés pour assurer le fonctionnement du site, la sécurité des sessions, la mesure d’audience et l’amélioration du service."
        ],
        chips: ["Comptes", "Opérations", "Cookies", "Géolocalisation"]
      },
      {
        title: "Finalités du traitement",
        subtitle: "Pourquoi Naaval traite ces données",
        body: [
          "Les données sont traitées pour fournir les services souscrits, exécuter les missions de transport, sécuriser les accès, tracer les opérations, assister les utilisateurs, produire la facturation et améliorer la fiabilité du produit.",
          "Certaines données peuvent également être utilisées pour prévenir les abus, répondre à des obligations légales et documenter les opérations logistiques en cas de litige."
        ]
      },
      {
        title: "Sécurité, stockage et sous-traitance",
        subtitle: "Mesures de protection",
        body: [
          "Naaval met en œuvre des mesures techniques et organisationnelles appropriées pour protéger les données contre la perte, l’altération, l’accès non autorisé ou la divulgation.",
          "Les données peuvent être hébergées chez des prestataires cloud ou techniques sélectionnés par Naaval, sous réserve de garanties contractuelles et de sécurité adaptées."
        ]
      },
      {
        title: "Droits des personnes",
        subtitle: "Accès, rectification, suppression",
        body: [
          "Chaque personne concernée dispose, dans les conditions prévues par la réglementation applicable, d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité de ses données.",
          "Les demandes peuvent être adressées à Naaval via l’adresse de contact indiquée dans les mentions légales. Une preuve d’identité peut être demandée lorsque cela est nécessaire."
        ],
        chips: ["Accès", "Rectification", "Suppression", "Portabilité"]
      }
    ]
  },
  {
    id: "mentions",
    eyebrow: "Informations",
    title: "Mentions légales",
    lead:
      "Les mentions légales ci-dessous doivent être complétées et validées avant diffusion contractuelle finale. Elles sont structurées pour une publication corporate crédible et lisible.",
    items: [
      {
        title: "Éditeur du site",
        subtitle: "Informations société",
        body: [
          "Société : [À compléter]",
          "Forme juridique : [À compléter]",
          "Adresse du siège : [À compléter]",
          "Numéro d’immatriculation : [À compléter]",
          "Numéro de TVA intracommunautaire : [À compléter]",
          "Adresse e-mail : [À compléter]"
        ]
      },
      {
        title: "Publication et hébergement",
        subtitle: "Responsables et prestataires",
        body: [
          "Directeur de la publication : [À compléter]",
          "Hébergeur principal : [À compléter]",
          "Adresse de l’hébergeur : [À compléter]",
          "Contact hébergeur : [À compléter]"
        ]
      },
      {
        title: "Contact et réclamations",
        subtitle: "Point d’entrée juridique et commercial",
        body: [
          "Pour toute question contractuelle, demande de support juridique, exercice de droits ou réclamation, contacter : [À compléter].",
          "Naaval recommande de prévoir une adresse dédiée de type legal@naaval.eu ou privacy@naaval.eu ainsi qu’un processus interne documenté de traitement."
        ],
        chips: ["Legal", "Privacy", "Support"]
      }
    ]
  }
];

function renderLegalHero() {
  return `
    <section class="legal-hero">
      <span class="eyebrow">Naaval Legal</span>
      <h1>Un cadre contractuel clair pour une plateforme logistique enterprise.</h1>
      <p class="legal-hero__subtitle">
        Retrouvez les conditions d’utilisation, les conditions de vente, la politique de confidentialité et les mentions légales
        de Naaval dans une interface lisible, structurée et adaptée à des échanges avec des clients professionnels, partenaires
        et investisseurs.
      </p>
      <div class="legal-hero__chips">
        <span class="hero-chip">CGU</span>
        <span class="hero-chip">CGV</span>
        <span class="hero-chip">Confidentialité</span>
        <span class="hero-chip">Mentions légales</span>
      </div>
    </section>
  `;
}

function renderTableOfContents() {
  return `
    <div class="legal-toc">
      <span class="legal-toc__label">Sommaire</span>
      <nav class="legal-toc__links">
        ${legalSections
          .map(
            (section) => `
              <a class="toc-link" href="#${section.id}" data-target="${section.id}">
                ${section.title}
              </a>
            `
          )
          .join("")}
      </nav>
    </div>
  `;
}

function renderLegalItem(item, index) {
  return `
    <details class="legal-item" ${index === 0 ? "open" : ""}>
      <summary>
        <div class="legal-item__title">
          <strong>${item.title}</strong>
          <span>${item.subtitle}</span>
        </div>
        <span class="legal-item__icon">+</span>
      </summary>
      <div class="legal-item__body">
        ${
          item.chips?.length
            ? `<div class="legal-item__meta">${item.chips.map((chip) => `<span class="legal-chip">${chip}</span>`).join("")}</div>`
            : ""
        }
        ${item.body
          .map((paragraph) =>
            paragraph.includes(" : [À compléter]") || paragraph.includes(" : [À compléter")
              ? `<p><strong>${paragraph.split(" : ")[0]} :</strong> ${paragraph.split(" : ").slice(1).join(" : ")}</p>`
              : `<p>${paragraph}</p>`
          )
          .join("")}
      </div>
    </details>
  `;
}

function renderLegalSection(section) {
  return `
    <section class="legal-card legal-section" id="${section.id}">
      <div class="legal-section__head">
        <span class="eyebrow">${section.eyebrow}</span>
        <h2>${section.title}</h2>
        <p class="legal-section__lead">${section.lead}</p>
      </div>
      <div class="legal-accordion">
        ${section.items.map((item, index) => renderLegalItem(item, index)).join("")}
      </div>
    </section>
  `;
}

function mountLegalPage() {
  const heroNode = document.querySelector("#legal-hero");
  const tocNode = document.querySelector("#legal-toc");
  const contentNode = document.querySelector("#legal-content");

  if (!heroNode || !tocNode || !contentNode) {
    return;
  }

  heroNode.innerHTML = renderLegalHero();
  tocNode.innerHTML = renderTableOfContents();
  contentNode.innerHTML = legalSections.map((section) => renderLegalSection(section)).join("");
}

function setupBackToTop() {
  const button = document.querySelector("#back-to-top");
  if (!button) {
    return;
  }

  const toggle = () => {
    button.classList.toggle("hidden", window.scrollY < 420);
  };

  window.addEventListener("scroll", toggle, { passive: true });
  toggle();

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function setupActiveToc() {
  const links = [...document.querySelectorAll(".toc-link")];
  const sections = links
    .map((link) => document.getElementById(link.getAttribute("data-target")))
    .filter(Boolean);

  if (!links.length || !sections.length) {
    return;
  }

  const activate = () => {
    let activeId = sections[0].id;
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 140) {
        activeId = section.id;
      }
    }

    links.forEach((link) => {
      link.classList.toggle("toc-link--active", link.getAttribute("data-target") === activeId);
    });
  };

  window.addEventListener("scroll", activate, { passive: true });
  activate();
}

mountLegalPage();
setupBackToTop();
setupActiveToc();
