import cards from "./cards.js";

import {isBlank} from "./lib.js";


var Nope = () => false;
var Yep = () => true;




function getCardProp(model, card, prop)
{

	if(prop == "keywords")
	{
		var keywords = [];

		if(model.turnstate && model.turnstate.overrides && model.turnstate.overrides[card]) 
		{
			if(model.turnstate.overrides[card]["keywords"])
			{
				keywords = model.turnstate.overrides[card]["keywords"];
			}

			if(model.turnstate.overrides[card].disguise)
			{
				keywords = keywords.concat(cards[model.turnstate.overrides[card].disguise].keywords);
			}
		}

		return new Set(keywords.concat(cards[card].keywords));
	}


	if(model.turnstate && model.turnstate.overrides && model.turnstate.overrides[card])
	{
		if (model.turnstate.overrides[card][prop])
		{
			return model.turnstate.overrides[card][prop];
		}

		if(model.turnstate.overrides[card].disguise)
		{
			card = model.turnstate.overrides[card].disguise;
		}
	} 
	
	return cards[card][prop];
}


function doesCardMatchSelector(model, card, selector)
{
	if(selector.trim() == "*")
		return true;

	if(selector.trim() == "genderSwapped")
	{
		var originalGender = cards[card].gender;
		if(model.turnstate && model.turnstate.overrides && model.turnstate.overrides[card] && model.turnstate.overrides[card].disguise)
		{
			originalGender = cards[model.turnstate.overrides[card].disguise].gender
		}

		return getCardProp(model,card,"gender") != originalGender;
	}

	var clauses = selector.split("&&");

	if(clauses.length > 1)
	{
		var criteria = clauses.map( clause => doesCardMatchSelector(model, card, clause.trim()));

		return criteria.reduce((a,b) => a && b);
	}

	clauses = selector.split("||");

	if(clauses.length > 1)
	{
		var criteria = clauses.map( clause => doesCardMatchSelector(model, card, clause.trim()));

		return criteria.reduce((a,b) => a || b);
	}


	if(selector.indexOf("!=") > -1)
	{
		var [prop, value] = selector.split("!=");
		prop = prop.trim();
		value = value.trim();

		if(value == "true")
			value = true;
		if(value == "false")
			value = false;

		var cardValue = getCardProp(model, card, prop);

		if(prop == "gender" && cardValue == "malefemale")
			return true;

		return getCardProp(model, card, prop) != value;
	}

	if(selector.indexOf("=") > -1)
	{
		var [prop, value] = selector.split("=");
		prop = prop.trim();
		value = value.trim();

		if(value == "true")
			value = true;
		if(value == "false")
			value = false;


		var cardValue = getCardProp(model, card, prop);

		if(prop == "gender" && cardValue == "malefemale")
			return true;
		//console.log(`getCardProp(model, ${card}, ${prop}) = ${getCardProp(model, card, prop)}`)
		return getCardProp(model, card, prop) == value;
	}

	if(selector.indexOf(" in ") > -1)
	{
		var [value, prop] = selector.split(" in ");

		prop = prop.trim();
		value = value.trim();

		//console.log(`getCardProp(model, ${card}, ${prop}) = ${getCardProp(model, card, prop)}`)

		return getCardProp(model, card, prop).has(value);
	}

	return false
}





function ExistsPony(selector, count)
{
	count = count || 1;
	return function(model)
	{
		var boardCount = 0;

		for(var key in model.board)
		{
			if(key.startsWith("p,"))
			{
				//console.log("checking card " + model.board[key].card);
				if(doesCardMatchSelector(model, model.board[key].card, selector))
				{
					boardCount++;
				}
			}
		}

		//console.log(selector + " count " + boardCount);
		return boardCount >= count;
	}
}

function getConnectedPonies(model, key)
{
	var [typ, x, y] = key.split(",");
	x = Number(x)
	y = Number(y)

	var shipPonyPairs = [
		["sr," + x + "," + y, "p," + (x+1) + "," + y],
		["sd," + x + "," + y, "p," + x + "," + (y+1)],
		["sr," + (x-1) + "," + y, "p," + (x-1) + "," + y],
		["sd," + x + "," + (y-1), "p," + x + "," + (y-1)]
	]

	var connected = [];
	for(var [shipKey, ponyKey] of shipPonyPairs)
	{
		if(model.board[shipKey] && model.board[ponyKey] 
			&& !isBlank(model.board[shipKey].card) && !isBlank(model.board[ponyKey].card))
		{
			connected.push(ponyKey)
		}
	}	

	return connected;

}

function ExistsChain(selector, count)
{
	return function(model)
	{
		function buildChain(key)
		{
			var workList = [key];
			var chained = new Set();
			var explored = new Set();

			while (chained.size < count && workList.length)
			{
				var key = workList.shift();

				if(explored.has(key))
					continue;

				explored.add(key);

				if(!doesCardMatchSelector(model, model.board[key].card, selector))
					continue;

				chained.add(key);	

				console.log(key);

				workList = workList.concat(getConnectedPonies(model, key));
			}

			return chained;
		}


		for(var key in model.board)
		{
			if(key.startsWith("p") && !isBlank(model.board[key].card))
			{

				var chained = buildChain(key);
				
				if(chained.size >= count)
					return true;

			}
		}

		return  false;
	}
}

