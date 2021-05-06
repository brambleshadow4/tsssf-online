
import * as cm from "./cardManager.js";

import {slashStringToSet, isBlank, Card, CardProps, CardSetProps, Location} from "./lib.js";
import {GameModel} from "./gameServer.js";




function toSetProps(props: CardProps): CardSetProps
{
	return {
		action: props.action,
		name: slashStringToSet(props.name),
		gender: slashStringToSet(props.gender) as any,
		race: slashStringToSet(props.race) as any,
		keywords: new Set(props.keywords),
		altTimeline: props.altTimeline ? new Set([true]) : new Set(),
		count: props.count,
		card: "",
	}
}


function getCardProp<T extends keyof CardSetProps>(model: GameModel, cardFull: Card, prop: T): CardSetProps[T]
{
	let turnstate = model.turnstate!;
	//console.log("getCardProp(" + cardFull + ", " + prop + ")");

	let cards = cm.inPlay();


	// step 1, determine the baseCard, if any
	var [card, ctxNoStr] = cardFull.split(":");
	let ctxNo: number = Number(ctxNoStr);
	var cardOverrides = turnstate.overrides[card] || {};

	if(ctxNo != undefined && !isNaN(ctxNo))
	{
		cardOverrides = turnstate.getChangeContext(card).list[ctxNo] || cardOverrides;
	}

	var predisguise = card;
	var baseCard = cardOverrides.fullCopy || cardOverrides.disguise || card;

	if(ctxNo == 0)
	{
		baseCard = card;
	}

	let cardAction = cards[card].action || "";

	if(cardAction.startsWith("Changeling") && turnstate.specialEffects.larsonEffect)
	{
		baseCard = "HorriblePeople.2015Workshop.Pony.AlicornBigMacintosh";
	}


	if(prop == "card")
	{
		let props = toSetProps(cards[card]);
		props.card = cardFull;
		return props[prop];
	}


	/*
	 * step 2, determine the merge mode: top, merge, base, or pdomerge
	 * 
	 * There are three levels:
 	 *   predisguise => base => overrides
 	 * 
 	 * top mode checks whichever property is on top, does not merge any other attributes in
 	 * merge mode checks all levels, merging properties into a single set containing them all
 	 * base only checks the base level
 	 * pdo merges predisguise and overrides, leaving out 
 	 * 
	 */


	var mergeMode: "top" | "base" | "merge" | "pdomerge" = "top";

	if(prop.endsWith("_b"))
	{
		mergeMode = "base"
		prop = prop.substring(0, prop.length-2) as T;
	}
	else if (prop == "count")
	{
		mergeMode = "top";
	}
	else if (cardOverrides.fullCopy)
	{
		mergeMode = "merge";
	}
	else if(prop == "keywords" && cards[card].action && cards[card].action!.indexOf("plushling") >= 0)
	{
		mergeMode = "pdomerge"
	}
	else if (prop == "keywords" || prop == "name")
	{
		mergeMode = "merge";
	}


	if(prop == "race" && mergeMode != "base" && turnstate.specialEffects.larsonEffect)
	{
		let props = toSetProps(cards[card]);
		props.race = new Set(["alicorn"])
		return props[prop];
	}


	// step 3, do the merge.

	var allProps = [
		toSetProps(cards[predisguise]),
		toSetProps(cards[baseCard]),
		toSetProps(cardOverrides)
	];

	var props = allProps.map( x => x[prop]);

	if (props[0] == undefined || (props[0] as any).size == undefined)
	{
		switch(mergeMode)
		{
			case "base":
				return props[1];

			default:
				return props[2] || props[1] || props[0];
		}
	}

	let setProps = props as Set<string>[];


	switch(mergeMode)
	{
		case "top":

			if(setProps[2].size > 0)
				return props[2];

			else if(setProps[1].size > 0)
				return props[1];

			else
				return props[0];

		case "base":
			return props[1];

		case "merge":
			return new Set([...setProps[0], ...setProps[1], ...setProps[2]]) as any;

		case "pdomerge":
			return new Set([...setProps[0], ...setProps[2]]) as any;

	}
}


