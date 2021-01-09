import cards from "./cards.js";
import {isBlank} from "./lib.js";


var Nope = () => false;
var Yep = () => true;


function getCardProp(model, cardFull, prop)
{
	var [card, substate] = cardFull.split(":");
	var cardOverrides = model.turnstate.overrides[card];
	var baseCard = card;

	if(cardOverrides && cardOverrides.length)
	{
		if(substate && Number(substate) < cardOverrides.length)
		{
			cardOverrides = cardOverrides[Number(substate)];
		}
		else
		{
			cardOverrides = cardOverrides[cardOverrides.length-1];
		}

		baseCard = cardOverrides.disguise || card;
	}

	if(prop == "*")
		return cardOverrides;

	if(prop == "card")
		return card;


	if(prop == "keywords")
	{
		let baseKeywords = (cardOverrides && cardOverrides.keywords) || [];

		if(cardOverrides && cardOverrides.disguise)
			baseKeywords = baseKeywords.concat(cards[card].keywords);

		return new Set(cards[baseCard][prop].concat(baseKeywords));
	}

	if(cardOverrides && cardOverrides[prop])
	{
		return cardOverrides[prop]
	}

	return cards[baseCard][prop];
}

function doesCardMatchSelector(model, card, selector)
{
	let trueValue = 1;
	let falseValue = 0;
	if(getCardProp(model, card, "doublePony"))
		trueValue = 2;


	if(selector.trim() == "*")
		return trueValue;

	if(selector.trim() == "genderSwapped")
	{
		var originalGender = cards[card].gender;
		if(model.turnstate && model.turnstate.overrides && model.turnstate.overrides[card] && model.turnstate.overrides[card].disguise)
		{
			originalGender = cards[model.turnstate.overrides[card].disguise].gender
		}

		return (getCardProp(model, card,"gender") != originalGender ? trueValue : falseValue);
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
			return trueValue;

		if(prop == "race" && cardValue == "earth/unicorn")
			return (value == "earth" || value == "unicorn" ? trueValue : falseValue);

		return (cardValue != value ? trueValue : falseValue);
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

		//if(prop == "race")

		if(prop == "gender" && cardValue == "malefemale")
			return trueValue;
		
		if(prop == "race" && cardValue == "earth/unicorn")
			return (value == "earth" || value == "unicorn" ? trueValue : falseValue);
		//console.log(`getCardProp(model, ${card}, ${prop}) = ${getCardProp(model, card, prop)}`)
		return (getCardProp(model, card, prop) == value ? trueValue : falseValue);
	}

	if(selector.indexOf(" in ") > -1)
	{
		var [value, prop] = selector.split(" in ");

		prop = prop.trim();
		value = value.trim();

		//console.log(`getCardProp(model, ${card}, ${prop}) = ${getCardProp(model, card, prop)}`)


		return (getCardProp(model, card, prop).has(value) ? trueValue : falseValue);
	}

	return falseValue
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
			connected.push(model.board[ponyKey].card)
		}
	}	

	return connected;

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
				boardCount += doesCardMatchSelector(model, model.board[key].card, selector)
			}
		}

		//console.log(selector + " count " + boardCount);
		return boardCount >= count;
	}
}


function ExistsPonyGeneric(selectFun, count)
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
				boardCount += selectFun(model, model.board[key].card)
			}
		}

		//console.log(selector + " count " + boardCount);
		return boardCount >= count;
	}
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
				var thisKey = workList.shift();

				if(explored.has(thisKey))
					continue;

				explored.add(thisKey);

				if(!doesCardMatchSelector(model, model.board[thisKey].card, selector))
					continue;

				chained.add(thisKey);	


				var ponyKeys = getConnectedPonies(model, thisKey).map( x => model.cardLocations[x])
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

				var chainCount = ponyCards.map( x=> getCardProp(model, x, "doublePony") ? 2 : 1).reduce((a,b) => a + b, 0)

				if(chainCount >= count)
					return true;
			}
		}

		return  false;
	}
}

function Select(selector, count)
{
	return function(model, connectedPonies)
	{

		let centeredCount = 0;
		for(var card of connectedPonies)
		{
			centeredCount += doesCardMatchSelector(model, card, selector)
		}

		return centeredCount >= count;
	}
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

				if(groupSelectionFn(model, getConnectedPonies(model, key)))
					return true;	
			}
		}

		return  false;
	}
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