function Select(selector, count)
{
	return function(model, ponyKeys)
	{
		console.log("select function run");

		console.log(ponyKeys)

		let centeredCount = 0;
		for(var ponyKey of ponyKeys)
		{
			console.log(model.board[ponyKey].card);
			if(doesCardMatchSelector(model, model.board[ponyKey].card, selector))
			{
				centeredCount++;
			}
		}

		console.log(selector + " " + centeredCount)

		return centeredCount >= count;
	}
}

function ShippedWith2Versions(model, ponyKeys)
{

	function filterFun(card1, card2)
	{
		/*if(getCardProp(model,card2,"name") == getCardProp(model,card1,"name"))
		{
			var id1 = (model.turnstate && model.turnstate.overrides && model.turnstate.overrides[card1] && model.turnstate.overrides[card1].disguise) || card1;
			var id2 = (model.turnstate && model.turnstate.overrides && model.turnstate.overrides[card2] && model.turnstate.overrides[card2].disguise) || card2;

			return id1 != id2;
		}*/

		return getCardProp(model,card2,"name") == getCardProp(model,card1,"name")
	}

	let centeredCount = 0;

	var ponyCards = ponyKeys.map(k => model.board[k].card);

	//console.log("All matches " + ponyCards)
	for(var card of ponyCards)
	{

		var match = ponyCards.filter(x => filterFun(card, x))

		//console.log('match ' + card + " " + match)

		if(match.length > 1)
			return true;
	}

	return false;
}

function ExistsPonyShippedTo(mainPonySel, groupSelectionFn, count)
{
	count = count || 1;
	return function(model)
	{
		for(var key in model.board)
		{
			if(key.startsWith("p") && !isBlank(model.board[key].card))
			{
				var centeredCount = 0;

				if(!doesCardMatchSelector(model, model.board[key].card, mainPonySel))
					continue;

				var connectedKeys = getConnectedPonies(model, key);

				if(groupSelectionFn(model, connectedKeys))
					return true;	
			}
		}

		return  false;
	}
}


function ShippedWithOppositeGenderedSelf(model, card1, card2)
{
	if(getCardProp(model, card1, "name") == getCardProp(model, card2, "name"))
	{
		var gender1 = getCardProp(model, card1, "gender");
		var gender2 = getCardProp(model, card2, "gender");

		console.log(card1 + ": " + gender1)
		console.log(card2 + ": " + gender2)
		console.log((gender1 == "male" && gender2 == "female") || (gender1 == "female" && gender2 == "male"));
		return ((gender1 == "male" && gender2 == "female") || (gender1 == "female" && gender2 == "male"))
	}

	return false;

}

function ExistsShip(selector1, selector2, count)
{
	var checkTwoSelectors = function(model, card1, card2)
	{
		if(doesCardMatchSelector(model, card1, selector1) && doesCardMatchSelector(model, card2, selector2))
		{
			return true;
		}
		else if (doesCardMatchSelector(model, card1, selector2) && doesCardMatchSelector(model, card2, selector1))
		{
			return true;
		}

		return false;
	}


	return ExistsShipGeneric(checkTwoSelectors, count)
}

function PlayPonies(selector, count)
{
	return function(model)
	{
		if(model.turnstate)
		{
			var matchingPlays = model.turnstate.playedPonies.filter(x => doesCardMatchSelector(model, x, selector));

			return (matchingPlays.length >= count);
		}

		return false;
	}
}

function PlayShips(selector1, selector2, count)
{
	count = count || 1;
	return function(model)
	{
		if(model.turnstate)
		{
			var matchingPlays = model.turnstate.playedShips.filter(function(x){

				var [ship, pony1, pony2] = x;

				if(doesCardMatchSelector(model, pony1, selector1) && doesCardMatchSelector(model, pony2, selector2))
					return true
				else if (doesCardMatchSelector(model, pony1, selector2) && doesCardMatchSelector(model, pony2, selector1))
					return true;
				return false

			});

			return (matchingPlays.length >= count);
		}

		return false;
	}
}

function BreakShip(selector1, selector2, count)
{
	count = count || 1;
	return function(model)
	{
		if(model.turnstate)
		{
			var matchingPlays = model.turnstate.brokenShipsNow.filter(function(x){

				var [pony1, pony2] = x;

				if(doesCardMatchSelector(model, pony1, selector1) && doesCardMatchSelector(model, pony2, selector2))
					return true
				else if (doesCardMatchSelector(model, pony1, selector2) && doesCardMatchSelector(model, pony2, selector1))
					return true;
				return false

			});

			return (matchingPlays.length >= count);
		}

		return false;
	}
}

