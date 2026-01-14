const recipes = [
  {
    id: "notify-action",
    title: "Mobil-varsel med Ja/Nei handling",
    category: "Varsling",
    summary:
      "Send et actionable push-varsel og fang opp knappetrykkene med events all. Fikser vanlig feilen med at message ikke er en streng.",
    flow: [
      {
        label: "Trigger",
        help: "Bruk en Events: state-node på garasjeporten, eller en Inject for testing.",
      },
      {
        label: "Function",
        help: "Klikk Kopier for å lime inn koden i Function-noden og bygg payload med actions.",
      },
      {
        label: "Action",
        help: "Sett service til notify.mobile_app_<telefon>. Velg Data type: JSONata (Expression) og skriv payload for å sende msg.payload fra Function-noden.",
      },
      {
        label: "Events: all",
        help: "Filtrer på event type mobile_app_notification_action for å fange knappetrykk.",
      },
      {
        label: "Switch",
        help: "Lag regler for action = CLOSE_GARAGE eller IGNORE_GARAGE.",
      },
      {
        label: "Action",
        help: "Utfør handling, f.eks. lukk port eller logg valget.",
      },
    ],
    code: `// Function node: payload til notify
msg.payload = {
  message: "Garasjen har stått åpen i 30 minutter. Vil du lukke den?",
  title: "Garasjevarsel",
  data: {
    actions: [
      {
        action: "CLOSE_GARAGE",
        title: "Ja, lukk den",
        destructive: true
      },
      {
        action: "IGNORE_GARAGE",
        title: "Nei, la den stå"
      }
    ]
  }
};
return msg;`,
    nextNodes: [
      "Action node: notify.mobile_app_<telefon>",
      "Events: all (event type: mobile_app_notification_action)",
      "Switch node på msg.payload.action",
    ],
    fields: [
      {
        name: "Action node → Service",
        value: "notify.mobile_app_<telefon>",
      },
      {
        name: "Action node → Data type",
        value: "JSONata (Expression)",
      },
      {
        name: "Action node → Data",
        value: "payload",
      },
      {
        name: "Events: all → Event type",
        value: "mobile_app_notification_action",
      },
    ],
    troubleshoot: [
      {
        title: "Feilen: value should be a string for dictionary value @ data['message']",
        detail:
          "Dette skjer når message er et objekt. message må være en ren streng. Legg alle ekstra felter under data, slik koden viser.",
      },
      {
        title: "Ingen knappetrykk fanges opp",
        detail:
          "Sjekk at Events: all filtrerer på mobile_app_notification_action, og at mobilen har siste versjon av Home Assistant-appen.",
      },
    ],
  },
  {
    id: "debounce",
    title: "Støyfri sensor (debounce + tidsvindu)",
    category: "Sensor",
    summary: "Stabiliser sensorer med flapping ved å vente X sekunder før du reagerer.",
    flow: [
      {
        label: "Events: state",
        help: "Velg sensoren som flapper, f.eks. dør eller bevegelse.",
      },
      {
        label: "Trigger",
        help: "Sett forsinkelse og huk av for reset ved endring (debounce).",
      },
      {
        label: "Function",
        help: "Rens msg.payload og legg på metadata før neste steg.",
      },
      {
        label: "Action",
        help: "Send varsel, logg eller oppdater dashboard etter behov.",
      },
    ],
    code: `// Function node: lag en ren payload
type = msg.payload;
msg.payload = {
  sensor: msg.entity_id,
  state: type,
  changed_at: msg.data?.new_state?.last_changed
};
return msg;`,
    nextNodes: ["Action node (call service) eller Notification"],
    fields: [
      {
        name: "Trigger node → Send",
        value: "Etter 30s (eksempel)",
      },
      {
        name: "Trigger node → Extend delay if new message arrives",
        value: "På (for debounce)",
      },
    ],
    troubleshoot: [
      {
        title: "Trigger går alltid",
        detail: "Sjekk at Trigger node er konfigurert til å resettes på nye meldinger.",
      },
    ],
  },
  {
    id: "device-status-card",
    title: "Enkel statusmelding til dashboard",
    category: "Dashboard",
    summary: "Oppdater en tekst-widget i Node-RED Dashboard eller Home Assistant.",
    flow: [
      {
        label: "Events / Inject",
        help: "Start med Events: state eller en Inject for å trigge oppdatering.",
      },
      {
        label: "Function",
        help: "Lag en lesbar statusstreng i msg.payload.",
      },
      {
        label: "UI / Action",
        help: "Send til UI Text i Dashboard eller input_text.set_value i HA.",
      },
    ],
    code: `// Function node: bygg status-tekst
const state = msg.payload;
msg.payload = ` + "`Sensoren er nå: ${state}`" + `;
return msg;`,
    nextNodes: [
      "UI Text node (dashboard)",
      "Action node: input_text.set_value (Home Assistant)",
    ],
    fields: [
      {
        name: "Action node → Service",
        value: "input_text.set_value",
      },
      {
        name: "Action node → Entity",
        value: "input_text.status_panel",
      },
      {
        name: "Action node → Data",
        value: "{ \"value\": \"{{payload}}\" }",
      },
    ],
    troubleshoot: [
      {
        title: "UI Text viser ingenting",
        detail:
          "Sjekk at UI Text node er koblet til riktig dashboard-tab og at msg.payload er en streng.",
      },
    ],
  },
  {
    id: "sun-automation",
    title: "Automatisering basert på soloppgang/solnedgang",
    category: "Tidsstyring",
    summary: "Tenn lys 30 minutter før solnedgang og slå av etter midnatt.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på sun.sun for å trigge ved endring.",
      },
      {
        label: "Function",
        help: "Legg inn offset og target før du sender videre.",
      },
      {
        label: "Switch",
        help: "Del opp i før/etter midnatt med regler på tidspunkt.",
      },
      {
        label: "Action",
        help: "Utfør light.turn_on eller light.turn_off basert på regelen.",
      },
    ],
    code: `// Function node: offset ved solnedgang
const sunState = msg.data?.new_state?.state;
if (sunState !== "below_horizon") {
  return null;
}
msg.payload = {
  offset: "-00:30:00",
  target: "light.stue"
};
return msg;`,
    nextNodes: [
      "Switch node: sjekk klokkeslett",
      "Action node: light.turn_on",
    ],
    fields: [
      {
        name: "Events: state → Entity",
        value: "sun.sun",
      },
      {
        name: "Action node → Target",
        value: "light.stue",
      },
    ],
    troubleshoot: [
      {
        title: "Ingen trigger ved solnedgang",
        detail: "Sjekk at sun-integrasjonen er aktiv i Home Assistant.",
      },
    ],
  },
];