/************************** Custom Rules **************************/

function GainOCKeyword(model, card)
{
	if(model.turnstate && model.turnstate.overrides[card] 
		&& model.turnstate.overrides[card].keywords 
		&& model.turnstate.overrides[card].keywords.indexOf("OC") > -1)
	{

		if(getCardProp(model, card, "doublePony"))
			return 2;
		return 1;

	}

	return 0
}


function PlayLovePoisons(model)
{
	if(model.turnstate)
	{
		var matchingPlays = model.turnstate.playedShips.filter(function(x)
		{
			var [ship, pony1, pony2] = x;
			return cards[ship].action == "lovePoison";
		});

		return (matchingPlays.length >= 2);
	}

	return false;
}

function SwapCount(count)
{
	return function(model)
	{
		if(model.turnstate)
		{
			return model.turnstate.swapsNow >= count;
		}

		return false;
	}
}

function ShippedWithOppositeGenderedSelf(model, card1, card2)
{
	if(getCardProp(model, card1, "name") == getCardProp(model, card2, "name"))
	{
		var gender1 = getCardProp(model, card1, "gender");
		var gender2 = getCardProp(model, card2, "gender");

		return ((gender1 == "male" && gender2 == "female") || (gender1 == "female" && gender2 == "male"))
	}

	return false;
}

function ShippedWith2Versions(model, ponyCards)
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

	for(var card of ponyCards)
	{

		var match = ponyCards.filter(x => filterFun(card, x))

		if(match.length > 1)
			return true;
	}

	return false;
}

function AllOf(...selectors)
{
	return function(model, ponyCards)
	{
		for(var selector of selectors)
		{
			if(ponyCards.filter(x => doesCardMatchSelector(model, x, selector)).length == 0)
				return 0;
		}

		return 1;
	}
	
}