function doesCardMatchSelector(model: GameModel, card: Card, selector: string): number
{
	//console.log("doesCardMatchSelector " + card + " " + selector);

	let cards = cm.inPlay();
	let trueValue = getCardProp(model, card, "count") || 1;
	let falseValue = 0;

	if(selector.trim() == "*")
		return trueValue;

	if(selector.trim() == "genderSwapped")
	{
		var originalGender = getCardProp(model, card, "gender_b" as any) as Set<"male" | "female">;
		var currentGender = getCardProp(model, card, "gender");

		var combined = new Set([...originalGender, ...currentGender]);

		return originalGender.size == 1 && currentGender.size == 1 && combined.has("male") && combined.has("female") ? trueValue : falseValue;
	}

	var clauses = selector.split("&&");

	if(clauses.length > 1)
	{
		var criteria = clauses.map( clause => doesCardMatchSelector(model, card, clause.trim()));
		return (criteria.reduce((a,b) => a && b) ? trueValue : falseValue);
	}

	clauses = selector.split("||");

	if(clauses.length > 1)
	{
		var criteria = clauses.map( clause => doesCardMatchSelector(model, card, clause.trim()));
		return ( criteria.reduce((a,b) => a || b) ? trueValue : falseValue);
	}


	var value: string | number | boolean;
	let prop: any;

	if(selector.indexOf("!=") > -1)
	{
		
		[prop, value] = selector.split("!=");
		prop = prop.trim();
		value = value.trim();

		if(value == "true")
			value = true;
		if(value == "false")
			value = false;

		var cardValue = getCardProp(model, card, prop);

		return cardValue.has(value) ? falseValue : trueValue;

	}

	if(selector.indexOf("=") > -1)
	{
		[prop, value] = selector.split("=");
		prop = prop.trim();
		value = value.trim();

		if(value == "true")
			value = true;
		if(value == "false")
			value = false;

		var cardValue = getCardProp(model, card, prop);


		
		return cardValue.has(value) ? trueValue : falseValue;
	}

	if(selector.indexOf(" in ") > -1 || selector.indexOf(" !in ") > -1)
	{
		var invert = false;
		if(selector.indexOf(" !in ") > -1)
		{
			[value, prop] = selector.split(" !in ");
			invert = true;
		}
		else
		{
			[value, prop] = selector.split(" in ");
		}

		prop = prop.trim();
		value = value.trim();

		//console.log(`getCardProp(model, ${card}, ${prop}) = ${getCardProp(model, card, prop)}`)

		if(invert)
		{
			return (getCardProp(model, card, prop).has(value) ? falseValue : trueValue);
		}

		return (getCardProp(model, card, prop).has(value) ? trueValue : falseValue);
	}

	return falseValue
}

export function getConnectedPonies(model: GameModel, ponyLoc: Location, onlyCountDirectlyShipped?: boolean)
{
	model.turnstate = model.turnstate!;

	var [typ, xs, ys] = ponyLoc.split(",");
	var thisPony = model.board[ponyLoc].card;
	let x = Number(xs)
	let y = Number(ys)

	var shipPonyPairs = [
		["sr," + x + "," + y, "p," + (x+1) + "," + y],
		["sd," + x + "," + y, "p," + x + "," + (y+1)],
		["sr," + (x-1) + "," + y, "p," + (x-1) + "," + y],
		["sd," + x + "," + (y-1), "p," + x + "," + (y-1)]
	]


	var connected: Set<Card> = new Set();
	if(!onlyCountDirectlyShipped && model.turnstate.specialEffects.shipWithEverypony.has(thisPony))
	{
		for(var key in model.board)
		{
			if(key.startsWith("p,") && !isBlank(model.board[key].card) && model.board[key].card != thisPony)
			{
				connected.add(model.board[key].card);
			}
		}
	}
	
	for(var [shipKey, ponyKey] of shipPonyPairs)
	{
		if(model.board[shipKey] && model.board[ponyKey] 
			&& !isBlank(model.board[shipKey].card) && !isBlank(model.board[ponyKey].card))
		{
			connected.add(model.board[ponyKey].card)
		}
	}

	if(!onlyCountDirectlyShipped)
	{
		for(var pony of model.turnstate.specialEffects.shipWithEverypony)
		{
			if(pony != thisPony)
				connected.add(pony);
		}
	}
	
	return [...connected];
}

