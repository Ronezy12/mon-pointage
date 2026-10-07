/***** MON POINTAGE — BACKEND UNIQUE
 * Source de vérité Apps Script.
 * Feuilles attendues :
 *   PLANNING : DATE | DÉBUT | FIN | PAUSE | HEURES TRAVAILLÉES | OBSERVATIONS | TYPE JOUR
 *   CALENDRIER JUIF
 *   RÉCAP MENSUEL
 *****/

const CONFIG = {
  SPREADSHEET_ID: "1Emczq-QOyVzbjM2MLK16DItzf3rnx5xaODlShRpIXko",
  SHEET_PLANNING: "PLANNING",
  SHEET_CALENDRIER: "CALENDRIER JUIF",
  SHEET_RECAP: "RÉCAP MENSUEL",
  EMAIL_AUTORISE: "aharonelbaz6@gmail.com",
  GOOGLE_CLIENT_ID: "390069736161-bvharjfi4m4c28gfo4il7uktdrmmr318.apps.googleusercontent.com",
  ANNEE_DEBUT: 2026,
  ANNEE_FIN: 2027,
  TZ: Session.getScriptTimeZone() || "Europe/Paris"
};

function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const callback = p.callback || "";
  let result;

  try {
    const action = String(p.action || "ping");
    result = route_(action, p);
  } catch (err) {
    result = { success:false, error: err && err.message ? err.message : String(err) };
  }

  return jsonp_(result, callback);
}

function route_(action, p) {
  if (action === "ping") return { success:true, data:{ status:"ok", version:"3.1" } };

  const user = verifierGoogle_(p.id_token);
  if (!user.ok) throw new Error(user.error);

  switch (action) {
    case "getEtatDuJour":
      return { success:true, data:getEtatDuJour_() };
    case "commencerJour":
      return { success:true, data:commencerJour_(p.heure) };
    case "terminerJour":
      return { success:true, data:terminerJour_(p.heure, p.pauseMinutes, p.observation) };
    case "signalerAbsence":
      return { success:true, data:signalerAbsence_(p.motif) };
    case "obtenirTableauDeBord":
      return { success:true, data:obtenirTableauDeBord_(p.annee, p.mois) };
    case "obtenirRecapMoisActuel":
      return { success:true, data:obtenirRecapMois_(new Date().getFullYear(), new Date().getMonth()+1) };
    case "obtenirRecapMois":
      return { success:true, data:obtenirRecapMois_(p.annee, p.mois) };
    case "obtenirHistoriqueMois":
      return { success:true, data:{ historique:obtenirHistoriqueMois_(p.annee, p.mois) } };
    default:
      throw new Error("Action inconnue : " + action);
  }
}

function verifierGoogle_(token) {

  if (!token) {
    return {
      ok: false,
      error: "Connexion Google requise."
    };
  }

  /*
    Vérification mise en cache :
    un même jeton Google est réutilisé pendant quelques minutes.
    Cela évite de contacter Google à chaque clic (arrivée,
    départ, actualisation, etc.).
  */

  const cacheKey =
    "google_" +
    Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        token
      )
    ).substring(0, 80);

  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);

  if (cached) {
    try {
      const user = JSON.parse(cached);

      if (
        user &&
        user.email === CONFIG.EMAIL_AUTORISE.toLowerCase()
      ) {
        return user;
      }
    } catch (_) {}
  }

  const url =
    "https://oauth2.googleapis.com/tokeninfo?id_token=" +
    encodeURIComponent(token);

  let response;

  try {

    response = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        "Accept": "application/json"
      }
    });

  } catch (error) {

    console.error(
      "Vérification Google impossible : " +
      String(error)
    );

    return {
      ok: false,
      error:
        "Impossible de vérifier la connexion Google. Réessayez dans quelques secondes."
    };
  }

  const status =
    response.getResponseCode();

  if (status !== 200) {

    console.error(
      "Token Google refusé. HTTP " +
      status
    );

    return {
      ok: false,
      error:
        "Jeton Google invalide ou expiré."
    };
  }

  let data;

  try {

    data =
      JSON.parse(
        response.getContentText()
      );

  } catch (error) {

    console.error(
      "Réponse Google invalide : " +
      String(error)
    );

    return {
      ok: false,
      error:
        "Réponse Google invalide."
    };
  }

  const issuerOk =
    data.iss === "https://accounts.google.com" ||
    data.iss === "accounts.google.com";

  const audienceOk =
    String(data.aud || "") ===
    CONFIG.GOOGLE_CLIENT_ID;

  const email =
    String(data.email || "")
      .trim()
      .toLowerCase();

  const emailOk =
    email ===
    CONFIG.EMAIL_AUTORISE.toLowerCase();

  const verified =
    String(data.email_verified || "")
      .toLowerCase() === "true";

  const expiresOk =
    !data.exp ||
    Number(data.exp) >
      Math.floor(Date.now() / 1000);

  if (
    !issuerOk ||
    !audienceOk ||
    !emailOk ||
    !verified ||
    !expiresOk
  ) {

    return {
      ok: false,
      error:
        "Ce compte Google n'est pas autorisé."
    };
  }

  const user = {
    ok: true,
    email: email,
    name: data.name || "",
    picture: data.picture || ""
  };

  /*
    10 minutes de cache :
    le jeton Google reste vérifié côté serveur,
    sans refaire un appel réseau à chaque action.
  */

  cache.put(
    cacheKey,
    JSON.stringify(user),
    600
  );

  return user;
}

