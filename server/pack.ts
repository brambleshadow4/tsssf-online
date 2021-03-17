
import fs from 'fs';

import sharp from "sharp";


function validatePack(pack:any, namespace:string): string[]
{
	if(pack.format !== "pack:1") throw new Error("Pack " + filename + " must be in pack:1 format");
	if(typeof pack.namespace !== "string") throw new Error("Pack " + filename + " needs a namespace");
	if(typeof pack.cards !== "object") throw new Error("Pack " + filename + " does not have a valid cards property");

	let errors: string[] = [];
	if(pack.cards.pony)
	{
		
		for(var key in pack.cards.pony)
		{
			let card = pack.cards.pony[key];

			//console.log(key);
			errors = errors.concat(validateCard(key, "Pony", card));
		}
	}

	return errors;
}


function validateCard(name:string, cardType: "Pony" | "Ship" | "Start" | "Goal", card: any): string[]
{
	var errors = [];
	var genders = new Set(["male","female","malefemale"]);
	var races = new Set(["earth","pegasus","unicorn","alicorn", "earth/unicorn"]);

	var ponyProps = new Set(["gender","race","name", "keywords"]);


	if(cardType == "Pony")
	{
		if(typeof card.name !== "string") errors.push("pony " + name + " doesn't have a valid name property");
		if(!Array.isArray(card.keywords)) errors.push("pony " + name + " doesn't have a valid keywords property");

		if(card.gender && !genders.has(card.gender)) errors.push("pony " + name + " has an invalid gender value: " + card.gender);
		if(card.race && !races.has(card.race)) errors.push("pony " + name + " has an invalid race value: " + card.race);
		if(card.altTimeline && card.altTimeline !== true) errors.push("pony " + name + " has an invalid altTimeline value: " + card.race);

		for(var key of Object.keys(card))
		{
			if(!ponyProps.has(key))
			{
				errors.push("pony " + name + " has an invalid prop: " + key);
			}
		}
		//console.log(card.race);
	}
	return errors;
}



function findPacks(topFolder:any, path:any, packs:any)
{

	let files = fs.readdirSync(path);

	let hasPack = files.indexOf("pack.json") > -1;

	if(hasPack)
	{
		packs.add(path.replace(topFolder, "").replace(/\//g, "."));
		return packs;
	}

	for(let file of files)
	{
		if(fs.lstatSync(path + "/" + file).isDirectory())
		{
			findPacks(topFolder, path + "/" + file, packs);
		}
	}

	return packs;
};


let packsSet = findPacks("./packs/", "./packs", new Set());
let packs: any = {};

let cards: any = {};

for(let namespace of packsSet)
{
	var filename = "./packs/" + namespace.replace(/\./g, "/") + "/pack.json";

	let packJSON = fs.readFileSync(filename, "utf8");

	let pack;
	let packMetadata: any = {};

	try{

		try{
			pack = JSON.parse(packJSON);
		}
		catch(e)
		{
			throw new Error("Error parsing JSON file: " + filename);
		}


		var errors = validatePack(pack, namespace);
		if(errors.length)
		{
			console.error("\nERROR in Pack " + filename + ":\n" + errors.join("\n"));
		}
		


		let startCards = [];
		for(let cardType of ["Pony","Start","Ship","Goal"])
		{
			let typeKey = cardType.toLowerCase();
			if(pack.cards[typeKey])
			{
				for(let key in pack.cards[typeKey])
				{
					let cardName = namespace + "." + cardType + "." + key;
					cards[cardName] = pack.cards[typeKey][key];

					// generate thumbnail
					let imageName = "./packs/" + cardName.split(".").join("/");
					let pngImage = imageName + ".png";
					let thumbImage = imageName + ".thumb.jpg";

					if(fs.existsSync(pngImage) && !fs.existsSync(thumbImage))
					{
						sharp(pngImage).resize(197, 272).toFile(thumbImage);
					}

					if(typeKey == "start")
					{
						startCards.push(cardName);
					}
				}
			}
		};

		packMetadata.pack = namespace;
		packMetadata.name = pack.name;
		packMetadata.box = fs.existsSync(filename.replace("pack.json","box.png"));
		packMetadata.startCards = startCards
		packs[namespace] = packMetadata;
	}
	catch(e)
	{
		console.error(e);
	}
}

fs.writeFileSync("./server/cards.ts", "var cards: {[key: string]: any} = " + JSON.stringify(cards, undefined,"\t") + "\nexport default cards");

var order;
if(fs.existsSync("./packs/order.json"))
{
	let ordertext = fs.readFileSync("./packs/order.json", "utf8");

	try{
		order = JSON.parse(ordertext);

		for(let obj of order)
		{
			if(typeof obj == "string" && !packsSet.has(obj))
			{
				console.error("ERROR: Pack " + obj + " does not exist");
			}
		}
	}
	catch(e)
	{
		console.error(e);
	}
}
else
{
	console.log("order.json not found. Using default order");
	order = Object.keys(packs);

	order.sort((a,b) => {

		let anamespace = a.split(".");
		let bnamespace = b.split(".");

		if(anamespace.length < bnamespace.length)
			return -1;
		else if (bnamespace.length < anamespace.length)
			return 1;

		if(a < b) return -1;
		if(b < a) return 1;
		return 0;
	})
}

order = order.map( (x:any) => packs[x] ? packs[x] : x );
order = order.filter((x:any) => typeof x == "object" || packs[x]);

fs.writeFileSync("./views/lobby/packOrder.ts", "var order: any[] = " + JSON.stringify(order, undefined,"\t") + "\nexport default order");