function ExistsPony(selector: string, count?: number)
{
	if (typeof selector != "string") 
		throw new Error("Arg 1 of ExistsPonyGeneric needs to be a function");
	if (typeof count != "number" && typeof count != "undefined") 
		throw new Error("Arg 2 of ExistsPonyGeneric needs to be a number");

	count = count || 1;
	return function(model: GameModel)
	{
		var boardCount = 0;

		for(var key in model.board)
		{
			if(key.startsWith("p,"))
			{
				//console.log("checking card " + model.board[key].card);
				//console.log("does match " + selector + " " + model.board[key].card + " " + doesCardMatchSelector(model, model.board[key].card, selector));

				boardCount += doesCardMatchSelector(model, model.board[key].card, selector)
			}
		}

		//console.log(selector + " count " + boardCount);
		return boardCount >= count!;
	}
}


function ExistsPonyGeneric(selectFun: (m:GameModel, p:Card)=>number, count?:number)
{
	if (typeof selectFun != "function") 
		throw new Error("Arg 1 of ExistsPonyGeneric needs to be a function");
	if (typeof count != "number" && typeof count != "undefined") 
		throw new Error("Arg 2 of ExistsPonyGeneric needs to be a number");

	count = count || 1;
	return function(model: GameModel)
	{
		var boardCount = 0;

		for(var key in model.board)
		{
			if(key.startsWith("p,"))
			{
				//console.log("checking card " + model.board[key].card);
				boardCount += selectFun(model, model.board[key].card)
			}
		}

		//console.log(selector + " count " + boardCount);
		return boardCount >= count!;
	}
}


function ExistsChain(selector: string, count: number)
{
	if (typeof selector != "string") 
		throw new Error("Arg 1 of ExistsChain needs to be a string");
	if (typeof count != "number") 
		throw new Error("Arg 2 of ExistsChain needs to be a number");

	return function(model: GameModel)
	{
		function buildChain(key: Location)
		{
			var workList = [key];
			var chained: Set<Card> = new Set();
			var explored = new Set();

			while (chained.size < count && workList.length)
			{
				var thisKey = workList.shift()!;

				if(explored.has(thisKey))
					continue;

				explored.add(thisKey);

				if(!doesCardMatchSelector(model, model.board[thisKey].card, selector))
					continue;

				chained.add(thisKey);	


				var ponyKeys = getConnectedPonies(model, thisKey, true).map( x => model.cardLocations[x])
				workList = workList.concat(ponyKeys);
			}

			return chained;
		}


		for(var key in model.board)
		{
			if(key.startsWith("p") && !isBlank(model.board[key].card))
			{
				var chained = buildChain(key);				
				var ponyCards = [...chained].map(x => model.board[x].card);

				var chainCount = ponyCards.map(x => getCardProp(model, x, "count") || 1).reduce((a,b) => a + b, 0)

				if(chainCount >= count && ponyCards.length > 1)
					return true;
			}
		}

		return  false;
	}
}

function Select(selector: string, count?: number)
{
	if (typeof selector != "string") 
		throw new Error("Arg 1 of Select needs to be a string");
	if (typeof count != "number" && typeof count != "undefined") 
		throw new Error("Arg 2 of Select needs to be a number");
	count = count || 1;

	return function(model: GameModel, connectedPonies: Card[])
	{
		let centeredCount = 0;
		for(var card of connectedPonies)
		{
			centeredCount += doesCardMatchSelector(model, card, selector)
		}

		return centeredCount >= count!;
	}
}

function ExistsPonyShippedTo(
	mainPonySel: string,
	groupSelectionFn:(m:GameModel, p:Card[]) => number,
	count?: number
){
	if (typeof mainPonySel != "string") 
		throw new Error("Arg 1 of ExistsPonyShippedTo needs to be a string");
	if (typeof groupSelectionFn != "function") 
		throw new Error("Arg 2 of ExistsPonyShippedTo needs to be a function");
	if (typeof count != "number" && typeof count != "undefined") 
		throw new Error("Arg 3 of ExistsPonyShippedTo needs to be a number");

	count = count || 1;
	return function(model: GameModel)
	{
		for(var key in model.board)
		{
			if(key.startsWith("p") && !isBlank(model.board[key].card))
			{
				var centeredCount = 0;

				if(!doesCardMatchSelector(model, model.board[key].card, mainPonySel))
					continue;

				if(groupSelectionFn(model, getConnectedPonies(model, key)))
					return true;	
			}
		}

		return  false;
	}
}


