/* =========================================================
   CAMPUS MONDE — interface (site public, espace candidat, back-office)
   Toutes les données passent par l'API sécurisée du serveur.
   ========================================================= */
function now(){return new Date().toISOString()}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtD(d,withTime){if(!d)return '—';const x=new Date(d);return x.toLocaleDateString(lang==='en'?'en-GB':'fr-FR',{day:'2-digit',month:'short',year:'numeric'})+(withTime?' '+x.toLocaleTimeString(lang==='en'?'en-GB':'fr-FR',{hour:'2-digit',minute:'2-digit'}):'')}
async function api(method,url,body,isForm){
  const o={method,credentials:'same-origin',headers:{'X-Requested-With':'CampusMonde'}};
  if(body!==undefined){if(isForm)o.body=body;else{o.headers['Content-Type']='application/json';o.body=JSON.stringify(body)}}
  let r;try{r=await fetch(url,o)}catch(e){throw new Error(L('Connexion impossible au serveur. Vérifiez votre réseau.','Cannot reach the server. Check your connection.'))}
  let d=null;try{d=await r.json()}catch(e){}
  if(!r.ok){const e=new Error(d&&d.error?L(d.error.fr,d.error.en):L('Erreur serveur, veuillez réessayer.','Server error, please try again.'));e.status=r.status;throw e}
  return d||{};
}
async function load(){S=await api('GET','/api/state')}

/* ---------- Catalogue (contenu de travail à vérifier) ---------- */
const COUNTRIES=[
 {id:'canada',feat:1,reg:'am',code:'YUL',city:'Montréal',pre:'au',flag:'🇨🇦',fr:'Canada',en:'Canada',grad:'linear-gradient(135deg,#B3122E,#E2394F)',
  fr_d:"Universités francophones et anglophones, programmes coopératifs et possibilités de travail encadrées pendant les études.",en_d:"French- and English-speaking universities, co-op programmes and regulated work opportunities while studying.",
  fr_k:["Permis d'études requis (et CAQ pour le Québec)","Preuve de capacité financière demandée","Rentrées principales : septembre, janvier"],
  en_k:["Study permit required (plus CAQ for Quebec)","Proof of financial capacity required","Main intakes: September, January"]},
 {id:'france',feat:1,reg:'eu',code:'CDG',city:'Paris',pre:'en',flag:'🇫🇷',fr:'France',en:'France',grad:'linear-gradient(135deg,#0B2A5B,#2E5FB8)',
  fr_d:"Large offre d'universités publiques et d'écoles, procédure « Études en France » pour de nombreux pays dont le Congo.",en_d:"Wide range of public universities and schools; the 'Études en France' procedure applies to many countries including Congo.",
  fr_k:["Procédure Campus France / Études en France","Visa long séjour études","Rentrée principale : septembre"],
  en_k:["Campus France / Études en France procedure","Long-stay student visa","Main intake: September"]},
 {id:'belgique',feat:1,reg:'eu',code:'BRU',city:'Bruxelles',pre:'en',flag:'🇧🇪',fr:'Belgique',en:'Belgium',grad:'linear-gradient(135deg,#1F1F1F,#C9A400)',
  fr_d:"Universités et hautes écoles en Fédération Wallonie-Bruxelles, enseignement en français.",en_d:"Universities and colleges in the Wallonia-Brussels Federation, taught in French.",
  fr_k:["Équivalence de diplôme à prévoir","Visa étudiant de type D","Rentrée principale : septembre"],
  en_k:["Diploma equivalence to plan for","Type D student visa","Main intake: September"]},
 {id:'maroc',feat:1,reg:'af',code:'RBA',city:'Rabat',pre:'au',flag:'🇲🇦',fr:'Maroc',en:'Morocco',grad:'linear-gradient(135deg,#0E6B3A,#C1272D)',
  fr_d:"Destination francophone proche, établissements publics et privés, coûts de vie modérés.",en_d:"Nearby French-speaking destination with public and private institutions and moderate living costs.",
  fr_k:["Accueil d'étudiants d'Afrique subsaharienne","Formalités selon nationalité","Rentrée principale : septembre"],
  en_k:["Welcomes students from sub-Saharan Africa","Formalities depend on nationality","Main intake: September"]},
 {id:'suisse',reg:'eu',code:'GVA',city:'Genève',pre:'en',fr:'Suisse',en:'Switzerland',grad:'linear-gradient(135deg,#B3122E,#E5484D)',cities:['Genève','Lausanne','Fribourg'],
  fr_d:"Universités réputées et hautes écoles spécialisées, enseignement en français à Genève, Lausanne, Neuchâtel ou Fribourg.",en_d:"Renowned universities and universities of applied sciences, with French-taught programmes in Geneva, Lausanne, Neuchâtel or Fribourg.",
  fr_k:["Visa national D puis permis de séjour pour études","Preuve de moyens financiers demandée","Rentrées : septembre, parfois février"],en_k:["National D visa then study residence permit","Proof of financial means required","Intakes: September, sometimes February"]},
 {id:'allemagne',reg:'eu',code:'FRA',city:'Francfort',pre:'en',fr:'Allemagne',en:'Germany',grad:'linear-gradient(135deg,#1A1A1A,#DD0000 60%,#FFCE00)',cities:['Berlin','Munich','Francfort'],
  fr_d:"Universités publiques aux frais de scolarité souvent faibles, nombreux programmes en anglais et en allemand.",en_d:"Public universities with often low tuition fees and many programmes taught in English and German.",
  fr_k:["Visa national pour études","Preuve financière, souvent via un compte bloqué","Rentrées : octobre (hiver) et avril (été)"],en_k:["National student visa","Proof of funds, often via a blocked account","Intakes: October (winter) and April (summer)"]},
 {id:'royaume-uni',reg:'eu',code:'LHR',city:'Londres',pre:'au',fr:'Royaume-Uni',en:'United Kingdom',grad:'linear-gradient(135deg,#012169,#C8102E)',cities:['Londres','Manchester','Édimbourg'],
  fr_d:"Universités anglophones reconnues mondialement, licences en trois ans et masters souvent en un an.",en_d:"World-renowned English-speaking universities, three-year bachelor's degrees and often one-year master's.",
  fr_k:["Student visa, avec le CAS délivré par l'établissement","Test d'anglais exigé","Rentrées : septembre, parfois janvier"],en_k:["Student visa, with the CAS issued by the institution","English test required","Intakes: September, sometimes January"]},
 {id:'espagne',reg:'eu',code:'MAD',city:'Madrid',pre:'en',fr:'Espagne',en:'Spain',grad:'linear-gradient(135deg,#AA151B,#F1BF00)',cities:['Madrid','Barcelone','Valence'],
  fr_d:"Universités publiques et privées, coût de la vie modéré, programmes en espagnol et en anglais.",en_d:"Public and private universities, moderate living costs, programmes in Spanish and English.",
  fr_k:["Visa d'études national","Assurance santé et preuve financière","Rentrée principale : septembre"],en_k:["National student visa","Health insurance and proof of funds","Main intake: September"]},
 {id:'italie',reg:'eu',code:'FCO',city:'Rome',pre:'en',fr:'Italie',en:'Italy',grad:'linear-gradient(135deg,#008C45,#CD212A)',cities:['Rome','Milan','Bologne'],
  fr_d:"Universités historiques, frais de scolarité publics modérés et nombreux programmes en anglais.",en_d:"Historic universities, moderate public tuition and many English-taught programmes.",
  fr_k:["Pré-inscription via le portail Universitaly","Visa d'études de type D","Rentrée principale : septembre-octobre"],en_k:["Pre-enrolment via the Universitaly portal","Type D student visa","Main intake: September–October"]},
 {id:'russie',reg:'eu',code:'SVO',city:'Moscou',pre:'en',fr:'Russie',en:'Russia',grad:'linear-gradient(135deg,#0039A6,#D52B1E)',cities:['Moscou','Saint-Pétersbourg','Kazan'],
  fr_d:"Grandes universités techniques et médicales, avec souvent une année préparatoire de langue russe.",en_d:"Major technical and medical universities, often with a preparatory Russian-language year.",
  fr_k:["Visa d'études sur invitation de l'université","Année préparatoire de langue fréquente","Rentrée principale : septembre"],en_k:["Student visa on the university's invitation","Preparatory language year is common","Main intake: September"]},
 {id:'turquie',reg:'eu',code:'IST',city:'Istanbul',pre:'en',fr:'Turquie',en:'Turkey',grad:'linear-gradient(135deg,#C8102E,#E30A17)',cities:['Istanbul','Ankara','Izmir'],
  fr_d:"Universités publiques et privées, programmes en anglais et en turc, coût de la vie accessible.",en_d:"Public and private universities, programmes in English and Turkish, affordable living costs.",
  fr_k:["Visa étudiant puis permis de séjour","Programmes en anglais ou en turc","Rentrées : septembre et février"],en_k:["Student visa then residence permit","Programmes in English or Turkish","Intakes: September and February"]},
 {id:'etats-unis',reg:'am',code:'JFK',city:'New York',pre:'aux',fr:'États-Unis',en:'United States',grad:'linear-gradient(135deg,#0A3161,#B31942)',cities:['New York','Boston','Atlanta'],
  fr_d:"Le plus grand choix d'universités et de colleges au monde, avec des bourses au mérite dans certains établissements.",en_d:"The world's widest choice of universities and colleges, with merit scholarships at some institutions.",
  fr_k:["Visa F-1, avec le formulaire I-20 de l'établissement","Tests d'anglais (TOEFL, IELTS…) souvent exigés","Rentrées : août-septembre, parfois janvier"],en_k:["F-1 visa, with the institution's I-20 form","English tests (TOEFL, IELTS…) often required","Intakes: August–September, sometimes January"]},
 {id:'senegal',reg:'af',code:'DSS',city:'Dakar',pre:'au',fr:'Sénégal',en:'Senegal',grad:'linear-gradient(135deg,#00853F,#FDEF42 50%,#E31B23)',cities:['Dakar','Saint-Louis','Thiès'],
  fr_d:"Destination francophone d'Afrique de l'Ouest, universités publiques et nombreuses écoles privées.",en_d:"French-speaking West African destination, public universities and many private schools.",
  fr_k:["Formalités d'entrée selon votre nationalité","Enseignement en français","Calendrier selon l'établissement"],en_k:["Entry formalities depend on nationality","Teaching in French","Calendar depends on the institution"]},
 {id:'cote-ivoire',reg:'af',code:'ABJ',city:'Abidjan',pre:'en',fr:'Côte d’Ivoire',en:'Côte d’Ivoire',grad:'linear-gradient(135deg,#F77F00,#009E60)',cities:['Abidjan','Yamoussoukro','Bouaké'],
  fr_d:"Pôle universitaire francophone avec grandes écoles d'ingénieurs, de commerce et universités publiques.",en_d:"French-speaking academic hub with engineering and business schools and public universities.",
  fr_k:["Formalités d'entrée selon votre nationalité","Enseignement en français","Calendrier selon l'établissement"],en_k:["Entry formalities depend on nationality","Teaching in French","Calendar depends on the institution"]},
 {id:'tunisie',reg:'af',code:'TUN',city:'Tunis',pre:'en',fr:'Tunisie',en:'Tunisia',grad:'linear-gradient(135deg,#C8102E,#E70013)',cities:['Tunis','Sousse','Sfax'],
  fr_d:"Universités publiques et privées, études de santé et d'ingénierie, enseignement en français.",en_d:"Public and private universities, health and engineering studies, teaching in French.",
  fr_k:["Formalités d'entrée selon votre nationalité","Enseignement majoritairement en français","Rentrée principale : septembre"],en_k:["Entry formalities depend on nationality","Mostly taught in French","Main intake: September"]},
 {id:'afrique-du-sud',reg:'af',code:'JNB',city:'Johannesburg',pre:'en',fr:'Afrique du Sud',en:'South Africa',grad:'linear-gradient(135deg,#007A4D,#FFB612 50%,#002395)',cities:['Johannesburg','Le Cap','Pretoria'],
  fr_d:"Universités anglophones parmi les mieux classées du continent.",en_d:"English-speaking universities among the highest-ranked on the continent.",
  fr_k:["Visa d'études (study visa)","Test d'anglais selon l'établissement","Année universitaire à partir de février"],en_k:["Study visa","English test depending on the institution","Academic year starts in February"]},
 {id:'chine',reg:'as',code:'PEK',city:'Pékin',pre:'en',fr:'Chine',en:'China',grad:'linear-gradient(135deg,#DE2910,#FFDE00)',cities:['Pékin','Shanghai','Wuhan'],
  fr_d:"Grandes universités en ingénierie, médecine et commerce, avec des bourses gouvernementales.",en_d:"Large universities in engineering, medicine and business, with government scholarships.",
  fr_k:["Visa X1, avec le formulaire JW202","Programmes en anglais ou en chinois","Rentrées : septembre, parfois mars"],en_k:["X1 visa, with the JW202 form","Programmes in English or Chinese","Intakes: September, sometimes March"]},
 {id:'coree-du-sud',reg:'as',code:'ICN',city:'Séoul',pre:'en',fr:'Corée du Sud',en:'South Korea',grad:'linear-gradient(135deg,#003478,#C60C30)',cities:['Séoul','Busan','Daejeon'],
  fr_d:"Universités technologiques de pointe et bourses pour étudiants internationaux.",en_d:"Leading technology universities and scholarships for international students.",
  fr_k:["Visa étudiant D-2","Cours de coréen souvent proposés","Rentrées : mars et septembre"],en_k:["D-2 student visa","Korean courses often offered","Intakes: March and September"]},
 {id:'malaisie',reg:'as',code:'KUL',city:'Kuala Lumpur',pre:'en',fr:'Malaisie',en:'Malaysia',grad:'linear-gradient(135deg,#010066,#CC0001)',cities:['Kuala Lumpur','Penang','Johor'],
  fr_d:"Universités anglophones et campus internationaux, coûts modérés.",en_d:"English-speaking universities and international branch campuses at moderate cost.",
  fr_k:["Student pass via EMGS","Enseignement en anglais","Plusieurs rentrées par an"],en_k:["Student pass via EMGS","Teaching in English","Several intakes a year"]},
 {id:'emirats',reg:'as',code:'DXB',city:'Dubaï',pre:'aux',fr:'Émirats arabes unis',en:'United Arab Emirates',grad:'linear-gradient(135deg,#00732F,#1A1A1A 55%,#FF0000)',cities:['Dubaï','Abou Dabi','Sharjah'],
  fr_d:"Campus internationaux d'universités étrangères et établissements locaux, enseignement en anglais.",en_d:"International branch campuses and local institutions, taught in English.",
  fr_k:["Visa étudiant parrainé par l'établissement","Enseignement en anglais","Rentrées : septembre et janvier"],en_k:["Student visa sponsored by the institution","Teaching in English","Intakes: September and January"]},
 {id:'australie',reg:'oc',code:'SYD',city:'Sydney',pre:'en',fr:'Australie',en:'Australia',grad:'linear-gradient(135deg,#00008B,#E4002B)',cities:['Sydney','Melbourne','Brisbane'],
  fr_d:"Universités anglophones de haut niveau et cadre de vie attractif.",en_d:"High-level English-speaking universities and an attractive lifestyle.",
  fr_k:["Student visa (subclass 500), avec la CoE de l'établissement","Test d'anglais exigé","Rentrées : février et juillet"],en_k:["Student visa (subclass 500), with the institution's CoE","English test required","Intakes: February and July"]}
];
const REGIONS=[['eu','Europe','Europe'],['am','Amériques','Americas'],['af','Afrique','Africa'],['as','Asie & Moyen-Orient','Asia & Middle East'],['oc','Océanie','Oceania']];
const FEAT=()=>COUNTRIES.filter(c=>c.feat);

const DOC_TYPES={
 id:{fr:"Passeport ou pièce d'identité",en:'Passport or ID document'},
 diploma:{fr:'Diplômes obtenus',en:'Diplomas obtained'},
 transcript:{fr:'Relevés de notes',en:'Academic transcripts'},
 cv:{fr:'Curriculum vitae',en:'Curriculum vitae'},
 letter:{fr:'Lettre de motivation',en:'Motivation letter'},
 lang:{fr:"Preuve de niveau d'anglais (IELTS, TOEFL…)",en:'English proficiency proof (IELTS, TOEFL…)'},
 photo:{fr:"Photo d'identité",en:'ID photo'}
};
function requiredDocs(app){
  const p=PROG(app.prog);const r=['id','diploma','transcript','cv','letter'];
  if(p&&p.lang==='EN')r.push('lang');
  if(app.country==='canada')r.push('photo');
  return r;
}
const STATUS={
 draft:{fr:'À compléter',en:'To complete',c:'grey'},
 submitted:{fr:'Soumis',en:'Submitted',c:''},
 review:{fr:'En vérification',en:'Under review',c:''},
 incomplete:{fr:'Pièces à compléter',en:'Documents required',c:'warn'},
 ready:{fr:'Prêt à transmettre',en:'Ready to send',c:'or'},
 transmitted:{fr:'Transmis',en:'Sent to institution',c:'or'},
 pending:{fr:'En attente de décision',en:'Awaiting decision',c:'or'},
 admitted:{fr:'Admis',en:'Admitted',c:'ok'},
 refused:{fr:'Refusé',en:'Refused',c:'err'},
 predeparture:{fr:'Accompagnement pré-départ',en:'Pre-departure support',c:'ok'},
 enrolled:{fr:'Inscrit',en:'Enrolled',c:'ok'},
 withdrawn:{fr:'Retiré',en:'Withdrawn',c:'grey'},
 closed:{fr:'Clôturé',en:'Closed',c:'grey'}
};
const PATH=['submitted','review','ready','transmitted','pending','admitted','predeparture','enrolled'];
const DOCST={pending:{fr:'À contrôler',en:'To check',c:''},ok:{fr:'Conforme',en:'Compliant',c:'ok'},illegible:{fr:'Illisible',en:'Illegible',c:'err'},expired:{fr:'Expirée',en:'Expired',c:'err'},replace:{fr:'À remplacer',en:'To replace',c:'warn'}};
const ROLES={candidat:{fr:'Candidat',en:'Applicant'},agent:{fr:'Agent admissions',en:'Admissions officer'},responsable:{fr:'Responsable admissions',en:'Admissions manager'},admin:{fr:'Administrateur',en:'Administrator'}};
const REL={partenaire:{fr:'Partenaire confirmé',en:'Confirmed partner',c:'ok'},discussion:{fr:'En discussion',en:'In discussion',c:'warn'},informatif:{fr:'Présenté à titre informatif',en:'Information only',c:'grey'}};

let S, lang='fr', route='accueil', ui={};
const ME=()=>S.users.find(u=>u.id===S.session);
const INST=id=>S.institutions.find(i=>i.id===id);
const PROG=id=>S.programs.find(p=>p.id===id);
const CTRY=id=>COUNTRIES.find(c=>c.id===id);
const USER=id=>S.users.find(u=>u.id===id);
function L(fr,en){return lang==='en'?en:fr}
function N(o){return o?(lang==='en'?(o.en??o.fr):o.fr):'—'}
function stTag(s){const x=STATUS[s]||{};return `<span class="tag ${x.c||''}">${esc(N(x))}</span>`}
function toast(t){const e=document.getElementById('toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),3200)}
function modal(html){document.getElementById('modal-c').innerHTML=html;document.getElementById('modal').classList.add('open')}
function closeModal(){document.getElementById('modal').classList.remove('open');document.getElementById('modal-c').classList.remove('wide')}
document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});