function jsonp_(payload, callback) {
  const body = JSON.stringify(payload);
  if (!callback || !/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService
    .createTextOutput(callback + "(" + body + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getPlanning_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(CONFIG.SHEET_PLANNING);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_PLANNING);
    sheet.getRange(1,1,1,7).setValues([[
      "DATE","DÉBUT","FIN","PAUSE","HEURES TRAVAILLÉES","OBSERVATIONS","TYPE JOUR"
    ]]);
  }
  return sheet;
}

function normaliserDate_(date) {
  return Utilities.formatDate(date, CONFIG.TZ, "yyyy-MM-dd");
}

function parseDate_(value) {
  if (value instanceof Date && !isNaN(value)) return value;
  const s = String(value || "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), 12);
  m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2])-1, Number(m[1]), 12);
  return null;
}

function getRowForDate_(sheet, date) {
  const wanted = normaliserDate_(date);
  const last = sheet.getLastRow();
  if (last < 2) return 0;

  const values = sheet.getRange(2,1,last-1,1).getValues();
  for (let i=0;i<values.length;i++) {
    const d = parseDate_(values[i][0]);
    if (d && normaliserDate_(d) === wanted) return i + 2;
  }
  return 0;
}

function ensurePlanningDate_(date) {
  const sheet = getPlanning_();
  let row = getRowForDate_(sheet, date);
  if (row) return row;

  const wanted = normaliserDate_(date);
  sheet.appendRow([new Date(date.getFullYear(),date.getMonth(),date.getDate(),12), "", "", "", "", "", ""]);
  row = sheet.getLastRow();
  sheet.getRange(row,1).setNumberFormat("dd/mm/yyyy");
  return row;
}

function creerPlanning_() {
  const sheet = getPlanning_();
  const existing = {};
  const last = sheet.getLastRow();

  if (last >= 2) {
    sheet.getRange(2,1,last-1,1).getValues().forEach(r => {
      const d = parseDate_(r[0]);
      if (d) existing[normaliserDate_(d)] = true;
    });
  }

  const rows = [];
  for (let year=CONFIG.ANNEE_DEBUT; year<=CONFIG.ANNEE_FIN; year++) {
    for (let month=0;month<12;month++) {
      const days = new Date(year,month+1,0).getDate();
      for (let day=1;day<=days;day++) {
        const d = new Date(year,month,day,12);
        const key = normaliserDate_(d);
        if (!existing[key]) rows.push([d,"","","","","",""]);
      }
    }
  }

  if (rows.length) {
    sheet.getRange(sheet.getLastRow()+1,1,rows.length,7).setValues(rows);
    sheet.getRange(2,1,sheet.getLastRow()-1,1).setNumberFormat("dd/mm/yyyy");
  }
}