var goalCriteria = {

	"Core.Goal.BuddingCuriosity": ExistsShipGeneric(ShippedWithOppositeGenderedSelf),
	"Core.Goal.CargoShip": ExistsShip("Object in keywords","Object in keywords"),
	"Core.Goal.ChancellorPuddingheadsEntourage": PlayPonies("race=earth", 3),
	"Core.Goal.CharityAuction": ExistsShip("genderSwapped", "genderSwapped"),
	"Core.Goal.CommanderHurricanesArmy": PlayPonies("race=pegasus", 3),
	"Core.Goal.DeepCover": ExistsShip("Changeling in keywords","Changeling in keywords"),
	"Core.Goal.Epidemic": PlayLovePoisons,
	"Core.Goal.Fabulosity": ExistsShip("name=Rarity","name=Rarity"),
	"Core.Goal.FriendshipIsBenefits": ExistsChain("Mane 6 in keywords", 6),
	"Core.Goal.GoForthAndMultiply": PlayShips("gender=male","gender=female", 3),
	"Core.Goal.GoodEnough": ExistsShip("name=Twilight Sparkle","name=Luna"),
	"Core.Goal.HehPeasants": PlayPonies("race=alicorn", 3),
	"Core.Goal.HelpImTrappedInAShippingCardGame": ExistsShip("name=Cheerilee","*"),
	"Core.Goal.HoldOnINeedToMakeAFlowChart": SwapCount(6),
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


	"EC.Goal.FamilyAppreciationDay": ExistsChain("Apple in keywords",4),
	"EC.Goal.BigMacIsBigMackin": ExistsPonyShippedTo("name=Big Macintosh", Select("gender=female",3)),
	"EC.Goal.MyWaifu": ExistsShip("OC in keywords","Mane 6 in keywords"),
	"EC.Goal.BookClub": ExistsPonyShippedTo("name=Twilight Sparkle", Select("*",5)),
	"EC.Goal.EnjoyingTheScenery": ExistsPonyShippedTo("name=Rarity", Select("*",4)),
	"EC.Goal.IronPonyCompetition": ExistsPonyShippedTo("name=Rainbow Dash", Select("*",4)),
	"EC.Goal.CiderSqueezin": ExistsPonyShippedTo("name=Applejack", Select("*",4)),
	"EC.Goal.AintNoPartyLikeAPinkiePieParty": ExistsPonyShippedTo("name=Pinkie Pie", Select("*",4)),
	"EC.Goal.Recruitment": ExistsPonyShippedTo("name=Fluttershy", Select("*",4)),
	"EC.Goal.PlayingTheGame": ExistsPonyShippedTo("gender=male", Select("gender=female", 4)),
	"EC.Goal.IReallyLikeHerMane": BreakShip("name=Smarty Pants","*"),
	"EC.Goal.PickyPicky": Nope, // custom stat
	"EC.Goal.BewareTheGroove": BreakShip("Elder in keywords", "race=alicorn"),
	"EC.Goal.ABlessingOfAlicorns": ExistsPony("race=alicorn", 5),
	"EC.Goal.TheresNoThrillLikeIronWill": ExistsShip("name=Iron Will","Villain in keywords"),
	"EC.Goal.OfPoniesAndPerilTheMagnumOpus": ExistsChain("altTimeline=true",3),
	"EC.Goal.Swinging": ExistsPonyShippedTo("*", AllOf("name=Mr. Cake", "name=Mrs. Cake")),
	"EC.Goal.SpaDay": ExistsShip("Mane 6 in keywords", "name=Aloe & Lotus"),
	"EC.Goal.NoPoniesCanPonyTwoPoniesToPony": ExistsPonyShippedTo("*",Select("*",6)),
	"EC.Goal.EvilSocietyOfEvil": ExistsChain("Villain in keywords", 6),
	"EC.Goal.FluttershysHomeForRedeemedEvilDoers": ExistsPonyShippedTo("name=Fluttershy",Select("Villain in keywords",3)),
	"EC.Goal.Landslide": Nope, // custom stat
	"EC.Goal.FleetAdmiral": PlayShips("*","*",7),
	"EC.Goal.CoupDetat": Nope, // custom stat
	"EC.Goal.FriendsInHighPlaces": ExistsPonyShippedTo("OC in keywords", Select("Princess in keywords",2)),
	"EC.Goal.Recolor": ExistsPonyGeneric(GainOCKeyword, 1),


	"PU.Goal.Besties": ExistsShip("Uni in keywords", "Uni in keywords"),
	"PU.Goal.CutieMarkCourtship": ExistsShip("CMC in keywords", "CMC in keywords"),
	"PU.Goal.Internship": ExistsShip("Uni in keywords || PCC in keywords", "Villain in keywords"),
	"PU.Goal.RevengeOfTheNerds": ExistsShip("Uni in keywords || PCC in keywords", "Mane 6 in keywords"),
	"PU.Goal.SchoolwideFestivities": ExistsChain("Uni in keywords || PCC in keywords",6),
	"PU.Goal.WhereforeArtThouPoneo": ExistsShip("Uni in keywords","PCC in keywords"),


	"NoHoldsBarred.Goal.ThisShipIsDelicious": ExistsPonyShippedTo("name=Pinkie Pie", AllOf("name=Luna","name=Twilight Sparkle","name=Applejack")),
	"NoHoldsBarred.Goal.FromForeignLands": ExistsShip("Zebra in keywords || Batpony in keywords || Changeling in keywords|| Dragon in keywords",
		 "Zebra in keywords || Batpony in keywords || Changeling in keywords || Dragon in keywords"),
	"NoHoldsBarred.Goal.FateBreakers": ExistsShip("name=Logic Gate", "name=Flickering Oracle"),
	"NoHoldsBarred.Goal.DarkHorseDanceCard": PlayShips("OC in keywords", "OC in keywords", 2),
	"NoHoldsBarred.Goal.OMiGoshBugHug": ExistsShip("name=Starlit Dreams","card=Core.Start.FanficAuthorTwilight"),
	"NoHoldsBarred.Goal.AfterThisWellNeedRehab": ExistsShip("#horsefamous in keywords","#horsefamous in keywords"),
	"NoHoldsBarred.Goal.WhyIsEveryThingGlowing": ExistsPonyShippedTo("*", Select("OC in keywords", 4))

}
	
export default goalCriteria;