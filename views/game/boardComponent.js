import {
	isPony, 
	isGoal, 
	isShip, 
	isGoalLoc, 
	isBoardLoc,
	isOffsetLoc,
	isPlayerLoc,
	isDiscardLoc,
	isBlank,
	isAnon,
	isPonyOrStart
} from "/lib.js";

import
{
	makeCardElement,
} from "/game/cardComponent.js";



var draggingBoard = false;


var x;
var y;

const gridWidth = 22;


export function initBoard()
{
	var playingArea = document.getElementById('playingArea');


	playingArea.onmousedown = function(e)
	{
		draggingBoard = true;
		x = e.clientX;
		y = e.clientY;
	};

	playingArea.onmouseup = function(e)
	{
		draggingBoard = false;
	}

	playingArea.onmousemove = function(e)
	{
		if(draggingBoard)
		{
			var difX = x - e.clientX;
			var difY = y - e.clientY;
			x = e.clientX;
			y = e.clientY;

			var refPoint = document.getElementById('refPoint');
			if(!refPoint)
				return;

			var curX = Number(refPoint.style.left.substring(0, refPoint.style.left.length-2));
			var curY = Number(refPoint.style.top.substring(0, refPoint.style.top.length-2));

			refPoint.style.left = curX - difX + "px"
			refPoint.style.top = curY - difY + "px"
		}
	}

	var zoomScale = 1;

	window.moveToStartCard = function()
	{
		console.log("moving to start card");

		var refPoint = document.getElementById('refPoint')
		if(!refPoint)
			return;

		refPoint.style.transform = "scale(1,1)";
		zoomScale = 1;

		var loc = cardLocations["Core.Start.FanficAuthorTwilight"];

		var [_, x, y] = loc.split(",");

		
		x = Number(x);
		y = Number(y);

		const vh = window.innerHeight/100;

		x = x * gridWidth * vh;
		y = y * gridWidth * vh;

		x *= -1;
		y *= -1;

		var playingArea = document.getElementById('playingArea');


		console.log(playingArea.clientWidth + "," + playingArea.clientHeight);

		y += playingArea.clientHeight/2 - 18/2*vh;
		x += playingArea.clientWidth/2 - 13/2*vh;

		refPoint.style.left = x + "px";
		refPoint.style.top = y + "px";
	}

	var instances = 60;
	var lastDims = "";
	function moveToStartCardListener()
	{
		var newDims = playingArea.clientWidth + "," + playingArea.clientHeight;

		if(newDims != lastDims)
		{
			moveToStartCard();
			instances = 60;
			lastDims = newDims
		}
		else 
			instances--;

		if(instances)
			requestAnimationFrame(moveToStartCardListener)
	}

	moveToStartCardListener();


	playingArea.onwheel = function(e)
	{
		e.preventDefault();

		var refPoint = document.getElementById('refPoint');
		var playingArea = document.getElementById('playingArea');

		var curX = Number(refPoint.style.left.substring(0, refPoint.style.left.length-2));
		var curY = Number(refPoint.style.top.substring(0, refPoint.style.top.length-2));

		curX -= playingArea.clientWidth/2;
		curY -= playingArea.clientHeight/2;

		curX /= zoomScale;
		curY /= zoomScale;

		if(Math.sign(e.deltaY) > 0)
		{
			zoomScale = Math.max(zoomScale-.1, .2);

			refPoint.style.transform = "scale(" + zoomScale + ", " + zoomScale  + ")";
		}

		if(Math.sign(e.deltaY) < 0)
		{
			zoomScale = Math.min(zoomScale+.1, 2);

			refPoint.style.transform = "scale(" + zoomScale + ", " + zoomScale  + ")";
		}

		curX *= zoomScale;
		curY *= zoomScale;

		curX += playingArea.clientWidth/2;
		curY += playingArea.clientHeight/2;

		refPoint.style.left = curX + "px";
		refPoint.style.top = curY + "px";
	};
}

function addCardToBoard(key, card)
{
	var pieces = key.split(",");
	var x = Number(pieces[1]);
	var y = Number(pieces[2]);

	var imgElement = makeCardElement(card, key, !isBlank(card), true);

	//if(isPony(card) || isShip(card))
	//	addTrashHandlers(card, imgElement, key);

	var refPoint = document.getElementById('refPoint');

	
	switch(pieces[0])
	{
		case "p":
			imgElement.style.top = y * gridWidth + "vh";
			imgElement.style.left = x * gridWidth + "vh";
			break;
		case "sr":
			imgElement.classList.add('sideways');
			imgElement.style.top = y * gridWidth + "vh";
			imgElement.style.left = x * gridWidth + 22/2 + "vh";
			break;
		case "sd":
			imgElement.style.top = y * gridWidth + 22/2 + "vh";
			imgElement.style.left = x * gridWidth + "vh";
			break;
	}
	
	refPoint.appendChild(imgElement);

	if(!model.board[key])
	{
		model.board[key] = {card: card};
	}
	model.board[key].element = imgElement;
}