function ExistsShip(selector1: string, selector2: string, count?: number)
{
	if (typeof selector1 != "string") 
		throw new Error("Arg 1 of ExistsShip needs to be a string");
	if (typeof selector2 != "string") 
		throw new Error("Arg 2 of ExistsShip needs to be a string");
	if (typeof count != "number" && typeof count != "undefined") 
		throw new Error("Arg 3 of ExistsShip needs to be a number");

	count = count || 1;

	var checkTwoSelectors = function(model: GameModel, card1: Card, card2: Card)
	{
		if(doesCardMatchSelector(model, card1, selector1) && doesCardMatchSelector(model, card2, selector2))
		{
			return getShipCount(model, card1, card2);
		}
		else if (doesCardMatchSelector(model, card1, selector2) && doesCardMatchSelector(model, card2, selector1))
		{
			return getShipCount(model, card1, card2);
		}

		return 0;
	}


	return ExistsShipGeneric(checkTwoSelectors, count)
}



function PlayPonies(selector: string, count?: number)
{
	if (typeof selector != "string") 
		throw new Error("Arg 1 of PlayPonies needs to be a string");
	if (typeof count != "number" && typeof count != "undefined") 
		throw new Error("Arg 2 of PlayPonies needs to be a number");

	count = count || 1;

	return function(model: GameModel)
	{
		if(model.turnstate)
		{
			var matchingPlays = model.turnstate!.playedPonies.filter(x => doesCardMatchSelector(model, x, selector));
			var matchCount = matchingPlays.map(x => getCardProp(model, x, "count") || 1).reduce((a, b) => a + b, 0) as number;

			return (matchCount >= count!);
		}

		return false;
	}
}


function getShipCount(model: GameModel, pony1: Card, pony2: Card)
{
	return Math.max(getCardProp(model, pony1, "count") || 1, getCardProp(model, pony1, "count") || 1)
}

function PlayShips(selector1: string, selector2: string, count?: number)
{
	if (typeof selector1 != "string") 
		throw new Error("Arg 1 of PlayShips needs to be a string");
	if (typeof selector2 != "string") 
		throw new Error("Arg 2 of PlayShips needs to be a string");
	if (typeof count != "number" && typeof count != "undefined") 
		throw new Error("Arg 3 of PlayShips needs to be a number");

	count = count || 1;
	return function(model: GameModel)
	{
		if(model.turnstate)
		{
			var matchingPlays = model.turnstate.playedShips.map(function(x){

				var [ship, pony1, pony2] = x;

				if(doesCardMatchSelector(model, pony1, selector1) && doesCardMatchSelector(model, pony2, selector2))
				{
					return getShipCount(model, pony1, pony2);

				}
				else if (doesCardMatchSelector(model, pony1, selector2) && doesCardMatchSelector(model, pony2, selector1))
				{
					return getShipCount(model, pony1, pony2);
				}
				return 0

			});

			return (matchingPlays.reduce((a:number, b:number) => a + b, 0) >= count!);
		}

		return false;
	}
}

function BreakShip(selector1: string, selector2: string, count?: number)
{
	if (typeof selector1 != "string") 
		throw new Error("Arg 1 of BreakShip needs to be a string");
	if (typeof selector2 != "string") 
		throw new Error("Arg 2 of BreakShip needs to be a string");
	if (typeof count != "number" && typeof count != "undefined") 
		throw new Error("Arg 3 of BreakShip needs to be a number");

	count = count || 1;
	return function(model: GameModel)
	{

		if(model.turnstate)
		{
			var matchingPlays = model.turnstate.brokenShipsNow.map(function(x){

				var [pony1, pony2] = x;

				if(doesCardMatchSelector(model, pony1, selector1) && doesCardMatchSelector(model, pony2, selector2))
				{
					return getShipCount(model, pony1, pony2);
				}
				else if (doesCardMatchSelector(model, pony1, selector2) && doesCardMatchSelector(model, pony2, selector1))
				{
					return getShipCount(model, pony1, pony2);
				}

				return 0

			});

			return (matchingPlays.reduce((a:number,b:number) => a + b, 0) >= count!);
		}

		return false;
	}
}

