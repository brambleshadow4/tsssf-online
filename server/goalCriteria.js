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


	if(selector.indexOf("=") > -1)
	{
		var [prop, value] = selector.split("=");
		prop = prop.trim();
		value = value.trim();

		if(value == "true")
			value = true;
		if(value == "false")
			value = false;

		console.log(`getCardProp(model, ${card}, ${prop}) = ${getCardProp(model, card, prop)}`)
		return getCardProp(model, card, prop) == value;
	}

	if(selector.indexOf(" in ") > -1)
	{
		var [value, prop] = selector.split(" in ");

		prop = prop.trim();
		value = value.trim();

		console.log(`getCardProp(model, ${card}, ${prop}) = ${getCardProp(model, card, prop)}`)

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
				console.log("checking card " + model.board[key].card);
				if(doesCardMatchSelector(model, model.board[key].card, selector))
				{
					boardCount++;
				}
			}
		}

		console.log(selector + " count " + boardCount);
		return boardCount >= count;
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

function checkTwoSelectors(selector1, selector2)
{
	return function(model, card1, card2)
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

	
}

function ExistsShip(selector1, selector2, count)
{
	return ExistsShipGeneric(checkTwoSelectors(selector1, selector2), count)
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
	"Core.Goal.ChancellorPuddingheadsEntourage": Nope,
	"Core.Goal.CharityAuction": Nope,
	"Core.Goal.CommanderHurricanesArmy": Nope,
	"Core.Goal.DeepCover": ExistsShip("Changeling in keywords","Changeling in keywords"),
	"Core.Goal.Epidemic": Nope,
	"Core.Goal.Fabulosity": ExistsShip("name=Rarity","name=Rarity"),
	"Core.Goal.FriendshipIsBenefits": Nope,
	"Core.Goal.GoForthAndMultiply": Nope,
	"Core.Goal.GoodEnough": ExistsShip("name=Twilight Sparkle","name=Luna"),
	"Core.Goal.HehPeasants": Nope,
	"Core.Goal.HelpImTrappedInAShippingCardGame": ExistsShip("name=Cheerilee","*"),
	"Core.Goal.HoldOnINeedToMakeAFlowChart": Nope,
	"Core.Goal.HostileTakeover": ExistsPony("Changeling in keywords", 3),
	"Core.Goal.HotForTeacher": ExistsShip("name=Twilight Sparkle","name=Celestia"),
	"Core.Goal.IGuessYoullDo": ExistsShip("name=Twilight Sparkle","name=Cheerilee"),
	"Core.Goal.ISwearImNotGay": Nope,
	"Core.Goal.InvasiveSpecies": ExistsShip("race=earth","race=earth",6),
	"Core.Goal.ItsMagicalHornsAreTouching": ExistsShip("race=unicorn || race=alicorn","race=unicorn || race=alicorn",3),
	"Core.Goal.ItsNotCreepy": ExistsShip("name=Twilight Sparkle","name=Shining Armor"),
	"Core.Goal.ItsNotEvil": Nope,
	"Core.Goal.ItsNotExactlyCheating": Nope,
	"Core.Goal.JustExperimenting": Nope,
	"Core.Goal.MyFirstSlash": ExistsShip("name=Shining Armor","gender=male"),
	"Core.Goal.NeedsMoreLesbians": Nope,
	"Core.Goal.Paradox": ExistsShip("name=Pinkie Pie","name=Pinkie Pie"),
	"Core.Goal.Pomf": ExistsShip("race=pegasus || race=alicorn","race=pegasus || race=alicorn",3),
	"Core.Goal.PrettyPrettyPrincess": ExistsPony("name=Twilight Sparkle && race=alicorn"),
	"Core.Goal.PrincessPile": Nope,
	"Core.Goal.QueenPlatinum'sCourt": Nope,
	"Core.Goal.Quite": Nope,
	"Core.Goal.RainbowDashFanClub": ExistsShip("name=Rainbow Dash","name=Rainbow Dash"),
	"Core.Goal.Rodeo": ExistsShip("name=Applejack","name=Applejack"),
	"Core.Goal.Sadfic": Nope,
	"Core.Goal.SelfInsertion": Nope,
	"Core.Goal.ShiningArmorApprovesofThisExperiment": ExistsShip("name=Cadance","gender=female"),
	"Core.Goal.Shipwrecker": Nope,
	"Core.Goal.TheQuietGame": ExistsShip("name=Fluttershy","name=Fluttershy"),
	"Core.Goal.TimeTravelersAmongUs": ExistsPony("altTimeline=true", 5),
	"Core.Goal.WellMaybe": ExistsShip("name=Twilight Sparkle","name=Zecora"),
}
	
export default goalCriteria;