export function offsetPonyCard(key, card)
{
	var pieces = key.split(",");
	var x = Number(pieces[1]);
	var y = Number(pieces[2]);

	
	var location = `offset,${x},${y}`;
	var imgElement = makeCardElement(card, location, true);

	model.offsets[card + "," + x + "," + y] = imgElement;

	cardLocations[card] = "offset," + x + "," + y;


	var refPoint = document.getElementById('refPoint');

	
	const gridWidth = 22;

	imgElement.style.top = y * gridWidth + 2 + "vh";
	imgElement.style.left = x * gridWidth + 2 + "vh";

	imgElement.style.zIndex = 3;

	refPoint.appendChild(imgElement);
}


function getNeighborKeys(key)
{
	var type, x,y;
	[type,x,y] = key.split(",");
	x = Number(x);
	y = Number(y)

	if(type == "p")
	{
		return [
			"sr," + x + "," + y,
			"sr," + (x-1) + "," + y,
			"sd," + x + "," + y,
			"sd," + x + "," + (y-1)
		];
	}

	if(type == "sr")
	{
		return [
			"p," + x + "," + y,
			"p," + (x+1) + "," + y,
		]
	}

	if(type == "sd")
	{
		return [
			"p," + x + "," + y,
			"p," + x + "," + (y+1),
		]
	}
}


export function removeCardFromBoard(key)
{
	if(model.board[key])
	{
		var el = model.board[key].element;

		if(el && !el.parentNode)
		{
			alert("something really weird happened");
			throw Error("something really weird happened")
		}

		if(el) // how tf does el not have a parent node???
			el.parentNode.removeChild(el);
		delete model.board[key];
	}
}

export function removeCardElementFromBoard(key)
{
	if(model.board[key])
	{
		var el = model.board[key].element;
		if(el && el.parentNode)
		{
			el.parentNode.removeChild(el);

		}
		delete model.board[key].element;

		if(isBlank(model.board[key].card))
			delete model.board[key];
	}
}

export function updateBoard(hardReset)
{

	if(hardReset)
	{
		for(var key in model.board)
		{
			removeCardElementFromBoard(key);
		}
	}

	var refPoint = document.getElementById('refPoint');

	var baseDist = window.innerHeight/100;

	var cardLong = 18*baseDist;
	var cardShort = 13*baseDist;

	if(!refPoint)
	{
		var parent = document.getElementById('playingArea')
		refPoint = document.createElement('div');
		refPoint.id = "refPoint";
		refPoint.style.position = 'absolute';
		refPoint.style.top = parent.clientHeight/2 - cardLong/2+ "px";
		refPoint.style.left = parent.clientWidth/2 - cardShort/2 + "px";

		parent.appendChild(refPoint);
	}


	var gridDist = 30*baseDist;

	for(var key in model.board)
	{
		var type, x,y;
		[type,x,y] = key.split(",");
		x = Number(x);
		y = Number(y);

		var card = model.board[key].card;
		cardLocations[card] = key;


		// remove detached blanks
		if(isBlank(card))
		{
			var neighbors = getNeighborKeys(key);
			var cardHasValidNeighbor = false;
			for(var key2 of neighbors)
			{

				if(model.board[key2]
					&& model.board[key2].card 
					&& !isBlank(model.board[key2].card) 
				)
				{
					cardHasValidNeighbor = true;
					break;;
				}
			}

			if(cardHasValidNeighbor)
				continue;
			// all cards next to this blank are blank; remove it.


			removeCardFromBoard(key);
		
			continue;
		}

		// add missing cards
		if(!model.board[key].element)
		{
			addCardToBoard(key, card);
		}

		var neighbors = getNeighborKeys(key);
		var blankType = type == "p" ? "blank:ship" : "blank:pony";

		// add missing blanks
		for(var key of neighbors)
		{
			if(!model.board[key])
			{
				addCardToBoard(key, blankType);
			}
		}
	}

	for (var key in model.offsets)
	{
		if(model.offsets[key] === "")
		{
			var [card, _, _] = key.split(",");
			offsetPonyCard(key, card) // key technically should be p,x,y, but is okay here
		}
	}
}