function ExistsShipGeneric(compareCardsFun: (m:GameModel, c1: Card, c2: Card) => number, count?: number)
{
	if (typeof compareCardsFun != "function") 
		throw new Error("Arg 1 of ExistsShipGeneric needs to be a function");
	if (typeof count != "number" && typeof count != "undefined") 
		throw new Error("Arg 2 of ExistsShipGeneric needs to be a number");

	count = count || 1;

	return function(model: GameModel)
	{
		model.turnstate = model.turnstate!;

		var boardCount = 0;

		var shipWithEverypony = model.turnstate.specialEffects.shipWithEverypony

		for(var key in model.board)
		{
			if(key.startsWith("s") && !isBlank(model.board[key].card))
			{

				var [typ, xs, ys] = key.split(",");

				let x = Number(xs);
				let y = Number(ys);

				var card1key = "p," + x + "," + y;
				var card2key;

				if(typ == "sr")
					card2key = "p," + (x+1) + "," + y;
				else
					card2key = "p," + x + "," + (y+1);


				if(!model.board[card1key] || !model.board[card2key])
					continue;

				var card1 = model.board[card1key].card;
				var card2 = model.board[card2key].card;

				// don't double count the shipWithEverypony card
				if(shipWithEverypony.has(card1) || shipWithEverypony.has(card2))
					continue; 

				if(card1 && card2 && !isBlank(card1) && !isBlank(card2))
				{
					if(compareCardsFun(model, card1, card2))
					{
						boardCount += getShipCount(model, card1, card2)
					}
				}
			}
		}

		for(var card1 of shipWithEverypony)
		{	
			for(var key in model.board)
			{
				if(key.startsWith("p") && !isBlank(model.board[key].card) && model.board[key].card != card1)
				{
					var card2 = model.board[key].card;

					if(compareCardsFun(model, card1, card2))
					{
						boardCount += getShipCount(model, card1, card2);
					}
				}
			}
		}

		return boardCount >= count!;
	}
}


/************************** Custom Rules **************************/

function PlayLovePoisons(model: GameModel)
{
	if(model.turnstate)
	{
		var matchingPlays = model.turnstate.playedShips.filter(function(x)
		{
			var [ship, pony1, pony2] = x;
			return cm.inPlay()[ship].action == "lovePoison";
		});

		return (matchingPlays.length >= 2);
	}

	return false;
}

function SwapCount(count: number)
{
	return function(model: GameModel)
	{
		if(model.turnstate)
		{
			return model.turnstate.swapsNow >= count;
		}

		return false;
	}
}

function ShippedWithOppositeGenderedSelf(model: GameModel, card1: Card, card2: Card)
{
	var hasSameName = false;
	var nameset1 = getCardProp(model, card1, "name");
	var nameset2 = getCardProp(model, card2, "name");

	for(var name of nameset1)
	{
		if(nameset2.has(name))
		{
			hasSameName = true;
			break;
		}
	}

	if(hasSameName)
	{
		var gender1 = getCardProp(model, card1, "gender");
		var gender2 = getCardProp(model, card2, "gender");

		return gender1.size == 1 && gender2.size == 1 && new Set([...gender1, ...gender2]).size == 2;
	}

	return false;
}

function ShippedWith2Versions(model: GameModel, ponyCards: Card[])
{

	function filterFun(card1: Card, card2: Card)
	{
		/*if(getCardProp(model,card2,"name") == getCardProp(model,card1,"name"))
		{
			var id1 = (model.turnstate && model.turnstate.overrides && model.turnstate.overrides[card1] && model.turnstate.overrides[card1].disguise) || card1;
			var id2 = (model.turnstate && model.turnstate.overrides && model.turnstate.overrides[card2] && model.turnstate.overrides[card2].disguise) || card2;

			return id1 != id2;
		}*/

		var set1 = getCardProp(model,card2,"name");
		var set2 = getCardProp(model,card1,"name");
		for(var item of set1)
		{
			if(set2.has(item))
				return true;
		}
		return false;	
	}

	let centeredCount = 0;

	for(var card of ponyCards)
	{

		var match = ponyCards.filter(x => filterFun(card, x))

		if(match.length > 1)
			return true;
	}

	return false;
}

