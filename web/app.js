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
        help: "Trigger node: sett Send-forsinkelse og Reset-betingelse. Bruk en Events: state-node på garasjeporten, eller en Inject for testing.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Klikk Kopier for å lime inn koden i Function-noden og bygg payload med actions.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Sett service til notify.mobile_app_<telefon>. Velg Data type: JSONata (Expression) – ikke JSON – og skriv msg.payload i feltet for å sende innholdet fra Function-noden.",
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
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Utfør handling, f.eks. lukk port eller logg valget.",
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
        help: "Trigger node: sett Send-forsinkelse og Reset-betingelse. Sett forsinkelse og huk av for reset ved endring (debounce).",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Rens msg.payload og legg på metadata før neste steg.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send varsel, logg eller oppdater dashboard etter behov.",
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
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Lag en lesbar statusstreng i msg.payload.",
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
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Legg inn offset og target før du sender videre.",
      },
      {
        label: "Switch",
        help: "Del opp i før/etter midnatt med regler på tidspunkt.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Utfør light.turn_on eller light.turn_off basert på regelen.",
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
  {
    id: "door-left-open",
    title: "Dør stått åpen for lenge",
    category: "Sikkerhet",
    summary: "Varsle hvis ytterdør eller garasje har stått åpen i mer enn X minutter.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på dør- eller port-sensor som går til open.",
      },
      {
        label: "Delay",
        help: "Vent i X minutter før meldingen sendes videre.",
      },
      {
        label: "Current state",
        help: "Sjekk at døren fortsatt står open før du varsler.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send varsel til mobil eller høyttaler med tittel og tekst.",
      },
    ],
    code: `// Ingen Function node nødvendig for denne flowen.`,
    nextNodes: [
      "Action node: notify.mobile_app_<telefon>",
      "Optional: notify.alexa_media eller tts.google_translate_say",
    ],
    fields: [
      {
        name: "Delay node → Pause",
        value: "10 minutter",
      },
      {
        name: "Current state → Entity",
        value: "binary_sensor.<dør_sensor>",
      },
      {
        name: "Current state → If state is",
        value: "on (eller open)",
      },
      {
        name: "Action node → Service",
        value: "notify.mobile_app_<telefon>",
      },
      {
        name: "Action node → Data",
        value: "{ \"title\": \"Dør står åpen\", \"message\": \"<navn> har stått åpen i 10 minutter.\" }",
      },
    ],
    troubleshoot: [
      {
        title: "Varsel sendes selv om døren lukkes",
        detail: "Sjekk at Current state sjekker riktig sensor og at tilstanden er open/on når den står åpen.",
      },
    ],
  },
  {
    id: "night-motion-alert",
    title: "Nattmodus: bevegelse gir alarm",
    category: "Sikkerhet",
    summary: "Send varsel og blink lys hvis det registreres bevegelse om natten.",
    flow: [
      {
        label: "Events: state",
        help: "Bevegelsessensor som går til on.",
      },
      {
        label: "Time range",
        help: "Filtrer kun mellom 23:00 og 06:00.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg payload til varsel og lys-blink.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send push-varsel og slå på lys i kort tid.",
      },
    ],
    code: `// Function node: nattvarsel
msg.payload = {
  title: "Bevegelse oppdaget",
  message: "Bevegelse registrert i " + (msg.data?.new_state?.attributes?.friendly_name || "ukjent rom"),
  data: { tag: "night-motion", priority: "high" }
};
msg.blink = { entity_id: "light.gang", flash: "short" };
return msg;`,
    nextNodes: [
      "Action node: notify.mobile_app_<telefon>",
      "Action node: light.turn_on (flash)",
    ],
    fields: [
      {
        name: "Time range → From",
        value: "23:00",
      },
      {
        name: "Time range → To",
        value: "06:00",
      },
    ],
    troubleshoot: [
      {
        title: "Blink fungerer ikke",
        detail: "Sjekk at lyset støtter flash, ellers bruk en kort delay + off.",
      },
    ],
  },
  {
    id: "alarm-disarm-reminder",
    title: "Husk å deaktivere alarm ved ankomst",
    category: "Sikkerhet",
    summary: "Når noen kommer hjem og alarmen er på, send en påminnelse.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på person.<navn> eller device_tracker.",
      },
      {
        label: "Current state",
        help: "Sjekk om alarm_control_panel er armed.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Lag varseltekst med knapp for å deaktivere.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send actionable push.",
      },
    ],
    code: `// Function node: actionable reminder
msg.payload = {
  title: "Alarmen er aktiv",
  message: "Vil du deaktivere alarmen?",
  data: {
    actions: [
      { action: "DISARM_ALARM", title: "Deaktiver" },
      { action: "IGNORE", title: "Ignorer" }
    ]
  }
};
return msg;`,
    nextNodes: [
      "Events: all (mobile_app_notification_action)",
      "Switch on msg.payload.action",
      "Action node: alarm_control_panel.alarm_disarm",
    ],
    fields: [
      {
        name: "Current state → Entity",
        value: "alarm_control_panel.hjem",
      },
      {
        name: "Action node → Service",
        value: "notify.mobile_app_<telefon>",
      },
    ],
    troubleshoot: [
      {
        title: "Knappetrykk fanges ikke",
        detail: "Sjekk event type mobile_app_notification_action i Events: all.",
      },
    ],
  },
  {
    id: "doorbell-snapshot",
    title: "Ringeklokke + kamerabilde til mobil",
    category: "Sikkerhet",
    summary: "Når noen ringer på, ta snapshot og send varsel med bilde.",
    flow: [
      {
        label: "Events: state",
        help: "Ringeklokke-sensor eller binary_sensor for ring.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Kjør camera.snapshot og lagre fil i /config/www.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg notify med bilde-URL.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send push med bilde.",
      },
    ],
    code: `// Function node: varsel med bilde
const imagePath = "/local/snapshots/doorbell.jpg";
msg.payload = {
  title: "Noen ringer på",
  message: "Trykk for å åpne live.",
  data: { image: imagePath, tag: "doorbell" }
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "camera.snapshot → filename",
        value: "/config/www/snapshots/doorbell.jpg",
      },
    ],
    troubleshoot: [
      {
        title: "Bildet vises ikke",
        detail: "Sjekk at filen ligger i /config/www og at URL er /local/...",
      },
    ],
  },
  {
    id: "flood-alert",
    title: "Vannlekkasje: steng vann + varsle",
    category: "Sikkerhet",
    summary: "Når lekkasjesensor trigger, steng vannventil og send varsel.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på binary_sensor.leak.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Merk alarmnivå og lokasjon.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Steng vannventil og send varsel.",
      },
    ],
    code: `// Function node: lekkasjealarm
const location = msg.data?.new_state?.attributes?.friendly_name || "ukjent område";
msg.payload = {
  title: "Vannlekkasje oppdaget",
  message: "Lekkasjesensor i " + location,
  data: { priority: "high" }
};
return msg;`,
    nextNodes: [
      "Action node: valve.close_valve",
      "Action node: notify.mobile_app_<telefon>",
    ],
    fields: [
      {
        name: "Action node → Service",
        value: "valve.close_valve",
      },
      {
        name: "Action node → Target",
        value: "valve.hovedkran",
      },
    ],
    troubleshoot: [
      {
        title: "Ventil reagerer ikke",
        detail: "Sjekk at ventilen støtter close_valve og at entity_id er riktig.",
      },
    ],
  },
  {
    id: "smoke-alert",
    title: "Røykvarsler: massiv varsling",
    category: "Sikkerhet",
    summary: "Når røykvarsler går av, send push, tts og aktiver sirene.",
    flow: [
      {
        label: "Events: state",
        help: "Bruk smoke sensor (on) som trigger.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg alarmtekst og legg på TTS.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send varsler, slå på sirene og lys.",
      },
    ],
    code: `// Function node: røykalarm
msg.payload = {
  title: "Røyk oppdaget",
  message: "Røykvarsler utløst! Evakuer nå.",
  data: { tag: "smoke", priority: "high" }
};
msg.tts = "Røyk oppdaget. Evakuer nå.";
return msg;`,
    nextNodes: [
      "Action node: notify.mobile_app_<telefon>",
      "Action node: tts.cloud_say",
      "Action node: siren.turn_on",
    ],
    fields: [
      {
        name: "Action node → Service (sirene)",
        value: "siren.turn_on",
      },
      {
        name: "Action node → Service (tts)",
        value: "tts.cloud_say",
      },
    ],
    troubleshoot: [
      {
        title: "TTS spilles ikke",
        detail: "Sjekk at media_player er online og at TTS er konfigurert.",
      },
    ],
  },
  {
    id: "away-light-random",
    title: "Borte-modus: tilfeldig lysstyring",
    category: "Lysstyring",
    summary: "Når huset er tomt, simuler tilstedeværelse med tilfeldig lys.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på input_boolean.away_mode.",
      },
      {
        label: "Inject",
        help: "Kjør hvert 30. minutt for å trigge tilfeldig valg.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Velg tilfeldig lys og av/på.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Slå valgt lys av/på.",
      },
    ],
    code: `// Function node: tilfeldig lys
const lights = ["light.stue", "light.kjokken", "light.gang"];
const pick = lights[Math.floor(Math.random() * lights.length)];
msg.payload = {
  target: { entity_id: pick },
  data: { brightness_pct: 60 }
};
msg.toggle = Math.random() > 0.4;
return msg;`,
    nextNodes: [
      "Switch node: msg.toggle true/false",
      "Action node: light.turn_on / light.turn_off",
    ],
    fields: [
      {
        name: "Inject → Interval",
        value: "Hvert 30. minutt",
      },
      {
        name: "Events: state → Entity",
        value: "input_boolean.away_mode",
      },
    ],
    troubleshoot: [
      {
        title: "Lys slås på når du er hjemme",
        detail: "Sjekk at away_mode faktisk er on og at Inject er koblet via en gate.",
      },
    ],
  },
  {
    id: "lux-based-lighting",
    title: "Lys etter lux-nivå",
    category: "Lysstyring",
    summary: "Tenn lys når lux faller under terskel og noen er hjemme.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på sensor.lux og person status.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sjekk terskel og sett brightness.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. light.turn_on når det er mørkt nok.",
      },
    ],
    code: `// Function node: lux-sjekk
const lux = Number(msg.payload);
if (Number.isNaN(lux) || lux > 120) return null;
msg.payload = {
  brightness_pct: 70,
  kelvin: 3000
};
return msg;`,
    nextNodes: ["Action node: light.turn_on"],
    fields: [
      {
        name: "Events: state → Entity",
        value: "sensor.stue_lux",
      },
      {
        name: "Lux terskel",
        value: "120 (eksempel)",
      },
    ],
    troubleshoot: [
      {
        title: "Lyset tennes i dagslys",
        detail: "Juster terskel eller sjekk at lux-sensoren rapporterer korrekt.",
      },
    ],
  },
  {
    id: "adaptive-brightness",
    title: "Adaptiv lysstyrke per tid",
    category: "Lysstyring",
    summary: "Demp lys på kveld, sterkere på dagtid.",
    flow: [
      {
        label: "Time range",
        help: "Lag regler for morgen, dag, kveld og natt.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sett brightness basert på tid.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. light.turn_on med riktig brightness.",
      },
    ],
    code: `// Function node: velg lysnivå
const hour = new Date().getHours();
let brightness = 30;
if (hour >= 7 && hour < 17) brightness = 80;
if (hour >= 17 && hour < 22) brightness = 60;
msg.payload = { brightness_pct: brightness };
return msg;`,
    nextNodes: ["Action node: light.turn_on"],
    fields: [
      {
        name: "Time range → Sett regler",
        value: "07-17, 17-22, 22-07",
      },
    ],
    troubleshoot: [
      {
        title: "Lyset blir alltid lavt",
        detail: "Sjekk at Function-noden får korrekt tid (server-tid).",
      },
    ],
  },
  {
    id: "wake-up-light",
    title: "Morgenlys med gradvis opptrapping",
    category: "Lysstyring",
    summary: "Øk lysstyrken gradvis 20 minutter før vekking.",
    flow: [
      {
        label: "Inject",
        help: "Start 20 min før ønsket tidspunkt.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg sequence for brightness over tid.",
      },
      {
        label: "Delay",
        help: "Send lysstyrke i steg (repeat).",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. light.turn_on med nye brightness.",
      },
    ],
    code: `// Function node: lag stegvis lysstyrke
const steps = [10, 20, 35, 50, 70, 90];
msg.payload = steps.map((value) => ({
  payload: { brightness_pct: value }
}));
return msg;`,
    nextNodes: [
      "Split node (array)",
      "Delay node: 2 min per steg",
      "Action node: light.turn_on",
    ],
    fields: [
      {
        name: "Delay → Rate",
        value: "1 msg per 2 min",
      },
      {
        name: "Action node → Target",
        value: "light.soverom",
      },
    ],
    troubleshoot: [
      {
        title: "Lyset hopper rett til maks",
        detail: "Sjekk at Split + Delay er koblet før Action.",
      },
    ],
  },
  {
    id: "motion-light-timeout",
    title: "Bevegelse → lys med tidsavslag",
    category: "Lysstyring",
    summary: "Tenn lys ved bevegelse og slå av etter X minutter uten bevegelse.",
    flow: [
      {
        label: "Events: state",
        help: "Motion sensor on/off.",
      },
      {
        label: "Switch",
        help: "Del opp on/off.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Slå på lyset når on.",
      },
      {
        label: "Trigger",
        help: "Trigger node: sett Send-forsinkelse og Reset-betingelse. Når off, vent X minutter før du slår av.",
      },
    ],
    code: `// Function node: valgfri nattdimming
msg.payload = { brightness_pct: 50 };
return msg;`,
    nextNodes: [
      "Action node: light.turn_on",
      "Trigger node: send off etter 5 min",
      "Action node: light.turn_off",
    ],
    fields: [
      {
        name: "Trigger node → Send",
        value: "Etter 5 minutter",
      },
    ],
    troubleshoot: [
      {
        title: "Lyset slås av selv om det er bevegelse",
        detail: "Sjekk at Trigger resettes når bevegelse går til on.",
      },
    ],
  },
  {
    id: "manual-override",
    title: "Manuell overstyring av automasjon",
    category: "Lysstyring",
    summary: "Sett en flagg-boolean når lys slås manuelt, og hopp over automasjon.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på light.entity som blir togglet.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sett input_boolean.manual_override i 30 minutter.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Slå på boolean og start timer.",
      },
    ],
    code: `// Function node: opprett manuelt flagg
msg.payload = {
  entity_id: "input_boolean.manual_override",
  state: "on"
};
return msg;`,
    nextNodes: [
      "Action node: input_boolean.turn_on",
      "Trigger node: send off etter 30 min",
      "Action node: input_boolean.turn_off",
    ],
    fields: [
      {
        name: "Action node → Service",
        value: "input_boolean.turn_on",
      },
      {
        name: "Trigger node → Send",
        value: "Etter 30 minutter",
      },
    ],
    troubleshoot: [
      {
        title: "Automatiseringen ignorerer ikke override",
        detail: "Legg inn en Current state-sjekk på input_boolean.manual_override.",
      },
    ],
  },
  {
    id: "security-light-flash",
    title: "Sikkerhetsblink av utelys",
    category: "Sikkerhet",
    summary: "Blink utelys når bevegelse oppdages i hagen om natten.",
    flow: [
      {
        label: "Events: state",
        help: "Bevegelsessensor ute.",
      },
      {
        label: "Time range",
        help: "Kun etter solnedgang.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sett flash og lysnivå.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. light.turn_on med flash.",
      },
    ],
    code: `// Function node: flash utelys
msg.payload = {
  entity_id: "light.ute",
  flash: "short",
  brightness_pct: 100
};
return msg;`,
    nextNodes: ["Action node: light.turn_on"],
    fields: [
      {
        name: "Time range → Start",
        value: "sunset",
      },
      {
        name: "Time range → Slutt",
        value: "sunrise",
      },
    ],
    troubleshoot: [
      {
        title: "Flash støttes ikke",
        detail: "Bytt til et blink via delay + off om lyset ikke støtter flash.",
      },
    ],
  },
  {
    id: "panic-button",
    title: "Panikknapp: alt lys på + varsling",
    category: "Sikkerhet",
    summary: "En fysisk knapp eller dashboard-knapp som setter huset i alarmmodus.",
    flow: [
      {
        label: "Events: state",
        help: "Knapp, input_button eller MQTT trigger.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sett payload for lys, sirene og varsling.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Slå på alle lys og send varsel.",
      },
    ],
    code: `// Function node: panikkmodus
msg.payload = {
  title: "Panikknapp aktivert",
  message: "Alarmmodus aktivert manuelt.",
  data: { priority: "high" }
};
msg.lights = { entity_id: "light.all_lights", brightness_pct: 100 };
return msg;`,
    nextNodes: [
      "Action node: light.turn_on",
      "Action node: notify.mobile_app_<telefon>",
      "Optional: siren.turn_on",
    ],
    fields: [
      {
        name: "Action node → Target",
        value: "light.all_lights",
      },
    ],
    troubleshoot: [
      {
        title: "Ikke alle lys reagerer",
        detail: "Sjekk at light.all_lights er en gyldig gruppe i Home Assistant.",
      },
    ],
  },
  {
    id: "garage-auto-close",
    title: "Garasjeport auto-lukk etter X minutter",
    category: "Sikkerhet",
    summary: "Lukk garasjeporten automatisk hvis den står åpen for lenge.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på garasjeport som går til open.",
      },
      {
        label: "Trigger",
        help: "Trigger node: sett Send-forsinkelse og Reset-betingelse. Send videre etter X minutter, reset ved lukking.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Lukk port og send varsel.",
      },
    ],
    code: `// Function node: logg auto-lukk
msg.payload = {
  title: "Garasjeport auto-lukk",
  message: "Porten ble lukket automatisk.",
  data: { tag: "garage-auto-close" }
};
return msg;`,
    nextNodes: [
      "Action node: cover.close_cover",
      "Action node: notify.mobile_app_<telefon>",
    ],
    fields: [
      {
        name: "Trigger node → Send",
        value: "Etter 15 minutter",
      },
      {
        name: "Action node → Service",
        value: "cover.close_cover",
      },
    ],
    troubleshoot: [
      {
        title: "Porten lukkes ikke",
        detail: "Sjekk at cover-entity støtter close_cover og at sensor rapporterer korrekt.",
      },
    ],
  },
  {
    id: "lock-when-away",
    title: "Lås dør automatisk når alle drar",
    category: "Sikkerhet",
    summary: "Når alle er borte, lås dører og slå av lys.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på group.family eller person-entiteter.",
      },
      {
        label: "Current state",
        help: "Sjekk om status = not_home.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg payload for lås og lys.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. lock.lock og light.turn_off.",
      },
    ],
    code: `// Function node: lås og slukk
msg.payload = { entity_id: "lock.ytterdor" };
msg.lights = { entity_id: "light.all_lights" };
return msg;`,
    nextNodes: [
      "Action node: lock.lock",
      "Action node: light.turn_off",
    ],
    fields: [
      {
        name: "Current state → Entity",
        value: "group.family",
      },
      {
        name: "Current state → State",
        value: "not_home",
      },
    ],
    troubleshoot: [
      {
        title: "Døren låses ikke",
        detail: "Sjekk at lock-entity er korrekt og ikke allerede i låst tilstand.",
      },
    ],
  },
  {
    id: "arrival-welcome",
    title: "Velkomstlys ved ankomst",
    category: "Lysstyring",
    summary: "Når noen kommer hjem etter mørkets frembrudd, tenn velkomstlys.",
    flow: [
      {
        label: "Events: state",
        help: "person.<navn> går til home.",
      },
      {
        label: "Time range",
        help: "Kun etter solnedgang eller mellom 17-06.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sett lysnivå og varme.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. light.turn_on på utelys og gang.",
      },
    ],
    code: `// Function node: velkomstlys
msg.payload = {
  brightness_pct: 65,
  kelvin: 2700
};
return msg;`,
    nextNodes: ["Action node: light.turn_on"],
    fields: [
      {
        name: "Action node → Target",
        value: "light.gang, light.ute",
      },
    ],
    troubleshoot: [
      {
        title: "Lyset tennes når det er lyst",
        detail: "Juster tidsfilter eller legg inn lux-sjekk.",
      },
    ],
  },
  {
    id: "camera-mode-auto",
    title: "Kamera-modus basert på hjemme/borte",
    category: "Sikkerhet",
    summary: "Skru på persondeteksjon når alle er borte, av når noen er hjemme.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på group.family.",
      },
      {
        label: "Switch",
        help: "Velg home/not_home.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Slå av/på kamera-automatisering.",
      },
    ],
    code: `// Function node: velg kamera-modus
msg.payload = { entity_id: "switch.camera_person_detection" };
return msg;`,
    nextNodes: [
      "Action node: switch.turn_on",
      "Action node: switch.turn_off",
    ],
    fields: [
      {
        name: "Events: state → Entity",
        value: "group.family",
      },
    ],
    troubleshoot: [
      {
        title: "Kamera-switch reagerer ikke",
        detail: "Sjekk at switch-entity eksisterer og at du har riktige rettigheter.",
      },
    ],
  },
  {
    id: "mailbox-alert",
    title: "Postkasse-varsel",
    category: "Varsling",
    summary: "Send varsel når postkassen åpnes eller vibrasjon registreres.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på sensor/postkasse.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg varseltekst og logg tid.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send push-varsel.",
      },
    ],
    code: `// Function node: postkassevarsel
msg.payload = {
  title: "Post i kassen",
  message: "Postkassen ble åpnet.",
  data: { tag: "mailbox" }
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "Events: state → Entity",
        value: "binary_sensor.postkasse",
      },
    ],
    troubleshoot: [
      {
        title: "For mange varsler",
        detail: "Legg inn en debounce/trigger for å begrense antallet.",
      },
    ],
  },
  {
    id: "package-drop",
    title: "Pakkelevering: varsle ved bevegelse ved dør",
    category: "Varsling",
    summary: "Koble dørkamera og bevegelse til et nyttig leveringsvarsel.",
    flow: [
      {
        label: "Events: state",
        help: "Bevegelse ved inngangsdør.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Lag varsel med lenke til kamera.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send push med live-lenke.",
      },
    ],
    code: `// Function node: pakkevarsel
msg.payload = {
  title: "Mulig pakkelevering",
  message: "Bevegelse ved inngangsdør. Sjekk kamera.",
  data: { url: "/lovelace/door" }
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "Action node → Data",
        value: "payload (JSONata)",
      },
    ],
    troubleshoot: [
      {
        title: "Lenke åpnes ikke",
        detail: "Sjekk at du bruker en gyldig URL i data.url.",
      },
    ],
  },
  {
    id: "window-open-hvac",
    title: "Vindusdeteksjon stopper varme",
    category: "Klima",
    summary: "Slå av varme når et vindu åpnes, slå på igjen når det lukkes.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på vindus-sensor.",
      },
      {
        label: "Switch",
        help: "Velg open/closed.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. climate.set_hvac_mode eller switch.",
      },
    ],
    code: `// Function node: sett hvac
msg.payload = { hvac_mode: "off" };
return msg;`,
    nextNodes: [
      "Action node: climate.set_hvac_mode (off)",
      "Action node: climate.set_hvac_mode (heat)",
    ],
    fields: [
      {
        name: "Events: state → Entity",
        value: "binary_sensor.vindu_stue",
      },
    ],
    troubleshoot: [
      {
        title: "HVAC endrer ikke modus",
        detail: "Sjekk at klimaanlegget støtter hvac_mode.",
      },
    ],
  },
  {
    id: "energy-peak-avoid",
    title: "Unngå effekttopper",
    category: "Energi",
    summary: "Skru av store laster når forbruket er høyt.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på sensor for effekt (W).",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sjekk terskel og bygg mål.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Slå av valgte laster.",
      },
    ],
    code: `// Function node: kutt forbruk
const watts = Number(msg.payload);
if (Number.isNaN(watts) || watts < 6000) return null;
msg.payload = { entity_id: "switch.varmtvann" };
return msg;`,
    nextNodes: ["Action node: switch.turn_off"],
    fields: [
      {
        name: "Terskel",
        value: "6000 W (eksempel)",
      },
    ],
    troubleshoot: [
      {
        title: "Trigger går aldri",
        detail: "Sjekk at sensor rapporterer i W og ikke kW.",
      },
    ],
  },
  {
    id: "battery-low-digest",
    title: "Lavt batteri: daglig oppsummering",
    category: "Vedlikehold",
    summary: "Samle alle lavt batteri-sensorer og send daglig rapport.",
    flow: [
      {
        label: "Inject",
        help: "Kjør daglig kl 08:00.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Filtrer entiteter og lag rapporttekst.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send varsel med liste over batterier.",
      },
    ],
    code: `// Function node: bygg batterirapport
const entities = msg.battery_entities || [];
const low = entities.filter((item) => item.state < 25);
if (low.length === 0) return null;
msg.payload = {
  title: "Lavt batteri",
  message: low.map((item) => item.name + " (" + item.state + "%)").join(", ")
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "Inject → Time",
        value: "08:00",
      },
      {
        name: "Function → Entities input",
        value: "Use a get-entities node (node-red-contrib-home-assistant)",
      },
    ],
    troubleshoot: [
      {
        title: "Ingen entiteter i listen",
        detail: "Sjekk at get-entities returnerer battery-sensorer.",
      },
    ],
  },
  {
    id: "presence-lights-off",
    title: "Ingen hjemme: slå av glemte lys",
    category: "Energi",
    summary: "Når alle drar, slukk alle lys og send en loggmelding.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på group.family.",
      },
      {
        label: "Current state",
        help: "Sjekk at status = not_home.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg payload for avslag.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. light.turn_off alle lys.",
      },
    ],
    code: `// Function node: slå av lys
msg.payload = { entity_id: "light.all_lights" };
return msg;`,
    nextNodes: ["Action node: light.turn_off"],
    fields: [
      {
        name: "Action node → Target",
        value: "light.all_lights",
      },
    ],
    troubleshoot: [
      {
        title: "Lys blir ikke slukket",
        detail: "Sjekk at group/all-lights finnes og at entity_id stemmer.",
      },
    ],
  },
  {
    id: "quiet-hours-notify",
    title: "Rolige timer: demp varsler",
    category: "Varsling",
    summary: "Bruk notification-channel eller priority for å dempe varsler om natten.",
    flow: [
      {
        label: "Events: state",
        help: "Any trigger du vil varsle på.",
      },
      {
        label: "Time range",
        help: "Nattvindu for demping.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sett priority eller channel basert på tid.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send varsel med dempet kanal.",
      },
    ],
    code: `// Function node: demp varsler
const hour = new Date().getHours();
const quiet = hour >= 22 || hour < 7;
msg.payload = {
  title: "Varsel",
  message: "Hendelse registrert.",
  data: { importance: quiet ? "low" : "high", channel: quiet ? "quiet" : "default" }
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "Time range → From",
        value: "22:00",
      },
      {
        name: "Time range → To",
        value: "07:00",
      },
    ],
    troubleshoot: [
      {
        title: "Demping fungerer ikke",
        detail: "Sjekk at mobilappen har notification channel satt opp.",
      },
    ],
  },
  {
    id: "humidity-fan",
    title: "Bad: vifte på ved høy luftfuktighet",
    category: "Klima",
    summary: "Slå på vifte når fuktighet øker kraftig, slå av når normal.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på humidity-sensor.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sjekk terskel og delta.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. switch.turn_on/off på baderomsvifte.",
      },
    ],
    code: `// Function node: fuktighetsstyring
const humidity = Number(msg.payload);
if (Number.isNaN(humidity)) return null;
msg.payload = { entity_id: "switch.badvifte", state: humidity > 65 ? "on" : "off" };
return msg;`,
    nextNodes: [
      "Switch node på msg.payload.state",
      "Action node: switch.turn_on",
      "Action node: switch.turn_off",
    ],
    fields: [
      {
        name: "Humidity terskel",
        value: "65% (eksempel)",
      },
    ],
    troubleshoot: [
      {
        title: "Viften blafrer",
        detail: "Legg inn hystereseter eller debounce på sensor.",
      },
    ],
  },
  {
    id: "air-quality-alert",
    title: "Luftkvalitet: varsle ved høy CO2",
    category: "Varsling",
    summary: "Send varsel når CO2-nivået blir høyt.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på sensor.co2.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sjekk ppm og bygg varsel.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send push-varsel eller TTS.",
      },
    ],
    code: `// Function node: CO2-varsel
const co2 = Number(msg.payload);
if (Number.isNaN(co2) || co2 < 1200) return null;
msg.payload = {
  title: "Høy CO2",
  message: "CO2-nivået er " + co2 + " ppm. Luft ut."
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "CO2 terskel",
        value: "1200 ppm",
      },
    ],
    troubleshoot: [
      {
        title: "For mange varsler",
        detail: "Legg inn en cooldown (delay) mellom varsler.",
      },
    ],
  },
  {
    id: "laundry-done",
    title: "Vask ferdig-varsel",
    category: "Varsling",
    summary: "Send varsel når vaskemaskinen har vært stille i X minutter.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på power-sensor til vaskemaskin.",
      },
      {
        label: "Trigger",
        help: "Trigger node: sett Send-forsinkelse og Reset-betingelse. Når effekten er lav i 5 min, send varsel.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Lag varseltekst.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send push.",
      },
    ],
    code: `// Function node: vask ferdig
msg.payload = {
  title: "Vask ferdig",
  message: "Vaskemaskinen er ferdig. Tid for å henge opp!"
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "Trigger node → Reset",
        value: "Når effekt > 5W",
      },
    ],
    troubleshoot: [
      {
        title: "Varsel kommer aldri",
        detail: "Juster terskel for lav effekt og varighet.",
      },
    ],
  },
  {
    id: "trash-reminder",
    title: "Søppeltømming påminnelse",
    category: "Vedlikehold",
    summary: "Send varsel dagen før tømming basert på kalender.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på kalender.sensor for avfall.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sjekk om det er tømming i morgen.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send påminnelse.",
      },
    ],
    code: `// Function node: søppelvarsel