function chercherTypeCalendrier_(date) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(CONFIG.SHEET_CALENDRIER);
  if (!sheet || sheet.getLastRow() < 2) return "";

  const values = sheet.getDataRange().getValues();
  const wanted = normaliserDate_(date);

  for (let r=1;r<values.length;r++) {
    let dateMatch = false;
    let rowText = [];

    for (let c=0;c<values[r].length;c++) {
      const cell = values[r][c];
      const d = parseDate_(cell);
      if (d && normaliserDate_(d) === wanted) dateMatch = true;
      if (cell !== "" && cell !== null) rowText.push(String(cell));
    }

    if (!dateMatch) continue;

    const text = rowText.join(" ").toLowerCase();
    if (text.indexOf("chabbat") >= 0 || text.indexOf("shabbat") >= 0) return "CHABBAT";
    if (text.indexOf("fête") >= 0 || text.indexOf("fete") >= 0 || text.indexOf("yom tov") >= 0) return "FETE";
  }

  return "";
}

function mettreAJourTypesJours_() {
  const sheet = getPlanning_();
  const last = sheet.getLastRow();
  if (last < 2) return;

  const values = sheet.getRange(2,1,last-1,7).getValues();
  const out = values.map(row => {
    const date = parseDate_(row[0]);
    if (!date) return [row[6] || ""];

    const current = String(row[6] || "").toUpperCase();
    const calendarType = chercherTypeCalendrier_(date);

    if (calendarType === "CHABBAT") return ["CHABBAT"];
    if (calendarType === "FETE") return ["FETE"];
    if (current === "ABSENT") return ["ABSENT"];
    if (row[1] && row[2]) return ["TRAVAIL"];
    return [""];
  });

  sheet.getRange(2,7,out.length,1).setValues(out);
}

function dateDuJour_() {
  const now = new Date();
  return new Date(
    Number(Utilities.formatDate(now,CONFIG.TZ,"yyyy")),
    Number(Utilities.formatDate(now,CONFIG.TZ,"MM"))-1,
    Number(Utilities.formatDate(now,CONFIG.TZ,"dd")),
    12
  );
}

function actualiserTypeJour_(sheet, row, date) {
  const current =
    String(sheet.getRange(row,7).getValue() || "").toUpperCase();

  const calendarType = chercherTypeCalendrier_(date);

  if (calendarType === "CHABBAT" || calendarType === "FETE") {
    sheet.getRange(row,7).setValue(calendarType);
    return calendarType;
  }

  if (current === "ABSENT" || current === "TRAVAIL") {
    return current;
  }

  sheet.getRange(row,7).clearContent();
  return "";
}

function getEtatDuJour() {
  creerPlanning_();

  const date = dateDuJour_();
  const sheet = getPlanning_();
  const row = ensurePlanningDate_(date);

  const type = actualiserTypeJour_(sheet, row, date);

  const values = sheet.getRange(row,1,1,7).getValues()[0];
  const debut = valeurHeure_(values[1]);
  const fin = valeurHeure_(values[2]);
  const pause = valeurPause_(values[3]);
  const travaille = String(values[4] || "").trim();

  let statut = "Prêt à pointer";
  if (type === "FETE") statut = "Fête";
  else if (type === "CHABBAT") statut = "Chabbat";
  else if (type === "ABSENT") statut = "Absent";
  else if (fin) statut = "Terminé";
  else if (debut) statut = "En cours";

  return {
    date: normaliserDate_(date),
    debut: debut,
    fin: fin,
    pause: pause,
    travaille: travaille,
    observation: String(values[5] || ""),
    typeJour: type,
    statut: statut,
    peutCommencer: !debut && !["FETE","CHABBAT","ABSENT"].includes(type),
    peutTerminer: !!debut && !fin
  };
}

function valeurHeure_(value) {
  if (value instanceof Date && !isNaN(value)) return Utilities.formatDate(value,CONFIG.TZ,"HH:mm");
  if (value === "" || value === null || value === undefined) return "";
  const s = String(value).trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  return m ? String(m[1]).padStart(2,"0")+":"+m[2] : s;
}

