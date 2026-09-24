/** Curiosità editoriali: nessun generatore di conversioni o rapporti fra unità. */
const editorialFacts = [
  'Il Pacifico è l’oceano più grande della Terra.',
  'L’Antartide è il deserto più grande del pianeta: un deserto può essere freddo.',
  'Il Sahara è il più grande deserto caldo del mondo.',
  'Il Vaticano è lo Stato sovrano più piccolo del mondo.',
  'La Russia è il Paese più esteso del mondo per superficie.',
  'La Groenlandia è l’isola più grande del mondo, escludendo i continenti.',
  'Il lago Baikal è il lago d’acqua dolce più profondo del mondo.',
  'Il Mar Caspio è il più grande bacino d’acqua interno del pianeta per superficie.',
  'L’Everest è la montagna più alta sul livello del mare.',
  'La Fossa delle Marianne ospita il punto oceanico più profondo conosciuto: il Challenger Deep.',
  'La balenottera azzurra è il più grande animale conosciuto mai vissuto sulla Terra.',
  'Il falco pellegrino è l’animale più veloce in picchiata.',
  'Il colibrì è l’unico uccello capace di volare stabilmente all’indietro.',
  'I polpi hanno tre cuori.',
  'Il sangue dei polpi è blu perché usa emocianina, ricca di rame.',
  'Le api comunicano la posizione del cibo anche attraverso una danza.',
  'Le lontre marine possono tenersi per mano mentre galleggiano per non separarsi.',
  'I delfini usano fischi caratteristici che funzionano in modo simile a “nomi”.',
  'Le giraffe hanno sette vertebre cervicali, come gli esseri umani.',
  'Gli squali esistono da prima degli alberi.',
  'I coralli sono animali, non piante.',
  'I fenicotteri nascono con piumaggio grigiastro: il rosa deriva soprattutto dalla dieta.',
  'Le farfalle assaggiano anche attraverso recettori presenti sulle zampe.',
  'Le formiche non hanno polmoni: respirano attraverso piccoli spiracoli nel corpo.',
  'Il koala ha impronte digitali molto simili a quelle umane.',
  'La pelle è l’organo più esteso del corpo umano.',
  'Il femore è l’osso più lungo e resistente del corpo umano.',
  'La staffa, nell’orecchio medio, è l’osso più piccolo del corpo umano.',
  'Il cuore umano ha quattro camere.',
  'I globuli rossi maturi umani non hanno nucleo.',
  'La cornea non contiene vasi sanguigni.',
  'Il fegato è capace di rigenerare una parte significativa del proprio tessuto.',
  'L’impronta della lingua è diversa da persona a persona, anche se non viene usata comunemente per identificazione.',
  'Giove è il pianeta più grande del Sistema Solare.',
  'Venere è il pianeta più caldo del Sistema Solare, anche se Mercurio è più vicino al Sole.',
  'Su Venere un giorno dura più di un anno venusiano.',
  'Saturno è meno denso dell’acqua.',
  'Urano ruota quasi “sdraiato” rispetto al piano della sua orbita.',
  'Marte ospita Olympus Mons, il più grande vulcano conosciuto del Sistema Solare.',
  'Sulla Luna le impronte possono durare molto a lungo perché non ci sono pioggia o vento come sulla Terra.',
  'Il suono non può propagarsi nel vuoto perché ha bisogno di un mezzo materiale.',
  'Il ghiaccio galleggia perché è meno denso dell’acqua liquida.',
  'Il diamante e la grafite sono entrambi formati da carbonio, ma con strutture atomiche diverse.',
  'Il mercurio è un metallo liquido a temperatura ambiente.',
  'Il simbolo chimico dell’oro, Au, deriva dal latino “aurum”.',
  'Il simbolo del sodio, Na, deriva da “natrium”.',
  'Il vetro comune è un solido amorfo: non è un liquido che scorre lentamente a temperatura ambiente.',
  'Un arcobaleno completo è in realtà un cerchio: da terra ne vediamo spesso solo un arco.',
  'Il cielo appare blu soprattutto per la diffusione di Rayleigh della luce solare nell’atmosfera.',
  'Il tramonto appare rosso perché la luce attraversa più atmosfera e le lunghezze d’onda blu vengono disperse maggiormente.',
  'L’acqua pura conduce male l’elettricità: sono soprattutto gli ioni disciolti a renderla conduttiva.',
  'Il numero 2 è l’unico numero primo pari.',
  'Lo zero è un numero pari.',
  'π è un numero irrazionale: le sue cifre decimali non terminano e non diventano periodiche.',
  'Il primo sito web pubblico fu creato al CERN da Tim Berners-Lee.',
  'Il World Wide Web e Internet non sono la stessa cosa: il Web è uno dei servizi che usa Internet.',
  'Il QR Code fu sviluppato in Giappone da Denso Wave negli anni Novanta.',
  'Bluetooth prende il nome dal re danese Harald “Bluetooth” Gormsson.',
  'La parola “robot” deriva dal termine ceco “robota”, legato al lavoro forzato.',
  'La prima webcam famosa fu usata a Cambridge per controllare una caffettiera.',
  'ASCII nasce come standard per rappresentare caratteri con codici numerici.',
  'HTTPS aggiunge cifratura e autenticazione al traffico HTTP tramite TLS.',
  'Il codice Morse internazionale usa combinazioni di punti e linee per rappresentare lettere e numeri.',
  'La stampa a caratteri mobili di Gutenberg accelerò enormemente la diffusione dei libri in Europa nel XV secolo.',
  'La Biblioteca di Alessandria fu uno dei più celebri centri di conoscenza del mondo antico.',
  'Le piramidi di Giza erano già antiche quando Roma divenne una grande potenza mediterranea.',
  'Cleopatra visse cronologicamente più vicina allo sbarco sulla Luna che alla costruzione della Grande Piramide di Giza.',
  'L’Università di Bologna, fondata nell’XI secolo, è tradizionalmente considerata la più antica università del mondo occidentale ancora attiva.',
  'Il Canale di Panama collega l’Atlantico e il Pacifico attraverso un sistema di chiuse.',
  'La lingua con più parlanti madrelingua al mondo è il cinese mandarino.',
  'La parola inglese “bookkeeper” contiene tre coppie consecutive di lettere doppie: oo, kk, ee.',
  'Il miele, se conservato bene, è estremamente resistente al deterioramento grazie a poca acqua disponibile e alta acidità.',
  'Il caffè tostato non è un “fagiolo”: il chicco è il seme del frutto della pianta del caffè.',
  'La banana botanicamente è una bacca, mentre la fragola non lo è in senso botanico.',
  'Il pomodoro è botanicamente un frutto, anche se in cucina viene trattato come verdura.',
  'Gli anacardi crescono attaccati alla parte inferiore del frutto chiamato mela di anacardio.',
  'Il cioccolato deriva dai semi del cacao, fermentati, essiccati e tostati.',
  'Il peperoncino deve la sua piccantezza soprattutto alla capsaicina.',
  'Il sale abbassa il punto di congelamento dell’acqua: per questo viene usato contro il ghiaccio sulle strade.',
  'L’acqua bolle a temperature più basse quando la pressione atmosferica diminuisce, per esempio in alta montagna.',
  'Il colore naturale della maggior parte della carta non è bianco puro: viene schiarita durante la produzione.',
  'Il rosso, il verde e il blu sono i tre canali fondamentali del modello colore RGB usato dagli schermi.',
  'Nel modello RGB, bianco significa massima intensità di rosso, verde e blu insieme.',
  'Nel modello CMYK usato nella stampa, il nero viene indicato con K.',
  'Le seppie cambiano colore grazie a cellule specializzate della pelle chiamate cromatofori.',
  'Le stelle marine possono rigenerare le braccia perdute; alcune specie possono ricostruire anche molto di più.',
  'Gli ippocampi maschi portano le uova fecondate in una tasca incubatrice.',
  'I pinguini sono uccelli: le loro ali si sono adattate al nuoto.',
  'Gli ornitorinchi depongono uova pur essendo mammiferi.',
  'Le echidne depongono uova, come gli ornitorinchi.',
  'Le meduse non hanno un cervello centralizzato come quello dei vertebrati.',
  'Le meduse esistevano negli oceani molto prima dei dinosauri.',
  'I pipistrelli sono gli unici mammiferi capaci di volo attivo sostenuto.',
  'Gli elefanti si riconoscono anche attraverso vibrazioni trasmesse dal terreno.',
  'Le balene comunicano anche attraverso suoni che viaggiano nell’acqua.',
  'I cavallucci marini nuotano in posizione quasi verticale.',
  'Le lumache di terra hanno una radula, una struttura con minuscoli dentelli per raschiare il cibo.',
  'Le ostriche possono formare perle quando ricoprono un corpo estraneo con strati di materiale.',
  'Gli uccelli migratori sfruttano diversi indizi per orientarsi, compreso il campo magnetico terrestre.',
  'Le api vedono la luce ultravioletta, invisibile agli esseri umani.',
  'Alcuni fiori hanno disegni ultravioletti che guidano gli insetti verso il nettare.',
  'Le farfalle attraversano una metamorfosi completa passando per lo stadio di crisalide.',
  'Le cicale producono il loro suono caratteristico con strutture chiamate timbali.',
  'Le lucciole producono luce attraverso una reazione chimica, detta bioluminescenza.',
  'I funghi appartengono a un regno biologico distinto da quello delle piante.',
  'Le piante possono formare associazioni mutualistiche con funghi del suolo chiamate micorrize.',
  'I licheni nascono da una relazione stabile tra un fungo e partner fotosintetici.',
  'Il bambù appartiene alla famiglia delle graminacee.',
  'Gli anelli di accrescimento degli alberi possono conservare informazioni sulle stagioni passate.',
  'Le radici delle mangrovie aiutano a stabilizzare i sedimenti delle coste tropicali.',
  'Le foglie delle piante contengono clorofilla, fondamentale per la fotosintesi.',
  'Il girasole giovane segue il Sole durante il giorno; i fiori maturi tendono a rivolgersi a est.',
  'Le piante carnivore integrano i nutrienti catturando piccoli animali, ma ottengono energia dalla fotosintesi.',
  'La vaniglia viene dal frutto di alcune orchidee.',
  'Lo zafferano si ricava dagli stimmi di un fiore del genere Crocus.',
  'Il tè verde e quello nero derivano dalla stessa specie di pianta: cambia soprattutto la lavorazione.',
  'Il pepe nero e il pepe bianco si ottengono da frutti della stessa pianta lavorati diversamente.',
  'La cannella proviene dalla corteccia interna di alberi del genere Cinnamomum.',
  'Il pistacchio appartiene alla stessa famiglia botanica dell’anacardio.',
  'Il mais è stato domesticato in Mesoamerica a partire da una pianta chiamata teosinte.',
  'La patata è originaria delle Ande e arrivò in Europa dopo i viaggi transatlantici.',
  'Il riso è coltivato anche in Italia, soprattutto nella Pianura Padana.',
  'Il lievito fa gonfiare l’impasto liberando anidride carbonica durante la fermentazione.',
  'Il pane a lievitazione naturale usa comunità di lieviti e batteri lattici.',
  'Il colore verde dell’olio extravergine può dipendere da pigmenti vegetali, ma non ne determina da solo la qualità.',
  'Il gusto umami è associato soprattutto alla presenza di glutammato e di alcune sostanze correlate.',
  'La percezione del piccante dipende da recettori del dolore e della temperatura, non da un gusto fondamentale.',
  'La vanillina è uno dei composti responsabili dell’aroma tipico della vaniglia.',
  'Il miele viene prodotto dalle api a partire da nettare o melata.',
  'Il sale da cucina è composto principalmente da cloruro di sodio.',
  'Le bollicine dell’acqua frizzante sono dovute all’anidride carbonica disciolta.',
  'La seta naturale è prodotta da bachi che costruiscono bozzoli con un filo proteico.',
  'Il denim prende il nome dall’espressione francese «serge de Nîmes».',
  'Il nome «jeans» è legato storicamente a Genova e al commercio di tessuti.',
  'Il velcro fu ideato osservando come i frutti della bardana si attaccano al pelo degli animali.',
  'La porcellana è una ceramica che diventa particolarmente compatta durante la cottura.',
  'La carta fu sviluppata in Cina molto prima della sua diffusione in Europa.',
  'La stampa xilografica utilizza matrici di legno intagliate.',
  'La tecnica dell’affresco richiede di applicare i pigmenti sull’intonaco ancora umido.',
  'Il mosaico compone immagini attraverso piccole tessere di materiali diversi.',
  'La prospettiva lineare fu sistematizzata dagli artisti del Rinascimento.',
  'Il colore ultramarino era tradizionalmente ricavato dal lapislazzuli.',
  'Il pigmento chiamato «terra di Siena» prende il nome dalla città toscana.',
  'La Gioconda è dipinta su una tavola di legno, non su tela.',
  'Il David di Michelangelo fu scolpito da un blocco di marmo già lavorato in precedenza.',
  'La tecnica dello sfumato è strettamente associata alla pittura di Leonardo da Vinci.',
  'Il Bauhaus nacque in Germania come scuola che univa arte, artigianato e progettazione.',
  'La Biennale di Venezia comprende manifestazioni dedicate anche all’arte e all’architettura.',
  'Il jazz si sviluppò negli Stati Uniti attraverso l’incontro di diverse tradizioni musicali.',
  'Il pianoforte fu inventato da Bartolomeo Cristofori, attivo alla corte medicea.',
  'Il theremin si suona senza toccare fisicamente lo strumento.',
  'Il sassofono fu ideato dal costruttore di strumenti Adolphe Sax.',
  'La chitarra classica produce suono attraverso la vibrazione delle corde e la risonanza della cassa.',
  'Un’orchestra accorda spesso gli strumenti prendendo come riferimento una nota dell’oboe.',
  'La parola «karaoke» nasce in giapponese e significa letteralmente «orchestra vuota».',
  'L’alfabeto cirillico viene usato da diverse lingue, non soltanto dal russo.',
  'L’hindi e l’urdu condividono molto vocabolario parlato, ma usano normalmente scritture diverse.',
  'Il basco non appartiene alla famiglia delle lingue indoeuropee.',
  'Il finlandese appartiene alla famiglia linguistica uralica.',
  'L’islandese conserva caratteristiche grammaticali presenti nell’antico norreno.',
  'In giapponese convivono più sistemi di scrittura, tra cui kanji e kana.',
  'La parola «algoritmo» deriva dal nome latinizzato del matematico al-Khwārizmī.',
  'La parola «algebra» deriva da un termine arabo reso celebre dagli scritti di al-Khwārizmī.',
  'La parola «quarantena» richiama storicamente un periodo di isolamento usato nella navigazione.',
  'Il punto interrogativo rovesciato apre le domande nella normale ortografia spagnola.',
  'In tedesco i sostantivi comuni si scrivono con l’iniziale maiuscola.',
  'L’italiano è una lingua romanza, sviluppatasi dal latino parlato.',
  'Il portoghese è lingua ufficiale anche in Paesi africani come Angola e Mozambico.',
  'Il greco moderno usa una forma evoluta dello stesso alfabeto dell’antichità.',
  'Il Braille usa combinazioni di punti in rilievo per rappresentare caratteri.',
  'La lingua dei segni italiana è una lingua naturale con una propria grammatica.',
  'La stele di Rosetta aiutò gli studiosi a decifrare i geroglifici egizi.',
  'I geroglifici egizi combinavano segni fonetici e segni che rappresentavano concetti.',
  'La scrittura cuneiforme veniva impressa su tavolette d’argilla.',
  'La Via della Seta era una rete di itinerari commerciali, non un’unica strada.',
  'Le città di Pompei ed Ercolano furono sepolte durante l’eruzione del Vesuvio del 79 d.C.',
  'Il Colosseo si chiamava in origine Anfiteatro Flavio.',
  'I Romani usavano il calcestruzzo anche per costruire porti e opere marittime.',
  'Il Pantheon di Roma conserva una grande cupola dell’epoca imperiale.',
  'Venezia si sviluppò su un insieme di isole della laguna.',
  'La cupola di Santa Maria del Fiore a Firenze fu progettata da Filippo Brunelleschi.',
  'La tavola periodica organizza gli elementi secondo il numero atomico.',
  'La maggior parte dell’ossigeno atmosferico deriva storicamente dall’attività di organismi fotosintetici.',
  'L’aurora polare nasce dall’interazione tra particelle cariche e atmosfera terrestre.',
  'Il campo magnetico terrestre contribuisce a deviare molte particelle del vento solare.',
  'I vulcani possono formarsi anche sotto gli oceani.',
  'Le placche tettoniche si muovono lentamente sulla superficie terrestre.',
  'I terremoti sono spesso causati dal rilascio improvviso di tensione lungo una faglia.',
  'Il magma si chiama lava quando raggiunge la superficie terrestre.',
  'Le stalattiti crescono dal soffitto delle grotte; le stalagmiti dal pavimento.',
  'La sabbia del deserto non è tutta uguale: la sua composizione dipende dalle rocce d’origine.',
  'Le maree dipendono soprattutto dall’attrazione gravitazionale della Luna e, in parte, del Sole.',
  'Il colore del mare cambia anche in funzione di profondità, fondale e particelle sospese.',
  'Le nuvole si formano quando il vapore acqueo condensa in minuscole gocce o cristalli di ghiaccio.',
  'La rugiada nasce quando il vapore acqueo condensa su superfici sufficientemente fredde.',
  'La brina si forma quando il vapore acqueo si deposita come ghiaccio su superfici fredde.',
  'L’arcobaleno nasce dalla rifrazione, riflessione e dispersione della luce nelle gocce d’acqua.',
  'Una stella brilla perché al suo interno avvengono reazioni di fusione nucleare.',
  'Una nebulosa è una nube interstellare di gas e polveri.',
  'Le galassie possono avere forme a spirale, ellittiche o irregolari.',
  'La Via Lattea è la galassia che ospita il Sistema Solare.',
  'Le fasi della Luna dipendono dalla porzione del lato illuminato che vediamo dalla Terra.',
  'Le eclissi solari si verificano quando la Luna si interpone tra Sole e Terra.',
  'Le eclissi lunari si verificano quando la Luna attraversa l’ombra della Terra.',
  'Saturno non è l’unico pianeta del Sistema Solare ad avere anelli.',
  'Plutone è classificato come pianeta nano.',
  'I meteoriti sono frammenti extraterrestri che riescono a raggiungere il suolo.',
  'Il termine «software» indica programmi e dati, a differenza dei componenti fisici chiamati hardware.',
  'Il sistema GPS utilizza segnali provenienti da satelliti per determinare la posizione.',
  'Il formato PNG supporta la trasparenza delle immagini.',
  'Il formato SVG descrive immagini vettoriali attraverso elementi geometrici.',
  'Il formato PDF è pensato per conservare l’impaginazione dei documenti tra dispositivi diversi.',
  'La modalità aereo dei dispositivi disattiva alcune comunicazioni radio, ma le impostazioni disponibili possono variare.',
  'Un gestore di password può creare credenziali diverse per ogni servizio.',
  'L’autenticazione a più fattori aggiunge un controllo oltre alla sola password.',
  'Il browser e il motore di ricerca sono strumenti diversi: il primo visualizza pagine, il secondo aiuta a trovarle.',
  'Il nome «cookie» nel Web indica un piccolo dato che un sito può memorizzare nel browser.',
] as const

