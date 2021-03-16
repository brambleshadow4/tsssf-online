import cards from "../../server/cards.js";
import {isStart} from "../../server/lib.js" 
import {makeCardElement} from "../game/cardComponent.js";

export function cardSelectComponent(decks: {[key:string]: Set<string>}, name: string, deckPrefix: string, cardBox?: Element)
{
	var div = document.createElement('div');
	div.className = 'close';

	var header = document.createElement('div');
	header.className = "cardSelect-header";
	var nameSpan = document.createElement('span');
	nameSpan.className = "name"
	nameSpan.innerHTML = name;

	var img = document.createElement('span');
	img.className = 'collapse';

	var bar = document.createElement('span');
	bar.className = 'bar';

	var noneButton = document.createElement('button');
	noneButton.innerHTML = "None";
	noneButton.className = 'selected';
	noneButton.onclick = buttonToggle("None");

	var someButton = document.createElement('button');
	someButton.innerHTML = "Some";
	someButton.onclick = buttonToggle("Some");

	var allButton = document.createElement('button');
	allButton.innerHTML = "All";
	allButton.className = 'allButton';
	allButton.setAttribute('deck', deckPrefix);
	allButton.onclick = buttonToggle("All");

	function buttonToggle(button: "None" | "Some" | "All")
	{
		return function(e: Event)
		{
			noneButton.classList.remove('selected');
			someButton.classList.remove('selected');
			allButton.classList.remove('selected');

			if(button == "All")
			{
				allButton.classList.add('selected');
				for(var element of body.children)
				{
					element.classList.add('selected');
				}

				if(cardBox)
					cardBox.classList.add('selected')

				decks[deckPrefix] = new Set([deckPrefix]);
			}
			if(button == "Some")
			{
				div.classList.remove('close')
				div.classList.add('open');
				someButton.classList.add('selected');

				if(cardBox)
					cardBox.classList.remove('selected')

				decks[deckPrefix] = getSelection();
			}
			if(button == "None")
			{
				noneButton.classList.add('selected');
				for(var element of body.children)
				{
					element.classList.remove('selected');
				}

				if(cardBox)
					cardBox.classList.remove('selected')

				decks[deckPrefix] = new Set();
			}
		}
	}


	function toggle()
	{
		if(div.classList.contains('open'))
		{
			div.classList.remove('open');
			div.classList.add('close');
		}
		else
		{
			div.classList.add('open');
			div.classList.remove('close');
		}
	}

	function getSelection(): Set<string>
	{
		var newSet: Set<string> = new Set();
		for(var el of body.children)
		{
			if(el.classList.contains('selected'))
			{
				newSet.add(el.getAttribute('card')!);
			}	
		}

		return newSet;
	}

	var isShiftDown = false;

	function shiftDown(e: KeyboardEvent)
	{
		if(e.key == "Shift")
		{
			isShiftDown = true;
		}
	}

	function shiftUp(e: KeyboardEvent)
	{
		if(e.key == "Shift")
		{
			isShiftDown = false;
		}
	}

	window.addEventListener("keydown", shiftDown);
	window.addEventListener("keyup", shiftUp);

	img.onclick = toggle;
	nameSpan.onclick = toggle;

	header.appendChild(img);
	header.appendChild(nameSpan);
	header.appendChild(bar);
	header.appendChild(noneButton);
	header.appendChild(someButton);
	header.appendChild(allButton);

	div.appendChild(header);

	var body = document.createElement('div')
	body.className = "cardSelect-body";

	var match = deckPrefix.substring(0,deckPrefix.length - 1);
	var no = 0;
	var shiftSelect = -1;

	var added = 0;

	for (var card in cards)
	{
		if(card.startsWith(match) && !isStart(card))
		{
			added++;
			let cardEl = makeCardElement(card);
			var shield = document.createElement('div');

			cardEl.setAttribute('card', card);
			cardEl.setAttribute('no', "" + (no++));
			shield.className ='shield';
			cardEl.appendChild(shield);

			cardEl.onclick = function(e: MouseEvent)
			{
				if(isShiftDown && shiftSelect > -1)
				{
					var hasSelected = cardEl.parentNode!.children[shiftSelect].classList.contains('selected');

					var thisNo = Number(cardEl.getAttribute("no"));
					var start = Math.min(shiftSelect, thisNo);
					var end = Math.max(shiftSelect, thisNo);

					for(var i=start; i <= end; i++)
					{
						if(hasSelected)
							cardEl.parentNode!.children[i].classList.add('selected')
						else
							cardEl.parentNode!.children[i].classList.remove('selected');
					}
					someButton.click();
					return;
				}
				else
				{
					shiftSelect = Number(cardEl.getAttribute("no"));
				}

				if(cardEl.classList.contains('selected'))
				{
					cardEl.classList.remove('selected');
				}
				else
				{
					cardEl.classList.add('selected')
				}
				someButton.click();
			}
			body.appendChild(cardEl);
		}
	}
	
	div.appendChild(body);

	if(added)
		return div;
	else 
		return document.createElement('div');
}

export function cardBoxSelectComponent(namespace: string)
{
	var div = document.createElement('div');
	div.className = "cardbox";
	div.setAttribute("deck", namespace + ".*");

	var shield = document.createElement('div');
	shield.className = "shield";
	div.appendChild(shield);

	var img = document.createElement('img');
	img.src = "/packs/" + namespace.split(".").join("/") + "/box.png";
	div.appendChild(img);

	return div;


/*	<div class='cardbox' id='Core-deck-select' deck="Core.*">
					<div class='shield'></div>
					<img src="/img/core-box.png" />
				</div>
				<div class='cardbox' id='EC-deck-select' deck="EC.*">
					<div class='shield'></div>
					<img src="/img/ec-box.png" />
				</div>
				<div class='cardbox' id='PU-deck-select' deck="PU.*">
					<div class='shield'></div>
					<img src="/img/pu-box.png" />
				</div>
				<div class='cardbox' deck="NoHoldsBarred.*">
					<div class='shield'></div>
					<img src="/img/noholds-box.png" />
				</div>*/
}