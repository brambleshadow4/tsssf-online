import faq from "./faq.js";
import {allCardsGameOptions, CardConfig} from "../../model/lib.js";
import * as cm from "../../model/cardManager.js";
import "./knowledgeBase.js";

var mechanicsTOC = document.getElementById('target-toc-mechanics')!
var cardsTOC = document.getElementById('target-toc-cards')!
var mechanicsDiv = document.getElementById('target-mechanics')!
var cardsDiv = document.getElementById('target-cards')!



async function setup()
{
	let cardConfig: CardConfig = await(await fetch("/cards.json")).json();
	cm.init(cardConfig, allCardsGameOptions());
	
	for(var key in faq)
	{
		if(key.indexOf(".") > -1) // tagged by card
		{
			let headingTitle = "";

			try {
				headingTitle = cm.all()[key].title || key;
			}		
			catch(e) {
				console.error("Bad FAQ card name: " + key);
			}
			cardsTOC.parentNode!.insertBefore(tocDiv(headingTitle, key), cardsTOC);
			
			var jumpTarget = document.createElement('span');

			jumpTarget.id = key;
			jumpTarget.style.position = "relative";
			jumpTarget.style.top = "-20px";
			cardsDiv.parentNode!.insertBefore(jumpTarget, cardsDiv);

			var heading = document.createElement('h3');
			heading.className = "question-section";
			heading.setAttribute('idf', key);
			heading.innerHTML =  headingTitle;

			cardsDiv.parentNode!.insertBefore(heading, cardsDiv);

			var questions = document.createElement('div');
			questions.innerHTML = faq[key].questions.join("\n");
			cardsDiv.parentNode!.insertBefore(questions, cardsDiv);

		}
		else
		{
			mechanicsTOC.parentNode!.insertBefore(tocDiv(faq[key].heading, key), mechanicsTOC);
			
			var jumpTarget = document.createElement('span');

			jumpTarget.id = key;
			jumpTarget.style.position = "relative";
			jumpTarget.style.top = "-20px";
			mechanicsDiv.parentNode!.insertBefore(jumpTarget, mechanicsDiv);

			var heading = document.createElement('h3');
			heading.className = "question-section";
			heading.setAttribute('idf', key);
			heading.innerHTML = faq[key].heading;

			mechanicsDiv.parentNode!.insertBefore(heading, mechanicsDiv);

			var questions = document.createElement('div');
			questions.innerHTML = faq[key].questions.join("\n");
			mechanicsDiv.parentNode!.insertBefore(questions, mechanicsDiv);
		}
	}

}

function tocDiv(name:string, id:string)
{
	var div = document.createElement('div');
	div.className = "level2";

	var link = document.createElement('a');
	link.href = "#" + id;
	link.innerHTML = name;
	div.appendChild(link);

	return div;
}


setup();