function valeurPause_(value) {
  if (value === "" || value === null || value === undefined) return "";

  // Google Sheets peut renvoyer une pause sous forme de nombre,
  // de durée (fraction de journée) ou d'objet Date.
  if (value instanceof Date && !isNaN(value)) {
    const hours = value.getHours();
    const minutes = value.getMinutes();
    const total = hours * 60 + minutes;
    return formatPause_(total);
  }

  if (typeof value === "number") {
    // Une durée Sheets est stockée comme fraction de journée.
    // Une valeur >= 1 correspond à l'ancien stockage en minutes.
    const total = value > 1
      ? Math.round(value)
      : Math.round(value * 24 * 60);

    return formatPause_(total);
  }

  const minutes = parseMinutes_(value);
  return formatPause_(minutes);
}

function formatPause_(minutes) {
  minutes = Math.max(0, Math.round(Number(minutes) || 0));

  if (minutes === 0) return "0 minute";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return minutes + " minute" + (minutes > 1 ? "s" : "");
  }

  if (mins === 0) {
    return hours + " heure" + (hours > 1 ? "s" : "");
  }

  return hours + " heure" + (hours > 1 ? "s" : "") +
    " " + mins + " minute" + (mins > 1 ? "s" : "");
}

function parseMinutes_(value) {
  if (value === "" || value === null || value === undefined) return 0;
  if (typeof value === "number") return Math.round(value);
  const s = String(value).toLowerCase();
  const m = s.match(/(\d+(?:\.\d+)?)\s*h/);
  if (m) {
    const h = Number(m[1]);
    const min = s.match(/(\d+)\s*min/);
    return Math.round(h*60 + (min ? Number(min[1]) : 0));
  }
  const n = s.match(/\d+/);
  return n ? Number(n[0]) : 0;
}

function minutesFromHHMM_(s) {
  const m = String(s || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1])*60+Number(m[2]);
}

function formatDuree_(minutes) {
  minutes = Math.max(0,Math.round(minutes));
  const h = Math.floor(minutes/60);
  const m = minutes%60;
  return h + "h " + String(m).padStart(2,"0");
}

function commencerJour_(heure) {
  creerPlanning_();

  const date = dateDuJour_();
  const sheet = getPlanning_();
  const row = ensurePlanningDate_(date);

  const type = actualiserTypeJour_(sheet, row, date);

  const current = sheet.getRange(row,1,1,7).getValues()[0];

  if (["FETE","CHABBAT","ABSENT"].includes(type)) {
    throw new Error("Le pointage est désactivé pour cette journée.");
  }

  if (current[1]) {
    throw new Error("L'arrivée est déjà enregistrée.");
  }

  const h =
    String(heure || "").match(/^\d{1,2}:\d{2}$/)
      ? String(heure)
      : Utilities.formatDate(new Date(),CONFIG.TZ,"HH:mm");

  sheet.getRange(row,2).setValue(h);
  sheet.getRange(row,7).setValue("TRAVAIL");

  return getEtatDuJour();
}

function terminerJour_(heure,pauseMinutes,observation) {
  creerPlanning_();
  const date = dateDuJour_();
  const sheet = getPlanning_();
  const row = ensurePlanningDate_(date);
  const values = sheet.getRange(row,1,1,7).getValues()[0];

  if (values[2]) throw new Error("Le départ est déjà enregistré.");

  const debut = valeurHeure_(values[1]);
  if (!debut) throw new Error("Impossible de pointer le départ sans arrivée.");

  const fin = String(heure || "").match(/^\d{1,2}:\d{2}$/) ? String(heure) : Utilities.formatDate(new Date(),CONFIG.TZ,"HH:mm");
  const pause = Math.max(0,Math.min(1440,Number(pauseMinutes)||0));

  const startMin = minutesFromHHMM_(debut);
  let endMin = minutesFromHHMM_(fin);
  if (startMin === null || endMin === null) throw new Error("Heure invalide.");
  if (endMin < startMin) endMin += 24*60;

  const worked = Math.max(0,endMin-startMin-pause);

  sheet.getRange(row,3).setValue(fin);
  // Stockage propre : une vraie durée Sheets (fraction de journée).
  sheet.getRange(row,4).setValue(pause / (24 * 60));
  sheet.getRange(row,4).setNumberFormat("[h]:mm");
  sheet.getRange(row,5).setValue(formatDuree_(worked));
  sheet.getRange(row,6).setValue(String(observation || "").trim());
  sheet.getRange(row,7).setValue("TRAVAIL");

  return getEtatDuJour();
}

