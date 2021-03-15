import fs from "fs";


function findPacks(topFolder, path, packs)
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

function validatePack(pack, namespace)
{
	if(pack.format !== "pack:1") throw new Error("Pack " + filename + " must be in pack:1 format");
	if(typeof pack.namespace !== "string") throw new Error("Pack " + filename + " needs a namespace");
	if(typeof pack.cards !== "object") throw new Error("Pack " + filename + " does not have a valid cards property");
}



let packsSet = findPacks("./packs/", "./packs", new Set());
let packs = {};

let cards = {};

for(let namespace of packsSet)
{
	var filename = "./packs/" + namespace.replace(/\./g, "/") + "/pack.json";

	let packJSON = fs.readFileSync(filename, "utf8");

	let pack;
	let packMetadata = {};

	try{

		try{
			pack = JSON.parse(packJSON);
		}
		catch(e)
		{
			throw new Error("Error parsing JSON file: " + filename);
		}

		validatePack(pack, namespace);

		for(let cardType of ["Pony","Start","Ship","Goal"])
		{
			let typeKey = cardType.toLowerCase();
			if(pack.cards[typeKey])
			{
				for(let key in pack.cards[typeKey])
				{
					let cardName = namespace + "." + cardType + "." + key;
					cards[cardName] = pack.cards[typeKey][key];
				}
			}
		};

		packMetadata.pack = namespace;
		packMetadata.name = pack.name;
		packMetadata.box = fs.existsSync(filename.replace("pack.json","box.png"));
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
				console.error("Pack " + obj + " does not exist");
			}
		}
	}
	catch(e)
	{
		console.error(e);
	}

	console.log(order.slice());
}
else
{
	console.log("order.json not found. Using default order");
	order = [...packs];

	order.sort((a,b) => {

		let anamespace = a.split(".");
		let bnamespace = b.split(".");

		if(anamespace.length < bnamespace)
			return -1;
		else if (bnamespace.length < anamespace.length)
			return 1;

		if(a < b) return -1;
		if(b < a) return 1;
		return 0;
	})
}

order = order.map( x => packs[x] ? packs[x] : x );

fs.writeFileSync("./views/lobby/packOrder.ts", "var order: any[] = " + JSON.stringify(order, undefined,"\t") + "\nexport default order");

/*
let cards:any = JSON.parse(fs.readFileSync("cards.json", 'utf8'));
let packs: any = {};

for (let key in cards)
{
	//console.log(key);
	let fullName = key.split(".");

	let namespace = fullName.slice();
	let cardName = namespace.pop() as string;
	let cardType = namespace.pop();



	let cardFileName = "../packs/" + fullName.join("/") + ".png";
	let namespaceStr = namespace.join('.');

	if(!packs[namespaceStr])
	{
		packs[namespaceStr] = {
			
			name: namespaceStr,
			description: "",
			format: "pack:1",
			root: "tsssf.net/packs",
			namespace: namespaceStr,
			cards:{
				start:{},
				pony:{},
				ship:{},
				goal:{}
			}
		}
	}

	let oldFileName = cardFileName.replace(cardName + ".png", cards[key].url);

	if(!fs.existsSync(cardFileName) && cards[key].url && fs.existsSync(oldFileName))
	{
		fs.renameSync(oldFileName, cardFileName);

		oldFileName = oldFileName.replace(".png",".thumb.jpg");
		cardFileName = cardFileName.replace(".png",".thumb.jpg");

		fs.renameSync(oldFileName, cardFileName);
	}

	delete cards[key].url;

	switch(cardType)
	{
		case "Pony":
			packs[namespaceStr].cards.pony[cardName] = cards[key];
			break;
		case "Start":
			packs[namespaceStr].cards.start[cardName] = cards[key];
			break;
		case "Ship":
			packs[namespaceStr].cards.ship[cardName] = cards[key];
			break;
		case "Goal":
			packs[namespaceStr].cards.goal[cardName] = cards[key];
			break;
	}


}

for(let key in packs)
{
	let pack = packs[key];

	let namespace = key.split(".");


	let filename = "../packs/" + namespace.join("/") + "/pack.json";
	console.log(filename);

	fs.writeFileSync(filename, JSON.stringify(pack, undefined, '\t'));

	
}
*/