/* ---------- Navigation ---------- */
const LOGO_SRC='/logo.jpg';
const ICONS={
 arrow:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
 check:'<path d="M20 6 9 17l-5-5"/>',
 phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
 mail:'<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-9 5.7a2 2 0 0 1-2 0L2 7"/>',
 pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
 clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 compass:'<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
 filecheck:'<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5Z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>',
 award:'<circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/>',
 bank:'<path d="M3 22h18"/><path d="M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/><path d="m12 2 8 5H4Z"/>',
 home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/>',
 plane:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"/>',
 laptop:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
 cap:'<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/><path d="M22 10v6"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
 user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
 lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
 folder:'<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
 logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
 chart:'<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
 inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1Z"/>',
 building:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
 receipt:'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
 clip:'<path d="m21.4 11-9.2 9.3a6 6 0 0 1-8.5-8.5l8.6-8.6a4 4 0 1 1 5.7 5.7l-8.6 8.6a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
 chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
 sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
 history:'<path d="M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
 globe:'<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
 eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
 download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
 search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 book:'<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
 calendar:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
 link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.8 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
 external:'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
 alert:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
 camera:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/>',
 whatsapp:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9 10.5c.5 2 2.5 4 4.5 4.5l1.2-1.2 2 1c-.3 1.2-1.3 1.8-2.4 1.6-3-.6-5.6-3.2-6.2-6.2-.2-1.1.4-2.1 1.6-2.4l1 2Z"/>'
};
function ic(n,s){return `<svg class="i" width="${s||20}" height="${s||20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||''}</svg>`}
function im(n){return (typeof IMG!=='undefined'&&IMG[n])||('img/'+n+'.svg')}
const PHOTOS={hero:['accueil','Photo principale : étudiants','Main photo: students'],services:['conseiller','Entretien avec un conseiller','Meeting an adviser'],candidature:['etudiant-ordinateur','Étudiant sur ordinateur','Student on a laptop'],espace:['etudiant-ordinateur','Étudiant sur ordinateur','Student on a laptop'],partenaires:['campus','Campus universitaire','University campus'],apropos:['bureau','Bureau ou équipe Campus Monde','Campus Monde office or team'],contact:['facade','Entrée du bureau de Brazzaville','Brazzaville office entrance'],canada:['canada','Canada : ville ou campus','Canada: city or campus'],france:['france','France : ville ou campus','France: city or campus'],belgique:['belgique','Belgique : ville ou campus','Belgium: city or campus'],maroc:['maroc','Maroc : ville ou campus','Morocco: city or campus'],visa:['aeroport','Départ à l’aéroport','Airport departure'],logement:['logement','Logement étudiant','Student housing'],arrivee:['arrivee','Étudiants sur le campus','Students on campus'],bourses:['remise-diplome','Remise de diplôme','Graduation']};
function ph(k,cls,nocr){const p=PHOTOS[k]||[k,k,k];const f=p[0];const lib=S&&S.photos&&S.photos[f];const icn={hero:'cap',services:'users',candidature:'laptop',espace:'laptop',partenaires:'building',apropos:'users',contact:'building'}[k]||(String(k).startsWith('inst-')?'building':'globe');
  const src=lib?(lib.local?`photos/${f}.jpg`:lib.url):`photos/${f}.jpg`;const alt=lib?lib.title:L(p[1],p[2]);
  const cr=lib&&!nocr?`<a class="ph-cr" href="${lib.page}" target="_blank" rel="noopener" title="${esc(lib.title)} — ${L('voir la source et la licence','view source and licence')}">© ${esc(lib.author)} · ${esc(lib.license)}</a>`:'';
  return `<div class="photo ${cls||''}${lib?' has-lib':''}"><span class="ph-ph" aria-hidden="true"><i class="ph-o1"></i><i class="ph-o2"></i><span class="ph-ic">${ic(icn,34)}</span></span><img src="${src}" alt="${esc(alt)}" loading="lazy" decoding="async">${cr}</div>`}
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.parentElement&&t.parentElement.classList.contains('photo'))t.remove()},true);
const NAV=[['accueil','Accueil','Home'],['apropos','À propos','About'],['etudier','Étudier à l’étranger','Study abroad'],['etablissements','Écoles & universités','Schools & universities'],['formations','Formations','Programmes'],['services','Nos services','Services'],['faq','FAQ','FAQ'],['contact','Contact','Contact'],['actualites','Actualités','News'],['guides','Préparer son départ','Getting ready']];
const MENU=[
 {id:'etudier',fr:'Étudier à l’étranger',en:'Study abroad',cols:[{fr:'Destinations',en:'Destinations',links:[['pays-canada','Canada','Canada'],['pays-france','France','France'],['pays-belgique','Belgique','Belgium'],['pays-maroc','Maroc','Morocco'],['pays-royaume-uni','Royaume-Uni','United Kingdom'],['pays-etats-unis','États-Unis','United States'],['pays-allemagne','Allemagne','Germany'],['pays-chine','Chine','China'],['etudier','Toutes les destinations →','All destinations →']]},{fr:'Bien préparer',en:'Plan ahead',links:[['etudier','Calendrier et coûts à prévoir','Timeline and costs'],['etablissements','Écoles & universités','Schools & universities'],['guides','Toutes les démarches','All procedures']]}],feat:['hero','etudier','Comparer les destinations','Compare destinations','Calendrier conseillé, budget et établissements par pays.','Recommended timeline, budget and institutions by country.']},
 {id:'formations',fr:'Choisir sa formation',en:'Choose a programme',cols:[{fr:'Rechercher',en:'Search',links:[['formations','Moteur de recherche des formations','Programme search'],['etablissements','Écoles & universités','Schools & universities']]},{fr:'Par niveau',en:'By level',links:[['formations-licence','Licence / Bachelor','Bachelor'],['formations-master','Master','Master']]}],feat:['candidature','formations','Trouver ma formation','Find my programme','Intitulé, niveau, pays, langue d’enseignement et durée.','Title, level, country, language and duration.']},
 {id:'depart',fr:'Préparer son départ',en:'Getting ready',cols:[{fr:'Les démarches',en:'Procedures',links:[['guide-candidature','Candidater','Applying','candidature'],['guide-bourses','Bourses','Scholarships'],['guide-visa','Visa études','Student visa'],['guide-logement','Logement','Housing'],['guide-avi','AVI','AVI'],['guide-arrivee','Arriver et s’installer','Arrival and settling in']]}],feat:['espace','guides','Tous les guides pratiques','All practical guides','Chaque démarche expliquée étape par étape, avec les sites officiels.','Each procedure explained step by step, with official websites.']},
 {id:'agence',fr:'Campus Monde',en:'Campus Monde',cols:[{fr:'L’agence',en:'The agency',links:[['apropos','Qui sommes-nous','About us'],['services','Nos services','Our services'],['candidater','Déposer une candidature','Apply']]},{fr:'Aide',en:'Help',links:[['faq','Questions fréquentes','FAQ'],['contact','Nous contacter','Contact us'],['espace','Espace étudiant','Student area']]}],feat:['apropos','contact','Rencontrer un conseiller','Meet an adviser','Au bureau de Brazzaville, par téléphone ou sur WhatsApp.','At the Brazzaville office, by phone or on WhatsApp.']}
];
const GROUP={etudier:'etudier',pays:'etudier',etablissements:'formations',etab:'formations',formations:'formations',guides:'depart',guide:'depart',apropos:'agence',services:'agence',faq:'agence',contact:'agence',candidater:'agence'};
function megaMenu(base){
  return MENU.map(m=>`<div class="mm-item${GROUP[base]===m.id?' on':''}"><button class="mm-top" data-mm="${m.id}" aria-expanded="false">${L(m.fr,m.en)}<svg class="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="mm-panel"><div class="wrap mm-in">${m.cols.map(c=>`<div class="mm-col"><p class="mm-h">${L(c.fr,c.en)}</p><ul>${c.links.map(l=>`<li><a href="#${l[0]}">${L(l[1],l[2])}</a></li>`).join('')}</ul></div>`).join('')}<a class="mm-feat" href="#${m.feat[1]}">${ph(m.feat[0],'mm-ph')}<span><strong>${L(m.feat[2],m.feat[3])}</strong><span>${L(m.feat[4],m.feat[5])}</span></span></a></div></div></div>`).join('')+`<a class="mm-link${base==='actualites'?' on':''}" href="#actualites">${L('Actualités','News')}</a><a href="#espace" class="mob-only">${L('Espace étudiant','Student area')}</a><a href="#candidater" class="mob-only">${L('Déposer une candidature','Apply now')}</a>`;
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-mm]');
  if(t){e.preventDefault();const it=t.parentElement;const was=it.classList.contains('open');document.querySelectorAll('.mm-item.open').forEach(x=>{x.classList.remove('open');x.querySelector('.mm-top').setAttribute('aria-expanded','false')});if(!was){it.classList.add('open');t.setAttribute('aria-expanded','true')}return}
  if(!e.target.closest('.mm-item'))document.querySelectorAll('.mm-item.open').forEach(x=>x.classList.remove('open'));
  if(e.target.closest('#btn-search')){e.preventDefault();openSearch()}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.mm-item.open').forEach(x=>x.classList.remove('open'));if(document.getElementById('modal').classList.contains('open'))closeModal()}});
function openSearch(){
  modal(`<form class="search-modal" data-search="1" role="search"><label for="sq">${L('Rechercher une formation, une école ou une démarche','Search a programme, a school or a procedure')}</label><div class="sm-row">${ic('search',22)}<input id="sq" name="q" placeholder="${L('Ex. : informatique, master, Canada, visa','E.g. computer science, master, Canada, visa')}" autocomplete="off"><button class="btn btn-o">${L('Rechercher','Search')}</button></div></form><p class="mm-h" style="margin-top:22px">${L('Accès directs','Quick links')}</p><div class="sm-links">${[['formations',L('Toutes les formations','All programmes')],['etablissements',L('Écoles & universités','Schools & universities')],['guide-candidature',L('Comment candidater','How to apply')],['guide-visa',L('Visa études','Student visa')],['guide-bourses',L('Bourses','Scholarships')],['contact',L('Contacter un conseiller','Contact an adviser')]].map(l=>`<a href="#${l[0]}" data-act="close">${l[1]}</a>`).join('')}</div>`);
  setTimeout(()=>{const i=document.getElementById('sq');if(i)i.focus()},50);
}
document.addEventListener('submit',e=>{
  const f=e.target;if(!f.dataset)return;
  if(f.dataset.search){e.preventDefault();const q=f.q.value.trim();closeModal();const g=typeof GUIDES!=='undefined'&&GUIDES.find(x=>q&&(x.fr+' '+x.en).toLowerCase().includes(q.toLowerCase()));if(g){go('guide-'+g.id);return}ui.pq=q;ui.pl='';ui.pc='';if(location.hash==='#formations')rerender();else go('formations');return}
  if(f.dataset.newsletter){e.preventDefault();const em=f.email.value.trim();const ok=f.consent.checked;const out=f.querySelector('.nl-msg');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)||!ok){out.textContent=L('Indiquez une adresse e-mail valide et cochez la case.','Enter a valid email address and tick the box.');return}
    const done=()=>{f.innerHTML=`<p class="nl-ok">${ic('check',18)} ${L('Inscription enregistrée. Vous recevrez nos prochaines informations.','You are subscribed. You will receive our next updates.')}</p>`};
    if(typeof api==='function')api('POST','/api/contact',{kind:'newsletter',name:'Abonné lettre d’information',email:em,msg:'Inscription à la lettre d’information',consent:true}).then(done).catch(x=>{out.textContent=x.message});
    else{try{S.contacts.unshift({at:now(),kind:'newsletter',name:'Abonné',email:em,phone:'',dest:'',msg:'Inscription à la lettre d’information'});persist()}catch(x){}done()}}
});
function go(r){location.hash=r}
function chrome(){
  document.documentElement.lang=lang;
  document.getElementById('slogan').textContent=L('Votre avenir, notre mission','Your future, our mission');
  document.getElementById('tb-l').innerHTML=`${ic('pin',15)} ${L('211, avenue de la Base, Batignolles (arrêt Bopaka), Brazzaville','211 avenue de la Base, Batignolles (Bopaka stop), Brazzaville')}`;
  const base=route.split('-')[0];
  document.getElementById('menu').innerHTML=megaMenu(base);
  document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('on',b.dataset.lang===lang));
  document.getElementById('btn-espace').innerHTML=`${ic('user',17)} ${ME()?L('Mon espace','My area'):L('Espace étudiant','Student area')}`;
  document.getElementById('btn-cand').textContent=L('Candidater','Apply now');
  const bs=document.getElementById('btn-search');if(bs)bs.setAttribute('aria-label',L('Rechercher','Search'));
  const rb=document.getElementById('ribbon');if(rb&&typeof ribbonHTML==='function')rb.innerHTML=ribbonHTML();
  document.getElementById('foot').innerHTML=`<div class="foot-nl"><div class="wrap"><div class="nl-card"><div class="nl-in"><div class="nl-txt"><span class="nl-ic">${ic('mail',26)}</span><div><span class="kicker">Newsletter</span><h3>${L('La lettre d’information Campus Monde','The Campus Monde newsletter')}</h3><p>${L('Calendriers de candidature, ouvertures de formations et séances d’information : une lettre par mois, au plus.','Application deadlines, programme openings and information sessions: one email a month at most.')}</p></div></div><form class="nl-form" data-newsletter="1" novalidate><div class="nl-row"><input name="email" type="email" placeholder="${L('Votre adresse e-mail','Your email address')}" aria-label="E-mail" autocomplete="email"><button class="btn btn-o">${L('M’inscrire','Subscribe')}</button></div><label class="chk"><input type="checkbox" name="consent"> ${L('J’accepte de recevoir la lettre d’information et je peux me désinscrire à tout moment.','I agree to receive the newsletter and can unsubscribe at any time.')}</label><p class="nl-msg" role="status"></p></form></div></div></div></div>
  <div class="wrap"><div class="foot-g">
   <div class="foot-brand"><img src="${LOGO_SRC}" alt="Campus Monde" class="foot-logo"><p>${L('Centre culturel, d’encadrement, d’information et d’orientation scolaire et professionnelle. Filiale de Billenium Conciergerie.','Cultural, guidance and academic & career counselling centre. A subsidiary of Billenium Conciergerie.')}</p><p class="foot-meta">${L('Recrutement et accompagnement des étudiants internationaux. Siège en République du Congo ; étudiants originaires de la République du Congo et d’Afrique centrale.','Recruitment and support of international students. Based in the Republic of Congo; students from the Republic of Congo and Central Africa.')}</p></div>
   <div><h4>${L('Étudier à l’étranger','Study abroad')}</h4><ul>${FEAT().map(c=>`<li><a href="#pays-${c.id}">${N(c)}</a></li>`).join('')}<li><a href="#etudier">${L('Toutes les destinations','All destinations')} →</a></li><li><a href="#formations">${L('Formations','Programmes')}</a></li><li><a href="#etablissements">${L('Écoles & universités','Schools & universities')}</a></li></ul></div>
   <div><h4>${L('Préparer son départ','Getting ready')}</h4><ul>${(typeof GUIDES!=='undefined'?GUIDES:[]).map(g=>`<li><a href="#guide-${g.id}">${L(g.fr,g.en)}</a></li>`).join('')}</ul></div>
   <div><h4>Campus Monde</h4><ul><li><a href="#apropos">${L('Qui sommes-nous','About us')}</a></li><li><a href="#services">${L('Nos services','Our services')}</a></li><li><a href="#actualites">${L('Actualités','News')}</a></li><li><a href="#faq">${L('Questions fréquentes','FAQ')}</a></li><li><a href="#espace">${L('Espace étudiant','Student area')}</a></li><li><a href="#admin">${L('Accès personnel','Staff access')}</a></li></ul></div>
   <div><h4>${L('Nous trouver','Find us')}</h4><ul class="foot-contact"><li>${ic('pin',16)}<span>211, avenue de la Base, Batignolles, arrêt Bopaka, Brazzaville, Congo</span></li><li>${ic('phone',16)}<span>+242 06 683 83 55<br>+242 05 350 50 12</span></li><li>${ic('mail',16)}<span>Billenium.corp@gmail.com</span></li><li>${ic('whatsapp',16)}<a href="${WA}" target="_blank" rel="noopener">${L('Écrire sur WhatsApp','Message on WhatsApp')}</a></li></ul></div>
  </div><div class="foot-map"><div><h4>${L('Nos destinations dans le monde','Our destinations worldwide')}</h4><p>${L('Depuis Brazzaville, nous accompagnons les étudiants vers les universités d’Europe, des Amériques, d’Afrique, d’Asie et d’Océanie.','From Brazzaville, we support students towards universities in Europe, the Americas, Africa, Asia and Oceania.')}</p><div class="fm-n"><div><b>${COUNTRIES.length}</b><span>${L('pays','countries')}</span></div><div><b>${((typeof S!=='undefined'&&S.institutions)||[]).length||'—'}</b><span>${L('établissements','institutions')}</span></div></div></div>${worldMap()}</div><div class="foot-b"><span>© ${new Date().getFullYear()} Campus Monde, Billenium Conciergerie</span><span class="foot-legal"><a href="#legal">${L('Mentions légales','Legal notice')}</a><a href="#legal">${L('Confidentialité','Privacy')}</a><a href="#legal">Cookies</a><a href="#legal">${L('Conditions d’utilisation','Terms of use')}</a></span></div></div>`;
}
function render(){
  route=(location.hash||'#accueil').slice(1)||'accueil';
  const [base,...rest]=route.split('-');const arg=rest.join('-');
  if(base==='formations'&&(arg==='licence'||arg==='master')){ui.pl=arg;ui.pc='';ui.pq=''}
  if(base==='espace'&&['rdv','new','profile','apps','mail','security'].includes(arg)){ui.ctab=arg;ui.appId=null;try{history.replaceState(null,'','#espace')}catch(e){}}
  const V={accueil:vHome,apropos:vAbout,etudier:vStudy,pays:()=>vCountry(arg),etablissements:vInsts,etab:()=>vInst(arg),formations:vProgs,services:vServices,candidater:vApply,faq:vFaq,contact:vContact,legal:vLegal,espace:vSpace,admin:vAdmin,guides:vGuides,guide:()=>vGuide(arg),actualites:vNews,verif:()=>vVerif(arg)}[base]||vHome;
  chrome();
  document.body.classList.remove('console');
  document.getElementById('app').innerHTML=V();
  document.getElementById('menu').classList.remove('open');
  document.body.classList.toggle('is-home',base==='accueil');
  const t={accueil:L('Étudier à l’international','Study abroad'),espace:L('Espace étudiant','Student area'),admin:'Back-office',pays:L('Destinations','Destinations'),etab:L('Écoles & universités','Schools & universities'),guide:L('Préparer son départ','Getting ready')}[base];
  document.title='Campus Monde | '+(t||(NAV.find(n=>n[0]===base)?L(NAV.find(n=>n[0]===base)[1],NAV.find(n=>n[0]===base)[2]):''));
  after&&after();after=null;
  showDevCode();watchPayment();if(typeof cxAfter==='function')cxAfter();
}
let after=null;
/* Mode local : affiche et pré-remplit le code (MFA, vérification e-mail, réinitialisation). Désactivé en production. */
function showDevCode(){
  const forms=[['mfa',S&&S.devCode],['verify',S&&S.devCode],['reset',ui.devReset]];
  for(const [f,code] of forms){
    if(!code)continue;
    const fm=document.querySelector(`#app form[data-form="${f}"]`);if(!fm)continue;
    const i=fm.querySelector('input[name=code]');if(i&&!i.value)i.value=code;
    if(!fm.querySelector('.devcode')){const d=document.createElement('div');d.className='alert ok devcode';d.style.marginBottom='12px';
      d.innerHTML=`<b>${L('Mode local','Local mode')}</b> — ${L('code','code')} : <code style="font-size:1.15em;letter-spacing:2px">${esc(code)}</code><br><span class="small">${L('Affiché uniquement en local, jamais en production.','Shown in local mode only, never in production.')}</span>`;fm.prepend(d)}
  }
}
function rerender(){const y=scrollY;render();scrollTo(0,y)}
window.addEventListener('hashchange',()=>{ui={...ui,msg:ui.keepMsg?ui.msg:null,keepMsg:0};render();scrollTo(0,0)});
window.addEventListener('scroll',()=>{const h=document.querySelector('header.top');if(h)h.classList.toggle('scrolled',scrollY>8)},{passive:true});
function pageH(title,sub,crumb,img){return `<section class="page-h"><div class="wrap${img?' ph-grid':''}"><div>${crumb?`<nav class="crumb" aria-label="${L('Fil d’Ariane','Breadcrumb')}"><a href="#accueil">${L('Accueil','Home')}</a><span>/</span>${crumb}</nav>`:''}<h1>${title}</h1>${sub?`<p class="lead">${sub}</p>`:''}</div>${img?`<div class="ph-art">${ph(img)}</div>`:''}</div></section>`}

