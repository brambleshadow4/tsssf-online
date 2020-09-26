/**

	Model

	{
		board: {
			"<x>,<y>": {
				
			}
		}
	}

*/

var isDkeyPressed = false;
var isShiftPressed = false;
var model;
var serverModel;
var offsetId = 0;

var hoverCard = "";
var hoverCardDiv;



var draggingBoard = false;

(function (){

	var x;
	var y;

	draggingBoard= false;

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

			var curX = Number(refPoint.style.left.substring(0, refPoint.style.left.length-2));
			var curY = Number(refPoint.style.top.substring(0, refPoint.style.top.length-2));

			refPoint.style.left = curX - difX + "px"
			refPoint.style.top = curY - difY + "px"

		}
	}

	var zoomScale = 1;

	window.addEventListener('keydown', function(e){

		if(e.key == "D" || e.key == "d")
		{
			isDkeyPressed = true;
		}

		if(e.key == "Shift")
		{
			isShiftPressed = true;
			if(hoverCard.length)
				enlargeCard();
		}
	});

	window.addEventListener('keyup', function(e){

		if(e.key == "D" || e.key == "d")
		{
			isDkeyPressed = false;
		}

		if(e.key == "Shift")
		{
			isShiftPressed = false;
			unenlargeCard();
		}
	});


	playingArea.onwheel = function(e)
	{
		e.preventDefault();

		//console.log(e);

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

	document.getElementById("ponyDrawPile").onclick = drawPonyCard;
	document.getElementById("shipDrawPile").onclick = drawShipCard;

	var shuffles = ["pony","ship","goal"];

	for(let key of shuffles)
	{
		let id = key+"Shuffle";

		document.getElementById(id).onclick = function()
		{
			var discards = model[key+"DiscardPile"];
			model[key+"DiscardPile"] = model[key+"DrawPile"];
			model[key+"DrawPile"] = discards;

			randomizeOrder(model[key+"DrawPile"]);

			var discardElement = document.getElementById(key+"DiscardPile");

			if(model[key+"DiscardPile"].length)
			{
				var card = model[key+"DiscardPile"][model[key+"DiscardPile"].length-1];

				setCardBackground(discardElement, card);
			}
			else
			{
				setCardBackground(discardElement, "blank:" + key);
			}
			

			var drawElement = document.getElementById(key+"DrawPile");
			if(model[key+"DrawPile"].length)
			{
				drawElement.classList.remove('blank')
			}
			else
			{

				drawElement.classList.add('blank');
			}
		}
	}

	var hand = document.getElementById('hand')
	hand.ondragover = function(e)
	{
		var data = e.dataTransfer.getData("text").split(";")
		var draggedCard = data[0];
		var location = data[1];

		if(location != "hand" && (isPony(draggedCard) || isShip(draggedCard)))
		{
			e.preventDefault();
		}
	}


	var inDragZone = false;
	hand.ondragenter = function(e)
	{
		var data = e.dataTransfer.getData("text").split(";")
		var draggedCard = data[0];
		var location = data[1];
		if(location != "hand" && (isPony(draggedCard) || isShip(draggedCard)))
		{
			if(!document.getElementById('handDropzone'))
			{
				var div = document.createElement('div');
				div.id="handDropzone";
				div.style.position = "absolute";
				div.style.top = "0px"
				div.style.bottom = "0px";
				div.style.left = "0px";
				div.style.right = "0px";
				div.style.zIndex = "3";
				div.style.backgroundColor = "rgba(0,128,0,.5)";

				div.ondragleave = function(e)
				{
					var div = document.getElementById('handDropzone');
					if(div)
						div.parentNode.removeChild(div);
				}

				div.ondrop = function(e)
				{
					e.preventDefault();
					div.parentNode.removeChild(div);

					moveCard(e.dataTransfer.getData("text"), "hand");
				}

				hand.appendChild(div);
			}
			
		}
	}


})();



function LoadCards()
{
	for(var key in cards)
	{
		var nodes = key.split(".");
		nodes.pop();
		var urlToImg = "../img/" + nodes.join("/") + "/" + cards[key].url;

		cards[key].fullUrl = urlToImg;
	}
}


