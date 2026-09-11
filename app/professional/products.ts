export type ProVehicle={slug:string;name:string;label:string;kind:"pickup"|"tricycle";promise:string;description:string;hero:string;images:string[];video?:string;color:string;capacity:string;bed:string;motor:string;range:string;speed:string;dimensions:string;features:string[];uses:string[]};

export const pickup:ProVehicle={
slug:"pickup",
name:"NeoDrive Pro Pick-Up",
label:"Nouveau · utilitaire 4 roues",
kind:"pickup",
color:"#1671c8",
promise:"Le petit utilitaire électrique qui fait le travail.",
description:"Un utilitaire électrique compact à quatre roues, avec cabine protégée et vraie benne acier à ridelles. Pensé pour les professionnels qui veulent transporter du matériel simplement sur les exploitations, sites, domaines et zones de travail.",
hero:"/neodrive-pro/pickup/pickup-blue.svg",
images:["/neodrive-pro/pickup/pickup-blue.svg","/neodrive-pro/pickup/pickup-white-side.svg"],
capacity:"Selon version*",
bed:"Benne acier",
motor:"100 % électrique",
range:"À confirmer*",
speed:"Selon homologation*",
dimensions:"Format compact*",
features:["4 roues","Cabine protégée","Benne acier à ridelles","Format compact et maniable"],
uses:["Agriculture et exploitations","Artisans et maintenance","Espaces verts et domaines","Collectivités et sites professionnels"]
};

export const tricycles:ProVehicle[]=[
{slug:"versatile",name:"NeoDrive Versatile",label:"Compact & polyvalent",kind:"tricycle",color:"#a72f2a",promise:"Le tricycle qui va partout.",description:"Compact, simple à conduire et doté d’une vraie benne acier : le Versatile facilite tous les transports du quotidien.",hero:"/neodrive-pro/zj150/zj150-02.webp",images:Array.from({length:8},(_,i)=>`/neodrive-pro/zj150/zj150-${String(i+1).padStart(2,"0")}.webp`),video:"/neodrive-pro/zj150/zj150-presentation.mp4",capacity:"300 kg*",bed:"1,50 × 1,10 m",motor:"1 000 W",range:"50–70 km*",speed:"25 / 35 km/h*",dimensions:"2,85 × 1,18 m",features:["Benne tout acier","Ridelles rabattables","Format compact","Recharge sur prise 220 V"],uses:["Exploitations agricoles","Jardinage et espaces verts","Ateliers et petits chantiers","Entretien de propriétés"]},
{slug:"iron",name:"NeoDrive Iron",label:"Puissant & hydraulique",kind:"tricycle",color:"#1265bb",promise:"Chargez plus. Déchargez sans effort.",description:"Une capacité renforcée et une benne basculante hydraulique pour les professionnels qui travaillent avec des charges plus lourdes.",hero:"/neodrive-pro/jb150/jb150-01.webp",images:Array.from({length:5},(_,i)=>`/neodrive-pro/jb150/jb150-0${i+1}.webp`),video:"/neodrive-pro/jb150/jb150-presentation.mp4",capacity:"500 kg*",bed:"1,50 × 1,10 m",motor:"1 500 W",range:"40–60 km*",speed:"25 / 42 km/h*",dimensions:"2,87 × 1,18 m",features:["Benne hydraulique","Structure tout acier","Charge renforcée","Ridelles rabattables"],uses:["Chantiers et artisanat","Agriculture intensive","Collectivités","Déchets verts et matériaux"]},
{slug:"trinity",name:"NeoDrive Trinity",label:"Protégé & polyvalent",kind:"tricycle",color:"#d56720",promise:"Le confort d’un utilitaire compact.",description:"Toit, pare-brise, double assise et plus grande benne de la gamme : le Trinity est conçu pour les tournées régulières par tous les temps.",hero:"/neodrive-pro/yc3/yc3-001.webp",images:Array.from({length:6},(_,i)=>`/neodrive-pro/yc3/yc3-00${i}.webp`),video:"/neodrive-pro/yc3/yc3-presentation.mp4",capacity:"280 kg*",bed:"1,60 × 1,20 m",motor:"1 500 W",range:"50–60 km*",speed:"25 / 40 km/h*",dimensions:"3,07 × 1,28 m",features:["Toit de protection","Pare-brise avec essuie-glace","Double assise","Grande benne acier"],uses:["Campings et domaines","Sites industriels","Collectivités","Livraisons sur site privé"]}
];

export const proVehicles=[pickup,...tricycles];
export const getProVehicle=(slug:string)=>proVehicles.find(x=>x.slug===slug);