const starts = msg.data?.new_state?.attributes?.start_time;
if (!starts) return null;
msg.payload = {
  title: "Søppeltømming i morgen",
  message: "Husk å sette ut dunkene."
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "Events: state → Entity",
        value: "calendar.avfall",
      },
    ],
    troubleshoot: [
      {
        title: "Feil dag",
        detail: "Sjekk tidssone og start_time-format i kalenderen.",
      },
    ],
  },
  {
    id: "window-open-notify",
    title: "Vinduer åpne ved sengetid",
    category: "Sikkerhet",
    summary: "Sjekk åpne vinduer når nattmodus aktiveres.",
    flow: [
      {
        label: "Events: state",
        help: "input_boolean.nattmodus eller bedtime trigger.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Lag liste over åpne vinduer.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send varsel hvis noen vinduer er åpne.",
      },
    ],
    code: `// Function node: finn åpne vinduer
const open = msg.open_windows || [];
if (open.length === 0) return null;
msg.payload = {
  title: "Åpne vinduer",
  message: "Følgende vinduer er åpne: " + open.join(", ")
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "Function → open_windows input",
        value: "Bruk get-entities + filter på state = open",
      },
    ],
    troubleshoot: [
      {
        title: "Listen er tom",
        detail: "Sjekk at du mapper friendly_name og state i get-entities.",
      },
    ],
  },
  {
    id: "garage-light-follow",
    title: "Garasjelys følger port",
    category: "Lysstyring",
    summary: "Slå på lys når port åpnes, slå av etter at port lukkes.",
    flow: [
      {
        label: "Events: state",
        help: "cover.garasje open/closed.",
      },
      {
        label: "Switch",
        help: "Velg open/closed.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Slå på ved open, slå av etter delay.",
      },
    ],
    code: `// Function node: garasjelys
msg.payload = { entity_id: "light.garasje", brightness_pct: 80 };
return msg;`,
    nextNodes: [
      "Action node: light.turn_on",
      "Trigger node: send off etter 10 min",
      "Action node: light.turn_off",
    ],
    fields: [
      {
        name: "Trigger node → Send",
        value: "Etter 10 minutter",
      },
    ],
    troubleshoot: [
      {
        title: "Lyset går av for tidlig",
        detail: "Øk delay eller reset trigger når port åpnes igjen.",
      },
    ],
  },
  {
    id: "door-lock-reminder",
    title: "Påminnelse: lås døren ved leggetid",
    category: "Sikkerhet",
    summary: "Hvis døren er ulåst ved nattmodus, send varsel.",
    flow: [
      {
        label: "Events: state",
        help: "Trigger på nattmodus.",
      },
      {
        label: "Current state",
        help: "Sjekk om lock.ytterdor er unlocked.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg varseltekst.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send push-varsel.",
      },
    ],
    code: `// Function node: lås-dør varsel
msg.payload = {
  title: "Dør ulåst",
  message: "Ytterdøren er ulåst. Vil du låse den?"
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "Current state → Entity",
        value: "lock.ytterdor",
      },
    ],
    troubleshoot: [
      {
        title: "Feil status",
        detail: "Sjekk state-verdier: locked/unlocked i din lock-enhet.",
      },
    ],
  },
  {
    id: "garage-ventilation",
    title: "Ventiler garasje ved høy temperatur",
    category: "Klima",
    summary: "Slå på vifte når garasjen blir varm.",
    flow: [
      {
        label: "Events: state",
        help: "Sensor for temperatur i garasjen.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sjekk terskel og sett vifte on/off.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. switch.turn_on/off.",
      },
    ],
    code: `// Function node: tempstyrt vifte
const temp = Number(msg.payload);
if (Number.isNaN(temp)) return null;
msg.payload = { entity_id: "switch.garasjefan", state: temp > 28 ? "on" : "off" };
return msg;`,
    nextNodes: [
      "Switch node på msg.payload.state",
      "Action node: switch.turn_on",
      "Action node: switch.turn_off",
    ],
    fields: [
      {
        name: "Temperatur terskel",
        value: "28°C",
      },
    ],
    troubleshoot: [
      {
        title: "Vifte står på hele tiden",
        detail: "Juster terskel eller legg inn hystereseter.",
      },
    ],
  },
  {
    id: "intrusion-siren-delay",
    title: "Innbrudd: forsinket sirene",
    category: "Sikkerhet",
    summary: "Gi 30 sekunder til å deaktivere alarm før sirene.",
    flow: [
      {
        label: "Events: state",
        help: "Sensor eller alarm som trigges.",
      },
      {
        label: "Trigger",
        help: "Trigger node: sett Send-forsinkelse og Reset-betingelse. Vent 30 sek før sirene, reset ved disarm.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg sirene payload.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Aktiver sirene.",
      },
    ],
    code: `// Function node: sirene payload
msg.payload = { entity_id: "siren.hjem", tone: "alarm" };
return msg;`,
    nextNodes: ["Action node: siren.turn_on"],
    fields: [
      {
        name: "Trigger node → Send",
        value: "Etter 30 sekunder",
      },
      {
        name: "Trigger node → Reset",
        value: "payload: \"disarmed\"",
      },
    ],
    troubleshoot: [
      {
        title: "Sirenen aktiveres med en gang",
        detail: "Sjekk at Trigger er satt til å vente før sending.",
      },
    ],
  },
  {
    id: "door-chime",
    title: "Dørklokke-lyd på høyttaler",
    category: "Varsling",
    summary: "Spill av en lyd når døren åpnes.",
    flow: [
      {
        label: "Events: state",
        help: "Kontakt-sensor på ytterdør.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg media payload.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. media_player.play_media.",
      },
    ],
    code: `// Function node: chime
msg.payload = {
  media_content_id: "/local/sounds/chime.mp3",
  media_content_type: "music"
};
return msg;`,
    nextNodes: ["Action node: media_player.play_media"],
    fields: [
      {
        name: "Action node → Target",
        value: "media_player.hoyttaler",
      },
    ],
    troubleshoot: [
      {
        title: "Ingen lyd",
        detail: "Sjekk at filen finnes i /config/www/sounds.",
      },
    ],
  },
  {
    id: "vacuum-start-away",
    title: "Start robotstøvsuger når alle drar",
    category: "Vedlikehold",
    summary: "Automatisk støvsuging når huset er tomt.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på group.family går til not_home.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Lag start-kommando.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. vacuum.start.",
      },
    ],
    code: `// Function node: start støvsuger
msg.payload = { entity_id: "vacuum.roborock" };
return msg;`,
    nextNodes: ["Action node: vacuum.start"],
    fields: [
      {
        name: "Current state → State",
        value: "not_home",
      },
    ],
    troubleshoot: [
      {
        title: "Støvsugeren starter ikke",
        detail: "Sjekk at den ikke er allerede i drift eller trenger vedlikehold.",
      },
    ],
  },
  {
    id: "party-mode-lights",
    title: "Party-modus: scene + musikk",
    category: "Scene",
    summary: "En knapp som aktiverer scene og starter musikk.",
    flow: [
      {
        label: "Events: state",
        help: "input_button.party_mode eller dashboard-knapp.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg payload for scene og musikk.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. scene.turn_on + media_player.play_media.",
      },
    ],
    code: `// Function node: party payload
msg.scene = { entity_id: "scene.party" };
msg.payload = {
  media_content_id: "spotify:playlist:party",
  media_content_type: "music"
};
return msg;`,
    nextNodes: [
      "Action node: scene.turn_on",
      "Action node: media_player.play_media",
    ],
    fields: [
      {
        name: "Action node → Target",
        value: "media_player.stue",
      },
    ],
    troubleshoot: [
      {
        title: "Musikk starter ikke",
        detail: "Sjekk at Spotify-integrasjonen er autentisert.",
      },
    ],
  },
  {
    id: "fridge-door-alert",
    title: "Kjøleskapdør åpen-varsel",
    category: "Varsling",
    summary: "Varsle hvis kjøleskapsdøren blir stående åpen.",
    flow: [
      {
        label: "Events: state",
        help: "Kontakt-sensor på kjøleskap.",
      },
      {
        label: "Trigger",
        help: "Trigger node: sett Send-forsinkelse og Reset-betingelse. Vent 3 minutter før varsel.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Lag varseltekst.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send push.",
      },
    ],
    code: `// Function node: kjøleskapsvarsel
msg.payload = {
  title: "Kjøleskapdør åpen",
  message: "Døren har stått åpen i 3 minutter."
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "Trigger node → Send",
        value: "Etter 3 minutter",
      },
    ],
    troubleshoot: [
      {
        title: "Varsel spam",
        detail: "Sjekk at Trigger resettes når døren lukkes.",
      },
    ],
  },
  {
    id: "driveway-light",
    title: "Innkjørsel: lys ved bil ankomst",
    category: "Lysstyring",
    summary: "Tenn innkjørselslys når bil kommer hjem etter mørkets frembrudd.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på device_tracker for bil.",
      },
      {
        label: "Time range",
        help: "Kun etter solnedgang.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sett lysnivå.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. light.turn_on innkjørsel.",
      },
    ],
    code: `// Function node: innkjørselslys
msg.payload = { brightness_pct: 80 };
return msg;`,
    nextNodes: ["Action node: light.turn_on"],
    fields: [
      {
        name: "Action node → Target",
        value: "light.innkjorsel",
      },
    ],
    troubleshoot: [
      {
        title: "Lyset tennes ikke",
        detail: "Sjekk at device_tracker oppdateres raskt nok.",
      },
    ],
  },
  {
    id: "sunset-scenes",
    title: "Solnedgang: aktiver kveldsscene",
    category: "Scene",
    summary: "Aktiver en scene ved solnedgang.",
    flow: [
      {
        label: "Events: state",
        help: "sun.sun går til below_horizon.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Logg og sett scene.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. scene.turn_on.",
      },
    ],
    code: `// Function node: kveldsscene
msg.payload = { entity_id: "scene.kveld" };
return msg;`,
    nextNodes: ["Action node: scene.turn_on"],
    fields: [
      {
        name: "Events: state → Entity",
        value: "sun.sun",
      },
    ],
    troubleshoot: [
      {
        title: "Scene aktiveres ikke",
        detail: "Sjekk at scenen finnes og at navnet er riktig.",
      },
    ],
  },
  {
    id: "nightlight-bathroom",
    title: "Nattlys på badet",
    category: "Lysstyring",
    summary: "Om natten tennes svakt lys ved bevegelse på badet.",
    flow: [
      {
        label: "Events: state",
        help: "Bevegelse på badet.",
      },
      {
        label: "Time range",
        help: "Nattvindu for lav lysstyrke.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sett lav brightness.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. light.turn_on.",
      },
    ],
    code: `// Function node: nattlys
msg.payload = { brightness_pct: 10, kelvin: 2200 };
return msg;`,
    nextNodes: ["Action node: light.turn_on"],
    fields: [
      {
        name: "Time range → From",
        value: "23:00",
      },
      {
        name: "Time range → To",
        value: "06:00",
      },
    ],
    troubleshoot: [
      {
        title: "Lyset blir for sterkt",
        detail: "Reduser brightness_pct i Function-noden.",
      },
    ],
  },
  {
    id: "door-open-while-away",
    title: "Varsel hvis dør åpnes mens du er borte",
    category: "Sikkerhet",
    summary: "Hvis noen åpner døren når alle er borte, send kritisk varsel.",
    flow: [
      {
        label: "Events: state",
        help: "Kontakt-sensor på ytterdør.",
      },
      {
        label: "Current state",
        help: "Sjekk at group.family er not_home.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg kritisk varsel.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send push-varsel.",
      },
    ],
    code: `// Function node: kritisk varsel
msg.payload = {
  title: "Dør åpnet!",
  message: "Ytterdøren ble åpnet mens ingen er hjemme.",
  data: { priority: "high", tag: "away-door" }
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "Current state → Entity",
        value: "group.family",
      },
      {
        name: "Current state → State",
        value: "not_home",
      },
    ],
    troubleshoot: [
      {
        title: "Varsel sendes også når du er hjemme",
        detail: "Sjekk at Current state er koblet før Function.",
      },
    ],
  },
  {
    id: "garden-watering-alert",
    title: "Varsel ved langvarig regn (stopp vanning)",
    category: "Hage",
    summary: "Avlys vanning når regn registreres over tid.",
    flow: [
      {
        label: "Events: state",
        help: "Sensor for regn eller vær.",
      },
      {
        label: "Trigger",
        help: "Trigger node: sett Send-forsinkelse og Reset-betingelse. Vent 30 min med regn før stopp.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg payload til bryter.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. switch.turn_off for vanning.",
      },
    ],
    code: `// Function node: stopp vanning
msg.payload = { entity_id: "switch.vanning" };
return msg;`,
    nextNodes: ["Action node: switch.turn_off"],
    fields: [
      {
        name: "Trigger node → Send",
        value: "Etter 30 minutter regn",
      },
    ],
    troubleshoot: [
      {
        title: "Vanning stopper ikke",
        detail: "Sjekk at regn-sensoren har riktig state (rainy/on).",
      },
    ],
  },
  {
    id: "morning-briefing",
    title: "Morgensammendrag på høyttaler",
    category: "Varsling",
    summary: "Gi deg vær, kalender og varsel på morgenen.",
    flow: [
      {
        label: "Inject",
        help: "Start kl 07:00 på hverdager.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sett sammen tekst med vær og kalender.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. TTS til høyttaler.",
      },
    ],
    code: `// Function node: morgenbrief
msg.payload = {
  message: "God morgen! Været i dag er sol og 8 grader. Du har 2 avtaler."
};
return msg;`,
    nextNodes: ["Action node: tts.cloud_say"],
    fields: [
      {
        name: "Inject → Time",
        value: "07:00 (man-fre)",
      },
      {
        name: "Action node → Target",
        value: "media_player.kjokken",
      },
    ],
    troubleshoot: [
      {
        title: "TTS spiller ikke",
        detail: "Sjekk at volum ikke er 0 og at høyttaler er online.",
      },
    ],
  },
  {
    id: "window-open-ac",
    title: "AC av når vindu åpnes",
    category: "Klima",
    summary: "Slå av AC når vinduer åpnes for å spare strøm.",
    flow: [
      {
        label: "Events: state",
        help: "Vindu-sensor open/closed.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sett hvac_mode off ved open.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. climate.set_hvac_mode.",
      },
    ],
    code: `// Function node: AC av ved åpent vindu
msg.payload = { hvac_mode: "off" };
return msg;`,
    nextNodes: ["Action node: climate.set_hvac_mode"],
    fields: [
      {
        name: "Action node → Entity",
        value: "climate.stue",
      },
    ],
    troubleshoot: [
      {
        title: "AC slås ikke av",
        detail: "Sjekk at klimaanlegget støtter hvac_mode.",
      },
    ],
  },
  {
    id: "power-outage-alert",
    title: "Strømbrudd-varsling via UPS",
    category: "Varsling",
    summary: "Send varsel når UPS går på batteri.",
    flow: [
      {
        label: "Events: state",
        help: "sensor.ups_status går til on_battery.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg varseltekst.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send kritisk varsel.",
      },
    ],
    code: `// Function node: strømbrudd
msg.payload = {
  title: "Strømbrudd",
  message: "UPS kjører på batteri.",
  data: { priority: "high" }
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "Events: state → Entity",
        value: "sensor.ups_status",
      },
    ],
    troubleshoot: [
      {
        title: "UPS-status endrer seg ikke",
        detail: "Sjekk at UPS-integrasjonen rapporterer state korrekt.",
      },
    ],
  },
  {
    id: "garage-temperature-alert",
    title: "Garasje: frostvarsling",
    category: "Varsling",
    summary: "Varsle hvis temperaturen i garasjen går under 2°C.",
    flow: [
      {
        label: "Events: state",
        help: "sensor.garasje_temp.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Sjekk terskel og bygg varsel.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Send varsel.",
      },
    ],
    code: `// Function node: frostvarsel
const temp = Number(msg.payload);
if (Number.isNaN(temp) || temp > 2) return null;
msg.payload = {
  title: "Frostfare i garasje",
  message: "Temperaturen er " + temp + "°C."
};
return msg;`,
    nextNodes: ["Action node: notify.mobile_app_<telefon>"],
    fields: [
      {
        name: "Temperatur terskel",
        value: "2°C",
      },
    ],
    troubleshoot: [
      {
        title: "Varsel sendes ikke",
        detail: "Sjekk at sensoren rapporterer i °C og ikke °F.",
      },
    ],
  },
  {
    id: "evening-shutdown",
    title: "Kveld: slå av alt unødvendig",
    category: "Energi",
    summary: "Når nattmodus aktiveres, slå av TV, lys og standby.",
    flow: [
      {
        label: "Events: state",
        help: "input_boolean.nattmodus går til on.",
      },
      {
        label: "Change/Function",
        help: "Bruk Change node hvis du bare setter payload; Function kun ved logikk. Bygg payload for flere enheter.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. Slå av lys, TV og brytere.",
      },
    ],
    code: `// Function node: kveldsavslag
msg.payload = { entity_id: ["light.all_lights", "switch.tv", "switch.standby"] };
return msg;`,
    nextNodes: ["Action node: homeassistant.turn_off"],
    fields: [
      {
        name: "Action node → Service",
        value: "homeassistant.turn_off",
      },
    ],
    troubleshoot: [
      {
        title: "Enheter blir ikke slått av",
        detail: "Sjekk at entity_id-listen er gyldig og at domenet støttes.",
      },
    ],
  },
  {
    id: "holiday-lights",
    title: "Ferielys basert på kalender",
    category: "Scene",
    summary: "Tenn julelys automatisk når feriekalenderen er aktiv.",
    flow: [
      {
        label: "Events: state",
        help: "Lytt på calendar.ferie.",
      },
      {
        label: "Switch",
        help: "on/off basert på kalenderstatus.",
      },
      {
        label: "Action",
        help: "Home Assistant Action node: velg domene/service + entity/target/data. light.turn_on/off på julelys.",
      },
    ],
    code: `// Function node: julelys
msg.payload = { entity_id: "light.julelys" };
return msg;`,
    nextNodes: [
      "Action node: light.turn_on",
      "Action node: light.turn_off",
    ],
    fields: [
      {
        name: "Events: state → Entity",
        value: "calendar.ferie",
      },
    ],
    troubleshoot: [
      {
        title: "Kalender trigges ikke",
        detail: "Sjekk at kalender-integrasjonen er konfigurert og aktiv.",
      },
    ],
  },
];

const state = {
  search: "",
  category: "",
};

const searchInput = document.getElementById("search");
const categoryList = document.getElementById("categoryList");
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
const detailCodeBlock = document.getElementById("detailCodeBlock");
const toast = document.getElementById("toast");
let activeFlow = [];
let activeRecipe = null;
let activeFlowIndex = null;

function renderCategories() {
  if (!categoryList) return;
  categoryList.innerHTML = "";
  const categories = [...new Set(recipes.map((recipe) => recipe.category))].sort((a, b) =>
    a.localeCompare(b, "no", { sensitivity: "base" })
  );
  const items = [{ label: "Alle", value: "" }, ...categories.map((category) => ({ label: category, value: category }))];

  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-pill";
    button.dataset.category = item.value;
    button.textContent = item.label;
    if (state.category === item.value) {
      button.classList.add("active");
    }
    categoryList.appendChild(button);
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

  activeFlowIndex = index;
  detailFlowHelp.innerHTML = `
    <p class="flow-help-title">${step.label}</p>
    <p>${step.help}</p>
  `;

  if (detailCodeBlock) {
    const showCode = step.label.toLowerCase().includes("function");
    detailCodeBlock.hidden = !showCode;
  }

  [...detailFlow.querySelectorAll(".flow-node")].forEach((node) => {
    node.classList.toggle("active", Number(node.dataset.flowIndex) === index);
  });
}

function showFlowHelpPlaceholder() {
  activeFlowIndex = null;
  detailFlowHelp.innerHTML = `
    <p class="muted">Klikk på en node for å se hjelpetekst.</p>
  `;
  if (detailCodeBlock) {
    detailCodeBlock.hidden = true;
  }
  [...detailFlow.querySelectorAll(".flow-node")].forEach((node) => {
    node.classList.remove("active");
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
  showFlowHelpPlaceholder();
  renderList(recipe.nextNodes, detailNext, "li");
  renderFields(recipe.fields);
  renderTroubleshoot(recipe.troubleshoot);

  detail.hidden = false;
  detail.scrollIntoView({ behavior: "smooth" });
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function setCopyFeedback(button, message) {
  if (!button) return;
  const originalLabel = button.dataset.originalLabel || button.textContent;
  button.dataset.originalLabel = originalLabel;
  button.textContent = message;
  button.classList.add("is-copied");

  setTimeout(() => {
    button.textContent = originalLabel;
    button.classList.remove("is-copied");
  }, 2000);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      return false;
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    copied = false;
  }

  document.body.removeChild(textarea);

  if (!copied) {
    window.prompt("Kopier manuelt:", text);
  }

  return copied;
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.recipe) {
    showDetail(button.dataset.recipe);
  }

  if (button.dataset.copy === "detailCode") {
    const copied = await copyText(detailCode.textContent);
    showToast(copied ? "Kopiert til utklippstavle" : "Kopier manuelt");
    setCopyFeedback(button, copied ? "Kopiert!" : "Kopier");
  }

  if (button.dataset.copyText) {
    const copied = await copyText(button.dataset.copyText);
    showToast(copied ? "Kopiert til utklippstavle" : "Kopier manuelt");
    setCopyFeedback(button, copied ? "Kopiert!" : "Kopier");
  }

  if (button.dataset.flowIndex) {
    showFlowHelp(Number(button.dataset.flowIndex));
  }

  if (button.dataset.category !== undefined) {
    state.category = button.dataset.category;
    renderCategories();
    renderGrid();
  }
});

closeDetail.addEventListener("click", () => {
  detail.hidden = true;
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.trim().toLowerCase();
  renderGrid();
});

renderCategories();
renderGrid();