LoadCards();
LoadGame();

function randomizeOrder(arr)
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


function animateCardMove(card, startdiv, endlocation)
{
	var floatCard = makeCardElement(card);
	var rect = startdiv.getBoundingClientRect();

	floatCard.style.margin = "0px";
	floatCard.style.position = "absolute";
	floatCard.style.top = rect.top + "px"
	floatCard.style.left = rect.left + "px";
	floatCard.style.zIndex = 4;
	floatCard.style.transition = "top .5s, left .5s";
	floatCard.style.transitionTimingFunction = "linear";

	document.body.appendChild(floatCard);
	var enddiv;

	if(endlocation == "hand")
	{
		vh = window.innerHeight / 100;

		if(isPony(card))
		{
			enddiv = document.getElementById('hand-pony');
			rect = enddiv.getBoundingClientRect();
			floatCard.style.top = (rect.top-vh) + "px";
			floatCard.style.left = (rect.right-vh) + "px";
		}

		else
		{
			enddiv = document.getElementById('hand-ship');
			rect = enddiv.getBoundingClientRect();
			floatCard.style.top = (rect.top-vh) + "px";
			floatCard.style.left = (rect.right-vh) + "px";
		}
		
	}

	else if(endlocation == "ponyDiscardPile")
	{
		enddiv = document.getElementById('ponyDiscardPile');
		rect = enddiv.getBoundingClientRect();
		floatCard.style.top = rect.top + "px";
		floatCard.style.left = rect.left + "px";
	}
	else if(endlocation == "shipDiscardPile")
	{
		enddiv = document.getElementById('shipDiscardPile');
		rect = enddiv.getBoundingClientRect();
		floatCard.style.top = rect.top + "px";
		floatCard.style.left = rect.left + "px";
	}
	else
	{
		throw Error("Unsupport location: " + endlocation)
	}

	setTimeout(function(){

		if(endlocation == "hand")
		{
			model.hand.push(card);
			updateHand();
		}
		else if(endlocation == "shipDiscardPile")
		{
			model.shipDiscardPile.push(card);

			var element= document.getElementById('shipDiscardPile');

			updateCardElement(element, card, "shipDiscardPile", true, false);
		}
		else if(endlocation == "ponyDiscardPile")
		{
			model.ponyDiscardPile.push(card);

			var element= document.getElementById('ponyDiscardPile')
			updateCardElement(element, card, "ponyDiscardPile", true, false);
		}

		floatCard.parentNode.removeChild(floatCard);
		enddiv.style.visibility = "visible";
	}, 500);


}

function drawPonyCard()
{
	if(model.ponyDrawPile.length)
	{

		var element = document.getElementById("ponyDrawPile");
		var card = model.ponyDrawPile.pop();

		if(model.ponyDrawPile.length == 0)
			setCardBackground(element, "blank:pony");

		animateCardMove(card, element, "hand");
	}
}

function drawShipCard()
{
	if(model.shipDrawPile.length)
	{	
		var element = document.getElementById("shipDrawPile");
		var card = model.shipDrawPile.pop();

		if(model.shipDrawPile.length == 0)
			setCardBackground(element, "blank:pony");

		animateCardMove(card, element, "hand");
	}
}