const STORAGE_KEY = '4bitstudio.seenFacts.v1'
type Rotation = { seen: number[]; last: number | null }
let fallback: Rotation = { seen: [], last: null }

function readRotation(): Rotation {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    if (parsed && typeof parsed === "object" && "seen" in parsed && "last" in parsed) {
      const state = parsed as { seen: unknown; last: unknown }
      if (Array.isArray(state.seen)) {
        return {
          seen: state.seen.filter((id): id is number => Number.isInteger(id) && id >= 0 && id < editorialFacts.length),
          last: typeof state.last === "number" && state.last >= 0 && state.last < editorialFacts.length ? state.last : null,
        }
      }
    }
  } catch { /* Private mode or unavailable storage: use the in-memory rotation. */ }
  return fallback
}

function saveRotation(rotation: Rotation) {
  fallback = rotation
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rotation)) } catch { /* In-memory fallback. */ }
}

function randomIndex(max: number) {
  if (max <= 1) return 0
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const value = new Uint32Array(1)
    crypto.getRandomValues(value)
    return value[0] % max
  }
  return Math.floor(Math.random() * max)
}

/**
 * Cambia a ogni apertura della home e non ripete nozioni finché tutte
 * quelle disponibili non sono state mostrate. Al nuovo ciclo evita anche
 * di ripetere immediatamente l’ultima nozione precedente.
 * Usa v2 per non importare le 5.000 conversioni della vecchia rotazione.
 */
export function getNextUsefulFact(): string {
  const rotation = readRotation()
  const seen = new Set(rotation.seen)
  let available = editorialFacts.map((_, index) => index).filter(index => !seen.has(index))
  if (!available.length) {
    seen.clear()
    available = editorialFacts.map((_, index) => index).filter(index => index !== rotation.last)
  }
  const selected = available[randomIndex(available.length)]
  seen.add(selected)
  saveRotation({ seen: [...seen], last: selected })
  return editorialFacts[selected]
}