function AllOf(...selectors: string[])
{
	return function(model: GameModel, ponyCards: Card[])
	{
		for(var selector of selectors)
		{
			if(ponyCards.filter(x => doesCardMatchSelector(model, x, selector)).length == 0)
				return 0;
		}

		return 1;
	}
	
}

export function typecheckGoal(card: any)
{
	if(card.goalFun == undefined)
	{
		//console.log("typechecking goal");
		//console.log(card);
		card.goalFun = false;

		if(card.goalLogic)
		{
			var fun = goalLogicParser(card.goalLogic, []);

			//console.log(fun);
			card.goalFun = fun;
		}
	}
}

export function evalGoalCard(card: Card, model: GameModel): boolean
{
	let cards = cm.inPlay();

	try
	{
		typecheckGoal(cards[card]);

		if(cards[card].goalFun)
		{
			return cards[card].goalFun!(model);
		}

		return false;
	}
	catch(e)
	{
		console.error(e);
		return false;
	}
}


function goalLogicParser(text: string, stack: string[]): any
{
	function getFunFromName(name: string)
	{
		switch(name)
		{
			case "AllOf": return AllOf;
			case "BreakShip": return BreakShip;
			case "ExistsChain": return ExistsChain;
			case "ExistsPony": return ExistsPony;
			case "ExistsPonyGeneric": return ExistsPonyGeneric;
			case "ExistsPonyShippedTo": return ExistsPonyShippedTo;
			case "ExistsShip": return ExistsShip;
			case "ExistsShipGeneric": return ExistsShipGeneric;
			case "PlayLovePoisons": return PlayLovePoisons;
			case "PlayPonies": return PlayPonies;
			case "PlayShips": return PlayShips;
			case "Select": return Select;
			case "ShippedWithOppositeGenderedSelf": return ShippedWithOppositeGenderedSelf;
			case "ShippedWith2Versions": return ShippedWith2Versions;
			case "SwapCount": return SwapCount;
			default: return undefined
		}
	}

	var funNames = new Set([])

	function inf(x: number)
	{
		return x == -1 ? Infinity : x;
	}


	var parIndex = inf(text.indexOf("("));
	var commaIndex = inf(text.indexOf(","));
	var endparIndex = inf(text.indexOf(")"));

	var end = Math.min(parIndex, Math.min(commaIndex, endparIndex));

	var token = text.substring(0,end);
	var text = text.substring(end);

	//console.log("stack " + stack);

	switch(text[0])
	{
		case "(":
			stack.push(token);
			stack.push("(");

			return goalLogicParser(text.substring(1), stack);

		case ")":
			
			if(token.trim() != "")
			{
				stack.push(token.trim());
			}

			var openPar = stack.lastIndexOf("(")
			openPar--;

			var params = [];

			var param = stack.pop()!;
			while(param != "(")
			{
				if(typeof param == "function")
					params.unshift(param)
				else if (getFunFromName(param))
				{
					params.unshift(getFunFromName(param))
				}
				else if (!isNaN(Number(param)))
				{
					params.unshift(Number(param))
				}
				else
				{
					params.unshift(param.trim());
				}

				param = stack.pop()!;
			}

			param = stack.pop()!.trim();

			let fun = getFunFromName(param) as Function;

			if(!fun)
				throw new Error("A function named " + param + " does not exists. stack=" + stack);

			//console.log("params: " + params)

			stack.push(fun(...params));

			return goalLogicParser(text.substring(1), stack);

		case ",":

			if(token.trim() != "")
				stack.push(token)

			return goalLogicParser(text.substring(1), stack);

		default:

			if(token.trim() == "" && stack.length == 1)
			{
				return stack[0];
			}
			else if(stack.length == 0 && token.trim() != "")
			{
				let fun = getFunFromName(token) as Function;
				if(fun)
					return fun;
				else
					throw new Error("A function named " + token + " does not exists.");
			}
			else
			{
				throw new Error("The following tokens could not be parsed successfully: " + stack);
			}		
	}
}
	
export default evalGoalCard;