function LoadGame()
{

	model = {
		board:{
			"p,0,0":{
				card: "Core.Start.FanficAuthorTwilight"
			}
		},
		hand:[],
		currentGoals:[],
	};

	model.goalDrawPile = [];
	model.ponyDrawPile = [];
	model.shipDrawPile = [];

	model.goalDiscardPile = [];
	model.ponyDiscardPile = [];
	model.shipDiscardPile = [];

	for(var key in cards)
	{
		if(key.indexOf(".Goal.") > -1)
		{
			model.goalDrawPile.push(key);
		}
		else if(key.indexOf(".Pony.") > -1)
		{	
			model.ponyDrawPile.push(key)
		}
		else if(key.indexOf(".Ship.") > -1)
		{
			model.shipDrawPile.push(key);
		}
	}

	randomizeOrder(model.goalDrawPile);
	randomizeOrder(model.ponyDrawPile);
	randomizeOrder(model.shipDrawPile);

	
	model.currentGoals.push(model.goalDrawPile.pop());
	model.currentGoals.push(model.goalDrawPile.pop());
	model.currentGoals.push(model.goalDrawPile.pop());

	model.hand.push(model.ponyDrawPile.pop());
	model.hand.push(model.ponyDrawPile.pop());
	model.hand.push(model.ponyDrawPile.pop());
	model.hand.push(model.ponyDrawPile.pop());

	model.hand.push(model.shipDrawPile.pop());
	model.hand.push(model.shipDrawPile.pop());
	model.hand.push(model.shipDrawPile.pop());
	
	//await model from server

	updateHand();
	updateGoals();
	updateBoard();
}

// dragHandler is responsible for removing a card from its old location
// dropHandler is responsible for adding a card to its new location.

function updateCardElement(oldElement, card, location, isDraggable, isDropTarget)
{
	var div = makeCardElement(card, location, isDraggable, isDropTarget);
	div.id = oldElement.id;
	oldElement.parentNode.replaceChild(div, oldElement);
}


function makeCardElement(card, location, isDraggable, isDropTarget)
{
	var imgElement = document.createElement('div');
	imgElement.classList.add("card");

	setCardBackground(imgElement, card);

	imgElement.onclick = function()
	{	
		if(isDkeyPressed)
		{
			if(["ponyDiscardPile","shipDiscardPile","goalDiscardPile"].indexOf(location) > -1)
				return;

			if(isPony(card))
			{	
				animateCardMove(card, imgElement, "ponyDiscardPile");
			}
			else if(isShip(card))
			{	
				animateCardMove(card, imgElement, "shipDiscardPile");
			}
			else
			{
				return;
			}

			if(isBoardLoc(location))
			{
				imgElement.parentNode.removeChild(imgElement);
				delete model.board[location];
				updateBoard();
			}
			if(isOffsetLoc(location))
			{
				imgElement.parentNode.removeChild(imgElement);
			}
			if(location == "hand")
			{
				var i = model.hand.indexOf(card);
				model.hand.splice(i, 1);
				updateHand();
			}
		}
		
	}

	if(isDraggable)
	{
		imgElement.draggable = true;

		imgElement.style.cursor = "grab";

		var ghostCard;
		var ghostCardDragHandler;
		var ghostCardDragEndHandler;

		imgElement.ondragstart = function(e)
		{
			if(isDkeyPressed){
				e.preventDefault();
				return;

			}

			//e.preventDefault();
			draggingBoard = false;
			e.dataTransfer.setData("text", card + ";" + location);

			var img = document.createElement('span')
			e.dataTransfer.setDragImage(img, 0, 0);

			if(isPony(card))
			{
				document.getElementById('playingArea').classList.add('draggingPony');
			}

			if(isShip(card))
			{
				document.getElementById('playingArea').classList.add('draggingShip');
			}



			var ghostCard = makeCardElement(card);
			ghostCard.style.opacity = ".5";
			ghostCard.style.position = "absolute";
			ghostCard.style.top = e.pageY + "px";
			ghostCard.style.left = e.pageX + "px"
			

			ghostCardDragHandler = function(e)
			{
				ghostCard.style.top = e.pageY + "px";
				ghostCard.style.left = e.pageX + "px"
			};

			ghostCardDragEndHandler = function(e)
			{

				window.removeEventListener("dragover", ghostCardDragHandler)
				window.removeEventListener("dragend", ghostCardDragEndHandler);
				window.removeEventListener("drop", ghostCardDragEndHandler);

				if(ghostCard)
					ghostCard.parentNode.removeChild(ghostCard);

				var playingArea = document.getElementById('playingArea');
				playingArea.classList.remove("draggingPony")
				playingArea.classList.remove("draggingShip")
			}

			window.addEventListener('dragover', ghostCardDragHandler);

			window.addEventListener('dragend', ghostCardDragEndHandler);
			window.addEventListener('drop', ghostCardDragEndHandler);

			document.body.appendChild(ghostCard);


		}
	}
	else
	{
		imgElement.ondragstart = function(e){};
	}


	if(isDropTarget)
	{
		imgElement.ondragover= function(e)
		{
			var draggedCard = e.dataTransfer.getData("text").split(";")[0];

			if(isValidMove(draggedCard, card))
				e.preventDefault();
		}

		imgElement.ondragenter= function(e)
		{
			var draggedCard = e.dataTransfer.getData("text").split(";")[0];

			if(isValidMove(draggedCard, card))
			{
				if (isBlank(card))
					setCardBackground(imgElement, draggedCard)
				else
					imgElement.style.border = "solid 5px green";
			}
		}

		imgElement.ondrop= function(e)
		{	
			e.preventDefault();

			imgElement.parentNode.removeChild(imgElement);

			delete model.board[location].element;

			moveCard(e.dataTransfer.getData("text"), location);
			return false;
		}


		imgElement.ondragleave= function(e)
		{
			if(isBlank(card))
				imgElement.style.backgroundImage = "";
			else
				imgElement.style.border = "";
		}
	}

	return imgElement;
}