const state = {
  search: "",
  category: "",
};

const searchInput = document.getElementById("search");
const categorySelect = document.getElementById("category");
const grid = document.getElementById("recipeGrid");
const detail = document.getElementById("detail");
const closeDetail = document.getElementById("closeDetail");

const detailTitle = document.getElementById("detailTitle");
const detailCategory = document.getElementById("detailCategory");
const detailSummary = document.getElementById("detailSummary");
const detailFlow = document.getElementById("detailFlow");
const detailFlowHelp = document.getElementById("detailFlowHelp");
const detailCode = document.getElementById("detailCode");
const detailNext = document.getElementById("detailNext");
const detailFields = document.getElementById("detailFields");
const detailTroubleshoot = document.getElementById("detailTroubleshoot");
let activeFlow = [];
let activeRecipe = null;

function renderCategories() {
  const categories = [...new Set(recipes.map((recipe) => recipe.category))];
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

function matchRecipe(recipe) {
  const text = `${recipe.title} ${recipe.summary}`.toLowerCase();
  const matchesSearch = !state.search || text.includes(state.search);
  const matchesCategory = !state.category || recipe.category === state.category;
  return matchesSearch && matchesCategory;
}

function renderGrid() {
  grid.innerHTML = "";
  const filtered = recipes.filter(matchRecipe);
  filtered.forEach((recipe) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <span class="badge">${recipe.category}</span>
      <div>
        <h3>${recipe.title}</h3>
        <p>${recipe.summary}</p>
      </div>
      <button data-recipe="${recipe.id}">Se oppskrift</button>
    `;
    grid.appendChild(card);
  });

  if (filtered.length === 0) {
    grid.innerHTML = "<p>Ingen oppskrifter som matcher søket.</p>";
  }
}

function renderList(list, container, wrapper) {
  container.innerHTML = "";
  list.forEach((item) => {
    const el = document.createElement(wrapper);
    el.textContent = item;
    container.appendChild(el);
  });
}

function renderFlowDiagram(flow) {
  activeFlow = flow;
  detailFlow.innerHTML = "";

  flow.forEach((step, index) => {
    const node = document.createElement("button");
    node.type = "button";
    node.className = "flow-node";
    node.dataset.flowIndex = index;
    node.textContent = step.label;
    node.setAttribute("role", "listitem");
    detailFlow.appendChild(node);

    if (index < flow.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "flow-arrow";
      arrow.textContent = "→";
      detailFlow.appendChild(arrow);
    }
  });
}

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function showFlowHelp(index) {
  const step = activeFlow[index];
  if (!step) return;

  const showFunctionSnippet = step.label.toLowerCase().includes("function") && activeRecipe?.code;
  const functionSnippet = showFunctionSnippet
    ? `
      <div class="code-block">
        <button class="copy" data-copy-text="${escapeAttribute(activeRecipe.code)}">Kopier</button>
        <pre><code>${escapeHtml(activeRecipe.code)}</code></pre>
      </div>
    `
    : "";

  detailFlowHelp.innerHTML = `
    <p class="flow-help-title">${step.label}</p>
    <p>${step.help}</p>
    ${functionSnippet}
  `;

  [...detailFlow.querySelectorAll(".flow-node")].forEach((node) => {
    node.classList.toggle("active", Number(node.dataset.flowIndex) === index);
  });
}

function renderFields(fields) {
  detailFields.innerHTML = "";
  fields.forEach((field) => {
    const block = document.createElement("div");
    block.className = "field-block";
    block.innerHTML = `
      <p><strong>${field.name}</strong></p>
      <div class="code-block">
        <button class="copy" data-copy-text="${escapeAttribute(field.value)}">Kopier</button>
        <pre><code>${escapeHtml(field.value)}</code></pre>
      </div>
    `;
    detailFields.appendChild(block);
  });
}

function renderTroubleshoot(items) {
  detailTroubleshoot.innerHTML = "";
  items.forEach((item) => {
    const block = document.createElement("div");
    block.className = "trouble-block";
    block.innerHTML = `
      <p><strong>${item.title}</strong></p>
      <p>${item.detail}</p>
    `;
    detailTroubleshoot.appendChild(block);
  });
}

function showDetail(recipeId) {
  const recipe = recipes.find((item) => item.id === recipeId);
  if (!recipe) return;

  activeRecipe = recipe;
  detailTitle.textContent = recipe.title;
  detailCategory.textContent = recipe.category;
  detailSummary.textContent = recipe.summary;
  detailCode.textContent = recipe.code;
  renderFlowDiagram(recipe.flow);
  showFlowHelp(0);
  renderList(recipe.nextNodes, detailNext, "li");
  renderFields(recipe.fields);
  renderTroubleshoot(recipe.troubleshoot);

  detail.hidden = false;
  detail.scrollIntoView({ behavior: "smooth" });
}

function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => {
    window.prompt("Kopier manuelt:", text);
  });
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.recipe) {
    showDetail(button.dataset.recipe);
  }

  if (button.dataset.copy === "detailCode") {
    copyText(detailCode.textContent);
  }

  if (button.dataset.copyText) {
    copyText(button.dataset.copyText);
  }

  if (button.dataset.flowIndex) {
    showFlowHelp(Number(button.dataset.flowIndex));
  }
});

closeDetail.addEventListener("click", () => {
  detail.hidden = true;
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.trim().toLowerCase();
  renderGrid();
});

categorySelect.addEventListener("change", (event) => {
  state.category = event.target.value;
  renderGrid();
});

renderCategories();
renderGrid();
