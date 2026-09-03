export type SeoCity = {
  slug: string;
  city: string;
  department: string;
  departmentCode: string;
  region: string;
  nearby: string[];
  intro: string;
  delivery: string;
  useCases: string[];
};

type SeoCitySeed = Omit<SeoCity, "intro" | "delivery" | "useCases">;

const RAW = `toulouse|Toulouse|Haute-Garonne|31|Occitanie|Muret;Colomiers;Blagnac;Tournefeuille
muret|Muret|Haute-Garonne|31|Occitanie|Portet-sur-Garonne;Seysses;Eaunes;Roques
montauban|Montauban|Tarn-et-Garonne|82|Occitanie|Moissac;Castelsarrasin;Montech;Caussade
albi|Albi|Tarn|81|Occitanie|Gaillac;Carmaux;Graulhet;Saint-Juéry
castres|Castres|Tarn|81|Occitanie|Mazamet;Labruguière;Soual;Lavaur
tarbes|Tarbes|Hautes-Pyrénées|65|Occitanie|Lourdes;Bagnères-de-Bigorre;Vic-en-Bigorre;Aureilhan
pau|Pau|Pyrénées-Atlantiques|64|Nouvelle-Aquitaine|Lescar;Billère;Lons;Orthez
agen|Agen|Lot-et-Garonne|47|Nouvelle-Aquitaine|Le Passage;Villeneuve-sur-Lot;Nérac;Marmande
cahors|Cahors|Lot|46|Occitanie|Pradines;Gourdon;Figeac;Souillac
rodez|Rodez|Aveyron|12|Occitanie|Onet-le-Château;Decazeville;Villefranche-de-Rouergue;Millau
carcassonne|Carcassonne|Aude|11|Occitanie|Trèbes;Limoux;Castelnaudary;Lézignan-Corbières
narbonne|Narbonne|Aude|11|Occitanie|Gruissan;Coursan;Port-la-Nouvelle;Lézignan-Corbières
beziers|Béziers|Hérault|34|Occitanie|Agde;Pézenas;Sérignan;Villeneuve-lès-Béziers
sete|Sète|Hérault|34|Occitanie|Frontignan;Balaruc-les-Bains;Mèze;Marseillan
perpignan|Perpignan|Pyrénées-Orientales|66|Occitanie|Canet-en-Roussillon;Saint-Estève;Rivesaltes;Argelès-sur-Mer
montpellier|Montpellier|Hérault|34|Occitanie|Lattes;Castelnau-le-Lez;Mauguio;Lunel
nimes|Nîmes|Gard|30|Occitanie|Marguerittes;Beaucaire;Alès;Uzès
avignon|Avignon|Vaucluse|84|Provence-Alpes-Côte d’Azur|Le Pontet;Orange;Cavaillon;Carpentras
arles|Arles|Bouches-du-Rhône|13|Provence-Alpes-Côte d’Azur|Saint-Martin-de-Crau;Tarascon;Salon-de-Provence;Beaucaire
marseille|Marseille|Bouches-du-Rhône|13|Provence-Alpes-Côte d’Azur|Aubagne;Allauch;Marignane;La Ciotat
aix-en-provence|Aix-en-Provence|Bouches-du-Rhône|13|Provence-Alpes-Côte d’Azur|Gardanne;Vitrolles;Pertuis;Les Pennes-Mirabeau
aubagne|Aubagne|Bouches-du-Rhône|13|Provence-Alpes-Côte d’Azur|Gémenos;La Penne-sur-Huveaune;Cassis;La Ciotat
toulon|Toulon|Var|83|Provence-Alpes-Côte d’Azur|La Seyne-sur-Mer;Hyères;La Garde;Six-Fours-les-Plages
frejus|Fréjus|Var|83|Provence-Alpes-Côte d’Azur|Saint-Raphaël;Roquebrune-sur-Argens;Puget-sur-Argens;Draguignan
nice|Nice|Alpes-Maritimes|06|Provence-Alpes-Côte d’Azur|Cagnes-sur-Mer;Saint-Laurent-du-Var;Menton;Villefranche-sur-Mer
cannes|Cannes|Alpes-Maritimes|06|Provence-Alpes-Côte d’Azur|Le Cannet;Mougins;Mandelieu-la-Napoule;Grasse
antibes|Antibes|Alpes-Maritimes|06|Provence-Alpes-Côte d’Azur|Vallauris;Biot;Villeneuve-Loubet;Cagnes-sur-Mer
gap|Gap|Hautes-Alpes|05|Provence-Alpes-Côte d’Azur|Tallard;Embrun;Briançon;Laragne-Montéglin
digne-les-bains|Digne-les-Bains|Alpes-de-Haute-Provence|04|Provence-Alpes-Côte d’Azur|Château-Arnoux-Saint-Auban;Sisteron;Forcalquier;Manosque
manosque|Manosque|Alpes-de-Haute-Provence|04|Provence-Alpes-Côte d’Azur|Forcalquier;Oraison;Sainte-Tulle;Gréoux-les-Bains
lyon|Lyon|Rhône|69|Auvergne-Rhône-Alpes|Villeurbanne;Bron;Vénissieux;Caluire-et-Cuire
villeurbanne|Villeurbanne|Rhône|69|Auvergne-Rhône-Alpes|Lyon;Vaulx-en-Velin;Bron;Rillieux-la-Pape
saint-etienne|Saint-Étienne|Loire|42|Auvergne-Rhône-Alpes|Saint-Chamond;Firminy;Andrézieux-Bouthéon;Rive-de-Gier
valence|Valence|Drôme|26|Auvergne-Rhône-Alpes|Bourg-lès-Valence;Romans-sur-Isère;Portes-lès-Valence;Crest
montelimar|Montélimar|Drôme|26|Auvergne-Rhône-Alpes|Pierrelatte;Loriol-sur-Drôme;Dieulefit;Le Teil
grenoble|Grenoble|Isère|38|Auvergne-Rhône-Alpes|Échirolles;Saint-Martin-d’Hères;Meylan;Voiron
chambery|Chambéry|Savoie|73|Auvergne-Rhône-Alpes|Aix-les-Bains;La Motte-Servolex;Cognin;Montmélian
annecy|Annecy|Haute-Savoie|74|Auvergne-Rhône-Alpes|Rumilly;Cran-Gevrier;Seynod;Thônes
bourg-en-bresse|Bourg-en-Bresse|Ain|01|Auvergne-Rhône-Alpes|Péronnas;Viriat;Montrevel-en-Bresse;Pont-d’Ain
clermont-ferrand|Clermont-Ferrand|Puy-de-Dôme|63|Auvergne-Rhône-Alpes|Aubière;Cournon-d’Auvergne;Riom;Chamalières
vichy|Vichy|Allier|03|Auvergne-Rhône-Alpes|Cusset;Bellerive-sur-Allier;Saint-Pourçain-sur-Sioule;Gannat
montlucon|Montluçon|Allier|03|Auvergne-Rhône-Alpes|Commentry;Domérat;Désertines;Saint-Victor
aurillac|Aurillac|Cantal|15|Auvergne-Rhône-Alpes|Arpajon-sur-Cère;Ytrac;Murat;Saint-Flour
le-puy-en-velay|Le Puy-en-Velay|Haute-Loire|43|Auvergne-Rhône-Alpes|Brives-Charensac;Yssingeaux;Monistrol-sur-Loire;Brioude
limoges|Limoges|Haute-Vienne|87|Nouvelle-Aquitaine|Panazol;Isle;Saint-Junien;Couzeix
brive-la-gaillarde|Brive-la-Gaillarde|Corrèze|19|Nouvelle-Aquitaine|Malemort;Tulle;Ussel;Objat
perigueux|Périgueux|Dordogne|24|Nouvelle-Aquitaine|Boulazac Isle Manoire;Trélissac;Ribérac;Nontron
bergerac|Bergerac|Dordogne|24|Nouvelle-Aquitaine|Prigonrieux;Lalinde;Mussidan;Sainte-Foy-la-Grande
bordeaux|Bordeaux|Gironde|33|Nouvelle-Aquitaine|Mérignac;Pessac;Talence;Bègles
libourne|Libourne|Gironde|33|Nouvelle-Aquitaine|Saint-Émilion;Coutras;Izon;Fronsac
angouleme|Angoulême|Charente|16|Nouvelle-Aquitaine|Soyaux;La Couronne;Cognac;Ruelle-sur-Touvre
la-rochelle|La Rochelle|Charente-Maritime|17|Nouvelle-Aquitaine|Aytré;Rochefort;Châtelaillon-Plage;Surgères
niort|Niort|Deux-Sèvres|79|Nouvelle-Aquitaine|Bessines;Saint-Maixent-l’École;Parthenay;Melle
poitiers|Poitiers|Vienne|86|Nouvelle-Aquitaine|Chasseneuil-du-Poitou;Châtellerault;Buxerolles;Mignaloux-Beauvoir
tours|Tours|Indre-et-Loire|37|Centre-Val de Loire|Joué-lès-Tours;Saint-Cyr-sur-Loire;Amboise;Chinon
blois|Blois|Loir-et-Cher|41|Centre-Val de Loire|Vineuil;Vendôme;Romorantin-Lanthenay;Mer
orleans|Orléans|Loiret|45|Centre-Val de Loire|Olivet;Fleury-les-Aubrais;Montargis;Gien
chartres|Chartres|Eure-et-Loir|28|Centre-Val de Loire|Lucé;Dreux;Maintenon;Nogent-le-Rotrou
bourges|Bourges|Cher|18|Centre-Val de Loire|Saint-Doulchard;Vierzon;Saint-Amand-Montrond;Mehun-sur-Yèvre
chateauroux|Châteauroux|Indre|36|Centre-Val de Loire|Déols;Issoudun;Le Blanc;Argenton-sur-Creuse
nevers|Nevers|Nièvre|58|Bourgogne-Franche-Comté|Varennes-Vauzelles;Decize;Cosne-Cours-sur-Loire;La Charité-sur-Loire
auxerre|Auxerre|Yonne|89|Bourgogne-Franche-Comté|Monéteau;Joigny;Sens;Avallon
dijon|Dijon|Côte-d’Or|21|Bourgogne-Franche-Comté|Chenôve;Quetigny;Beaune;Talant
besancon|Besançon|Doubs|25|Bourgogne-Franche-Comté|École-Valentin;Pontarlier;Montbéliard;Baume-les-Dames
belfort|Belfort|Territoire de Belfort|90|Bourgogne-Franche-Comté|Danjoutin;Valdoie;Delle;Héricourt
mulhouse|Mulhouse|Haut-Rhin|68|Grand Est|Illzach;Rixheim;Saint-Louis;Thann
colmar|Colmar|Haut-Rhin|68|Grand Est|Wintzenheim;Sélestat;Guebwiller;Ribeauvillé
strasbourg|Strasbourg|Bas-Rhin|67|Grand Est|Schiltigheim;Illkirch-Graffenstaden;Haguenau;Sélestat
metz|Metz|Moselle|57|Grand Est|Montigny-lès-Metz;Thionville;Woippy;Amnéville
nancy|Nancy|Meurthe-et-Moselle|54|Grand Est|Vandœuvre-lès-Nancy;Laxou;Lunéville;Toul
reims|Reims|Marne|51|Grand Est|Tinqueux;Épernay;Châlons-en-Champagne;Cormontreuil
troyes|Troyes|Aube|10|Grand Est|Saint-André-les-Vergers;La Chapelle-Saint-Luc;Romilly-sur-Seine;Bar-sur-Aube
epinal|Épinal|Vosges|88|Grand Est|Golbey;Remiremont;Saint-Dié-des-Vosges;Thaon-les-Vosges
paris|Paris|Paris|75|Île-de-France|Boulogne-Billancourt;Saint-Denis;Montreuil;Créteil
versailles|Versailles|Yvelines|78|Île-de-France|Le Chesnay-Rocquencourt;Saint-Germain-en-Laye;Plaisir;Rambouillet
melun|Melun|Seine-et-Marne|77|Île-de-France|Dammarie-les-Lys;Savigny-le-Temple;Fontainebleau;Lieusaint
meaux|Meaux|Seine-et-Marne|77|Île-de-France|Chelles;Claye-Souilly;Lagny-sur-Marne;Coulommiers
cergy|Cergy|Val-d’Oise|95|Île-de-France|Pontoise;Osny;Éragny;Herblay-sur-Seine
creteil|Créteil|Val-de-Marne|94|Île-de-France|Maisons-Alfort;Saint-Maur-des-Fossés;Choisy-le-Roi;Vitry-sur-Seine
rouen|Rouen|Seine-Maritime|76|Normandie|Sotteville-lès-Rouen;Mont-Saint-Aignan;Elbeuf;Barentin
le-havre|Le Havre|Seine-Maritime|76|Normandie|Montivilliers;Harfleur;Fécamp;Honfleur
caen|Caen|Calvados|14|Normandie|Hérouville-Saint-Clair;Mondeville;Bayeux;Lisieux
evreux|Évreux|Eure|27|Normandie|Gravigny;Louviers;Vernon;Bernay
amiens|Amiens|Somme|80|Hauts-de-France|Longueau;Abbeville;Albert;Doullens
beauvais|Beauvais|Oise|60|Hauts-de-France|Tillé;Méru;Clermont;Noailles
compiegne|Compiègne|Oise|60|Hauts-de-France|Margny-lès-Compiègne;Noyon;Crépy-en-Valois;Pont-Sainte-Maxence
lille|Lille|Nord|59|Hauts-de-France|Roubaix;Tourcoing;Villeneuve-d’Ascq;Seclin
arras|Arras|Pas-de-Calais|62|Hauts-de-France|Saint-Laurent-Blangy;Bapaume;Avesnes-le-Comte;Vitry-en-Artois
lens|Lens|Pas-de-Calais|62|Hauts-de-France|Liévin;Hénin-Beaumont;Carvin;Béthune
valenciennes|Valenciennes|Nord|59|Hauts-de-France|Anzin;Denain;Saint-Amand-les-Eaux;Le Quesnoy
dunkerque|Dunkerque|Nord|59|Hauts-de-France|Grande-Synthe;Gravelines;Bergues;Hazebrouck
calais|Calais|Pas-de-Calais|62|Hauts-de-France|Coquelles;Marck;Guînes;Boulogne-sur-Mer
nantes|Nantes|Loire-Atlantique|44|Pays de la Loire|Saint-Herblain;Rezé;Orvault;Vertou
saint-nazaire|Saint-Nazaire|Loire-Atlantique|44|Pays de la Loire|Pornichet;La Baule-Escoublac;Guérande;Pontchâteau
angers|Angers|Maine-et-Loire|49|Pays de la Loire|Avrillé;Trélazé;Saumur;Cholet
le-mans|Le Mans|Sarthe|72|Pays de la Loire|Allonnes;Coulaines;La Flèche;Sablé-sur-Sarthe
rennes|Rennes|Ille-et-Vilaine|35|Bretagne|Cesson-Sévigné;Bruz;Vitré;Fougères
saint-malo|Saint-Malo|Ille-et-Vilaine|35|Bretagne|Dinard;Cancale;Dol-de-Bretagne;Dinan
vannes|Vannes|Morbihan|56|Bretagne|Séné;Auray;Lorient;Pontivy
brest|Brest|Finistère|29|Bretagne|Guipavas;Plougastel-Daoulas;Landerneau;Morlaix`;