function signalerAbsence_(motif) {
  creerPlanning_();
  const date = dateDuJour_();
  const sheet = getPlanning_();
  const row = ensurePlanningDate_(date);
  const values = sheet.getRange(row,1,1,7).getValues()[0];

  if (values[1] || values[2]) throw new Error("Cette journée contient déjà un pointage.");

  sheet.getRange(row,2,1,5).clearContent();
  sheet.getRange(row,6).setValue("ABSENCE : " + String(motif || "Non précisé").trim());
  sheet.getRange(row,7).setValue("ABSENT");

  return getEtatDuJour();
}

function obtenirHistoriqueMois_(annee,mois) {
  const y = Number(annee), m = Number(mois);
  if (!y || !m) throw new Error("Mois invalide.");

  const sheet = getPlanning_();
  const last = sheet.getLastRow();
  if (last < 2) return [];

  const values = sheet.getRange(2,1,last-1,7).getValues();
  const rows = [];

  values.forEach(row => {
    const d = parseDate_(row[0]);
    if (!d || d.getFullYear() !== y || d.getMonth()+1 !== m) return;

    const debut = valeurHeure_(row[1]);
    const fin = valeurHeure_(row[2]);
    const pause = valeurPause_(row[3]);
    const travaille = valeurHeure_(row[4]) || String(row[4] || "");
    const type = String(row[6] || "").toUpperCase();

    let statut = "À pointer";
    if (type === "ABSENT") statut = "Absent";
    else if (type === "FETE") statut = "Fête";
    else if (type === "CHABBAT") statut = "Chabbat";
    else if (fin) statut = "Terminé";
    else if (debut) statut = "En cours";

    rows.push({
      date: normaliserDate_(d),
      debut: debut,
      fin: fin,
      pause: pause,
      travaille: travaille,
      observation: String(row[5] || ""),
      statut: statut
    });
  });

  rows.sort((a,b)=>a.date.localeCompare(b.date));
  return rows;
}

function obtenirRecapMois_(annee,mois) {
  const rows = obtenirHistoriqueMois_(annee,mois);
  let totalMinutes = 0;
  let joursTravailles = 0;
  let absences = 0;

  rows.forEach(row => {
    if (row.statut === "Absent") absences++;
    if (row.debut && row.fin && row.travaille) {
      const minutes = parseDureeMinutes_(row.travaille);
      if (minutes > 0) {
        totalMinutes += minutes;
        joursTravailles++;
      }
    }
  });

  return {
    annee:Number(annee),
    mois:Number(mois),
    heuresTravaillees:formatDuree_(totalMinutes),
    minutesTravaillees:totalMinutes,
    joursTravailles:joursTravailles,
    absences:absences
  };
}

function parseDureeMinutes_(value) {
  const s = String(value || "").toLowerCase();
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*(?:min|m)(?!o)/);
  return (h ? Number(h[1])*60 : 0) + (m ? Number(m[1]) : 0);
}

function obtenirTableauDeBord_(annee,mois) {
  return {
    recap:obtenirRecapMois_(annee,mois),
    historique:obtenirHistoriqueMois_(annee,mois)
  };
}

/* Utilitaires conservés pour l'initialisation manuelle dans Apps Script. */
function preparerCalendrierJuif() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(CONFIG.SHEET_CALENDRIER);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_CALENDRIER);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1,1,1,3).setValues([["DATE","FETE","CHABBAT"]]);
    sheet.setFrozenRows(1);
  }
  return "Calendrier prêt.";
}

function creerPlanning() {
  creerPlanning_();
  mettreAJourTypesJours_();
  return "Planning créé/mis à jour.";
}

function mettreAJourTypesJours() {
  mettreAJourTypesJours_();
  return "Types de jours mis à jour.";
}
