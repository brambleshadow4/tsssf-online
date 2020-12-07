

export function isPony(card)
{
	return card.indexOf(".Pony.") >= 0 || card == "anon:pony";
}
export function isShip(card)
{
	return card.indexOf(".Ship.") >= 0 || card == "anon:ship";
}

export function isGoal(card)
{
	return card.indexOf(".Goal.") >= 0;
}


export function isPonyOrStart(card)
{
	return card.indexOf(".Pony.") >= 0 || card.indexOf(".Start.") >= 0;
}

export function isBlank(card)
{
	return card.startsWith("blank:");
}

export function isAnon(card)
{
	return card.startsWith("anon:");
}



export function randomizeOrder(arr)
{
	var len = arr.length;

	for(var i=0; i<len; i++)
	{
		var k = Math.floor(Math.random() * len);

		var swap = arr[i];
		arr[i] = arr[k];
		arr[k] = swap;
	}

	return arr;
}


export function isBoardLoc(location)
{
	return location.startsWith("p,") || location.startsWith("sr,") || location.startsWith("sd,");
}

export function isOffsetLoc(location)
{
	return location.startsWith("offset,");
}

export function isGoalLoc(location)
{
	return location.startsWith("goal,");
}

export function isPlayerLoc(location)
{
	return location.startsWith("player,");
}

export function isDiscardLoc(location)
{
	return location.startsWith("shipDiscardPile,") || 
		location.startsWith("ponyDiscardPile,") || 
		location.startsWith('goalDiscardPile,')
}


export function isCardIncluded(card, model)
{
	if(isPonyOrStart(card) && !isPony(card))
	{
		return card == model.startCard;
	}

	for(var rule of model.cardDecks)
	{
		if(card == rule)
			return true;

		var i = rule.indexOf("*");

		if(i != -1 && card.startsWith(rule.substring(0,i)))
		{
			return true
		}
	}

	return false;
}