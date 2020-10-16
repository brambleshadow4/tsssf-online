export function isPony(card)
{
	return card.indexOf(".Pony.") >= 0;
}
export function isShip(card)
{
	return card.indexOf(".Ship.") >= 0;
}

export function isGoal(card)
{
	return card.indexOf(".Goal.") >= 0;
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