function ExistsShipGeneric(compareCardsFun, count)
{
	count = count || 1;
	return function(model)
	{
		var boardCount = 0;

		for(var key in model.board)
		{
			if(key.startsWith("s") && !isBlank(model.board[key].card))
			{
				var [typ, x, y] = key.split(",");

				x = Number(x);
				y = Number(y);

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

				if(card1 && card2 && !isBlank(card1) && !isBlank(card2))
				{
					if(compareCardsFun(model, card1, card2))
						boardCount++;
				}

				
			}
		}

		return boardCount >= count;
	}
}



var goalCriteria = {

	"Core.Goal.BuddingCuriosity": ExistsShipGeneric(ShippedWithOppositeGenderedSelf),
	"Core.Goal.CargoShip": ExistsShip("Object in keywords","Object in keywords"),
	"Core.Goal.ChancellorPuddingheadsEntourage": PlayPonies("race=earth", 3),
	"Core.Goal.CharityAuction": ExistsShip("genderSwapped", "genderSwapped"),
	"Core.Goal.CommanderHurricanesArmy": PlayPonies("race=pegasus", 3),
	"Core.Goal.DeepCover": ExistsShip("Changeling in keywords","Changeling in keywords"),
	"Core.Goal.Epidemic": Nope,
	"Core.Goal.Fabulosity": ExistsShip("name=Rarity","name=Rarity"),
	"Core.Goal.FriendshipIsBenefits": ExistsChain("Mane 6 in keywords", 6),
	"Core.Goal.GoForthAndMultiply": PlayShips("gender=male","gender=female", 3),
	"Core.Goal.GoodEnough": ExistsShip("name=Twilight Sparkle","name=Luna"),
	"Core.Goal.HehPeasants": PlayPonies("race=alicorn", 3),
	"Core.Goal.HelpImTrappedInAShippingCardGame": ExistsShip("name=Cheerilee","*"),
	"Core.Goal.HoldOnINeedToMakeAFlowChart": Nope,
	"Core.Goal.HostileTakeover": ExistsPony("Changeling in keywords", 3),
	"Core.Goal.HotForTeacher": ExistsShip("name=Twilight Sparkle","name=Celestia"),
	"Core.Goal.IGuessYoullDo": ExistsShip("name=Twilight Sparkle","name=Cheerilee"),
	"Core.Goal.ISwearImNotGay": ExistsPonyShippedTo("gender=male", Select("gender=male",3)),
	"Core.Goal.InvasiveSpecies": ExistsShip("race=earth","race=earth",6),
	"Core.Goal.ItsMagicalHornsAreTouching": ExistsShip("race=unicorn || race=alicorn","race=unicorn || race=alicorn",3),
	"Core.Goal.ItsNotCreepy": ExistsShip("name=Twilight Sparkle","name=Shining Armor"),
	"Core.Goal.ItsNotEvil": BreakShip("name=Shining Armor","gender=female && name != Twilight Sparkle"),
	"Core.Goal.ItsNotExactlyCheating": ExistsPonyShippedTo("*", ShippedWith2Versions),
	"Core.Goal.JustExperimenting": ExistsPonyShippedTo("name=Rainbow Dash", Select("gender=female",3)),
	"Core.Goal.MyFirstSlash": ExistsShip("name=Shining Armor","gender=male"),
	"Core.Goal.NeedsMoreLesbians": PlayShips("gender=female","gender=female", 3),
	"Core.Goal.Paradox": ExistsShip("name=Pinkie Pie","name=Pinkie Pie"),
	"Core.Goal.Pomf": ExistsShip("race=pegasus || race=alicorn","race=pegasus || race=alicorn",3),
	"Core.Goal.PrettyPrettyPrincess": ExistsPony("name=Twilight Sparkle && race=alicorn"),
	"Core.Goal.PrincessPile": ExistsChain("Princess in keywords", 3),
	"Core.Goal.QueenPlatinumsCourt": PlayPonies("race=unicorn", 3),
	"Core.Goal.Quite": PlayShips("gender=male","gender=male", 3),
	"Core.Goal.RainbowDashFanClub": ExistsShip("name=Rainbow Dash","name=Rainbow Dash"),
	"Core.Goal.Rodeo": ExistsShip("name=Applejack","name=Applejack"),
	"Core.Goal.Sadfic": BreakShip("name=Twilight Sparkle","*"),
	"Core.Goal.SelfInsertion": ExistsChain("name=Twilight Sparkle",3),
	"Core.Goal.ShiningArmorApprovesofThisExperiment": ExistsShip("name=Cadance","gender=female"),
	"Core.Goal.Shipwrecker": BreakShip("*","*",12),
	"Core.Goal.TheQuietGame": ExistsShip("name=Fluttershy","name=Fluttershy"),
	"Core.Goal.TimeTravelersAmongUs": ExistsPony("altTimeline=true", 5),
	"Core.Goal.WellMaybe": ExistsShip("name=Twilight Sparkle","name=Zecora"),
}
	
export default goalCriteria;