const seeds: SeoCitySeed[] = RAW.trim().split("\n").map((line) => {
  const [slug, city, department, departmentCode, region, nearby] = line.split("|");
  return { slug, city, department, departmentCode, region, nearby: nearby.split(";") };
});

const USE_CASES = [
  ["trajets domicile-travail de proximité", "courses et rendez-vous", "mobilité des jeunes dès l’âge légal", "déplacements quotidiens entre communes proches"],
  ["déplacements vers les commerces et services", "liaisons locales et périurbaines", "mobilité familiale du quotidien", "trajets courts sans permis B"],
  ["petits trajets réguliers", "accès aux centres-villes et zones commerciales", "déplacements vers une gare ou un rendez-vous", "solution électrique compacte"],
  ["mobilité en ville et dans les communes voisines", "courses et démarches", "trajets professionnels courts", "autonomie locale au quotidien"],
];

function buildIntro(c: SeoCitySeed, i: number) {
  const nearby = c.nearby.slice(0, 2).join(" et ");
  const variants = [
    `Vous cherchez une voiture sans permis à ${c.city} ou autour de ${nearby} ? NeoDrive permet de découvrir le véhicule avec de vraies photos et vidéos, de comparer les versions puis d’organiser une livraison dans ${c.department}.`,
    `À ${c.city}, l’achat d’une voiture sans permis ne nécessite pas forcément de multiplier les déplacements. NeoDrive présente ses véhicules à distance puis organise la remise à ${c.city}, dans les communes proches et plus largement en ${c.department}.`,
    `NeoDrive propose une voiture sans permis électrique accessible aux clients de ${c.city} et de ${c.department}. Le véhicule peut être présenté en vidéo avant la décision, avec une organisation de livraison adaptée au planning logistique.`,
    `Pour une recherche « voiture sans permis ${c.city} », NeoDrive propose une alternative à l’achat uniquement en concession locale : informations précises, médias réels du véhicule, échange à distance et livraison possible dans le secteur de ${c.city}.`,
  ];
  return variants[i % variants.length];
}

function buildDelivery(c: SeoCitySeed, i: number) {
  const nearby = c.nearby.slice(0, 3).join(", ");
  const variants = [
    `La livraison peut être organisée à ${c.city} ainsi que vers ${nearby}, selon les disponibilités du stock et le planning des tournées.`,
    `Les remises de véhicules dans le secteur de ${c.city} sont planifiées sur rendez-vous. Lorsque plusieurs commandes sont proches géographiquement, les tournées peuvent être regroupées.`,
    `NeoDrive peut livrer à ${c.city} et dans ${c.department}. Le délai et les conditions sont confirmés avec le client avant le départ du véhicule.`,
    `Après la préparation du véhicule, la remise peut être organisée à ${c.city} ou dans une commune voisine comme ${c.nearby[0]} ou ${c.nearby[1]}, en fonction de la tournée disponible.`,
  ];
  return variants[i % variants.length];
}

export const seoCities: SeoCity[] = seeds.map((c, i) => ({
  ...c,
  intro: buildIntro(c, i),
  delivery: buildDelivery(c, i),
  useCases: USE_CASES[i % USE_CASES.length],
}));

export function getSeoCity(slug: string) {
  return seoCities.find((city) => city.slug === slug);
}