/* ---------- Console (espace étudiant & administration) ---------- */
function consoleShell(kind,u,items,tab,body){
  document.body.classList.add('console');
  const isA=kind==='admin';const act=isA?'atab':'ctab';
  const unread=S.outbox.filter(m=>m.to===u.email&&!m.read).length;
  if(!items)items=[['apps',ic('folder'),L('Mes candidatures','My applications')],['new',ic('plus'),L('Nouvelle candidature','New application')],['rdv',ic('calendar'),L('Mon entretien','My meeting')],['profile',ic('user'),L('Mon profil','My profile')],['mail',ic('bell'),L('Notifications','Notifications')],['security',ic('lock'),L('Sécurité','Security')]];
  const cur=isA?(tab==='file'?'apps':tab):(tab==='app'?'apps':tab);
  const svc=isA?L('Console d’administration','Admin console'):L('Espace étudiant','Student area');
  const cl=(items.find(x=>x[0]===cur)||[])[2]||'';
  let ref='';
  if(isA&&tab==='file'){const a=S.apps.find(x=>x.id===ui.fileId);ref=a?a.ref:''}
  if(!isA&&tab==='app'){const a=S.apps.find(x=>x.id===ui.appId);ref=a?(a.status==='draft'?L('Nouvelle candidature','New application'):a.ref):''}
  const bell=isA?(typeof myApps==='function'?myApps(u).filter(a=>['submitted'].includes(a.status)).length:0):unread;
  const crumbs=[`<a href="#accueil">Campus Monde</a>`,`<a href="#" data-act="${act}" data-id="${items[0][0]}">${svc}</a>`];
  if(cl&&cur!==items[0][0]||ref)crumbs.push(ref?`<a href="#" data-act="${act}" data-id="${cur}">${cl}</a>`:`<span>${cl}</span>`);
  if(ref)crumbs.push(`<span>${esc(ref)}</span>`);
  return `<div class="cs">
  <header class="cs-top">
   <a class="cs-brand" href="#accueil" title="${L('Retour au site','Back to website')}"><img src="${LOGO_SRC}" alt="Campus Monde"></a>
   <span class="cs-svc">${svc}</span>
   ${isA?`<form class="cs-search" data-cs-search="1" role="search">${ic('search',16)}<input name="q" placeholder="${L('Rechercher un dossier ou un candidat','Search an application or applicant')}" aria-label="${L('Rechercher','Search')}" autocomplete="off"></form>`:'<span class="cs-fill"></span>'}
   <div class="cs-right">
    <span class="cs-region">${ic('pin',15)} Brazzaville</span>
    <div class="cs-lang" role="group" aria-label="Langue"><button data-lang="fr" class="${lang==='fr'?'on':''}">FR</button><button data-lang="en" class="${lang==='en'?'on':''}">EN</button></div>
    <button class="cs-ic" data-act="${act}" data-id="${isA?'apps':'mail'}" title="${isA?L('Dossiers à traiter','Files to process'):L('Notifications','Notifications')}">${ic('bell',18)}${bell?`<span class="cs-dot">${bell}</span>`:''}</button>
    <div class="cs-user"><button class="cs-user-btn" data-csmenu="1" aria-haspopup="true">${typeof avatar==='function'?avatar(u,26):ic('user',16)}<span>${esc(u.name)}</span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
     <div class="cs-menu"><div class="cs-menu-h"><b>${esc(u.name)}</b><span>${esc(u.email)}</span><span class="cs-role">${N(ROLES[u.role])}</span></div>${isA?'':`<button data-act="ctab" data-id="profile">${ic('user',16)} ${L('Mon profil','My profile')}</button><button data-act="ctab" data-id="security">${ic('lock',16)} ${L('Sécurité','Security')}</button>`}<a href="#accueil">${ic('globe',16)} ${L('Site public','Public website')}</a><button data-act="logout">${ic('logout',16)} ${L('Se déconnecter','Log out')}</button></div></div>
   </div>
  </header>
  <div class="cs-body">
   <nav class="cs-nav" aria-label="${svc}"><div class="cs-nav-h">${svc}</div>
    ${items.map(x=>`<button class="${cur===x[0]?'on':''}" data-act="${act}" data-id="${x[0]}">${x[1]}<span>${x[2]}</span>${!isA&&x[0]==='mail'&&unread?`<em class="cs-count">${unread}</em>`:''}</button>`).join('')}
    <div class="cs-nav-sep"></div>
    <a href="#faq">${ic('book',18)}<span>${L('Aide et FAQ','Help and FAQ')}</span></a><a href="#contact">${ic('chat',18)}<span>${L('Contacter Campus Monde','Contact Campus Monde')}</span></a><a href="#accueil">${ic('external',18)}<span>${L('Site public','Public website')}</span></a>
   </nav>
   <main class="cs-main">
    <nav class="cs-crumbs" aria-label="${L('Fil d’Ariane','Breadcrumb')}">${crumbs.join('<span class="cs-sep">›</span>')}</nav>
    ${ui.msg?`<div class="cs-flash ${ui.msg.t}" role="status">${ic(ui.msg.t==='ok'?'check':ui.msg.t==='err'?'alert':'bell',18)}<span>${ui.msg.m}</span></div>`:''}
    <div class="cs-content">${body}</div>
   </main>
  </div>
  <footer class="cs-foot"><span>© ${new Date().getFullYear()} Campus Monde</span><a href="#legal">${L('Confidentialité','Privacy')}</a><a href="#legal">${L('Conditions d’utilisation','Terms of use')}</a></footer>
 </div>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-csmenu]');
  if(b){e.preventDefault();b.parentElement.classList.toggle('open');return}
  if(!e.target.closest('.cs-user'))document.querySelectorAll('.cs-user.open').forEach(x=>x.classList.remove('open'));
});
document.addEventListener('submit',e=>{const f=e.target;if(!f.dataset||!f.dataset.csSearch)return;e.preventDefault();ui.af={...(ui.af||{}),q:f.q.value.trim()};ui.atab='apps';ui.msg=null;rerender()});

/* ---------- Pages publiques ---------- */
const WA='https://wa.me/242066838355?text='+encodeURIComponent('Bonjour Campus Monde, je souhaite des informations pour étudier à l’étranger.');
const MAP='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('211 avenue de la Base, Batignolles, Brazzaville, Congo');
const ROUTES={canada:{code:'YUL',city:'Montréal',x:71,y:80,q:[215,150],lx:14,ly:-8,anchor:'start'},france:{code:'CDG',city:'Paris',x:398,y:61,q:[468,200],lx:-14,ly:-6,anchor:'end'},belgique:{code:'BRU',city:'Bruxelles',x:406,y:50,q:[512,180],lx:14,ly:-6,anchor:'start'},maroc:{code:'RBA',city:'Rabat',x:358,y:143,q:[372,262],lx:-14,ly:4,anchor:'end'}};
const CITIES={canada:['Montréal','Québec'],france:['Paris','Nancy','Strasbourg'],belgique:['Bruxelles','Louvain-la-Neuve'],maroc:['Rabat']};
const SERVICES=[
 ['compass','Orientation','Guidance',"Un conseiller étudie avec vous vos résultats, votre projet professionnel et votre budget pour choisir le pays et les formations adaptés.","An adviser reviews your grades, career goals and budget with you to choose the right country and programmes."],
 ['filecheck','Admission','Admissions',"Nous constituons le dossier avec vous, vérifions chaque pièce et le transmettons à l’établissement par un canal officiel.","We build your file with you, check every document and send it to the institution through an official channel."],
 ['award','Bourses','Scholarships',"Nous vous informons sur les bourses existantes et leurs conditions. Leur attribution dépend des organismes qui les financent.","We tell you which scholarships exist and their conditions. Awards depend on the bodies that fund them."],
 ['bank','AVI','AVI',"Assistance pour les démarches liées à l’AVI. Le périmètre exact est présenté par votre conseiller.","Help with AVI-related formalities. Your adviser explains the exact scope."],
 ['home','Logement','Housing',"Recherche d’un logement et conseils pratiques pour vos premières semaines sur place.","Finding accommodation and practical advice for your first weeks abroad."],
 ['plane','Visa études','Student visa',"Préparation du dossier de visa et des rendez-vous. La décision revient aux autorités consulaires.","Preparing your visa file and appointments. The decision rests with consular authorities."],
 ['laptop','Formations à Brazzaville','Training in Brazzaville',"Cours de langues, d’informatique et formations professionnelles pour renforcer votre dossier avant le départ.","Language, IT and professional courses to strengthen your profile before you leave."]
];
const RUBRIQUES=[
 ['candidater','candidature','Candidature en ligne','Online application',"Créez votre compte, décrivez votre projet et déposez vos pièces.","Create your account, describe your project and upload your documents."],
 ['services','services','Nos services','Our services',"De l’orientation au visa, avec un seul interlocuteur.","From guidance to visa, with a single contact."],
 ['etablissements','partenaires','Écoles & universités','Schools & universities',"Établissements, formations et conditions d’admission.","Institutions, programmes and admission requirements."],
 ['espace','espace','Espace étudiant','Student area',"Suivez votre dossier et échangez avec votre conseiller.","Track your file and talk to your adviser."],
 ['apropos','apropos','À propos','About us',"Notre agence, notre équipe et notre société mère.","Our agency, our team and our parent company."],
 ['contact','contact','Contact','Contact',"Téléphone, WhatsApp et plan d’accès au bureau.","Phone, WhatsApp and directions to our office."]
];
const FAQ=[
 ["Campus Monde garantit-il l’admission ?","Does Campus Monde guarantee admission?","Non. Les établissements décident seuls des admissions. Notre rôle est de vous aider à présenter un dossier complet et cohérent, envoyé au bon interlocuteur.","No. Institutions alone decide on admissions. Our job is to help you submit a complete, consistent file to the right contact."],
 ["Puis-je obtenir une bourse ?","Can I get a scholarship?","Nous vous présentons les bourses existantes et leurs conditions. L’attribution dépend des organismes qui les financent et n’est jamais garantie.","We explain the scholarships available and their conditions. Awards depend on the funding bodies and are never guaranteed."],
 ["Comment suivre mon dossier ?","How do I track my file?","Dans votre espace étudiant : chaque étape, chaque demande de pièce et chaque message y apparaissent avec leur date.","In your student area: every step, document request and message is shown with its date."],
 ["Mes documents sont-ils protégés ?","Are my documents protected?","Oui. Seuls vous et les conseillers habilités y ont accès. Nos e-mails ne contiennent jamais vos documents.","Yes. Only you and authorised advisers can access them. Our emails never contain your documents."],
 ["Quels sont vos horaires ?","What are your opening hours?","Du lundi au vendredi de 8 h 30 à 17 h 30, le samedi de 9 h à 13 h (horaires à confirmer).","Monday to Friday 8:30am–5:30pm, Saturday 9am–1pm (to be confirmed)."],
 ["Que signifie AVI ?","What does AVI mean?","L’AVI fait partie de nos services d’assistance. Votre conseiller vous en précise la définition et le périmètre.","AVI is one of our assistance services. Your adviser explains its definition and scope."]
];

const OFFICIAL={campusfrance:['Campus France','https://www.campusfrance.org/fr'],francevisas:['France-Visas','https://france-visas.gouv.fr'],canada:['Immigration Canada (IRCC)','https://www.canada.ca/fr/immigration-refugies-citoyennete/services/etudier-canada.html'],dofi:['Office des Étrangers (Belgique)','https://dofi.ibz.be'],amci:['AMCI (Maroc)','https://www.amci.ma']};
const GUIDES=[
 {id:'candidature',ic:'filecheck',img:'services',fr:'Candidater',en:'Applying',
  ifr:'Comment se déroule une candidature avec Campus Monde, du premier rendez-vous à la réponse de l’établissement.',ien:'How an application works with Campus Monde, from the first meeting to the institution’s reply.',
  steps:[['Faire le point avec un conseiller','Meet an adviser','Résultats, projet professionnel, budget et langue : nous identifions ensemble les formations réalistes.','Grades, career plans, budget and language: together we identify realistic programmes.'],['Créer votre compte','Create your account','Inscrivez-vous en ligne, vérifiez votre e-mail et complétez votre profil.','Sign up online, verify your email and complete your profile.'],['Préparer les pièces','Prepare documents','Pièce d’identité, diplômes, relevés de notes, CV, lettre de motivation et, selon la formation, test de langue.','ID, diplomas, transcripts, CV, motivation letter and, depending on the programme, a language test.'],['Déposer et suivre','Submit and track','Après vérification par nos conseillers, le dossier est transmis à l’établissement. Vous suivez chaque étape dans votre espace.','After our advisers check it, the file is sent to the institution. You follow each step in your area.']],links:[],cta:['candidater','Déposer une candidature','Apply now']},
 {id:'bourses',ic:'award',img:'bourses',fr:'Bourses',en:'Scholarships',
  ifr:'Les bourses existent, mais elles sont sélectives et leurs calendriers sont souvent en avance sur les admissions.',ien:'Scholarships exist, but they are selective and their deadlines often come before admissions.',
  steps:[['Repérer les bourses possibles','Identify possible scholarships','Bourses des gouvernements, des établissements ou d’organismes privés : nous vous aidons à repérer celles qui correspondent à votre profil.','Government, institution or private scholarships: we help you find those matching your profile.'],['Vérifier les conditions','Check the conditions','Niveau, âge, nationalité, résultats et pièces exigées varient d’une bourse à l’autre.','Level, age, nationality, grades and required documents vary from one scholarship to another.'],['Respecter le calendrier','Meet the deadlines','Certaines bourses se demandent un an avant la rentrée : anticipez.','Some scholarships must be requested a year before the intake: plan ahead.'],['Prévoir un plan de financement','Plan your funding','Une bourse n’est jamais garantie : votre dossier doit aussi prévoir d’autres sources de financement.','A scholarship is never guaranteed: your file must also plan other funding sources.']],links:['campusfrance','amci'],cta:['contact','Demander conseil','Ask an adviser']},
 {id:'visa',ic:'plane',img:'visa',fr:'Visa études',en:'Student visa',
  ifr:'Une fois admis, vous demandez le titre de séjour pour études du pays d’accueil. Les règles et délais varient selon le pays.',ien:'Once admitted, you apply for the host country’s student permit. Rules and timelines vary by country.',
  steps:[['Obtenir l’admission','Get admitted','La lettre d’admission de l’établissement est la base de la demande.','The institution’s admission letter is the basis of the application.'],['Réunir les justificatifs','Gather supporting documents','Passeport valide, preuve de ressources financières, assurance, logement : la liste exacte dépend du pays.','Valid passport, proof of funds, insurance, housing: the exact list depends on the country.'],['Déposer la demande','Submit the application','Sur le site officiel du pays, puis rendez-vous pour les données biométriques si nécessaire.','On the country’s official website, then a biometrics appointment if required.'],['Attendre la décision','Wait for the decision','La décision appartient aux autorités consulaires. Prévoyez plusieurs semaines.','The decision belongs to consular authorities. Allow several weeks.']],links:['francevisas','canada','dofi'],cta:['contact','Préparer mon visa avec un conseiller','Prepare my visa with an adviser']},
 {id:'logement',ic:'home',img:'logement',fr:'Logement',en:'Housing',
  ifr:'Trouver un logement avant le départ est souvent exigé pour le visa et toujours rassurant pour l’arrivée.',ien:'Finding housing before departure is often required for the visa and always reassuring on arrival.',
  steps:[['Choisir le type de logement','Choose the type of housing','Résidence universitaire, studio privé, colocation ou famille d’accueil.','University residence, private studio, flat share or host family.'],['Fixer un budget','Set a budget','Loyer, caution, assurance habitation et charges selon la ville.','Rent, deposit, home insurance and charges depending on the city.'],['Se méfier des arnaques','Watch out for scams','Ne versez jamais d’argent pour un logement que personne n’a pu vérifier.','Never pay for accommodation nobody has been able to verify.'],['Préparer l’arrivée','Prepare arrival','Gardez le contrat et les coordonnées du bailleur avec vous pendant le voyage.','Keep the contract and landlord’s contact details with you while travelling.']],links:[],cta:['contact','Être aidé pour mon logement','Get help with housing']},
 {id:'avi',ic:'bank',img:'services',fr:'AVI',en:'AVI',
  ifr:'L’AVI fait partie des services d’assistance de Campus Monde. Votre conseiller vous en présente la définition exacte et le périmètre.',ien:'AVI is one of Campus Monde’s assistance services. Your adviser explains its exact definition and scope.',
  steps:[['Faire le point','Review your situation','Votre conseiller vérifie si l’AVI est nécessaire pour votre destination.','Your adviser checks whether AVI is needed for your destination.'],['Réunir les pièces','Gather documents','La liste vous est remise au bureau ou dans votre espace étudiant.','The list is given to you at the office or in your student area.'],['Suivre la démarche','Follow the procedure','Chaque étape est enregistrée dans votre dossier.','Each step is recorded in your file.']],links:[],cta:['contact','Poser une question sur l’AVI','Ask about AVI']},
 {id:'arrivee',ic:'globe',img:'arrivee',fr:'Arriver et s’installer',en:'Arrival and settling in',
  ifr:'Les premières semaines comptent : quelques démarches simples vous évitent bien des difficultés.',ien:'The first weeks matter: a few simple steps save you a lot of trouble.',
  steps:[['Avant de partir','Before leaving','Copies des documents, assurance, argent pour le premier mois et coordonnées de l’établissement.','Copies of documents, insurance, money for the first month and the institution’s contacts.'],['À l’arrivée','On arrival','Inscription administrative à l’établissement et validation du titre de séjour si demandé.','Administrative enrolment at the institution and permit validation if required.'],['Les premières semaines','The first weeks','Compte bancaire, téléphone, transport et assurance santé.','Bank account, phone, transport and health insurance.'],['Garder le contact','Stay in touch','Votre conseiller reste joignable pour vos questions après le départ.','Your adviser remains reachable for questions after departure.']],links:[],cta:['contact','Parler à un conseiller','Talk to an adviser']}
];
const NEWS=[
 {d:'2026-11-10',c:['Plateforme','Platform'],fr:'Campus Monde ouvre sa plateforme de candidature en ligne',en:'Campus Monde opens its online application platform',tfr:'Créez votre compte, déposez vos pièces et suivez votre dossier depuis votre téléphone ou votre ordinateur.',ten:'Create your account, upload your documents and track your file from your phone or computer.',href:'candidater'},
 {d:'2026-11-05',c:['Calendrier','Timeline'],fr:'Rentrée de septembre 2027 : c’est le moment de commencer',en:'September 2027 intake: now is the time to start',tfr:'Pour une rentrée en septembre 2027, l’orientation et les tests de langue se préparent dès cet automne.',ten:'For a September 2027 intake, guidance and language tests are prepared this autumn.',href:'etudier'},
 {d:'2026-10-28',c:['Bourses','Scholarships'],fr:'Bourses d’études : bien s’informer avant de candidater',en:'Scholarships: get informed before applying',tfr:'Les conditions et calendriers changent d’une bourse à l’autre. Notre guide fait le point.',ten:'Conditions and deadlines differ between scholarships. Our guide explains.',href:'guide-bourses'}
];
const AGENDA=[['Séance d’information « Étudier au Canada »','Information session: studying in Canada'],['Séance d’information « Étudier en France et en Belgique »','Information session: studying in France and Belgium'],['Permanence d’orientation au bureau','Guidance drop-in at the office']];
function guideCard(g){const n=GUIDES.indexOf(g)+1;return `<a class="guide-card" href="#guide-${g.id}"><div class="gc-media">${ph(({candidature:'etudiant-ordinateur',bourses:'inst-laval',visa:'aeroport',logement:'ville-quebec',avi:'conseiller',arrivee:'arrivee'})[g.id]||g.img,'',1)}<span class="gc-ic">${ic(g.ic,22)}</span></div><div class="gc-body"><span class="gc-n">${L('Guide','Guide')} ${String(n).padStart(2,'0')}<i></i>${(g.steps||[]).length} ${L('étapes','steps')}</span><h3>${L(g.fr,g.en)}</h3><p>${L(g.ifr,g.ien)}</p><span class="gc-go">${L('Lire le guide','Read the guide')}<b>→</b></span></div></a>`}
function newsCard(n){return `<a class="news-card" href="#${n.href}"><div class="nc-meta"><span class="tag">${L(n.c[0],n.c[1])}</span><time>${fmtD(n.d)}</time></div><h3>${L(n.fr,n.en)}</h3><p>${L(n.tfr,n.ten)}</p></a>`}
function vGuides(){
  return pageH(L('Préparer son départ','Getting ready'),L('Les démarches expliquées étape par étape, avec les liens vers les sites officiels.','Procedures explained step by step, with links to official websites.'),L('Préparer son départ','Getting ready'),'espace')+
  `<section class="block"><div class="wrap"><div class="guide-grid">${GUIDES.map(guideCard).join('')}</div></div></section>${ctaBand()}`;
}
function vGuide(id){
  const g=GUIDES.find(x=>x.id===id);if(!g)return vGuides();
  return pageH(L(g.fr,g.en),L(g.ifr,g.ien),`<a href="#guides">${L('Préparer son départ','Getting ready')}</a><span>/</span>${L(g.fr,g.en)}`,g.img)+
  `<section class="block"><div class="wrap guide-layout">
   <aside class="guide-nav"><p class="mm-h">${L('Les guides','Guides')}</p><ul>${GUIDES.map(x=>`<li><a href="#guide-${x.id}" class="${x.id===id?'on':''}">${ic(x.ic,18)}${L(x.fr,x.en)}</a></li>`).join('')}</ul></aside>
   <div class="guide-body"><ol class="steps-v">${g.steps.map((s,k)=>`<li><span class="sv-n">${k+1}</span><div><h3>${L(s[0],s[1])}</h3><p>${L(s[2],s[3])}</p></div></li>`).join('')}</ol>
   ${g.links.length?`<div class="official"><h3>${L('Sites officiels','Official websites')}</h3><ul>${g.links.map(k=>`<li><a href="${OFFICIAL[k][1]}" target="_blank" rel="noopener">${OFFICIAL[k][0]} ${ic('external',14)}</a></li>`).join('')}</ul><p class="small muted">${L('Les règles évoluent : la version du site officiel fait toujours foi.','Rules change: the official website always prevails.')}</p></div>`:''}
   <div class="notice">${L('Campus Monde vous accompagne dans ces démarches. Les décisions d’admission, de bourse et de visa appartiennent aux établissements et aux autorités.','Campus Monde supports you through these procedures. Admission, scholarship and visa decisions belong to institutions and authorities.')}</div>
   <div class="btn-row"><a class="btn btn-o" href="#${g.cta[0]}">${L(g.cta[1],g.cta[2])}</a><a class="btn btn-g" href="${WA}" target="_blank" rel="noopener">${ic('whatsapp',18)} WhatsApp</a></div></div>
  </div></section>`;
}
function vNews(){
  return pageH(L('Actualités','News'),L('Les informations utiles pour préparer votre projet, datées et mises à jour par l’équipe Campus Monde.','Useful, dated information to prepare your project, updated by the Campus Monde team.'),L('Actualités','News'))+
  `<section class="block"><div class="wrap news-layout"><div><div class="news-grid">${NEWS.map(newsCard).join('')}</div></div>
   <aside class="agenda"><h3>${L('Agenda','Events')}</h3><ul>${AGENDA.map(a=>`<li>${ic('calendar',18)}<div><strong>${L(a[0],a[1])}</strong><span>${L('Date à annoncer, au bureau de Brazzaville','Date to be announced, at the Brazzaville office')}</span></div></li>`).join('')}</ul><a class="btn btn-ghost-w btn-sm" href="#contact">${L('Être prévenu des prochaines dates','Get notified of next dates')}</a></aside></div></section>`;
}

const WMAP={W:1000,H:470,bzv:[529.4,240.8],pts:{canada:[275.5,98.6,-34,-30],'etats-unis':[274.3,112.3,-44,26],'royaume-uni':[485.3,81.4,-40,-30],france:[492.4,89,-58,6],belgique:[498.1,83.3,6,-44],suisse:[503.3,96.6],allemagne:[510.5,85.4],espagne:[475.1,113.1],italie:[521.4,108.9],russie:[593.2,69.3,30,-24],turquie:[568.5,111.4,38,-14],maroc:[466.2,131.4,-52,10],tunisie:[514.8,123.4,22,24],senegal:[435.9,186.6,-46,8],'cote-ivoire':[474.2,213.3,-30,30],'afrique-du-sud':[565.9,303.4,40,22],emirats:[643.6,156.6,38,14],chine:[818.3,114.6,-14,-34],'coree-du-sud':[848.5,121.2,38,-16],malaisie:[776.3,219.6,-12,34],australie:[917.7,325.3,32,22]}};
function worldMap(){
  const [bx,by]=WMAP.bzv;let arcs='',dots='',labs='';
  COUNTRIES.forEach(c=>{const p=WMAP.pts[c.id];if(!p)return;const [x,y,dx,dy]=p;
    const mx=(bx+x)/2,my=Math.min(by,y)-Math.abs(bx-x)*.18-30;
    arcs+=`<path class="wm-arc" d="M${bx} ${by}Q${mx.toFixed(0)} ${my.toFixed(0)} ${x} ${y}"/>`;
    if(dx!==undefined){const ex=x+dx,ey=y+dy,dir=dx<0?-1:1,tx=ex+dir*14;
      labs+=`<a href="#pays-${c.id}" class="wm-l"><path d="M${x} ${y}L${ex} ${ey}H${ex+dir*10}"/><text x="${tx}" y="${ey+4}" text-anchor="${dir<0?'end':'start'}">${esc(c.city)}</text></a>`}
    dots+=`<a href="#pays-${c.id}" class="wm-d"><title>${esc(c.city)}, ${esc(N(c))}</title><circle cx="${x}" cy="${y}" r="5.5"/></a>`;
  });
  return `<svg class="wmap" viewBox="0 0 ${WMAP.W} ${WMAP.H}" role="img" aria-label="${L('Carte de nos destinations d’études dans le monde, au départ de Brazzaville','Map of our study destinations worldwide, from Brazzaville')}"><image href="/world-land.svg" width="${WMAP.W}" height="${WMAP.H}"/><g class="wm-arcs">${arcs}</g>${labs}${dots}<g class="wm-home"><circle cx="${bx}" cy="${by}" r="16" class="ring"/><circle cx="${bx}" cy="${by}" r="7.5" class="core"/><path d="M${bx} ${by}L${bx-34} ${by+34}H${bx-46}"/><text x="${bx-52}" y="${by+38}" text-anchor="end">Brazzaville</text></g></svg>`;
}
function routeMap(){
  const B={x:454,y:354};
  const grid=[];for(let i=0;i<=13;i++)grid.push(`<path d="M${(i*43.08).toFixed(1)} 0V440"/>`);for(let j=0;j<=8;j++)grid.push(`<path d="M0 ${j*55}H560"/>`);
  const r=Object.entries(ROUTES).map(([id,p],k)=>`<a href="#pays-${id}" class="rt"><path class="arc" style="animation-delay:${.15+k*.18}s" pathLength="1" d="M${B.x} ${B.y}Q${p.q[0]} ${p.q[1]} ${p.x} ${p.y}"/><circle cx="${p.x}" cy="${p.y}" r="6" class="dst"/><text x="${p.x+p.lx}" y="${p.y+p.ly}" text-anchor="${p.anchor}" class="code">${p.code}</text><text x="${p.x+p.lx}" y="${p.y+p.ly+17}" text-anchor="${p.anchor}" class="city">${p.city}</text></a>`).join('');
  return `<svg class="routes" viewBox="0 0 560 440" role="img" aria-label="${L('Carte des liaisons : de Brazzaville vers nos destinations phares','Route map: from Brazzaville to Montréal, Paris, Brussels and Rabat')}"><g class="grid">${grid.join('')}</g><path class="eq" d="M0 330H560"/>${r}<circle cx="${B.x}" cy="${B.y}" r="18" class="home-ring"/><circle cx="${B.x}" cy="${B.y}" r="8" class="home"/><text x="${B.x-14}" y="${B.y+42}" text-anchor="end" class="code">BZV</text><text x="${B.x-14}" y="${B.y+59}" text-anchor="end" class="city">Brazzaville</text></svg>`;
}
function worldTile(c){const n=S.institutions.filter(i=>i.country===c.id).length;return `<a class="wt" href="#pays-${c.id}"><span class="wt-c" style="background:${c.grad}">${c.code}</span><span class="wt-t"><b>${N(c)}</b><small>${(CITIES[c.id]||c.cities||[]).slice(0,2).join(' · ')}${n?` · ${n} ${L('étab.','inst.')}`:''}</small></span><span class="wt-go">→</span></a>`}
function worldBlock(){return `<div class="world">${REGIONS.map(r=>{const cs=COUNTRIES.filter(c=>c.reg===r[0]);return cs.length?`<div class="wr"><h3 class="wr-h">${ic('globe',16)} ${L(r[1],r[2])} <span>${cs.length}</span></h3><div class="wr-g">${cs.map(worldTile).join('')}</div></div>`:''}).join('')}</div>`}
function destCard(c){const n=S.institutions.filter(i=>i.country===c.id).length;return `<a class="dest" href="#pays-${c.id}"><div class="dest-art">${c.feat?ph(c.id,"",1):`<div class="dest-grad" style="background:${c.grad}"><span>${N(c)}</span></div>`}<span class="dest-code">${c.code}</span></div><div class="dest-body"><h3>${N(c)}</h3><p>${(CITIES[c.id]||c.cities||[]).join(', ')}</p><span class="dest-meta">${n} ${L(n>1?'établissements présentés':'établissement présenté',n>1?'institutions listed':'institution listed')}</span></div></a>`}
function instRow(i){const r=REL[i.relation];const c=CTRY(i.country);const n=S.programs.filter(p=>p.inst===i.id).length;return `<a class="inst-row" href="#etab-${i.id}"><span class="inst-th">${ph("inst-"+i.id,"",1)}</span><span class="inst-name">${esc(i.name)}</span><span class="inst-loc">${esc(i.city)}, ${N(c)}</span><span class="inst-n">${n} ${L(n>1?'formations':'formation',n>1?'programmes':'programme')}</span><span class="tag ${r.c}">${N(r)}</span>${ic('arrow',18)}</a>`}
function instCard(i){return instRow(i)}
function progCard(p){const i=INST(p.inst);return `<article class="prog-card"><div class="prog-top"><span class="tag">${p.level==='master'?'Master':L('Licence / Bachelor','Bachelor')}</span>${p.open?`<span class="tag ok">${L('Candidatures ouvertes','Applications open')}${p.period?', '+esc(p.period):''}</span>`:`<span class="tag grey">${L('Période à confirmer','Dates to be confirmed')}</span>`}</div><h3>${esc(N(p))}</h3><p class="prog-inst">${esc(i?i.name:'')}</p><dl class="prog-facts"><div><dt>${L('Langue','Language')}</dt><dd>${p.lang==='EN'?L('Anglais','English'):L('Français','French')}</dd></div><div><dt>${L('Durée','Duration')}</dt><dd>${esc(p.dur)}</dd></div><div><dt>${L('Pays','Country')}</dt><dd>${i?N(CTRY(i.country)):''}</dd></div></dl><button class="btn btn-o btn-sm" data-act="applyProg" data-id="${p.id}">${L('Candidater à cette formation','Apply to this programme')}</button></article>`}
function finder(){return `<form class="finder" data-finder="1" role="search"><label><span>${L('Destination','Destination')}</span><select name="c"><option value="">${L('Toutes','All')}</option>${COUNTRIES.map(c=>`<option value="${c.id}">${N(c)}</option>`).join('')}</select></label><label><span>${L('Niveau visé','Target level')}</span><select name="l"><option value="">${L('Tous','All')}</option><option value="licence">${L('Licence / Bachelor','Bachelor')}</option><option value="master">Master</option></select></label><button class="btn btn-o">${ic('search',18)} ${L('Voir les formations','See programmes')}</button></form>`}
document.addEventListener('submit',e=>{const f=e.target;if(!f.dataset||!f.dataset.finder)return;e.preventDefault();ui.pc=f.c.value;ui.pl=f.l.value;ui.pq='';go('formations')});
function ctaBand(){return `<section class="cta-band"><div class="wrap"><div class="cta-card"><div class="cta-bg">${ph('arrivee')}</div><div class="cta-in"><div><span class="kicker">${L('Rentrée 2027','2027 intake')}</span><h2>${L('Votre rentrée se prépare <em>dès maintenant.</em>','Your intake starts being prepared <em>now.</em>')}</h2><p>${L('Créez votre compte en quelques minutes, ou passez nous voir au bureau de Brazzaville.','Create your account in a few minutes, or visit our Brazzaville office.')}</p></div><div class="cta-act"><a class="btn btn-o btn-lg" href="#candidater">${L('Déposer une candidature','Apply now')}</a><a class="btn btn-ghost-w btn-lg" href="${WA}" target="_blank" rel="noopener">${ic('whatsapp',18)} WhatsApp</a></div></div></div></div></section>`}

function vHome(){
  return `<section class="hero"><div class="hero-bg">${ph('hero')}</div><div class="wrap hero-in">
    <div class="hero-copy">
      <p class="hero-eyebrow"><b>2027</b>${L('Europe · Amériques · Afrique · Asie · Océanie','Europe · Americas · Africa · Asia · Oceania')}</p>
      <h1>${L('Votre place dans une université <em>à l’étranger</em> se prépare ici, à <span class="u">Brazzaville<svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true"><path d="M3 14C60 6 140 3 297 9"/></svg></span>.','Your place at a university <em>abroad</em> starts here, in <span class="u">Brazzaville<svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true"><path d="M3 14C60 6 140 3 297 9"/></svg></span>.')}</h1>
      <p class="lead">${L('<strong>Orientation, admission, visa et logement :</strong> Campus Monde accompagne chaque étudiant, avec un conseiller attitré, jusqu’à la rentrée dans l’université de son choix, partout dans le monde.','<strong>Guidance, admission, visa and housing:</strong> Campus Monde supports every student, with a dedicated adviser, all the way to their first day at the university of their choice, anywhere in the world.')}</p>
      ${finder()}
      <ul class="hero-proof"><li>${ic('user',18)}${L('Un conseiller attitré','A dedicated adviser')}</li><li>${ic('filecheck',18)}${L('Dossier vérifié avant envoi','File checked before sending')}</li><li>${ic('globe',18)}${L('Suivi en ligne, français et anglais','Online tracking, French and English')}</li></ul>
    </div>
  </div></section>
  <section class="quick"><div class="wrap"><h2 class="quick-h">${L('Par où commencer ?','Where to start?')}</h2><div class="quick-grid">${[['formations','search','Trouver une formation','Find a programme','Pays, niveau, domaine','Country, level, field'],['guide-candidature','filecheck','Candidater','Apply','Dossier 100 % en ligne','100% online file'],['guide-bourses','award','Bourses','Scholarships','Aides et conditions','Funding & criteria'],['guide-visa','plane','Visa études','Student visa','Démarches pas à pas','Step-by-step process'],['guide-logement','home','Logement','Housing','Se loger à l’arrivée','Housing on arrival'],['espace-rdv','calendar','Rendez-vous','Book a meeting','Avec un conseiller','With an adviser']].map((q,n)=>`<a class="quick-t" href="#${q[0]}"><span class="qt-top"><span class="qt-ic">${ic(q[1],22)}</span><span class="qt-n">0${n+1}</span></span><strong>${L(q[2],q[3])}</strong><small>${L(q[4],q[5])}</small><span class="qt-go">${L('Découvrir','Explore')} →</span></a>`).join('')}</div></div></section>

  <section class="block"><div class="wrap split">
    <div class="split-intro">
      <h2>${L('Une seule équipe, de l’orientation <em>jusqu’au départ</em>','One team, from guidance <em>to departure</em>')}</h2>
      <p>${L('Nous suivons votre projet du premier rendez-vous à votre installation. Vous savez toujours où en est votre dossier et qui s’en occupe.','We follow your project from the first meeting to settling in. You always know where your file stands and who is handling it.')}</p>
      <div class="split-art">${ph('services')}</div>
      <a class="btn btn-b" href="#services">${L('Voir le détail des services','See all services')}</a>
    </div>
    <ul class="svc-list">${SERVICES.map(s=>`<li><span class="svc-ic">${ic(s[0],22)}</span><div><h3>${L(s[1],s[2])}</h3><p>${L(s[3],s[4])}</p></div></li>`).join('')}</ul>
  </div></section>

  <section class="block block-mist"><div class="wrap">
    <div class="head-row"><div><span class="kicker">${L('Où étudier','Where to study')}</span><h2>${L('Étudier <em>partout dans le monde</em>','Study <em>anywhere in the world</em>')}</h2><p class="muted">${L(`${COUNTRIES.length} pays sur 5 continents. Voici nos destinations phares ; votre conseiller étudie aussi tout autre pays avec vous.`,`${COUNTRIES.length} countries on 5 continents. Here are our featured destinations; your adviser can study any other country with you.`)}</p></div><a class="link" href="#etudier">${L('Toutes les destinations','All destinations')}</a></div>
    <div class="dest-grid">${FEAT().map(destCard).join('')}</div>
    <div class="world-head"><span class="kicker">${L('Et aussi','And also')}</span></div>${worldBlock()}
  </div></section>
  ${typeof promoHome==='function'?promoHome():''}

  <section class="block block-ink"><div class="wrap">
    <div class="head-row"><div><span class="kicker">${L('Pas à pas','Step by step')}</span><h2>${L('Comment se déroule <em>votre candidature</em>','How <em>your application</em> works')}</h2></div></div>
    <ol class="journey">${[[L('Rendez-vous d’orientation','Guidance meeting'),L('Au bureau ou en ligne, nous définissons ensemble le pays, le niveau et le budget.','At the office or online, we agree on country, level and budget together.')],[L('Création du compte','Account creation'),L('Vous complétez votre profil dans votre espace étudiant.','You complete your profile in your student area.')],[L('Dépôt du dossier','File submission'),L('Vous choisissez la formation et ajoutez les pièces demandées.','You choose the programme and upload the required documents.')],[L('Vérification et envoi','Review and sending'),L('Nos conseillers contrôlent chaque pièce, puis transmettent le dossier à l’établissement.','Our advisers check each document, then send the file to the institution.')],[L('Décision et départ','Decision and departure'),L('Après la réponse de l’établissement : visa, logement et préparation du voyage.','After the institution replies: visa, housing and travel preparation.')]].map((s,k)=>`<li><span class="j-n">${k+1}</span><h3>${s[0]}</h3><p>${s[1]}</p></li>`).join('')}</ol>
  </div></section>

  <section class="block"><div class="wrap split split-rev">
    <figure class="frame">${ph('espace')}</figure>
    <div class="split-intro">
      <h2>${L('Votre dossier, <em>visible à chaque étape</em>','Your file, <em>visible at every step</em>')}</h2>
      <p>${L('Depuis votre téléphone ou votre ordinateur, vous suivez l’avancement de votre candidature et répondez aux demandes de votre conseiller.','From your phone or computer, you follow your application and answer your adviser’s requests.')}</p>
      <ul class="checks">${[L('Liste des pièces adaptée à votre formation','Document list tailored to your programme'),L('Statut du dossier mis à jour par votre conseiller','File status updated by your adviser'),L('Messagerie et notifications par e-mail','Messages and email notifications'),L('Reçu de dépôt téléchargeable','Downloadable submission receipt')].map(x=>`<li>${ic('check',18)}${x}</li>`).join('')}</ul>
      <div class="btn-row"><a class="btn btn-o" href="#candidater">${L('Créer mon compte','Create my account')}</a><a class="btn btn-g" href="#espace">${L('Se connecter','Log in')}</a></div>
    </div>
  </div></section>

  <section class="block block-mist"><div class="wrap">
    <div class="head-row"><div><span class="kicker">${L('Établissements','Institutions')}</span><h2>${L('Écoles et <em>universités</em>','Schools and <em>universities</em>')}</h2><p class="muted">${L('Chaque établissement affiche clairement sa relation avec Campus Monde : partenaire confirmé, en discussion ou présenté à titre informatif.','Each institution clearly shows its relationship with Campus Monde: confirmed partner, in discussion or listed for information.')}</p></div><a class="link" href="#etablissements">${L('Toutes les écoles et universités','All schools and universities')}</a></div>
    <div class="inst-list">${S.institutions.slice(0,5).map(instRow).join('')}</div>
    <aside class="partner-note"><div><h3>${L('Vous représentez un établissement ?','Do you represent an institution?')}</h3><p>${L('Découvrez comment nous préparons et transmettons les dossiers de nos étudiants.','See how we prepare and send our students’ files.')}</p></div><a class="btn btn-b" href="#contact">${L('Nous contacter','Contact us')}</a></aside>
  </div></section>

  <section class="block"><div class="wrap"><div class="head-row"><div><span class="kicker">${L('Le blog','The blog')}</span><h2>${L('Actualités','News')}</h2></div><a class="link" href="#actualites">${L('Toutes les actualités','All news')}</a></div><div class="news-grid">${NEWS.map(newsCard).join('')}</div></div></section>
  <section class="block block-mist"><div class="wrap"><div class="head-row"><div><span class="kicker">${L('Guides pratiques','Practical guides')}</span><h2>${L('Préparer <em>son départ</em>','Getting <em>ready</em>')}</h2><p class="muted">${L('Chaque démarche expliquée simplement, avec les sites officiels.','Each procedure explained simply, with official websites.')}</p></div><a class="link" href="#guides">${L('Tous les guides','All guides')}</a></div><div class="guide-grid">${GUIDES.slice(0,3).map(guideCard).join('')}</div></div></section>
  <section class="block"><div class="wrap two-col">
    <div><span class="kicker">FAQ</span><h2>${L('Questions <em>fréquentes</em>','Frequently asked <em>questions</em>')}</h2>${FAQ.slice(0,4).map(f=>`<details class="faq"><summary>${L(f[0],f[1])}</summary><p>${L(f[2],f[3])}</p></details>`).join('')}<a class="link" href="#faq">${L('Toutes les questions','All questions')}</a></div>
    <aside class="office"><h3>${L('Le bureau de Brazzaville','Our Brazzaville office')}</h3><ul><li>${ic('pin')}<span>211, avenue de la Base, quartier Batignolles, arrêt Bopaka</span></li><li>${ic('phone')}<span>+242 06 683 83 55<br>+242 05 350 50 12</span></li><li>${ic('mail')}<span>Billenium.corp@gmail.com</span></li><li>${ic('clock')}<span>${L('Lundi au vendredi, 8 h 30 – 17 h 30 ; samedi, 9 h – 13 h','Monday–Friday 8:30am–5:30pm; Saturday 9am–1pm')}</span></li></ul><div class="btn-row"><a class="btn btn-wa" href="${WA}" target="_blank" rel="noopener">${ic('whatsapp',18)} WhatsApp</a><a class="btn btn-ghost-w" href="${MAP}" target="_blank" rel="noopener">${ic('pin',18)} ${L('Itinéraire','Directions')}</a></div></aside>
  </div></section>
  ${ctaBand()}`;
}
function vAbout(){
  return pageH(L('À propos de Campus Monde','About Campus Monde'),L('Centre culturel, d’encadrement, d’information et d’orientation scolaire et professionnelle, installé à Brazzaville.','A cultural, guidance and academic & career counselling centre based in Brazzaville.'),L('À propos','About'),'apropos')+
  `<section class="block"><div class="wrap split">
   <div class="split-intro prose"><h2>${L('Notre mission','Our mission')}</h2><p>${L('Campus Monde accompagne les élèves, étudiants et professionnels qui veulent poursuivre leurs études à l’étranger : orientation, information sur les bourses, admission, AVI, logement et visa études.','Campus Monde supports pupils, students and professionals who want to study abroad: guidance, scholarship information, admission, AVI, housing and student visas.')}</p><p>${L('Nous proposons aussi des formations linguistiques, informatiques et professionnelles à Brazzaville.','We also offer language, IT and professional training in Brazzaville.')}</p>
   <h3>${L('Nos engagements','Our commitments')}</h3><ul class="checks">${[L('Afficher le statut réel de chaque relation avec un établissement','Show the real status of every relationship with an institution'),L('Dater et sourcer les informations publiées','Date and source the information we publish'),L('Protéger les données et les documents des candidats','Protect applicants’ data and documents'),L('Ne jamais promettre une admission, une bourse ou un visa','Never promise an admission, scholarship or visa')].map(x=>`<li>${ic('check',18)}${x}</li>`).join('')}</ul></div>
   <div class="id-card"><h3>${L('Identité de l’agence','Agency details')}</h3><dl>
    <div><dt>${L('Nom commercial','Trade name')}</dt><dd>Campus Monde</dd></div>
    <div><dt>${L('Activité principale','Main activity')}</dt><dd>${L('Recrutement et accompagnement des étudiants internationaux','Recruitment and support of international students')}</dd></div>
    <div><dt>${L('Société mère','Parent company')}</dt><dd>Billenium Conciergerie</dd></div>
    <div><dt>${L('Statut juridique et RCCM','Legal status and registration')}</dt><dd><span class="tag warn">${L('À compléter','To be completed')}</span></dd></div>
    <div><dt>${L('Pays d’implantation','Country of establishment')}</dt><dd>${L('République du Congo','Republic of Congo')}</dd></div>
    <div><dt>${L('Adresse','Address')}</dt><dd>211, avenue de la Base, quartier Batignolles, arrêt Bopaka, Brazzaville</dd></div>
    <div><dt>${L('Téléphones','Phones')}</dt><dd>+242 06 683 83 55<br>+242 05 350 50 12</dd></div>
    <div><dt>E-mail</dt><dd>Billenium.corp@gmail.com</dd></div>
    <div><dt>${L('Pays d’origine des étudiants','Students’ countries of origin')}</dt><dd>${L('République du Congo et Afrique centrale (liste à confirmer)','Republic of Congo and Central Africa (list to be confirmed)')}</dd></div>
   </dl></div>
  </div></section>
  <section class="block block-mist"><div class="wrap trio">
   <article><span class="svc-ic">${ic('book',22)}</span><h3>${L('Notre histoire','Our story')}</h3><p class="muted">${L('Date de création, étapes clés et premiers étudiants accompagnés : texte à fournir par la direction.','Founding date, milestones and first students supported: text to be provided by management.')}</p></article>
   <article><span class="svc-ic">${ic('users',22)}</span><h3>${L('Organisation','Organisation')}</h3><p class="muted">${L('Une direction, un responsable des admissions, des conseillers d’orientation et un pôle formation, réunis dans notre bureau de Brazzaville.','Management, an admissions manager, guidance advisers and a training unit, all in our Brazzaville office.')}</p></article>
   <article><span class="svc-ic">${ic('building',22)}</span><h3>Billenium Conciergerie</h3><p class="muted">${L('Société mère de Campus Monde. Présentation, activités et immatriculation à compléter.','Parent company of Campus Monde. Profile, activities and registration to be completed.')}</p></article>
  </div></section>
  <section class="block"><div class="wrap"><div class="head-row"><h2>${L('L’équipe','The team')}</h2></div><div class="team">${[[L('Direction','Management'),L('Pilotage et relations avec les établissements','Leadership and institutional relations')],[L('Responsable des admissions','Admissions manager'),L('Validation et transmission des dossiers','File validation and sending')],[L('Conseillers d’orientation','Guidance advisers'),L('Orientation et suivi des candidats','Guidance and applicant follow-up')],[L('Pôle formation','Training unit'),L('Langues et informatique','Languages and IT')]].map(t=>`<div class="member"><div class="avatar">${ic('user',28)}</div><h3>${t[0]}</h3><p class="muted">${t[1]}</p></div>`).join('')}</div><p class="small muted">${L('Les noms et photos de l’équipe seront ajoutés après validation.','Team names and photos will be added after validation.')}</p></div></section>
  ${ctaBand()}`;
}
function vStudy(){
  return pageH(L('Étudier <em>partout dans le monde</em>','Study <em>anywhere in the world</em>'),L('Europe, Amériques, Afrique, Asie, Océanie : comparez les destinations, repérez le bon calendrier et prévoyez votre budget.','Europe, the Americas, Africa, Asia, Oceania: compare destinations, find the right timeline and plan your budget.'),L('Étudier à l’étranger','Study abroad'),'arrivee')+
  `<section class="block"><div class="wrap"><div class="head-row"><div><span class="kicker">${L('Destinations phares','Featured destinations')}</span><h2>${L('Nos <em>destinations phares</em>','Our <em>featured destinations</em>')}</h2></div></div><div class="dest-grid">${FEAT().map(destCard).join('')}</div>
   <div class="head-row" style="margin-top:56px"><div><span class="kicker">${L('Le monde entier','The whole world')}</span><h2>${L('Toutes les <em>destinations</em>','All <em>destinations</em>')}</h2><p class="muted">${L('Votre pays n’est pas dans la liste ? Parlez-en à votre conseiller : nous étudions chaque projet, quelle que soit la destination.','Your country isn’t listed? Talk to your adviser: we study every project, whatever the destination.')}</p></div><a class="btn btn-o btn-sm" href="#espace-rdv">${ic('calendar',16)} ${L('Prendre rendez-vous','Book a meeting')}</a></div>${worldBlock()}</div></section>
  <section class="block block-mist"><div class="wrap two-col">
   <div><h2>${L('Le calendrier conseillé','Recommended timeline')}</h2><ol class="tl">${[[L('12 à 10 mois avant','12–10 months before'),L('Orientation, choix du pays et des formations, tests de langue','Guidance, choice of country and programmes, language tests')],[L('10 à 6 mois avant','10–6 months before'),L('Constitution et dépôt des candidatures','Building and submitting applications')],[L('6 à 3 mois avant','6–3 months before'),L('Réponses des établissements, acceptation, preuve financière','Institutions’ replies, acceptance, financial proof')],[L('3 à 1 mois avant','3–1 months before'),L('Visa, logement, billet et assurance','Visa, housing, ticket and insurance')]].map(t=>`<li><strong>${t[0]}</strong><span>${t[1]}</span></li>`).join('')}</ol></div>
   <div><h2>${L('Les coûts à prévoir','Costs to plan for')}</h2><ul class="checks">${[L('Frais de candidature, s’il y en a (fixés par l’établissement)','Application fees, if any (set by the institution)'),L('Frais de scolarité','Tuition fees'),L('Tests de langue et traductions certifiées','Language tests and certified translations'),L('Frais de visa et de procédure','Visa and procedure fees'),L('Logement, assurance, transport et vie quotidienne','Housing, insurance, transport and living costs')].map(x=>`<li>${ic('check',18)}${x}</li>`).join('')}</ul><div class="notice">${L('Les montants varient selon l’établissement et le pays : vérifiez-les toujours sur les sites officiels. Campus Monde ne perçoit en ligne aucun frais universitaire ou de visa.','Amounts vary by institution and country: always check official websites. Campus Monde does not collect any university or visa fees online.')}</div></div>
  </div></section>${ctaBand()}`;
}
function vCountry(id){
  const c=CTRY(id);if(!c)return vStudy();const r={code:c.code,city:c.city};
  return `<section class="page-h country-h"><div class="wrap ph-grid"><div><nav class="crumb"><a href="#accueil">${L('Accueil','Home')}</a><span>/</span><a href="#etudier">${L('Étudier à l’étranger','Study abroad')}</a><span>/</span>${N(c)}</nav><h1>${lang==='en'?'Study in '+N(c):'Étudier '+(c.pre||'en')+' '+N(c)}</h1><p class="lead">${lang==='en'?c.en_d:c.fr_d}</p><p class="route-line">${ic('plane',18)} BZV <span></span> ${r.code} ${r.city}</p></div><div class="ph-art">${c.feat?ph(id):`<div class="ctry-art" style="background:${c.grad}"><b>${c.code}</b><span>${(c.cities||[]).join(' · ')}</span></div>`}</div></div></section>
  <section class="block"><div class="wrap two-col">
   <div><h2>${L('À savoir','Key points')}</h2><ul class="checks">${(lang==='en'?c.en_k:c.fr_k).map(k=>`<li>${ic('check',18)}${k}</li>`).join('')}</ul><div class="notice blue">${L('Dernière vérification : à renseigner par Campus Monde. Source : sites officiels des autorités et des établissements.','Last checked: to be completed by Campus Monde. Source: official authority and institution websites.')}</div></div>
   <div><h2>${L('Établissements présentés','Listed institutions')}</h2><div class="inst-list compact">${S.institutions.filter(i=>i.country===id).map(instRow).join('')||`<div class="ctry-empty">${ic('compass',22)}<div><b>${L('Établissements sur demande','Institutions on request')}</b><p>${L('Votre conseiller vous présente les écoles et universités de ce pays adaptées à votre profil et à votre budget.','Your adviser presents this country’s schools and universities that match your profile and budget.')}</p><a class="btn btn-o btn-sm" href="#espace-rdv">${ic('calendar',16)} ${L('Prendre rendez-vous','Book a meeting')}</a></div></div>`}</div></div>
  </div></section>${ctaBand()}`;
}
function vInsts(){
  const f=ui.instF||'';const list=S.institutions.filter(i=>!f||i.country===f);
  return pageH(L('Écoles & universités','Schools & universities'),L('Les établissements présentés par Campus Monde, avec le statut de notre relation et un lien vers leur site officiel.','Institutions listed by Campus Monde, with the status of our relationship and a link to their official website.'),L('Écoles & universités','Schools & universities'),'partenaires')+
  `<section class="block"><div class="wrap">
   <div class="legend"><span><span class="tag ok">${N(REL.partenaire)}</span>${L('accord écrit en vigueur','written agreement in force')}</span><span><span class="tag warn">${N(REL.discussion)}</span>${L('échanges en cours','talks under way')}</span><span><span class="tag grey">${N(REL.informatif)}</span>${L('présenté sans relation contractuelle','listed without a contract')}</span></div>
   <div class="filters"><label class="f-inline"><span>${L('Pays','Country')}</span><select data-ui="instF"><option value="">${L('Tous les pays','All countries')}</option>${COUNTRIES.map(c=>`<option value="${c.id}" ${f===c.id?'selected':''}>${N(c)}</option>`).join('')}</select></label><span class="muted small">${list.length} ${L('établissement(s)','institution(s)')}</span></div>
   <div class="inst-list">${list.map(instRow).join('')}</div>
  </div></section>`;
}
function vInst(id){
  const i=INST(id);if(!i)return vInsts();const r=REL[i.relation];const c=CTRY(i.country);
  return pageH(esc(i.name),`${esc(i.city)}, ${N(c)}. ${esc(i.type)}.`,`<a href="#etablissements">${L('Écoles & universités','Schools & universities')}</a><span>/</span>${esc(i.name)}`,'inst-'+i.id)+
  `<section class="block"><div class="wrap split">
   <div class="id-card"><h3>${L('Fiche établissement','Institution details')}</h3><dl>
    <div><dt>${L('Nom officiel','Official name')}</dt><dd>${esc(i.name)}</dd></div><div><dt>${L('Pays et ville','Country and city')}</dt><dd>${N(c)}, ${esc(i.city)}</dd></div><div><dt>Type</dt><dd>${esc(i.type)}</dd></div>
    <div><dt>${L('Relation avec Campus Monde','Relationship with Campus Monde')}</dt><dd><span class="tag ${r.c}">${N(r)}</span></dd></div>
    <div><dt>${L('Site officiel','Official website')}</dt><dd><a href="${esc(i.site)}" target="_blank" rel="noopener">${esc(i.site.replace('https://',''))} ${ic('external',14)}</a></dd></div>
    <div><dt>${L('Frais','Fees')}</dt><dd>${L('Voir les frais publiés par l’établissement','See the fees published by the institution')}</dd></div>
    <div><dt>${L('Dernière vérification','Last checked')}</dt><dd>${i.verified?fmtD(i.verified):L('À renseigner','To be completed')}</dd></div></dl></div>
   <div><h2>${L('Formations','Programmes')}</h2><div class="prog-stack">${S.programs.filter(p=>p.inst===id).map(progCard).join('')||`<p class="muted">${L('Aucune formation publiée.','No programme published.')}</p>`}</div></div>
  </div></section>`;
}
function vProgs(){
  const q=(ui.pq||'').toLowerCase(),lv=ui.pl||'',ct=ui.pc||'';
  const list=S.programs.filter(p=>{const i=INST(p.inst);return(!q||(p.fr+' '+p.en+' '+(i?i.name:'')).toLowerCase().includes(q))&&(!lv||p.level===lv)&&(!ct||(i&&i.country===ct))});
  return pageH(L('Formations','Programmes'),L('Recherchez par intitulé, niveau ou pays. Chaque fiche indique la langue d’enseignement et la durée.','Search by title, level or country. Each listing shows the language of instruction and duration.'),L('Formations','Programmes'),'candidature')+
  `<section class="block"><div class="wrap">
   <div class="search-bar"><label class="sb-q">${ic('search',18)}<input data-ui="pq" placeholder="${L('Intitulé ou établissement','Title or institution')}" value="${esc(ui.pq||'')}" aria-label="${L('Rechercher','Search')}"></label><select data-ui="pl" aria-label="${L('Niveau','Level')}"><option value="">${L('Tous les niveaux','All levels')}</option><option value="licence" ${lv==='licence'?'selected':''}>${L('Licence / Bachelor','Bachelor')}</option><option value="master" ${lv==='master'?'selected':''}>Master</option></select><select data-ui="pc" aria-label="${L('Pays','Country')}"><option value="">${L('Tous les pays','All countries')}</option>${COUNTRIES.map(c=>`<option value="${c.id}" ${ct===c.id?'selected':''}>${N(c)}</option>`).join('')}</select></div>
   <p class="muted small">${list.length} ${L('formation(s)','programme(s)')}</p>
   <div class="prog-grid">${list.map(progCard).join('')||`<div class="empty"><h3>${L('Aucune formation ne correspond','No matching programme')}</h3><p>${L('Élargissez la recherche ou demandez conseil à un conseiller.','Broaden your search or ask an adviser.')}</p><a class="btn btn-b" href="#contact">${L('Demander conseil','Ask an adviser')}</a></div>`}</div>
   <div class="notice">${L('Une formation porte la mention « Candidatures ouvertes » seulement après confirmation de la période par l’établissement. Les prérequis exacts sont à vérifier sur son site officiel.','A programme shows “Applications open” only once the institution has confirmed the period. Check exact requirements on its official website.')}</div>
  </div></section>`;
}
function vServices(){
  return pageH(L('Nos services','Our services'),L('Un accompagnement complet, de l’orientation jusqu’à votre installation, avec un seul interlocuteur.','Complete support, from guidance to settling in, with a single contact.'),L('Nos services','Services'),'services')+
  `<section class="block"><div class="wrap"><div class="svc-grid">${SERVICES.map(s=>`<article class="svc-card"><span class="svc-ic">${ic(s[0],24)}</span><h3>${L(s[1],s[2])}</h3><p>${L(s[3],s[4])}</p></article>`).join('')}</div>
  <div class="notice">${L('Campus Monde ne décide ni des admissions, ni des bourses, ni des visas : ces décisions reviennent aux établissements et aux autorités compétentes.','Campus Monde does not decide on admissions, scholarships or visas: these decisions belong to institutions and the competent authorities.')}</div></div></section>${ctaBand()}`;
}
function vApply(){
  const logged=ME()&&ME().role==='candidat';
  return pageH(L('Déposer une candidature','Apply'),L('Créez votre compte, complétez votre profil, choisissez votre formation et ajoutez vos pièces : votre conseiller prend le relais.','Create your account, complete your profile, choose your programme and upload your documents: your adviser takes it from there.'),L('Candidater','Apply'),'candidature')+
  `<section class="block"><div class="wrap two-col">
   <div><h2>${L('Les étapes','The steps')}</h2><ol class="tl">${[[L('Créer un compte','Create an account'),L('E-mail et mot de passe, puis code de vérification.','Email and password, then a verification code.')],[L('Compléter le profil','Complete your profile'),L('Identité, coordonnées et nationalité.','Identity, contact details and nationality.')],[L('Choisir la formation','Choose the programme'),L('Pays, établissement, programme et rentrée.','Country, institution, programme and intake.')],[L('Ajouter les pièces','Upload documents'),L('Une liste adaptée à la formation et au pays.','A list tailored to the programme and country.')],[L('Soumettre et suivre','Submit and track'),L('Reçu de dépôt et suivi dans votre espace.','Submission receipt and tracking in your area.')]].map(t=>`<li><strong>${t[0]}</strong><span>${t[1]}</span></li>`).join('')}</ol>
   <div class="btn-row">${logged?`<button class="btn btn-o btn-lg" data-act="newApp">${L('Commencer une candidature','Start an application')}</button><a class="btn btn-g btn-lg" href="#espace">${L('Mon espace','My area')}</a>`:`<button class="btn btn-o btn-lg" data-act="toRegister">${L('Créer mon compte','Create my account')}</button><button class="btn btn-g btn-lg" data-act="toLogin">${L('J’ai déjà un compte','I already have an account')}</button>`}</div></div>
   <aside class="doc-box"><h3>${L('Documents généralement demandés','Documents usually requested')}</h3><ul>${['id','diploma','transcript','cv','letter','lang'].map(k=>`<li>${ic('clip',18)}<span>${N(DOC_TYPES[k])}${k==='lang'?L(' (formations en anglais)',' (English-taught programmes)'):''}</span></li>`).join('')}</ul><p class="small muted">${L('PDF, JPG ou PNG, 5 Mo maximum par fichier. Envoyez uniquement les pièces demandées pour votre formation.','PDF, JPG or PNG, 5 MB max per file. Only send the documents requested for your programme.')}</p></aside>
  </div></section>`;
}
function vFaq(){
  return pageH(L('Questions fréquentes','Frequently asked questions'),L('Les réponses aux questions que nous posent le plus souvent les étudiants et leurs familles.','Answers to the questions students and families ask us most.'),'FAQ')+
  `<section class="block"><div class="wrap two-col"><div>${FAQ.map(f=>`<details class="faq"><summary>${L(f[0],f[1])}</summary><p>${L(f[2],f[3])}</p></details>`).join('')}</div>
  <aside class="office"><h3>${L('Vous ne trouvez pas votre réponse ?','Can’t find your answer?')}</h3><p>${L('Un conseiller vous répond au bureau, par téléphone ou sur WhatsApp.','An adviser answers at the office, by phone or on WhatsApp.')}</p><ul><li>${ic('phone')}<span>+242 06 683 83 55<br>+242 05 350 50 12</span></li><li>${ic('mail')}<span>Billenium.corp@gmail.com</span></li></ul><div class="btn-row"><a class="btn btn-wa" href="${WA}" target="_blank" rel="noopener">${ic('whatsapp',18)} WhatsApp</a><a class="btn btn-ghost-w" href="#contact">${L('Nous écrire','Write to us')}</a></div></aside></div></section>${ctaBand()}`;
}
function vContact(){
  return pageH('Contact',L('Une question ou une demande d’orientation ? Écrivez-nous, appelez-nous ou passez au bureau.','A question or a guidance request? Write, call or visit the office.'),'Contact','contact')+
  `<section class="block"><div class="wrap split">
  <div class="form-card">${ui.contactOk?`<div class="alert ok">${L('Merci, votre message est enregistré. Un conseiller vous répond rapidement.','Thank you, your message has been recorded. An adviser will reply shortly.')}</div>`:''}
  <h2>${L('Envoyer un message','Send a message')}</h2>
  <form data-form="contact" novalidate><div class="f"><label>${L('Objet','Subject')}</label><select name="kind"><option value="info">${L('Demande d’information','Information request')}</option><option value="orientation">${L('Demande d’orientation','Guidance request')}</option><option value="partenariat">${L('Établissement ou partenariat','Institution or partnership')}</option></select></div>
  <div class="row2"><div class="f"><label>${L('Nom et prénoms','Full name')} *</label><input name="name" required autocomplete="name"></div><div class="f"><label>E-mail *</label><input name="email" type="email" required autocomplete="email"></div></div>
  <div class="row2"><div class="f"><label>${L('Téléphone avec indicatif','Phone with country code')}</label><input name="phone" placeholder="+242" autocomplete="tel"></div><div class="f"><label>${L('Destination envisagée','Intended destination')}</label><select name="dest"><option value="">${L('Pas encore décidé','Not decided yet')}</option>${COUNTRIES.map(c=>`<option>${N(c)}</option>`).join('')}</select></div></div>
  <div class="f"><label>Message *</label><textarea name="msg" required></textarea></div>
  <div class="f"><label class="chk"><input type="checkbox" name="consent" required> ${L('J’accepte que mes données servent à répondre à ma demande (<a href="#legal">politique de confidentialité</a>).','I agree that my data is used to answer my request (<a href="#legal">privacy policy</a>).')}</label></div>
  <input name="website" class="hidden" tabindex="-1" autocomplete="off" aria-hidden="true">
  <div class="err-msg" id="ferr"></div><button class="btn btn-o">${L('Envoyer le message','Send message')}</button></form></div>
  <aside class="office"><h3>${L('Le bureau de Brazzaville','Our Brazzaville office')}</h3><ul><li>${ic('pin')}<span>211, avenue de la Base, quartier Batignolles, arrêt Bopaka, Brazzaville, Congo</span></li><li>${ic('phone')}<span>+242 06 683 83 55<br>+242 05 350 50 12</span></li><li>${ic('mail')}<span>Billenium.corp@gmail.com</span></li><li>${ic('clock')}<span>${L('Lundi au vendredi, 8 h 30 – 17 h 30<br>Samedi, 9 h – 13 h (à confirmer)','Monday–Friday, 8:30am–5:30pm<br>Saturday, 9am–1pm (to be confirmed)')}</span></li></ul>
  <div class="btn-row"><a class="btn btn-wa" href="${WA}" target="_blank" rel="noopener">${ic('whatsapp',18)} ${L('Écrire sur WhatsApp','Message on WhatsApp')}</a><a class="btn btn-ghost-w" href="${MAP}" target="_blank" rel="noopener">${ic('pin',18)} ${L('Voir sur la carte','View on map')}</a></div></aside>
  </div></section>`;
}
function vLegal(){
  let n=0;const toc=[];const sec=(t,b,icn)=>{n++;const id='lg-'+n;toc.push([id,t,icn]);return `<article class="lg-sec" id="${id}"><div class="lg-h"><span class="lg-ic">${ic(icn||'filecheck',20)}</span><div><span class="lg-n">${String(n).padStart(2,'0')}</span><h2>${t}</h2></div></div>${b}</article>`};
  return pageH(L('Mentions légales <em>et confidentialité</em>','Legal notice <em>and privacy</em>'),L('Ce que nous faisons de vos données, et les règles d’utilisation du site, expliqués simplement.','What we do with your data and the site’s terms, explained simply.'),L('Pages légales','Legal'))+
  (()=>{const body=`<div class="notice lg-notice">${L('Ces textes sont des projets. Ils doivent être validés au regard du droit de la République du Congo et, le cas échéant, du RGPD.','These texts are drafts. They must be validated under the law of the Republic of Congo and, where applicable, the GDPR.')}</div>
  ${sec(L('Mentions légales','Legal notice'),`<p>${L('Informations sur l’éditeur du site.','Information about the website publisher.')}</p><dl class="lg-dl">
   <div><dt>${ic('building',16)}${L('Éditeur','Publisher')}</dt><dd>Campus Monde<small>${L('Filiale de Billenium Conciergerie','A subsidiary of Billenium Conciergerie')}</small></dd></div>
   <div><dt>${ic('pin',16)}${L('Adresse','Address')}</dt><dd>211, avenue de la Base<small>${L('Quartier Batignolles, Brazzaville, Congo','Batignolles, Brazzaville, Congo')}</small></dd></div>
   <div><dt>${ic('phone',16)}${L('Téléphone','Phone')}</dt><dd><a href="tel:+242066838355">+242 06 683 83 55</a><small><a href="tel:+242053505012">+242 05 350 50 12</a></small></dd></div>
   <div><dt>${ic('mail',16)}E-mail</dt><dd><a href="mailto:Billenium.corp@gmail.com">Billenium.corp@gmail.com</a></dd></div>
   <div><dt>${ic('filecheck',16)}RCCM</dt><dd><span class="lg-tbc">${L('À compléter','To be completed')}</span></dd></div>
   <div><dt>${ic('user',16)}${L('Directeur de la publication','Publication director')}</dt><dd><span class="lg-tbc">${L('À compléter','To be completed')}</span></dd></div>
   <div><dt>${ic('globe',16)}${L('Hébergeur','Host')}</dt><dd><span class="lg-tbc">${L('À compléter','To be completed')}</span></dd></div>
  </dl>`,'filecheck')}
  ${sec(L('Politique de confidentialité','Privacy policy'),`<p>${L('Vos données servent à une seule chose : traiter votre demande et votre candidature.','Your data serves one purpose: processing your request and application.')}</p>
   <div class="lg-cards">
    <div><span>${ic('folder',18)}</span><b>${L('Données collectées','Data collected')}</b><p>${L('Identité, coordonnées, projet d’études et pièces justificatives.','Identity, contact details, study project and supporting documents.')}</p></div>
    <div><span>${ic('compass',18)}</span><b>${L('Utilisation','Use')}</b><p>${L('Uniquement pour traiter votre demande et votre candidature.','Only to process your request and application.')}</p></div>
    <div><span>${ic('users',18)}</span><b>${L('Qui y a accès','Who can access it')}</b><p>${L('Seuls les conseillers habilités de Campus Monde.','Only authorised Campus Monde advisers.')}</p></div>
    <div><span>${ic('send',18)}</span><b>${L('Transmission','Sharing')}</b><p>${L('À l’établissement choisi, après validation et avec votre accord.','To your chosen institution, after validation and with your consent.')}</p></div>
   </div>
   <div class="lg-rights"><div><b>${L('Vos droits','Your rights')}</b><div class="lg-chips"><span>${ic('eye',14)}${L('Accès','Access')}</span><span>${ic('sliders',14)}${L('Rectification','Correction')}</span><span>${ic('alert',14)}${L('Suppression','Deletion')}</span></div><small>${L('Durée de conservation :','Retention period:')} <span class="lg-tbc">${L('À définir','To be defined')}</span></small></div><a class="btn btn-o btn-sm" href="mailto:Billenium.corp@gmail.com?subject=${encodeURIComponent(L('Exercice de mes droits — données personnelles','Exercising my rights — personal data'))}">${ic('mail',16)} ${L('Exercer mes droits','Exercise my rights')}</a></div>
   <p class="lg-small">${ic('check',16)} ${L('Le consentement aux communications commerciales est distinct et facultatif.','Consent to marketing communications is separate and optional.')}</p>`,'shield')}
  ${sec('Cookies',`<p>${L('Le site utilise uniquement des cookies et stockages techniques nécessaires à son fonctionnement.','The site only uses technical cookies and storage needed for it to work.')}</p>
   <div class="lg-table"><div class="lg-tr lg-th"><span>${L('Élément','Item')}</span><span>${L('Rôle','Purpose')}</span><span>${L('Statut','Status')}</span></div>
    <div class="lg-tr"><span><b>Session</b></span><span>${L('Garder votre connexion active','Keep you logged in')}</span><span class="lg-ok">${L('Technique','Technical')}</span></div>
    <div class="lg-tr"><span><b>${L('Langue','Language')}</b></span><span>${L('Mémoriser français ou anglais','Remember French or English')}</span><span class="lg-ok">${L('Technique','Technical')}</span></div>
    <div class="lg-tr"><span><b>${L('Mesure d’audience','Analytics')}</b></span><span>${L('Statistiques de visite','Visit statistics')}</span><span class="lg-off">${L('Jamais sans votre accord','Never without consent')}</span></div>
   </div>`,'lock')}
  ${sec(L('Conditions d’utilisation','Terms of use'),`<div class="lg-terms">
    <div class="ok"><b>${ic('check',16)} ${L('Ce que fait Campus Monde','What Campus Monde does')}</b><p>${L('Un service d’information et d’accompagnement pour vos études à l’étranger.','An information and support service for studying abroad.')}</p></div>
    <div class="no"><b>${ic('alert',16)} ${L('Ce qui n’est pas garanti','What is not guaranteed')}</b><p>${L('Aucune admission, bourse, AVI ou visa n’est garanti : la décision appartient aux établissements et aux autorités.','No admission, scholarship, AVI or visa is guaranteed: decisions belong to institutions and authorities.')}</p></div>
    <div class="you"><b>${ic('user',16)} ${L('Votre engagement','Your commitment')}</b><p>${L('Vous certifiez l’exactitude des informations et documents fournis.','You certify the accuracy of the information and documents you provide.')}</p></div>
   </div>`,'list')}
  ${typeof photoCreditsBody==='function'&&S.photos?`<article class="lg-sec" id="lg-photos"><div class="lg-h"><span class="lg-ic">${ic('globe',20)}</span><div><span class="lg-n">${String(n+1).padStart(2,'0')}</span><h2>${L('Crédits photos','Photo credits')}</h2></div></div>${photoCreditsBody()}</article>`:''}`;
  if(S.photos&&typeof photoCreditsBody==='function')toc.push(['lg-photos',L('Crédits photos','Photo credits'),'globe']);
  return `<div class="lg-prog"><i></i></div><section class="block lg-wrap"><div class="wrap lg-grid"><aside class="lg-toc"><span class="kicker">${L('Sommaire','Contents')}</span><ol>${toc.map(t=>`<li><button type="button" data-goto="${t[0]}">${ic(t[2]||'filecheck',16)}<span>${t[1]}</span></button></li>`).join('')}</ol><button type="button" class="lg-print" data-print="1">${ic('download',16)} ${L('Imprimer / PDF','Print / PDF')}</button><div class="lg-help">${ic('mail',18)}<div><b>${L('Une question ?','A question?')}</b><a href="#contact">${L('Contactez-nous','Contact us')}</a></div></div></aside><div class="lg-main prose">${body}</div></div></section>`})();
}

/* ---------- Espace candidat ---------- */
function authCard(){return authStudent()}
function outboxPeek(){return ''}
function vSpace(){
  const u=ME();
  if(u&&u.role!=='candidat')return pageH(L('Espace étudiant','Student area'),'')+`<section class="sec"><div class="wrap"><div class="alert info">${L('Vous êtes connecté avec un compte personnel Campus Monde.','You are logged in with a Campus Monde staff account.')} <a href="#admin">Back-office</a> · <a href="#" data-act="logout">${L('Se déconnecter','Log out')}</a></div></div></section>`;
  if(!u)return authStudent();
  if(!u.verified)return authVerify(u);
  const tab=ui.ctab||'apps';
  const apps=S.apps.filter(a=>a.uid===u.id);
  const unread=S.outbox.filter(m=>m.to===u.email&&!m.read).length;
  const side=`<aside class="side"><div class="who"><b>${esc(u.name)}</b><div class="small muted">${esc(u.email)}</div></div>${[['apps',ic('folder'),L('Mes candidatures','My applications')],['new',ic('plus'),L('Nouvelle candidature','New application')],['rdv',ic('calendar'),L('Mon entretien','My meeting')],['profile',ic('user'),L('Mon profil','My profile')],['mail',ic('bell'),L('Notifications','Notifications')+(unread?` (${unread})`:'')],['security',ic('lock'),L('Sécurité','Security')]].map(x=>`<button class="${tab===x[0]||(tab==='app'&&x[0]==='apps')?'on':''}" data-act="ctab" data-id="${x[0]}">${x[1]} ${x[2]}</button>`).join('')}<button data-act="logout">${ic('logout')} ${L('Déconnexion','Log out')}</button></aside>`;
  let body='';
  if(tab==='apps')body=stApps(u);
  if(tab==='new')body=ui.appId?appView(u):stNew(u);
  if(tab==='app')body=appView(u);
  if(tab==='profile')body=profileView(u);
  if(tab==='mail')body=stMail(u);
  if(tab==='rdv')body=stRdv(u);
  if(tab==='security')body=stSecurity(u);
  return consoleShell('student',u,null,tab,body);
}
function profileComplete(u){const p=u.profile||{};return ['first','last','dob','nat','country','city','phone'].every(k=>p[k])&&(u.role!=='candidat'||!!u.photo)}
function appView(u){
  let a=S.apps.find(x=>x.id===ui.appId&&x.uid===u.id);
  if(!a)return `<p>—</p>`;
  const p=PROG(a.prog),i=INST(a.inst);
  if(a.status==='draft'){
    const st=ui.wstep||1;const req=requiredDocs(a);const have=req.filter(k=>a.docs.some(d=>d.type===k)).length;
    const PAYON=payOn(),paidP=paidOf(a);
    const parts=[a.country&&a.inst&&a.prog&&a.intake?1:0,have/req.length].concat(PAYON?[paidP?1:0]:[]).concat([st>=4?1:0]);
    const pct=Math.round(parts.reduce((x,y)=>x+y,0)/parts.length*100);
    const labs=[[1,L('Projet d\'études','Study project')],[2,L('Documents','Documents')]].concat(PAYON?[[3,L('Paiement','Payment')]]:[]).concat([[4,L('Vérification & envoi','Review & submit')]]);
    const steps=`<div class="wiz">${labs.map((x,k)=>`<span class="${st===x[0]?'on':st>x[0]?'done':''}">${k+1}. ${x[1]}</span>`).join('')}</div><div class="prog"><div style="width:${pct}%"></div></div><p class="small muted">${L('Brouillon enregistré automatiquement','Draft saved automatically')} · ${esc(a.ref)}</p>`;
    let b='';
    if(st===1)b=`<form class="card flat" data-form="wiz1" novalidate><div class="row2"><div class="f"><label>${L('Pays visé','Target country')} *</label><select name="country" data-live="country" required><option value="">—</option>${REGIONS.map(r=>`<optgroup label="${L(r[1],r[2])}">${COUNTRIES.filter(c=>c.reg===r[0]).map(c=>{const ok=S.institutions.some(i=>i.country===c.id);return `<option value="${c.id}" ${a.country===c.id?'selected':''} ${ok?'':'disabled'}>${N(c)}${ok?'':' — '+L('sur demande','on request')}</option>`}).join('')}</optgroup>`).join('')}</select></div>
      <div class="f"><label>${L('Établissement','Institution')} *</label><select name="inst" data-live="inst" required><option value="">—</option>${S.institutions.filter(x=>!a.country||x.country===a.country).map(x=>`<option value="${x.id}" ${a.inst===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div></div>
      <div class="f"><label>${L('Programme','Programme')} *</label><select name="prog" data-live="prog" required><option value="">—</option>${S.programs.filter(x=>x.inst===a.inst).map(x=>`<option value="${x.id}" ${a.prog===x.id?'selected':''}>${esc(N(x))} (${x.level})</option>`).join('')}</select></div>
      <div class="row2"><div class="f"><label>${L('Niveau d\'études actuel','Current level of study')} *</label><select name="level" required><option value="">—</option>${[['bac',L('Baccalauréat','High school diploma')],['licence',L('Licence / Bachelor','Bachelor')],['master','Master'],['autre',L('Autre','Other')]].map(o=>`<option value="${o[0]}" ${a.level===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></div>
      <div class="f"><label>${L('Rentrée souhaitée','Desired intake')} *</label><select name="intake" required><option value="">—</option>${['Septembre 2027','Janvier 2028','Septembre 2028'].map(o=>`<option ${a.intake===o?'selected':''}>${o}</option>`).join('')}</select></div></div>
      <div class="f"><label>${L('Choix alternatif (facultatif)','Alternative choice (optional)')}</label><input name="alt" value="${esc(a.alt||'')}" placeholder="${L('Autre établissement ou programme','Other institution or programme')}"></div>
      <div style="display:flex;justify-content:space-between;gap:10px"><button type="button" class="btn btn-g" data-act="delDraft">${L('Supprimer le brouillon','Delete draft')}</button><button class="btn btn-o">${L('Continuer','Continue')}</button></div></form>`;
    if(st===2)b=`<div class="card flat">${docsUploader(a,true)}<div style="display:flex;justify-content:space-between;gap:10px;margin-top:16px"><button class="btn btn-g" data-act="wstep" data-id="1">← ${L('Retour','Back')}</button><button class="btn btn-o" data-act="wnext3">${L('Continuer','Continue')}</button></div></div>`;
    if(st===3)b=payStep(a);
    if(st===4){const ok=profileComplete(u)&&have===req.length&&a.prog&&(!PAYON||paidP);
      b=`<div class="card flat"><h3>${L('Récapitulatif','Summary')}</h3><table><tbody><tr><th>${L('Candidat','Applicant')}</th><td>${esc(u.profile.first||'')} ${esc(u.profile.last||'')} ${profileComplete(u)?ic('check',16):`<span class="tag warn">${L('Profil incomplet','Profile incomplete')}</span>`}</td></tr><tr><th>${L('Pays','Country')}</th><td>${N(CTRY(a.country))}</td></tr><tr><th>${L('Établissement','Institution')}</th><td>${esc(i?i.name:'—')}</td></tr><tr><th>${L('Programme','Programme')}</th><td>${esc(p?N(p):'—')}</td></tr><tr><th>${L('Rentrée','Intake')}</th><td>${esc(a.intake)}</td></tr><tr><th>${L('Pièces','Documents')}</th><td>${have}/${req.length} ${have===req.length?ic('check',16):''}</td></tr>${PAYON?`<tr><th>${L('Frais de dossier','Application fee')}</th><td>${paidP?`${money(paidP.amount,paidP.currency)} · ${N(PAYM[paidP.method])} · <span class="small muted">${esc(paidP.ref)}</span> ${ic('check',16)}`:`<span class="tag warn">${L('Non payés','Not paid')}</span>`}</td></tr>`:''}</tbody></table>
      <form data-form="submitApp" style="margin-top:16px"><label class="chk"><input type="checkbox" name="exact" required> ${L('Je certifie l\'exactitude des informations et documents fournis.','I certify that the information and documents provided are accurate.')}</label><label class="chk" style="margin-top:8px"><input type="checkbox" name="share" required> ${L('J\'autorise Campus Monde à transmettre mon dossier à l\'établissement choisi après validation.','I authorise Campus Monde to send my file to the chosen institution after validation.')}</label>
      ${ok?'':`<div class="alert err" style="margin-top:12px">${L('Pour soumettre : complétez votre profil, ajoutez toutes les pièces requises','To submit: complete your profile, upload all required documents')}${PAYON?L(' et payez les frais de dossier',' and pay the application fee'):''}.</div>`}
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:14px"><button type="button" class="btn btn-g" data-act="wstep" data-id="${PAYON?3:2}">← ${L('Retour','Back')}</button><button class="btn btn-o" ${ok?'':'disabled'}>${L('Soumettre ma candidature','Submit my application')}</button></div></form></div>`}
    return `<h2>${L('Nouvelle candidature','New application')}</h2>${steps}${b}`;
  }
  const idx=PATH.indexOf(a.status);
  const tl=`<ul class="timeline">${PATH.map((s,k)=>{const h=[...a.history].reverse().find(x=>x.s===s);const cls=a.status===s?'cur':(idx>k||h)&&idx>=0&&k<idx?'done':'';return `<li class="${cls}"><i></i><b>${N(STATUS[s])}</b>${h?`<div class="small muted">${fmtD(h.at,1)}</div>`:''}</li>`}).join('')}</ul>${['incomplete','refused','withdrawn','closed'].includes(a.status)?`<div class="alert ${a.status==='incomplete'?'info':'err'}">${L('Statut actuel','Current status')} : <b>${N(STATUS[a.status])}</b></div>`:''}`;
  return `<p><a href="#" data-act="ctab" data-id="apps">← ${L('Mes candidatures','My applications')}</a></p><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><div><h2 style="margin:0">${esc(p?N(p):'—')}</h2><p class="muted" style="margin:4px 0 0">${esc(a.ref)} · ${esc(i?i.name:'')} · ${N(CTRY(a.country))} · ${esc(a.intake)}</p></div><div style="display:flex;gap:8px">${stTag(a.status)}<button class="btn btn-g btn-sm" data-act="receipt" data-id="${a.id}">${ic('receipt',18)} ${L('Reçu de dépôt','Receipt')}</button></div></div>
  <div class="grid g2 cols-b" style="margin-top:20px"><div class="card flat"><h3>${L('Suivi du dossier','File progress')}</h3>${tl}${a.decision?`<div class="alert ok">${L('Décision','Decision')} : <b>${N(STATUS[a.decision.value])}</b> — ${fmtD(a.decision.date)}</div>`:''}${!['withdrawn','closed','enrolled','refused'].includes(a.status)?`<button class="btn btn-g btn-sm" data-act="withdraw" data-id="${a.id}">${L('Retirer ma candidature','Withdraw application')}</button>`:''}</div>
  <div>${payCard(a)}<div class="card flat">${docsUploader(a,['incomplete','submitted','review'].includes(a.status))}</div>
  <div class="card flat" style="margin-top:16px"><h3>${ic('chat')} ${L('Échanges avec Campus Monde','Messages with Campus Monde')}</h3><div>${a.messages.map(m=>`<div class="msg ${m.from==='candidat'?'me':'them'}">${esc(m.text)}<small>${esc(m.name)} · ${fmtD(m.at,1)}</small></div>`).join('')||`<p class="muted small">${L('Aucun message.','No messages.')}</p>`}</div><form data-form="cmsg" style="display:flex;gap:8px;margin-top:10px"><input name="text" placeholder="${L('Votre message…','Your message…')}" required><button class="btn btn-b">${L('Envoyer','Send')}</button></form></div></div></div>`;
}
function docsUploader(a,canUpload){
  const req=requiredDocs(a);
  return `<h3>${ic('clip')} ${L('Pièces requises','Required documents')}</h3><p class="small muted">${L('Checklist adaptée à votre programme et à votre pays. PDF, JPG ou PNG — 5 Mo max.','Checklist tailored to your programme and country. PDF, JPG or PNG — max 5 MB.')}</p>${req.map(k=>{const d=[...a.docs].reverse().find(x=>x.type===k);const st=d?DOCST[d.status]:null;return `<div class="docrow${!d&&ui.docErr?' miss':''}"><div><b>${N(DOC_TYPES[k])}</b><div class="small muted">${d?`<a href="/api/docs/${d.id}" target="_blank" rel="noopener">${esc(d.name)}</a> · v${d.version} · ${fmtD(d.uploadedAt)}`:L('Non fourni','Not provided')}</div>${d&&d.comment?`<div class="small" style="color:var(--warn)">↳ ${esc(d.comment)}</div>`:''}</div><div style="display:flex;gap:8px;align-items:center">${d?`<span class="tag ${st.c}">${N(st)}</span>`:`<span class="tag warn">${L('Manquant','Missing')}</span>`}${canUpload||(d&&['replace','illegible','expired'].includes(d.status))?`<span class="btn btn-g btn-sm filebtn">${d?L('Remplacer','Replace'):L('Ajouter','Upload')}<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" data-up="${k}" data-app="${a.id}"></span>`:''}</div></div>`}).join('')}`;
}

/* ---------- Back-office ---------- */
const can={
  seeAll:u=>['responsable','admin'].includes(u.role),
  validate:u=>['responsable','admin'].includes(u.role),
  catalogue:u=>u.role==='admin',
  users:u=>u.role==='admin',
  audit:u=>['responsable','admin'].includes(u.role),
  export:u=>['responsable','admin'].includes(u.role)
};
function myApps(u){return S.apps.filter(a=>a.status!=='draft'&&(can.seeAll(u)||a.agent===u.id))}
function vAdmin(){
  const u=ME();
  if(!u&&S.mfaPending)return authMfa();
  if(!u||u.role==='candidat')return authAdmin();
  const tab=ui.atab||'dash';
  const items=[['dash',ic('chart'),L('Tableau de bord','Dashboard')],['apps',ic('folder'),L('Dossiers','Applications')],['leads',ic('inbox'),L('Demandes d\'information','Enquiries')]];
  items.push(['iv',ic('calendar'),L('Entretiens','Meetings')]);
  if(can.seeAll(u))items.push(['pay',ic('receipt'),L('Paiements','Payments')]);
  if(can.catalogue(u))items.push(['cat',ic('building'),L('Catalogue','Catalogue')]);
  if(can.users(u))items.push(['users',ic('users'),L('Utilisateurs & rôles','Users & roles')]);
  if(can.audit(u))items.push(['audit',ic('list'),L('Journal d\'activité','Activity log')]);
  items.push(['out',ic('mail'),L('Notifications envoyées','Sent notifications')]);
  const side=`<aside class="side"><div class="who"><b>${esc(u.name)}</b><div class="small muted">${N(ROLES[u.role])}</div></div>${items.map(x=>`<button class="${tab===x[0]||(tab==='file'&&x[0]==='apps')?'on':''}" data-act="atab" data-id="${x[0]}">${x[1]} ${x[2]}</button>`).join('')}<button data-act="logout">${ic('logout')} ${L('Déconnexion','Log out')}</button></aside>`;
  const V={dash:adDash,apps:adApps,file:adFile,iv:adIv,pay:adPay,leads:adLeads,cat:adCat,users:adUsers,audit:adAudit,out:adOut}[tab]||adDash;
  return consoleShell('admin',u,items,tab,V(u));
}
function adFile(u){
  const a=myApps(u).find(x=>x.id===ui.fileId);if(!a)return `<div class="alert err">${L('Dossier introuvable ou non autorisé.','File not found or not authorised.')}</div>`;
  const cu=USER(a.uid),p=PROG(a.prog),i=INST(a.inst),pr=cu.profile||{};
  const req=requiredDocs(a);const allOk=req.every(k=>{const d=[...a.docs].reverse().find(x=>x.type===k);return d&&d.status==='ok'});
  const agents=S.users.filter(x=>x.role==='agent');
  const agentStatuses=['review','incomplete'];
  const respStatuses=['review','incomplete','ready','pending','admitted','refused','predeparture','enrolled','withdrawn','closed'];
  const opts=(can.validate(u)?respStatuses:agentStatuses).filter(s=>s!==a.status);
  return `<p><a href="#" data-act="atab" data-id="apps">← ${L('Dossiers','Applications')}</a></p>
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div class="cx-who">${avatar(cu,56)}<div><h2 style="margin:0">${esc(a.ref)} — ${esc(cu.name)}</h2><p class="muted" style="margin:4px 0">${esc(p?N(p):'')} · ${esc(i?i.name:'')} · ${N(CTRY(a.country))} · ${esc(a.intake)}${a.alt?` · ${L('Alt.','Alt.')} ${esc(a.alt)}`:''}</p></div></div><div>${stTag(a.status)}</div></div>
  <div class="grid g2 cols-a" style="margin-top:18px">
  <div>
   <div class="card flat"><h3>${ic('user')} ${L('Candidat','Applicant')}</h3><table><tbody><tr><th>${L('Identité','Identity')}</th><td>${esc(pr.first||'')} ${esc(pr.last||'')} · ${L('né(e) le','born')} ${fmtD(pr.dob)}</td></tr><tr><th>${L('Nationalité','Nationality')}</th><td>${esc(pr.nat||'')}</td></tr><tr><th>${L('Résidence','Residence')}</th><td>${esc(pr.city||'')}, ${esc(pr.country||'')}</td></tr><tr><th>Contact</th><td>${esc(cu.email)}<br>${esc(pr.phone||'')}</td></tr><tr><th>${L('Consentements','Consents')}</th><td class="small">${L('Confidentialité','Privacy')} ${ic('check',16)} · Marketing ${cu.mkt?ic('check',16):'—'}</td></tr></tbody></table></div>
   <div class="card flat" style="margin-top:16px"><h3>${ic('clip')} ${L('Contrôle des pièces','Document check')}</h3>${req.map(k=>{const d=[...a.docs].reverse().find(x=>x.type===k);return `<div class="docrow"><div style="flex:1;min-width:200px"><b>${N(DOC_TYPES[k])}</b><div class="small muted">${d?`${esc(d.stored||d.name)} · v${d.version} · ${(d.size/1024).toFixed(0)} Ko · ${fmtD(d.uploadedAt)}${d.checkedBy?` · ${L('contrôlé par','checked by')} ${esc(d.checkedBy)} ${fmtD(d.checkedAt)}`:''}`:L('Non fourni','Not provided')}</div></div>${d?`<div style="display:flex;gap:6px;flex-wrap:wrap"><a class="btn btn-g btn-sm" href="/api/docs/${d.id}" target="_blank" rel="noopener" title="${L('Ouvrir','Open')}">${ic('eye',16)}</a><select data-docst="${k}" data-app="${a.id}" style="width:auto;padding:.4em">${Object.keys(DOCST).map(s=>`<option value="${s}" ${d.status===s?'selected':''}>${N(DOCST[s])}</option>`).join('')}</select></div>`:`<span class="tag warn">${L('Manquant','Missing')}</span>`}</div>`}).join('')}
   <button class="btn btn-g btn-sm" style="margin-top:12px" data-act="askDocs" data-id="${a.id}">${ic('mail',16)} ${L('Demander un complément','Request documents')}</button></div>
   <div class="card flat" style="margin-top:16px"><h3>${ic('chat')} ${L('Échanges avec le candidat','Messages with applicant')}</h3>${a.messages.map(m=>`<div class="msg ${m.from==='staff'?'me':'them'}">${esc(m.text)}<small>${esc(m.name)} · ${fmtD(m.at,1)}</small></div>`).join('')||`<p class="muted small">—</p>`}<form data-form="smsg" style="display:flex;gap:8px;margin-top:10px"><input name="text" required placeholder="${L('Message visible par le candidat…','Message visible to applicant…')}"><button class="btn btn-b">${L('Envoyer','Send')}</button></form></div>
  </div>
  <div>
   ${payCard(a)}<div class="card flat"><h3>${ic('sliders')} ${L('Traitement','Processing')}</h3>
    ${can.validate(u)?`<div class="f"><label>${L('Agent affecté','Assigned officer')}</label><select data-assign="${a.id}"><option value="">—</option>${agents.map(g=>`<option value="${g.id}" ${a.agent===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></div>`:`<p class="small">${L('Agent','Officer')} : <b>${esc(USER(a.agent)?.name||'—')}</b></p>`}
    <form data-form="status"><div class="f"><label>${L('Changer le statut','Change status')}</label><select name="s">${opts.map(s=>`<option value="${s}">${N(STATUS[s])}</option>`).join('')}</select></div><div class="f"><input name="note" placeholder="${L('Motif / commentaire (facultatif)','Reason / comment (optional)')}"></div><button class="btn btn-b btn-sm">${L('Appliquer','Apply')}</button></form>
    ${can.validate(u)&&['review','submitted'].includes(a.status)?`<div style="margin-top:12px">${allOk?`<button class="btn btn-o btn-sm" data-act="validate" data-id="${a.id}">${ic('check',16)} ${L('Valider — prêt à transmettre','Validate — ready to send')}</button>`:`<p class="small muted">${L('Validation possible lorsque toutes les pièces sont conformes.','Validation available once all documents are compliant.')}</p>`}</div>`:''}
   </div>
   ${can.validate(u)?`<div class="card flat" style="margin-top:16px"><h3>${ic('send')} ${L('Transmission à l\'établissement','Submission to institution')}</h3>${a.transmission?`<table class="small"><tbody><tr><th>${L('Canal','Channel')}</th><td>${esc(a.transmission.channel)}</td></tr><tr><th>${L('Destinataire','Recipient')}</th><td>${esc(a.transmission.recipient)}</td></tr><tr><th>Date</th><td>${fmtD(a.transmission.date)}</td></tr><tr><th>${L('Pièces','Documents')}</th><td>${esc(a.transmission.docs)}</td></tr><tr><th>${L('Preuve / AR','Proof / receipt')}</th><td>${esc(a.transmission.ack||'—')}</td></tr></tbody></table>`:a.status==='ready'?`<form data-form="transmit"><div class="f"><label>${L('Canal','Channel')}</label><select name="channel"><option>E-mail</option><option>${L('Export sécurisé','Secure export')}</option><option>${L('Portail de l\'établissement','Institution portal')}</option><option>${L('Courrier','Post')}</option></select></div><div class="f"><label>${L('Destinataire','Recipient')}</label><input name="recipient" required></div><div class="f"><label>Date</label><input name="date" type="date" required value="${now().slice(0,10)}"></div><div class="f"><label>${L('Pièces envoyées','Documents sent')}</label><input name="docs" value="${L('Dossier complet','Complete file')} (${req.length})"></div><div class="f"><label>${L('Accusé de réception / référence','Acknowledgement / reference')}</label><input name="ack"></div><button class="btn btn-o btn-sm">${L('Enregistrer la transmission','Record submission')}</button></form>`:`<p class="small muted">${L('Disponible au statut « Prêt à transmettre ».','Available at “Ready to send” status.')}</p>`}</div>
   <div class="card flat" style="margin-top:16px"><h3>${ic('bank')} ${L('Décision de l\'établissement','Institution decision')}</h3>${a.decision?`<p>${stTag(a.decision.value)} ${fmtD(a.decision.date)}<br><span class="small muted">${L('Justificatif','Proof')} : ${esc(a.decision.ref)}</span></p>`:['transmitted','pending'].includes(a.status)?`<form data-form="decision"><div class="f"><select name="value"><option value="admitted">${N(STATUS.admitted)}</option><option value="refused">${N(STATUS.refused)}</option><option value="pending">${N(STATUS.pending)}</option></select></div><div class="f"><input name="ref" required placeholder="${L('Référence du courrier / e-mail officiel','Official letter / email reference')}"></div><div class="f"><input name="date" type="date" required value="${now().slice(0,10)}"></div><button class="btn btn-b btn-sm">${L('Enregistrer la décision','Record decision')}</button></form>`:`<p class="small muted">${L('Après transmission.','After submission.')}</p>`}</div>`:''}
   <div class="card flat" style="margin-top:16px"><h3>${ic('lock')} ${L('Notes internes','Internal notes')}</h3><p class="small muted">${L('Non visibles par le candidat.','Not visible to the applicant.')}</p>${a.notes.map(n=>`<div class="small" style="border-top:1px solid var(--line);padding:8px 0">${esc(n.text)}<div class="muted">${esc(n.author)} · ${fmtD(n.at,1)}</div></div>`).join('')}<form data-form="note" style="display:flex;gap:8px;margin-top:8px"><input name="text" required placeholder="${L('Ajouter une note…','Add a note…')}"><button class="btn btn-g btn-sm">+</button></form></div>
   <div class="card flat" style="margin-top:16px"><h3>${ic('history')} ${L('Historique','History')}</h3><ul class="timeline">${[...a.history].reverse().map(h=>`<li class="done"><i></i><b>${N(STATUS[h.s])}</b><div class="small muted">${fmtD(h.at,1)} · ${esc(h.by)}${h.note?` — ${esc(h.note)}`:''}</div></li>`).join('')}</ul></div>
  </div></div>`;
}
function adCat(){return `<h2>${L('Catalogue','Catalogue')}</h2><h3>${L('Écoles & universités','Schools & universities')}</h3><div class="tbl-w"><table><thead><tr><th>${L('Nom','Name')}</th><th>${L('Pays','Country')}</th><th>${L('Relation','Relationship')}</th><th>${L('Vérifié le','Checked on')}</th></tr></thead><tbody>${S.institutions.map(i=>`<tr><td>${esc(i.name)}</td><td>${N(CTRY(i.country))}</td><td><select data-rel="${i.id}" style="width:auto;padding:.35em">${Object.keys(REL).map(r=>`<option value="${r}" ${i.relation===r?'selected':''}>${N(REL[r])}</option>`).join('')}</select></td><td><button class="btn btn-g btn-sm" data-act="verifyInst" data-id="${i.id}">${i.verified?fmtD(i.verified):L('Marquer vérifié','Mark checked')}</button></td></tr>`).join('')}</tbody></table></div>
  <div class="notice small" style="margin:10px 0 26px">${L('« Partenaire confirmé » uniquement avec un accord écrit archivé.','“Confirmed partner” only with an archived written agreement.')}</div>
  <h3>${L('Formations','Programmes')}</h3><div class="tbl-w"><table><thead><tr><th>${L('Programme','Programme')}</th><th>${L('Établissement','Institution')}</th><th>${L('Candidature ouverte','Applications open')}</th><th>${L('Période','Period')}</th></tr></thead><tbody>${S.programs.map(p=>`<tr><td>${esc(N(p))}</td><td class="small">${esc(INST(p.inst)?.name||'')}</td><td><input type="checkbox" style="width:auto" data-open="${p.id}" ${p.open?'checked':''}></td><td><input data-period="${p.id}" value="${esc(p.period)}" placeholder="${L('ex. jusqu\'au 15/01/2027','e.g. until 15/01/2027')}" style="padding:.35em"></td></tr>`).join('')}</tbody></table></div>
  <h3 style="margin-top:26px">${L('Ajouter un établissement','Add an institution')}</h3><form class="card flat" data-form="addInst"><div class="row2"><div class="f"><label>${L('Nom officiel','Official name')}</label><input name="name" required></div><div class="f"><label>${L('Pays','Country')}</label><select name="country">${COUNTRIES.map(c=>`<option value="${c.id}">${N(c)}</option>`).join('')}</select></div></div><div class="row2"><div class="f"><label>${L('Ville','City')}</label><input name="city" required></div><div class="f"><label>${L('Site officiel','Official website')}</label><input name="site" type="url" required placeholder="https://"></div></div><button class="btn btn-b btn-sm">${L('Ajouter','Add')}</button></form>
  <h3 style="margin-top:26px">${L('Ajouter une formation','Add a programme')}</h3><form class="card flat" data-form="addProg"><div class="row2"><div class="f"><label>${L('Établissement','Institution')}</label><select name="inst">${S.institutions.map(i=>`<option value="${i.id}">${esc(i.name)}</option>`).join('')}</select></div><div class="f"><label>${L('Niveau','Level')}</label><select name="level"><option value="licence">Licence / Bachelor</option><option value="master">Master</option></select></div></div><div class="row2"><div class="f"><label>${L('Intitulé (FR)','Title (FR)')}</label><input name="fr" required></div><div class="f"><label>${L('Intitulé (EN)','Title (EN)')}</label><input name="en"></div></div><div class="row2"><div class="f"><label>${L('Langue d\'enseignement','Language')}</label><select name="lang"><option value="FR">${L('Français','French')}</option><option value="EN">${L('Anglais','English')}</option></select></div><div class="f"><label>${L('Durée','Duration')}</label><input name="dur" placeholder="3 ans / 3 years"></div></div><button class="btn btn-b btn-sm">${L('Ajouter','Add')}</button></form>`}

/* ---------- Logique métier (appels API) ---------- */
async function run(fn,ok){
  try{await fn();await load();ui.msg=ok?{t:'ok',m:ok}:null;rerender()}
  catch(e){ui.msg={t:'err',m:e.message};if(e.status===401)await load().catch(()=>{});rerender()}
}
async function newApp(progId){
  const u=ME();
  if(u&&u.role!=='candidat'){toast(L('Vous êtes connecté avec un compte du back-office. Déconnectez-vous puis utilisez un compte candidat pour candidater.','You are logged in with a back-office account. Log out and use an applicant account to apply.'));return}
  if(!u){ui.auth='register';ui.msg={t:'info',m:L('Créez un compte ou connectez-vous pour candidater.','Create an account or log in to apply.')};ui.pendingProg=progId||null;ui.keepMsg=1;go('espace');scrollTo(0,0);return}
  // Compte non vérifié : on garde la formation choisie et on renvoie vers l'écran de vérification du code
  if(!u.verified){ui.pendingProg=progId||null;ui.msg={t:'info',m:L('Vérifiez d\'abord votre adresse e-mail avec le code reçu, puis votre candidature à cette formation sera créée.','Please verify your email with the code you received first; your application to this programme will then be created.')};go('espace');scrollTo(0,0);return}
  try{const r=await api('POST','/api/apps',{prog:progId||null});await load();ui.ctab='app';ui.appId=r.id;ui.wstep=1;ui.msg=null;if(route!=='espace')go('espace');else rerender();scrollTo(0,0)}
  catch(e){ui.msg={t:'err',m:e.message};toast(e.message);if(route!=='espace'){ui.keepMsg=1;go('espace')}else rerender()}
}
/* Contrôle des champs obligatoires d'un formulaire : signale chaque champ vide et bloque l'étape suivante */
/* ---------- Paiement des frais de dossier ---------- */
const PAYM={mtn:{fr:'MTN Mobile Money',en:'MTN Mobile Money',kind:'momo',hint:'06',cls:'pm-mtn',short:'MTN MoMo'},airtel:{fr:'Airtel Money',en:'Airtel Money',kind:'momo',hint:'05 / 04',cls:'pm-airtel',short:'Airtel Money'},card:{fr:'Carte bancaire',en:'Bank card',kind:'card',cls:'pm-card',short:'Visa · Mastercard'}};
const PAYST={pending:{fr:'En attente',en:'Pending',c:'warn'},paid:{fr:'Payé',en:'Paid',c:'ok'},failed:{fr:'Échoué',en:'Failed',c:'err'},cancelled:{fr:'Annulé',en:'Cancelled',c:'grey'},refunded:{fr:'Remboursé',en:'Refunded',c:'grey'}};
const payOn=()=>!!(S&&S.pay&&S.pay.fee>0&&S.pay.methods&&S.pay.methods.length);
const paidOf=a=>(a.payments||[]).filter(p=>p.status==='paid').pop();
const money=(n,c)=>new Intl.NumberFormat('fr-FR').format(n||0).replace(/\u202f/g,' ')+' '+(c==='XAF'||!c?'FCFA':c);
const payTag=st=>`<span class="tag ${(PAYST[st]||{}).c||''}">${N(PAYST[st]||{fr:st,en:st})}</span>`;
function pmBadge(m){const x=PAYM[m];return x?`<span class="pm ${x.cls}">${x.short}</span>`:esc(m)}
function payStep(a){
  const cfg=S.pay,paid=paidOf(a),pend=(a.payments||[]).filter(p=>p.status==='pending').pop(),last=(a.payments||[]).slice(-1)[0];
  const back=`<button type="button" class="btn btn-g" data-act="wstep" data-id="2">← ${L('Retour','Back')}</button>`;
  const head=`<div class="pay-head"><div><div class="small muted">${L('Frais de dossier Campus Monde','Campus Monde application fee')}</div><div class="pay-amt">${money(cfg.fee,cfg.currency)}</div><div class="small muted">${L('Dossier','File')} ${esc(a.ref)} · ${L('paiement unique, non remboursable après soumission','one-time payment, non-refundable after submission')}</div></div>${cfg.mode==='simulation'?`<span class="tag warn">${L('Mode simulation — aucun débit réel','Simulation mode — no real charge')}</span>`:`<span class="tag ok">${ic('lock',14)} ${L('Paiement sécurisé','Secure payment')}</span>`}</div>`;
  if(paid)return `<div class="card flat">${head}<div class="alert ok"><b>${L('Paiement confirmé','Payment confirmed')}</b> — ${money(paid.amount,paid.currency)} ${L('par','via')} ${N(PAYM[paid.method])}${paid.phone?` (${esc(paid.phone)})`:''}<br><span class="small">${L('Référence','Reference')} ${esc(paid.ref)} · ${fmtBZ(paid.paidAt)}</span></div><div style="display:flex;justify-content:space-between;gap:10px;margin-top:16px">${back}<button class="btn btn-o" data-act="wstep" data-id="4">${L('Continuer','Continue')}</button></div></div>`;
  if(pend){const momo=PAYM[pend.method]&&PAYM[pend.method].kind==='momo';
    return `<div class="card flat" id="pay-wait" data-pid="${pend.id}">${head}<div class="pay-wait"><div class="spin" aria-hidden="true"></div><div><b>${momo?L('Validez le paiement sur votre téléphone','Approve the payment on your phone'):L('Finalisez le paiement par carte','Complete the card payment')}</b><p class="small" style="margin:4px 0 0">${momo?L(`Une demande de ${money(pend.amount,pend.currency)} a été envoyée au ${esc(pend.phone)} (${N(PAYM[pend.method])}). Saisissez votre code secret Mobile Money pour confirmer. Cette page se met à jour automatiquement.`,`A request for ${money(pend.amount,pend.currency)} was sent to ${esc(pend.phone)} (${N(PAYM[pend.method])}). Enter your Mobile Money PIN to confirm. This page updates automatically.`):L('Le paiement par carte se fait sur la page sécurisée de notre prestataire. Aucun numéro de carte n\'est saisi ni conservé par Campus Monde.','Card payment takes place on our provider\'s secure page. Campus Monde never enters or stores card numbers.')}</p><p class="small muted" style="margin:6px 0 0">${L('Réf.','Ref.')} ${esc(pend.ref)}</p></div></div>
    ${cfg.mode==='simulation'?`<div class="sim-box"><b>${L('Simulation (local)','Simulation (local)')}</b> — ${momo?L('en production, le candidat confirme sur son téléphone.','in production, the applicant confirms on their phone.'):L('en production, le candidat est redirigé vers la page de paiement du prestataire.','in production, the applicant is redirected to the provider\'s payment page.')}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn btn-o btn-sm" data-act="paySim" data-id="${pend.id}:paid">${ic('check',16)} ${momo?L('Simuler : code PIN validé','Simulate: PIN approved'):L('Simuler : carte acceptée','Simulate: card accepted')}</button><button class="btn btn-g btn-sm" data-act="paySim" data-id="${pend.id}:failed">${L('Simuler : refus','Simulate: declined')}</button></div></div>`:''}
    <div style="display:flex;justify-content:space-between;gap:10px;margin-top:16px">${back}<button class="btn btn-g" data-act="payCancel" data-id="${pend.id}">${L('Annuler ce paiement','Cancel this payment')}</button></div></div>`}
  const m=ui.paym&&cfg.methods.includes(ui.paym)?ui.paym:cfg.methods[0];const x=PAYM[m];
  return `<form class="card flat" data-form="pay" novalidate>${head}
    ${last&&last.status==='failed'?`<div class="alert err">${L('Le dernier paiement n\'a pas abouti','The last payment did not go through')} (${esc(last.ref)}). ${L('Aucun montant n\'a été débité. Vous pouvez réessayer.','No amount was charged. You can try again.')}</div>`:''}
    <h3 style="margin-top:6px">${L('Choisissez votre moyen de paiement','Choose your payment method')}</h3>
    <div class="pm-grid">${cfg.methods.map(k=>`<button type="button" class="pm-opt ${k===m?'on':''}" data-act="paym" data-id="${k}" aria-pressed="${k===m}">${pmBadge(k)}<b>${N(PAYM[k])}</b><span class="small muted">${PAYM[k].kind==='momo'?L('Confirmation sur votre téléphone','Confirm on your phone'):L('Page de paiement sécurisée','Secure payment page')}</span></button>`).join('')}</div>
    ${x.kind==='momo'?`<div class="f" style="max-width:380px;margin-top:16px"><label>${L('Numéro','Number')} ${N(x)} *</label><div class="tel"><span>+242</span><input name="phone" required inputmode="tel" autocomplete="tel" placeholder="${x.hint==='06'?'06 123 45 67':'05 123 45 67'}" value="${esc(((ME()||{}).profile||{}).phone||'').replace(/^\+?242\s*/,'')}"></div><div class="small muted" style="margin-top:4px">${L('Numéro commençant par','Number starting with')} ${x.hint}. ${L('Vous recevrez une demande de confirmation.','You will receive a confirmation request.')}</div></div>`:`<p class="small muted" style="margin-top:14px">${ic('lock',14)} ${L('Vous serez dirigé vers la page de paiement sécurisée (3-D Secure). Campus Monde ne voit ni ne conserve jamais vos données de carte.','You will be taken to the secure payment page (3-D Secure). Campus Monde never sees or stores your card details.')}</p>`}
    <div style="display:flex;justify-content:space-between;gap:10px;margin-top:18px">${back}<button class="btn btn-o">${L('Payer','Pay')} ${money(cfg.fee,cfg.currency)}</button></div></form>`;
}
function payCard(a){
  const ps=a.payments||[];if(!ps.length)return '';const p=paidOf(a)||ps[ps.length-1];
  return `<div class="card flat" style="margin-bottom:16px"><h3>${ic('receipt')} ${L('Frais de dossier','Application fee')}</h3><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><b>${money(p.amount,p.currency)}</b> · ${pmBadge(p.method)}<div class="small muted">${esc(p.ref)} · ${fmtBZ(p.paidAt||p.created)}</div></div>${payTag(p.status)}</div></div>`;
}
// Mise à jour automatique d'un paiement Mobile Money en attente
let payPoll=null;
function watchPayment(){
  const el=document.getElementById('pay-wait');
  if(!el){if(payPoll){clearInterval(payPoll);payPoll=null}return}
  if(payPoll)return;
  payPoll=setInterval(async()=>{const w=document.getElementById('pay-wait');if(!w){clearInterval(payPoll);payPoll=null;return}
    try{const r=await api('GET','/api/payments/'+w.dataset.pid);if(r.payment.status!=='pending'){clearInterval(payPoll);payPoll=null;await load();if(r.payment.status==='paid')toast(L('Paiement confirmé.','Payment confirmed.'));rerender()}}catch(e){}},4000);
}

/* Contrôle des champs obligatoires d'un formulaire : signale chaque champ vide et bloque l'étape suivante */
function checkRequired(fm,fields){
  fm.querySelectorAll('.ferr').forEach(x=>x.remove());fm.querySelectorAll('.invalid').forEach(x=>x.classList.remove('invalid'));
  const miss=[];
  for(const [name,label] of fields){const el=fm.elements[name];if(el&&!String(el.value||'').trim()){miss.push(label);el.classList.add('invalid');
    const m=document.createElement('div');m.className='ferr';m.textContent=L('Ce champ est obligatoire.','This field is required.');(el.parentElement.classList.contains('inp')?el.parentElement:el).insertAdjacentElement('afterend',m)}}
  let box=fm.querySelector('.alert.form-err');if(box)box.remove();
  if(!miss.length)return true;
  box=document.createElement('div');box.className='alert err form-err';box.style.marginBottom='14px';
  box.textContent=L('Champs obligatoires à compléter : ','Required fields missing: ')+miss.join(', ')+'.';fm.prepend(box);
  const first=fm.querySelector('.invalid');if(first){first.scrollIntoView({behavior:'smooth',block:'center'});first.focus({preventScroll:true})}
  return false;
}
['change','input'].forEach(ev=>document.addEventListener(ev,e=>{const t=e.target;if(t.classList&&t.classList.contains('invalid')&&String(t.value||'').trim()){t.classList.remove('invalid');const n=(t.parentElement.classList.contains('inp')?t.parentElement:t).nextElementSibling;if(n&&n.classList.contains('ferr'))n.remove()}},true));

/* Date et heure de Brazzaville */
function fmtBZ(d,withTime=true){if(!d)return '—';const o={timeZone:'Africa/Brazzaville',day:'2-digit',month:'long',year:'numeric'};if(withTime)Object.assign(o,{hour:'2-digit',minute:'2-digit'});
  try{return new Intl.DateTimeFormat(lang==='en'?'en-GB':'fr-FR',o).format(new Date(d))+(withTime?L(' (heure de Brazzaville)',' (Brazzaville time)'):'')}catch(e){return fmtD(d,withTime)}}
function qrSvg(text,size=132){
  if(typeof qrcode!=='function')return '';
  const q=qrcode(0,'M');q.addData(text);q.make();const n=q.getModuleCount(),m=2,c=size/(n+2*m);let r='';
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(q.isDark(y,x))r+=`M${((x+m)*c).toFixed(2)} ${((y+m)*c).toFixed(2)}h${c.toFixed(2)}v${c.toFixed(2)}h-${c.toFixed(2)}z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="#fff"/><path d="${r}" fill="#0B1F4D"/></svg>`;
}
function receipt(a){
  const u=USER(a.uid)||{},p=PROG(a.prog),i=INST(a.inst);const sub=a.history.find(h=>h.s==='submitted');const pr=u.profile||{};
  const subAt=a.submitted||(sub&&sub.at);const tok=a.receipt||'';const tokF=tok.replace(/(.{4})(?=.)/g,'$1-');
  const url=`${location.origin}/#verif-${a.ref}~${tok}`;
  const lv={bac:L('Baccalauréat','High school diploma'),licence:L('Licence / Bachelor','Bachelor'),master:'Master',autre:L('Autre','Other')}[a.level]||a.level||'—';
  const types=[...new Set(a.docs.map(d=>d.type))];const docs=types.map(k=>latest(a,k));
  const st=STATUS[a.status]||{};
  const row=(k,v)=>`<tr><th>${k}</th><td>${v||'—'}</td></tr>`;
  const txt=[`CAMPUS MONDE — ${L('REÇU DE DÉPÔT DE CANDIDATURE','APPLICATION RECEIPT')}`,`${L('N° de reçu','Receipt no.')} : R-${a.ref}`,`${L('Référence dossier','File reference')} : ${a.ref}`,`${L('Candidat','Applicant')} : ${pr.first||''} ${pr.last||''} (${u.email||''})`,`${L('Programme','Programme')} : ${p?N(p):''}`,`${L('Établissement','Institution')} : ${i?i.name:''} — ${N(CTRY(a.country))}`,`${L('Rentrée','Intake')} : ${a.intake}`,`${L('Déposé le','Submitted on')} : ${fmtBZ(subAt)}`,`${L('Pièces déposées','Documents')} : ${docs.length}`,`${L('Code de vérification','Verification code')} : ${tokF}`,`${L('Vérifier','Verify')} : ${url}`].join('\n');
  modal(`<div class="rcpt" id="rcpt">
  <div class="rc-head">
    <div class="rc-brand"><img src="/logo.jpg" alt="Campus Monde" width="74" height="74"><div><div class="rc-name">CAMPUS MONDE</div><div class="rc-tag">${L('Orientation et accompagnement aux études à l\'international','Guidance and support for studying abroad')}</div><div class="rc-addr">211, av. de la Base, Batignolles (arrêt Bopaka), Brazzaville — République du Congo<br>+242 06 683 83 55 · +242 05 350 50 12 · Billenium.corp@gmail.com</div></div></div>
    <div class="rc-title"><div class="rc-doc">${L('REÇU DE DÉPÔT','SUBMISSION RECEIPT')}</div><div class="rc-no">N° R-${esc(a.ref)}</div><div class="rc-issued">${L('Édité le','Issued on')} ${fmtBZ(new Date().toISOString())}</div></div>
  </div>
  <div class="rc-band"><div><span>${L('Référence du dossier','File reference')}</span><b>${esc(a.ref)}</b></div><div><span>${L('Date et heure de dépôt','Date & time of submission')}</span><b>${fmtBZ(subAt)}</b></div><div><span>${L('Statut actuel','Current status')}</span><b>${N(st)}</b></div></div>
  <div class="rc-grid">
    <div><h4>${L('Candidat','Applicant')}</h4>${u.photo?`<img class="rc-photo" src="/api/avatar/${u.id}?v=${u.photo}" alt="">`:''}<table>${row(L('Nom complet','Full name'),esc(`${pr.first||''} ${pr.last||''}`.trim()||u.name))}${row('E-mail',esc(u.email))}${row(L('Téléphone','Phone'),esc(pr.phone))}${row(L('Date de naissance','Date of birth'),pr.dob?fmtD(pr.dob):'')}${row(L('Nationalité','Nationality'),esc(pr.nat))}${row(L('Résidence','Residence'),esc([pr.city,pr.country].filter(Boolean).join(', ')))}</table></div>
    <div><h4>${L('Projet d\'études','Study project')}</h4><table>${row(L('Pays','Country'),N(CTRY(a.country)))}${row(L('Établissement','Institution'),esc(i?i.name:''))}${row(L('Programme','Programme'),esc(p?N(p):''))}${row(L('Niveau / langue','Level / language'),p?esc(`${p.level} · ${p.lang}${p.dur?' · '+p.dur:''}`):'')}${row(L('Rentrée','Intake'),esc(a.intake))}${row(L('Niveau actuel','Current level'),esc(lv))}${a.alt?row(L('Choix alternatif','Alternative'),esc(a.alt)):''}</table></div>
  </div>
  ${(()=>{const pp=paidOf(a);return pp?`<h4>${L('Frais de dossier','Application fee')}</h4><table class="rc-docs"><tbody><tr><th>${L('Montant payé','Amount paid')}</th><td><b>${money(pp.amount,pp.currency)}</b></td><th>${L('Moyen','Method')}</th><td>${N(PAYM[pp.method])}${pp.phone?' · '+esc(pp.phone):''}</td></tr><tr><th>${L('Référence de transaction','Transaction reference')}</th><td>${esc(pp.ref)}</td><th>${L('Date du paiement','Payment date')}</th><td>${fmtBZ(pp.paidAt)}</td></tr></tbody></table>`:''})()}
  <h4>${L('Pièces déposées','Documents submitted')} (${docs.length})</h4>
  <table class="rc-docs"><thead><tr><th>${L('Pièce','Document')}</th><th>${L('Fichier','File')}</th><th>${L('Version','Version')}</th><th>${L('Déposé le','Uploaded')}</th></tr></thead><tbody>${docs.map(d=>`<tr><td>${esc(N(DOC_TYPES[d.type]))}</td><td>${esc(d.name)}</td><td>v${d.version}</td><td>${fmtD(d.uploadedAt,1)}</td></tr>`).join('')||`<tr><td colspan="4">—</td></tr>`}</tbody></table>
  <div class="rc-foot">
    <div class="rc-qr">${tok?qrSvg(url):''}<div><b>${L('Vérifier l\'authenticité','Verify authenticity')}</b><br>${L('Scannez le QR code ou saisissez le code sur','Scan the QR code or enter the code at')} ${esc(location.host)}<br><span class="rc-code">${esc(tokF||'—')}</span></div></div>
    <div class="rc-sign"><div class="rc-stamp">CAMPUS MONDE<br><small>${L('Service des admissions','Admissions office')}</small><br><small>${L('Dossier reçu','File received')}</small></div></div>
  </div>
  <p class="rc-note">${L('Ce reçu atteste du dépôt du dossier auprès de Campus Monde à la date et à l\'heure indiquées. Il ne vaut pas admission : la décision appartient exclusivement à l\'établissement d\'accueil. Conservez ce document : il vous sera demandé pour toute réclamation.','This receipt confirms that the file was submitted to Campus Monde on the date and time shown. It is not an admission: the decision rests solely with the host institution. Keep this document: it will be requested for any claim.')}</p>
  <pre id="rc" hidden>${esc(txt)}</pre>
  </div>
  <div class="no-print" style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:16px"><button class="btn btn-g" data-act="copy" data-id="rc">${L('Copier','Copy')}</button><button class="btn btn-g" data-act="print">${ic('receipt',18)} ${L('Imprimer / PDF','Print / PDF')}</button><button class="btn btn-b" data-act="close">${L('Fermer','Close')}</button></div>`);
  document.getElementById('modal-c').classList.add('wide');
}
/* Page publique de vérification d'un reçu (ouverte par le QR code) */
function vVerif(arg){
  const [ref,t]=String(arg||'').split('~');
  after=async()=>{const el=document.getElementById('verif-out');if(!el)return;
    try{const r=await api('GET',`/api/receipt/${encodeURIComponent(ref||'')}?t=${encodeURIComponent(t||'')}`);
      el.innerHTML=`<div class="alert ok" style="margin-bottom:14px"><b>${L('Reçu authentique','Authentic receipt')}</b> — ${L('ce dossier a bien été déposé auprès de Campus Monde.','this file was indeed submitted to Campus Monde.')}</div><table><tbody>
      <tr><th>${L('Référence','Reference')}</th><td><b>${esc(r.ref)}</b></td></tr><tr><th>${L('Candidat','Applicant')}</th><td>${esc(r.candidate)}</td></tr>
      <tr><th>${L('Programme','Programme')}</th><td>${esc(N(r.programme))}</td></tr><tr><th>${L('Établissement','Institution')}</th><td>${esc(r.institution||'—')} — ${N(CTRY(r.country))}</td></tr>
      <tr><th>${L('Rentrée','Intake')}</th><td>${esc(r.intake)}</td></tr><tr><th>${L('Déposé le','Submitted on')}</th><td>${fmtBZ(r.submitted)}</td></tr>
      <tr><th>${L('Statut actuel','Current status')}</th><td>${N(STATUS[r.status]||{})}</td></tr></tbody></table>`}
    catch(e){el.innerHTML=`<div class="alert err"><b>${L('Reçu non reconnu','Receipt not recognised')}</b> — ${esc(e.message)}</div>`}};
  return pageH(L('Vérification d\'un reçu de dépôt','Receipt verification'),L('Contrôle d\'authenticité par QR code','Authenticity check by QR code'))+`<section class="sec"><div class="wrap"><div class="card" style="max-width:620px;margin:0 auto" id="verif-out"><p class="muted">${L('Vérification en cours…','Checking…')}</p></div></div></section>`;
}
const latest=(a,k)=>[...a.docs].reverse().find(x=>x.type===k);

/* ---------- Événements ---------- */
document.addEventListener('click',async e=>{
  const lb=e.target.closest('[data-lang]');if(lb){lang=lb.dataset.lang;try{localStorage.setItem('cm_lang',lang)}catch(x){}rerender();return}
  if(e.target.id==='burger'){document.getElementById('menu').classList.toggle('open');return}
  const el=e.target.closest('[data-act]');if(!el)return;
  const act=el.dataset.act,id=el.dataset.id;const u=ME();
  if(el.tagName==='A'||el.tagName==='BUTTON')e.preventDefault();
  ui.msg=null;
  switch(act){
    case 'auth':ui.auth=id;ui.resetFor=null;rerender();break;
    case 'toRegister':ui.auth='register';go('espace');break;
    case 'toLogin':ui.auth='login';go('espace');break;
    case 'logout':await api('POST','/api/auth/logout').catch(()=>{});await load();ui={};toast(L('Vous êtes déconnecté.','You are logged out.'));go('accueil');render();break;
    case 'logoutAll':await api('POST','/api/auth/logout-all').catch(()=>{});await load();ui={};toast(L('Toutes les sessions ont été fermées.','All sessions closed.'));go('espace');render();break;
    case 'resend':run(()=>api('POST','/api/auth/resend'),L('Nouveau code envoyé.','New code sent.'));break;
    case 'ctab':ui.ctab=id;ui.appId=null;rerender();break;
    case 'atab':ui.atab=id;rerender();break;
    case 'newApp':newApp();break;
    case 'applyProg':newApp(id);break;
    case 'openApp':{const a=S.apps.find(x=>x.id===id);ui.ctab='app';ui.appId=id;ui.wstep=a&&a.status==='draft'?(!a.prog?1:requiredDocs(a).some(k=>!a.docs.some(x=>x.type===k))?2:payOn()&&!paidOf(a)?3:4):1;rerender();scrollTo(0,0);break}
    case 'wstep':{const a=S.apps.find(x=>x.id===ui.appId);
      if(+id>=2&&a&&!(a.country&&a.inst&&a.prog&&a.level&&a.intake)){ui.wstep=1;ui.msg={t:'err',m:L('Complétez d\'abord l\'étape 1 : tous les champs marqués * sont obligatoires.','Complete step 1 first: all fields marked * are required.')};rerender();scrollTo(0,0);break}
      if(+id>=3&&a&&requiredDocs(a).some(k=>!a.docs.some(x=>x.type===k))){ui.wstep=2;ui.docErr=1;ui.msg={t:'err',m:L('Ajoutez toutes les pièces requises avant de continuer.','Upload all required documents before continuing.')};rerender();scrollTo(0,0);break}
      let to=+id;if(to===3&&!payOn())to=4;
      if(to>=4&&a&&payOn()&&!paidOf(a)){ui.wstep=3;ui.msg={t:'err',m:L('Réglez les frais de dossier pour continuer.','Pay the application fee to continue.')};rerender();scrollTo(0,0);break}
      ui.wstep=to;ui.docErr=0;ui.msg=null;rerender();scrollTo(0,0);break}
    case 'wnext3':{const a=S.apps.find(x=>x.id===ui.appId);const miss=requiredDocs(a).filter(k=>!a.docs.some(x=>x.type===k));
      if(miss.length){ui.docErr=1;ui.msg={t:'err',m:L('Pièces obligatoires manquantes : ','Missing required documents: ')+miss.map(k=>N(DOC_TYPES[k])).join(', ')+'.'};rerender();scrollTo(0,0);break}
      ui.docErr=0;ui.msg=null;ui.wstep=payOn()?3:4;rerender();scrollTo(0,0);break}
    case 'paym':ui.paym=id;rerender();break;
    case 'paySim':{const [pid,res]=id.split(':');run(()=>api('POST',`/api/payments/${pid}/simulate`,{result:res}),res==='paid'?L('Paiement confirmé.','Payment confirmed.'):L('Paiement refusé (simulation).','Payment declined (simulation).'));break}
    case 'payCancel':run(()=>api('POST',`/api/payments/${id}/cancel`));break;
    case 'delDraft':run(async()=>{await api('DELETE','/api/apps/'+ui.appId);ui.ctab='apps'});break;
    case 'withdraw':{const a=S.apps.find(x=>x.id===id);modal(`<h3>${L('Retirer cette candidature ?','Withdraw this application?')}</h3><p>${esc(a.ref)} — ${L('cette action est définitive.','this cannot be undone.')}</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-g" data-act="close">${L('Annuler','Cancel')}</button><button class="btn btn-o" data-act="withdrawOk" data-id="${a.id}">${L('Retirer','Withdraw')}</button></div>`);break}
    case 'withdrawOk':closeModal();run(()=>api('POST',`/api/apps/${id}/withdraw`),L('Candidature retirée.','Application withdrawn.'));break;
    case 'receipt':receipt(S.apps.find(x=>x.id===id));break;
    case 'close':closeModal();break;
    case 'print':document.body.classList.add('printing');window.print();setTimeout(()=>document.body.classList.remove('printing'),800);break;
    case 'copy':{const t=document.getElementById(id);try{await navigator.clipboard.writeText(t.value??t.textContent);toast(L('Copié !','Copied!'))}catch(x){toast(L('Sélectionnez puis copiez manuellement.','Select and copy manually.'))}break}
    case 'exportMe':location.href='/api/me/export';break;
    case 'openFile':ui.atab='file';ui.fileId=id;rerender();scrollTo(0,0);break;
    case 'exportCsv':location.href='/api/export.csv';break;
    case 'askDocs':run(()=>api('POST',`/api/apps/${id}/ask-docs`),L('Demande de complément envoyée au candidat.','Document request sent to applicant.'));break;
    case 'validate':run(()=>api('POST',`/api/apps/${id}/validate`),L('Dossier validé : prêt à transmettre.','File validated: ready to send.'));break;
    case 'verifyInst':run(()=>api('PATCH','/api/institutions/'+id,{verify:true}));break;
    case 'cancelMfa':await api('POST','/api/auth/logout').catch(()=>{});await load();ui={};rerender();break;
  }
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.ui){ui[t.dataset.ui]=t.value;clearTimeout(window._d);window._d=setTimeout(()=>{const pos=t.selectionStart;rerender();const n=document.querySelector(`[data-ui="${t.dataset.ui}"]`);if(n&&n.tagName==='INPUT'){n.focus();try{n.setSelectionRange(pos,pos)}catch(x){}}},t.tagName==='INPUT'?250:0)}
  if(t.dataset.af){ui.af=ui.af||{};ui.af[t.dataset.af]=t.value;clearTimeout(window._d);window._d=setTimeout(()=>{rerender();const n=document.querySelector(`[data-af="${t.dataset.af}"]`);if(n&&n.tagName==='INPUT'){n.focus();n.setSelectionRange(n.value.length,n.value.length)}},t.tagName==='INPUT'?250:0)}
  if(t.dataset.period){const p=PROG(t.dataset.period);p.period=t.value;clearTimeout(window._p);window._p=setTimeout(()=>api('PATCH','/api/programs/'+p.id,{period:p.period}).then(()=>toast(L('Période enregistrée.','Period saved.'))).catch(x=>toast(x.message)),600)}
});
document.addEventListener('change',async e=>{
  const t=e.target;
  if(t.dataset.live){const a=S.apps.find(x=>x.id===ui.appId);const k=t.dataset.live;a[k]=t.value;if(k==='country'){a.inst='';a.prog=''}if(k==='inst')a.prog='';rerender();api('PATCH','/api/apps/'+a.id,{country:a.country,inst:a.inst,prog:a.prog}).catch(x=>toast(x.message));return}
  if(t.dataset.up){
    const f=t.files[0];if(!f)return;
    if(!/\.(pdf|jpe?g|png)$/i.test(f.name)){ui.msg={t:'err',m:L('Format refusé : PDF, JPG ou PNG uniquement.','Format rejected: PDF, JPG or PNG only.')};rerender();return}
    if(f.size>5*1024*1024){ui.msg={t:'err',m:L('Fichier trop volumineux (5 Mo maximum).','File too large (max 5 MB).')};rerender();return}
    const fd=new FormData();fd.append('type',t.dataset.up);fd.append('file',f);
    toast(L('Envoi en cours…','Uploading…'));
    run(()=>api('POST',`/api/apps/${t.dataset.app}/docs`,fd,true),L('Document ajouté : ','Document uploaded: ')+esc(f.name));return;
  }
  if(t.dataset.docst){const a=S.apps.find(x=>x.id===t.dataset.app);const d=latest(a,t.dataset.docst);run(()=>api('POST',`/api/docs/${d.id}/status`,{status:t.value}));return}
  if(t.dataset.assign){run(()=>api('POST',`/api/apps/${t.dataset.assign}/assign`,{agent:t.value}),L('Dossier affecté.','File assigned.'));return}
  if(t.dataset.rel){run(()=>api('PATCH','/api/institutions/'+t.dataset.rel,{relation:t.value}));return}
  if(t.dataset.open){run(()=>api('PATCH','/api/programs/'+t.dataset.open,{open:t.checked}));return}
  if(t.dataset.role){run(()=>api('PATCH','/api/users/'+t.dataset.role,{role:t.value}),L('Rôle mis à jour.','Role updated.'));return}
});
document.addEventListener('submit',async e=>{
  const fm=e.target;if(!fm.dataset.form)return;e.preventDefault();
  const d=Object.fromEntries(new FormData(fm));fm.querySelectorAll('input[type=checkbox]').forEach(c=>d[c.name]=c.checked);
  const k=fm.dataset.form;ui.msg=null;
  const reqF=[...fm.querySelectorAll('[required]')].filter(x=>x.type!=='checkbox'&&x.name).map(x=>{const lb=x.closest('.f')&&x.closest('.f').querySelector('label');return [x.name,lb?lb.textContent.replace(/\s*\*\s*$/,'').trim():x.name]});
  if(!checkRequired(fm,reqF))return;
  const bad=[...fm.querySelectorAll('[required]')].find(x=>x.type==='checkbox'?!x.checked:!String(x.value).trim());
  if(bad){bad.focus();const m=L('Merci de remplir les champs obligatoires.','Please fill in the required fields.');const fe=fm.querySelector('#ferr');if(fe)fe.textContent=m;else{ui.msg={t:'err',m};rerender()}return}
  const em=fm.querySelector('input[type=email]');if(em&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value)){ui.msg={t:'err',m:L('Adresse e-mail invalide.','Invalid email address.')};rerender();return}
  const btn=fm.querySelector('button:not([type=button])');if(btn)btn.disabled=true;
  try{
    switch(k){
      case 'contact':await api('POST','/api/contact',d);ui.contactOk=1;rerender();setTimeout(()=>ui.contactOk=0,100);return;
      case 'login':{const r=await api('POST','/api/auth/login',{email:d.email,pw:d.pw});await load();const keepTab=ui.ctab;ui={};if(keepTab)ui.ctab=keepTab;
        if(r.mfa){ui.msg={t:'info',m:L('Un code de connexion vient de vous être envoyé par e-mail.','A login code has just been emailed to you.')};if(location.hash!=='#admin')go('admin');else rerender();return}
        const x=ME();toast(L('Bienvenue ','Welcome ')+x.name.split(' ')[0]);
        if(x.role!=='candidat'){if(location.hash!=='#admin')go('admin');else rerender()}else{if(location.hash!=='#espace')go('espace');else rerender()}return}
      case 'mfa':await api('POST','/api/auth/mfa',{code:d.code});await load();ui={};toast(L('Bienvenue ','Welcome ')+ME().name.split(' ')[0]);rerender();return;
      case 'register':await api('POST','/api/auth/register',{first:d.first,last:d.last,email:d.email,pw:d.pw,consent:d.consent,mkt:d.mkt});await load();ui={pendingProg:ui.pendingProg};rerender();return;
      case 'verify':{await api('POST','/api/auth/verify',{code:d.code});await load();const pp=ui.pendingProg;ui={ctab:'profile',msg:{t:'ok',m:L('Adresse vérifiée ! Complétez maintenant votre profil.','Email verified! Now complete your profile.')},pendingProg:pp};rerender();return}
      case 'forgot':{const r=await api('POST','/api/auth/forgot',{email:d.email});ui.devReset=r.devCode||null;}ui.resetFor=d.email.trim().toLowerCase();ui.msg={t:'info',m:L('Si un compte existe, un code a été envoyé.','If an account exists, a code has been sent.')};rerender();return;
      case 'reset':await api('POST','/api/auth/reset',{email:ui.resetFor,code:d.code,pw:d.pw});ui={auth:'login',msg:{t:'ok',m:L('Mot de passe modifié. Connectez-vous.','Password changed. Please log in.')}};rerender();return;
      case 'profile':await api('POST','/api/profile',d);await load();if(ui.pendingProg){const pp=ui.pendingProg;ui.pendingProg=null;newApp(pp);return}ui.msg={t:'ok',m:L('Profil enregistré.','Profile saved.')};rerender();return;
      case 'wiz1':if(!checkRequired(fm,[['country',L('Pays visé','Target country')],['inst',L('Établissement','Institution')],['prog',L('Programme','Programme')],['level',L('Niveau d\'études actuel','Current level of study')],['intake',L('Rentrée souhaitée','Desired intake')]]))return;
        await api('PATCH','/api/apps/'+ui.appId,{country:d.country,inst:d.inst,prog:d.prog,level:d.level,intake:d.intake,alt:d.alt,validate:true});ui.msg=null;await load();ui.wstep=2;rerender();scrollTo(0,0);return;
      case 'pay':{const m=ui.paym||(S.pay.methods||[])[0];if(!m){ui.msg={t:'err',m:L('Choisissez un moyen de paiement.','Choose a payment method.')};break}
        const r=await api('POST',`/api/apps/${ui.appId}/pay`,{method:m,phone:d.phone||''});if(r.redirect){location.href=r.redirect;return}await load();ui.msg=null;rerender();return}
      case 'submitApp':await api('POST',`/api/apps/${ui.appId}/submit`,{exact:d.exact,share:d.share});await load();ui.wstep=1;ui.msg={t:'ok',m:L('Candidature soumise ! Votre reçu de dépôt est disponible.','Application submitted! Your receipt is available.')};rerender();scrollTo(0,0);return;
      case 'cmsg':await api('POST',`/api/apps/${ui.appId}/messages`,{text:d.text});break;
      case 'smsg':await api('POST',`/api/apps/${ui.fileId}/messages`,{text:d.text});break;
      case 'note':await api('POST',`/api/apps/${ui.fileId}/notes`,{text:d.text});break;
      case 'status':await api('POST',`/api/apps/${ui.fileId}/status`,{s:d.s,note:d.note});ui.msg={t:'ok',m:L('Statut mis à jour, candidat notifié.','Status updated, applicant notified.')};break;
      case 'transmit':await api('POST',`/api/apps/${ui.fileId}/transmit`,d);ui.msg={t:'ok',m:L('Transmission enregistrée avec preuve.','Submission recorded with proof.')};break;
      case 'decision':await api('POST',`/api/apps/${ui.fileId}/decision`,d);ui.msg={t:'ok',m:L('Décision enregistrée.','Decision recorded.')};break;
      case 'addInst':await api('POST','/api/institutions',d);ui.msg={t:'ok',m:L('Établissement ajouté.','Institution added.')};break;
      case 'addProg':await api('POST','/api/programs',d);ui.msg={t:'ok',m:L('Formation ajoutée.','Programme added.')};break;
      case 'addStaff':{const r=await api('POST','/api/users',d);await load();rerender();modal(`<h3>${L('Compte créé','Account created')}</h3><p>${L('Un e-mail a été envoyé à','An email has been sent to')} <b>${esc(d.email)}</b>.</p><p>${L('Mot de passe temporaire (affiché une seule fois)','Temporary password (shown once)')} : <code id="tmp">${esc(r.temp)}</code></p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-g" data-act="copy" data-id="tmp">${L('Copier','Copy')}</button><button class="btn btn-b" data-act="close">OK</button></div>`);return}
    }
    const keep=ui.msg;await load();ui.msg=keep;rerender();
  }catch(x){ui.msg={t:'err',m:x.message};if(btn)btn.disabled=false;rerender()}
});

/* ---------- Démarrage ---------- */
(async()=>{
  try{lang=localStorage.getItem('cm_lang')||''}catch(e){}
  if(!lang)lang=(navigator.language||'fr').startsWith('en')?'en':'fr';
  try{await load()}catch(e){S={session:null,users:[],apps:[],institutions:[],programs:[],outbox:[],audit:[],contacts:[]};setTimeout(()=>toast(e.message),300)}
  render();
})();
