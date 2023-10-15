import fs from 'fs';
import sharp from "sharp";
import {CardConfig, CardProps} from "../model/lib.js";
import {validatePack} from "../model/packLib.js";


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

export async function pack(): Promise<CardConfig>
{
	let packsSet = findPacks("./packs/", "./packs", new Set());
	let packs: any = {};

	let cards: {[card:string]: CardProps} = {};

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


			var errors = validatePack(pack, namespace, filename, "pack");
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
						let pngImage2 = imageName + "-2.png";
						let thumbImage = imageName + ".thumb.jpg";

						if(fs.existsSync(pngImage))
						{
							let image = sharp(pngImage);
							
							if(!((await image.metadata()).isProgressive))
							{	
								console.log("interlacing " + key)

								await image.png({progressive: true}).toFile(pngImage2)
								fs.copyFileSync(pngImage2, pngImage);
								fs.unlinkSync(pngImage2);
							}

							if (!fs.existsSync(thumbImage))
							{
								let image2 = sharp(pngImage);
								image2.resize(197, 272).toFile(thumbImage);
							}
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

	return {
		order,
		standard: cards,
		custom: {
			cards: {},
			descriptions: [],
			currentSize: 0,
		}
	}
}