function addShiftHover(card, element)
{
	element.onmouseenter = function(e)
	{
		hoverCard = card;
		hoverCardDiv = element;

		if(isShiftPressed)
		{
			enlargeCard();
		}
	}

	element.onmouseleave = function()
	{
		unenlargeCard();
		hoverCard = "";

	}
}

function addTrashHandlers(card, element, location)
{
	element.addEventListener('mouseenter', function(e)
	{
		var trash = document.createElement('img');
		trash.id = "trash";
		trash.style.height = "5vh";
		trash.src = "../img/trash.svg";
		trash.style.position = "absolute";
		trash.style.bottom = ".5vh"
		trash.style.right = ".5vh"

		if(location.startsWith("sr"))
		{
			trash.style.height = "4vh";
			trash.style.bottom = "7vh";
			trash.style.transform = "rotate(-90deg)"
		}

		if(location.startsWith("sd"))
		{
			trash.style.height = "4vh";
			trash.style.bottom = "7vh";
		}

		
		element.appendChild(trash);

		trash.onclick = function()
		{
			console.log("trash clicked")
			
		}
	});

	element.addEventListener('mouseleave', function()
	{
		var trash = document.getElementById('trash');
		trash.parentNode.removeChild(trash);

	});
}

function removeShiftHover(element)
{
	element.onmouseenter = function(){};
	element.onmouseleave = function(){};
}

function isValidMove(cardDragged, targetCard, endLocation)
{
	if(cardDragged == targetCard) return false;

	return (targetCard == "blank:ship" && (cardDragged.indexOf(".Ship.") > -1 ))
		|| (targetCard == "blank:pony" && (cardDragged.indexOf(".Pony.") > -1 || cardDragged.indexOf(".Start.") > -1)
		|| (targetCard.indexOf(".Pony.") > -1 && (cardDragged.indexOf(".Pony.") > -1 || cardDragged.indexOf(".Start.") > -1))
	);
}


