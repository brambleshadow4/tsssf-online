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
	isPonyOrStart,
	getNeighborKeys,
	GameOptions,
	Location,
	Card,
	CardElement
} from "../../model/lib.js";

import GameModel from "../../model/GameModel.js";

import
{
	makeCardElement,
	endMoveShared
} from "./cardComponent.js";


var draggingBoard = false;


var x: number;
var y: number;
var dist: number;
var refPoint: HTMLElement;

const gridWidth = 22;

let win = window as unknown as {
	moveToStartCard: Function,
	model: GameModel,
	gameOptions: GameOptions
}


export async function initBoard()
{
	var playingArea = document.getElementById('playingArea')!;
	refPoint =  document.getElementById('refPoint')!;

	playingArea.ontouchstart = function(e)
	{
		//endMoveShared();

		if(e.touches.length == 1)
		{
			draggingBoard = true;
			x = e.touches[0].clientX;
			y = e.touches[0].clientY;
		}

		if (e.touches.length == 2)
		{
			draggingBoard = true;

			var dx = e.touches[0].clientX - e.touches[1].clientX;
			var dy = e.touches[0].clientY - e.touches[1].clientY;
			dist = Math.sqrt(dx*dx + dy*dy);
			x = (e.touches[0].clientX + e.touches[1].clientX)/2
			y = (e.touches[0].clientY + e.touches[1].clientY)/2
		}
	}

	playingArea.ontouchend = function(e)
	{
		draggingBoard = false;
	}

	playingArea.ontouchmove = function(e)
	{
		e.preventDefault();

		if(e.touches.length == 1 && draggingBoard)
		{
			updateBoardPos(e.touches[0].clientX, e.touches[0].clientY);
		}
		if(e.touches.length == 2 && draggingBoard)
		{
			updateBoardPos((e.touches[0].clientX + e.touches[1].clientX)/2, (e.touches[0].clientY + e.touches[1].clientY)/2);

			var dx = e.touches[0].clientX - e.touches[1].clientX;
			var dy = e.touches[0].clientY - e.touches[1].clientY;
			var newDist = Math.sqrt(dx*dx + dy*dy);

			zoomScale *= newDist/dist;
			zoomScale = Math.max(zoomScale, .2);
			zoomScale = Math.min(zoomScale, 2);
			refPoint.style.transform = "scale(" + zoomScale + ", " + zoomScale  + ")";


			dist = newDist;
		}
	}


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

	function updateBoardPos(newX: number, newY: number)
	{
		var difX = x - newX;
		var difY = y - newY;
		x = newX
		y = newY

		if(!refPoint)
			return;

		var curX = Number(refPoint.style.left.substring(0, refPoint.style.left.length-2));
		var curY = Number(refPoint.style.top.substring(0, refPoint.style.top.length-2));

		refPoint.style.left = curX - difX + "px";
		refPoint.style.top = curY - difY + "px";
	}

	playingArea.onmousemove = function(e)
	{
		if(draggingBoard)
		{
			updateBoardPos(e.clientX, e.clientY)
		}
	}

	var zoomScale = 1;

	win.moveToStartCard = function()
	{
		let refPoint = document.getElementById('refPoint');
		if(!refPoint)
			return;
		
		refPoint.style.transform = "scale(1,1)";
		zoomScale = 1;

		var loc = win.model.cardLocations[win.gameOptions.startCard];

		var [_, xs, ys] = loc.split(",");

		
		let x = Number(xs);
		let y = Number(ys);

		const vh = window.innerHeight/100;

		x = x * gridWidth * vh;
		y = y * gridWidth * vh;

		x *= -1;
		y *= -1;

		var playingArea = document.getElementById('playingArea')!;


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
			win.moveToStartCard();
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

		var playingArea = document.getElementById('playingArea')!;

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

function addCardToBoard(key: Location, card: Card)
{
	var pieces = key.split(",");
	var x = Number(pieces[1]);
	var y = Number(pieces[2]);

	var imgElement = makeCardElement(card, key, !isBlank(card), true);

	if(win.model.turnstate && win.model.turnstate.playedThisTurn.has(card))
		imgElement.classList.add('justPlayed');

	//if(isPony(card) || isShip(card))
	//	addTrashHandlers(card, imgElement, key);

	switch(pieces[0])
	{
		case "p":
			imgElement.style.top = y * gridWidth + "vh";
			imgElement.style.left = x * gridWidth + "vh";
			break;
		case "sr":
			imgElement.classList.add('shippos');
			imgElement.classList.add('sideways');
			imgElement.style.top = y * gridWidth + "vh";
			imgElement.style.left = x * gridWidth + 22/2 + "vh";
			break;
		case "sd":
			imgElement.classList.add('shippos');
			imgElement.style.top = y * gridWidth + 22/2 + "vh";
			imgElement.style.left = x * gridWidth + "vh";
			break;
		case "offset":
			imgElement.style.top = y * gridWidth + 2 + "vh";
			imgElement.style.left = x * gridWidth + 2 + "vh";
			imgElement.style.zIndex = "3";
	}
	
	refPoint.appendChild(imgElement);

	if(!win.model.board[key])
	{
		win.model.board[key] = {card: card};
	}
	win.model.board[key].element = imgElement;
}



export function removeCardFromBoard(key: Location)
{
	let model = win.model;
	if(win.model.board[key])
	{
		var el = win.model.board[key].element;

		if(el && !el.parentNode)
		{
			alert("something really weird happened");
			throw Error("something really weird happened")
		}

		if(el && el.parentNode)
			el.parentNode.removeChild(el);
		delete model.board[key];
	}
}

export function removeCardElementFromBoard(key: Location)
{
	let model = win.model;
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


export function clearBoard()
{
	for(var key in win.model.board)
	{
		removeCardElementFromBoard(key);
	}
}

export function updateBoard()
{
	var baseDist = window.innerHeight/100;

	var cardLong = 18*baseDist;
	var cardShort = 13*baseDist;

	if(!refPoint)
	{
		var parent = document.getElementById('playingArea')!;
		refPoint = document.createElement('div');
		refPoint.id = "refPoint";
		refPoint.style.position = 'absolute';
		refPoint.style.top = parent.clientHeight/2 - cardLong/2+ "px";
		refPoint.style.left = parent.clientWidth/2 - cardShort/2 + "px";

		parent.appendChild(refPoint);
	}


	var gridDist = 30*baseDist;
	let model = win.model;
	for(var key in model.board)
	{
		var type, x,y;
		[type,x,y] = key.split(",");
		x = Number(x);
		y = Number(y);

		var card = model.board[key].card;
		model.cardLocations[card] = key;


		if(isOffsetLoc(key))
		{
			if(!model.board[key].element)
			{
				addCardToBoard(key, card)
			}

			continue;
		}

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
}
