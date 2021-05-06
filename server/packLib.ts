
import {CardProps} from "./lib.js";
import {typecheckGoal} from "./goalCriteria.js";


export function validatePack(pack:any, namespace:string, filename: string, format: "any" | "pack" | "link"): string[]
{
	let errors: string[] = [];

	if(format == "pack")
	{
		if(pack.format !== "pack:1") errors.push("Pack " + filename + " must be in pack:1 format");
	}
	else
	{
		if(pack.format !== "pack:1" && pack.format !== "link:1") errors.push("Pack " + filename + " is missing the format property");
	}


	if(namespace)
	{
		if(pack.namespace !== namespace) errors.push("The path to pack " + filename + " doesn't match its declared namespace");
	}

	
	if(typeof pack.namespace !== "string" || pack.namespace.length == 0) errors.push("Pack " + filename + " is missing the namespace property");
	if(typeof pack.cards !== "object") errors.push("Pack " + filename + " does not have a valid cards property");

	if(pack.cards)
	{
		for(var key in pack.cards.pony)
		{
			let card = pack.cards.pony[key];
			errors = errors.concat(validateCard(key, "Pony", pack.format, card));
		}

		for(var key in pack.cards.start)
		{
			let card = pack.cards.start[key];
			errors = errors.concat(validateCard(key, "Start", pack.format, card));
		}

		for(var key in pack.cards.goal)
		{
			let card = pack.cards.goal[key];
			errors = errors.concat(validateCard(key, "Goal", pack.format, card));
		}

		for(var key in pack.cards.ship)
		{
			let card = pack.cards.ship[key];
			errors = errors.concat(validateCard(key, "Ship", pack.format, card));
		}
	}

	return errors;
}

function validateSlashSet(obj: any, validValues: Set<string>): boolean
{
	if(obj === undefined) return true;
	if(typeof obj !== "string") return false;


	let s:string = obj;

	var items = s.split("/");

	for(let item of items)
	{
		if(!validValues.has(item))
		{
			return false;
		}
	}

	return true;
}


export function validateCard(name:string, cardType: "Pony" | "Ship" | "Start" | "Goal", packFormat: string, card: any): string[]
{
	var errors = [];
	var genders = new Set(["male","female"]);
	var races = new Set(["earth","pegasus","unicorn","alicorn"]);

	var ponyProps = new Set(["gender","race","name", "keywords", "action", "altTimeline", "count", "changeGoalPointValues", "url", "thumb"]);

	if(packFormat.startsWith("link"))
	{
		if(typeof card.url !== "string" || card.url.length == 0) errors.push("card " + name + " doesn't have a valid url property");
	}

	if(cardType == "Pony" || cardType == "Start") 
	{
		if(typeof card.name !== "string") errors.push("pony " + name + " doesn't have a valid name property");
		
		if(!Array.isArray(card.keywords)) errors.push("pony " + name + " doesn't have a valid keywords property");

		if(!validateSlashSet(card.gender, genders)) errors.push("pony " + name + " has an invalid gender value: " + card.gender);
		if(!validateSlashSet(card.race, races)) errors.push("pony " + name + " has an invalid race value: " + card.race);
		if(card.altTimeline && card.altTimeline !== true) errors.push("pony " + name + " has an invalid altTimeline value: " + card.altTimeline);
		if(card.changeGoalPointValues && card.changeGoalPointValues !== true) errors.push("pony " + name + " has an invalid changeGoalPointValues value: " + card.changeGoalPointValues);
		if(card.count && typeof card.count !== "number") errors.push("pony " + name + " has an invalid count value: " + card.count);

		for(var key of Object.keys(card))
		{
			if(!ponyProps.has(key))
			{
				errors.push("pony " + name + " has an extra prop: " + key);
			}
		}
		
	}

	if(cardType == "Goal")
	{
		if(!card.points)
			errors.push("goal " + name + " is missing the points property");
		else
		{
			if(typeof card.points !== "number" && typeof card.points !== "string") 
			{
				errors.push("goal " + name + " has an invalid points property: " + card.points);
				return errors;
			}

			if(isNaN(Number(card.points)))
			{
				let [a,b] = card.points.split("-");

				if(isNaN(Number(a)) || isNaN(Number(b)))
				{
					errors.push("goal " + name + " has an invalid points value: " + card.points);
				}
			}
		}

		try{
			typecheckGoal(card);
		}
		catch(e)
		{
			errors.push("goal " + name + "\n" + e.toString());
		}
		
	}

	return errors;
}

type Pack = {

	"namespace": string,
	"format": "pack:1" | "link:1",
	"root"?: string,
	"cards":{
		"pony"?: {[key:string]: CardProps},
		"start"?: {[key:string]: CardProps},
		"ship"?: {[key:string]: CardProps},
		"goal"?: {[key:string]: CardProps}
	}
}


export function flattenPack(pack: Pack, isExternal: boolean)
{
	let newCards: {[key:string]: CardProps} = {};
	for(let cardType of ["Pony","Start","Ship","Goal"])
	{
		let typeKey = cardType.toLowerCase() as "pony" | "start" | "ship" | "goal";

		if(pack.cards[typeKey])
		{
			for(let key in pack.cards[typeKey])
			{
				var group = pack.cards[typeKey] as {[key:string]: CardProps};
				let cardName = pack.namespace + "." + cardType + "." + key;

				if(isExternal && pack.format.startsWith("pack"))
				{
					let filePath = pack.root + "/" + cardName.replace(/\./g, "/");
					group[key].url = filePath + ".png";
					group[key].thumb = filePath + ".thumb.jpg";
				}

				cardName = isExternal ? "X." + cardName : cardName;	

				var names = group[key].name;

				newCards[cardName] = group[key];				
			}
		}
	};

	return newCards;
}

export function mergePacks(...packs: {[key:string]: CardProps}[])
{
	var newPack: {[key:string]: CardProps} = {};

	for(let pack of packs)
	{
		for(let key in pack)
		{
			newPack[key] = pack[key];
		}
	}

	return newPack;
}