function moveCard(cardData, endLocation)
{
	var card = cardData.split(";")[0];
	var startLocation = cardData.split(";")[1];

	console.log("startlocation" + startLocation);

	if(startLocation == "hand")
	{
		var i = model.hand.indexOf(card);

		if(i == -1) { return };
		model.hand.splice(i,1);

		updateHand();
	}
	else if(startLocation == "shipDiscardPile")
	{
		model.shipDiscardPile.pop();


		var topCard = model.shipDiscardPile.length 
			? model.shipDiscardPile[model.shipDiscardPile.length-1]
			: "blank:ship"; 

		console.log("updataing shipDiscard " + topCard);

		console.log(document.getElementById("shipDiscardPile"));

		updateCardElement(
			document.getElementById("shipDiscardPile"),
			topCard,
			"shipDiscardPile",
			topCard != "blank:ship", false
		)
	}
	else if(startLocation == "ponyDiscardPile")
	{
		model.ponyDiscardPile.pop();

		var topCard = model.ponyDiscardPile.length 
			? model.ponyDiscardPile[model.ponyDiscardPile.length-1]
			: "blank:pony"; 

		updateCardElement(
			document.getElementById("ponyDiscardPile"),
			topCard,
			"ponyDiscardPile",
			topCard != "blank:pony", false
		)
	}

	else if(isOffsetLoc(startLocation))
	{
		var id = startLocation.split(",")[1];

		var element = document.getElementById(id);

		element.parentNode.removeChild(element);
	}
	else
	{
		var element = model.board[startLocation].element;
		element.parentNode.removeChild(element);
		delete model.board[startLocation]
	}

	console.log(endLocation)

	if(endLocation == "hand")
	{
		model.hand.push(card);
		updateHand();
	}
	else if(model.board[endLocation].card && isPonyOrStart(model.board[endLocation].card))
	{
		offsetPonyCard(endLocation, model.board[endLocation].card);
		delete model.board[endLocation].element;
		model.board[endLocation].card = card;
	}
	else
	{
		// element gets generated when updateBoard() is called
		model.board[endLocation].card = card;
	}
	
	updateBoard();
	
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

	
	const gridWidth = 22;
	switch(pieces[0])
	{
		case "p":
			imgElement.style.top = y * gridWidth + "vh";
			imgElement.style.left = x * gridWidth + "vh";
			break;
		case "sr":
			imgElement.classList.add('sideways');
			imgElement.classList.add('ship');
			imgElement.style.top = y * gridWidth + "vh";
			imgElement.style.left = x * gridWidth + 22/2 + "vh";
			break;
		case "sd":
			imgElement.classList.add('ship');
			imgElement.style.top = y * gridWidth + 22/2 + "vh";
			imgElement.style.left = x * gridWidth + "vh";
			break;
	}
	
	refPoint.appendChild(imgElement);
	if(!model.board[key])
	{
		model.board[key] = {};
	}
	model.board[key].element = imgElement;
}

function offsetPonyCard(key, card)
{
	var pieces = key.split(",");
	var x = Number(pieces[1]);
	var y = Number(pieces[2]);

	var id = "offset" + offsetId++;
	var location = `offset,${id},${x},${y}`;
	var imgElement = makeCardElement(card, location, true);

	imgElement.id = id;


	var refPoint = document.getElementById('refPoint');

	
	const gridWidth = 22;

	imgElement.style.top = y * gridWidth + 2 + "vh";
	imgElement.style.left = x * gridWidth + 2 + "vh";

	imgElement.style.zIndex = 3;

	refPoint.appendChild(imgElement);
}


function updateGoals()
{
	var goalDiv = document.getElementById('goals');

	goalDiv.innerHTML = "";

	goalDiv.appendChild(makeCardElement(model.currentGoals[0]))
	goalDiv.appendChild(makeCardElement(model.currentGoals[1]))
	goalDiv.appendChild(makeCardElement(model.currentGoals[2]))
}

function updateHand()
{
	var handDiv = document.getElementById('hand');

	var oldCards = handDiv.getElementsByClassName('card');

	while(oldCards.length)
	{
		oldCards[0].parentNode.removeChild(oldCards[0]);
	}

	var ponyHand = document.getElementById('hand-pony');
	var shipHand = document.getElementById('hand-ship')

	for(var i=0; i<model.hand.length; i++)
	{
		var cardEl = makeCardElement(model.hand[i], "hand", true);

		if(isPony(model.hand[i]))
		{
			ponyHand.appendChild(cardEl);
		}
		else
		{
			shipHand.appendChild(cardEl)
		}

		//addTrashHandlers(model.hand[i], cardEl, "hand");
	}

	updateCardRowHeight();
}

var SCROLL_BAR_WIDTH = getScrollBarWidth();


function getScrollBarWidth () {
	var inner = document.createElement('p');
	inner.style.width = "100%";
	inner.style.height = "200px";

	var outer = document.createElement('div');
	outer.style.position = "absolute";
	outer.style.top = "0px";
	outer.style.left = "0px";
	outer.style.visibility = "hidden";
	outer.style.width = "200px";
	outer.style.height = "150px";
	outer.style.overflow = "hidden";
	outer.appendChild (inner);

	document.body.appendChild (outer);
	var w1 = inner.offsetWidth;
	outer.style.overflow = 'scroll';
	var w2 = inner.offsetWidth;
	if (w1 == w2) w2 = outer.clientWidth;

	document.body.removeChild (outer);

	return (w1 - w2);
};


function updateCardRowHeight()
{
	var cardRow = document.getElementById("cardRow");
	
	if(cardRow.scrollWidth > window.innerWidth)
	{
		cardRow.style.height = `calc(20% + ${SCROLL_BAR_WIDTH}px)`;
	}
	else
	{
		cardRow.style.height = "";
	}
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

function updateBoard()
{
	var refPoint = document.getElementById('refPoint');

	baseDist = window.innerHeight/100;

	cardLong = 18*baseDist;
	cardShort = 13*baseDist;

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


	gridDist = 30*baseDist;

	for(var key in model.board)
	{
		var type, x,y;
		[type,x,y] = key.split(",");
		x = Number(x);
		y = Number(y);

		var card = model.board[key].card;

		if(!card || isBlank(card))
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


			var element = model.board[key].element;
			element.parentNode.removeChild(element);
			delete model.board[key];
			continue;
		}


		if(!model.board[key].element)
		{
			addCardToBoard(key, card);
		}

		var neighbors = getNeighborKeys(key);
		var blankType = type == "p" ? "blank:ship" : "blank:pony";

		for(var key of neighbors)
		{
			if(!model.board[key])
			{
				addCardToBoard(key, blankType);
			}
		}
	}
}


function isPonyOrStart(card)
{
	return card.indexOf(".Pony.") >= 0 || card.indexOf(".Start." >= 0);
}

function isPony(card)
{
	return card.indexOf(".Pony.") >= 0;
}

function isBlank(card)
{
	return card.startsWith("blank:");
}

function isShip(card)
{
	return card.indexOf(".Ship.") >= 0;
}


function isBoardLoc(location)
{
	return location.startsWith("p,") || location.startsWith("sr,") || location.startsWith("sd,");
}

function isOffsetLoc(location)
{
	return location.startsWith("offset,");
}

function setCardBackground(element, card)
{
	if(isBlank(card))
	{
		console.log(card);
		element.style.backgroundImage = "";
		element.classList.add('blank');

		if(card == "blank:ship")
			element.classList.add('ship');
		else if(card == "blank:pony")
			element.classList.add('pony');

		removeShiftHover(element);
	}
	else
	{
		element.style.backgroundImage = "url(\"" + cards[card].fullUrl + "\")";

		addShiftHover(card, element);

	}
}

function enlargeCard(cardDiv)
{
	if(document.getElementById('giantCard')) return;

	var giantCard = document.createElement('div');
	giantCard.id = "giantCard"

	var width = 13*3/100 * window.innerHeight;
	var height = 18*3/100 * window.innerHeight;

	
	giantCard.style.position = "absolute";

	var cardRect = hoverCardDiv.getBoundingClientRect();

	var y = cardRect.top + (cardRect.bottom - cardRect.top)/2 - height/2;
	var x = cardRect.left + (cardRect.right - cardRect.left) + 10;

	if(x + width + 10 > window.innerWidth)
		x = cardRect.left - 10 - width;

	if(y < 10)
		y = 10;

	if(y + height +10 > window.innerHeight)
		y = window.innerHeight - height - 10;




	giantCard.style.top = y + "px"
	giantCard.style.left = x + "px";
	giantCard.style.width = width + "px";
	giantCard.style.height = height + "px";
	giantCard.style.zIndex = 3;
	giantCard.style.borderRadius = "15px";
	giantCard.style.backgroundPosition = "center";
	giantCard.style.backgroundSize = "cover";

	setCardBackground(giantCard, hoverCard);

	document.body.appendChild(giantCard);
}

function unenlargeCard()
{
	var div = document.getElementById('giantCard');
	if(div)
		div.parentNode.removeChild(div);
}